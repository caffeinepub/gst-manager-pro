import type { Invoice } from "@/types/gst";
import { amountInWords, formatINR } from "@/utils/formatting";

const HUXLEY_FONT = "helvetica";
const NAVY = [30, 58, 95] as [number, number, number];
const WHITE = [255, 255, 255] as [number, number, number];
const GRAY = [100, 100, 100] as [number, number, number];
const LIGHT = [245, 247, 250] as [number, number, number];

const TYPE_LABELS: Record<string, string> = {
  sales: "TAX INVOICE",
  service: "SERVICE INVOICE",
  einvoice: "e-INVOICE",
  quotation: "QUOTATION",
  proforma: "PROFORMA INVOICE",
  eway_bill: "e-WAY BILL",
  credit_note: "CREDIT NOTE",
  debit_note: "DEBIT NOTE",
  bill_of_supply: "BILL OF SUPPLY",
  delivery_challan: "DELIVERY CHALLAN",
};

export interface PDFExportOptions {
  invoice: Invoice;
  businessName: string;
  businessGstin?: string;
  businessAddress?: string;
  businessContact?: string;
  logo?: string;
  partyName?: string;
  partyGstin?: string;
  partyAddress?: string;
  declaration?: string;
  termsConditions?: string;
}

// biome-ignore lint/suspicious/noExplicitAny: jsPDF CDN types
type JsPDFDoc = any;
// biome-ignore lint/suspicious/noExplicitAny: jsPDF CDN types
type AutoTableFn = (doc: JsPDFDoc, opts: any) => void;

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

async function getJsPDF(): Promise<{
  JsPDF: new (opts: object) => JsPDFDoc;
  autoTable: AutoTableFn;
}> {
  // biome-ignore lint/suspicious/noExplicitAny: CDN global check
  const w = window as any;
  if (!w.jspdf) {
    await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
    );
  }
  if (!w.jspdf?.jsPDF) throw new Error("jsPDF failed to load from CDN");

  if (!w.jspdf.API?.autoTable) {
    await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js",
    );
  }

  // biome-ignore lint/suspicious/noExplicitAny: CDN global
  const autoTableFn: AutoTableFn = (doc: JsPDFDoc, opts: any) => {
    doc.autoTable(opts);
  };

  return { JsPDF: w.jspdf.jsPDF, autoTable: autoTableFn };
}

