const rateLimit = require("express-rate-limit");
const { env } = require("../config/env");

const saleCheckoutLimiter = rateLimit({
  windowMs: env.SALE_RATE_LIMIT_WINDOW_MS,
  max: env.SALE_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many checkout attempts. Please wait a moment." },
});

const uploadSigningLimiter = rateLimit({
  windowMs: env.UPLOAD_RATE_LIMIT_WINDOW_MS,
  max: env.UPLOAD_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many upload requests. Please wait a moment." },
});

module.exports = {
  saleCheckoutLimiter,
  uploadSigningLimiter,
};
