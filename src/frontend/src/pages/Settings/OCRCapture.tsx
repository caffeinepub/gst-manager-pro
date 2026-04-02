import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInvoices, usePurchases } from "@/hooks/useGSTStore";
import type { InvoiceLineItem, InvoiceType } from "@/types/gst";
import { GST_RATES } from "@/types/gst";
import {
  FileImage,
  FileText,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Save,
  ScanLine,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const TESSERACT_VERSION = "5.0.4";
const PDFJS_VERSION = "3.11.174";

let _tesseract: any = null;
let _pdfjs: any = null;

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  description: string;
  hsnSacCode: string;
  qty: number;
  unit: string;
  unitPrice: number;
  gstRate: number;
}

interface OCRResult {
  vendorName: string;
  gstin: string;
  invoiceNo: string;
  date: string;
  lineItems: LineItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  grandTotal: number;
  confidence: number;
}

type DocType =
  | "purchase"
  | "sales"
  | "service"
  | "proforma"
  | "credit_note"
  | "debit_note"
  | "quotation";

// ─── Script Loader ────────────────────────────────────────────────────────────

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

async function getTesseract() {
  if (_tesseract) return _tesseract;
  await loadScript(
    `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/tesseract.min.js`,
  );
  // biome-ignore lint/suspicious/noExplicitAny: CDN global
  const lib = (window as any).Tesseract;
  if (!lib) throw new Error(`Tesseract.js ${TESSERACT_VERSION} failed to load`);
  _tesseract = lib;
  return lib;
}

async function getPdfjsLib() {
  if (_pdfjs) return _pdfjs;
  await loadScript(
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.js`,
  );
  // biome-ignore lint/suspicious/noExplicitAny: CDN global
  const lib = (window as any).pdfjsLib;
  if (!lib) throw new Error(`PDF.js ${PDFJS_VERSION} failed to load`);
  lib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`;
  _pdfjs = lib;
  return lib;
}

// ─── PDF → Canvas ────────────────────────────────────────────────────────────

async function pdfToCanvas(
  file: File,
  onProgress?: (page: number, total: number) => void,
): Promise<HTMLCanvasElement> {
  const pdfjsLib = await getPdfjsLib();
  const arrayBuffer = await file.arrayBuffer();
  // biome-ignore lint/suspicious/noExplicitAny: pdfjs types
  const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer })
    .promise;
  const totalPages = pdf.numPages;
  onProgress?.(1, totalPages);
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.5 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport }).promise;
  // Grayscale pre-processing
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = gray;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// ─── Text Parsers ─────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

function parseDate(text: string): string {
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = text.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // ISO already
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];
  // Written: "05 Feb 2026", "5th Feb 2026", "5 February 2026"
  const written = text.match(
    /(\d{1,2})(?:st|nd|rd|th)?\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember))[,\.\s]+(\d{4})/i,
  );
  if (written) {
    const [, d, m, y] = written;
    const mo = MONTH_MAP[m.toLowerCase().slice(0, 3)];
    if (mo) return `${y}-${mo}-${d.padStart(2, "0")}`;
  }
  // Month-first: "February 5, 2026" or "Feb 5 2026"
  const mFirst = text.match(
    /(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember))\s+(\d{1,2})[,\.\s]+(\d{4})/i,
  );
  if (mFirst) {
    const [, m, d, y] = mFirst;
    const mo = MONTH_MAP[m.toLowerCase().slice(0, 3)];
    if (mo) return `${y}-${mo}-${d.padStart(2, "0")}`;
  }
  return new Date().toISOString().split("T")[0];
}

function parseGSTIN(text: string): string {
  const m = text.match(/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b/i);
  return m ? m[1].toUpperCase() : "";
}

