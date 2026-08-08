const crypto = require("crypto");
const { ethers } = require("ethers");
const jwt = require("jsonwebtoken");
const { body, param, validationResult } = require("express-validator");
const { authLimiter } = require("../middleware/rateLimiter");
const express = require("express");

const router = express.Router();

/**
 * In-memory nonce store. Each entry: { nonce, expiresAt }
 * This is Redis-ready -- swap the Map for a Redis client with TTL.
 */
const nonceStore = new Map();
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Clean up expired nonces periodically
setInterval(() => {
  const now = Date.now();
  for (const [address, entry] of nonceStore.entries()) {
    if (entry.expiresAt < now) {
      nonceStore.delete(address);
    }
  }
}, 60 * 1000);

// ---- GET /api/auth/nonce/:address ----
router.get(
  "/nonce/:address",
  authLimiter,
  [
    param("address")
      .isEthereumAddress()
      .withMessage("Invalid Ethereum address"),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const address = req.params.address.toLowerCase();
    const nonce = crypto.randomBytes(32).toString("hex");

    nonceStore.set(address, {
      nonce,
      expiresAt: Date.now() + NONCE_TTL_MS,
    });

    res.json({
      nonce,
      message: `Sign this nonce to authenticate with Attesta: ${nonce}`,
      expiresIn: NONCE_TTL_MS / 1000,
    });
  }
);

// ---- POST /api/auth/verify-signature ----
router.post(
  "/verify-signature",
  authLimiter,
  [
    body("address")
      .isEthereumAddress()
      .withMessage("Invalid Ethereum address"),
    body("signature")
      .isString()
      .notEmpty()
      .withMessage("Signature is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { address, signature } = req.body;
    const normalizedAddress = address.toLowerCase();

    const entry = nonceStore.get(normalizedAddress);
    if (!entry) {
      return res
        .status(400)
        .json({ error: "No nonce found. Request a new nonce first." });
    }

    if (entry.expiresAt < Date.now()) {
      nonceStore.delete(normalizedAddress);
      return res.status(400).json({ error: "Nonce expired. Request a new one." });
    }

    const message = `Sign this nonce to authenticate with Attesta: ${entry.nonce}`;

    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);

      if (recoveredAddress.toLowerCase() !== normalizedAddress) {
        return res.status(401).json({ error: "Signature verification failed" });
      }

      // Nonce is single-use -- delete immediately after verification
      nonceStore.delete(normalizedAddress);

      const token = jwt.sign(
        { address: recoveredAddress.toLowerCase() },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
      );

      // Store JWT in httpOnly cookie -- not localStorage (XSS protection)
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      res.json({
        success: true,
        address: recoveredAddress.toLowerCase(),
        message: "Authenticated successfully",
      });
    } catch (err) {
      console.error("Signature verification error:", err);
      return res.status(401).json({ error: "Signature verification failed" });
    }
  }
);

// ---- POST /api/auth/logout ----
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true, message: "Logged out successfully" });
});

// ---- GET /api/auth/me ----
router.get("/me", (req, res) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ authenticated: true, address: decoded.address });
  } catch {
    res.status(401).json({ authenticated: false });
  }
});

module.exports = router;
