"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { requestJson } from "@/components/product-management-studio/lib";
import { CalendarPicker } from "@/components/receipt-desk-client/calendar-picker";
import { Loader, inputClass, secondaryButtonClass } from "@/components/ui-primitives";

type ReportRange = "today" | "yesterday" | "7d" | "month";

type ProductSummary = {
  name: string;
  quantity: number;
  sales: number;
};

type SalesReportResponse = {
  totals: {
    sales: number;
    orders: number;
    averageOrder: number;
    peakLabel: string;
  };
  productSummary: ProductSummary[];
};

const rangeOptions: Array<{ value: ReportRange; label: string }> = [
  { value: "today", label: "วันนี้" },
  { value: "yesterday", label: "เมื่อวาน" },
  { value: "7d", label: "7 วัน" },
  { value: "month", label: "เดือนนี้" },
];

function formatBaht(value: number) {
  return `฿${Math.round(value).toLocaleString("th-TH")}`;
}

function parseMoney(value: string) {
  const numberValue = Number(value.replace(/,/g, ""));
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0;
}

export function ProfitCalculatorClient() {
  const [range, setRange] = useState<ReportRange>("today");
  const [selectedDate, setSelectedDate] = useState("");
  const [report, setReport] = useState<SalesReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unitCosts, setUnitCosts] = useState<Record<string, string>>({});
  const [extraCosts, setExtraCosts] = useState({ labor: "", packaging: "", other: "" });
  const [productScrollMetric, setProductScrollMetric] = useState({ top: 0, height: 100, visible: false });
  const productScrollRef = useRef<HTMLDivElement | null>(null);
  const productDragRef = useRef({
    active: false,
    pointerId: 0,
    startY: 0,
    scrollTop: 0,
  });

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
          setError(loadError instanceof Error ? loadError.message : "โหลดข้อมูลยอดขายไม่สำเร็จ");
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

  const calculation = useMemo(() => {
    const products = report?.productSummary || [];
    const productCost = products.reduce((sum, product) => sum + parseMoney(unitCosts[product.name] || "") * product.quantity, 0);
    const extraCost = parseMoney(extraCosts.labor) + parseMoney(extraCosts.packaging) + parseMoney(extraCosts.other);
    const totalCost = productCost + extraCost;
    const sales = report?.totals.sales || 0;
    const profit = sales - totalCost;
    const margin = sales > 0 ? (profit / sales) * 100 : 0;
    const itemCount = products.reduce((sum, product) => sum + product.quantity, 0);
    const averageCost = itemCount > 0 ? totalCost / itemCount : 0;

    return { products, productCost, extraCost, totalCost, sales, profit, margin, itemCount, averageCost };
  }, [extraCosts, report, unitCosts]);

  useLayoutEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      updateProductScrollbar();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [calculation.products.length, loading]);

  function updateProductScrollbar() {
    const node = productScrollRef.current;
    if (!node) {
      return;
    }

    const maxScroll = node.scrollHeight - node.clientHeight;
    if (maxScroll <= 0) {
      setProductScrollMetric({ top: 0, height: 100, visible: false });
      return;
    }

    const height = Math.max(14, (node.clientHeight / node.scrollHeight) * 100);
    const top = (node.scrollTop / maxScroll) * (100 - height);
    setProductScrollMetric({ top, height, visible: true });
  }

  function handleProductPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (
      event.button !== 0 ||
      (event.target instanceof HTMLElement && event.target.closest("button,input,textarea,select"))
    ) {
      return;
    }

    const target = event.currentTarget;
    productDragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startY: event.clientY,
      scrollTop: target.scrollTop,
    };
    target.setPointerCapture(event.pointerId);
    target.dataset.dragging = "true";
  }

  function handleProductPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = productDragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.currentTarget.scrollTop = drag.scrollTop - (event.clientY - drag.startY);
    updateProductScrollbar();
  }

  function stopProductDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = productDragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) {
      return;
    }

    productDragRef.current.active = false;
    event.currentTarget.dataset.dragging = "false";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function resetCosts() {
    setUnitCosts({});
    setExtraCosts({ labor: "", packaging: "", other: "" });
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,0.65fr)_minmax(280px,0.35fr)] items-stretch gap-[18px] max-[1280px]:h-auto max-[1280px]:grid-cols-1">
      <section className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-[18px] overflow-hidden rounded-none border border-[var(--border)] bg-[var(--panel-strong)] px-5 py-5 shadow-[var(--shadow-soft)] max-[1280px]:h-fit max-[820px]:px-4 max-[820px]:py-4">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(280px,auto)] items-start gap-3 max-[720px]:grid-cols-1">
          <div>
            <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Real Sales Costing</p>
            <h2 className="my-[7px] text-[clamp(1.5rem,2.4vw,2.25rem)] leading-none tracking-[-0.055em] text-[var(--foreground)]">คำนวณกำไร</h2>
            <p className="m-0 text-[0.92rem] text-[var(--foreground-soft)]">เลือกช่วงเวลา แล้วกรอกต้นทุนเองเพื่อประเมินกำไร</p>
          </div>
          <div className="grid min-w-[280px] justify-items-end gap-2 max-[720px]:w-full max-[720px]:min-w-0 max-[720px]:justify-items-stretch">
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

        <div className="grid grid-cols-[repeat(4,minmax(118px,1fr))] items-start gap-[10px] max-[1180px]:grid-cols-2 max-[640px]:grid-cols-1">
          {[
            ["ยอดขายจริง", formatBaht(calculation.sales)],
            ["จำนวนบิล", `${(report?.totals.orders || 0).toLocaleString("th-TH")} บิล`],
            ["จำนวนสินค้า", `${calculation.itemCount.toLocaleString("th-TH")} ชิ้น`],
            ["ต้นทุนที่กรอก", formatBaht(calculation.totalCost)],
          ].map(([label, value]) => (
            <div key={label} className="grid h-[72px] content-center rounded-none border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5">
              <span className="truncate text-[0.78rem] text-[var(--foreground-soft)]">{label}</span>
              <strong className="mt-1 block min-w-[74px] whitespace-nowrap text-[1rem] tabular-nums text-[var(--foreground)]">{value}</strong>
            </div>
          ))}
        </div>

        <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] rounded-none border border-[var(--border)] bg-[var(--panel-subtle)] p-4 max-[1280px]:h-auto">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--eyebrow)]">Product Cost Inputs</p>
              <strong className="mt-1 block text-[1.2rem] leading-tight text-[var(--foreground)]">ต้นทุนต่อสินค้าที่ขายจริง</strong>
            </div>
            <button type="button" className={secondaryButtonClass} onClick={resetCosts}>รีเซ็ตต้นทุน</button>
          </div>

          {loading && !report ? (
            <div className="grid min-h-[240px] place-items-center">
              <Loader size={54} label="กำลังโหลดข้อมูลยอดขาย" />
            </div>
          ) : error ? (
            <div className="rounded-none border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-[var(--danger-bright)]">{error}</div>
          ) : calculation.products.length > 0 ? (
            <div className="relative h-full min-h-[220px] min-w-0">
              <div
                ref={productScrollRef}
                className={
                  productScrollMetric.visible
                    ? "sales-cart-scroll grid h-full min-h-0 touch-none cursor-grab select-none content-start gap-2 overflow-y-auto overflow-x-hidden pl-0 pr-10 active:cursor-grabbing max-[1280px]:max-h-[420px] max-[1280px]:min-h-[220px] max-[780px]:max-h-none max-[780px]:touch-auto max-[780px]:select-auto max-[780px]:overflow-visible max-[780px]:pr-0"
                    : "grid h-full min-h-0 touch-none select-none content-start gap-2 overflow-hidden pl-0 pr-0 max-[1280px]:max-h-[420px] max-[1280px]:min-h-[220px] max-[780px]:max-h-none max-[780px]:touch-auto max-[780px]:select-auto max-[780px]:overflow-visible"
                }
                onScroll={updateProductScrollbar}
                onPointerDown={handleProductPointerDown}
                onPointerMove={handleProductPointerMove}
                onPointerUp={stopProductDrag}
                onPointerCancel={stopProductDrag}
                onPointerLeave={stopProductDrag}
              >
              {calculation.products.map((product) => {
                const unitCost = parseMoney(unitCosts[product.name] || "");
                const totalCost = unitCost * product.quantity;
                const profit = product.sales - totalCost;
                return (
                  <div key={product.name} className="grid w-[calc(100%-32px)] justify-self-start grid-cols-[minmax(180px,1.35fr)_minmax(118px,0.72fr)_minmax(104px,0.56fr)_minmax(104px,0.56fr)] items-center gap-x-6 gap-y-3 rounded-none border border-[var(--border)] bg-[var(--surface)] px-4 py-3 max-[1024px]:gap-x-4 max-[780px]:w-full max-[780px]:grid-cols-1 max-[780px]:px-3">
                    <div className="min-w-0">
                      <strong className="block truncate text-[var(--foreground)]">{product.name}</strong>
                      <span className="mt-1 block text-[0.78rem] font-bold text-[var(--foreground-soft)]">{product.quantity.toLocaleString("th-TH")} ชิ้น / ยอดขาย {formatBaht(product.sales)}</span>
                    </div>
                    <label className="grid gap-1">
                      <span className="text-[0.72rem] font-bold text-[var(--foreground-soft)]">ต้นทุน/ชิ้น</span>
                      <input
                        className={`${inputClass} h-[40px]`}
                        inputMode="decimal"
                        value={unitCosts[product.name] || ""}
                        onChange={(event) => setUnitCosts((current) => ({ ...current, [product.name]: event.target.value }))}
                        placeholder="0"
                      />
                    </label>
                    <div>
                      <span className="text-[0.72rem] font-bold text-[var(--foreground-soft)]">ต้นทุนรวม</span>
                      <strong className="mt-1 block text-[var(--foreground)]">{formatBaht(totalCost)}</strong>
                    </div>
                    <div>
                      <span className="text-[0.72rem] font-bold text-[var(--foreground-soft)]">กำไร</span>
                      <strong className={profit < 0 ? "mt-1 block text-[var(--danger)]" : "mt-1 block text-[var(--foreground)]"}>{formatBaht(profit)}</strong>
                    </div>
                  </div>
                );
              })}
              </div>
              {productScrollMetric.visible ? (
                <span className="pointer-events-none absolute bottom-0 right-2 top-0 w-[7px] rounded-full bg-[var(--scroll-track)] max-[780px]:hidden">
                  <span
                    className="absolute left-0 w-full rounded-full [background:var(--scroll-thumb)] shadow-[var(--brand-shadow)_0_0_14px]"
                    style={{ top: `${productScrollMetric.top}%`, height: `${productScrollMetric.height}%` }}
                  />
                </span>
              ) : null}
              {loading ? (
                <div className="absolute inset-0 grid place-items-center bg-[color:color-mix(in_srgb,var(--panel-subtle)_82%,transparent)] backdrop-blur-[1px]">
                  <Loader size={42} label="กำลังอัปเดตข้อมูล" />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="relative grid h-full min-h-[220px] place-items-center rounded-none border border-dashed border-[var(--border)] px-4 text-center text-[var(--foreground-soft)]">
              ยังไม่มียอดขายในช่วงเวลานี้
              {loading ? (
                <div className="absolute inset-0 grid place-items-center bg-[color:color-mix(in_srgb,var(--panel-subtle)_82%,transparent)] backdrop-blur-[1px]">
                  <Loader size={42} label="กำลังอัปเดตข้อมูล" />
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <aside className="grid h-full min-h-0 gap-[14px] overflow-y-auto rounded-none border border-[var(--border)] bg-[var(--panel-strong)] px-5 py-5 shadow-[var(--shadow-soft)] max-[1280px]:h-fit max-[1280px]:overflow-visible max-[820px]:px-4 max-[820px]:py-4">
        <div>
          <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Profit Snapshot</p>
          <h2 className="my-[7px] text-[clamp(1.35rem,2vw,1.9rem)] leading-none tracking-[-0.045em] text-[var(--foreground)]">สรุปกำไร</h2>
          <p className="m-0 text-[0.88rem] text-[var(--foreground-soft)]">คำนวณจากยอดขายจริงและต้นทุนที่กรอก</p>
        </div>

        <div className="grid grid-cols-2 gap-[10px]">
          {[
            ["ยอดขาย", formatBaht(calculation.sales)],
            ["ต้นทุนรวม", formatBaht(calculation.totalCost)],
            ["กำไรสุทธิ", formatBaht(calculation.profit)],
            ["Margin", `${calculation.margin.toFixed(1)}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-none border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3">
              <span className="text-[0.76rem] text-[var(--foreground-soft)]">{label}</span>
              <strong className="mt-1 block text-[1rem] text-[var(--foreground)]">{value}</strong>
            </div>
          ))}
        </div>

        <div className="grid gap-3 rounded-none border border-[var(--border)] bg-[var(--panel-subtle)] p-4">
          <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--eyebrow)]">Additional Costs</p>
          {[
            ["labor", "ค่าแรงรวม"],
            ["packaging", "ค่าแพ็กเกจรวม"],
            ["other", "ค่าใช้จ่ายอื่น ๆ"],
          ].map(([key, label]) => (
            <label key={key} className="grid gap-1">
              <span className="text-[0.82rem] font-bold text-[var(--foreground-soft)]">{label}</span>
              <input
                className={inputClass}
                inputMode="decimal"
                value={extraCosts[key as keyof typeof extraCosts]}
                onChange={(event) => setExtraCosts((current) => ({ ...current, [key]: event.target.value }))}
                placeholder="0"
              />
            </label>
          ))}
        </div>

        <div className="grid gap-2 rounded-none border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
          <div className="flex justify-between gap-3"><span className="text-[var(--foreground-soft)]">ต้นทุนสินค้ารวม</span><strong>{formatBaht(calculation.productCost)}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-[var(--foreground-soft)]">ค่าใช้จ่ายเพิ่ม</span><strong>{formatBaht(calculation.extraCost)}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-[var(--foreground-soft)]">ต้นทุนเฉลี่ย/ชิ้น</span><strong>{formatBaht(calculation.averageCost)}</strong></div>
        </div>
      </aside>
    </div>
  );
}
