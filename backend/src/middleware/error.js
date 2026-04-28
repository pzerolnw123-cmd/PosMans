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
      error: "Invalid request data",
      details: err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
  }

  if (err instanceof AppError) {
    logHandledError(err, err.statusCode);
    return res.status(err.statusCode).json({
      error: err.expose ? err.message : "Request failed",
      code: err.code,
    });
  }

  const statusCode = err.statusCode || 500;
  logHandledError(err, statusCode);

  return res.status(statusCode).json({
    error: statusCode >= 500 ? "Internal server error" : "Request failed",
  });
}

module.exports = { errorHandler };
