"use client";

import { useEffect, useMemo, useState } from "react";
import { requestJson } from "@/components/product-management-studio/lib";
import { Loader, secondaryButtonClass, StatusPill } from "@/components/ui-primitives";
import type { Receipt, ReceiptDetailResponse, ReceiptListResponse } from "./shared";
import { formatBaht, formatDateTime, paymentMethodLabels, toDateInputValue, shiftDateInputValue } from "./shared";
import { CalendarPicker } from "./calendar-picker";
import { ReceiptViewer } from "./receipt-viewer";

const pageSize = 4;

export function ReceiptDeskClient() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize, totalItems: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

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
            <CalendarPicker
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setPage(1);
                setSelectedDate(date);
              }}
            />
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

      <ReceiptViewer
        receipt={selectedReceipt}
        detailLoading={detailLoading}
        actionMessage={actionMessage}
        setActionMessage={setActionMessage}
      />
    </div>
  );
}
