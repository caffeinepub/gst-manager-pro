// CDN loaders for optional heavy libraries

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(s);
  });
}
async function getXLSX(): Promise<any> {
  const w = window as any;
  if (!w.XLSX) {
    await loadScript(
      "https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js",
    );
  }
  if (!w.XLSX) throw new Error("SheetJS XLSX failed to load from CDN");
  return w.XLSX;
}
async function getHtml2Canvas(): Promise<any> {
  const w = window as any;
  if (!w.html2canvas) {
    await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
    );
  }
  if (!w.html2canvas) throw new Error("html2canvas failed to load from CDN");
  return w.html2canvas;
}
async function getCDNJsPDF(): Promise<any> {
  const w = window as any;
  if (!w.jspdf?.jsPDF) {
    await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
    );
  }
  if (!w.jspdf?.jsPDF) throw new Error("jsPDF failed to load from CDN");
  return w.jspdf.jsPDF;
}

// ──────────────────────────────────────────────
// CSV Export
// ──────────────────────────────────────────────
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
): void {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h];
        const str = val === null || val === undefined ? "" : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      })
      .join(","),
  );
  const csv = [headers.join(","), ...rows].join("\n");
  downloadBlob(csv, `${filename}.csv`, "text/csv");
}

// ──────────────────────────────────────────────
// JSON Export
// ──────────────────────────────────────────────
export function exportToJSON(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  downloadBlob(json, `${filename}.json`, "application/json");
}

// ──────────────────────────────────────────────
// Excel (XLSX via SheetJS CDN)
// ──────────────────────────────────────────────
export async function exportToExcel(
  data: Record<string, unknown>[],
  filename: string,
  sheetName = "Sheet1",
): Promise<void> {
  try {
    const XLSX = await getXLSX();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } catch {
    exportToXLS(data, filename);
  }
}

function exportToXLS(data: Record<string, unknown>[], filename: string): void {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(
    (row) =>
      `<tr>${headers.map((h) => `<td>${row[h] ?? ""}</td>`).join("")}</tr>`,
  );
  const html = `<table><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>${rows.join("")}</table>`;
  downloadBlob(html, `${filename}.xls`, "application/vnd.ms-excel");
}

// ──────────────────────────────────────────────
// PDF Export (html2canvas + jsPDF via CDN)
// ──────────────────────────────────────────────
export async function exportToPDF(
  elementId: string,
  filename: string,
): Promise<void> {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`[exportToPDF] Element #${elementId} not found`);
      return;
    }
    const [html2canvas, JsPDF] = await Promise.all([
      getHtml2Canvas(),
      getCDNJsPDF(),
    ]);
    const canvas = await (html2canvas as any)(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new JsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageH = pageHeight - 20;
    let yOffset = 0;
    while (yOffset < imgHeight) {
      if (yOffset > 0) pdf.addPage();
      // Clip each page to a page-height slice of the image
      pdf.addImage(imgData, "PNG", 10, 10 - yOffset, imgWidth, imgHeight);
      yOffset += pageH;
    }
    pdf.save(`${filename}.pdf`);
  } catch (err) {
    console.error("PDF export failed:", err);
    window.print();
  }
}

// ──────────────────────────────────────────────
// Print
// ──────────────────────────────────────────────
export function printElement(elementId: string): void {
  const el = document.getElementById(elementId);
  if (!el) {
    window.print();
    return;
  }
  const printContents = el.innerHTML;
  const win = window.open("", "_blank");
  if (!win) {
    window.print();
    return;
  }
  win.document.write(`
    <html><head><title>Print</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.cdnfonts.com/css/huxley-titling" rel="stylesheet">
    <style>
      body { font-family: Georgia, serif; font-size: 11pt; color: #000; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ccc; padding: 4px 8px; font-size: 9pt; }
      th { background: #1e3a5f; color: white; }
      .business-name { font-family: 'Huxley Titling', 'Cinzel', Georgia, serif; font-size: 20pt; font-weight: 700; color: #1e3a5f; }
      .section-title { font-size: 14pt; font-weight: bold; color: #1e3a5f; border-bottom: 2px solid #1e3a5f; margin: 12px 0 6px; padding-bottom: 4px; }
      @page { margin: 0.5in; size: A4; }
    </style></head><body>
    ${printContents}
    </body></html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 600);
}

// ──────────────────────────────────────────────
// Helper
// ──────────────────────────────────────────────
function downloadBlob(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
