const crypto = require("crypto");
const express = require("express");
const { z } = require("zod");
const { prisma } = require("../lib/db");
const { requireStoreRole } = require("../middleware/auth");
const { requireCsrf, requireTrustedOrigin } = require("../middleware/security");
const { writeAuditLog } = require("../utils/audit");
const { AppError } = require("../utils/app-error");
const { assertSafePlainText, assertSafeHttpUrl } = require("../utils/xss");

const router = express.Router();
const displayClients = new Map();
const displayTokenByteLength = 32;
const displaySessionDays = 30;
const maxQrDataUrlLength = 350_000;

const displayCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .default("จอลูกค้า")
    .transform((value) => assertSafePlainText(value, "displayName")),
});

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

function requireOwnerStoreId(req) {
  const storeId = req.session?.user?.storeId;
  if (!storeId) {
    throw new AppError("ไม่สามารถดำเนินการได้ในขณะนี้", 403, { code: "STORE_REQUIRED" });
  }

  return storeId;
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
  };
}

function subscribeDisplay(displayId, res) {
  const clients = displayClients.get(displayId) || new Set();
  clients.add(res);
  displayClients.set(displayId, clients);

  return () => {
    clients.delete(res);
    if (clients.size === 0) {
      displayClients.delete(displayId);
    }
  };
}

function sendSse(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function broadcastDisplay(display) {
  const clients = displayClients.get(display.id);
  if (!clients) {
    return;
  }

  const payload = serializeDisplay(display);
  clients.forEach((client) => sendSse(client, "display", payload));
}

async function findOwnedDisplay(req, displayId) {
  const storeId = requireOwnerStoreId(req);
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
    include: { store: { select: { id: true, name: true, logoUrl: true, isActive: true } } },
  });

  if (!display || display.revokedAt || !display.store?.isActive || !displayTokenMatches(token, display.publicTokenHash)) {
    throw new AppError("ไม่สามารถเปิดจอลูกค้านี้ได้", 403, { code: "DISPLAY_FORBIDDEN" });
  }

  if (display.expiresAt && display.expiresAt <= new Date()) {
    throw new AppError("จอลูกค้านี้หมดอายุแล้ว", 410, { code: "DISPLAY_EXPIRED" });
  }

  return display;
}

router.get("/", requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const storeId = requireOwnerStoreId(req);
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
    const storeId = requireOwnerStoreId(req);
    const parsed = displayCreateSchema.parse(req.body || {});
    const token = createDisplayToken();
    const display = await prisma.customerDisplaySession.create({
      data: {
        storeId,
        name: parsed.name,
        publicTokenHash: hashDisplayToken(token),
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

    res.status(201).json({ display: serializeDisplay(display), token });
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
    const display = await prisma.customerDisplaySession.update({
      where: { id: req.params.displayId },
      data: {
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

    res.json({ display: serializeDisplay(display) });
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

router.get("/:displayId/state", async (req, res, next) => {
  try {
    const display = await findPublicDisplay(req.params.displayId, String(req.query.token || ""));
    await prisma.customerDisplaySession.update({
      where: { id: display.id },
      data: { lastSeenAt: new Date() },
    });
    res.json({
      store: {
        name: display.store.name,
        logoUrl: display.store.logoUrl,
      },
      display: serializeDisplay(display),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:displayId/events", async (req, res, next) => {
  try {
    const display = await findPublicDisplay(req.params.displayId, String(req.query.token || ""));
    await prisma.customerDisplaySession.update({
      where: { id: display.id },
      data: { lastSeenAt: new Date() },
    });

    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders?.();

    sendSse(res, "display", serializeDisplay(display));
    const unsubscribe = subscribeDisplay(display.id, res);
    const heartbeat = setInterval(() => sendSse(res, "ping", { at: Date.now() }), 25_000);

    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
