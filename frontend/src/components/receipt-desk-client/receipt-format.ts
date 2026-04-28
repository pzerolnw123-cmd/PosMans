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

export const paymentMethodLabels: Record<Receipt["paymentMethod"], string> = {
  CASH: "เงินสด",
  QR: "QR PromptPay",
  CARD: "บัตร",
  TRANSFER: "โอนเงิน",
  OTHER: "อื่น ๆ",
};

export function formatBaht(value: number) {
  return `฿${value.toLocaleString("th-TH")}`;
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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

export function shiftDateInputValue(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
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
