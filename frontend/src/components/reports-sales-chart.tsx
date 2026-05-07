"use client";

import { useEffect, useMemo, useState } from "react";
import { ownerLandscapeClass, ownerLandscapeCompactPanelPaddingClass, ownerLandscapePanelPaddingClass } from "@/components/owner-workspace/landscape-preset";
import { requestJson } from "@/components/product-management-studio/lib";
import { CalendarPicker } from "@/components/receipt-desk-client/calendar-picker";
import { LoadingState } from "@/components/ui-primitives";

type ReportRange = "today" | "yesterday" | "7d" | "month";

type SalesReportPoint = {
  key: string;
  label: string;
  sales: number;
  orders: number;
};

type SalesReportResponse = {
  range: ReportRange;
  bucket: "hour" | "day";
  dateFrom: string;
  dateTo: string;
  totals: {
    sales: number;
    orders: number;
    averageOrder: number;
    peakLabel: string;
  };
  topProducts: Array<{
    name: string;
    quantity: number;
    sales: number;
  }>;
  paymentSummary: Array<{
    method: "CASH" | "QR" | "TRANSFER";
    orders: number;
    sales: number;
  }>;
  series: SalesReportPoint[];
};

const rangeOptions: Array<{ value: ReportRange; label: string }> = [
  { value: "today", label: "วันนี้" },
  { value: "yesterday", label: "เมื่อวาน" },
  { value: "7d", label: "7 วัน" },
  { value: "month", label: "เดือนนี้" },
];

const paymentMethodLabels: Record<SalesReportResponse["paymentSummary"][number]["method"], string> = {
  CASH: "เงินสด",
  QR: "QR PromptPay",
  TRANSFER: "โอนเงิน",
};

function formatBaht(value: number) {
  return `฿${value.toLocaleString("th-TH")}`;
}

