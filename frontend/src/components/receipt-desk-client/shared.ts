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

export function receiptPrintHtml(receipt: Receipt) {
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