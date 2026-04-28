const express = require("express");
const { z } = require("zod");
const { prisma } = require("../lib/db");
const { requireStoreRole, loadSession } = require("../middleware/auth");
const { AppError } = require("../utils/app-error");
const { bangkokDateRange } = require("./sale.route-helpers");

const router = express.Router();
const DAY_MS = 24 * 60 * 60 * 1000;
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const paymentMethods = ["CASH", "QR", "TRANSFER"];

const reportQuerySchema = z.object({
  range: z.enum(["today", "yesterday", "7d", "month"]).optional().default("today"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().default(""),
});

async function requireOwnerStoreId(req, res) {
  const session = await loadSession(req, res);
  const storeId = session?.user?.storeId;

  if (!storeId) {
    throw new AppError("Store context is required", 403, { code: "STORE_REQUIRED" });
  }

  return storeId;
}

function bangkokDateText(value = new Date()) {
  return new Date(value.getTime() + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
}

function shiftBangkokDate(dateText, days) {
  const shifted = new Date(`${dateText}T00:00:00.000+07:00`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return bangkokDateText(shifted);
}

function getReportRange(range, date) {
  if (date) {
    return { dateFrom: date, dateTo: date, createdAt: bangkokDateRange(date), bucket: "hour" };
  }

  const today = bangkokDateText();

  if (range === "yesterday") {
    const dateText = shiftBangkokDate(today, -1);
    return { dateFrom: dateText, dateTo: dateText, createdAt: bangkokDateRange(dateText), bucket: "hour" };
  }

  if (range === "7d") {
    const dateFrom = shiftBangkokDate(today, -6);
    return {
      dateFrom,
      dateTo: today,
      createdAt: {
        gte: new Date(`${dateFrom}T00:00:00.000+07:00`),
        lt: new Date(new Date(`${today}T00:00:00.000+07:00`).getTime() + DAY_MS),
      },
      bucket: "day",
    };
  }

  if (range === "month") {
    const monthStart = `${today.slice(0, 8)}01`;
    return {
      dateFrom: monthStart,
      dateTo: today,
      createdAt: {
        gte: new Date(`${monthStart}T00:00:00.000+07:00`),
        lt: new Date(new Date(`${today}T00:00:00.000+07:00`).getTime() + DAY_MS),
      },
      bucket: "day",
    };
  }

  return { dateFrom: today, dateTo: today, createdAt: bangkokDateRange(today), bucket: "hour" };
}

function hourLabel(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function dayLabel(dateText) {
  return dateText.slice(5).replace("-", "/");
}

function buildBuckets(rangeInfo) {
  if (rangeInfo.bucket === "hour") {
    return Array.from({ length: 24 }, (_, hour) => ({
      key: String(hour),
      label: hourLabel(hour),
      sales: 0,
      orders: 0,
    }));
  }

  const buckets = [];
  let current = rangeInfo.dateFrom;
  while (current <= rangeInfo.dateTo) {
    buckets.push({
      key: current,
      label: dayLabel(current),
      sales: 0,
      orders: 0,
    });
    current = shiftBangkokDate(current, 1);
  }
  return buckets;
}

function bucketKeyFor(date, bucket) {
  const bangkokDate = new Date(date.getTime() + BANGKOK_OFFSET_MS);
  if (bucket === "hour") {
    return String(bangkokDate.getUTCHours());
  }
  return bangkokDate.toISOString().slice(0, 10);
}

router.get("/sales", requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const storeId = await requireOwnerStoreId(req, res);
    const query = reportQuerySchema.parse(req.query);
    const rangeInfo = getReportRange(query.range, query.date);
    const buckets = buildBuckets(rangeInfo);
    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    const productTotals = new Map();
    const paymentTotals = new Map(paymentMethods.map((method) => [method, { method, orders: 0, sales: 0 }]));
    const orders = await prisma.saleOrder.findMany({
      where: {
        storeId,
        status: "PAID",
        createdAt: rangeInfo.createdAt,
      },
      select: {
        id: true,
        createdAt: true,
        paymentMethod: true,
        total: true,
        items: {
          select: {
            productName: true,
            quantity: true,
            lineTotal: true,
          },
        },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    for (const order of orders) {
      const bucket = bucketMap.get(bucketKeyFor(order.createdAt, rangeInfo.bucket));
      if (bucket) {
        bucket.sales += order.total;
        bucket.orders += 1;
      }

      const paymentTotal = paymentTotals.get(order.paymentMethod);
      if (paymentTotal) {
        paymentTotal.orders += 1;
        paymentTotal.sales += order.total;
      }

      for (const item of order.items) {
        const current = productTotals.get(item.productName) || { name: item.productName, quantity: 0, sales: 0 };
        current.quantity += item.quantity;
        current.sales += item.lineTotal;
        productTotals.set(item.productName, current);
      }
    }

    const totalSales = buckets.reduce((sum, bucket) => sum + bucket.sales, 0);
    const orderCount = buckets.reduce((sum, bucket) => sum + bucket.orders, 0);
    const peakBucket = buckets.reduce((peak, bucket) => (bucket.sales > peak.sales ? bucket : peak), buckets[0]);
    const topProducts = Array.from(productTotals.values())
      .sort((a, b) => b.quantity - a.quantity || b.sales - a.sales || a.name.localeCompare(b.name, "th"))
      .slice(0, 3);
    const productSummary = Array.from(productTotals.values()).sort((a, b) => b.sales - a.sales || b.quantity - a.quantity || a.name.localeCompare(b.name, "th"));
    const paymentSummary = Array.from(paymentTotals.values()).sort((a, b) => b.sales - a.sales || b.orders - a.orders || paymentMethods.indexOf(a.method) - paymentMethods.indexOf(b.method));

    res.set("Cache-Control", "no-store");
    res.json({
      range: query.range,
      bucket: rangeInfo.bucket,
      dateFrom: rangeInfo.dateFrom,
      dateTo: rangeInfo.dateTo,
      totals: {
        sales: totalSales,
        orders: orderCount,
        averageOrder: orderCount > 0 ? Math.round(totalSales / orderCount) : 0,
        peakLabel: peakBucket ? peakBucket.label : "-",
      },
      topProducts,
      productSummary,
      paymentSummary,
      series: buckets,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
