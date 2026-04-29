import { formatBaht, formatDateTime, paymentMethodLabels, type Receipt } from "./receipt-format";
import { blobToBinaryString, canvasBlob, pdfBlobFromJpeg, wrapCanvasText } from "./pdf-canvas-utils";

function receiptPaperHeightMm(receipt: Receipt) {
  return Math.max(92, 76 + receipt.items.length * 12 + (receipt.note ? 16 : 0));
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
  y += 18;

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

  y += 4;
  dashedLine(y);
  y += 18;

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
  text(`รูปแบบการชำระ : ${paymentMethodLabels[receipt.paymentMethod]}`, center, y, { align: "center", size: 18, color: "#374151" });
  y += 28;
  if (receipt.note) {
    const noteLines = wrapCanvasText(ctx, `หมายเหตุบิล : ${receipt.note}`, right - left);
    for (const noteLine of noteLines) {
      text(noteLine, center, y, { align: "center", size: 17, color: "#374151" });
      y += 23;
    }
    y += 7;
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
