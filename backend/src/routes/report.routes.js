const express = require("express");
const { z } = require("zod");
const { prisma } = require("../lib/db");
const { getRequiredOwnerStoreId, requireStoreRole } = require("../middleware/auth");
const { asNumber, buildBuckets, fetchBucketRows, fetchProductRows, getReportRange, paymentMethods } = require("./report.route-helpers");

const router = express.Router();

const reportQuerySchema = z.object({
  range: z.enum(["today", "yesterday", "7d", "month"]).optional().default("today"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().default(""),
});

router.get("/sales", requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const storeId = await getRequiredOwnerStoreId(req, res);
    const query = reportQuerySchema.parse(req.query);
    const rangeInfo = getReportRange(query.range, query.date);
    const buckets = buildBuckets(rangeInfo);
    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    const paymentTotals = new Map(paymentMethods.map((method) => [method, { method, orders: 0, sales: 0 }]));
    const saleWhere = {
      storeId,
      status: "PAID",
      createdAt: rangeInfo.createdAt,
    };
    const [bucketRows, paymentRows, productRows] = await Promise.all([
      fetchBucketRows(storeId, rangeInfo),
      prisma.saleOrder.groupBy({
        by: ["paymentMethod"],
        where: saleWhere,
        _sum: { total: true },
        _count: { _all: true },
      }),
      fetchProductRows(storeId, rangeInfo),
    ]);

    for (const row of bucketRows) {
      const bucket = bucketMap.get(String(row.key));
      if (bucket) {
        bucket.sales = asNumber(row.sales);
        bucket.orders = asNumber(row.orders);
      }
    }

    for (const row of paymentRows) {
      const paymentTotal = paymentTotals.get(row.paymentMethod);
      if (paymentTotal) {
        paymentTotal.orders = row._count?._all || 0;
        paymentTotal.sales = row._sum?.total || 0;
      }
    }

    const productSummary = productRows
      .map((row) => ({
        productId: row.productId,
        name: row.name,
        quantity: asNumber(row.quantity),
        sales: asNumber(row.sales),
        costPerUnit: asNumber(row.costPerUnit),
      }))
      .sort((a, b) => b.sales - a.sales || b.quantity - a.quantity || a.name.localeCompare(b.name, "th"));
    const totalSales = buckets.reduce((sum, bucket) => sum + bucket.sales, 0);
    const orderCount = buckets.reduce((sum, bucket) => sum + bucket.orders, 0);
    const peakBucket = buckets.reduce((peak, bucket) => (bucket.sales > peak.sales ? bucket : peak), buckets[0]);
    const topProducts = [...productSummary]
      .sort((a, b) => b.quantity - a.quantity || b.sales - a.sales || a.name.localeCompare(b.name, "th"))
      .slice(0, 3);
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

