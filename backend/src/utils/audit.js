const { prisma } = require("../lib/db");

async function writeAuditLog(entry) {
  try {
    await prisma.auditLog.create({ data: entry });
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.error("Audit log write failed", error);
    }
  }
}

module.exports = { writeAuditLog };