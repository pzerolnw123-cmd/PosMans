const rateLimit = require("express-rate-limit");
const { env } = require("../config/env");

const saleCheckoutLimiter = rateLimit({
  windowMs: env.SALE_RATE_LIMIT_WINDOW_MS,
  max: env.SALE_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "ทำรายการถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" },
});

const uploadSigningLimiter = rateLimit({
  windowMs: env.UPLOAD_RATE_LIMIT_WINDOW_MS,
  max: env.UPLOAD_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "อัปโหลดถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" },
});

module.exports = {
  saleCheckoutLimiter,
  uploadSigningLimiter,
};
