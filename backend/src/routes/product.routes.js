const express = require("express");
const { prisma } = require("../lib/db");
const { requireStoreRole, loadSession } = require("../middleware/auth");
const { requireTrustedOrigin, requireCsrf } = require("../middleware/security");
const { AppError } = require("../utils/app-error");
const { deleteR2Object } = require("../lib/r2");
const { writeAuditLog } = require("../utils/audit");
const {
  productCreateSchema,
  productUpdateSchema,
  productListQuerySchema,
  productSelect,
  serializeProduct,
  assertUploadPairAndScope,
  createProductWithUniqueCode,
} = require("./product.route-helpers");

const router = express.Router();

async function requireOwnerStoreId(req, res) {
  const session = await loadSession(req, res);
  const storeId = session?.user?.storeId;

  if (!storeId) {
    throw new AppError("Store context is required", 403, { code: "STORE_REQUIRED" });
  }

  return storeId;
}

router.get("/", requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const storeId = await requireOwnerStoreId(req, res);
    const query = productListQuerySchema.parse(req.query);
    const where = {
      storeId,
      ...(query.category === "ทั้งหมด" ? {} : { category: query.category }),
    };
    const requestedPage = query.page;
    const [totalItems, requestedProducts] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        select: productSelect,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        skip: (requestedPage - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize));
    const page = Math.min(requestedPage, totalPages);
    const products =
      page === requestedPage
        ? requestedProducts
        : await prisma.product.findMany({
            where,
            select: productSelect,
            orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
            skip: (page - 1) * query.pageSize,
            take: query.pageSize,
          });

    res.set("Cache-Control", "no-store");
    res.json({
      products: products.map(serializeProduct),
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

router.post("/", requireTrustedOrigin, requireCsrf, requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const storeId = await requireOwnerStoreId(req, res);
    const parsed = productCreateSchema.parse(req.body);
    assertUploadPairAndScope(storeId, parsed);

    const product = await prisma.$transaction(async (tx) => {
      const createdProduct = await createProductWithUniqueCode(tx, storeId, parsed);

      if (createdProduct.trackStock && createdProduct.stockQuantity > 0) {
        await tx.inventoryMovement.create({
          data: {
            storeId,
            productId: createdProduct.id,
            createdByUserId: req.session.user.id,
            type: "RECEIVE",
            quantityChange: createdProduct.stockQuantity,
            quantityBefore: 0,
            quantityAfter: createdProduct.stockQuantity,
            reason: "Initial stock",
            referenceType: "product",
            referenceId: createdProduct.id,
          },
        });
      }

      return createdProduct;
    });

    await writeAuditLog({
      action: "PRODUCT_CREATED",
      actorUserId: req.session.user.id,
      status: "success",
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
      targetType: "product",
      targetId: product.id,
      metadata: { storeId, code: product.code, category: product.category },
    });

    res.status(201).json({ product: serializeProduct(product) });
  } catch (error) {
    next(error);
  }
});

router.patch("/:productId", requireTrustedOrigin, requireCsrf, requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const storeId = await requireOwnerStoreId(req, res);
    const parsed = productUpdateSchema.parse(req.body);
    assertUploadPairAndScope(storeId, parsed, true);

    const existingProduct = await prisma.product.findFirst({
      where: { id: req.params.productId, storeId },
      select: { id: true, uploadedKey: true, trackStock: true, stockQuantity: true, lowStockThreshold: true },
    });

    if (!existingProduct) {
      throw new AppError("Product not found", 404, { code: "PRODUCT_NOT_FOUND" });
    }

    const nextTrackStock = parsed.trackStock ?? existingProduct.trackStock;
    const nextStockQuantity = nextTrackStock ? parsed.stockQuantity ?? existingProduct.stockQuantity : 0;
    const nextLowStockThreshold = nextTrackStock ? parsed.lowStockThreshold ?? existingProduct.lowStockThreshold : 0;
    const stockChanged = nextStockQuantity !== existingProduct.stockQuantity;

    const product = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id: existingProduct.id },
        data: {
          ...(parsed.name !== undefined ? { name: parsed.name } : {}),
          ...(parsed.category !== undefined ? { category: parsed.category } : {}),
          ...(parsed.price !== undefined ? { price: parsed.price } : {}),
          ...(parsed.status !== undefined ? { status: parsed.status } : {}),
          ...(parsed.trackStock !== undefined ? { trackStock: parsed.trackStock } : {}),
          ...(parsed.stockQuantity !== undefined || parsed.trackStock !== undefined ? { stockQuantity: nextStockQuantity } : {}),
          ...(parsed.lowStockThreshold !== undefined || parsed.trackStock !== undefined ? { lowStockThreshold: nextLowStockThreshold } : {}),
          ...(parsed.imageUrl !== undefined ? { imageUrl: parsed.imageUrl || null } : {}),
          ...(parsed.uploadedKey !== undefined ? { uploadedKey: parsed.uploadedKey || null } : {}),
        },
        select: productSelect,
      });

      if (stockChanged) {
        await tx.inventoryMovement.create({
          data: {
            storeId,
            productId: existingProduct.id,
            createdByUserId: req.session.user.id,
            type: "ADJUSTMENT",
            quantityChange: nextStockQuantity - existingProduct.stockQuantity,
            quantityBefore: existingProduct.stockQuantity,
            quantityAfter: nextStockQuantity,
            reason: nextTrackStock ? "Manual stock update" : "Stock tracking disabled",
            referenceType: "product",
            referenceId: existingProduct.id,
          },
        });
      }

      return updatedProduct;
    });

    if (parsed.uploadedKey !== undefined && existingProduct.uploadedKey && existingProduct.uploadedKey !== parsed.uploadedKey) {
      await deleteR2Object(existingProduct.uploadedKey);
    }

    await writeAuditLog({
      action: "PRODUCT_UPDATED",
      actorUserId: req.session.user.id,
      status: "success",
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
      targetType: "product",
      targetId: product.id,
      metadata: { storeId, changedFields: Object.keys(parsed) },
    });

    res.json({ product: serializeProduct(product) });
  } catch (error) {
    next(error);
  }
});

router.delete("/:productId", requireTrustedOrigin, requireCsrf, requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const storeId = await requireOwnerStoreId(req, res);
    const existingProduct = await prisma.product.findFirst({
      where: { id: req.params.productId, storeId },
      select: { id: true, uploadedKey: true },
    });

    if (!existingProduct) {
      throw new AppError("Product not found", 404, { code: "PRODUCT_NOT_FOUND" });
    }

    if (existingProduct.uploadedKey) {
      await deleteR2Object(existingProduct.uploadedKey);
    }

    await prisma.product.delete({
      where: { id: existingProduct.id },
    });

    await writeAuditLog({
      action: "PRODUCT_DELETED",
      actorUserId: req.session.user.id,
      status: "success",
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
      targetType: "product",
      targetId: existingProduct.id,
      metadata: { storeId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
