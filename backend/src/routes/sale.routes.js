const express = require("express");
const { z } = require("zod");
const { prisma } = require("../lib/db");
const { requireStoreRole, loadSession } = require("../middleware/auth");
const { requireTrustedOrigin, requireCsrf } = require("../middleware/security");
const { saleCheckoutLimiter } = require("../middleware/rate-limiters");
const { AppError } = require("../utils/app-error");
const { writeAuditLog } = require("../utils/audit");
const { env } = require("../config/env");

const router = express.Router();

const paymentMethods = ["CASH", "QR", "CARD", "TRANSFER", "OTHER"];

const saleItemSchema = z
  .object({
    productId: z.string().min(1).max(128),
    quantity: z.number().int().min(1).max(999),
  })
  .strict();

const createSaleSchema = z
  .object({
    items: z.array(saleItemSchema).min(1).max(100),
    paymentMethod: z.enum(paymentMethods).default("CASH"),
    discount: z.number().int().min(0).max(1_000_000).default(0),
    tax: z.number().int().min(0).max(1_000_000).default(0),
    note: z.string().trim().max(300).optional().nullable(),
  })
  .strict();

const saleListQuerySchema = z.object({
  q: z.string().trim().max(80).optional().default(""),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(12),
});

const saleSelect = {
  id: true,
  code: true,
  status: true,
  paymentMethod: true,
  subtotal: true,
  discount: true,
  tax: true,
  total: true,
  note: true,
  createdAt: true,
  items: {
    select: {
      id: true,
      quantity: true,
      unitPrice: true,
      lineTotal: true,
      productId: true,
      productCode: true,
      productName: true,
      productCategory: true,
    },
  },
};

const saleListSelect = {
  id: true,
  code: true,
  status: true,
  paymentMethod: true,
  subtotal: true,
  discount: true,
  tax: true,
  total: true,
  note: true,
  createdAt: true,
  items: {
    select: {
      id: true,
      quantity: true,
      unitPrice: true,
      lineTotal: true,
      productId: true,
      productCode: true,
      productName: true,
      productCategory: true,
    },
    orderBy: { id: "asc" },
  },
  createdBy: {
    select: {
      id: true,
      displayName: true,
      username: true,
    },
  },
  store: {
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
    },
  },
};

async function requireOwnerStoreId(req, res) {
  const session = await loadSession(req, res);
  const storeId = session?.user?.storeId;

  if (!storeId) {
    throw new AppError("Store context is required", 403, { code: "STORE_REQUIRED" });
  }

  return storeId;
}

function serializeSale(order) {
  return {
    id: order.id,
    code: order.code,
    status: order.status,
    paymentMethod: order.paymentMethod,
    subtotal: order.subtotal,
    discount: order.discount,
    tax: order.tax,
    total: order.total,
    note: order.note,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      code: item.productCode,
      name: item.productName,
      category: item.productCategory,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
  };
}

function serializeReceipt(order) {
  const sale = serializeSale(order);
  return {
    ...sale,
    itemCount: sale.items.reduce((count, item) => count + item.quantity, 0),
    createdBy: order.createdBy
      ? {
          id: order.createdBy.id,
          displayName: order.createdBy.displayName,
          username: order.createdBy.username,
        }
      : null,
    store: order.store
      ? {
          id: order.store.id,
          name: order.store.name,
          slug: order.store.slug,
          logoUrl: order.store.logoUrl,
        }
      : null,
  };
}

function mergeItems(items) {
  const merged = new Map();
  for (const item of items) {
    merged.set(item.productId, (merged.get(item.productId) || 0) + item.quantity);
  }
  return Array.from(merged, ([productId, quantity]) => ({ productId, quantity }));
}

function nextSaleCode(storeId) {
  const today = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `SALE-${today}-${storeId.slice(-4).toUpperCase()}-${random}`;
}

