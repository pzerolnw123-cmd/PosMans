"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { requestJson } from "@/components/product-management-studio/lib";
import { LoadingState, secondaryButtonClass, StatusPill } from "@/components/ui-primitives";
import type { Receipt, ReceiptDetailResponse, ReceiptListResponse } from "./shared";
import { formatBaht, formatDateTime, paymentMethodLabels, toDateInputValue, shiftDateInputValue } from "./shared";
import { CalendarPicker } from "./calendar-picker";
import { ReceiptViewer } from "./receipt-viewer";


export function ReceiptDeskClient() {
  const [pageSize, setPageSize] = useState(4);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 4, totalItems: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const detailRequestRef = useRef(0);
  const selectedReceiptRef = useRef<Receipt | null>(null);

  useEffect(() => {
    const ipadMediaQuery = window.matchMedia("(max-width: 1366px) and (any-pointer: coarse)");
    const syncPageSize = () => setPageSize(ipadMediaQuery.matches ? 5 : 4);
    syncPageSize();
    ipadMediaQuery.addEventListener("change", syncPageSize);
    return () => ipadMediaQuery.removeEventListener("change", syncPageSize);
  }, []);

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

        const nextReceipts = response.receipts;
        setReceipts(nextReceipts);
        setPagination(response.pagination);

        const currentReceipt = selectedReceiptRef.current;
        const currentStillVisible = currentReceipt && nextReceipts.some((receipt) => receipt.id === currentReceipt.id);
        if (currentStillVisible) {
          setSelectedReceiptId(currentReceipt.id);
        } else {
          const nextReceipt = nextReceipts[0] || null;
          setSelectedReceiptId(nextReceipt?.id || null);
          setSelectedReceipt(nextReceipt);
          selectedReceiptRef.current = nextReceipt;
          if (nextReceipt) {
            void selectReceipt(nextReceipt);
          }
        }
        if (response.pagination.page !== page) {
          setPage(response.pagination.page);
        }
      } catch (loadError) {
        if (!cancelled) {
          setReceipts([]);
          setSelectedReceipt(null);
          selectedReceiptRef.current = null;
          setSelectedReceiptId(null);
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
  }, [page, selectedDate, pageSize]);

  async function selectReceipt(receipt: Receipt) {
    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;
    setActionMessage("");
    setSelectedReceiptId(receipt.id);
    setSelectedReceipt(receipt);
    selectedReceiptRef.current = receipt;

    try {
      setDetailLoading(true);
      const response = await requestJson<ReceiptDetailResponse>(`/api/sales/${receipt.id}`);
      if (detailRequestRef.current !== requestId) {
        return;
      }
      setSelectedReceipt(response.receipt);
      selectedReceiptRef.current = response.receipt;
    } catch (detailError) {
      if (detailRequestRef.current === requestId) {
        setActionMessage(detailError instanceof Error ? detailError.message : "โหลดรายละเอียดใบเสร็จไม่สำเร็จ");
      }
    } finally {
      if (detailRequestRef.current === requestId) {
        setDetailLoading(false);
      }
    }
  }

  return (
    <div className="grid min-h-0 grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] items-stretch gap-[18px] max-[1366px]:grid-cols-1 max-[820px]:gap-4">
      <section className="relative z-20 grid h-full max-h-[calc(100dvh-220px)] min-h-0 content-start gap-[18px] overflow-visible rounded-none border border-[var(--border)] bg-[var(--panel-strong)] px-5 py-[18px] shadow-[var(--shadow-soft)] max-[1366px]:h-auto max-[1366px]:max-h-none max-[820px]:px-4 max-[820px]:py-4 [@media(max-height:860px)]:h-auto [@media(max-height:860px)]:max-h-none">
        <div className="flex items-start justify-between gap-4 max-[720px]:flex-col max-[720px]:items-stretch">
          <div>
            <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Recent Receipts</p>
            <strong className="my-[10px] block text-[clamp(1.8rem,3vw,2.35rem)] leading-none tracking-[-0.06em] text-[var(--foreground)]">บิลล่าสุด</strong>
            <p className="m-0 text-[0.95rem] text-[var(--foreground-soft)]">เลือกวันที่เพื่อดูและพิมพ์ใบเสร็จจากยอดขายจริง</p>
          </div>
          <div className="grid min-w-[280px] justify-items-end gap-2 max-[900px]:w-full max-[900px]:min-w-0 max-[900px]:justify-items-stretch">
            <StatusPill>{pagination.totalItems} รายการ</StatusPill>
            <CalendarPicker
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setPage(1);
                setSelectedDate(date);
              }}
            />
          </div>
        </div>

        <div className="grid gap-3 rounded-none border border-[var(--border-muted)] bg-[var(--panel-subtle)] p-3 max-[520px]:p-2.5">
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
                      ? "min-h-[42px] rounded-none border border-[var(--accent-border)] bg-[var(--accent-surface)] px-3 text-[0.9rem] font-bold text-[var(--foreground)] shadow-[inset_0_0_0_1px_var(--brand-soft)]"
                      : "min-h-[42px] rounded-none border border-[var(--border-muted)] bg-[var(--field-bg)] px-3 text-[0.9rem] font-bold text-[var(--foreground-soft)] transition hover:border-[var(--accent-border)] hover:text-[var(--foreground)]"
                  }
                  onClick={() => {
                    setPage(1);
                    setSelectedDate(filter.value);
                  }}
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
              <LoadingState
                size={54}
                label="กำลังโหลดใบเสร็จ..."
                description="ระบบกำลังดึงรายการบิลตามวันที่เลือก"
              />
            </div>
          ) : error ? (
            <div className="rounded-none border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-[var(--danger-bright)]">{error}</div>
          ) : receipts.length > 0 ? (
            receipts.map((receipt) => {
              const active = selectedReceiptId === receipt.id;

              return (
                <button
                  key={receipt.id}
                  type="button"
                  className={
                    active
                      ? "grid gap-2 rounded-none border border-l-[6px] border-[var(--accent-border)] border-l-[var(--brand)] bg-[var(--surface)] px-4 py-3 text-left shadow-[0_0_0_2px_var(--brand-soft),var(--brand-shadow)_0_10px_24px]"
                      : "grid gap-2 rounded-none border border-[var(--border-muted)] bg-[var(--panel-subtle)] px-4 py-3 text-left transition hover:border-[var(--accent-border)] hover:bg-[var(--surface-muted)]"
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

        <div className="flex items-center justify-between gap-4 border-t border-t-[var(--border-hairline)] pt-3 max-[720px]:flex-col max-[720px]:items-stretch">
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

      <ReceiptViewer
        receipt={selectedReceipt}
        detailLoading={detailLoading}
        actionMessage={actionMessage}
        setActionMessage={setActionMessage}
      />
    </div>
  );
}
