const { ZodError } = require("zod");
const { AppError } = require("../utils/app-error");

function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Invalid request data",
      details: err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.expose ? err.message : "Request failed",
      code: err.code,
    });
  }

  const statusCode = err.statusCode || 500;
  if (process.env.NODE_ENV !== "test") {
    console.error(err);
  }

  return res.status(statusCode).json({
    error: statusCode >= 500 ? "Internal server error" : "Request failed",
  });
}

module.exports = { errorHandler };