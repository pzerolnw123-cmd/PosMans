const { z } = require("zod");
const { env } = require("../config/env");
const { AppError } = require("../utils/app-error");
const { safeTextSchema } = require("../utils/xss");

const paymentMethods = ["CASH", "QR", "CARD", "TRANSFER", "OTHER"];
const unavailableProductStatuses = new Set(["ปิดขาย"]);

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
    note: z
      .preprocess((value) => {
        if (value == null) {
          return null;
        }
        if (typeof value === "string") {
          const trimmedValue = value.trim();
          return trimmedValue.length > 0 ? trimmedValue : null;
        }
        return value;
      }, safeTextSchema("note", 300).nullable())
      .optional(),
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

const saleReceiptListSelect = {
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
      quantity: true,
    },
  },
};

const saleReceiptDetailSelect = {
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

function serializeReceiptSummary(order) {
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
    itemCount: order.items.reduce((count, item) => count + item.quantity, 0),
    items: [],
    createdBy: null,
    store: null,
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

function buildOrderItems(mergedItems, products) {
  if (products.length !== mergedItems.length) {
    throw new AppError("มีสินค้าบางรายการไม่พร้อมสำหรับการขาย กรุณาตรวจสอบตะกร้า", 404, { code: "SALE_PRODUCT_NOT_FOUND" });
  }

  const productsById = new Map(products.map((product) => [product.id, product]));
  const orderItems = mergedItems.map((item) => {
    const product = productsById.get(item.productId);
    if (!product || unavailableProductStatuses.has(product.status)) {
      throw new AppError("มีสินค้าบางรายการไม่พร้อมสำหรับการขาย กรุณาตรวจสอบตะกร้า", 409, { code: "SALE_PRODUCT_UNAVAILABLE" });
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
    throw new AppError("มีสินค้าบางรายการคงเหลือไม่พอ กรุณาตรวจสอบตะกร้า", 409, { code: "SALE_INSUFFICIENT_STOCK" });
  }

  return orderItems;
}

function assertSaleTotals(parsed, orderItems) {
  const subtotal = orderItems.reduce((total, item) => total + item.lineTotal, 0);
  const maxDiscount = Math.floor((subtotal * env.MAX_SALE_DISCOUNT_BPS) / 10000);
  const maxTax = Math.floor((subtotal * env.MAX_SALE_TAX_BPS) / 10000);

  if (parsed.discount > maxDiscount) {
    throw new AppError("ส่วนลดเกินกว่าที่ระบบอนุญาต", 400, { code: "SALE_BAD_DISCOUNT" });
  }

  if (parsed.tax > maxTax) {
    throw new AppError("ภาษีหรือค่าธรรมเนียมเกินกว่าที่ระบบอนุญาต", 400, { code: "SALE_BAD_TAX" });
  }

  return {
    subtotal,
    total: subtotal - parsed.discount + parsed.tax,
  };
}

module.exports = {
  createSaleSchema,
  saleListQuerySchema,
  saleSelect,
  saleReceiptListSelect,
  saleReceiptDetailSelect,
  serializeSale,
  serializeReceipt,
  serializeReceiptSummary,
  mergeItems,
  nextSaleCode,
  bangkokDateRange,
  buildOrderItems,
  assertSaleTotals,
};
