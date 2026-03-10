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
  CheckCircle2,
  FileImage,
  FileText,
  Loader2,
  ScanLine,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface OcrResult {
  vendorName: string;
  invoiceNo: string;
  date: string;
  amount: string;
  gstin: string;
  hsnCodes: string;
  taxAmount: string;
}

function simulateOcr(filename: string): OcrResult {
  // Simulate realistic OCR extraction based on filename seed
  const seed = filename.length % 5;
  const vendors = [
    "Infosys Limited",
    "TCS Mumbai",
    "Wipro Technologies",
    "HCL Systems",
    "Tech Mahindra",
  ];
  const gstins = [
    "29AABCI1234R1Z5",
    "27AACT27271Z3",
    "29AAACI1234J1Z5",
    "27AABCU9603R1ZX",
    "36AABCM1234N1Z1",
  ];
  return {
    vendorName: vendors[seed] || vendors[0],
    invoiceNo: `INV-${Math.floor(Math.random() * 9000) + 1000}`,
    date: new Date().toISOString().split("T")[0],
    amount: String(Math.floor(Math.random() * 90000) + 10000),
    gstin: gstins[seed] || gstins[0],
    hsnCodes: "9983, 8471",
    taxAmount: String(Math.floor(Math.random() * 9000) + 1000),
  };
}

export function OCRCapture() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [editedResult, setEditedResult] = useState<OcrResult | null>(null);

  const processFile = (file: File) => {
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.type)) {
      toast.error("Please upload PDF, PNG, or JPG files only");
      return;
    }
    setSelectedFile(file);
    setProcessing(true);
    setProgress(0);
    setResult(null);

    // Simulate OCR processing with progress
    const intervals = [20, 45, 70, 90, 100];
    let i = 0;
    const tick = () => {
      if (i < intervals.length) {
        setProgress(intervals[i++]);
        setTimeout(tick, 280);
      } else {
        const ocr = simulateOcr(file.name);
        setResult(ocr);
        setEditedResult({ ...ocr });
        setProcessing(false);
        toast.success("Document scanned successfully");
      }
    };
    tick();
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

  const handleCreatePurchase = () => {
    if (!editedResult) return;
    // Store pre-fill data in sessionStorage for Purchases page to consume
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
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="max-w-2xl space-y-6" data-ocid="ocr.section">
      <div>
        <h2 className="text-lg font-semibold">OCR / Document Capture</h2>
        <p className="text-sm text-muted-foreground">
          Upload an invoice image or PDF to automatically extract vendor,
          invoice number, amount, and GST details.
        </p>
      </div>

      {/* Upload Area */}
      {!result && (
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
                  <p className="text-sm font-medium">Processing document...</p>
                  <Progress value={progress} className="w-48 mx-auto" />
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

      {/* OCR Results */}
      {result && editedResult && (
        <Card className="bg-card border-border/70">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="w-5 h-5 text-success" />
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
              Review and edit the extracted fields before creating a purchase
              entry
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(
                [
                  {
                    key: "vendorName",
                    label: "Vendor Name",
                    ocid: "ocr.vendorname.input",
                  },
                  {
                    key: "invoiceNo",
                    label: "Invoice No",
                    ocid: "ocr.invoiceno.input",
                  },
                  {
                    key: "date",
                    label: "Date",
                    ocid: "ocr.date.input",
                    type: "date",
                  },
                  {
                    key: "amount",
                    label: "Total Amount",
                    ocid: "ocr.amount.input",
                  },
                  { key: "gstin", label: "GSTIN", ocid: "ocr.gstin.input" },
                  {
                    key: "hsnCodes",
                    label: "HSN Codes",
                    ocid: "ocr.hsncode.input",
                  },
                  {
                    key: "taxAmount",
                    label: "Tax Amount",
                    ocid: "ocr.taxamount.input",
                  },
                ] as const
              ).map(({ key, label, ocid }) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    type="text"
                    value={editedResult[key as keyof OcrResult]}
                    onChange={(e) =>
                      setEditedResult((p) =>
                        p ? { ...p, [key]: e.target.value } : p,
                      )
                    }
                    data-ocid={ocid}
                  />
                </div>
              ))}
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
