const { prisma } = require("../lib/db");
const { broadcastDisplayEvent } = require("./customer-display-events");

function serializeRevokedDisplay(display) {
  return {
    id: display.id,
    name: display.name,
    status: display.status,
    amount: display.amount,
    paymentMethod: display.paymentMethod,
    qrDataUrl: display.qrDataUrl,
    message: display.message,
    saleCode: display.saleCode,
    updatedAt: display.updatedAt,
    revokedAt: display.revokedAt,
  };
}

async function revokeDisplaysForSessionIds(sessionIds) {
  const uniqueSessionIds = [...new Set(sessionIds.filter((value) => typeof value === "string" && value.length > 0))];
  if (uniqueSessionIds.length === 0) {
    return [];
  }

  const displays = await prisma.customerDisplaySession.findMany({
    where: {
      createdBySessionId: { in: uniqueSessionIds },
      revokedAt: null,
    },
  });

  if (displays.length === 0) {
    return [];
  }

  const revokedAt = new Date();
  const revokedDisplays = await Promise.all(
    displays.map((display) =>
      prisma.customerDisplaySession.update({
        where: { id: display.id },
        data: {
          status: "IDLE",
          amount: 0,
          paymentMethod: null,
          qrDataUrl: null,
          message: null,
          saleCode: null,
          revokedAt,
        },
      }),
    ),
  );

  revokedDisplays.forEach((display) => {
    broadcastDisplayEvent(display.id, "display", serializeRevokedDisplay(display));
  });

  return revokedDisplays;
}

module.exports = { revokeDisplaysForSessionIds };
