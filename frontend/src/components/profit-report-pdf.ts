import { blobToBinaryString, canvasBlob, pdfBlobFromJpeg, wrapCanvasText } from "@/components/receipt-desk-client/pdf-canvas-utils";

export type ProfitReportRow = {
  name: string;
  quantity: number;
  sales: number;
  unitCost: number;
  totalCost: number;
  profit: number;
};

export type ProfitReportPdfPayload = {
  storeName?: string;
  periodLabel?: string;
  dateLabel: string;
  generatedAt: string;
  sales: number;
  totalCost: number;
  profit: number;
  margin: number;
  productCost: number;
  extraCost: number;
  averageCost: number;
  rows: ProfitReportRow[];
};

function formatBaht(value: number) {
  return `฿${Math.round(value).toLocaleString("th-TH")}`;
}

function drawText(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  options: { align?: CanvasTextAlign; size?: number; bold?: boolean; color?: string } = {},
) {
  ctx.font = `${options.bold ? "700" : "400"} ${options.size || 22}px Arial, Tahoma, sans-serif`;
  ctx.fillStyle = options.color || "#111827";
  ctx.textAlign = options.align || "left";
  ctx.fillText(value, x, y);
}

function drawBox(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
}

function drawCell(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, fill?: string) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);
  }

  drawBox(ctx, x, y, width, height);
}

function reportCanvasHeight(payload: ProfitReportPdfPayload, scale: number) {
  void payload;
  return 297 * scale;
}

