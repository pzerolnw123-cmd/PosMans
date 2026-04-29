const { z } = require("zod");
const { Prisma } = require("../generated/prisma");
const { env } = require("../config/env");
const { AppError } = require("../utils/app-error");
const { safeTextSchema, safeUrlSchema } = require("../utils/xss");

const productCategories = ["อาหาร", "เครื่องดื่ม", "ของหวาน/ขนม", "รองเท้า", "อะไหล่ / อุปกรณ์เสริม"];
const productStatuses = ["พร้อมขาย", "ปิดขาย"];
const PRODUCT_CODE_CREATE_ATTEMPTS = 3;

const productCreateSchema = z
  .object({
    name: safeTextSchema("name", 120),
    category: z.enum(productCategories),
    price: z.number().int().min(1).max(1_000_000),
    status: z.enum(productStatuses).default("พร้อมขาย"),
    trackStock: z.boolean().default(false),
    stockQuantity: z.number().int().min(0).max(1_000_000).default(0),
    lowStockThreshold: z.number().int().min(0).max(1_000_000).default(0),
    imageUrl: safeUrlSchema("imageUrl").optional().nullable(),
    uploadedKey: z.string().max(255).optional().nullable(),
  })
  .strict();

const productUpdateSchema = z
  .object({
    name: safeTextSchema("name", 120).optional(),
    category: z.enum(productCategories).optional(),
    price: z.number().int().min(1).max(1_000_000).optional(),
    status: z.enum(productStatuses).optional(),
    trackStock: z.boolean().optional(),
    stockQuantity: z.number().int().min(0).max(1_000_000).optional(),
    lowStockThreshold: z.number().int().min(0).max(1_000_000).optional(),
    imageUrl: safeUrlSchema("imageUrl").optional().nullable(),
    uploadedKey: z.string().max(255).optional().nullable(),
  })
  .strict();

const productListQuerySchema = z.object({
  category: z.enum(["ทั้งหมด", ...productCategories]).optional().default("ทั้งหมด"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(12),
});

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

function ownerUploadPrefix(storeId) {
  return `stores/${storeId}/uploads/`;
}

function assertOwnedUploadedKey(storeId, uploadedKey) {
  if (!uploadedKey) {
    return;
  }

  if (!uploadedKey.startsWith(ownerUploadPrefix(storeId))) {
    throw new AppError("ไม่สามารถใช้ไฟล์นี้ได้", 403, { code: "UPLOAD_SCOPE_MISMATCH" });
  }
}

function assertImageUrlMatchesUploadedKey(uploadedKey, imageUrl) {
  if (!uploadedKey || !imageUrl || !env.R2_PUBLIC_BASE_URL) {
    return;
  }

  const expectedUrl = `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${uploadedKey}`;
  if (imageUrl !== expectedUrl) {
    throw new AppError("ข้อมูลรูปภาพไม่ถูกต้อง กรุณาอัปโหลดใหม่", 400, { code: "UPLOAD_URL_MISMATCH" });
  }
}

function assertUploadPairAndScope(storeId, { imageUrl, uploadedKey }, partial = false) {
  const imageProvided = imageUrl !== undefined;
  const keyProvided = uploadedKey !== undefined;

  if (partial && imageProvided !== keyProvided) {
    throw new AppError("ข้อมูลรูปภาพไม่ครบถ้วน กรุณาอัปโหลดใหม่", 400, { code: "UPLOAD_PAIR_REQUIRED" });
  }

  if (!partial || imageProvided || keyProvided) {
    const nextImageUrl = imageUrl || null;
    const nextUploadedKey = uploadedKey || null;

    if (Boolean(nextImageUrl) !== Boolean(nextUploadedKey)) {
      throw new AppError("ข้อมูลรูปภาพไม่ครบถ้วน กรุณาอัปโหลดใหม่", 400, { code: "UPLOAD_PAIR_REQUIRED" });
    }

    assertOwnedUploadedKey(storeId, nextUploadedKey);
    assertImageUrlMatchesUploadedKey(nextUploadedKey, nextImageUrl);
  }
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

  throw new AppError("ยังไม่สามารถสร้างรหัสสินค้าได้ กรุณาลองอีกครั้ง", 409, {
    code: "PRODUCT_CODE_CONFLICT",
    cause: lastError,
  });
}

module.exports = {
  productCreateSchema,
  productUpdateSchema,
  productListQuerySchema,
  productSelect,
  serializeProduct,
  assertUploadPairAndScope,
  createProductWithUniqueCode,
};
