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

export function receiptPrintHtml(receipt: Receipt) {
  const paperWidthMm = 58;
  const printableWidthMm = 52;
  const paperHeightMm = Math.max(92, 78 + receipt.items.length * 10 + (receipt.note ? 10 : 0));
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
          @page {
            size: ${paperWidthMm}mm ${paperHeightMm}mm;
            margin: 0;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            width: ${paperWidthMm}mm;
            min-height: ${paperHeightMm}mm;
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #111827;
          }

          body {
            font-family: Arial, Tahoma, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          main {
            width: ${printableWidthMm}mm;
            margin: 0 auto;
            padding: 4mm 0 4mm;
          }

          h1, p { margin: 0; }
          h1 { font-size: 18px; line-height: 1.25; text-align: center; }
          .muted { color: #5f6b7a; font-size: 11px; line-height: 1.45; }
          .center { text-align: center; }
          .divider { border-top: 1px dashed #9ca3af; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          td { padding: 4px 0; vertical-align: top; }
          td:nth-child(2), td:nth-child(3), td:nth-child(4) { text-align: right; white-space: nowrap; }
          td:first-child { max-width: 34mm; padding-right: 2mm; }
          td span { display: block; color: #6b7280; font-size: 10px; line-height: 1.35; margin-top: 2px; }
          .line { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; margin: 4px 0; }
          .total { font-size: 15px; font-weight: 800; }
          .note { margin-top: 8px; text-align: center; font-size: 11px; color: #4b5563; word-break: break-word; }

          @media print {
            html,
            body {
              width: ${paperWidthMm}mm;
              min-height: ${paperHeightMm}mm;
            }

            main {
              width: ${printableWidthMm}mm;
            }
          }
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
          ${receipt.note ? `<p class="note">${escaped(receipt.note)}</p>` : ""}
          <p class="center muted">ขอบคุณที่ใช้บริการ</p>
        </main>
        <script>window.print(); window.onafterprint = () => window.close();</script>
      </body>
    </html>
  `;
}

function receiptPaperHeightMm(receipt: Receipt) {
  return Math.max(92, 76 + receipt.items.length * 12 + (receipt.note ? 10 : 0));
}

function canvasBlob(canvas: HTMLCanvasElement, type = "image/jpeg", quality = 0.92) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("สร้างไฟล์ PDF ไม่สำเร็จ"));
    }, type, quality);
  });
}

function blobToBinaryString(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index]);
      }
      resolve(binary);
    };
    reader.onerror = () => reject(new Error("อ่านข้อมูล PDF ไม่สำเร็จ"));
    reader.readAsArrayBuffer(blob);
  });
}

function pdfBlobFromJpeg(jpegBinary: string, widthMm: number, heightMm: number, imageWidthPx: number, imageHeightPx: number) {
  const mmToPt = 72 / 25.4;
  const pageWidthPt = widthMm * mmToPt;
  const pageHeightPt = heightMm * mmToPt;
  const chunks: Array<string> = [];
  const offsets: number[] = [0];
  let length = 0;

  function push(chunk: string) {
    chunks.push(chunk);
    length += chunk.length;
  }

  function object(id: number, body: string) {
    offsets[id] = length;
    push(`${id} 0 obj\n${body}\nendobj\n`);
  }

  push("%PDF-1.4\n");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  object(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt.toFixed(2)} ${pageHeightPt.toFixed(2)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
  );
  offsets[4] = length;
  push(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidthPx} /Height ${imageHeightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBinary.length} >>\nstream\n`,
  );
  push(jpegBinary);
  push("\nendstream\nendobj\n");
  const content = `q\n${pageWidthPt.toFixed(2)} 0 0 ${pageHeightPt.toFixed(2)} 0 0 cm\n/Im0 Do\nQ`;
  object(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

  const xrefOffset = length;
  push("xref\n0 6\n0000000000 65535 f \n");
  for (let id = 1; id <= 5; id += 1) {
    push(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  }
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const output = new Uint8Array(length);
  let cursor = 0;
  for (const chunk of chunks) {
    for (let index = 0; index < chunk.length; index += 1) {
      output[cursor] = chunk.charCodeAt(index) & 0xff;
      cursor += 1;
    }
  }

  return new Blob([output], { type: "application/pdf" });
}

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;
    if (context.measureText(nextLine).width <= maxWidth) {
      line = nextLine;
      continue;
    }

    if (line) {
      lines.push(line);
    }
    line = word;
  }

  if (line) {
    lines.push(line);
  }

  return lines.length ? lines : [text];
}

export async function createReceiptPdfArtifacts(receipt: Receipt) {
  const paperWidthMm = 58;
  const paperHeightMm = receiptPaperHeightMm(receipt);
  const scale = 8;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(paperWidthMm * scale);
  canvas.height = Math.round(paperHeightMm * scale);

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("เบราว์เซอร์ไม่รองรับการสร้าง PDF");
  }
  const ctx = context;

  const left = 24;
  const right = canvas.width - 24;
  const center = canvas.width / 2;
  let y = 28;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111827";
  ctx.textBaseline = "top";

  function text(value: string, x: number, nextY: number, options?: { align?: CanvasTextAlign; size?: number; bold?: boolean; color?: string }) {
    ctx.font = `${options?.bold ? "700" : "400"} ${options?.size || 24}px Arial, Tahoma, sans-serif`;
    ctx.fillStyle = options?.color || "#111827";
    ctx.textAlign = options?.align || "left";
    ctx.fillText(value, x, nextY);
  }

  function dashedLine(nextY: number) {
    ctx.save();
    ctx.strokeStyle = "#9ca3af";
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(left, nextY);
    ctx.lineTo(right, nextY);
    ctx.stroke();
    ctx.restore();
  }

  text(receipt.store?.name || "Menu Store", center, y, { align: "center", size: 34, bold: true });
  y += 44;
  text(receipt.code, center, y, { align: "center", size: 17, color: "#374151" });
  y += 27;
  text(formatDateTime(receipt.createdAt), center, y, { align: "center", size: 17, color: "#374151" });
  y += 36;
  dashedLine(y);
  y += 16;

  for (const item of receipt.items) {
    const itemLines = wrapCanvasText(ctx, item.name, 250);
    text(itemLines[0], left, y, { size: 22, bold: true });
    text(formatBaht(item.lineTotal), right, y, { align: "right", size: 22, bold: true });
    y += 25;
    for (const extraLine of itemLines.slice(1)) {
      text(extraLine, left, y, { size: 22, bold: true });
      y += 25;
    }
    text(`${item.code} · ${item.category}`, left, y, { size: 16, color: "#4b5563" });
    text(`${item.quantity} x ${formatBaht(item.unitPrice)}`, right, y, { align: "right", size: 16, color: "#4b5563" });
    y += 34;
  }

  y += 18;
  dashedLine(y);
  y += 16;

  for (const [label, value] of [
    ["Subtotal", receipt.subtotal],
    ["Discount", receipt.discount],
    ["Tax", receipt.tax],
  ] as const) {
    text(label, left, y, { size: 19 });
    text(formatBaht(value), right, y, { align: "right", size: 19, bold: true });
    y += 30;
  }

  y += 4;
  text("Total", left, y, { size: 30, bold: true });
  text(formatBaht(receipt.total), right, y, { align: "right", size: 30, bold: true });
  y += 38;
  dashedLine(y);
  y += 24;
  text(paymentMethodLabels[receipt.paymentMethod], center, y, { align: "center", size: 18, color: "#374151" });
  y += 30;
  if (receipt.note) {
    text(receipt.note, center, y, { align: "center", size: 17, color: "#374151" });
    y += 26;
  }
  text("ขอบคุณที่ใช้บริการ", center, y, { align: "center", size: 18, color: "#374151" });

  const usedHeightPx = Math.min(canvas.height, Math.max(Math.ceil(y + 30), Math.round(68 * scale)));
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = canvas.width;
  exportCanvas.height = usedHeightPx;
  const exportContext = exportCanvas.getContext("2d");
  if (!exportContext) {
    throw new Error("เบราว์เซอร์ไม่รองรับการสร้าง PDF");
  }
  exportContext.drawImage(canvas, 0, 0);

  const finalPaperHeightMm = usedHeightPx / scale;
  const jpegBlob = await canvasBlob(exportCanvas);
  const jpegBinary = await blobToBinaryString(jpegBlob);
  const pdfBlob = pdfBlobFromJpeg(jpegBinary, paperWidthMm, finalPaperHeightMm, exportCanvas.width, exportCanvas.height);

  return { pdfBlob, previewBlob: jpegBlob };
}

export async function createReceiptPdfBlob(receipt: Receipt) {
  return (await createReceiptPdfArtifacts(receipt)).pdfBlob;
}
