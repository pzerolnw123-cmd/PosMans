export function canvasBlob(canvas: HTMLCanvasElement, type = "image/jpeg", quality = 0.92) {
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

export function blobToBinaryString(blob: Blob) {
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

export function pdfBlobFromJpeg(jpegBinary: string, widthMm: number, heightMm: number, imageWidthPx: number, imageHeightPx: number) {
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

export function wrapCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
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
