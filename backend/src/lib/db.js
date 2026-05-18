const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("../generated/prisma");
const { env } = require("../config/env");

const { Pool } = require("pg");

const globalForPrisma = global;

function describeDatabaseUrl(connectionString) {
  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get("sslmode");
    const channelBinding = url.searchParams.get("channel_binding");

    return {
      configured: true,
      host: url.hostname,
      port: url.port || null,
      database: url.pathname ? url.pathname.replace(/^\//, "") : null,
      sslMode,
      channelBinding,
      usesPooler: url.hostname.includes("-pooler") || url.hostname.includes("pooler"),
    };
  } catch {
    return {
      configured: Boolean(connectionString),
      parseError: true,
    };
  }
}

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
  idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
  query_timeout: env.DB_QUERY_TIMEOUT_MS,
  statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
  idle_in_transaction_session_timeout: env.DB_IDLE_IN_TRANSACTION_SESSION_TIMEOUT_MS,
});

const eventPool = new Pool({
  connectionString: env.DIRECT_DATABASE_URL,
  max: 2,
  connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
  idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
  query_timeout: env.DB_QUERY_TIMEOUT_MS,
  statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
  idle_in_transaction_session_timeout: env.DB_IDLE_IN_TRANSACTION_SESSION_TIMEOUT_MS,
});
const adapter = new PrismaPg(pool);

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

const databaseDiagnostics = {
  nodeEnv: env.NODE_ENV,
  databaseUrl: describeDatabaseUrl(env.DATABASE_URL),
  directDatabaseUrl: describeDatabaseUrl(env.DIRECT_DATABASE_URL),
  poolMax: env.DB_POOL_MAX,
  connectionTimeoutMs: env.DB_CONNECTION_TIMEOUT_MS,
  idleTimeoutMs: env.DB_IDLE_TIMEOUT_MS,
  queryTimeoutMs: env.DB_QUERY_TIMEOUT_MS,
  statementTimeoutMs: env.DB_STATEMENT_TIMEOUT_MS,
};

function getDatabasePoolSnapshot() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

module.exports = { pool, eventPool, prisma, databaseDiagnostics, getDatabasePoolSnapshot, describeDatabaseUrl };