function parseInvoiceNo(text: string): string {
  const patterns = [
    /(?:invoice\s*(?:no\.?|number|#)|inv\s*(?:no\.?|#)|bill\s*(?:no\.?|number|#)|tax\s*invoice\s*(?:no\.?|#))\s*[:\-]?\s*([A-Z0-9\-\/]+)/i,
    /(?:^|\s)((?:[A-Z]{2,}-)?\d{4,}(?:\/\d+)?)(?:\s|$)/m,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

function parseVendorName(text: string): string {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  // Try to find after "Bill From", "Vendor", "Supplier" labels
  for (const line of lines) {
    const m = line.match(
      /(?:bill\s*from|vendor|supplier|sold\s*by)[:\s]+(.+)/i,
    );
    if (m) return m[1].trim();
  }
  // Heuristic: first non-trivial line (not the invoice header)
  for (const line of lines.slice(0, 6)) {
    if (
      line.length > 5 &&
      !/invoice|gst|tax|gstin|receipt|bill/i.test(line) &&
      !/^\d/.test(line)
    ) {
      return line;
    }
  }
  return "";
}

/**
 * Extract a tax amount from text by finding lines that match a label pattern,
 * then extracting the rightmost plausible currency amount on that line.
 * This avoids picking up GST rates (like "9%") instead of the actual tax amount.
 */
function extractTaxLineAmount(text: string, pattern: RegExp): number {
  const lines = text.split("\n");
  for (const line of lines) {
    if (!pattern.test(line)) continue;
    // Prefer: Rs./₹/INR prefix followed by number
    const withPrefix = line.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (withPrefix?.[1]) {
      return Number.parseFloat(withPrefix[1].replace(/,/g, ""));
    }
    // Next: last number on the line (rightmost column in a table)
    const allNums = [...line.matchAll(/([\d,]+(?:\.\d{1,2})?)/g)].map((m) =>
      Number.parseFloat(m[1].replace(/,/g, "")),
    );
    // Filter out small numbers that are likely percentages (< 30 suggests a rate)
    const amounts = allNums.filter((n) => n >= 10);
    if (amounts.length > 0) return amounts[amounts.length - 1];
    // Fall back to any non-zero number
    const nonZero = allNums.filter((n) => n > 0);
    if (nonZero.length > 0) return nonZero[nonZero.length - 1];
  }
  // Try next line after label
  const labelIdx = lines.findIndex((l) => pattern.test(l));
  if (labelIdx >= 0 && labelIdx + 1 < lines.length) {
    const nextLine = lines[labelIdx + 1];
    const m = nextLine.match(/(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (m?.[1]) return Number.parseFloat(m[1].replace(/,/g, ""));
  }
  return 0;
}

function parseAmount(text: string, label: RegExp): number {
  return extractTaxLineAmount(text, label);
}

function parseTaxAmounts(text: string): {
  cgst: number;
  sgst: number;
  igst: number;
} {
  return {
    cgst: extractTaxLineAmount(text, /cgst|central\s*gst/i),
    sgst: extractTaxLineAmount(text, /sgst|state\s*gst/i),
    igst: extractTaxLineAmount(text, /igst|integrated\s*gst/i),
  };
}

function parseLineItems(text: string): LineItem[] {
  const lines = text.split("\n").map((l) => l.trim());
  const items: LineItem[] = [];

  // Find table header row index
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (
      /description|particulars|item\s*name|product/i.test(lines[i]) &&
      /hsn|sac|qty|quantity/i.test(lines[i])
    ) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    // Try looser search - just has "description" or "particulars"
    for (let i = 0; i < lines.length; i++) {
      if (/^(?:.*\s+)?(description|particulars|item\s*name)/i.test(lines[i])) {
        headerIdx = i;
        break;
      }
    }
  }

  if (headerIdx === -1) return items;

  // Scan lines after header until footer keywords
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (
      /^(?:sub\s*total|subtotal|grand\s*total|total\s*amount|net\s*payable|amount\s*payable|total\s*due|cgst|sgst|igst|tax|discount)/i.test(
        line,
      )
    )
      break;
    if (!line || line.length < 5) continue;
    // Skip if looks like a header repeat
    if (/description|hsn.*qty|sr\.?\s*no/i.test(line)) continue;

    // Try to parse: description (text), HSN (4-8 digits), qty (num), rate (num), amount (num)
    const nums = [...line.matchAll(/(\d+(?:[,.]\d+)*)/g)].map((m) =>
      Number.parseFloat(m[1].replace(/,/g, "")),
    );
    const hsnMatch = line.match(/\b(\d{4,8})\b/);
    const descMatch = line.match(/^[\d.\s]*([A-Za-z][A-Za-z0-9\s\-\/&,]+)/);

    const desc = descMatch ? descMatch[1].replace(/\d{4,}/g, "").trim() : "";
    if (!desc || desc.length < 3) continue;

    const item: LineItem = {
      description: desc.trim(),
      hsnSacCode: hsnMatch ? hsnMatch[1] : "",
      qty: nums.length > 0 ? nums[0] : 1,
      unit: "Nos",
      unitPrice: nums.length > 1 ? nums[nums.length - 2] : 0,
      gstRate: 18,
    };
    items.push(item);
  }

  return items;
}

function parseOCRText(rawText: string): OCRResult {
  const text = rawText ?? "";
  const vendorName = parseVendorName(text);
  const gstin = parseGSTIN(text);
  const invoiceNo = parseInvoiceNo(text);
  const date = parseDate(text);
  const lineItems = parseLineItems(text);

  const grandTotal =
    parseAmount(
      text,
      /grand\s*total|total\s*amount|net\s*payable|amount\s*payable|total\s*due|invoice\s*total|balance\s*due|total\s*payable|total\s*invoice\s*value/i,
    ) ||
    parseAmount(text, /total/i) ||
    0;

  const subtotal =
    parseAmount(
      text,
      /sub\s*total|subtotal|taxable\s*amount|taxable\s*value/i,
    ) || 0;

  const { cgst, sgst, igst } = parseTaxAmounts(text);
  const totalTax =
    cgst + sgst + igst ||
    (grandTotal - subtotal > 0 ? grandTotal - subtotal : 0);

  const confidence = Math.round(
    ([vendorName, gstin, invoiceNo, date].filter(Boolean).length / 4) * 100,
  );

  return {
    vendorName,
    gstin,
    invoiceNo,
    date,
    lineItems:
      lineItems.length > 0
        ? lineItems
        : [
            {
              description: "",
              hsnSacCode: "",
              qty: 1,
              unit: "Nos",
              unitPrice: grandTotal - totalTax || 0,
              gstRate: 18,
            },
          ],
    subtotal,
    cgst,
    sgst,
    igst,
    totalTax,
    grandTotal,
    confidence,
  };
}

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: "purchase", label: "Purchase Entry" },
  { value: "sales", label: "Sales Invoice" },
  { value: "service", label: "Service Invoice" },
  { value: "proforma", label: "Proforma Invoice" },
  { value: "credit_note", label: "Credit Note" },
  { value: "debit_note", label: "Debit Note" },
  { value: "quotation", label: "Quotation" },
];

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OCRCapture() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Review form state
  const [docType, setDocType] = useState<DocType>("purchase");
  const [vendorName, setVendorName] = useState("");
  const [gstin, setGstin] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [cgst, setCgst] = useState(0);
  const [sgst, setSgst] = useState(0);
  const [igst, setIgst] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);

  const { addInvoice } = useInvoices();
  const { addPurchase } = usePurchases();

  const processFile = async (file: File) => {
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.type)) {
      toast.error("Please upload PDF, PNG, or JPG files only");
      return;
    }
    setSelectedFile(file);
    setProcessing(true);
    setProgress(5);
    setOcrResult(null);
    setErrorMessage(null);
    setStatusText("Loading OCR libraries...");

    try {
      let imageSource: HTMLCanvasElement | string;

      if (file.type === "application/pdf") {
        setStatusText("Loading PDF renderer...");
        setProgress(10);
        imageSource = await pdfToCanvas(file, (page, total) => {
          setStatusText(`Processing page ${page} of ${total}...`);
          setProgress(10 + Math.round((page / total) * 20));
        });
        setProgress(30);
      } else {
        imageSource = URL.createObjectURL(file);
        setProgress(20);
      }

      setStatusText("Loading OCR engine...");
      setProgress(35);

      const Tesseract = await getTesseract();
      const worker = await Tesseract.createWorker("eng", 1, {
        workerPath: `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/worker.min.js`,
        langPath: "https://tessdata.projectnaptha.com/4.0.0",
        corePath:
          "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm.js",
      });

      setStatusText("Recognizing text...");
      let fakeProgress = 35;
      const pollInterval = setInterval(() => {
        fakeProgress = Math.min(fakeProgress + 3, 90);
        setProgress(fakeProgress);
        setStatusText(`Reading text... ${fakeProgress}%`);
      }, 400);

      const { data } = await worker.recognize(imageSource);
      clearInterval(pollInterval);
      await worker.terminate();
      if (typeof imageSource === "string") URL.revokeObjectURL(imageSource);

      setProgress(97);
      setStatusText("Parsing fields...");
      const parsed = parseOCRText(data.text);
      setOcrResult(parsed);

      // Populate review form
      setVendorName(parsed.vendorName);
      setGstin(parsed.gstin);
      setInvoiceNo(parsed.invoiceNo);
      setDate(parsed.date);
      setLineItems(parsed.lineItems);
      setCgst(parsed.cgst);
      setSgst(parsed.sgst);
      setIgst(parsed.igst);
      setGrandTotal(parsed.grandTotal);

      setProgress(100);
      setProcessing(false);
      toast.success("Document scanned — review and save below");
    } catch (err) {
      console.error("OCR error:", err);
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(message);
      setProcessing(false);
      toast.error("OCR failed. See error details below.");
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRetry = () => {
    if (selectedFile) processFile(selectedFile);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setOcrResult(null);
    setErrorMessage(null);
    setProgress(0);
    setStatusText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updateLineItem = (
    idx: number,
    field: keyof LineItem,
    value: string | number,
  ) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    );
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        description: "",
        hsnSacCode: "",
        qty: 1,
        unit: "Nos",
        unitPrice: 0,
        gstRate: 18,
      },
    ]);
  };

  const removeLineItem = (idx: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const computedSubtotal = lineItems.reduce(
    (sum, item) => sum + item.qty * item.unitPrice,
    0,
  );
  const computedTotal = computedSubtotal + cgst + sgst + igst;

  const handleSave = async () => {
    if (!vendorName.trim()) {
      toast.error("Vendor/Party name is required");
      return;
    }
    setSaving(true);
    try {
      if (docType === "purchase") {
        const purchaseLineItems: InvoiceLineItem[] = lineItems.map((item) => {
          const taxRate = item.gstRate;
          const lineTotal = item.qty * item.unitPrice;
          const cgstAmt = (lineTotal * (taxRate / 2)) / 100;
          const sgstAmt = (lineTotal * (taxRate / 2)) / 100;
          return {
            id: generateId(),
            itemId: "",
            description: item.description,
            hsnSacCode: item.hsnSacCode,
            qty: item.qty,
            unit: item.unit,
            unitPrice: item.unitPrice,
            discountPercent: 0,
            gstRate: taxRate,
            cgst: cgstAmt,
            sgst: sgstAmt,
            igst: 0,
            cessPercent: 0,
            cess: 0,
            lineTotal: lineTotal + cgstAmt + sgstAmt,
          };
        });
        addPurchase({
          billNumber: invoiceNo || `OCR-${Date.now()}`,
          billDate: date || new Date().toISOString().split("T")[0],
          dueDate: date || new Date().toISOString().split("T")[0],
          vendorId: "",
          vendorName: vendorName,
          vendorGstin: gstin,
          lineItems: purchaseLineItems,
          subtotal: computedSubtotal,
          totalDiscount: 0,
          totalCgst: cgst,
          totalSgst: sgst,
          totalIgst: igst,
          totalCess: 0,
          grandTotal: grandTotal || computedTotal,
          isRcm: false,
          itcEligible: true,
          status: "draft",
          notes: "Created from OCR scan",
        });
        toast.success(
          "Purchase entry saved! Navigate to Accounting > Purchases to view.",
        );
      } else {
        const invoiceLineItems: InvoiceLineItem[] = lineItems.map((item) => {
          const taxRate = item.gstRate;
          const lineTotal = item.qty * item.unitPrice;
          const cgstAmt = (lineTotal * (taxRate / 2)) / 100;
          const sgstAmt = (lineTotal * (taxRate / 2)) / 100;
          return {
            id: generateId(),
            itemId: "",
            description: item.description,
            hsnSacCode: item.hsnSacCode,
            qty: item.qty,
            unit: item.unit,
            unitPrice: item.unitPrice,
            discountPercent: 0,
            gstRate: taxRate,
            cgst: cgstAmt,
            sgst: sgstAmt,
            igst: 0,
            cessPercent: 0,
            cess: 0,
            lineTotal: lineTotal + cgstAmt + sgstAmt,
          };
        });
        const invType: InvoiceType = docType as InvoiceType;
        addInvoice({
          type: invType,
          invoiceNumber: invoiceNo || `OCR-${Date.now()}`,
          date: date || new Date().toISOString().split("T")[0],
          dueDate: date || new Date().toISOString().split("T")[0],
          partyId: "",
          partyName: vendorName,
          partyGstin: gstin,
          placeOfSupply: "",
          placeOfSupplyName: "",
          lineItems: invoiceLineItems,
          subtotal: computedSubtotal,
          totalDiscount: 0,
          totalCgst: cgst,
          totalSgst: sgst,
          totalIgst: igst,
          totalCess: 0,
          grandTotal: grandTotal || computedTotal,
          irnNumber: "",
          eWayBillNumber: "",
          notes: "Created from OCR scan",
          termsConditions: "",
          status: "draft",
        });
        const label =
          DOC_TYPES.find((d) => d.value === docType)?.label ?? "Invoice";
        toast.success(`${label} saved! Navigate to Invoicing to view.`);
      }
      handleClear();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-6" data-ocid="ocr.section">
      <div>
        <h2 className="text-lg font-semibold">OCR / Document Capture</h2>
        <p className="text-sm text-muted-foreground">
          Upload a PDF or image invoice to automatically extract vendor,
          amounts, GST, and line items. Review and edit all fields before
          saving.
        </p>
      </div>

      {/* Upload Area */}
      {!ocrResult && !errorMessage && (
        <Card className="bg-card border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ScanLine className="w-5 h-5 text-primary" />
              Upload Document
            </CardTitle>
            <CardDescription>Supports PDF, PNG, JPG • Max 10MB</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => !processing && fileInputRef.current?.click()}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                !processing &&
                fileInputRef.current?.click()
              }
              data-ocid="ocr.dropzone"
            >
              {processing ? (
                <div className="space-y-4">
                  <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
                  <p className="text-sm font-medium">
                    {statusText || "Processing..."}
                  </p>
                  <Progress value={progress} className="w-56 mx-auto" />
                  <p className="text-xs text-muted-foreground">{progress}%</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                    <Upload className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      Drag & drop your invoice here
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or{" "}
                      <span className="text-primary underline cursor-pointer">
                        click to browse
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> PDF
                    </span>
                    <span className="flex items-center gap-1">
                      <FileImage className="w-3.5 h-3.5" /> PNG / JPG
                    </span>
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={handleFileInput}
              data-ocid="ocr.upload_button"
            />
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {errorMessage && !ocrResult && (
        <Card
          className="bg-card border-destructive/40"
          data-ocid="ocr.error_state"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <XCircle className="w-5 h-5" />
              OCR Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-mono text-destructive break-all">
                {errorMessage}
              </p>
            </div>
            <div className="flex gap-3">
              {selectedFile && (
                <Button onClick={handleRetry} data-ocid="ocr.retry.button">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              )}
              <Button variant="outline" onClick={handleClear}>
                <X className="w-4 h-4 mr-2" />
                Upload New
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Form */}
      {ocrResult && (
        <div className="space-y-6" data-ocid="ocr.panel">
          {/* Confidence badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Review Extracted Data</p>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  ocrResult.confidence >= 75
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : ocrResult.confidence >= 50
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {ocrResult.confidence}% confidence
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={handleClear}>
              <X className="w-3.5 h-3.5 mr-1.5" />
              Scan New
            </Button>
          </div>

          {/* Document Type */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Document Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={docType}
                onValueChange={(v) => setDocType(v as DocType)}
              >
                <SelectTrigger className="w-72" data-ocid="ocr.select">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Party Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Party / Vendor Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ocr-vendor">Party Name *</Label>
                  <Input
                    id="ocr-vendor"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="Vendor / Party Name"
                    data-ocid="ocr.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ocr-gstin">GSTIN</Label>
                  <Input
                    id="ocr-gstin"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="22AAAAA0000A1Z5"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ocr-invno">Invoice / Bill Number</Label>
                  <Input
                    id="ocr-invno"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    placeholder="INV-001"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ocr-date">Date</Label>
                  <Input
                    id="ocr-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  Line Items
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addLineItem}
                  data-ocid="ocr.primary_button"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add Row
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%] min-w-[150px]">
                        Description
                      </TableHead>
                      <TableHead className="w-[12%]">HSN/SAC</TableHead>
                      <TableHead className="w-[8%]">Qty</TableHead>
                      <TableHead className="w-[8%]">Unit</TableHead>
                      <TableHead className="w-[14%]">Unit Price (₹)</TableHead>
                      <TableHead className="w-[10%]">GST %</TableHead>
                      <TableHead className="w-[12%]">Amount (₹)</TableHead>
                      <TableHead className="w-[6%]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item, idx) => (
                      <TableRow
                        // biome-ignore lint/suspicious/noArrayIndexKey: line items have no stable id
                        key={idx}
                        data-ocid={`ocr.item.${idx + 1}`}
                      >
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) =>
                              updateLineItem(idx, "description", e.target.value)
                            }
                            placeholder="Description"
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.hsnSacCode}
                            onChange={(e) =>
                              updateLineItem(idx, "hsnSacCode", e.target.value)
                            }
                            placeholder="HSN"
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.qty}
                            onChange={(e) =>
                              updateLineItem(idx, "qty", Number(e.target.value))
                            }
                            className="h-8 text-sm"
                            min={0}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.unit}
                            onChange={(e) =>
                              updateLineItem(idx, "unit", e.target.value)
                            }
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateLineItem(
                                idx,
                                "unitPrice",
                                Number(e.target.value),
                              )
                            }
                            className="h-8 text-sm"
                            min={0}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={String(item.gstRate)}
                            onValueChange={(v) =>
                              updateLineItem(idx, "gstRate", Number(v))
                            }
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {GST_RATES.map((r) => (
                                <SelectItem key={r} value={String(r)}>
                                  {r}%
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          ₹
                          {(item.qty * item.unitPrice).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => removeLineItem(idx)}
                            data-ocid={`ocr.delete_button.${idx + 1}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Tax Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Tax Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label>Subtotal (₹)</Label>
                  <Input
                    type="number"
                    value={computedSubtotal.toFixed(2)}
                    readOnly
                    className="bg-muted/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>CGST (₹)</Label>
                  <Input
                    type="number"
                    value={cgst}
                    onChange={(e) => setCgst(Number(e.target.value))}
                    min={0}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>SGST (₹)</Label>
                  <Input
                    type="number"
                    value={sgst}
                    onChange={(e) => setSgst(Number(e.target.value))}
                    min={0}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>IGST (₹)</Label>
                  <Input
                    type="number"
                    value={igst}
                    onChange={(e) => setIgst(Number(e.target.value))}
                    min={0}
                  />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <div className="space-y-1.5">
                  <Label>Grand Total (₹)</Label>
                  <Input
                    type="number"
                    value={grandTotal || computedTotal}
                    onChange={(e) => setGrandTotal(Number(e.target.value))}
                    className="w-48 font-semibold"
                    min={0}
                  />
                </div>
                <Button
                  size="lg"
                  onClick={handleSave}
                  disabled={saving}
                  data-ocid="ocr.submit_button"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {saving
                    ? "Saving..."
                    : `Save as ${DOC_TYPES.find((d) => d.value === docType)?.label}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
