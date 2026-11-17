"use client";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("تعذر تحميل الصورة"));
    img.src = src;
  });
}

/**
 * تحويل عنصر HTML إلى ملف PDF (يدعم العربية بالكامل لأنه يعتمد على محرك عرض المتصفح)
 * - صفحة واحدة تُضبط لتناسب الورقة (مناسب للشهادة)
 * - المحتوى الطويل يُقسَّم تلقائيًا على عدة صفحات (مناسب للتقارير)
 */
export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
  orientation: "portrait" | "landscape" = "portrait",
): Promise<void> {
  const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);

  const dataUrl = await toPng(element, {
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    cacheBust: true,
  });
  const img = await loadImage(dataUrl);

  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4", compress: true });
  const margin = 8;
  const pageW = pdf.internal.pageSize.getWidth() - margin * 2;
  const pageH = pdf.internal.pageSize.getHeight() - margin * 2;
  const scale = pageW / img.width; // mm per pixel
  const totalHeightMm = img.height * scale;

  if (totalHeightMm <= pageH) {
    const fit = Math.min(pageW / img.width, pageH / img.height);
    const w = img.width * fit;
    const h = img.height * fit;
    pdf.addImage(dataUrl, "PNG", margin + (pageW - w) / 2, margin + (pageH - h) / 2, w, h);
  } else {
    const pageHeightPx = Math.floor(pageH / scale);
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    let y = 0;
    let first = true;
    while (y < img.height) {
      const sliceH = Math.min(pageHeightPx, img.height - y);
      canvas.height = sliceH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas غير مدعوم");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, sliceH);
      ctx.drawImage(img, 0, y, img.width, sliceH, 0, 0, img.width, sliceH);
      if (!first) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, margin, pageW, sliceH * scale);
      first = false;
      y += sliceH;
    }
  }

  pdf.save(filename);
}
