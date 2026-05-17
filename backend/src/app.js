const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const saleRoutes = require("./routes/sale.routes");
const reportRoutes = require("./routes/report.routes");
const uploadRoutes = require("./routes/upload.routes");
const customerDisplayRoutes = require("./routes/customer-display.routes");
const superAdminRoutes = require("./routes/superadmin.routes");
const { env } = require("./config/env");
const { databaseDiagnostics, getDatabasePoolSnapshot, pool } = require("./lib/db");
const { errorHandler } = require("./middleware/error");
const { sanitizeErrorMessageForLog } = require("./middleware/error");

function logDatabaseHealthFailure(error) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  console.error("[health/db] Database probe failed", {
    name: error?.constructor?.name || "Error",
    driverCode: error?.code,
    message: sanitizeErrorMessageForLog(error?.message),
    diagnostics: databaseDiagnostics,
    pool: typeof getDatabasePoolSnapshot === "function" ? getDatabasePoolSnapshot() : undefined,
  });
}

function createApp() {
  const app = express();

  if (env.TRUST_PROXY) {
    app.set("trust proxy", 1);
  }

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "same-site" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    }),
  );
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/health/db", async (_req, res, next) => {
    try {
      if (!pool?.query) {
        return res.status(503).json({ ok: false, db: false, code: "DB_UNAVAILABLE" });
      }

      await pool.query("SELECT 1");
      return res.json({ ok: true, db: true });
    } catch (error) {
      logDatabaseHealthFailure(error);
      return next(error);
    }
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/sales", saleRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/uploads", uploadRoutes);
  app.use("/api/customer-displays", customerDisplayRoutes);
  app.use("/api/superadmin", superAdminRoutes);

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
