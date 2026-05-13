const crypto = require("crypto");
const express = require("express");
const { z } = require("zod");
const { prisma } = require("../lib/db");
const { getRequiredOwnerStoreId, requireStoreRole } = require("../middleware/auth");
const { requireCsrf, requireTrustedOrigin } = require("../middleware/security");
const { writeAuditLog } = require("../utils/audit");
const { AppError } = require("../utils/app-error");
const { broadcastDisplayEvent, sendSse, subscribeDisplay, subscribeStore } = require("../utils/customer-display-events");
const { assertSafePlainText, assertSafeHttpUrl } = require("../utils/xss");

const router = express.Router();
const displayTokenByteLength = 32;
const displaySessionDays = 30;
const maxQrDataUrlLength = 350_000;
const defaultOwnerTheme = "light";
const LAST_SEEN_THROTTLE_MS = 45_000;
const MAX_SSE_CONNECTIONS_PER_DISPLAY = 20;
const MAX_SSE_CONNECTIONS_PER_IP = 10;
const activeSseConnectionsByDisplay = new Map();
const activeSseConnectionsByIp = new Map();

const displayCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .default("จอลูกค้า")
    .transform((value) => assertSafePlainText(value, "displayName")),
});

const displayRevokeSchema = z
  .object({
    controlToken: z.string().min(32).max(160),
  })
  .strict();

const displayStateSchema = z
  .object({
    status: z.enum(["IDLE", "PAYMENT", "SUCCESS"]),
    amount: z.number().int().min(0).max(9_999_999).optional(),
    paymentMethod: z.enum(["CASH", "QR", "CARD", "TRANSFER", "OTHER"]).nullable().optional(),
    qrDataUrl: z.string().max(maxQrDataUrlLength).nullable().optional(),
    message: z.string().trim().max(120).nullable().optional(),
    saleCode: z.string().trim().max(80).nullable().optional(),
  })
  .strict();

function hashDisplayToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createDisplayToken() {
  return crypto.randomBytes(displayTokenByteLength).toString("base64url");
}

function displayTokenMatches(token, tokenHash) {
  const providedHash = hashDisplayToken(token);
  const provided = Buffer.from(providedHash, "hex");
  const expected = Buffer.from(tokenHash, "hex");
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

function normalizeQrDataUrl(value) {
  if (!value) {
    return null;
  }

  if (value.startsWith("data:image/")) {
    if (!/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value)) {
      throw new AppError("ข้อมูลหน้าจอลูกค้าไม่ถูกต้อง", 400, { code: "BAD_DISPLAY_QR" });
    }
    return value;
  }

  return assertSafeHttpUrl(value, "displayQrUrl");
}

