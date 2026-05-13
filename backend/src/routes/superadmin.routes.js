const express = require("express");
const { z } = require("zod");
const { prisma } = require("../lib/db");
const { requirePlatformRole } = require("../middleware/auth");
const { writeAuditLog } = require("../utils/audit");

const router = express.Router();
const requireSuperAdmin = requirePlatformRole(["SUPER_ADMIN"]);
const defaultLimit = 20;
const maxLimit = 100;

const listQuerySchema = z.object({
  q: z.string().trim().max(80).optional().default(""),
  limit: z.coerce.number().int().min(1).max(maxLimit).optional().default(defaultLimit),
});

const auditQuerySchema = listQuerySchema.extend({
  action: z.string().trim().max(80).optional().default(""),
});

const userUpdateSchema = z
  .object({
    username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/).optional(),
    displayName: z.string().trim().min(1).max(80).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "At least one user field is required." });

const planUpdateSchema = z
  .object({
    tier: z.enum(["START", "PLUS"]).optional(),
    status: z.enum(["ACTIVE", "PAST_DUE", "CANCELED"]).optional(),
    expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
    extendDays: z.number().int().min(1).max(365).optional(),
    durationMonths: z.number().int().min(1).max(24).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "At least one plan field is required." });

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function addCalendarMonths(date, months) {
  const next = new Date(date);
  const originalDay = next.getDate();

  next.setDate(1);
  next.setMonth(next.getMonth() + months);

  const lastDayOfTargetMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(originalDay, lastDayOfTargetMonth));

  return next;
}

function serializeDate(value) {
  return value ? value.toISOString() : null;
}

function storeSearchWhere(query) {
  if (!query) {
    return {};
  }

  return {
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { slug: { contains: query, mode: "insensitive" } },
    ],
  };
}

function userSearchWhere(query) {
  if (!query) {
    return {};
  }

  return {
    OR: [
      { username: { contains: query, mode: "insensitive" } },
      { displayName: { contains: query, mode: "insensitive" } },
      { store: { name: { contains: query, mode: "insensitive" } } },
      { store: { slug: { contains: query, mode: "insensitive" } } },
    ],
  };
}

function paymentReady(store) {
  return Boolean(
    store.promptPayEnabled ||
      store.paymentQrImageUrl ||
      (store.bankName && store.bankAccountName && store.bankAccountNumber),
  );
}

function serializeStore(store) {
  return {
    id: store.id,
    slug: store.slug,
    name: store.name,
    logoUrl: store.logoUrl || null,
    isActive: store.isActive,
    paymentReady: paymentReady(store),
    lineEnabled: Boolean(store.lineIntegration?.enabled),
    lineLastSuccessAt: serializeDate(store.lineIntegration?.lastSuccessAt),
    lineLastError: store.lineIntegration?.lastError || null,
    planTier: store.plan?.tier || "START",
    planStatus: store.plan?.status || "ACTIVE",
    planExpiresAt: serializeDate(store.plan?.expiresAt),
    ownerCount: store._count?.users ?? 0,
    productCount: store._count?.products ?? 0,
    saleCount: store._count?.saleOrders ?? 0,
    displayCount: store._count?.customerDisplaySessions ?? 0,
    createdAt: serializeDate(store.createdAt),
    updatedAt: serializeDate(store.updatedAt),
  };
}

function serializeUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    platformRole: user.platformRole,
    storeRole: user.storeRole,
    ownerTheme: user.ownerTheme,
    isActive: user.isActive,
    hasPin: Boolean(user.pinHash),
    store: user.store
      ? {
          id: user.store.id,
          slug: user.store.slug,
          name: user.store.name,
          isActive: user.store.isActive,
          plan: user.store.plan
            ? {
                id: user.store.plan.id,
                tier: user.store.plan.tier,
                status: user.store.plan.status,
                expiresAt: serializeDate(user.store.plan.expiresAt),
                lockVersion: user.store.plan.lockVersion,
              }
            : null,
        }
      : null,
    sessionCount: user._count?.sessions ?? 0,
    lastLoginAt: serializeDate(user.lastLoginAt),
    createdAt: serializeDate(user.createdAt),
    updatedAt: serializeDate(user.updatedAt),
  };
}

