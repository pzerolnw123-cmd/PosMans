const { prisma } = require("../lib/db");
const { AppError } = require("../utils/app-error");

const LAST_SEEN_THROTTLE_MS = 45_000;
const MAX_SSE_CONNECTIONS_PER_DISPLAY = 20;
const MAX_SSE_CONNECTIONS_PER_IP = 10;
const activeSseConnectionsByDisplay = new Map();
const activeSseConnectionsByIp = new Map();

function incrementConnectionCount(map, key) {
  const count = (map.get(key) || 0) + 1;
  map.set(key, count);
  return count;
}

function decrementConnectionCount(map, key) {
  const count = (map.get(key) || 0) - 1;
  if (count > 0) {
    map.set(key, count);
    return;
  }
  map.delete(key);
}

function assertSseConnectionAllowed(displayId, ipAddress) {
  // จำกัด connection ฝั่ง public display เพื่อกันโหลดสะสมจากการเปิดซ้ำหรือ reconnect ถี่
  const displayConnections = activeSseConnectionsByDisplay.get(displayId) || 0;
  const ipConnections = activeSseConnectionsByIp.get(ipAddress) || 0;

  if (displayConnections >= MAX_SSE_CONNECTIONS_PER_DISPLAY || ipConnections >= MAX_SSE_CONNECTIONS_PER_IP) {
    throw new AppError("Too many customer display connections. Please try again.", 429, { code: "DISPLAY_CONNECTION_LIMIT" });
  }
}

function registerSseConnection(displayId, ipAddress) {
  incrementConnectionCount(activeSseConnectionsByDisplay, displayId);
  incrementConnectionCount(activeSseConnectionsByIp, ipAddress);

  return () => {
    decrementConnectionCount(activeSseConnectionsByDisplay, displayId);
    decrementConnectionCount(activeSseConnectionsByIp, ipAddress);
  };
}

async function touchDisplayLastSeen(display) {
  // อัปเดต lastSeenAt แบบ throttle เพราะ fallback polling อาจเรียก endpoint นี้ถี่
  const lastSeenAt = display.lastSeenAt ? new Date(display.lastSeenAt) : null;
  if (lastSeenAt && Date.now() - lastSeenAt.getTime() < LAST_SEEN_THROTTLE_MS) {
    return;
  }

  await prisma.customerDisplaySession.updateMany({
    where: {
      id: display.id,
      OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: new Date(Date.now() - LAST_SEEN_THROTTLE_MS) } }],
    },
    data: { lastSeenAt: new Date() },
  });
}

function resetSseConnectionCountersForTests() {
  activeSseConnectionsByDisplay.clear();
  activeSseConnectionsByIp.clear();
}

module.exports = {
  assertSseConnectionAllowed,
  registerSseConnection,
  resetSseConnectionCountersForTests,
  touchDisplayLastSeen,
};
