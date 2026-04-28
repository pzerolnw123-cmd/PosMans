import { formatBaht, formatDateTime, paymentMethodLabels, type Receipt } from "./receipt-format";

export function receiptPrintHtml(receipt: Receipt) {
  const paperWidthMm = 58;
  const printableWidthMm = 52;
  const paperHeightMm = Math.max(92, 78 + receipt.items.length * 10 + (receipt.note ? 14 : 0));
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
          .note { margin: 8px 0 6px; text-align: center; font-size: 11px; color: #4b5563; word-break: break-word; }

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
          <p class="center muted">รูปแบบการชำระ : ${escaped(paymentMethodLabels[receipt.paymentMethod])}</p>
          ${receipt.note ? `<p class="note">หมายเหตุบิล : ${escaped(receipt.note)}</p>` : ""}
          <p class="center muted">ขอบคุณที่ใช้บริการ</p>
        </main>
        <script>window.print(); window.onafterprint = () => window.close();</script>
      </body>
    </html>
  `;
}