function bangkokDateRange(dateText) {
  if (!dateText) return null;

  const start = new Date(`${dateText}T00:00:00.000+07:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { gte: start, lt: end };
}

router.get("/", requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const storeId = await requireOwnerStoreId(req, res);
    const query = saleListQuerySchema.parse(req.query);
    const search = query.q.trim();
    const createdAt = bangkokDateRange(query.date);
    const where = {
      storeId,
      ...(createdAt ? { createdAt } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              { note: { contains: search, mode: "insensitive" } },
              { items: { some: { productName: { contains: search, mode: "insensitive" } } } },
              { items: { some: { productCode: { contains: search, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };

    const requestedPage = query.page;
    const [totalItems, requestedReceipts] = await prisma.$transaction([
      prisma.saleOrder.count({ where }),
      prisma.saleOrder.findMany({
        where,
        select: saleListSelect,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (requestedPage - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize));
    const page = Math.min(requestedPage, totalPages);
    const receipts =
      page === requestedPage
        ? requestedReceipts
        : await prisma.saleOrder.findMany({
            where,
            select: saleListSelect,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: (page - 1) * query.pageSize,
            take: query.pageSize,
          });

    res.set("Cache-Control", "no-store");
    res.json({
      receipts: receipts.map(serializeReceipt),
      pagination: {
        page,
        pageSize: query.pageSize,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:saleId", requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const storeId = await requireOwnerStoreId(req, res);
    const receipt = await prisma.saleOrder.findFirst({
      where: { id: req.params.saleId, storeId },
      select: saleListSelect,
    });

    if (!receipt) {
      throw new AppError("Receipt not found", 404, { code: "RECEIPT_NOT_FOUND" });
    }

    res.set("Cache-Control", "no-store");
    res.json({ receipt: serializeReceipt(receipt) });
  } catch (error) {
    next(error);
  }
});

router.post("/", saleCheckoutLimiter, requireTrustedOrigin, requireCsrf, requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const storeId = await requireOwnerStoreId(req, res);
    const parsed = createSaleSchema.parse(req.body);
    const mergedItems = mergeItems(parsed.items);
    const productIds = mergedItems.map((item) => item.productId);

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        storeId,
      },
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        price: true,
        status: true,
        trackStock: true,
        stockQuantity: true,
        lowStockThreshold: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new AppError("Some products were not found in this store", 404, { code: "SALE_PRODUCT_NOT_FOUND" });
    }

    const productsById = new Map(products.map((product) => [product.id, product]));
    const orderItems = mergedItems.map((item) => {
      const product = productsById.get(item.productId);
      if (!product || product.status !== "พร้อมขาย") {
        throw new AppError("Some products are not available for sale", 409, { code: "SALE_PRODUCT_UNAVAILABLE" });
      }

      return {
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.price,
        lineTotal: product.price * item.quantity,
        productCode: product.code,
        productName: product.name,
        productCategory: product.category,
        trackStock: product.trackStock,
        stockQuantity: product.stockQuantity,
      };
    });

    const insufficientStockItem = orderItems.find((item) => item.trackStock && item.stockQuantity < item.quantity);
    if (insufficientStockItem) {
      throw new AppError("Some products do not have enough stock", 409, { code: "SALE_INSUFFICIENT_STOCK" });
    }

    const subtotal = orderItems.reduce((total, item) => total + item.lineTotal, 0);
    const maxDiscount = Math.floor((subtotal * env.MAX_SALE_DISCOUNT_BPS) / 10000);
    const maxTax = Math.floor((subtotal * env.MAX_SALE_TAX_BPS) / 10000);
    if (parsed.discount > maxDiscount) {
      throw new AppError("Discount exceeds the configured sale limit", 400, { code: "SALE_BAD_DISCOUNT" });
    }

    if (parsed.tax > maxTax) {
      throw new AppError("Tax exceeds the configured sale limit", 400, { code: "SALE_BAD_TAX" });
    }

    const total = subtotal - parsed.discount + parsed.tax;
    const order = await prisma.$transaction(async (tx) => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          const createdOrder = await tx.saleOrder.create({
            data: {
              code: nextSaleCode(storeId),
              storeId,
              createdByUserId: req.session.user.id,
              paymentMethod: parsed.paymentMethod,
              subtotal,
              discount: parsed.discount,
              tax: parsed.tax,
              total,
              note: parsed.note || null,
              items: {
                create: orderItems.map(({ trackStock, stockQuantity, ...item }) => item),
              },
            },
            select: saleSelect,
          });

          const stockTrackedItems = orderItems.filter((entry) => entry.trackStock);
          const stockUpdates = await Promise.all(
            stockTrackedItems.map((item) =>
              tx.product.updateMany({
                where: {
                  id: item.productId,
                  storeId,
                  trackStock: true,
                  stockQuantity: { gte: item.quantity },
                },
                data: {
                  stockQuantity: { decrement: item.quantity },
                },
              }),
            ),
          );

          if (stockUpdates.some((updated) => updated.count !== 1)) {
            throw new AppError("Some products do not have enough stock", 409, { code: "SALE_INSUFFICIENT_STOCK" });
          }

          if (stockTrackedItems.length > 0) {
            await tx.inventoryMovement.createMany({
              data: stockTrackedItems.map((item) => ({
                storeId,
                productId: item.productId,
                createdByUserId: req.session.user.id,
                type: "SALE",
                quantityChange: -item.quantity,
                quantityBefore: item.stockQuantity,
                quantityAfter: item.stockQuantity - item.quantity,
                reason: "Sale checkout",
                referenceType: "saleOrder",
                referenceId: createdOrder.id,
              })),
            });
          }

          return createdOrder;
        } catch (error) {
          if (error?.code !== "P2002" || attempt === 4) {
            throw error;
          }
        }
      }

      throw new AppError("Could not allocate sale code", 409, { code: "SALE_CODE_CONFLICT" });
    });

    await writeAuditLog({
      action: "SALE_CREATED",
      actorUserId: req.session.user.id,
      status: "success",
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
      targetType: "saleOrder",
      targetId: order.id,
      metadata: {
        storeId,
        code: order.code,
        total: order.total,
        itemCount: order.items.reduce((count, item) => count + item.quantity, 0),
      },
    });

    res.status(201).json({ sale: serializeSale(order) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
