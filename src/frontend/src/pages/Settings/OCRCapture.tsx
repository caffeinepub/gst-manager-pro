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
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  CheckCircle2,
  FileImage,
  FileText,
  Loader2,
  RefreshCw,
  ScanLine,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface OcrField {
  value: string;
  confidence: number; // 0-100
}

interface OcrResult {
  vendorName: OcrField;
  invoiceNo: OcrField;
  date: OcrField;
  amount: OcrField;
  gstin: OcrField;
  hsnCodes: OcrField;
  taxAmount: OcrField;
}

interface EditableResult {
  vendorName: string;
  invoiceNo: string;
  date: string;
  amount: string;
  gstin: string;
  hsnCodes: string;
  taxAmount: string;
}

// ─── Text parsers ────────────────────────────────────────────────────────────

function parseGSTIN(text: string): OcrField {
  const match = text.match(
    /\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b/i,
  );
  return match
    ? { value: match[1].toUpperCase(), confidence: 92 }
    : { value: "", confidence: 0 };
}

function parseInvoiceNo(text: string): OcrField {
  const patterns = [
    /(?:invoice\s*(?:no\.?|number|#)|inv\s*(?:no\.?|#)|bill\s*(?:no\.?|number|#)|tax\s*invoice\s*(?:no\.?|#))\s*[:\-]?\s*([A-Z0-9\-\/]+)/i,
    /(?:^|\s)((?:[A-Z]{2,}-)?\d{4,}(?:\/\d+)?)(?:\s|$)/m,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return { value: m[1].trim(), confidence: 80 };
  }
  return { value: "", confidence: 0 };
}

function parseDate(text: string): OcrField {
  const dmy = text.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    return { value: iso, confidence: 88 };
  }
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return { value: iso[0], confidence: 88 };
  return { value: new Date().toISOString().split("T")[0], confidence: 30 };
}

function parseAmount(text: string): OcrField {
  const patterns = [
    /(?:grand\s*total|total\s*amount|net\s*payable|amount\s*payable|total\s*due|total\s*invoice)[\s:\-]*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const val = m[1].replace(/,/g, "");
      return { value: val, confidence: 75 };
    }
  }
  const numbers = [...text.matchAll(/[\d,]{4,}(?:\.\d{1,2})?/g)]
    .map((x) => Number.parseFloat(x[0].replace(/,/g, "")))
    .filter((n) => n > 0);
  if (numbers.length) {
    const max = Math.max(...numbers);
    return { value: String(max), confidence: 40 };
  }
  return { value: "", confidence: 0 };
}

function parseTaxAmount(text: string): OcrField {
  const patterns = [
    /(?:total\s*(?:gst|tax)|cgst\s*\+\s*sgst|igst|total\s*cgst|total\s*sgst)[\s:\-]*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:cgst|sgst|igst)[\s:\-]*(?:@\d+%)?[\s:\-]*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return { value: m[1].replace(/,/g, ""), confidence: 72 };
  }
  return { value: "", confidence: 0 };
}

function parseHSN(text: string): OcrField {
  const hsnMatches = [
    ...text.matchAll(/(?:hsn|sac|hsn\/sac)[\s:\.\-]*([0-9]{4,8})/gi),
  ];
  const codes = [...new Set(hsnMatches.map((m) => m[1]))];
  if (codes.length) return { value: codes.join(", "), confidence: 85 };
  const standalone = [...text.matchAll(/\b([0-9]{4,8})\b/g)]
    .map((x) => x[1])
    .filter((n) => !/^(20\d{2}|19\d{2})$/.test(n))
    .slice(0, 3);
  if (standalone.length)
    return { value: standalone.join(", "), confidence: 40 };
  return { value: "", confidence: 0 };
}