function formatCompactBaht(value: number) {
  if (value >= 1_000_000) {
    return `฿${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `฿${Math.round(value / 1000)}K`;
  }
  return `฿${value}`;
}

function buildSmoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  return points.reduce((path, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }

    const previous = points[index - 1];
    const controlDistance = (point.x - previous.x) / 2;
    return `${path} C ${previous.x + controlDistance} ${previous.y}, ${point.x - controlDistance} ${point.y}, ${point.x} ${point.y}`;
  }, "");
}

export function ReportsSalesChart() {
  const [range, setRange] = useState<ReportRange>("today");
  const [selectedDate, setSelectedDate] = useState("");
  const [report, setReport] = useState<SalesReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTopProduct, setSelectedTopProduct] = useState<{
    rank: number;
    name: string;
    quantity: number;
    sales: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      try {
        setLoading(true);
        setError("");
        const params = new URLSearchParams({ range });
        if (selectedDate) {
          params.set("date", selectedDate);
        }
        const response = await requestJson<SalesReportResponse>(`/api/reports/sales?${params.toString()}`);
        if (!cancelled) {
          setReport(response);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "โหลดรายงานไม่สำเร็จ");
          setReport(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReport();
    return () => {
      cancelled = true;
    };
  }, [range, selectedDate]);

  useEffect(() => {
    if (!selectedTopProduct) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedTopProduct(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTopProduct]);

  const chart = useMemo(() => {
    const series = report?.series || [];
    const width = 760;
    const height = 360;
    const padding = { left: 72, right: 32, top: 24, bottom: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const maxSales = Math.max(1, ...series.map((point) => point.sales));
    const points = series.map((point, index) => {
      const x = padding.left + (series.length <= 1 ? chartWidth / 2 : (index / (series.length - 1)) * chartWidth);
      const y = padding.top + chartHeight - (point.sales / maxSales) * chartHeight;
      return { ...point, x, y };
    });
    const linePath = buildSmoothPath(points);
    const areaPath =
      points.length > 0
        ? `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`
        : "";
    const yTicks = [1, 0.75, 0.5, 0.25, 0].map((ratio) => ({
      y: padding.top + chartHeight * (1 - ratio),
      label: formatCompactBaht(Math.round(maxSales * ratio)),
    }));
    const xTickStep = report?.bucket === "hour" ? 4 : Math.max(1, Math.ceil(series.length / 6));

    return { width, height, padding, chartHeight, points, linePath, areaPath, yTicks, xTickStep };
  }, [report]);

  const summaryItems = report
    ? [
        ["ยอดขาย", formatBaht(report.totals.sales)],
        ["จำนวนบิล", `${report.totals.orders.toLocaleString("th-TH")} บิล`],
        ["บิลเฉลี่ย", formatBaht(report.totals.averageOrder)],
        ["ช่วงพีค", report.totals.peakLabel || "-"],
      ]
    : [
        ["ยอดขาย", "—"],
        ["จำนวนบิล", "—"],
        ["บิลเฉลี่ย", "—"],
        ["ช่วงพีค", "—"],
      ];
  const initialLoading = loading && !report;

  return (
    <div
      className={`grid min-h-0 w-full max-w-full self-stretch grid-cols-[minmax(0,0.65fr)_minmax(260px,0.35fr)] items-start gap-[18px] ${ownerLandscapeClass}:grid-cols-[minmax(0,0.7fr)_248px] ${ownerLandscapeClass}:gap-[14px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid-cols-[minmax(0,1fr)_260px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid-cols-[minmax(0,1fr)_290px] max-[820px]:grid-cols-1`}
    >
      <div
        className={`grid h-fit min-h-0 min-w-0 w-full max-w-full gap-[18px] overflow-hidden rounded-none border border-[var(--border)] bg-[var(--panel-strong)] px-5 py-[18px] shadow-[var(--shadow-soft)] ${ownerLandscapePanelPaddingClass} ${ownerLandscapeClass}:gap-[14px] [@media(min-width:744px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:gap-[10px] [@media(min-width:744px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:px-3 [@media(min-width:744px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:py-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-[10px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:px-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:py-3 max-[820px]:px-4 max-[820px]:py-4`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3 [@media(min-width:744px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:gap-2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-2">
          <div className="min-w-0">
            <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Sales Trend</p>
            <h2 className="my-[7px] text-[clamp(1.5rem,2.4vw,2.25rem)] leading-none tracking-[-0.055em] text-[var(--foreground)] [@media(min-width:744px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:my-1 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:my-1">กราฟยอดขาย</h2>
            <p className="m-0 text-[0.92rem] text-[var(--foreground-soft)]">แสดงยอดขายจริงตามช่วงเวลาที่เลือก</p>
          </div>
          <div className="grid min-w-[280px] justify-items-end gap-2 [@media(min-width:744px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:min-w-0 [@media(min-width:744px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:justify-items-start [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:min-w-0 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:justify-items-start max-[720px]:w-full max-[720px]:min-w-0 max-[720px]:justify-items-stretch">
            <CalendarPicker selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            <div className="flex flex-wrap justify-end gap-2 max-[720px]:justify-start">
              {rangeOptions.map((option) => {
                const active = !selectedDate && option.value === range;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={
                      active
                        ? "min-h-[36px] rounded-none border border-[var(--accent-border)] bg-[var(--accent-surface)] px-3 text-[0.84rem] font-bold text-[var(--foreground)]"
                        : "min-h-[36px] rounded-none border border-[var(--border)] bg-[var(--field-bg)] px-3 text-[0.84rem] font-bold text-[var(--foreground-soft)] transition hover:border-[var(--accent-border)] hover:text-[var(--foreground)]"
                    }
                    onClick={() => {
                      setSelectedDate("");
                      setRange(option.value);
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-4 gap-[10px] max-[1180px]:grid-cols-2 max-[640px]:grid-cols-1 ${ownerLandscapeClass}:grid-cols-4 [@media(min-width:744px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:gap-2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-2`}>
          {summaryItems.map(([label, value]) => (
            <div key={label} className="rounded-none border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 [@media(min-width:744px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:px-3 [@media(min-width:744px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:py-2.5 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:px-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:py-2.5">
              <span className="text-[0.8rem] text-[var(--foreground-soft)]">{label}</span>
              <strong className="mt-1 block text-[1.08rem] text-[var(--foreground)]">{value}</strong>
            </div>
          ))}
        </div>

        <div className="relative min-h-[380px] overflow-hidden rounded-none border border-[var(--border)] bg-[var(--panel-subtle)] p-4 [@media(min-width:744px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:min-h-[300px] [@media(min-width:744px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:p-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:min-h-[300px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:p-3 max-[640px]:min-h-[300px] max-[640px]:p-3">
          {initialLoading ? (
            <>
              <svg className="block h-[348px] w-full opacity-0 [@media(min-width:744px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:h-[274px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:h-[274px] max-[640px]:h-[268px]" viewBox="0 0 760 360" preserveAspectRatio="none" aria-hidden="true">
                <rect x="0" y="0" width="760" height="360" fill="transparent" />
              </svg>
              <div className="absolute inset-4 grid place-items-center rounded-none border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_88%,transparent)] px-4 text-center backdrop-blur-[1px]">
                <LoadingState
                  size={58}
                  label="กำลังโหลดกราฟรายงาน..."
                  description="ระบบกำลังดึงยอดขายตามช่วงเวลาที่เลือก"
                />
              </div>
            </>
          ) : error ? (
            <div className="grid min-h-[348px] place-items-center text-center [@media(min-width:744px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:min-h-[274px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:min-h-[274px]">
              <div className="rounded-none border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-[var(--danger-bright)]">{error}</div>
            </div>
          ) : report ? (
            <>
              <svg className="block h-[348px] w-full [@media(min-width:744px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:h-[274px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:h-[274px] max-[640px]:h-[268px]" viewBox={`0 0 ${chart.width} ${chart.height}`} preserveAspectRatio="none" role="img" aria-label="กราฟเส้นยอดขาย">
                <defs>
                  <linearGradient id="sales-line-gradient" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="var(--brand)" />
                    <stop offset="100%" stopColor="var(--brand-strong)" />
                  </linearGradient>
                  <linearGradient id="sales-area-gradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {chart.yTicks.map((tick) => (
                  <g key={`${tick.y}-${tick.label}`}>
                    <line x1={chart.padding.left} x2={chart.width - chart.padding.right} y1={tick.y} y2={tick.y} stroke="var(--border)" strokeDasharray="4 6" />
                    <text x={chart.padding.left - 18} y={tick.y + 4} textAnchor="end" className="fill-[var(--foreground-soft)] text-[10px] font-bold">
                      {tick.label}
                    </text>
                  </g>
                ))}

                {chart.areaPath ? <path d={chart.areaPath} fill="url(#sales-area-gradient)" /> : null}
                {chart.linePath ? <path d={chart.linePath} fill="none" stroke="url(#sales-line-gradient)" strokeLinecap="round" strokeWidth="4" /> : null}

                {chart.points.map((point, index) => (
                  <g key={point.key}>
                    {index % chart.xTickStep === 0 || index === chart.points.length - 1 ? (
                      <text x={point.x} y={chart.height - 16} textAnchor="middle" className="fill-[var(--foreground-soft)] text-[10px] font-bold">
                        {point.label}
                      </text>
                    ) : null}
                    <circle cx={point.x} cy={point.y} r="5" fill="var(--surface)" stroke="var(--brand)" strokeWidth="3" />
                    <title>{`${point.label}: ${formatBaht(point.sales)} / ${point.orders} บิล`}</title>
                  </g>
                ))}
              </svg>

              {report.totals.orders === 0 ? (
                <div className="absolute inset-4 grid place-items-center rounded-none border border-dashed border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_92%,transparent)] px-4 text-center text-[var(--foreground-soft)] backdrop-blur-[1px]">
                  <div>
                    <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--eyebrow)]">No Sales Data</p>
                    <strong className="mt-2 block text-[1.02rem] text-[var(--foreground-soft)]">ยังไม่มียอดขายในช่วงเวลานี้</strong>
                  </div>
                </div>
              ) : null}
              {loading ? (
                <div className="absolute inset-4 grid place-items-center rounded-none border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_88%,transparent)] px-4 text-center backdrop-blur-[1px]">
                  <LoadingState
                    size={58}
                    label="กำลังโหลดกราฟรายงาน..."
                    description="ระบบกำลังดึงยอดขายตามช่วงเวลาที่เลือก"
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <aside
        className={`grid h-fit min-w-0 w-full max-w-full gap-[14px] overflow-hidden rounded-none border border-[var(--border)] bg-[var(--panel-strong)] px-5 py-[18px] shadow-[var(--shadow-soft)] ${ownerLandscapeCompactPanelPaddingClass} max-[820px]:px-4 max-[820px]:py-4`}
      >
        <section className="relative grid gap-[14px]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Top Products</p>
              <h2 className="my-[7px] text-[clamp(1.35rem,2vw,1.9rem)] leading-none tracking-[-0.045em] text-[var(--foreground)]">สินค้าขายดี</h2>
              <p className="m-0 text-[0.88rem] text-[var(--foreground-soft)]">3 อันดับจากบิลที่ชำระแล้ว</p>
            </div>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-[0.76rem] font-bold text-[var(--foreground-soft)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:hidden">
              {report?.topProducts.length || 0} รายการ
            </span>
          </div>

          {initialLoading ? (
            <div className="relative min-h-[220px]">
              <div className="grid gap-[10px]">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`top-product-placeholder-${index}`}
                    className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-none border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 opacity-0 max-[420px]:grid-cols-[44px_minmax(0,1fr)]"
                    aria-hidden="true"
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-none border border-[var(--accent-border)] bg-[var(--accent-surface)] text-[1rem] font-black text-[var(--brand-strong)]">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <strong className="block truncate text-[1rem] leading-tight text-[var(--foreground)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.82rem] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.82rem]">placeholder</strong>
                      <span className="mt-1 block text-[0.78rem] font-bold text-[var(--foreground-soft)]">0 ชิ้น</span>
                    </div>
                    <strong className="text-right text-[0.96rem] text-[var(--foreground)] max-[420px]:col-span-2 max-[420px]:text-left">
                      ฿0
                    </strong>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 grid place-items-center rounded-none bg-[color:color-mix(in_srgb,var(--surface)_88%,transparent)] px-4 text-center backdrop-blur-[1px]">
                <LoadingState size={42} label="กำลังโหลดอันดับสินค้า..." />
              </div>
            </div>
          ) : error ? (
            <div className="rounded-none border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-[0.88rem] font-bold text-[var(--danger-bright)]">โหลดอันดับสินค้าไม่สำเร็จ</div>
          ) : report && report.topProducts.length > 0 ? (
            <div className="relative min-h-[220px]">
              <div className="grid gap-[10px]">
                {report.topProducts.map((product, index) => (
                  <button
                    key={product.name}
                    type="button"
                    className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-none border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 text-left transition hover:border-[var(--accent-border)] hover:bg-[var(--accent-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--panel-strong)] max-[420px]:grid-cols-[44px_minmax(0,1fr)]"
                    onClick={() =>
                      setSelectedTopProduct({
                        rank: index + 1,
                        name: product.name,
                        quantity: product.quantity,
                        sales: product.sales,
                      })
                    }
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-none border border-[var(--accent-border)] bg-[var(--accent-surface)] text-[1rem] font-black text-[var(--brand-strong)]">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <strong className="block truncate text-[1rem] leading-tight text-[var(--foreground)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.82rem] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.82rem]">{product.name}</strong>
                      <span className="mt-1 block text-[0.78rem] font-bold text-[var(--foreground-soft)]">{product.quantity.toLocaleString("th-TH")} ชิ้น</span>
                    </div>
                    <strong className="text-right text-[0.96rem] text-[var(--foreground)] max-[420px]:col-span-2 max-[420px]:text-left">{formatBaht(product.sales)}</strong>
                  </button>
                ))}
              </div>
              {loading ? (
                <div className="absolute inset-0 grid place-items-center rounded-none bg-[color:color-mix(in_srgb,var(--surface)_88%,transparent)] px-4 text-center backdrop-blur-[1px]">
                  <LoadingState size={42} label="กำลังโหลดอันดับสินค้า..." />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid min-h-[220px] place-items-center rounded-none border border-dashed border-[var(--border)] bg-[var(--panel-subtle)] px-4 text-center">
              <div>
                <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--eyebrow)]">No Product Data</p>
                <strong className="mt-2 block text-[1rem] text-[var(--foreground-soft)]">ยังไม่มีสินค้าขายดีในช่วงนี้</strong>
              </div>
            </div>
          )}
        </section>

        <section className="relative grid gap-[12px] border-t border-[var(--border-muted)] pt-[14px]">
          <div>
            <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Payment Mix</p>
            <h3 className="my-[6px] text-[clamp(1.2rem,1.65vw,1.55rem)] leading-none tracking-[-0.04em] text-[var(--foreground)]">วิธีชำระเงิน</h3>
            <p className="m-0 text-[0.84rem] text-[var(--foreground-soft)]">สรุปยอดตามวิธีรับเงิน</p>
          </div>

          {initialLoading ? (
            <div className="relative min-h-[146px]">
              <div className="grid gap-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`payment-summary-placeholder-${index}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-none border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 opacity-0"
                    aria-hidden="true"
                  >
                    <div className="min-w-0">
                      <strong className="block truncate text-[0.94rem] text-[var(--foreground)]">placeholder</strong>
                      <span className="mt-1 block text-[0.76rem] font-bold text-[var(--foreground-soft)]">0 บิล</span>
                    </div>
                    <strong className="text-right text-[0.94rem] text-[var(--foreground)]">฿0</strong>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 grid place-items-center rounded-none bg-[color:color-mix(in_srgb,var(--surface)_88%,transparent)] px-4 text-center backdrop-blur-[1px]">
                <LoadingState size={38} label="กำลังโหลดวิธีชำระเงิน..." />
              </div>
            </div>
          ) : error ? (
            <div className="rounded-none border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-[0.88rem] font-bold text-[var(--danger-bright)]">โหลดสรุปวิธีชำระเงินไม่สำเร็จ</div>
          ) : report ? (
            <div className="relative min-h-[146px]">
              <div className="grid gap-2">
                {report.paymentSummary.map((payment) => (
                  <div key={payment.method} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-none border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5">
                    <div className="min-w-0">
                      <strong className="block truncate text-[0.94rem] text-[var(--foreground)]">{paymentMethodLabels[payment.method]}</strong>
                      <span className="mt-1 block text-[0.76rem] font-bold text-[var(--foreground-soft)]">{payment.orders.toLocaleString("th-TH")} บิล</span>
                    </div>
                    <strong className="text-right text-[0.94rem] text-[var(--foreground)]">{formatBaht(payment.sales)}</strong>
                  </div>
                ))}
              </div>
              {loading ? (
                <div className="absolute inset-0 grid place-items-center rounded-none bg-[color:color-mix(in_srgb,var(--surface)_88%,transparent)] px-4 text-center backdrop-blur-[1px]">
                  <LoadingState size={38} label="กำลังโหลดวิธีชำระเงิน..." />
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </aside>

      {selectedTopProduct ? (
        <div className="fixed inset-0 z-[320] grid place-items-center bg-[var(--modal-backdrop)] p-4 backdrop-blur-[16px]" role="presentation">
          <button
            type="button"
            className="absolute inset-0 cursor-default [background:var(--modal-brand-glow)]"
            aria-label="ปิดรายละเอียดสินค้าขายดี"
            onClick={() => setSelectedTopProduct(null)}
          />
          <div
            className="relative z-[1] grid w-[min(100%,420px)] gap-4 rounded-none border border-[var(--border)] [background:var(--modal-surface)] p-5 text-left shadow-[var(--modal-shadow)] max-[640px]:gap-3 max-[640px]:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="top-product-popup-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--brand-strong)]">Top Product</p>
                <h3 id="top-product-popup-title" className="mt-2 mb-0 text-[1.28rem] leading-tight tracking-[-0.04em] text-[var(--foreground)]">
                  {selectedTopProduct.name}
                </h3>
              </div>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-none border border-[var(--accent-border)] bg-[var(--accent-surface)] text-[1rem] font-black text-[var(--brand-strong)]">
                {selectedTopProduct.rank}
              </span>
            </div>

            <div className="grid gap-3 rounded-none border border-[var(--border)] bg-[var(--panel-subtle)] p-3.5">
              <div className="flex items-center justify-between gap-3 text-[0.92rem]">
                <span className="text-[var(--foreground-soft)]">ชื่อสินค้า</span>
                <strong className="max-w-[220px] text-right text-[var(--foreground)]">{selectedTopProduct.name}</strong>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3 text-[0.92rem]">
                <span className="text-[var(--foreground-soft)]">จำนวนขาย</span>
                <strong className="text-[var(--foreground)]">{selectedTopProduct.quantity.toLocaleString("th-TH")} ชิ้น</strong>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3">
                <span className="font-bold text-[var(--foreground)]">ยอดขายรวม</span>
                <strong className="text-[1.2rem] leading-none text-[var(--foreground)]">{formatBaht(selectedTopProduct.sales)}</strong>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="inline-flex min-h-[42px] items-center justify-center rounded-none border border-[var(--border)] bg-[var(--surface-muted)] px-4 text-[0.92rem] font-bold text-[var(--foreground)] transition hover:border-[var(--accent-border)] hover:text-[var(--foreground)]"
                onClick={() => setSelectedTopProduct(null)}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