function serializeSale(sale) {
  return {
    id: sale.id,
    code: sale.code,
    status: sale.status,
    paymentMethod: sale.paymentMethod,
    total: sale.total,
    createdAt: serializeDate(sale.createdAt),
    store: sale.store
      ? {
          id: sale.store.id,
          slug: sale.store.slug,
          name: sale.store.name,
        }
      : null,
    createdBy: sale.createdBy
      ? {
          id: sale.createdBy.id,
          username: sale.createdBy.username,
          displayName: sale.createdBy.displayName,
        }
      : null,
  };
}

function serializeAuditLog(log) {
  return {
    id: log.id,
    action: log.action,
    status: log.status,
    targetType: log.targetType || null,
    targetId: log.targetId || null,
    metadata: log.metadata || null,
    ipAddress: log.ipAddress || null,
    userAgent: log.userAgent || null,
    actor: log.actorUser
      ? {
          id: log.actorUser.id,
          username: log.actorUser.username,
          displayName: log.actorUser.displayName,
          platformRole: log.actorUser.platformRole,
          storeRole: log.actorUser.storeRole,
        }
      : null,
    createdAt: serializeDate(log.createdAt),
  };
}

router.get("/overview", requireSuperAdmin, async (_req, res, next) => {
  try {
    const since24h = daysAgo(1);
    const since7d = daysAgo(7);
    const [
      totalStores,
      activeStores,
      inactiveStores,
      ownerUsers,
      superAdmins,
      activeSessions,
      sales7d,
      sales24h,
      products,
      lowStockProducts,
      activeDisplays,
      lineEnabledStores,
      paymentReadyStores,
      recentAuditLogs,
      storesNeedingAttention,
    ] = await prisma.$transaction([
      prisma.store.count(),
      prisma.store.count({ where: { isActive: true } }),
      prisma.store.count({ where: { isActive: false } }),
      prisma.user.count({ where: { storeRole: "OWNER" } }),
      prisma.user.count({ where: { platformRole: "SUPER_ADMIN" } }),
      prisma.session.count({ where: { expiresAt: { gt: new Date() } } }),
      prisma.saleOrder.aggregate({ where: { status: "PAID", createdAt: { gte: since7d } }, _sum: { total: true }, _count: true }),
      prisma.saleOrder.aggregate({ where: { status: "PAID", createdAt: { gte: since24h } }, _sum: { total: true }, _count: true }),
      prisma.product.count(),
      prisma.product.count({ where: { trackStock: true, stockQuantity: { lte: 5 } } }),
      prisma.customerDisplaySession.count({
        where: {
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      }),
      prisma.storeLineIntegration.count({ where: { enabled: true } }),
      prisma.store.count({
        where: {
          OR: [
            { promptPayEnabled: true },
            { paymentQrImageUrl: { not: null } },
            { AND: [{ bankName: { not: null } }, { bankAccountName: { not: null } }, { bankAccountNumber: { not: null } }] },
          ],
        },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { actorUser: { select: { id: true, username: true, displayName: true, platformRole: true, storeRole: true } } },
      }),
      prisma.store.findMany({
        where: {
          OR: [
            { isActive: false },
            { users: { none: { storeRole: "OWNER", isActive: true } } },
            { lineIntegration: { is: { lastError: { not: null } } } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 8,
        include: {
          plan: true,
          lineIntegration: true,
          _count: { select: { users: true, products: true, saleOrders: true, customerDisplaySessions: true } },
        },
      }),
    ]);

    res.set("Cache-Control", "no-store");
    res.json({
      summary: {
        totalStores,
        activeStores,
        inactiveStores,
        ownerUsers,
        superAdmins,
        activeSessions,
        sales7dTotal: sales7d._sum.total || 0,
        sales7dCount: sales7d._count,
        sales24hTotal: sales24h._sum.total || 0,
        sales24hCount: sales24h._count,
        products,
        lowStockProducts,
        activeDisplays,
        lineEnabledStores,
        paymentReadyStores,
      },
      recentAuditLogs: recentAuditLogs.map(serializeAuditLog),
      storesNeedingAttention: storesNeedingAttention.map(serializeStore),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/stores", requireSuperAdmin, async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const stores = await prisma.store.findMany({
      where: storeSearchWhere(query.q),
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
      take: query.limit,
      include: {
        plan: true,
        lineIntegration: true,
        _count: { select: { users: true, products: true, saleOrders: true, customerDisplaySessions: true } },
      },
    });

    res.set("Cache-Control", "no-store");
    res.json({ stores: stores.map(serializeStore) });
  } catch (error) {
    next(error);
  }
});

router.get("/owners", requireSuperAdmin, async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const [owners, stores] = await prisma.$transaction([
      prisma.user.findMany({
        where: { storeRole: "OWNER", ...userSearchWhere(query.q) },
        orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
        take: query.limit,
        include: {
          store: { select: { id: true, slug: true, name: true, isActive: true, plan: true } },
          _count: { select: { sessions: true } },
        },
      }),
      prisma.store.findMany({
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        select: { id: true, slug: true, name: true, isActive: true },
        take: 100,
      }),
    ]);

    res.set("Cache-Control", "no-store");
    res.json({ owners: owners.map(serializeUser), ownerStoreOptions: stores });
  } catch (error) {
    next(error);
  }
});

router.get("/plans", requireSuperAdmin, async (_req, res, next) => {
  try {
    const [plans, usages] = await prisma.$transaction([
      prisma.storePlan.findMany({
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        take: 80,
        include: { store: { select: { id: true, slug: true, name: true, isActive: true } } },
      }),
      prisma.storePlanUsage.findMany({
        orderBy: { updatedAt: "desc" },
        take: 80,
        include: { store: { select: { id: true, slug: true, name: true, isActive: true } } },
      }),
    ]);

    res.set("Cache-Control", "no-store");
    res.json({
      plans: plans.map((plan) => ({
        id: plan.id,
        tier: plan.tier,
        status: plan.status,
        expiresAt: serializeDate(plan.expiresAt),
        lockVersion: plan.lockVersion,
        store: plan.store,
        createdAt: serializeDate(plan.createdAt),
        updatedAt: serializeDate(plan.updatedAt),
      })),
      usages: usages.map((usage) => ({
        id: usage.id,
        period: usage.period,
        paymentConfirmCount: usage.paymentConfirmCount,
        store: usage.store,
        createdAt: serializeDate(usage.createdAt),
        updatedAt: serializeDate(usage.updatedAt),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/owners/:userId", requireSuperAdmin, async (req, res, next) => {
  try {
    const body = userUpdateSchema.parse(req.body);
    const currentUser = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { id: true, username: true, displayName: true, isActive: true, storeId: true, storeRole: true },
    });

    if (!currentUser || currentUser.storeRole !== "OWNER") {
      return res.status(404).json({ error: "Owner user was not found." });
    }

    if (body.username && body.username !== currentUser.username) {
      const duplicate = await prisma.user.findUnique({ where: { username: body.username }, select: { id: true } });
      if (duplicate) {
        return res.status(409).json({ error: "Username is already in use.", code: "USERNAME_TAKEN" });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        ...(body.username !== undefined ? { username: body.username } : {}),
        ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
      include: {
        store: { select: { id: true, slug: true, name: true, isActive: true, plan: true } },
        _count: { select: { sessions: true } },
      },
    });

    await writeAuditLog({
      action: "SUPERADMIN_USER_UPDATED",
      actorUserId: req.session?.user?.id,
      status: "success",
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
      targetType: "USER",
      targetId: updatedUser.id,
      metadata: {
        changedFields: Object.keys(body),
        previous: {
          username: currentUser.username,
          displayName: currentUser.displayName,
          isActive: currentUser.isActive,
          storeId: currentUser.storeId,
        },
      },
    });

    res.set("Cache-Control", "no-store");
    res.json({ owner: serializeUser(updatedUser) });
  } catch (error) {
    next(error);
  }
});

router.patch("/plans/:storeId", requireSuperAdmin, async (req, res, next) => {
  try {
    const body = planUpdateSchema.parse(req.body);
    const store = await prisma.store.findUnique({ where: { id: req.params.storeId }, select: { id: true, slug: true, name: true, isActive: true } });
    if (!store) {
      return res.status(404).json({ error: "Store was not found." });
    }

    const currentPlan = await prisma.storePlan.findUnique({ where: { storeId: store.id } });
    const nextTier = body.tier || currentPlan?.tier || "START";
    if ((body.extendDays || body.durationMonths) && nextTier !== "PLUS") {
      return res.status(400).json({ error: "Only PLUS plans can be extended.", code: "PLUS_REQUIRED" });
    }

    let expiresAt = body.expiresAt === undefined ? currentPlan?.expiresAt || null : body.expiresAt ? new Date(body.expiresAt) : null;
    if (body.durationMonths) {
      expiresAt = addCalendarMonths(new Date(), body.durationMonths);
    }
    if (body.extendDays) {
      const baseTime = Math.max(expiresAt?.getTime() || 0, Date.now());
      expiresAt = new Date(baseTime + body.extendDays * 24 * 60 * 60 * 1000);
    }

    const plan = await prisma.storePlan.upsert({
      where: { storeId: store.id },
      create: {
        storeId: store.id,
        tier: nextTier,
        status: body.status || "ACTIVE",
        expiresAt,
        lockVersion: 1,
      },
      update: {
        ...(body.tier !== undefined ? { tier: nextTier } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.expiresAt !== undefined || body.extendDays || body.durationMonths ? { expiresAt } : {}),
        lockVersion: { increment: 1 },
      },
      include: { store: { select: { id: true, slug: true, name: true, isActive: true } } },
    });

    await writeAuditLog({
      action: "SUPERADMIN_PLAN_UPDATED",
      actorUserId: req.session?.user?.id,
      status: "success",
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
      targetType: "STORE_PLAN",
      targetId: plan.id,
      metadata: {
        storeId: store.id,
        changedFields: Object.keys(body),
        extendDays: body.extendDays || null,
        durationMonths: body.durationMonths || null,
        previous: currentPlan
          ? {
              tier: currentPlan.tier,
              status: currentPlan.status,
              expiresAt: serializeDate(currentPlan.expiresAt),
              lockVersion: currentPlan.lockVersion,
            }
          : null,
      },
    });

    res.set("Cache-Control", "no-store");
    res.json({
      plan: {
        id: plan.id,
        tier: plan.tier,
        status: plan.status,
        expiresAt: serializeDate(plan.expiresAt),
        lockVersion: plan.lockVersion,
        store: plan.store,
        createdAt: serializeDate(plan.createdAt),
        updatedAt: serializeDate(plan.updatedAt),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/sales", requireSuperAdmin, async (_req, res, next) => {
  try {
    const since30d = daysAgo(30);
    const [recentSales, sales30d, byPaymentMethod] = await prisma.$transaction([
      prisma.saleOrder.findMany({
        orderBy: { createdAt: "desc" },
        take: 40,
        include: {
          store: { select: { id: true, slug: true, name: true } },
          createdBy: { select: { id: true, username: true, displayName: true } },
        },
      }),
      prisma.saleOrder.aggregate({ where: { status: "PAID", createdAt: { gte: since30d } }, _sum: { total: true }, _count: true }),
      prisma.saleOrder.groupBy({
        by: ["paymentMethod"],
        where: { status: "PAID", createdAt: { gte: since30d } },
        _sum: { total: true },
        _count: true,
      }),
    ]);

    res.set("Cache-Control", "no-store");
    res.json({
      summary: {
        sales30dTotal: sales30d._sum.total || 0,
        sales30dCount: sales30d._count,
      },
      byPaymentMethod: byPaymentMethod.map((row) => ({
        paymentMethod: row.paymentMethod,
        total: row._sum.total || 0,
        count: row._count,
      })),
      recentSales: recentSales.map(serializeSale),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/products", requireSuperAdmin, async (_req, res, next) => {
  try {
    const [totalProducts, lowStock, recentProducts] = await prisma.$transaction([
      prisma.product.count(),
      prisma.product.findMany({
        where: { trackStock: true, stockQuantity: { lte: 5 } },
        orderBy: [{ stockQuantity: "asc" }, { updatedAt: "desc" }],
        take: 40,
        include: { store: { select: { id: true, slug: true, name: true, isActive: true } } },
      }),
      prisma.product.findMany({
        orderBy: { updatedAt: "desc" },
        take: 40,
        include: { store: { select: { id: true, slug: true, name: true, isActive: true } } },
      }),
    ]);

    res.set("Cache-Control", "no-store");
    res.json({
      summary: { totalProducts, lowStockCount: lowStock.length },
      lowStock: lowStock.map((product) => ({
        id: product.id,
        code: product.code,
        name: product.name,
        category: product.category,
        status: product.status,
        stockQuantity: product.stockQuantity,
        lowStockThreshold: product.lowStockThreshold,
        store: product.store,
        updatedAt: serializeDate(product.updatedAt),
      })),
      recentProducts: recentProducts.map((product) => ({
        id: product.id,
        code: product.code,
        name: product.name,
        category: product.category,
        status: product.status,
        trackStock: product.trackStock,
        stockQuantity: product.stockQuantity,
        store: product.store,
        updatedAt: serializeDate(product.updatedAt),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/displays", requireSuperAdmin, async (_req, res, next) => {
  try {
    const displays = await prisma.customerDisplaySession.findMany({
      orderBy: { updatedAt: "desc" },
      take: 80,
      include: { store: { select: { id: true, slug: true, name: true, isActive: true } } },
    });

    res.set("Cache-Control", "no-store");
    res.json({
      displays: displays.map((display) => ({
        id: display.id,
        name: display.name,
        status: display.status,
        amount: display.amount,
        paymentMethod: display.paymentMethod,
        saleCode: display.saleCode,
        store: display.store,
        lastSeenAt: serializeDate(display.lastSeenAt),
        expiresAt: serializeDate(display.expiresAt),
        revokedAt: serializeDate(display.revokedAt),
        updatedAt: serializeDate(display.updatedAt),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/line", requireSuperAdmin, async (_req, res, next) => {
  try {
    const integrations = await prisma.storeLineIntegration.findMany({
      orderBy: { updatedAt: "desc" },
      take: 80,
      include: { store: { select: { id: true, slug: true, name: true, isActive: true } } },
    });

    res.set("Cache-Control", "no-store");
    res.json({
      integrations: integrations.map((integration) => ({
        id: integration.id,
        enabled: integration.enabled,
        notifyOnSalePaid: integration.notifyOnSalePaid,
        recipientType: integration.recipientType,
        hasRecipient: Boolean(integration.recipientId),
        hasChannelAccessToken: Boolean(integration.channelAccessTokenEncrypted),
        channelAccessTokenHint: integration.channelAccessTokenHint || null,
        lastTestedAt: serializeDate(integration.lastTestedAt),
        lastSuccessAt: serializeDate(integration.lastSuccessAt),
        lastError: integration.lastError || null,
        store: integration.store,
        updatedAt: serializeDate(integration.updatedAt),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/uploads", requireSuperAdmin, async (_req, res, next) => {
  try {
    const [storesWithLogos, storesWithQr, productsWithImages, recentPolicies] = await prisma.$transaction([
      prisma.store.findMany({ where: { logoUploadedKey: { not: null } }, orderBy: { updatedAt: "desc" }, take: 40 }),
      prisma.store.findMany({ where: { paymentQrUploadedKey: { not: null } }, orderBy: { updatedAt: "desc" }, take: 40 }),
      prisma.product.findMany({
        where: { uploadedKey: { not: null } },
        orderBy: { updatedAt: "desc" },
        take: 40,
        include: { store: { select: { id: true, slug: true, name: true, isActive: true } } },
      }),
      prisma.auditLog.findMany({
        where: { action: "UPLOAD_POLICY_ISSUED" },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { actorUser: { select: { id: true, username: true, displayName: true, platformRole: true, storeRole: true } } },
      }),
    ]);

    res.set("Cache-Control", "no-store");
    res.json({
      summary: {
        storeLogoCount: storesWithLogos.length,
        paymentQrCount: storesWithQr.length,
        productImageCount: productsWithImages.length,
      },
      productImages: productsWithImages.map((product) => ({
        id: product.id,
        code: product.code,
        name: product.name,
        uploadedKey: product.uploadedKey,
        imageUrl: product.imageUrl,
        store: product.store,
        updatedAt: serializeDate(product.updatedAt),
      })),
      recentPolicies: recentPolicies.map(serializeAuditLog),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/security", requireSuperAdmin, async (_req, res, next) => {
  try {
    const since24h = daysAgo(1);
    const [failedLogins24h, passwordChanges24h, activeSessions, expiringSessions, recentSecurityEvents] = await prisma.$transaction([
      prisma.auditLog.count({ where: { action: "LOGIN_FAILED", createdAt: { gte: since24h } } }),
      prisma.auditLog.count({ where: { action: "PASSWORD_CHANGED", createdAt: { gte: since24h } } }),
      prisma.session.count({ where: { expiresAt: { gt: new Date() } } }),
      prisma.session.count({ where: { expiresAt: { gt: new Date(), lt: new Date(Date.now() + 60 * 60 * 1000) } } }),
      prisma.auditLog.findMany({
        where: { action: { in: ["LOGIN_FAILED", "LOGIN_SUCCEEDED", "PASSWORD_CHANGED", "LOGOUT_ALL"] } },
        orderBy: { createdAt: "desc" },
        take: 40,
        include: { actorUser: { select: { id: true, username: true, displayName: true, platformRole: true, storeRole: true } } },
      }),
    ]);

    res.set("Cache-Control", "no-store");
    res.json({
      summary: { failedLogins24h, passwordChanges24h, activeSessions, expiringSessions },
      events: recentSecurityEvents.map(serializeAuditLog),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/audit", requireSuperAdmin, async (req, res, next) => {
  try {
    const query = auditQuerySchema.parse(req.query);
    const logs = await prisma.auditLog.findMany({
      where: {
        ...(query.action ? { action: query.action } : {}),
        ...(query.q
          ? {
              OR: [
                { targetType: { contains: query.q, mode: "insensitive" } },
                { targetId: { contains: query.q, mode: "insensitive" } },
                { actorUser: { username: { contains: query.q, mode: "insensitive" } } },
                { actorUser: { displayName: { contains: query.q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: query.limit,
      include: { actorUser: { select: { id: true, username: true, displayName: true, platformRole: true, storeRole: true } } },
    });

    res.set("Cache-Control", "no-store");
    res.json({ logs: logs.map(serializeAuditLog) });
  } catch (error) {
    next(error);
  }
});

router.get("/system", requireSuperAdmin, async (_req, res, next) => {
  try {
    const [storeCount, userCount, sessionCount, auditCount, oldestAuditLog] = await prisma.$transaction([
      prisma.store.count(),
      prisma.user.count(),
      prisma.session.count(),
      prisma.auditLog.count(),
      prisma.auditLog.findFirst({ orderBy: { createdAt: "asc" } }),
    ]);

    res.set("Cache-Control", "no-store");
    res.json({
      health: {
        database: "ready",
        api: "ready",
        uploads: "configured outside this dashboard",
        line: "per-store configuration",
      },
      counts: { storeCount, userCount, sessionCount, auditCount },
      retention: { oldestAuditLogAt: serializeDate(oldestAuditLog?.createdAt) },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
