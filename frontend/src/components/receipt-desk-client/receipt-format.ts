import { formatBaht as formatSharedBaht, formatThaiDateTime } from "@/lib/format";
import { paymentMethodLabels, type PaymentMethod } from "@/lib/payment-methods";

export type ReceiptItem = {
  id: string;
  productId: string | null;
  code: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type Receipt = {
  id: string;
  code: string;
  status: "PAID" | "CANCELLED";
  paymentMethod: PaymentMethod;
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

export type ReceiptListResponse = {
  receipts: Receipt[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export type ReceiptDetailResponse = {
  receipt: Receipt;
};

export const pageSize = 4;

export { paymentMethodLabels };

const bangkokDateInputFormatter = new Intl.DateTimeFormat("en", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Bangkok",
  year: "numeric",
});

export function formatBaht(value: number) {
  return formatSharedBaht(value);
}

export function formatDateTime(value: string) {
  return formatThaiDateTime(value);
}

export function receiptPdfFileName(receipt: Receipt) {
  const date = new Date(receipt.createdAt);
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  const timePart = [String(date.getHours()).padStart(2, "0"), String(date.getMinutes()).padStart(2, "0")].join("");
  const safeCode = receipt.code.replace(/[^A-Za-z0-9ก-๙_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  return `receipt-${safeCode}-${datePart}-${timePart}.pdf`;
}

export function toDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toBangkokDateInputValue(value: Date) {
  const parts = bangkokDateInputFormatter.formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return toDateInputValue(value);
  }

  return `${year}-${month}-${day}`;
}

export function shiftDateInputValue(days: number) {
  const [year, month, day] = toBangkokDateInputValue(new Date()).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return toBangkokDateInputValue(date);
}

export function parseDateInput(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function monthLabel(value: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
  }).format(value);
}

export function buildCalendarDays(month: Date) {
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