function serializeDisplay(display) {
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

function broadcastDisplay(display) {
  broadcastDisplayEvent(display.id, "display", serializeDisplay(display));
}

function resolveDisplayTheme(display) {
  return display.store?.users?.[0]?.ownerTheme || defaultOwnerTheme;
}

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

async function findOwnedDisplay(req, displayId) {
  const storeId = await getRequiredOwnerStoreId(req);
  const display = await prisma.customerDisplaySession.findFirst({
    where: { id: displayId, storeId, revokedAt: null },
  });

  if (!display) {
    throw new AppError("ไม่พบจอลูกค้าที่ใช้งานได้", 404, { code: "DISPLAY_NOT_FOUND" });
  }

  return display;
}

async function findPublicDisplay(displayId, token) {
  if (!token || token.length < 32 || token.length > 160) {
    throw new AppError("ไม่สามารถเปิดจอลูกค้านี้ได้", 403, { code: "DISPLAY_FORBIDDEN" });
  }

  const display = await prisma.customerDisplaySession.findUnique({
    where: { id: displayId },
    include: {
      store: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          isActive: true,
          users: {
            where: { storeRole: "OWNER", isActive: true },
            select: { ownerTheme: true },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!display || display.revokedAt || !display.store?.isActive || !displayTokenMatches(token, display.publicTokenHash)) {
    throw new AppError("ไม่สามารถเปิดจอลูกค้านี้ได้", 403, { code: "DISPLAY_FORBIDDEN" });
  }

  if (display.expiresAt && display.expiresAt <= new Date()) {
    throw new AppError("จอลูกค้านี้หมดอายุแล้ว", 410, { code: "DISPLAY_EXPIRED" });
  }

  return display;
}

async function findControllableDisplay(displayId, controlToken) {
  if (!controlToken || controlToken.length < 32 || controlToken.length > 160) {
    throw new AppError("ไม่สามารถปิดจอลูกค้านี้ได้", 403, { code: "DISPLAY_FORBIDDEN" });
  }

  const display = await prisma.customerDisplaySession.findUnique({
    where: { id: displayId },
  });

  if (!display || !display.ownerControlTokenHash || display.revokedAt || !displayTokenMatches(controlToken, display.ownerControlTokenHash)) {
    throw new AppError("ไม่สามารถปิดจอลูกค้านี้ได้", 403, { code: "DISPLAY_FORBIDDEN" });
  }

  return display;
}

router.get("/", requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const storeId = await getRequiredOwnerStoreId(req, res);
    const displays = await prisma.customerDisplaySession.findMany({
      where: { storeId, revokedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    res.json({ displays: displays.map(serializeDisplay) });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireTrustedOrigin, requireCsrf, requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const storeId = await getRequiredOwnerStoreId(req, res);
    const parsed = displayCreateSchema.parse(req.body || {});
    const token = createDisplayToken();
    const controlToken = createDisplayToken();
    const display = await prisma.customerDisplaySession.create({
      data: {
        storeId,
        createdBySessionId: req.session.id,
        name: parsed.name,
        publicTokenHash: hashDisplayToken(token),
        ownerControlTokenHash: hashDisplayToken(controlToken),
        expiresAt: new Date(Date.now() + displaySessionDays * 24 * 60 * 60 * 1000),
      },
    });

    await writeAuditLog({
      action: "CUSTOMER_DISPLAY_CREATED",
      actorUserId: req.session.user.id,
      status: "SUCCESS",
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      targetType: "CustomerDisplaySession",
      targetId: display.id,
      metadata: { storeId },
    });

    res.status(201).json({ display: serializeDisplay(display), token, controlToken });
  } catch (error) {
    next(error);
  }
});

router.patch("/:displayId/state", requireTrustedOrigin, requireCsrf, requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    await findOwnedDisplay(req, req.params.displayId);
    const parsed = displayStateSchema.parse(req.body || {});
    const normalizedStatus = parsed.status;
    const isIdle = normalizedStatus === "IDLE";
    const existingDisplay = await prisma.customerDisplaySession.findUnique({
      where: { id: req.params.displayId },
      select: { ownerControlTokenHash: true },
    });
    const controlToken = existingDisplay?.ownerControlTokenHash ? null : createDisplayToken();
    const display = await prisma.customerDisplaySession.update({
      where: { id: req.params.displayId },
      data: {
        createdBySessionId: req.session.id,
        ...(controlToken ? { ownerControlTokenHash: hashDisplayToken(controlToken) } : {}),
        status: normalizedStatus,
        amount: isIdle ? 0 : parsed.amount ?? 0,
        paymentMethod: isIdle ? null : parsed.paymentMethod ?? null,
        qrDataUrl: isIdle ? null : normalizeQrDataUrl(parsed.qrDataUrl),
        message: parsed.message ? assertSafePlainText(parsed.message, "displayMessage") : null,
        saleCode: parsed.saleCode ? assertSafePlainText(parsed.saleCode, "saleCode") : null,
      },
    });

    broadcastDisplay(display);

    await writeAuditLog({
      action: "CUSTOMER_DISPLAY_UPDATED",
      actorUserId: req.session.user.id,
      status: "SUCCESS",
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      targetType: "CustomerDisplaySession",
      targetId: display.id,
      metadata: { storeId: req.session.user.storeId, displayStatus: display.status },
    });

    res.json({ display: serializeDisplay(display), ...(controlToken ? { controlToken } : {}) });
  } catch (error) {
    next(error);
  }
});

router.delete("/:displayId", requireTrustedOrigin, requireCsrf, requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    await findOwnedDisplay(req, req.params.displayId);
    const display = await prisma.customerDisplaySession.update({
      where: { id: req.params.displayId },
      data: { status: "IDLE", amount: 0, paymentMethod: null, qrDataUrl: null, revokedAt: new Date() },
    });

    broadcastDisplay(display);

    await writeAuditLog({
      action: "CUSTOMER_DISPLAY_REVOKED",
      actorUserId: req.session.user.id,
      status: "SUCCESS",
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      targetType: "CustomerDisplaySession",
      targetId: display.id,
      metadata: { storeId: req.session.user.storeId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post("/:displayId/revoke", requireTrustedOrigin, async (req, res, next) => {
  try {
    const parsed = displayRevokeSchema.parse(req.body || {});
    await findControllableDisplay(req.params.displayId, parsed.controlToken);
    const display = await prisma.customerDisplaySession.update({
      where: { id: req.params.displayId },
      data: {
        status: "IDLE",
        amount: 0,
        paymentMethod: null,
        qrDataUrl: null,
        message: null,
        saleCode: null,
        revokedAt: new Date(),
      },
    });

    broadcastDisplay(display);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get("/:displayId/state", async (req, res, next) => {
  try {
    const display = await findPublicDisplay(req.params.displayId, String(req.query.token || ""));
    await touchDisplayLastSeen(display);
    res.json({
      store: {
        name: display.store.name,
        logoUrl: display.store.logoUrl,
        ownerTheme: resolveDisplayTheme(display),
      },
      display: serializeDisplay(display),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:displayId/store", async (req, res, next) => {
  try {
    const display = await findPublicDisplay(req.params.displayId, String(req.query.token || ""));
    res.set("Cache-Control", "no-store");
    res.json({
      store: {
        name: display.store.name,
        logoUrl: display.store.logoUrl,
        ownerTheme: resolveDisplayTheme(display),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:displayId/events", async (req, res, next) => {
  try {
    const display = await findPublicDisplay(req.params.displayId, String(req.query.token || ""));
    const ipAddress = req.ip || "unknown";
    assertSseConnectionAllowed(display.id, ipAddress);
    await touchDisplayLastSeen(display);
    const unregisterConnection = registerSseConnection(display.id, ipAddress);

    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders?.();

    sendSse(res, "display", serializeDisplay(display));
    sendSse(res, "store", {
      name: display.store.name,
      logoUrl: display.store.logoUrl,
      ownerTheme: resolveDisplayTheme(display),
    });
    const unsubscribe = subscribeDisplay(display.id, res);
    const unsubscribeStore = subscribeStore(display.store.id, res);
    const heartbeat = setInterval(() => sendSse(res, "ping", { at: Date.now() }), 15_000);
    let closed = false;

    req.on("close", () => {
      if (closed) {
        return;
      }
      closed = true;
      clearInterval(heartbeat);
      unsubscribe();
      unsubscribeStore();
      unregisterConnection();
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

