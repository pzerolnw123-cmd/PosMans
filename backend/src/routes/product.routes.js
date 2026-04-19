const express = require("express");
const { z } = require("zod");
const { prisma } = require("../lib/db");
const { requireStoreRole, loadSession } = require("../middleware/auth");
const { requireTrustedOrigin, requireCsrf } = require("../middleware/security");
const { AppError } = require("../utils/app-error");
const { safeTextSchema, safeUrlSchema } = require("../utils/xss");

const router = express.Router();

const productCategories = ["อาหาร", "เครื่องดื่ม", "ของหวาน/ขนม", "รองเท้า", "อะไหล่ / อุปกรณ์เสริม"];
const productStatuses = ["พร้อมขาย", "ใกล้หมด"];

const productCreateSchema = z.object({
  name: safeTextSchema("name", 120),
  category: z.enum(productCategories),
  price: z.number().int().min(0).max(1_000_000),
  status: z.enum(productStatuses).default("พร้อมขาย"),
  imageUrl: safeUrlSchema("imageUrl").optional().nullable(),
  uploadedKey: z.string().max(255).optional().nullable(),
});

const productUpdateSchema = z.object({
  name: safeTextSchema("name", 120).optional(),
  category: z.enum(productCategories).optional(),
  price: z.number().int().min(0).max(1_000_000).optional(),
  status: z.enum(productStatuses).optional(),
  imageUrl: safeUrlSchema("imageUrl").optional().nullable(),
  uploadedKey: z.string().max(255).optional().nullable(),
});

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

async function requireOwnerStoreId(req, res) {
  const session = await loadSession(req, res);
  const storeId = session?.user?.storeId;

  if (!storeId) {
    throw new AppError("Store context is required", 403, { code: "STORE_REQUIRED" });
  }

  return storeId;
}

async function createNextProductCode(storeId, category) {
  const prefix = categoryCodePrefix(category);
  const products = await prisma.product.findMany({
    where: { storeId, code: { startsWith: `${prefix}-` } },
    select: { code: true },
  });

  const maxCode = products.reduce((max, product) => {
    const parsed = Number(product.code.slice(prefix.length + 1));
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
  }, 0);

  return `${prefix}-${String(maxCode + 1).padStart(3, "0")}`;
}

router.get("/", requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const storeId = await requireOwnerStoreId(req, res);
    const products = await prisma.product.findMany({
      where: { storeId },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    res.set("Cache-Control", "no-store");
    res.json({ products: products.map(serializeProduct) });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireTrustedOrigin, requireCsrf, requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const storeId = await requireOwnerStoreId(req, res);
    const parsed = productCreateSchema.parse(req.body);
    const code = await createNextProductCode(storeId, parsed.category);

    const product = await prisma.product.create({
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

    const existingProduct = await prisma.product.findFirst({
      where: { id: req.params.productId, storeId },
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