export async function downloadInvoicePDF(opts: PDFExportOptions) {
  const { JsPDF, autoTable } = await getJsPDF();
  const doc: JsPDFDoc = new JsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 14;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 32, "F");

  if (opts.logo?.startsWith("data:")) {
    try {
      const format = opts.logo.includes("png") ? "PNG" : "JPEG";
      doc.addImage(opts.logo, format, margin, 4, 22, 22);
    } catch {
      // skip logo if it fails
    }
  }

  const nameX = opts.logo ? margin + 26 : margin;
  doc.setTextColor(...WHITE);
  doc.setFont(HUXLEY_FONT, "bold");
  doc.setFontSize(16);
  doc.text(opts.businessName || "Your Business", nameX, 14);

  if (opts.businessGstin) {
    doc.setFontSize(8);
    doc.setFont(HUXLEY_FONT, "normal");
    doc.text(`GSTIN: ${opts.businessGstin}`, nameX, 20);
  }
  if (opts.businessAddress) {
    doc.setFontSize(7.5);
    doc.text(opts.businessAddress, nameX, 26, { maxWidth: 100 });
  }

  const label =
    TYPE_LABELS[opts.invoice.type] ?? opts.invoice.type.toUpperCase();
  doc.setFont(HUXLEY_FONT, "bold");
  doc.setFontSize(11);
  const labelW = doc.getTextWidth(label);
  doc.text(label, pageW - margin - labelW, 14);

  doc.setFont(HUXLEY_FONT, "normal");
  doc.setFontSize(8);
  doc.text(`Invoice #: ${opts.invoice.invoiceNumber}`, pageW - margin, 20, {
    align: "right",
  });
  doc.text(`Date: ${opts.invoice.date}`, pageW - margin, 26, {
    align: "right",
  });
  if (opts.invoice.dueDate) {
    doc.text(`Due: ${opts.invoice.dueDate}`, pageW - margin, 30, {
      align: "right",
    });
  }

  y = 38;

  if (opts.partyName) {
    doc.setFillColor(...LIGHT);
    doc.roundedRect(margin, y, pageW - 2 * margin, 22, 2, 2, "F");
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(7);
    doc.setFont(HUXLEY_FONT, "bold");
    doc.text("BILL TO", margin + 3, y + 5);
    doc.setFont(HUXLEY_FONT, "bold");
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.text(opts.partyName, margin + 3, y + 12);
    if (opts.partyGstin) {
      doc.setFontSize(8);
      doc.setFont(HUXLEY_FONT, "normal");
      doc.setTextColor(...GRAY);
      doc.text(`GSTIN: ${opts.partyGstin}`, margin + 3, y + 17);
    }
    if (opts.partyAddress) {
      doc.setFontSize(7.5);
      doc.text(opts.partyAddress, pageW / 2, y + 12, {
        maxWidth: pageW / 2 - margin,
      });
    }
    y += 26;
  }

  const rows = opts.invoice.lineItems
    .filter((l) => l.description)
    .map((l) => [
      l.description,
      l.hsnSacCode || "",
      String(l.qty),
      l.unit || "",
      formatINR(l.unitPrice),
      `${l.discountPercent}%`,
      `${l.gstRate}%`,
      formatINR(l.lineTotal),
    ]);

  autoTable(doc, {
    startY: y,
    head: [
      [
        "Description",
        "HSN/SAC",
        "Qty",
        "Unit",
        "Price",
        "Disc%",
        "GST%",
        "Amount",
      ],
    ],
    body: rows,
    theme: "grid",
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 45 },
      7: { halign: "right" },
      4: { halign: "right" },
      2: { halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  y = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 6 : y + 40;

  const inv = opts.invoice;
  const totalsData: [string, string][] = [];
  if (inv.subtotal) totalsData.push(["Subtotal", formatINR(inv.subtotal)]);
  if (inv.totalDiscount)
    totalsData.push(["Discount", `-${formatINR(inv.totalDiscount)}`]);
  if (inv.totalCgst) totalsData.push(["CGST", formatINR(inv.totalCgst)]);
  if (inv.totalSgst) totalsData.push(["SGST", formatINR(inv.totalSgst)]);
  if (inv.totalIgst) totalsData.push(["IGST", formatINR(inv.totalIgst)]);
  if (inv.totalCess) totalsData.push(["Cess", formatINR(inv.totalCess)]);
  totalsData.push(["Grand Total", formatINR(inv.grandTotal)]);

  const totalsX = pageW - margin - 70;
  doc.setDrawColor(200, 200, 200);
  doc.setFontSize(8.5);
  totalsData.forEach((row, i) => {
    const isLast = i === totalsData.length - 1;
    if (isLast) {
      doc.setFillColor(...NAVY);
      doc.rect(totalsX, y - 1, 70, 7, "F");
      doc.setTextColor(...WHITE);
      doc.setFont(HUXLEY_FONT, "bold");
      doc.setFontSize(9.5);
    } else {
      doc.setTextColor(60, 60, 60);
      doc.setFont(HUXLEY_FONT, "normal");
      doc.setFontSize(8.5);
    }
    doc.text(row[0], totalsX + 2, y + 4);
    doc.text(row[1], pageW - margin - 2, y + 4, { align: "right" });
    y += 7;
  });

  doc.setTextColor(...GRAY);
  doc.setFont(HUXLEY_FONT, "italic");
  doc.setFontSize(7.5);
  doc.text(amountInWords(inv.grandTotal), margin, y + 2);
  y += 8;

  if (opts.declaration) {
    doc.setTextColor(60, 60, 60);
    doc.setFont(HUXLEY_FONT, "bold");
    doc.setFontSize(7.5);
    doc.text("DECLARATION", margin, y + 4);
    doc.setFont(HUXLEY_FONT, "normal");
    doc.setFontSize(7);
    const lines = doc.splitTextToSize(opts.declaration, pageW - 2 * margin);
    doc.text(lines, margin, y + 9);
    y += 9 + lines.length * 3.5;
  }

  if (opts.termsConditions) {
    doc.setFont(HUXLEY_FONT, "bold");
    doc.setFontSize(7.5);
    doc.text("TERMS & CONDITIONS", margin, y + 4);
    doc.setFont(HUXLEY_FONT, "normal");
    doc.setFontSize(7);
    const lines = doc.splitTextToSize(opts.termsConditions, pageW - 2 * margin);
    doc.text(lines, margin, y + 9);
    y += 9 + lines.length * 3.5;
  }

  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(...NAVY);
  doc.rect(0, pageH - 8, pageW, 8, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(7);
  doc.setFont(HUXLEY_FONT, "normal");
  doc.text("This is a computer-generated document.", pageW / 2, pageH - 3, {
    align: "center",
  });

  doc.save(`${inv.invoiceNumber}.pdf`);
}

export async function downloadReportPDF(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  businessName: string,
  logo?: string,
) {
  const { JsPDF, autoTable } = await getJsPDF();
  const doc: JsPDFDoc = new JsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 20, "F");

  if (logo?.startsWith("data:")) {
    try {
      const fmt = logo.includes("png") ? "PNG" : "JPEG";
      doc.addImage(logo, fmt, margin, 2, 14, 14);
    } catch {
      /* skip */
    }
  }

  const nameX = logo ? margin + 18 : margin;
  doc.setTextColor(...WHITE);
  doc.setFont(HUXLEY_FONT, "bold");
  doc.setFontSize(13);
  doc.text(businessName || "GST Manager Pro", nameX, 10);
  doc.setFontSize(9);
  doc.setFont(HUXLEY_FONT, "normal");
  doc.text(title, nameX, 16);

  doc.setFont(HUXLEY_FONT, "italic");
  doc.setFontSize(7.5);
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-IN")}`,
    pageW - margin,
    16,
    { align: "right" },
  );

  autoTable(doc, {
    startY: 24,
    head: [headers],
    body: rows.map((r) => r.map(String)),
    theme: "grid",
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontSize: 7.5,
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 7.5 },
    margin: { left: margin, right: margin },
  });

  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(...NAVY);
  doc.rect(0, pageH - 8, pageW, 8, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(7);
  doc.text(
    "GST Manager Pro — Computer Generated Report",
    pageW / 2,
    pageH - 3,
    { align: "center" },
  );

  doc.save(`${title.replace(/\s+/g, "-")}.pdf`);
}
