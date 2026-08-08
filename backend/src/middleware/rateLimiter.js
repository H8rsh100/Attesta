const rateLimit = require("express-rate-limit");

/**
 * Tight limiter for auth routes: 10 requests per 15 minutes per IP.
 * This prevents brute-force nonce fishing and signature replay attempts.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many auth requests from this IP. Please try again later.",
  },
});

/**
 * Tight limiter for credential issuance: 20 requests per hour per IP.
 * On-chain write operations should be intentional, not automated at high rate.
 */
const issuanceLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Credential issuance rate limit reached. Please try again later.",
  },
});

/**
 * Loose global limiter: 200 requests per 15 minutes per IP.
 * Applied to all routes as a baseline protection layer.
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests from this IP. Please try again later.",
  },
});

module.exports = { authLimiter, issuanceLimiter, globalLimiter };
