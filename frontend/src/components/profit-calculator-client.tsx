"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { requestJson } from "@/components/product-management-studio/lib";
import { CalendarPicker } from "@/components/receipt-desk-client/calendar-picker";
import { LoadingState, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui-primitives";

type ReportRange = "today" | "yesterday" | "7d" | "month";

type ProductSummary = {
  productId?: string | null;
  name: string;
  quantity: number;
  sales: number;
  costPerUnit?: number;
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

function productCostKey(product: ProductSummary) {
  return product.productId || product.name;
}

function buildDefaultUnitCosts(products: ProductSummary[] = []) {
  return products.reduce<Record<string, string>>((defaults, product) => {
    const unitCost = Number.isFinite(product.costPerUnit) && (product.costPerUnit || 0) > 0 ? product.costPerUnit || 0 : 0;
    defaults[productCostKey(product)] = String(unitCost);
    return defaults;
  }, {});
}

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 250);
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const [, base64 = ""] = dataUrl.split(",");
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("อ่านไฟล์ PDF ไม่สำเร็จ"));
    reader.readAsDataURL(blob);
  });
}

export function ProfitCalculatorClient() {
  const [range, setRange] = useState<ReportRange>("today");
  const [selectedDate, setSelectedDate] = useState("");
  const [report, setReport] = useState<SalesReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportMessage, setExportMessage] = useState("");
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
          setUnitCosts(buildDefaultUnitCosts(response.productSummary));
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
    const productCost = products.reduce((sum, product) => sum + parseMoney(unitCosts[productCostKey(product)] || "") * product.quantity, 0);
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
    setUnitCosts(buildDefaultUnitCosts(report?.productSummary || []));
    setExtraCosts({ labor: "", packaging: "", other: "" });
    setExportMessage("");
  }

  function reportDateLabel() {
    if (selectedDate) {
      return selectedDate;
    }

    return rangeOptions.find((option) => option.value === range)?.label || "วันนี้";
  }

  function reportPdfFileName() {
    const datePart = (selectedDate || new Date().toISOString().slice(0, 10)).replace(/[^0-9-]/g, "");
    const rangePart = selectedDate ? "custom" : range;
    return `profit-report-${rangePart}-${datePart}.pdf`;
  }

  function buildExportRows() {
    return calculation.products.map((product) => {
      const unitCost = parseMoney(unitCosts[productCostKey(product)] || "");
      const totalCost = unitCost * product.quantity;
      return {
        name: product.name,
        quantity: product.quantity,
        sales: product.sales,
        unitCost,
        totalCost,
        profit: product.sales - totalCost,
      };
    });
  }

  function buildReportHtml() {
    const rows = buildExportRows();
    const dateLabel = reportDateLabel();
    const generatedAt = new Date().toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });

    const productRows = rows
      .map(
        (row, index) => `
          <tr class="${index % 2 === 0 ? "row-even" : "row-odd"}">
            <td class="cell-product">${escapeHtml(row.name)}</td>
            <td class="number">${escapeHtml(row.quantity.toLocaleString("th-TH"))}</td>
            <td class="number">${escapeHtml(formatBaht(row.sales))}</td>
            <td class="number muted-number">${escapeHtml(formatBaht(row.unitCost))}</td>
            <td class="number muted-number">${escapeHtml(formatBaht(row.totalCost))}</td>
            <td class="number ${row.profit < 0 ? "negative" : "positive"}">${escapeHtml(formatBaht(row.profit))}</td>
          </tr>
        `,
      )
      .join("");

    return `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>รายงานคำนวณกำไร</title>
          <style>
            @page { size: A4; margin: 12mm; }
            body { font-family: Tahoma, Arial, sans-serif; color: #111827; margin: 0; background: #ffffff; }
            table { border-collapse: collapse; }
            .sheet { width: 980px; }
            .brand { background: #0f172a; color: #ffffff; }
            .brand-title { font-size: 28px; font-weight: 700; padding: 18px 18px 4px; border: 1px solid #0f172a; }
            .brand-meta { font-size: 12px; padding: 0 18px 18px; border: 1px solid #0f172a; border-top: 0; color: #dbeafe; }
            .spacer { height: 12px; font-size: 1px; }
            .summary-label { background: #e0f2fe; border: 1px solid #bae6fd; color: #075985; font-size: 12px; font-weight: 700; padding: 8px 10px; }
            .summary-value { background: #f8fafc; border: 1px solid #cbd5e1; color: #0f172a; font-size: 20px; font-weight: 700; padding: 10px; }
            .summary-value.profit { color: #047857; }
            .summary-value.loss { color: #b91c1c; }
            .section-title { background: #f1f5f9; border: 1px solid #cbd5e1; color: #0f172a; font-size: 15px; font-weight: 700; padding: 9px 10px; }
            .product-table { width: 100%; }
            .product-table th { background: #1e40af; color: #ffffff; border: 1px solid #1e3a8a; font-size: 12px; font-weight: 700; padding: 9px 8px; }
            .product-table td { border: 1px solid #cbd5e1; font-size: 12px; padding: 8px; }
            .cell-product { color: #0f172a; font-weight: 700; }
            .row-even td { background: #ffffff; }
            .row-odd td { background: #f8fafc; }
            .number { text-align: right; white-space: nowrap; }
            .muted-number { color: #475569; }
            .positive { color: #047857; font-weight: 700; }
            .negative { color: #b91c1c; font-weight: 700; }
            .totals { width: 420px; margin-left: auto; }
            .totals td { border: 1px solid #cbd5e1; font-size: 12px; padding: 8px 10px; }
            .totals .total-label { background: #f8fafc; color: #475569; font-weight: 700; }
            .totals .total-value { background: #ffffff; font-weight: 700; }
            .grand-row td { background: #ecfdf5; color: #065f46; font-size: 14px; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <table class="sheet">
            <colgroup>
              <col style="width: 260px" />
              <col style="width: 92px" />
              <col style="width: 130px" />
              <col style="width: 130px" />
              <col style="width: 130px" />
              <col style="width: 130px" />
            </colgroup>
            <tr><td class="brand brand-title" colspan="6">รายงานคำนวณกำไร</td></tr>
            <tr><td class="brand brand-meta" colspan="6">ช่วงเวลา: ${escapeHtml(dateLabel)} &nbsp;&nbsp;|&nbsp;&nbsp; สร้างเมื่อ: ${escapeHtml(generatedAt)}</td></tr>
            <tr><td class="spacer" colspan="6"></td></tr>
            <tr>
              <td class="summary-label">ยอดขาย</td>
              <td class="summary-label">ต้นทุนรวม</td>
              <td class="summary-label" colspan="2">กำไรสุทธิ</td>
              <td class="summary-label">Margin</td>
              <td class="summary-label">สินค้าที่ขาย</td>
            </tr>
            <tr>
              <td class="summary-value">${escapeHtml(formatBaht(calculation.sales))}</td>
              <td class="summary-value">${escapeHtml(formatBaht(calculation.totalCost))}</td>
              <td class="summary-value ${calculation.profit < 0 ? "loss" : "profit"}" colspan="2">${escapeHtml(formatBaht(calculation.profit))}</td>
              <td class="summary-value">${escapeHtml(`${calculation.margin.toFixed(1)}%`)}</td>
              <td class="summary-value">${escapeHtml(calculation.itemCount.toLocaleString("th-TH"))}</td>
            </tr>
            <tr><td class="spacer" colspan="6"></td></tr>
            <tr><td class="section-title" colspan="6">รายละเอียดสินค้า</td></tr>
          </table>
          <table class="product-table sheet">
            <colgroup>
              <col style="width: 260px" />
              <col style="width: 92px" />
              <col style="width: 130px" />
              <col style="width: 130px" />
              <col style="width: 130px" />
              <col style="width: 130px" />
            </colgroup>
            <thead>
              <tr>
                <th>สินค้า</th>
                <th class="number">จำนวน</th>
                <th class="number">ยอดขาย</th>
                <th class="number">ต้นทุน/ชิ้น</th>
                <th class="number">ต้นทุนรวม</th>
                <th class="number">กำไร</th>
              </tr>
            </thead>
            <tbody>
              ${productRows || '<tr><td colspan="6">ยังไม่มีข้อมูลสินค้าในช่วงเวลานี้</td></tr>'}
            </tbody>
          </table>
          <table class="sheet"><tr><td class="spacer"></td></tr></table>
          <table class="totals">
            <tbody>
              <tr><td class="total-label">ต้นทุนสินค้ารวม</td><td class="number total-value">${escapeHtml(formatBaht(calculation.productCost))}</td></tr>
              <tr><td class="total-label">ค่าใช้จ่ายเพิ่ม</td><td class="number total-value">${escapeHtml(formatBaht(calculation.extraCost))}</td></tr>
              <tr><td class="total-label">ต้นทุนเฉลี่ย/ชิ้น</td><td class="number total-value">${escapeHtml(formatBaht(calculation.averageCost))}</td></tr>
              <tr class="grand-row"><td class="total-label">กำไรสุทธิ</td><td class="number total-value">${escapeHtml(formatBaht(calculation.profit))}</td></tr>
            </tbody>
          </table>
        </body>
      </html>`;
  }

  async function handlePrintPdf() {
    setExportMessage("");
    const printWindow = window.open("", "_blank", "left=0,top=0,width=960,height=720");
    if (!printWindow) {
      setExportMessage("เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาต pop-up สำหรับหน้านี้");
      return;
    }

    printWindow.document.open();
    printWindow.document.write("<!doctype html><title>กำลังสร้าง PDF</title><body style=\"font-family:Arial,sans-serif;margin:24px\">กำลังสร้าง PDF รายงานกำไร...</body>");
    printWindow.document.close();

    try {
      const { createProfitReportPdfBlob } = await import("@/components/profit-report-pdf");
      const generatedAt = new Date().toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
      const pdfBlob = await createProfitReportPdfBlob({
        dateLabel: reportDateLabel(),
        generatedAt,
        sales: calculation.sales,
        totalCost: calculation.totalCost,
        profit: calculation.profit,
        margin: calculation.margin,
        productCost: calculation.productCost,
        extraCost: calculation.extraCost,
        averageCost: calculation.averageCost,
        rows: buildExportRows(),
      });
      const pdfBase64 = await blobToBase64(pdfBlob);
      const response = await fetch("/api/reports/profit.pdf", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: reportPdfFileName(),
          pdfBase64,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "เตรียม PDF สำหรับพิมพ์ไม่สำเร็จ");
      }

      const data = (await response.json()) as { url?: string };
      if (!data.url) {
        throw new Error("ไม่พบ URL สำหรับเปิด PDF");
      }

      printWindow.location.href = `${data.url}#zoom=page-width`;
    } catch (pdfError) {
      printWindow.close();
      setExportMessage(pdfError instanceof Error ? pdfError.message : "สร้าง PDF ไม่สำเร็จ กรุณาลองอีกครั้ง");
    }
  }

  function handleExportExcel() {
    setExportMessage("");
    const html = buildReportHtml();
    const blob = new Blob([`\uFEFF${html}`], { type: "application/vnd.ms-excel;charset=utf-8" });
    const datePart = (selectedDate || new Date().toISOString().slice(0, 10)).replace(/[^0-9-]/g, "");
    downloadBlob(blob, `profit-calculator-${datePart}.xls`);
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,0.65fr)_minmax(280px,0.35fr)] items-stretch gap-[18px] [@media(orientation:portrait)]:h-auto [@media(orientation:portrait)]:grid-cols-1 [@media(orientation:portrait)]:gap-4 max-[820px]:h-auto max-[820px]:grid-cols-1">
      <section className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-[18px] overflow-hidden rounded-none border border-[var(--border)] bg-[var(--panel-strong)] px-5 py-5 shadow-[var(--shadow-soft)] [@media(orientation:portrait)]:h-fit [@media(orientation:portrait)]:overflow-visible [@media(orientation:portrait)]:px-4 [@media(orientation:portrait)]:py-4 max-[820px]:h-fit max-[820px]:overflow-visible max-[820px]:px-4 max-[820px]:py-4">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(280px,auto)] items-start gap-3 [@media(orientation:portrait)]:grid-cols-1 max-[720px]:grid-cols-1">
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

        <div className="grid grid-cols-[repeat(4,minmax(118px,1fr))] items-start gap-[10px] [@media(orientation:portrait)]:grid-cols-2 [@media(orientation:portrait)_and_(max-width:640px)]:grid-cols-1 max-[820px]:grid-cols-2 max-[640px]:grid-cols-1">
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

        <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] rounded-none border border-[var(--border)] bg-[var(--panel-subtle)] p-4 max-[820px]:h-auto max-[640px]:p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--eyebrow)]">Product Cost Inputs</p>
              <strong className="mt-1 block text-[1.2rem] leading-tight text-[var(--foreground)]">ต้นทุนต่อสินค้าที่ขายจริง</strong>
            </div>
            <button type="button" className={secondaryButtonClass} onClick={resetCosts}>รีเซ็ตต้นทุน</button>
          </div>

          {loading && !report ? (
            <div className="grid min-h-[240px] place-items-center">
              <LoadingState
                size={54}
                label="กำลังโหลดข้อมูลยอดขาย..."
                description="ระบบกำลังดึงยอดขายจริงสำหรับคำนวณกำไร"
              />
            </div>
          ) : error ? (
            <div className="rounded-none border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-[var(--danger-bright)]">{error}</div>
          ) : calculation.products.length > 0 ? (
            <div className="relative h-full min-h-[220px] min-w-0 [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:pr-5 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:pr-5 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:pr-5">
              <div
                ref={productScrollRef}
                className={
                  productScrollMetric.visible
                    ? "sales-cart-scroll grid h-full min-h-0 touch-none cursor-grab select-none content-start gap-2 overflow-y-auto overflow-x-hidden pl-0 pr-10 active:cursor-grabbing max-[820px]:max-h-[420px] max-[820px]:min-h-[220px] max-[780px]:max-h-none max-[780px]:touch-auto max-[780px]:select-auto max-[780px]:overflow-visible max-[780px]:pr-0"
                    : "grid h-full min-h-0 touch-none select-none content-start gap-2 overflow-hidden pl-0 pr-0 max-[820px]:max-h-[420px] max-[820px]:min-h-[220px] max-[780px]:max-h-none max-[780px]:touch-auto max-[780px]:select-auto max-[780px]:overflow-visible"
                }
                onScroll={updateProductScrollbar}
                onPointerDown={handleProductPointerDown}
                onPointerMove={handleProductPointerMove}
                onPointerUp={stopProductDrag}
                onPointerCancel={stopProductDrag}
                onPointerLeave={stopProductDrag}
              >
              {calculation.products.map((product) => {
                const costKey = productCostKey(product);
                const unitCost = parseMoney(unitCosts[costKey] || "");
                const totalCost = unitCost * product.quantity;
                const profit = product.sales - totalCost;
                return (
                  <div key={product.name} className="grid w-[calc(100%-32px)] justify-self-start grid-cols-[minmax(180px,1.35fr)_minmax(118px,0.72fr)_minmax(104px,0.56fr)_minmax(104px,0.56fr)] items-center gap-x-6 gap-y-3 rounded-none border border-[var(--border)] bg-[var(--surface)] px-4 py-3 max-[1180px]:w-full max-[1180px]:grid-cols-[minmax(180px,1fr)_minmax(118px,180px)] max-[780px]:grid-cols-1 max-[780px]:px-3">
                    <div className="min-w-0">
                      <strong className="block truncate text-[var(--foreground)]">{product.name}</strong>
                      <span className="mt-1 block text-[0.78rem] font-bold text-[var(--foreground-soft)]">{product.quantity.toLocaleString("th-TH")} ชิ้น / ยอดขาย {formatBaht(product.sales)}</span>
                    </div>
                    <label className="grid gap-1">
                      <span className="text-[0.72rem] font-bold text-[var(--foreground-soft)]">ต้นทุน/ชิ้น</span>
                      <input
                        className={`${inputClass} h-[40px]`}
                        inputMode="decimal"
                        value={unitCosts[costKey] ?? "0"}
                        onChange={(event) => setUnitCosts((current) => ({ ...current, [costKey]: event.target.value }))}
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
                <span className="pointer-events-none absolute bottom-0 right-2 top-0 w-[7px] rounded-full bg-[var(--scroll-track)] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:right-0 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:right-0 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:right-0 max-[780px]:hidden">
                  <span
                    className="absolute left-0 w-full rounded-full [background:var(--scroll-thumb)] shadow-[var(--brand-shadow)_0_0_14px]"
                    style={{ top: `${productScrollMetric.top}%`, height: `${productScrollMetric.height}%` }}
                  />
                </span>
              ) : null}
              {loading ? (
                <div className="absolute inset-0 grid place-items-center bg-[color:color-mix(in_srgb,var(--panel-subtle)_82%,transparent)] backdrop-blur-[1px]">
                  <LoadingState size={42} label="กำลังอัปเดตข้อมูล..." />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="relative grid h-full min-h-[220px] place-items-center rounded-none border border-dashed border-[var(--border)] px-4 text-center text-[var(--foreground-soft)]">
              ยังไม่มียอดขายในช่วงเวลานี้
              {loading ? (
                <div className="absolute inset-0 grid place-items-center bg-[color:color-mix(in_srgb,var(--panel-subtle)_82%,transparent)] backdrop-blur-[1px]">
                  <LoadingState size={42} label="กำลังอัปเดตข้อมูล..." />
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <aside className="flex h-full min-h-0 flex-col justify-between gap-[10px] overflow-hidden rounded-none border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-4 shadow-[var(--shadow-soft)] [@media(orientation:portrait)]:h-fit [@media(orientation:portrait)]:justify-start [@media(orientation:portrait)]:overflow-visible max-[820px]:h-fit max-[820px]:justify-start max-[820px]:overflow-visible max-[820px]:px-4 max-[820px]:py-4">
        <div>
          <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Profit Snapshot</p>
          <h2 className="my-[5px] text-[clamp(1.2rem,1.65vw,1.55rem)] leading-none tracking-[-0.04em] text-[var(--foreground)]">สรุปกำไร</h2>
          <p className="m-0 text-[0.8rem] leading-[1.35] text-[var(--foreground-soft)]">คำนวณจากยอดขายจริงและต้นทุนที่กรอก</p>
        </div>

        <div className="grid grid-cols-2 gap-2 max-[420px]:grid-cols-1">
          {[
            ["ยอดขาย", formatBaht(calculation.sales)],
            ["ต้นทุนรวม", formatBaht(calculation.totalCost)],
            ["กำไรสุทธิ", formatBaht(calculation.profit)],
            ["Margin", `${calculation.margin.toFixed(1)}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-none border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5">
              <span className="text-[0.72rem] text-[var(--foreground-soft)]">{label}</span>
              <strong className="mt-0.5 block text-[0.94rem] text-[var(--foreground)]">{value}</strong>
            </div>
          ))}
        </div>

        <div className="grid gap-2 rounded-none border border-[var(--border)] bg-[var(--panel-subtle)] px-3.5 py-3">
          <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--eyebrow)]">Additional Costs</p>
          {[
            ["labor", "ค่าแรงรวม"],
            ["packaging", "ค่าแพ็กเกจรวม"],
            ["other", "ค่าใช้จ่ายอื่น ๆ"],
          ].map(([key, label]) => (
            <label key={key} className="grid gap-1">
              <span className="text-[0.76rem] font-bold text-[var(--foreground-soft)]">{label}</span>
              <input
                className={`${inputClass} h-[38px] px-3 text-[0.9rem]`}
                inputMode="decimal"
                value={extraCosts[key as keyof typeof extraCosts]}
                onChange={(event) => setExtraCosts((current) => ({ ...current, [key]: event.target.value }))}
                placeholder="0"
              />
            </label>
          ))}
        </div>

        <div className="grid gap-1.5 rounded-none border border-[var(--border)] bg-[var(--surface-muted)] px-3.5 py-2.5 text-[0.9rem]">
          <div className="flex justify-between gap-3"><span className="text-[var(--foreground-soft)]">ต้นทุนสินค้ารวม</span><strong>{formatBaht(calculation.productCost)}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-[var(--foreground-soft)]">ค่าใช้จ่ายเพิ่ม</span><strong>{formatBaht(calculation.extraCost)}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-[var(--foreground-soft)]">ต้นทุนเฉลี่ย/ชิ้น</span><strong>{formatBaht(calculation.averageCost)}</strong></div>
        </div>

        <div className="grid content-start gap-2">
          <div className="grid grid-cols-2 gap-3 max-[420px]:grid-cols-1">
            <button type="button" className={`${primaryButtonClass} min-h-[38px] rounded-none px-3 text-[0.86rem]`} onClick={() => void handlePrintPdf()} disabled={loading}>
              ปริ้น PDF
            </button>
            <button type="button" className={`${secondaryButtonClass} min-h-[38px] rounded-none px-3 text-[0.86rem]`} onClick={handleExportExcel} disabled={loading}>
              Excel
            </button>
          </div>
          {exportMessage ? <p className="m-0 rounded-none border border-[var(--accent-border)] bg-[var(--accent-surface)] px-3 py-2 text-[0.84rem] text-[var(--accent-text)]">{exportMessage}</p> : null}
        </div>
      </aside>
    </div>
  );
}


