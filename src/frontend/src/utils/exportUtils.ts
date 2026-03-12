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
// Excel (XLSX via SheetJS)
// ──────────────────────────────────────────────
export async function exportToExcel(
  data: Record<string, unknown>[],
  filename: string,
  sheetName = "Sheet1",
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const XLSX = (await import("xlsx" as any)) as any;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } catch {
    // Fallback to HTML-table XLS trick if XLSX fails
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
// PDF Export (html2canvas + jsPDF)
// ──────────────────────────────────────────────
export async function exportToPDF(
  elementId: string,
  filename: string,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [h2cMod, jspdfMod] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      import("html2canvas" as any) as Promise<any>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      import("jspdf" as any) as Promise<any>,
    ]);
    const html2canvas = h2cMod.default ?? h2cMod;
    const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default?.jsPDF ?? jspdfMod.default;
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`[exportToPDF] Element #${elementId} not found`);
      return;
    }
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let y = 10;
    let remaining = imgHeight;
    while (remaining > 0) {
      pdf.addImage(imgData, "PNG", 10, y, imgWidth, imgHeight);
      remaining -= pageHeight - 20;
      if (remaining > 0) {
        pdf.addPage();
        y = 10 - (imgHeight - remaining);
      }
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
    <style>
      body { font-family: Georgia, serif; font-size: 11pt; color: #000; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ccc; padding: 4px 8px; font-size: 9pt; }
      th { background: #1e3a5f; color: white; }
      .business-name { font-family: 'Playfair Display', Georgia, serif; font-size: 20pt; font-weight: 700; color: #1e3a5f; }
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
  }, 500);
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
