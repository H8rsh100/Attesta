require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const { globalLimiter } = require("./middleware/rateLimiter");
const authRoutes = require("./routes/auth");
const credentialRoutes = require("./routes/credentials");
const verifyRoutes = require("./routes/verify");

const app = express();

// ---- Security middleware ----
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// ---- Global rate limiter ----
app.use(globalLimiter);

// ---- Routes ----
app.use("/api/auth", authRoutes);
app.use("/api/credentials", credentialRoutes);
app.use("/api/verify", verifyRoutes);

// ---- Health check ----
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ---- 404 handler ----
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ---- Error handler ----
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Attesta backend running on port ${PORT}`);
});

module.exports = app;
