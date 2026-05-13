const { AppError } = require("../utils/app-error");

const PLAN_LIMIT_CODE = "PLAN_LIMIT_REACHED";
const PLAN_LIMIT_STATUS = 409;

const PLAN_LIMITS = {
  START: {
    paymentConfirmationsPerMonth: 30,
    products: 7,
    stockQuantityTotal: 300,
  },
  PLUS: {
    paymentConfirmationsPerMonth: null,
    products: null,
    stockQuantityTotal: null,
  },
};

function getBangkokPeriodKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

function normalizePlan(plan) {
  if (!plan || plan.status !== "ACTIVE") {
    return { tier: "START", status: plan?.status || "ACTIVE" };
  }

  if (plan.tier === "PLUS") {
    return { tier: "PLUS", status: plan.status };
  }

  return { tier: "START", status: plan.status };
}

async function ensureStorePlan(db, storeId) {
  return db.storePlan.upsert({
    where: { storeId },
    update: {},
    create: { storeId, tier: "START", status: "ACTIVE" },
  });
}

async function lockStorePlan(db, storeId) {
  await ensureStorePlan(db, storeId);
  return db.storePlan.update({
    where: { storeId },
    data: { lockVersion: { increment: 1 } },
  });
}

async function ensurePlanUsage(db, storeId, period = getBangkokPeriodKey()) {
  return db.storePlanUsage.upsert({
    where: { storeId_period: { storeId, period } },
    update: {},
    create: { storeId, period },
  });
}

function createLimitError(message, details) {
  return new AppError(message, PLAN_LIMIT_STATUS, {
    code: PLAN_LIMIT_CODE,
    details,
  });
}

async function consumePaymentConfirmation(db, storeId) {
  const plan = normalizePlan(await lockStorePlan(db, storeId));
  const limits = PLAN_LIMITS[plan.tier];

  if (limits.paymentConfirmationsPerMonth === null) {
    return { plan: plan.tier, limited: false };
  }

  const period = getBangkokPeriodKey();
  const usage = await ensurePlanUsage(db, storeId, period);
  const updated = await db.storePlanUsage.updateMany({
    where: {
      id: usage.id,
      paymentConfirmCount: { lt: limits.paymentConfirmationsPerMonth },
    },
    data: {
      paymentConfirmCount: { increment: 1 },
    },
  });

  if (updated.count !== 1) {
    throw createLimitError(`แผน Start ยืนยันชำระเงินได้ ${limits.paymentConfirmationsPerMonth} ครั้งต่อเดือน`, {
      plan: plan.tier,
      limitKey: "paymentConfirmationsPerMonth",
      limit: limits.paymentConfirmationsPerMonth,
      used: usage.paymentConfirmCount,
      period,
    });
  }

  return {
    plan: plan.tier,
    limited: true,
    period,
    used: usage.paymentConfirmCount + 1,
    limit: limits.paymentConfirmationsPerMonth,
  };
}

async function assertProductCreateAllowed(db, storeId, nextStockQuantity) {
  const plan = normalizePlan(await lockStorePlan(db, storeId));
  const limits = PLAN_LIMITS[plan.tier];
  const [productCount, stockTotal] = await Promise.all([
    db.product.count({ where: { storeId } }),
    getTrackedStockTotal(db, storeId),
  ]);

  if (limits.products !== null) {
    if (productCount >= limits.products) {
      throw createLimitError(`แผน Start เพิ่มสินค้าได้สูงสุด ${limits.products} รายการ`, {
        plan: plan.tier,
        limitKey: "products",
        limit: limits.products,
        used: productCount,
        productCount,
        productLimit: limits.products,
        stockTotal,
        stockLimit: limits.stockQuantityTotal,
      });
    }
  }

  if (limits.stockQuantityTotal !== null && nextStockQuantity > 0) {
    const nextTotal = stockTotal + nextStockQuantity;
    if (nextTotal > limits.stockQuantityTotal) {
      throw createLimitError(`แผน Start จำนวนสต๊อกรวมได้สูงสุด ${limits.stockQuantityTotal} ชิ้น`, {
        plan: plan.tier,
        limitKey: "stockQuantityTotal",
        limit: limits.stockQuantityTotal,
        used: stockTotal,
        requested: nextStockQuantity,
        productCount,
        productLimit: limits.products,
        stockTotal,
        stockLimit: limits.stockQuantityTotal,
      });
    }
  }
}

async function assertProductUpdateAllowed(db, storeId, productId, currentStockQuantity, nextStockQuantity) {
  const plan = normalizePlan(await lockStorePlan(db, storeId));
  const limits = PLAN_LIMITS[plan.tier];

  if (limits.stockQuantityTotal === null) {
    return;
  }

  const [stockTotalExcludingProduct, productCount] = await Promise.all([
    getTrackedStockTotal(db, storeId, productId),
    db.product.count({ where: { storeId } }),
  ]);
  const currentTotal = stockTotalExcludingProduct + currentStockQuantity;
  const nextTotal = stockTotalExcludingProduct + nextStockQuantity;

  if (nextTotal > limits.stockQuantityTotal && nextTotal > currentTotal) {
    throw createLimitError(`แผน Start จำนวนสต๊อกรวมได้สูงสุด ${limits.stockQuantityTotal} ชิ้น`, {
      plan: plan.tier,
      limitKey: "stockQuantityTotal",
      limit: limits.stockQuantityTotal,
      used: currentTotal,
      requested: nextStockQuantity,
      productCount,
      productLimit: limits.products,
      stockTotal: currentTotal,
      stockLimit: limits.stockQuantityTotal,
      nextStockTotal: nextTotal,
    });
  }
}

async function getTrackedStockTotal(db, storeId, excludeProductId) {
  const result = await db.product.aggregate({
    where: {
      storeId,
      trackStock: true,
      ...(excludeProductId ? { id: { not: excludeProductId } } : {}),
    },
    _sum: { stockQuantity: true },
  });
  return Number(result._sum?.stockQuantity || 0);
}

async function getStorePlanSummary(db, storeId) {
  const plan = normalizePlan(await ensureStorePlan(db, storeId));
  const period = getBangkokPeriodKey();
  const [usage, productCount, stockTotal] = await Promise.all([
    ensurePlanUsage(db, storeId, period),
    db.product.count({ where: { storeId } }),
    getTrackedStockTotal(db, storeId),
  ]);

  return {
    plan: plan.tier,
    status: plan.status,
    period,
    limits: PLAN_LIMITS[plan.tier],
    usage: {
      paymentConfirmationsThisMonth: usage.paymentConfirmCount,
      products: productCount,
      stockQuantityTotal: stockTotal,
    },
  };
}

module.exports = {
  PLAN_LIMIT_CODE,
  PLAN_LIMITS,
  assertProductCreateAllowed,
  assertProductUpdateAllowed,
  consumePaymentConfirmation,
  getStorePlanSummary,
};
