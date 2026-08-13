const express = require("express");
const { ethers } = require("ethers");
const { body, validationResult } = require("express-validator");
const { v4: uuidv4 } = require("uuid");
const { PrismaClient } = require("@prisma/client");

const { requireAuth, requireIssuerRole } = require("../middleware/rbac");
const { issuanceLimiter } = require("../middleware/rateLimiter");
const { getContract } = require("../services/contractService");

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/credentials
 * Issues a new credential on-chain and stores metadata in Postgres.
 * Requires: valid JWT + on-chain ISSUER_ROLE (checked in middleware, then enforced by contract).
 */
router.post(
  "/",
  requireAuth,
  requireIssuerRole,
  issuanceLimiter,
  [
    body("subjectAddress")
      .isEthereumAddress()
      .withMessage("Invalid subject Ethereum address"),
    body("credentialType")
      .isString()
      .trim()
      .notEmpty()
      .isLength({ max: 100 })
      .withMessage("credentialType is required (max 100 chars)"),
    body("name")
      .isString()
      .trim()
      .notEmpty()
      .isLength({ max: 200 })
      .withMessage("name is required (max 200 chars)"),
    body("description")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("description max 1000 chars"),
    body("metadata")
      .optional()
      .isObject()
      .withMessage("metadata must be a JSON object"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { subjectAddress, credentialType, name, description, metadata } =
      req.body;
    const issuerAddress = req.user.address;

    try {
      // Generate a unique credential ID
      const rawId = uuidv4();
      const credentialId = ethers.id(rawId); // bytes32 keccak256 hash

      // Build the off-chain credential payload and hash it -- hash goes on-chain
      const credentialPayload = JSON.stringify({
        id: rawId,
        issuer: issuerAddress,
        subject: subjectAddress,
        type: credentialType,
        name,
        issuedAt: new Date().toISOString(),
      });
      const credentialHash = ethers.id(credentialPayload);

      // Hash subject address -- never store raw address on-chain
      const subjectHash = ethers.id(subjectAddress.toLowerCase());

      // Submit to blockchain
      const contract = getContract();
      const tx = await contract.issueCredential(
        credentialId,
        credentialHash,
        subjectHash
      );
      const receipt = await tx.wait();

      // Ensure both users exist in DB (upsert)
      await prisma.user.upsert({
        where: { walletAddress: issuerAddress },
        update: {},
        create: { walletAddress: issuerAddress, isIssuer: true },
      });
      await prisma.user.upsert({
        where: { walletAddress: subjectAddress.toLowerCase() },
        update: {},
        create: { walletAddress: subjectAddress.toLowerCase() },
      });

      // Store off-chain metadata keyed by the same credentialId
      const credential = await prisma.credential.create({
        data: {
          id: credentialId,
          issuerAddress,
          subjectAddress: subjectAddress.toLowerCase(),
          credentialType,
          name,
          description: description || null,
          metadata: metadata || null,
        },
      });

      res.status(201).json({
        success: true,
        credentialId,
        txHash: receipt.hash,
        credential,
      });
    } catch (err) {
      console.error("Credential issuance error:", err);
      res.status(500).json({ error: "Failed to issue credential" });
    }
  }
);

/**
 * POST /api/credentials/:id/revoke
 * Revokes an existing credential on-chain.
 * Requires: valid JWT + on-chain ISSUER_ROLE.
 */
router.post(
  "/:id/revoke",
  requireAuth,
  requireIssuerRole,
  async (req, res) => {
    const { id } = req.params;

    if (!id || !/^0x[a-fA-F0-9]{64}$/.test(id)) {
      return res.status(400).json({ error: "Invalid credential ID format" });
    }

    try {
      const contract = getContract();
      const tx = await contract.revokeCredential(id);
      const receipt = await tx.wait();

      res.json({
        success: true,
        credentialId: id,
        txHash: receipt.hash,
        message: "Credential revoked successfully",
      });
    } catch (err) {
      console.error("Credential revocation error:", err);
      res.status(500).json({
        error: err.reason || err.message || "Failed to revoke credential",
      });
    }
  }
);

/**
 * GET /api/credentials
 * List credentials issued by the authenticated user.
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const credentials = await prisma.credential.findMany({
      where: { issuerAddress: req.user.address },
      orderBy: { issuedAt: "desc" },
    });
    res.json({ credentials });
  } catch (err) {
    console.error("List credentials error:", err);
    res.status(500).json({ error: "Failed to fetch credentials" });
  }
});

module.exports = router;

