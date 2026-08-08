const express = require("express");
const { param, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { getReadOnlyContract } = require("../services/contractService");

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/verify/:id
 * Public route -- no authentication required.
 * Fetches off-chain metadata from Postgres + on-chain state from the contract.
 * The on-chain state is the source of truth for validity.
 */
router.get(
  "/:id",
  [
    param("id")
      .isString()
      .trim()
      .notEmpty()
      .matches(/^0x[a-fA-F0-9]{64}$/)
      .withMessage("Invalid credential ID format (expected bytes32 hex)"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    try {
      // Fetch on-chain state -- this is the source of truth
      const contract = getReadOnlyContract();
      const [valid, issuer, subjectHash, credentialHash, issuedAt, revoked] =
        await contract.verifyCredential(id);

      if (issuedAt === 0n) {
        return res.status(404).json({
          credentialId: id,
          status: "NOT_FOUND",
          valid: false,
          message: "Credential not found on-chain",
        });
      }

      // Fetch off-chain metadata from Postgres
      const offChainData = await prisma.credential.findUnique({
        where: { id },
        select: {
          name: true,
          credentialType: true,
          description: true,
          metadata: true,
          issuedAt: true,
        },
      });

      const status = revoked ? "REVOKED" : "VALID";

      res.json({
        credentialId: id,
        status,
        valid,
        onChain: {
          issuer,
          subjectHash,
          credentialHash,
          issuedAt: new Date(Number(issuedAt) * 1000).toISOString(),
          revoked,
        },
        offChain: offChainData || null,
      });
    } catch (err) {
      console.error("Verify credential error:", err);
      res.status(500).json({ error: "Failed to verify credential" });
    }
  }
);

module.exports = router;
