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
import { Textarea } from "@/components/ui/textarea";
import { useInvoices, usePurchases } from "@/hooks/useGSTStore";
import { useParties } from "@/hooks/useGSTStore";
import type { InvoiceLineItem, InvoiceType } from "@/types/gst";
import { GST_RATES, INDIAN_STATES } from "@/types/gst";
import {
  ChevronDown,
  ChevronUp,
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

const TESSERACT_VERSION = "4.1.4";
const PDFJS_VERSION = "3.11.174";

let _tesseract: any = null;
let _pdfjs: any = null;

// ─── Indian States ────────────────────────────────────────────────────────────

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
  // Buyer details
  buyerName: string;
  buyerGstin: string;
  buyerAddress: string;
  // Place of supply
  placeOfSupply: string;
  placeOfSupplyName: string;
  // Line items
  lineItems: LineItem[];
  // Tax
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  grandTotal: number;
  // Raw OCR text
  rawText: string;
  // Confidence
  confidence: number;
  confidenceLabel: "High" | "Medium" | "Low";
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
    `https://unpkg.com/tesseract.js@${TESSERACT_VERSION}/dist/tesseract.min.js`,
  );
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
  const lib = (window as any).pdfjsLib;
  if (!lib) throw new Error(`PDF.js ${PDFJS_VERSION} failed to load`);
  lib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`;
  _pdfjs = lib;
  return lib;
}

// ─── Tesseract v4 Worker Runner ───────────────────────────────────────────────

async function runOCROnCanvas(
  imageSource: HTMLCanvasElement | string,
  onProgress: (pct: number, status: string) => void,
): Promise<string> {
  const Tesseract = await getTesseract();
  const workerOptions = {
    workerPath: `https://unpkg.com/tesseract.js@${TESSERACT_VERSION}/dist/worker.min.js`,
    langPath: "https://tessdata.projectnaptha.com/4.0.0",
    corePath:
      "https://unpkg.com/tesseract.js-core@4.0.4/tesseract-core.wasm.js",
    logger: (m: { status: string; progress: number }) => {
      if (m.progress != null) {
        onProgress(Math.round(m.progress * 100), m.status);
      }
    },
  };
  const worker = await Tesseract.createWorker(workerOptions);
  await worker.loadLanguage("eng");
  await worker.initialize("eng");
  const { data } = await worker.recognize(imageSource);
  await worker.terminate();
  return data.text;
}

async function runOCR(
  imageSource: HTMLCanvasElement | string,
  onProgress: (pct: number, status: string) => void,
): Promise<string> {
  return runOCROnCanvas(imageSource, onProgress);
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
  const dmy = text.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];
  const written = text.match(
    /(\d{1,2})(?:st|nd|rd|th)?\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember))[,\.\s]+(\d{4})/i,
  );
  if (written) {
    const [, d, m, y] = written;
    const mo = MONTH_MAP[m.toLowerCase().slice(0, 3)];
    if (mo) return `${y}-${mo}-${d.padStart(2, "0")}`;
  }
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

/**
 * Parse all GSTINs in the text. Returns [vendorGSTIN, buyerGSTIN].
 * We assume the first occurrence is vendor's, the second is buyer's.
 */
function parseAllGSTINs(text: string): [string, string] {
  const all = [
    ...text.matchAll(/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b/gi),
  ].map((m) => m[1].toUpperCase());
  return [all[0] ?? "", all[1] ?? ""];
}