function parseVendorName(text: string): OcrField {
  const labeled = text.match(
    /(?:from|supplier|seller|vendor|billed\s*by|sold\s*by)[\s:\-]+([A-Z][A-Za-z0-9\s\.&,'-]{3,60}?)(?:\n|\r|,|GSTIN|GST)/i,
  );
  if (labeled?.[1]) return { value: labeled[1].trim(), confidence: 78 };

  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines.slice(0, 8)) {
    if (
      line.length >= 3 &&
      line.length <= 80 &&
      /[A-Z]/.test(line) &&
      !/^(invoice|bill|tax|gst|date|no\.|from|to)/i.test(line)
    ) {
      return { value: line, confidence: 55 };
    }
  }
  return { value: "", confidence: 0 };
}

function parseText(rawText: string): OcrResult {
  return {
    vendorName: parseVendorName(rawText),
    invoiceNo: parseInvoiceNo(rawText),
    date: parseDate(rawText),
    amount: parseAmount(rawText),
    gstin: parseGSTIN(rawText),
    hsnCodes: parseHSN(rawText),
    taxAmount: parseTaxAmount(rawText),
  };
}

// ─── CDN dynamic loaders ─────────────────────────────────────────────────────

const PDFJS_VERSION = "3.11.174";
const TESSERACT_VERSION = "5.0.4";

// biome-ignore lint/suspicious/noExplicitAny: CDN module cache
let _pdfjsLib: any = null;

// biome-ignore lint/suspicious/noExplicitAny: CDN module cache
let _tesseract: any = null;

// Load PDF.js via script tag (UMD build exposes window.pdfjsLib)
// biome-ignore lint/suspicious/noExplicitAny: CDN global
async function getPdfjsLib(): Promise<any> {
  if (_pdfjsLib) return _pdfjsLib;
  try {
    await loadScript(
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`,
    );
    // biome-ignore lint/suspicious/noExplicitAny: CDN global
    const lib = (window as any).pdfjsLib;
    if (!lib) throw new Error("pdfjsLib not found on window after script load");
    lib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
    _pdfjsLib = lib;
    return lib;
  } catch {
    throw new Error(
      `Failed to load PDF.js ${PDFJS_VERSION} from CDN. Check your network connection.`,
    );
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(s);
  });
}

async function getTesseract(): Promise<{
  createWorker: (
    lang: string,
    oem?: number,
    options?: Record<string, string>,
  ) => Promise<{
    recognize: (
      src: HTMLCanvasElement | string,
    ) => Promise<{ data: { text: string } }>;
    terminate: () => Promise<void>;
  }>;
}> {
  if (_tesseract) return _tesseract;
  await loadScript(
    `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/tesseract.min.js`,
  );
  // biome-ignore lint/suspicious/noExplicitAny: CDN global
  const lib = (window as any).Tesseract;
  if (!lib)
    throw new Error(
      `Tesseract.js ${TESSERACT_VERSION} failed to load from CDN`,
    );
  _tesseract = lib;
  return lib;
}

// ─── PDF → canvas ─────────────────────────────────────────────────────────────

async function pdfToCanvas(
  file: File,
  onProgress?: (page: number, total: number) => void,
): Promise<HTMLCanvasElement> {
  const pdfjsLib = await getPdfjsLib();

  const arrayBuffer = await file.arrayBuffer();
  // biome-ignore lint/suspicious/noExplicitAny: pdfjs-dist CDN types
  const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer })
    .promise;
  const totalPages = pdf.numPages;

  const pageNum = 1;
  onProgress?.(pageNum, totalPages);

  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 2.5 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport }).promise;

  // Grayscale pre-processing for better OCR accuracy
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OCRCapture() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [editedResult, setEditedResult] = useState<EditableResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const processFile = async (file: File) => {
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.type)) {
      toast.error("Please upload PDF, PNG, or JPG files only");
      return;
    }
    setSelectedFile(file);
    setProcessing(true);
    setProgress(5);
    setResult(null);
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
        // For images, convert File to object URL
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

      let pollInterval: ReturnType<typeof setInterval> | null = null;
      let fakeProgress = 35;
      pollInterval = setInterval(() => {
        fakeProgress = Math.min(fakeProgress + 3, 90);
        setProgress(fakeProgress);
        setStatusText(`Reading text... ${fakeProgress}%`);
      }, 400);

      const { data } = await worker.recognize(imageSource);

      if (pollInterval) clearInterval(pollInterval);
      await worker.terminate();

      // Clean up object URL if we created one
      if (typeof imageSource === "string") URL.revokeObjectURL(imageSource);

      setProgress(97);
      setStatusText("Parsing fields...");
      const parsed = parseText(data.text);
      setResult(parsed);
      setEditedResult({
        vendorName: parsed.vendorName.value,
        invoiceNo: parsed.invoiceNo.value,
        date: parsed.date.value,
        amount: parsed.amount.value,
        gstin: parsed.gstin.value,
        hsnCodes: parsed.hsnCodes.value,
        taxAmount: parsed.taxAmount.value,
      });
      setProgress(100);
      setProcessing(false);
      toast.success("Document scanned successfully");
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
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const handleCreatePurchase = () => {
    if (!editedResult) return;
    sessionStorage.setItem(
      "ocr_prefill",
      JSON.stringify({
        vendorName: editedResult.vendorName,
        billNumber: editedResult.invoiceNo,
        billDate: editedResult.date,
        grandTotal: Number(editedResult.amount),
        vendorGstin: editedResult.gstin,
      }),
    );
    toast.success(
      "OCR data ready — go to Accounting > Purchases to create the entry",
    );
  };

  const handleClear = () => {
    setSelectedFile(null);
    setResult(null);
    setEditedResult(null);
    setErrorMessage(null);
    setProgress(0);
    setStatusText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const confidenceColor = (c: number) =>
    c >= 75 ? "text-green-600" : c >= 50 ? "text-amber-500" : "text-red-500";

  const fields: {
    key: keyof EditableResult;
    label: string;
    ocid: string;
    resultKey: keyof OcrResult;
  }[] = [
    {
      key: "vendorName",
      label: "Vendor Name",
      ocid: "ocr.vendorname.input",
      resultKey: "vendorName",
    },
    {
      key: "invoiceNo",
      label: "Invoice No",
      ocid: "ocr.invoiceno.input",
      resultKey: "invoiceNo",
    },
    { key: "date", label: "Date", ocid: "ocr.date.input", resultKey: "date" },
    {
      key: "amount",
      label: "Total Amount (₹)",
      ocid: "ocr.amount.input",
      resultKey: "amount",
    },
    {
      key: "gstin",
      label: "GSTIN",
      ocid: "ocr.gstin.input",
      resultKey: "gstin",
    },
    {
      key: "hsnCodes",
      label: "HSN / SAC Codes",
      ocid: "ocr.hsncode.input",
      resultKey: "hsnCodes",
    },
    {
      key: "taxAmount",
      label: "Tax Amount (₹)",
      ocid: "ocr.taxamount.input",
      resultKey: "taxAmount",
    },
  ];

  return (
    <div className="max-w-2xl space-y-6" data-ocid="ocr.section">
      <div>
        <h2 className="text-lg font-semibold">OCR / Document Capture</h2>
        <p className="text-sm text-muted-foreground">
          Upload an invoice image or PDF to automatically extract vendor,
          invoice number, amount, and GST details. All fields can be edited
          before saving.
        </p>
      </div>

      {/* Upload Area */}
      {!result && !errorMessage && (
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
                      <FileImage className="w-3.5 h-3.5" /> PNG
                    </span>
                    <span className="flex items-center gap-1">
                      <FileImage className="w-3.5 h-3.5" /> JPG
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
      {errorMessage && !result && (
        <Card
          className="bg-card border-destructive/40"
          data-ocid="ocr.error_state"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <XCircle className="w-5 h-5" />
              OCR Failed
            </CardTitle>
            <CardDescription>
              The document could not be processed. See the error details below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-mono text-destructive break-all">
                {errorMessage}
              </p>
            </div>

            {selectedFile && (
              <p className="text-xs text-muted-foreground">
                File: <span className="font-medium">{selectedFile.name}</span>
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              {selectedFile && (
                <Button onClick={handleRetry} data-ocid="ocr.retry.button">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleClear}
                data-ocid="ocr.scan_another.button"
              >
                <ScanLine className="w-4 h-4 mr-2" />
                Try Another File
              </Button>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">
                Tips for better results:
              </p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Use high-resolution scans (300 DPI or higher)</li>
                <li>Digital/native PDFs work better than scanned images</li>
                <li>Ensure the document is not password-protected</li>
                <li>Try converting images to PNG before uploading</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* OCR Results */}
      {result && editedResult && (
        <Card className="bg-card border-border/70">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Extracted Data
                {selectedFile && (
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    from {selectedFile.name}
                  </span>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="text-muted-foreground hover:text-foreground"
                data-ocid="ocr.close_button"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <CardDescription>
              Review and correct the extracted fields. Confidence indicators
              show how reliable each extraction is.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map(({ key, label, ocid, resultKey }) => {
                const conf = result[resultKey].confidence;
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={key}>{label}</Label>
                      {conf > 0 && (
                        <span
                          className={`text-xs flex items-center gap-0.5 ${confidenceColor(conf)}`}
                        >
                          {conf < 70 && <AlertTriangle className="w-3 h-3" />}
                          {conf}% confidence
                        </span>
                      )}
                    </div>
                    <Input
                      id={key}
                      type={key === "date" ? "date" : "text"}
                      value={editedResult[key]}
                      onChange={(e) =>
                        setEditedResult((p) =>
                          p ? { ...p, [key]: e.target.value } : p,
                        )
                      }
                      className={
                        conf < 50 && conf > 0
                          ? "border-amber-400 focus-visible:ring-amber-400"
                          : ""
                      }
                      data-ocid={ocid}
                    />
                  </div>
                );
              })}
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handleClear}
                data-ocid="ocr.scan_another.button"
              >
                <ScanLine className="w-4 h-4 mr-2" />
                Scan Another
              </Button>
              <Button
                onClick={handleCreatePurchase}
                data-ocid="ocr.create_purchase.button"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Create Purchase Entry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