export async function createProfitReportPdfBlob(payload: ProfitReportPdfPayload) {
  const paperWidthMm = 210;
  const paperHeightMm = 297;
  const scale = 8;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(paperWidthMm * scale);
  canvas.height = reportCanvasHeight(payload, scale);

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("เบราว์เซอร์ไม่รองรับการสร้าง PDF");
  }
  const ctx = context;

  const left = 88;
  const right = canvas.width - 88;
  const contentWidth = right - left;
  const bottom = canvas.height - 86;
  let y = 82;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textBaseline = "top";

  drawText(ctx, "รายงานคำนวณกำไร", left, y, { size: 52, bold: true });
  const headerPeriodLabel = payload.periodLabel?.trim() || payload.dateLabel;
  if (payload.storeName?.trim()) {
    drawText(ctx, payload.storeName.trim(), right, y + 4, { align: "right", size: 30, bold: true, color: "#111827" });
    drawText(ctx, headerPeriodLabel, right, y + 43, { align: "right", size: 20, color: "#6b7280" });
  } else {
    drawText(ctx, headerPeriodLabel, right, y + 22, { align: "right", size: 20, color: "#6b7280" });
  }
  y += 68;
  drawText(ctx, `สร้างเมื่อ: ${payload.generatedAt}`, left, y, { size: 24, color: "#4b5563" });
  y += 52;
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(right, y);
  ctx.stroke();
  y += 38;

  const summaryGap = 18;
  const summaryWidth = (contentWidth - summaryGap * 3) / 4;
  const summaryItems = [
    ["ยอดขาย", formatBaht(payload.sales)],
    ["ต้นทุนรวม", formatBaht(payload.totalCost)],
    ["กำไรสุทธิ", formatBaht(payload.profit)],
    ["Margin", `${payload.margin.toFixed(1)}%`],
  ];
  summaryItems.forEach(([label, value], index) => {
    const x = left + index * (summaryWidth + summaryGap);
    drawBox(ctx, x, y, summaryWidth, 118);
    drawText(ctx, label, x + 22, y + 22, { size: 21, color: "#4b5563" });
    drawText(ctx, value, x + 22, y + 64, { size: 31, bold: true });
  });
  y += 158;

  const columns = [
    { label: "สินค้า", width: 0.34, align: "left" as CanvasTextAlign },
    { label: "จำนวน", width: 0.1, align: "right" as CanvasTextAlign },
    { label: "ยอดขาย", width: 0.14, align: "right" as CanvasTextAlign },
    { label: "ต้นทุน/ชิ้น", width: 0.14, align: "right" as CanvasTextAlign },
    { label: "ต้นทุนรวม", width: 0.14, align: "right" as CanvasTextAlign },
    { label: "กำไร", width: 0.14, align: "right" as CanvasTextAlign },
  ];
  const columnWidths = columns.map((column) => contentWidth * column.width);
  const columnXs = columns.reduce<number[]>((starts, _column, index) => {
    if (index === 0) {
      return [left];
    }

    starts.push(starts[index - 1] + columnWidths[index - 1]);
    return starts;
  }, []);
  const headerHeight = 54;
  columns.forEach((column, index) => {
    const columnWidth = columnWidths[index];
    drawCell(ctx, columnXs[index], y, columnWidth, headerHeight, "#f3f4f6");
    const x = column.align === "right" ? columnXs[index] + columnWidth - 16 : columnXs[index] + 16;
    drawText(ctx, column.label, x, y + 16, { align: column.align, size: 19, bold: true });
  });
  y += headerHeight;

  const rows = payload.rows.length ? payload.rows : [{ name: "ยังไม่มีข้อมูลสินค้าในช่วงเวลานี้", quantity: 0, sales: 0, unitCost: 0, totalCost: 0, profit: 0 }];
  const totalsBoxHeight = 132;
  const footerHeight = 32;
  const tableBottom = bottom - totalsBoxHeight - footerHeight - 46;
  const rowHeight = Math.max(56, Math.min(82, Math.floor((tableBottom - y) / Math.max(1, rows.length))));
  const visibleRows = rows.slice(0, Math.max(1, Math.floor((tableBottom - y) / rowHeight)));
  for (const row of visibleRows) {
    const rowTop = y;
    columns.forEach((_column, index) => {
      drawCell(ctx, columnXs[index], rowTop, columnWidths[index], rowHeight);
    });
    const nameLines = wrapCanvasText(ctx, row.name, columnWidths[0] - 28).slice(0, 2);
    const nameLineHeight = nameLines.length > 1 ? 24 : 25;
    const nameBlockHeight = nameLines.length > 1 ? 45 : 25;
    const nameStartY = rowTop + Math.max(10, Math.floor((rowHeight - nameBlockHeight) / 2));
    drawText(ctx, nameLines[0], columnXs[0] + 16, nameStartY, { size: 21, bold: true });
    if (nameLines[1]) {
      drawText(ctx, nameLines[1], columnXs[0] + 16, nameStartY + nameLineHeight, { size: 18, color: "#4b5563" });
    }

    const values = [
      row.quantity.toLocaleString("th-TH"),
      formatBaht(row.sales),
      formatBaht(row.unitCost),
      formatBaht(row.totalCost),
      formatBaht(row.profit),
    ];
    values.forEach((value, index) => {
      const columnIndex = index + 1;
      drawText(ctx, value, columnXs[columnIndex] + columnWidths[columnIndex] - 16, rowTop + Math.max(10, Math.floor((rowHeight - 23) / 2)), { align: "right", size: 20, bold: index >= 3 });
    });
    y += rowHeight;
  }

  if (visibleRows.length < rows.length) {
    drawText(ctx, `แสดง ${visibleRows.length} จาก ${rows.length} รายการ`, left, y + 12, { size: 18, color: "#6b7280" });
  }

  y = tableBottom + 32;
  const totalBoxWidth = 640;
  const totalBoxX = right - totalBoxWidth;
  const totalRows = [
    ["ต้นทุนสินค้ารวม", formatBaht(payload.productCost)],
    ["ค่าใช้จ่ายเพิ่ม", formatBaht(payload.extraCost)],
    ["ต้นทุนเฉลี่ย/ชิ้น", formatBaht(payload.averageCost)],
  ];
  drawBox(ctx, totalBoxX, y, totalBoxWidth, totalsBoxHeight);
  totalRows.forEach(([label, value], index) => {
    const rowY = y + 20 + index * 37;
    drawText(ctx, label, totalBoxX + 24, rowY, { size: 22, color: "#374151" });
    drawText(ctx, value, totalBoxX + totalBoxWidth - 24, rowY, { align: "right", size: 22, bold: true });
  });
  drawText(ctx, "รายงานนี้สร้างจากยอดขายจริงและต้นทุนที่กรอกในหน้าคำนวณ", left, bottom - 8, { size: 19, color: "#6b7280" });

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = canvas.width;
  exportCanvas.height = canvas.height;
  const exportContext = exportCanvas.getContext("2d");
  if (!exportContext) {
    throw new Error("เบราว์เซอร์ไม่รองรับการสร้าง PDF");
  }
  exportContext.drawImage(canvas, 0, 0);

  const jpegBlob = await canvasBlob(exportCanvas);
  const jpegBinary = await blobToBinaryString(jpegBlob);
  return pdfBlobFromJpeg(jpegBinary, paperWidthMm, paperHeightMm, exportCanvas.width, exportCanvas.height);
}