function parseInvoiceNo(text: string): string {
  const patterns = [
    /(?:invoice\s*(?:no\.?|number|#)|inv\s*(?:no\.?|#)|bill\s*(?:no\.?|number|#)|tax\s*invoice\s*(?:no\.?|#))\s*[:\-]?\s*([A-Z0-9\-\/]+)/i,
    /(?:^|\s)((?:[A-Z]{2,}-)\d{4,}(?:\/\d+)?)(?:\s|$)/m,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

/**
 * Enhanced vendor name extraction:
 * 1. Explicit label matching (Company Name, Bill From, Seller, Supplier, etc.)
 * 2. Business entity name patterns (ALL CAPS, Ltd, Pvt Ltd, LLP, & Co, etc.)
 * 3. Heuristic fallback (first non-trivial, non-GSTIN line from top)
 */
function parseVendorName(text: string): string {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // 1. Explicit labels
  for (const line of lines) {
    const m = line.match(
      /(?:company\s*name|bill\s*from|from|seller|supplier|sold\s*by|vendor\s*name|vendor)[:\s]+(.+)/i,
    );
    if (m?.[1]) {
      const name = m[1].trim();
      if (name.length > 3) return name;
    }
  }

  // 2. Business entity patterns
  for (const line of lines.slice(0, 12)) {
    if (
      /\b(pvt\.?\s*ltd\.?|private\s*limited|limited|llp|& co\.?|industries|enterprises|services|solutions|technologies|systems|infra|construction|trading|exports|imports|manufacturing|labs|pharma|chemicals|textiles|metals|motors|automobiles)\b/i.test(
        line,
      )
    ) {
      // Skip lines that are clearly addresses
      if (
        !/\b(no\.|st\.|road|nagar|colony|plot|survey|dist\.|pin|ph\.|tel|mob)\b/i.test(
          line,
        )
      ) {
        return line.replace(/^[\d.\s]+/, "").trim();
      }
    }
    // ALL CAPS line that looks like a company name (min 5 chars, no digits at start)
    if (
      /^[A-Z][A-Z\s&.,()-]{4,}$/.test(line) &&
      line.length > 4 &&
      line.length < 80 &&
      !/^\d/.test(line) &&
      !/GSTIN|INVOICE|TAX|RECEIPT|BILL|TOTAL|DATE|ADDRESS/i.test(line)
    ) {
      return line.trim();
    }
  }

  // 3. Heuristic fallback: first non-trivial line
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
 * Extract buyer details from Bill To / Consignee / Buyer / Customer sections.
 */
function parseBuyerDetails(text: string): {
  buyerName: string;
  buyerGstin: string;
  buyerAddress: string;
} {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Find the label line for buyer section
  const buyerKeywordPattern =
    /^(?:bill\s*to|consignee|buyer|ship\s*to|customer|sold\s*to|billed\s*to)/i;
  let buyerSectionStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (buyerKeywordPattern.test(lines[i])) {
      buyerSectionStart = i;
      break;
    }
  }

  if (buyerSectionStart === -1) {
    // Check if buyer GSTIN (second occurrence) present
    const [, buyerGstin] = parseAllGSTINs(text);
    return { buyerName: "", buyerGstin, buyerAddress: "" };
  }

  // Collect next 5 lines after the buyer label
  const sectionLines = lines.slice(
    buyerSectionStart + 1,
    buyerSectionStart + 6,
  );
  let buyerName = "";
  let buyerGstin = "";
  const addressParts: string[] = [];

  for (const line of sectionLines) {
    const gstMatch = line.match(
      /\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b/i,
    );
    if (gstMatch) {
      buyerGstin = gstMatch[1].toUpperCase();
      continue;
    }
    if (!buyerName && line.length > 3 && !/^\d/.test(line)) {
      buyerName = line;
      continue;
    }
    if (line.length > 3) addressParts.push(line);
    // Stop if we hit seller section or horizontal divider
    if (/^(?:bill\s*from|seller|supplier|from)[:\s]/i.test(line)) break;
  }

  // Fallback: use second GSTIN if not found in section
  if (!buyerGstin) {
    const [, secondGstin] = parseAllGSTINs(text);
    buyerGstin = secondGstin;
  }

  return {
    buyerName,
    buyerGstin,
    buyerAddress: addressParts.join(", "),
  };
}

/**
 * Derive state code from GSTIN (first 2 digits = state code).
 */
function stateCodeFromGstin(gstin: string): string {
  if (!gstin || gstin.length < 2) return "";
  return gstin.slice(0, 2);
}

/**
 * Extract a tax amount from text by finding lines that match a label pattern,
 * then extracting the rightmost plausible currency amount on that line.
 */
function extractTaxLineAmount(text: string, pattern: RegExp): number {
  const lines = text.split("\n");
  for (const line of lines) {
    if (!pattern.test(line)) continue;
    const withPrefix = line.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (withPrefix?.[1]) {
      return Number.parseFloat(withPrefix[1].replace(/,/g, ""));
    }
    const allNums = [...line.matchAll(/([\d,]+(?:\.\d{1,2})?)/g)].map((m) =>
      Number.parseFloat(m[1].replace(/,/g, "")),
    );
    const amounts = allNums.filter((n) => n >= 10);
    if (amounts.length > 0) return amounts[amounts.length - 1];
    const nonZero = allNums.filter((n) => n > 0);
    if (nonZero.length > 0) return nonZero[nonZero.length - 1];
  }
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
    cgst: extractTaxLineAmount(text, /\bcgst\b|central\s*gst/i),
    sgst: extractTaxLineAmount(text, /\bsgst\b|state\s*gst/i),
    igst: extractTaxLineAmount(text, /\bigst\b|integrated\s*gst/i),
  };
}

/**
 * Industry-standard line item parsing:
 * 1. Find table header row with column position detection
 * 2. Extract values aligned to column positions
 * 3. Skip footer/tax lines
 * 4. Handle both HSN (goods) and SAC (services, 6-digit starting with 99)
 * 5. Fallback: look for lines with Qty × Rate = Amount patterns
 */
function parseLineItems(text: string): LineItem[] {
  const lines = text.split("\n").map((l) => l.trim());
  const items: LineItem[] = [];

  const FOOTER_PATTERN =
    /^(?:sub\s*total|subtotal|grand\s*total|total\s*amount|net\s*payable|amount\s*payable|total\s*due|cgst|sgst|igst|integrated|central|state|tax|discount|narration|terms|balance|amount\s*in\s*words|e\.?\s*&\s*o\.?e|round\s*off|freight|packaging|total|invoice\s*total)/i;
  const HEADER_DESC_PATTERN =
    /description|particulars|item\s*(?:name)?|product\s*(?:name)?|service\s*(?:name)?|goods/i;
  const HEADER_QTY_PATTERN = /qty|quantity|nos|units/i;
  const HEADER_HSN_PATTERN = /hsn|sac|code/i;
  const HEADER_RATE_PATTERN = /rate|price|unit\s*(?:price|rate)|per\s*unit/i;
  const HEADER_AMOUNT_PATTERN = /amount|total|value/i;

  // Find header row — must have description-like column AND at least one more
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toLowerCase();
    const hasDesc = HEADER_DESC_PATTERN.test(l);
    const hasOther =
      HEADER_HSN_PATTERN.test(l) ||
      HEADER_QTY_PATTERN.test(l) ||
      HEADER_RATE_PATTERN.test(l) ||
      HEADER_AMOUNT_PATTERN.test(l);
    if (hasDesc && hasOther) {
      headerIdx = i;
      break;
    }
  }

  // Looser fallback: just the description column header
  if (headerIdx === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (HEADER_DESC_PATTERN.test(lines[i])) {
        headerIdx = i;
        break;
      }
    }
  }

  if (headerIdx >= 0) {
    // Extract column positions from the header line (character offsets)
    void lines[headerIdx]; // header line position noted but not needed for text-based parsing
    // We don't have true position data from Tesseract text, so we use word indices
    // Parse lines after header until footer or end of table
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const line = lines[i];

      // Stop on footer / section break
      if (FOOTER_PATTERN.test(line)) break;
      if (!line || line.length < 4) continue;
      // Skip repeated header-like rows
      if (HEADER_DESC_PATTERN.test(line) && HEADER_QTY_PATTERN.test(line))
        continue;
      // Skip serial number / index only lines
      if (/^\s*\d{1,3}\s*$/.test(line)) continue;

      // Extract numbers from the line
      const nums = [...line.matchAll(/([\d,]+(?:\.\d{1,2})?)/g)].map((m) =>
        Number.parseFloat(m[1].replace(/,/g, "")),
      );

      // Try to find HSN/SAC code: 4-8 digit number OR 6-digit starting with 99 (SAC)
      const hsnMatch =
        line.match(/\b(99\d{4})\b/) || // SAC code
        line.match(/\b(\d{4,8})\b/); // HSN code

      // Description: leading text up to the first long number sequence
      const descMatch = line.match(
        /^[\d.\s]*([A-Za-z][A-Za-z0-9\s\-\/&,()%+:]+)/,
      );
      let desc = descMatch ? descMatch[1] : "";
      // Remove embedded HSN/SAC from description
      if (hsnMatch) desc = desc.replace(hsnMatch[1], "").trim();
      desc = desc.replace(/\s{2,}/g, " ").trim();

      // Need at least a meaningful description (>= 3 chars)
      if (!desc || desc.length < 3) continue;
      // Skip if it's clearly a tax/footer line that slipped through
      if (/^\s*(?:cgst|sgst|igst|tax|discount|total|subtotal)/i.test(desc))
        continue;

      // Qty: first small number (< 10000), Rate: second-to-last, Amount: last
      let qty = 1;
      let unitPrice = 0;
      const validNums = nums.filter((n) => n > 0);
      if (validNums.length >= 3) {
        qty = validNums[0];
        unitPrice = validNums[validNums.length - 2];
      } else if (validNums.length === 2) {
        qty = 1;
        unitPrice = validNums[0];
      } else if (validNums.length === 1) {
        unitPrice = validNums[0];
      }

      // Avoid duplicate items with same description
      if (items.some((it) => it.description === desc)) continue;

      items.push({
        description: desc,
        hsnSacCode: hsnMatch ? hsnMatch[1] : "",
        qty: qty > 0 ? qty : 1,
        unit: "Nos",
        unitPrice,
        gstRate: 18,
      });
    }
  }

  // Fallback: look for lines with Qty × Rate = Amount pattern
  if (items.length === 0) {
    for (const line of lines) {
      if (FOOTER_PATTERN.test(line)) continue;
      // Pattern: some text followed by numbers like "Service Charges 1 5000.00 5000.00"
      const fallback = line.match(
        /^([A-Za-z][\w\s&-]{2,40})\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:,\d+)*(?:\.\d+)?)\s*$/,
      );
      if (fallback) {
        items.push({
          description: fallback[1].trim(),
          hsnSacCode: "",
          qty: Number.parseFloat(fallback[2]),
          unit: "Nos",
          unitPrice: Number.parseFloat(fallback[3]),
          gstRate: 18,
        });
      }
    }
  }

  return items;
}

