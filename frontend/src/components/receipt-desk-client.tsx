"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { requestJson } from "@/components/product-management-studio/lib";
import { Loader, primaryButtonClass, secondaryButtonClass, StatusPill } from "@/components/ui-primitives";

type ReceiptItem = {
  id: string;
  productId: string | null;
  code: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type Receipt = {
  id: string;
  code: string;
  status: "PAID" | "CANCELLED";
  paymentMethod: "CASH" | "QR" | "CARD" | "TRANSFER" | "OTHER";
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  note: string | null;
  createdAt: string;
  itemCount: number;
  items: ReceiptItem[];
  createdBy: { id: string; displayName: string; username: string } | null;
  store: { id: string; name: string; slug: string; logoUrl?: string | null } | null;
};

type ReceiptListResponse = {
  receipts: Receipt[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

type ReceiptDetailResponse = {
  receipt: Receipt;
};

const pageSize = 4;

const paymentMethodLabels: Record<Receipt["paymentMethod"], string> = {
  CASH: "เงินสด",
  QR: "QR PromptPay",
  CARD: "บัตร",
  TRANSFER: "โอนเงิน",
  OTHER: "อื่น ๆ",
};

function formatBaht(value: number) {
  return `฿${value.toLocaleString("th-TH")}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDateInputValue(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

function parseDateInput(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function monthLabel(value: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
  }).format(value);
}

function buildCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      value: toDateInputValue(date),
      inMonth: date.getMonth() === month.getMonth(),
    };
  });
}

function receiptPrintHtml(receipt: Receipt) {
  const escaped = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  const rows = receipt.items
    .map(
      (item) => `
        <tr>
          <td>
            <strong>${escaped(item.name)}</strong>
            <span>${escaped(item.code)} · ${escaped(item.category)}</span>
          </td>
          <td>${item.quantity}</td>
          <td>${formatBaht(item.unitPrice)}</td>
          <td>${formatBaht(item.lineTotal)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <!doctype html>
    <html lang="th">
      <head>
        <meta charset="utf-8" />
        <title>${escaped(receipt.code)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; color: #111827; }
          main { width: 320px; margin: 0 auto; padding: 20px 16px; }
          h1, p { margin: 0; }
          h1 { font-size: 20px; text-align: center; }
          .muted { color: #64748b; font-size: 12px; }
          .center { text-align: center; }
          .divider { border-top: 1px dashed #94a3b8; margin: 14px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          td { padding: 6px 0; vertical-align: top; }
          td:nth-child(2), td:nth-child(3), td:nth-child(4) { text-align: right; white-space: nowrap; }
          td span { display: block; color: #64748b; font-size: 11px; margin-top: 2px; }
          .line { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; margin: 6px 0; }
          .total { font-size: 16px; font-weight: 800; }
          @media print { main { width: 72mm; } }
        </style>
      </head>
      <body>
        <main>
          <h1>${escaped(receipt.store?.name || "Menu Store")}</h1>
          <p class="center muted">${escaped(receipt.code)}</p>
          <p class="center muted">${escaped(formatDateTime(receipt.createdAt))}</p>
          <div class="divider"></div>
          <table>${rows}</table>
          <div class="divider"></div>
          <div class="line"><span>Subtotal</span><strong>${formatBaht(receipt.subtotal)}</strong></div>
          <div class="line"><span>Discount</span><strong>${formatBaht(receipt.discount)}</strong></div>
          <div class="line"><span>Tax</span><strong>${formatBaht(receipt.tax)}</strong></div>
          <div class="line total"><span>Total</span><strong>${formatBaht(receipt.total)}</strong></div>
          <div class="divider"></div>
          <p class="center muted">${escaped(paymentMethodLabels[receipt.paymentMethod])}</p>
          <p class="center muted">ขอบคุณที่ใช้บริการ</p>
        </main>
        <script>window.print(); window.onafterprint = () => window.close();</script>
      </body>
    </html>
  `;
}

export function ReceiptDeskClient() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const todayDate = new Date();
    return new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize, totalItems: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [receiptScrollMetric, setReceiptScrollMetric] = useState({ top: 0, height: 100, visible: false });
  const receiptScrollRef = useRef<HTMLDivElement | null>(null);
  const receiptDragRef = useRef({
    active: false,
    pointerId: 0,
    startY: 0,
    scrollTop: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadReceipts() {
      try {
        setLoading(true);
        setError("");
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (selectedDate) {
          params.set("date", selectedDate);
        }

        const response = await requestJson<ReceiptListResponse>(`/api/sales?${params.toString()}`);
        if (cancelled) return;

        setReceipts(response.receipts);
        setPagination(response.pagination);
        setSelectedReceipt((current) => {
          if (current && response.receipts.some((receipt) => receipt.id === current.id)) {
            return current;
          }

          return response.receipts[0] || null;
        });
        if (response.pagination.page !== page) {
          setPage(response.pagination.page);
        }
      } catch (loadError) {
        if (!cancelled) {
          setReceipts([]);
          setSelectedReceipt(null);
          setError(loadError instanceof Error ? loadError.message : "โหลดใบเสร็จไม่สำเร็จ");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReceipts();
    return () => {
      cancelled = true;
    };
  }, [page, selectedDate]);

  const selectedItemCount = useMemo(
    () => selectedReceipt?.items.reduce((total, item) => total + item.quantity, 0) || 0,
    [selectedReceipt],
  );

  useLayoutEffect(() => {
    updateReceiptScrollbar();
  }, [selectedReceipt?.id, selectedReceipt?.items.length]);

  const today = useMemo(() => toDateInputValue(new Date()), []);
  const yesterday = useMemo(() => shiftDateInputValue(-1), []);
  const datePreset =
    selectedDate === ""
      ? "all"
      : selectedDate === today
        ? "today"
        : selectedDate === yesterday
          ? "yesterday"
          : "custom";
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);

  function applyDateFilter(date: string) {
    setPage(1);
    setSelectedDate(date);
    const parsed = parseDateInput(date);
    if (parsed) {
      setCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    }
  }

  function updateReceiptScrollbar() {
    const node = receiptScrollRef.current;
    if (!node) {
      return;
    }

    const maxScroll = node.scrollHeight - node.clientHeight;
    if (maxScroll <= 0) {
      setReceiptScrollMetric({ top: 0, height: 100, visible: false });
      return;
    }

    const height = Math.max(14, (node.clientHeight / node.scrollHeight) * 100);
    const top = (node.scrollTop / maxScroll) * (100 - height);
    setReceiptScrollMetric({ top, height, visible: true });
  }

  function handleReceiptPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    const target = event.currentTarget;
    receiptDragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startY: event.clientY,
      scrollTop: target.scrollTop,
    };
    target.setPointerCapture(event.pointerId);
    target.dataset.dragging = "true";
  }

  function handleReceiptPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = receiptDragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) {
      return;
    }

    event.currentTarget.scrollTop = drag.scrollTop - (event.clientY - drag.startY);
    updateReceiptScrollbar();
  }

  function stopReceiptDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = receiptDragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) {
      return;
    }

    receiptDragRef.current.active = false;
    event.currentTarget.dataset.dragging = "false";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  async function selectReceipt(receipt: Receipt) {
    setActionMessage("");
    setSelectedReceipt(receipt);

    try {
      setDetailLoading(true);
      const response = await requestJson<ReceiptDetailResponse>(`/api/sales/${receipt.id}`);
      setSelectedReceipt(response.receipt);
    } catch (detailError) {
      setActionMessage(detailError instanceof Error ? detailError.message : "โหลดรายละเอียดใบเสร็จไม่สำเร็จ");
    } finally {
      setDetailLoading(false);
    }
  }

  function handlePrint() {
    if (!selectedReceipt) return;

    const printWindow = window.open("", "_blank", "width=420,height=720");
    if (!printWindow) {
      setActionMessage("เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาต pop-up สำหรับหน้านี้");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(receiptPrintHtml(selectedReceipt));
    printWindow.document.close();
  }

  async function handleCopy() {
    if (!selectedReceipt) return;

    const text = [
      `${selectedReceipt.store?.name || "Menu Store"} - ${selectedReceipt.code}`,
      `เวลา: ${formatDateTime(selectedReceipt.createdAt)}`,
      `วิธีชำระ: ${paymentMethodLabels[selectedReceipt.paymentMethod]}`,
      ...selectedReceipt.items.map((item) => `- ${item.name} x ${item.quantity}: ${formatBaht(item.lineTotal)}`),
      `รวมสุทธิ: ${formatBaht(selectedReceipt.total)}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setActionMessage("คัดลอกข้อมูลใบเสร็จแล้ว");
    } catch {
      setActionMessage("คัดลอกไม่สำเร็จ กรุณาลองอีกครั้ง");
    }
  }

  return (
    <div className="grid min-h-0 grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] items-start gap-[18px] max-[1366px]:grid-cols-1 max-[820px]:gap-4">
      <section className="relative z-20 grid h-fit max-h-[calc(100vh-220px)] min-h-0 content-start gap-[18px] overflow-visible rounded-none border border-[var(--border)] bg-[var(--panel-strong)] px-5 py-[18px] shadow-[var(--shadow-soft)] max-[1366px]:max-h-none max-[820px]:px-4 max-[820px]:py-4">
        <div className="flex items-start justify-between gap-4 max-[720px]:flex-col max-[720px]:items-stretch">
          <div>
            <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Recent Receipts</p>
            <strong className="my-[10px] block text-[clamp(1.8rem,3vw,2.35rem)] leading-none tracking-[-0.06em] text-[var(--foreground)]">บิลล่าสุด</strong>
            <p className="m-0 text-[0.95rem] text-[var(--foreground-soft)]">เลือกวันที่เพื่อดูและพิมพ์ใบเสร็จจากยอดขายจริง</p>
          </div>
          <div className="grid min-w-[280px] justify-items-end gap-2 max-[900px]:w-full max-[900px]:min-w-0 max-[900px]:justify-items-stretch">
            <StatusPill>{pagination.totalItems} รายการ</StatusPill>
            <div className="grid w-full gap-2">
              <span className="text-[0.78rem] font-bold text-[var(--foreground-soft)]">เลือกวันที่เอง</span>
              <div className="relative">
                <button
                  type="button"
                  className="relative flex h-[46px] w-full items-center rounded-[8px] border border-[rgba(100,120,160,0.24)] bg-[var(--field-bg)] px-4 pr-10 text-left text-[0.95rem] font-bold text-[var(--foreground)] outline-none transition hover:border-[var(--border-strong)] focus:border-[var(--brand-strong)] focus:shadow-[var(--brand-shadow)_0_0_0_4px]"
                  onClick={() => setCalendarOpen((open) => !open)}
                >
                  <span>{selectedDate ? formatDateTime(`${selectedDate}T00:00:00+07:00`).replace(" 00:00", "") : "เลือกจากปฏิทิน"}</span>
                  <span className="absolute inset-y-0 right-4 flex items-center" aria-hidden="true">
                    <span className="block h-2 w-2 rotate-45 border-b-2 border-r-2 border-[var(--accent-text)]" />
                  </span>
                </button>

                {calendarOpen ? (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-[80] w-full max-w-[340px] overflow-y-auto rounded-none border border-[rgba(100,120,160,0.24)] bg-[var(--surface)] p-3 shadow-[rgba(0,0,0,0.18)_0_18px_38px] max-h-[min(360px,calc(100vh-260px))] max-[520px]:left-0 max-[520px]:right-auto max-[520px]:max-w-none">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-none border border-[rgba(100,120,160,0.16)] bg-[var(--panel-subtle)] text-[1.45rem] leading-none text-[var(--foreground-soft)] transition hover:border-[var(--accent-border)] hover:text-[var(--foreground)]"
                        onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                      >
                        ‹
                      </button>
                      <strong className="text-[1.05rem] font-black text-[var(--foreground)]">{monthLabel(calendarMonth)}</strong>
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-none border border-[rgba(100,120,160,0.16)] bg-[var(--panel-subtle)] text-[1.45rem] leading-none text-[var(--foreground-soft)] transition hover:border-[var(--accent-border)] hover:text-[var(--foreground)]"
                        onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                      >
                        ›
                      </button>
                    </div>

                    <div className="grid grid-cols-7 border-b border-[rgba(100,120,160,0.16)] pb-2 text-center text-[0.68rem] font-black uppercase tracking-[0.08em] text-[var(--eyebrow)]">
                      {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day) => (
                        <span key={day} className="py-1">{day}</span>
                      ))}
                    </div>

                    <div className="mt-2 grid grid-cols-7 gap-x-1 gap-y-1">
                      {calendarDays.map((day) => {
                        const active = day.value === selectedDate;
                        const isToday = day.value === today;

                        return (
                          <button
                            key={day.value}
                            type="button"
                            className={
                              active
                                ? "h-8 rounded-none border border-[var(--accent-border)] bg-[var(--accent-surface)] text-[0.78rem] font-black text-[var(--foreground)] shadow-[var(--brand-shadow)_0_8px_18px]"
                                : isToday
                                  ? "h-8 rounded-none border border-[rgba(46,212,122,0.32)] bg-[rgba(46,212,122,0.1)] text-[0.78rem] font-black text-[#8cffbd]"
                                  : day.inMonth
                                    ? "h-8 rounded-none border border-transparent text-[0.78rem] font-black text-[var(--foreground)] transition hover:border-[var(--accent-border)] hover:bg-[var(--accent-surface)]"
                                    : "h-8 rounded-none border border-transparent text-[0.78rem] font-black text-[#4f5d75] transition hover:text-[var(--foreground-soft)]"
                            }
                            onClick={() => {
                              applyDateFilter(day.value);
                              setCalendarOpen(false);
                            }}
                          >
                            {day.date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 rounded-none border border-[rgba(100,120,160,0.16)] bg-[var(--panel-subtle)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--eyebrow)]">Receipt Date</span>
            <span className="rounded-none border border-[var(--accent-border)] bg-[var(--accent-surface)] px-3 py-1 text-[0.78rem] font-bold text-[var(--accent-text)]">
              {datePreset === "all" ? "ดูทั้งหมด" : datePreset === "today" ? "วันนี้" : datePreset === "yesterday" ? "เมื่อวาน" : formatDateTime(`${selectedDate}T00:00:00+07:00`).replace(" 00:00", "")}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 max-[720px]:grid-cols-1">
            {[
              { key: "today", label: "วันนี้", value: today },
              { key: "yesterday", label: "เมื่อวาน", value: yesterday },
              { key: "all", label: "ดูทั้งหมด", value: "" },
            ].map((filter) => {
              const active = datePreset === filter.key;

              return (
                <button
                  key={filter.key}
                  type="button"
                  className={
                    active
                      ? "min-h-[42px] rounded-none border border-[var(--accent-border)] bg-[var(--accent-surface)] px-3 text-[0.9rem] font-bold text-[var(--foreground)] shadow-[var(--brand-shadow)_0_10px_22px]"
                      : "min-h-[42px] rounded-none border border-[rgba(100,120,160,0.16)] bg-[var(--field-bg)] px-3 text-[0.9rem] font-bold text-[var(--foreground-soft)] transition hover:border-[var(--accent-border)] hover:text-[var(--foreground)]"
                  }
                  onClick={() => applyDateFilter(filter.value)}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

        </div>

        <div className="grid content-start gap-3">
          {loading ? (
            <div className="grid min-h-[180px] place-items-center rounded-none border border-dashed border-[var(--border)]">
              <Loader size={54} label="กำลังโหลดใบเสร็จ" />
            </div>
          ) : error ? (
            <div className="rounded-none border border-[rgba(232,93,117,0.3)] bg-[rgba(232,93,117,0.08)] px-4 py-3 text-[#ff8fa2]">{error}</div>
          ) : receipts.length > 0 ? (
            receipts.map((receipt) => {
              const active = selectedReceipt?.id === receipt.id;

              return (
                <button
                  key={receipt.id}
                  type="button"
                  className={
                    active
                      ? "grid gap-2 rounded-none border border-[var(--accent-border)] bg-[var(--accent-surface)] px-4 py-3 text-left shadow-[var(--brand-shadow)_0_10px_24px]"
                      : "grid gap-2 rounded-none border border-[rgba(100,120,160,0.16)] bg-[var(--panel-subtle)] px-4 py-3 text-left transition hover:border-[var(--accent-border)] hover:bg-[var(--surface-muted)]"
                  }
                  onClick={() => void selectReceipt(receipt)}
                >
                  <span className="flex items-center justify-between gap-3 max-[520px]:flex-col max-[520px]:items-start">
                    <strong className="text-[1.02rem] text-[var(--foreground)]">{receipt.code}</strong>
                    <strong className="text-[var(--foreground)]">{formatBaht(receipt.total)}</strong>
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.84rem] text-[var(--foreground-soft)]">
                    <span>{formatDateTime(receipt.createdAt)}</span>
                    <span>{paymentMethodLabels[receipt.paymentMethod]}</span>
                    <span>{receipt.itemCount} ชิ้น</span>
                  </span>
                </button>
              );
            })
          ) : (
            <div className="grid min-h-[140px] place-items-center rounded-none border border-dashed border-[var(--border)] px-4 py-8 text-center text-[var(--foreground-soft)]">
              ยังไม่พบใบเสร็จในวันที่เลือก
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-t-[rgba(100,120,160,0.12)] pt-3 max-[720px]:flex-col max-[720px]:items-stretch">
          <button type="button" className={secondaryButtonClass} disabled={loading || pagination.page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            ย้อนกลับ
          </button>
          <span className="text-center text-[0.9rem] text-[var(--foreground-soft)]">
            หน้า {pagination.page} / {pagination.totalPages}
          </span>
          <button type="button" className={secondaryButtonClass} disabled={loading || pagination.page >= pagination.totalPages} onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}>
            ถัดไป
          </button>
        </div>
      </section>

      <section className="grid h-fit min-h-0 content-start gap-[18px] rounded-none border border-[var(--border)] bg-[var(--panel-strong)] px-5 py-[18px] shadow-[var(--shadow-soft)] max-[820px]:px-4 max-[820px]:py-4">
        <div>
          <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Print & Share</p>
          <strong className="my-[10px] block text-[clamp(1.65rem,2.7vw,2.2rem)] leading-none tracking-[-0.06em] text-[var(--foreground)]">งานหลังปิดบิล</strong>
          <p className="m-0 text-[0.95rem] text-[var(--foreground-soft)]">พิมพ์ซ้ำและส่งรายละเอียดจากบิลที่เลือก</p>
        </div>

        {selectedReceipt ? (
          <>
            <div className="relative mx-auto grid max-h-[min(520px,calc(100vh-320x))] min-h-0 w-full max-w-[320px] grid-rows-[auto_minmax(0,1fr)_auto] gap-3 overflow-hidden rounded-none border border-[rgba(100,120,160,0.14)] bg-[var(--field-bg)] px-5 py-4 max-[520px]:max-w-none max-[520px]:px-4">
              <div className="text-center">
                <p className="m-0 text-[0.6rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Receipt Preview</p>
                <strong className="mt-3 block truncate whitespace-nowrap text-[0.85rem] leading-[1.2] text-[var(--foreground)]">{selectedReceipt.code}</strong>
                <p className="mt-2 text-[0.7rem] text-[var(--foreground-soft)]">{selectedReceipt.store?.name || "Menu Store"}</p>
                <p className="mt-1 text-[0.78rem] text-[var(--foreground-soft)]">{formatDateTime(selectedReceipt.createdAt)}</p>
              </div>

              <div className="relative max-h-[180px] min-h-0 border-y border-y-[rgba(100,120,160,0.14)] py-3">
                <div
                  ref={receiptScrollRef}
                  className={
                    receiptScrollMetric.visible
                      ? "sales-cart-scroll grid h-full min-h-0 touch-none cursor-grab select-none content-start gap-2 overflow-y-auto overflow-x-hidden py-0 pl-0 pr-4 active:cursor-grabbing"
                      : "grid h-full min-h-0 touch-none select-none content-start gap-2 overflow-hidden py-0 pl-0 pr-0"
                  }
                  onScroll={updateReceiptScrollbar}
                  onPointerDown={handleReceiptPointerDown}
                  onPointerMove={handleReceiptPointerMove}
                  onPointerUp={stopReceiptDrag}
                  onPointerCancel={stopReceiptDrag}
                  onPointerLeave={stopReceiptDrag}
                >
                  {selectedReceipt.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-[0.84rem]">
                      <span className="truncate text-[var(--foreground-soft)]">{item.name} x {item.quantity}</span>
                      <strong className="text-[var(--foreground)]">{formatBaht(item.lineTotal)}</strong>
                    </div>
                  ))}
                </div>
                {receiptScrollMetric.visible ? (
                  <span className="pointer-events-none absolute bottom-3 right-0 top-3 w-[7px] rounded-full bg-[var(--scroll-track)]">
                    <span
                      className="absolute left-0 w-full rounded-full [background:var(--scroll-thumb)] shadow-[var(--brand-shadow)_0_0_14px]"
                      style={{ top: `${receiptScrollMetric.top}%`, height: `${receiptScrollMetric.height}%` }}
                    />
                  </span>
                ) : null}
              </div>

              <div className="grid gap-2 text-[0.86rem]">
                <div className="flex justify-between gap-3 max-[420px]:flex-col max-[420px]:items-start"><span className="text-[var(--foreground-soft)]">Subtotal</span><strong className="text-[var(--foreground)]">{formatBaht(selectedReceipt.subtotal)}</strong></div>
                <div className="flex justify-between gap-3 max-[420px]:flex-col max-[420px]:items-start"><span className="text-[var(--foreground-soft)]">Discount</span><strong className="text-[var(--foreground)]">{formatBaht(selectedReceipt.discount)}</strong></div>
                <div className="flex justify-between gap-3 max-[420px]:flex-col max-[420px]:items-start"><span className="text-[var(--foreground-soft)]">Tax</span><strong className="text-[var(--foreground)]">{formatBaht(selectedReceipt.tax)}</strong></div>
                <div className="flex justify-between gap-3 border-t border-t-[rgba(100,120,160,0.14)] pt-2 text-[1rem] max-[420px]:flex-col max-[420px]:items-start"><span className="text-[var(--foreground)]">สุทธิ</span><strong className="text-[var(--foreground)]">{formatBaht(selectedReceipt.total)}</strong></div>
              </div>
              {detailLoading ? (
                <div className="absolute inset-0 z-20 grid place-items-center bg-[color:color-mix(in_srgb,var(--field-bg)_82%,transparent)] backdrop-blur-[1px]">
                  <Loader size={42} label="กำลังโหลดรายละเอียด" />
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
              <button type="button" className={primaryButtonClass} onClick={handlePrint} disabled={detailLoading}>
                พิมพ์ซ้ำ
              </button>
              <button type="button" className={secondaryButtonClass} onClick={handleCopy} disabled={detailLoading}>
                คัดลอก
              </button>
            </div>

            <div className="grid gap-2 rounded-none border border-[rgba(100,120,160,0.14)] bg-[var(--panel-subtle)] px-3.5 py-3 text-[0.86rem]">
              <div className="flex justify-between gap-3"><span className="text-[var(--foreground-soft)]">วิธีชำระ</span><strong className="text-[var(--foreground)]">{paymentMethodLabels[selectedReceipt.paymentMethod]}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-[var(--foreground-soft)]">จำนวนสินค้า</span><strong className="text-[var(--foreground)]">{selectedItemCount} ชิ้น</strong></div>
            </div>
          </>
        ) : (
          <div className="grid min-h-[320px] place-items-center rounded-none border border-dashed border-[var(--border)] text-center text-[var(--foreground-soft)]">
            เลือกใบเสร็จเพื่อดูตัวอย่าง
          </div>
        )}

        {actionMessage ? <div className="rounded-none border border-[var(--accent-border)] bg-[var(--accent-surface)] px-3 py-2 text-[0.86rem] text-[var(--accent-text)]">{actionMessage}</div> : null}
      </section>
    </div>
  );
}
