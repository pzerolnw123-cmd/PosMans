const express = require("express");
const { z } = require("zod");
const { Prisma } = require("../generated/prisma");
const { prisma } = require("../lib/db");
const { env } = require("../config/env");
const { requireStoreRole, loadSession } = require("../middleware/auth");
const { requireTrustedOrigin, requireCsrf } = require("../middleware/security");
const { AppError } = require("../utils/app-error");
const { safeTextSchema, safeUrlSchema } = require("../utils/xss");
const { deleteR2Object } = require("../lib/r2");
const { writeAuditLog } = require("../utils/audit");

const router = express.Router();

const productCategories = ["อาหาร", "เครื่องดื่ม", "ของหวาน/ขนม", "รองเท้า", "อะไหล่ / อุปกรณ์เสริม"];
const productStatuses = ["พร้อมขาย", "ปิดขาย"];

const productCreateSchema = z.object({
  name: safeTextSchema("name", 120),
  category: z.enum(productCategories),
  price: z.number().int().min(1).max(1_000_000),
  status: z.enum(productStatuses).default("พร้อมขาย"),
  trackStock: z.boolean().default(false),
  stockQuantity: z.number().int().min(0).max(1_000_000).default(0),
  lowStockThreshold: z.number().int().min(0).max(1_000_000).default(0),
  imageUrl: safeUrlSchema("imageUrl").optional().nullable(),
  uploadedKey: z.string().max(255).optional().nullable(),
});

const productUpdateSchema = z.object({
  name: safeTextSchema("name", 120).optional(),
  category: z.enum(productCategories).optional(),
  price: z.number().int().min(1).max(1_000_000).optional(),
  status: z.enum(productStatuses).optional(),
  trackStock: z.boolean().optional(),
  stockQuantity: z.number().int().min(0).max(1_000_000).optional(),
  lowStockThreshold: z.number().int().min(0).max(1_000_000).optional(),
  imageUrl: safeUrlSchema("imageUrl").optional().nullable(),
  uploadedKey: z.string().max(255).optional().nullable(),
});

const productListQuerySchema = z.object({
  category: z.enum(["ทั้งหมด", ...productCategories]).optional().default("ทั้งหมด"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(12),
});

const PRODUCT_CODE_CREATE_ATTEMPTS = 3;

function categoryCodePrefix(category) {
  switch (category) {
    case "อาหาร":
      return "FOOD";
    case "เครื่องดื่ม":
      return "DRINK";
    case "ของหวาน/ขนม":
      return "DESSERT";
    case "รองเท้า":
      return "SHOE";
    case "อะไหล่ / อุปกรณ์เสริม":
      return "PART";
    default:
      return "ITEM";
  }
}

function serializeProduct(product) {
  return {
    id: product.id,
    code: product.code,
    name: product.name,
    category: product.category,
    price: product.price,
    status: product.status,
    trackStock: product.trackStock,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold,
    imageUrl: product.imageUrl,
    uploadedKey: product.uploadedKey,
  };
}

const productSelect = {
  id: true,
  code: true,
  name: true,
  category: true,
  price: true,
  status: true,
  trackStock: true,
  stockQuantity: true,
  lowStockThreshold: true,
  imageUrl: true,
  uploadedKey: true,
};

function ownerUploadPrefix(storeId) {
  return `stores/${storeId}/uploads/`;
}

function assertOwnedUploadedKey(storeId, uploadedKey) {
  if (!uploadedKey) {
    return;
  }

  if (!uploadedKey.startsWith(ownerUploadPrefix(storeId))) {
    throw new AppError("Uploaded file does not belong to this store", 403, { code: "UPLOAD_SCOPE_MISMATCH" });
  }
}

function assertImageUrlMatchesUploadedKey(uploadedKey, imageUrl) {
  if (!uploadedKey || !imageUrl || !env.R2_PUBLIC_BASE_URL) {
    return;
  }

  const expectedUrl = `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${uploadedKey}`;
  if (imageUrl !== expectedUrl) {
    throw new AppError("Image URL does not match uploaded file", 400, { code: "UPLOAD_URL_MISMATCH" });
  }
}

function assertUploadPairAndScope(storeId, { imageUrl, uploadedKey }, partial = false) {
  const imageProvided = imageUrl !== undefined;
  const keyProvided = uploadedKey !== undefined;

  if (partial && imageProvided !== keyProvided) {
    throw new AppError("Image URL and uploaded key must be updated together", 400, { code: "UPLOAD_PAIR_REQUIRED" });
  }

  if (!partial || imageProvided || keyProvided) {
    const nextImageUrl = imageUrl || null;
    const nextUploadedKey = uploadedKey || null;

    if (Boolean(nextImageUrl) !== Boolean(nextUploadedKey)) {
      throw new AppError("Image URL and uploaded key must be saved together", 400, { code: "UPLOAD_PAIR_REQUIRED" });
    }

    assertOwnedUploadedKey(storeId, nextUploadedKey);
    assertImageUrlMatchesUploadedKey(nextUploadedKey, nextImageUrl);
  }
}

async function requireOwnerStoreId(req, res) {
  const session = await loadSession(req, res);
  const storeId = session?.user?.storeId;

  if (!storeId) {
    throw new AppError("Store context is required", 403, { code: "STORE_REQUIRED" });
  }

  return storeId;
}

async function createNextProductCode(db, storeId, category, offset = 0) {
  const prefix = categoryCodePrefix(category);
  const startIdx = prefix.length + 2;
  const rows = await db.$queryRaw(
    Prisma.sql`
      SELECT MAX(
        CASE
          WHEN SUBSTR("code", ${startIdx}) ~ '^[0-9]+$'
            THEN SUBSTR("code", ${startIdx})::int
          ELSE 0
        END
      ) AS "maxCode"
      FROM "Product"
      WHERE "storeId" = ${storeId}
        AND "code" LIKE ${`${prefix}-%`}
    `,
  );
  
  const maxCode = Number(rows[0]?.maxCode ?? 0);
  const nextNumber = (Number.isFinite(maxCode) ? maxCode : 0) + 1 + offset;

  return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
}

function isProductCodeUniqueConflict(error) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function createProductWithUniqueCode(db, storeId, parsed) {
  let lastError;

  for (let attempt = 0; attempt < PRODUCT_CODE_CREATE_ATTEMPTS; attempt += 1) {
    const code = await createNextProductCode(db, storeId, parsed.category, attempt);

    try {
      return await db.product.create({
        data: {
          storeId,
          code,
          name: parsed.name,
          category: parsed.category,
          price: parsed.price,
          status: parsed.status,
          trackStock: parsed.trackStock,
          stockQuantity: parsed.trackStock ? parsed.stockQuantity : 0,
          lowStockThreshold: parsed.trackStock ? parsed.lowStockThreshold : 0,
          imageUrl: parsed.imageUrl || null,
          uploadedKey: parsed.uploadedKey || null,
        },
        select: productSelect,
      });
    } catch (error) {
      if (!isProductCodeUniqueConflict(error)) {
        throw error;
      }

      lastError = error;
    }
  }

  throw new AppError("Could not allocate product code after multiple attempts", 409, { 
    code: "PRODUCT_CODE_CONFLICT", 
    cause: lastError 
  });
}

router.get("/", requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const storeId = await requireOwnerStoreId(req, res);
    const query = productListQuerySchema.parse(req.query);
    const where = {
      storeId,
      ...(query.category === "ทั้งหมด" ? {} : { category: query.category }),
    };
    const totalItems = await prisma.product.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize));
    const page = Math.min(query.page, totalPages);
    const products = await prisma.product.findMany({
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