/**
 * Compute confidence score based on field quality (0-100).
 */
function computeConfidence(
  vendorName: string,
  gstin: string,
  invoiceNo: string,
  date: string,
  grandTotal: number,
  lineItems: LineItem[],
  rawDateStr: string,
): { score: number; label: "High" | "Medium" | "Low" } {
  let score = 0;
  if (vendorName.trim().length > 2) score += 25;
  if (gstin && /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin))
    score += 25;
  if (invoiceNo.trim().length > 0) score += 15;
  // Date: +15 only if it's NOT today's fallback
  const today = new Date().toISOString().split("T")[0];
  if (date && date !== today && rawDateStr !== "") score += 15;
  if (grandTotal > 0) score += 10;
  if (lineItems.length > 0 && lineItems[0].description.length > 2) score += 10;

  const label: "High" | "Medium" | "Low" =
    score >= 75 ? "High" : score >= 50 ? "Medium" : "Low";
  return { score, label };
}

function parseOCRText(rawText: string): OCRResult {
  const text = rawText ?? "";
  const vendorName = parseVendorName(text);
  const [vendorGstin, secondGstin] = parseAllGSTINs(text);
  const gstin = vendorGstin;
  const invoiceNo = parseInvoiceNo(text);
  const date = parseDate(text);
  const lineItems = parseLineItems(text);

  const { buyerName, buyerGstin, buyerAddress } = parseBuyerDetails(text);
  // Use second GSTIN for buyer if parsed buyer GSTIN is empty
  const resolvedBuyerGstin = buyerGstin || secondGstin;

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

  // Place of supply: derive from vendor GSTIN state code
  const supplierStateCode = stateCodeFromGstin(gstin);
  const placeOfSupply = supplierStateCode;
  const placeOfSupplyState = INDIAN_STATES.find(
    (s) => s.code === supplierStateCode,
  );
  const placeOfSupplyName = placeOfSupplyState?.name ?? "";

  const { score, label } = computeConfidence(
    vendorName,
    gstin,
    invoiceNo,
    date,
    grandTotal,
    lineItems,
    date, // pass back to check if it's a fallback
  );

  return {
    vendorName,
    gstin,
    invoiceNo,
    date,
    buyerName,
    buyerGstin: resolvedBuyerGstin,
    buyerAddress,
    placeOfSupply,
    placeOfSupplyName,
    lineItems:
      lineItems.length > 0
        ? lineItems
        : [
            {
              description: "",
              hsnSacCode: "",
              qty: 1,
              unit: "Nos",
              unitPrice: grandTotal - totalTax > 0 ? grandTotal - totalTax : 0,
              gstRate: 18,
            },
          ],
    subtotal,
    cgst,
    sgst,
    igst,
    totalTax,
    grandTotal,
    rawText: text,
    confidence: score,
    confidenceLabel: label,
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
  const [savedDocLabel, setSavedDocLabel] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);

  // Review form state
  const [docType, setDocType] = useState<DocType>("purchase");
  const [vendorName, setVendorName] = useState("");
  const [gstin, setGstin] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerGstin, setBuyerGstin] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [cgst, setCgst] = useState(0);
  const [sgst, setSgst] = useState(0);
  const [igst, setIgst] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [notes, setNotes] = useState("");

  const { addInvoice } = useInvoices();
  const { addPurchase } = usePurchases();
  const { parties = [] } = useParties();

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
    setSavedDocLabel(null);
    setStatusText("Loading OCR libraries...");

    try {
      let rawText: string;

      if (file.type === "application/pdf") {
        setStatusText("Loading PDF renderer...");
        setProgress(10);

        // Get total page count first to set progress correctly
        const pdfjsLib = await getPdfjsLib();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer })
          .promise;
        const totalPages = pdf.numPages;

        const allPageTexts: string[] = [];

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          setStatusText(`Rendering page ${pageNum} of ${totalPages}...`);
          const baseProgress = 10 + ((pageNum - 1) / totalPages) * 75;
          setProgress(Math.round(baseProgress));

          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 3.0 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d")!;
          await page.render({ canvasContext: ctx, viewport }).promise;

          // Grayscale + contrast enhancement
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imageData.data;
          for (let i = 0; i < d.length; i += 4) {
            const gray = Math.min(
              255,
              (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) * 1.15,
            );
            d[i] = d[i + 1] = d[i + 2] = gray;
          }
          ctx.putImageData(imageData, 0, 0);

          setStatusText(`Running OCR on page ${pageNum} of ${totalPages}...`);
          const pageText = await runOCROnCanvas(canvas, (pct, status) => {
            const overallProgress =
              baseProgress + (pct / 100) * (75 / totalPages);
            setProgress(Math.round(overallProgress));
            setStatusText(
              `Page ${pageNum}/${totalPages}: ${status || `${pct}%`}`,
            );
          });
          allPageTexts.push(pageText);
        }

        rawText = allPageTexts.join("\n\n--- PAGE BREAK ---\n\n");
      } else {
        const imageSource = URL.createObjectURL(file);
        setStatusText("Loading OCR engine...");
        setProgress(15);
        rawText = await runOCR(imageSource, (pct, status) => {
          setProgress(15 + Math.round(pct * 0.7));
          setStatusText(status || `Reading text... ${pct}%`);
        });
        URL.revokeObjectURL(imageSource);
      }

      setProgress(92);
      setStatusText("Parsing fields...");
      const parsed = parseOCRText(rawText);
      setOcrResult(parsed);

      // Populate review form
      setVendorName(parsed.vendorName);
      setGstin(parsed.gstin);
      setInvoiceNo(parsed.invoiceNo);
      setDate(parsed.date);
      setBuyerName(parsed.buyerName);
      setBuyerGstin(parsed.buyerGstin);
      setBuyerAddress(parsed.buyerAddress);
      setPlaceOfSupply(parsed.placeOfSupply);
      setLineItems(parsed.lineItems);
      setCgst(parsed.cgst);
      setSgst(parsed.sgst);
      setIgst(parsed.igst);
      setGrandTotal(parsed.grandTotal);
      setNotes("");

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
    setSavedDocLabel(null);
    setShowRawText(false);
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

  // Determine if transaction is inter-state (IGST only)
  const isInterState = igst > 0 && cgst === 0 && sgst === 0;

  const handleSave = async () => {
    if (!vendorName.trim()) {
      toast.error("Vendor/Party name is required");
      return;
    }
    setSaving(true);
    const placeOfSupplyState = INDIAN_STATES.find(
      (s) => s.code === placeOfSupply,
    );
    const placeOfSupplyName = placeOfSupplyState?.name ?? "";
    const finalGrandTotal = grandTotal || computedTotal;

    try {
      if (docType === "purchase") {
        const purchaseLineItems: InvoiceLineItem[] = lineItems.map((item) => {
          const taxRate = item.gstRate;
          const lineTotal = item.qty * item.unitPrice;
          let cgstAmt = 0;
          let sgstAmt = 0;
          let igstAmt = 0;
          if (isInterState) {
            igstAmt = (lineTotal * taxRate) / 100;
          } else {
            cgstAmt = (lineTotal * (taxRate / 2)) / 100;
            sgstAmt = (lineTotal * (taxRate / 2)) / 100;
          }
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
            igst: igstAmt,
            cessPercent: 0,
            cess: 0,
            lineTotal: lineTotal + cgstAmt + sgstAmt + igstAmt,
          };
        });
        const foundParty = gstin
          ? parties.find((p) => p.gstin === gstin)
          : null;
        addPurchase({
          billNumber: invoiceNo || `OCR-${Date.now()}`,
          billDate: date || new Date().toISOString().split("T")[0],
          dueDate: date || new Date().toISOString().split("T")[0],
          vendorId: foundParty ? String(foundParty.id) : "",
          vendorName,
          vendorGstin: gstin,
          lineItems: purchaseLineItems,
          subtotal: computedSubtotal,
          totalDiscount: 0,
          totalCgst: isInterState ? 0 : cgst,
          totalSgst: isInterState ? 0 : sgst,
          totalIgst: isInterState ? igst : 0,
          totalCess: 0,
          grandTotal: finalGrandTotal,
          isRcm: false,
          itcEligible: true,
          status: "draft",
          placeOfSupply,
          notes: notes || "Created from OCR scan",
        });
        const label = "Purchase Entry";
        setSavedDocLabel(label);
        toast.success(
          `${label} saved! Navigate to Accounting > Purchases to view.`,
        );
      } else {
        const invoiceLineItems: InvoiceLineItem[] = lineItems.map((item) => {
          const taxRate = item.gstRate;
          const lineTotal = item.qty * item.unitPrice;
          let cgstAmt = 0;
          let sgstAmt = 0;
          let igstAmt = 0;
          if (isInterState) {
            igstAmt = (lineTotal * taxRate) / 100;
          } else {
            cgstAmt = (lineTotal * (taxRate / 2)) / 100;
            sgstAmt = (lineTotal * (taxRate / 2)) / 100;
          }
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
            igst: igstAmt,
            cessPercent: 0,
            cess: 0,
            lineTotal: lineTotal + cgstAmt + sgstAmt + igstAmt,
          };
        });
        const invType: InvoiceType = docType as InvoiceType;
        const foundInvoiceParty = gstin
          ? parties.find((p) => p.gstin === gstin)
          : null;
        addInvoice({
          type: invType,
          invoiceNumber: invoiceNo || `OCR-${Date.now()}`,
          date: date || new Date().toISOString().split("T")[0],
          dueDate: date || new Date().toISOString().split("T")[0],
          partyId: foundInvoiceParty ? String(foundInvoiceParty.id) : "",
          partyName: vendorName,
          partyGstin: gstin,
          placeOfSupply,
          placeOfSupplyName,
          lineItems: invoiceLineItems,
          subtotal: computedSubtotal,
          totalDiscount: 0,
          totalCgst: isInterState ? 0 : cgst,
          totalSgst: isInterState ? 0 : sgst,
          totalIgst: isInterState ? igst : 0,
          totalCess: 0,
          grandTotal: finalGrandTotal,
          irnNumber: "",
          eWayBillNumber: "",
          notes: notes || "Created from OCR scan",
          termsConditions: "",
          status: "draft",
        });
        const label =
          DOC_TYPES.find((d) => d.value === docType)?.label ?? "Invoice";
        setSavedDocLabel(label);
        toast.success(`${label} saved! Navigate to Invoicing to view.`);
      }
      // Don't auto-clear — show "Scan Another" CTA instead
    } finally {
      setSaving(false);
    }
  };

  const confidenceColors = {
    High: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    Medium:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    Low: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
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

      {/* Upload Area — shown when no result yet */}
      {!ocrResult && !savedDocLabel && (
        <Card className="bg-card border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ScanLine className="w-5 h-5 text-primary" />
              Upload Document
            </CardTitle>
            <CardDescription>
              Supports PDF (all pages), PNG, JPG • Max 10MB
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Error message */}
            {errorMessage && (
              <div
                className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4"
                data-ocid="ocr.error_state"
              >
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-destructive mb-1">
                      OCR Failed
                    </p>
                    <p className="text-xs font-mono text-destructive/80 break-all leading-relaxed">
                      {errorMessage}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {selectedFile && (
                    <Button
                      size="sm"
                      onClick={handleRetry}
                      data-ocid="ocr.retry.button"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      Retry
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setErrorMessage(null)}
                  >
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                dragOver
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => !processing && fileInputRef.current?.click()}
              onKeyDown={(e) =>
                (e.key === "Enter" || e.key === " ") &&
                !processing &&
                fileInputRef.current?.click()
              }
              aria-label="Upload invoice document"
              data-ocid="ocr.dropzone"
            >
              {processing ? (
                <div className="space-y-4 py-2">
                  <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
                  <div>
                    <p className="text-sm font-semibold mb-1">
                      {statusText || "Processing..."}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This may take a moment for multi-page PDFs
                    </p>
                  </div>
                  <Progress value={progress} className="w-64 mx-auto h-2" />
                  <p className="text-xs font-mono text-muted-foreground">
                    {progress}%
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      Drag & drop your invoice here
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      or{" "}
                      <span className="text-primary underline cursor-pointer">
                        click to browse
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> PDF (multi-page)
                    </span>
                    <span className="flex items-center gap-1.5">
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

      {/* Post-save CTA */}
      {savedDocLabel && (
        <Card
          className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30"
          data-ocid="ocr.success_state"
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  ✓ {savedDocLabel} saved successfully
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
                  Navigate to the appropriate module to view and confirm the
                  draft.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleClear}
                className="border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                data-ocid="ocr.primary_button"
              >
                <ScanLine className="w-4 h-4 mr-2" />
                Scan Another Document
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Form */}
      {ocrResult && !savedDocLabel && (
        <div className="space-y-5" data-ocid="ocr.panel">
          {/* Header with confidence and actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <p className="text-sm font-semibold">Review Extracted Data</p>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                  confidenceColors[ocrResult.confidenceLabel]
                }`}
              >
                {ocrResult.confidenceLabel} confidence ({ocrResult.confidence}
                /100)
              </span>
              {isInterState && (
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  IGST (Inter-state)
                </span>
              )}
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

          {/* Seller / Vendor Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Seller / Vendor Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ocr-vendor">Vendor / Party Name *</Label>
                  <Input
                    id="ocr-vendor"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="Vendor / Party Name"
                    data-ocid="ocr.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ocr-gstin">Seller GSTIN</Label>
                  <Input
                    id="ocr-gstin"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="22AAAAA0000A1Z5"
                    className="font-mono uppercase"
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
                  <Label htmlFor="ocr-date">Invoice Date</Label>
                  <Input
                    id="ocr-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                {/* Place of Supply — between date and tax summary */}
                <div className="space-y-1.5">
                  <Label htmlFor="ocr-pos">Place of Supply</Label>
                  <Select
                    value={placeOfSupply}
                    onValueChange={setPlaceOfSupply}
                  >
                    <SelectTrigger id="ocr-pos" data-ocid="ocr.select">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s.code} value={s.code}>
                          {s.code} — {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Buyer / Bill To Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Buyer / Bill To Details
              </CardTitle>
              <CardDescription className="text-xs">
                Extracted from Bill To / Consignee / Customer section
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ocr-buyer-name">Buyer Name</Label>
                  <Input
                    id="ocr-buyer-name"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Buyer / Customer Name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ocr-buyer-gstin">Buyer GSTIN</Label>
                  <Input
                    id="ocr-buyer-gstin"
                    value={buyerGstin}
                    onChange={(e) => setBuyerGstin(e.target.value)}
                    placeholder="22AAAAA0000A1Z5"
                    className="font-mono uppercase"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="ocr-buyer-addr">Buyer Address</Label>
                  <Input
                    id="ocr-buyer-addr"
                    value={buyerAddress}
                    onChange={(e) => setBuyerAddress(e.target.value)}
                    placeholder="Billing address"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">
                    Line Items
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    HSN codes for goods, SAC codes (6-digit, 99xxxx) for
                    services
                  </CardDescription>
                </div>
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
                      <TableHead className="w-[12%] text-right">
                        Amount (₹)
                      </TableHead>
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
                            placeholder="HSN/SAC"
                            className="h-8 text-sm font-mono"
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
                        <TableCell className="text-right text-sm font-medium tabular-nums">
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
                    {lineItems.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-sm text-muted-foreground py-6"
                        >
                          No line items extracted — add manually
                        </TableCell>
                      </TableRow>
                    )}
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
              {isInterState && (
                <CardDescription className="text-xs text-blue-600 dark:text-blue-400">
                  Inter-state transaction detected — IGST applied, CGST/SGST =
                  ₹0
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label>Subtotal (₹)</Label>
                  <Input
                    type="number"
                    value={computedSubtotal.toFixed(2)}
                    readOnly
                    className="bg-muted/40 tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>CGST (₹)</Label>
                  <Input
                    type="number"
                    value={cgst}
                    onChange={(e) => setCgst(Number(e.target.value))}
                    min={0}
                    disabled={isInterState}
                    className={isInterState ? "opacity-50" : ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>SGST (₹)</Label>
                  <Input
                    type="number"
                    value={sgst}
                    onChange={(e) => setSgst(Number(e.target.value))}
                    min={0}
                    disabled={isInterState}
                    className={isInterState ? "opacity-50" : ""}
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
              <div className="mt-4 pt-4 border-t flex flex-wrap items-end justify-between gap-4">
                <div className="space-y-1.5">
                  <Label>Grand Total (₹)</Label>
                  <Input
                    type="number"
                    value={grandTotal || computedTotal}
                    onChange={(e) => setGrandTotal(Number(e.target.value))}
                    className="w-48 font-semibold tabular-nums"
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

          {/* Notes / Narration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Notes / Narration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes, narration, or remarks about this document..."
                rows={3}
                className="resize-none"
                data-ocid="ocr.textarea"
              />
            </CardContent>
          </Card>

          {/* Raw OCR Text — collapsible */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <button
                type="button"
                className="flex items-center justify-between w-full text-left group"
                onClick={() => setShowRawText((v) => !v)}
                aria-expanded={showRawText}
                data-ocid="ocr.toggle"
              >
                <div>
                  <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                    View Raw OCR Text
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Exactly what the OCR engine read — use to cross-check
                    extraction accuracy
                  </CardDescription>
                </div>
                {showRawText ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </CardHeader>
            {showRawText && (
              <CardContent>
                <pre
                  className="text-xs font-mono whitespace-pre-wrap break-words bg-muted/40 rounded-lg p-4 border border-border/50 overflow-y-auto leading-relaxed"
                  style={{ maxHeight: "300px" }}
                >
                  {ocrResult.rawText || "(no text extracted)"}
                </pre>
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
