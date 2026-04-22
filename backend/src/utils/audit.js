const { prisma } = require("../lib/db");
const { env } = require("../config/env");

const AUDIT_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
let lastAuditCleanupAt = 0;

async function cleanupOldAuditLogs() {
  const now = Date.now();
  if (now - lastAuditCleanupAt < AUDIT_CLEANUP_INTERVAL_MS) {
    return;
  }

  lastAuditCleanupAt = now;
  const cutoff = new Date(now - env.AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
}

async function writeAuditLog(entry) {
  try {
    await cleanupOldAuditLogs();
    await prisma.auditLog.create({ data: entry });
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.error("Audit log write failed", error);
    }
  }
}

module.exports = { cleanupOldAuditLogs, writeAuditLog };
