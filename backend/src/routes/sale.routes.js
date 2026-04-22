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
      };
    });

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
          return await tx.saleOrder.create({
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
                create: orderItems,
              },
            },
            select: saleSelect,
          });
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
