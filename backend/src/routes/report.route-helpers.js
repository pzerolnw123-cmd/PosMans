const { Prisma } = require("../generated/prisma");
const { prisma } = require("../lib/db");
const { bangkokDateRange } = require("./sale.route-helpers");

const DAY_MS = 24 * 60 * 60 * 1000;
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const paymentMethods = ["CASH", "QR", "CARD", "TRANSFER", "OTHER"];

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

function asNumber(value) {
  return Number(value || 0);
}

async function fetchBucketRows(storeId, rangeInfo) {
  // รวมยอดขายตามชั่วโมง/วันในฐานข้อมูลเพื่อลดการโหลด order ทั้งช่วงเข้าหน่วยความจำ
  const bucketExpression =
    rangeInfo.bucket === "hour"
      ? Prisma.sql`EXTRACT(HOUR FROM ("createdAt" AT TIME ZONE 'Asia/Bangkok'))::text`
      : Prisma.sql`to_char("createdAt" AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD')`;

  return prisma.$queryRaw`
    SELECT
      ${bucketExpression} AS key,
      COALESCE(SUM("total"), 0)::bigint AS sales,
      COUNT(*)::bigint AS orders
    FROM "SaleOrder"
    WHERE "storeId" = ${storeId}
      AND "status" = 'PAID'::"SaleStatus"
      AND "createdAt" >= ${rangeInfo.createdAt.gte}
      AND "createdAt" < ${rangeInfo.createdAt.lt}
    GROUP BY key
  `;
}

async function fetchProductRows(storeId, rangeInfo) {
  // รวมสินค้าขายดีด้วย SQL เพื่อรักษา shape เดิมโดยไม่ต้องดึง sale items ทุกแถว
  return prisma.$queryRaw`
    SELECT
      COALESCE(item."productId", item."productName") AS key,
      MAX(item."productId") AS "productId",
      (ARRAY_AGG(item."productName" ORDER BY sale."createdAt" ASC, item."id" ASC))[1] AS name,
      COALESCE(SUM(item."quantity"), 0)::bigint AS quantity,
      COALESCE(SUM(item."lineTotal"), 0)::bigint AS sales,
      COALESCE(MAX(product."costPerUnit"), 0)::bigint AS "costPerUnit"
    FROM "SaleOrderItem" item
    INNER JOIN "SaleOrder" sale ON sale."id" = item."orderId"
    LEFT JOIN "Product" product ON product."id" = item."productId" AND product."storeId" = ${storeId}
    WHERE sale."storeId" = ${storeId}
      AND sale."status" = 'PAID'::"SaleStatus"
      AND sale."createdAt" >= ${rangeInfo.createdAt.gte}
      AND sale."createdAt" < ${rangeInfo.createdAt.lt}
    GROUP BY COALESCE(item."productId", item."productName")
  `;
}

module.exports = {
  asNumber,
  buildBuckets,
  fetchBucketRows,
  fetchProductRows,
  getReportRange,
  paymentMethods,
};
