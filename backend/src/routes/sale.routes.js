const express = require("express");
const { prisma } = require("../lib/db");
const { getRequiredOwnerStoreId, requireStoreRole } = require("../middleware/auth");
const { requireTrustedOrigin, requireCsrf } = require("../middleware/security");
const { saleCheckoutLimiter } = require("../middleware/rate-limiters");
const { AppError } = require("../utils/app-error");
const { writeAuditLog } = require("../utils/audit");
const {
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
} = require("./sale.route-helpers");

const router = express.Router();

router.get("/", requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const storeId = await getRequiredOwnerStoreId(req, res);
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
        select: saleReceiptListSelect,
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
            select: saleReceiptListSelect,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: (page - 1) * query.pageSize,
            take: query.pageSize,
          });

    res.set("Cache-Control", "no-store");
    res.json({
      receipts: receipts.map(serializeReceiptSummary),
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
    const storeId = await getRequiredOwnerStoreId(req, res);
    const receipt = await prisma.saleOrder.findFirst({
      where: { id: req.params.saleId, storeId },
      select: saleReceiptDetailSelect,
    });

    if (!receipt) {
      throw new AppError("ไม่พบใบเสร็จที่ต้องการ", 404, { code: "RECEIPT_NOT_FOUND" });
    }

    res.set("Cache-Control", "no-store");
    res.json({ receipt: serializeReceipt(receipt) });
  } catch (error) {
    next(error);
  }
});

router.post("/", saleCheckoutLimiter, requireTrustedOrigin, requireCsrf, requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const storeId = await getRequiredOwnerStoreId(req, res);
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
    const orderItems = buildOrderItems(mergedItems, products);
    const { subtotal, total } = assertSaleTotals(parsed, orderItems);

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
            stockTrackedItems.map(async (item) => {
              const updatedProducts = await tx.product.updateManyAndReturn({
                where: {
                  id: item.productId,
                  storeId,
                  trackStock: true,
                  stockQuantity: { gte: item.quantity },
                },
                data: {
                  stockQuantity: { decrement: item.quantity },
                },
                select: {
                  id: true,
                  stockQuantity: true,
                },
              });

              const updatedProduct = updatedProducts[0] ?? null;
              return updatedProduct
                ? {
                    item,
                    stockQuantityAfter: updatedProduct.stockQuantity,
                  }
                : null;
            }),
          );

          if (stockUpdates.some((updated) => updated === null)) {
            throw new AppError("มีสินค้าบางรายการคงเหลือไม่พอ กรุณาตรวจสอบตะกร้า", 409, { code: "SALE_INSUFFICIENT_STOCK" });
          }

          if (stockTrackedItems.length > 0) {
            await tx.inventoryMovement.createMany({
              data: stockUpdates.map(({ item, stockQuantityAfter }) => ({
                storeId,
                productId: item.productId,
                createdByUserId: req.session.user.id,
                type: "SALE",
                quantityChange: -item.quantity,
                quantityBefore: stockQuantityAfter + item.quantity,
                quantityAfter: stockQuantityAfter,
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

      throw new AppError("ยังไม่สามารถสร้างบิลได้ กรุณาลองอีกครั้ง", 409, { code: "SALE_CODE_CONFLICT" });
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

