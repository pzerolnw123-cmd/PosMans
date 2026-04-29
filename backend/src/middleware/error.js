const { ZodError } = require("zod");
const { AppError } = require("../utils/app-error");

function logHandledError(err, statusCode) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  if (process.env.NODE_ENV === "production") {
    console.error("[errorHandler] Request failed", {
      name: err.constructor.name,
      statusCode,
      code: err instanceof AppError ? err.code : undefined,
    });
    return;
  }

  console.error("[errorHandler] Error:", err.constructor.name, err.message);
  if (err instanceof ZodError) {
    console.error("[errorHandler] ZodError details:", JSON.stringify(err.issues));
  }
}

function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    logHandledError(err, 400);
    return res.status(400).json({
      error: "ข้อมูลที่ส่งมาไม่ถูกต้อง กรุณาตรวจสอบแล้วลองอีกครั้ง",
    });
  }

  if (err instanceof AppError) {
    logHandledError(err, err.statusCode);
    const payload = {
      error: err.expose ? err.message : "ไม่สามารถดำเนินการตามคำขอได้",
    };

    if (err.code === "CSRF_MISMATCH") {
      payload.code = err.code;
    }

    return res.status(err.statusCode).json(payload);
  }

  const statusCode = err.statusCode || 500;
  logHandledError(err, statusCode);

  return res.status(statusCode).json({
    error: statusCode >= 500 ? "ไม่สามารถดำเนินการได้ในขณะนี้ กรุณาลองอีกครั้ง" : "ไม่สามารถดำเนินการตามคำขอได้",
  });
}

module.exports = { errorHandler };
