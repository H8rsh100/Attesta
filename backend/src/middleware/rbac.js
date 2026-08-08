const jwt = require("jsonwebtoken");
const { getContract } = require("../services/contractService");
const { ethers } = require("ethers");

/**
 * requireAuth
 * Validates the JWT from the httpOnly cookie.
 * Attaches decoded payload to req.user.
 */
function requireAuth(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * requireIssuerRole
 * Must be used AFTER requireAuth.
 * Queries the smart contract to confirm the wallet holds ISSUER_ROLE.
 * This is a fail-fast check -- the contract enforces it again on write.
 */
async function requireIssuerRole(req, res, next) {
  try {
    const contract = getContract();
    const ISSUER_ROLE = await contract.ISSUER_ROLE();
    const hasRole = await contract.hasRole(ISSUER_ROLE, req.user.address);

    if (!hasRole) {
      return res
        .status(403)
        .json({ error: "Forbidden: ISSUER_ROLE required on-chain" });
    }

    next();
  } catch (err) {
    console.error("RBAC check error:", err);
    return res.status(500).json({ error: "Role check failed" });
  }
}

module.exports = { requireAuth, requireIssuerRole };
