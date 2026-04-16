class AppError extends Error {
  constructor(message, statusCode, options = {}) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.expose = options.expose ?? statusCode < 500;
    this.code = options.code;
    this.details = options.details;
  }
}

module.exports = { AppError };