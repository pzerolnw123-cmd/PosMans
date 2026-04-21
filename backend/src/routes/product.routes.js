const express = require("express");
const { z } = require("zod");
const { Prisma } = require("../generated/prisma");
const { prisma } = require("../lib/db");
const { requireStoreRole, loadSession } = require("../middleware/auth");
const { requireTrustedOrigin, requireCsrf } = require("../middleware/security");
const { AppError } = require("../utils/app-error");
const { safeTextSchema, safeUrlSchema } = require("../utils/xss");

const router = express.Router();

const productCategories = ["อาหาร", "เครื่องดื่ม", "ของหวาน/ขนม", "รองเท้า", "อะไหล่ / อุปกรณ์เสริม"];
const productStatuses = ["พร้อมขาย", "ปิดขาย"];

const productCreateSchema = z.object({
  name: safeTextSchema("name", 120),
  category: z.enum(productCategories),
  price: z.number().int().min(1).max(1_000_000),
  status: z.enum(productStatuses).default("พร้อมขาย"),
  imageUrl: safeUrlSchema("imageUrl").optional().nullable(),
  uploadedKey: z.string().max(255).optional().nullable(),
});

const productUpdateSchema = z.object({
  name: safeTextSchema("name", 120).optional(),
  category: z.enum(productCategories).optional(),
  price: z.number().int().min(1).max(1_000_000).optional(),
  status: z.enum(productStatuses).optional(),
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
  imageUrl: true,
  uploadedKey: true,
};

async function requireOwnerStoreId(req, res) {
  const session = await loadSession(req, res);
  const storeId = session?.user?.storeId;

  if (!storeId) {
    throw new AppError("Store context is required", 403, { code: "STORE_REQUIRED" });
  }

  return storeId;
}

async function createNextProductCode(storeId, category, offset = 0) {
  const prefix = categoryCodePrefix(category);
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT MAX(
        CASE
          WHEN substring("code" from ${prefix.length + 2}) ~ '^[0-9]+$'
            THEN substring("code" from ${prefix.length + 2})::int
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

async function createProductWithUniqueCode(storeId, parsed) {
  let lastError;

  for (let attempt = 0; attempt < PRODUCT_CODE_CREATE_ATTEMPTS; attempt += 1) {
    const code = await createNextProductCode(storeId, parsed.category, attempt);

    try {
      return await prisma.product.create({
        data: {
          storeId,
          code,
          name: parsed.name,
          category: parsed.category,
          price: parsed.price,
          status: parsed.status,
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
    const product = await createProductWithUniqueCode(storeId, parsed);

    res.status(201).json({ product: serializeProduct(product) });
  } catch (error) {
    next(error);
  }
});

router.patch("/:productId", requireTrustedOrigin, requireCsrf, requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const storeId = await requireOwnerStoreId(req, res);
    const parsed = productUpdateSchema.parse(req.body);

    const existingProduct = await prisma.product.findFirst({
      where: { id: req.params.productId, storeId },
      select: { id: true },
    });

    if (!existingProduct) {
      throw new AppError("Product not found", 404, { code: "PRODUCT_NOT_FOUND" });
    }

    const product = await prisma.product.update({
      where: { id: existingProduct.id },
      data: {
        ...(parsed.name !== undefined ? { name: parsed.name } : {}),
        ...(parsed.category !== undefined ? { category: parsed.category } : {}),
        ...(parsed.price !== undefined ? { price: parsed.price } : {}),
        ...(parsed.status !== undefined ? { status: parsed.status } : {}),
        ...(parsed.imageUrl !== undefined ? { imageUrl: parsed.imageUrl || null } : {}),
        ...(parsed.uploadedKey !== undefined ? { uploadedKey: parsed.uploadedKey || null } : {}),
      },
      select: productSelect,
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
      select: { id: true },
    });

    if (!existingProduct) {
      throw new AppError("Product not found", 404, { code: "PRODUCT_NOT_FOUND" });
    }

    await prisma.product.delete({
      where: { id: existingProduct.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
