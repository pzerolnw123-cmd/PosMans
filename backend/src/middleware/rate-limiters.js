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

const lineTestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "ทดสอบส่ง LINE ถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" },
});

module.exports = {
  lineTestLimiter,
  saleCheckoutLimiter,
  uploadSigningLimiter,
};
