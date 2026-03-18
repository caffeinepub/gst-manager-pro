import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useBankTransactions,
  useCustomAccounts,
  useInvoices,
  usePurchases,
} from "@/hooks/useGSTStore";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileUp,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
// XLSX loaded from CDN
let _xlsxLib: any = null;
async function getXLSX(): Promise<any> {
  if (_xlsxLib) return _xlsxLib;
  await new Promise<void>((resolve, reject) => {
    if ((window as any).XLSX) {
      _xlsxLib = (window as any).XLSX;
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    s.onload = () => {
      _xlsxLib = (window as any).XLSX;
      resolve();
    };
    s.onerror = () => reject(new Error("Failed to load XLSX"));
    document.head.appendChild(s);
  });
  return _xlsxLib;
}

// ─── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES: Record<
  string,
  { headers: string[]; sample: (string | number)[][] }
> = {
  parties: {
    headers: [
      "Name",
      "Type",
      "GSTIN",
      "PAN",
      "Address",
      "City",
      "State",
      "Pincode",
      "Phone",
      "Email",
      "OpeningBalance",
    ],
    sample: [
      [
        "Acme Corp",
        "customer",
        "27AABCU9603R1ZX",
        "AABCU9603R",
        "123 Main St",
        "Mumbai",
        "Maharashtra",
        "400001",
        "9876543210",
        "acme@example.com",
        0,
      ],
    ],
  },
  items: {
    headers: [
      "Name",
      "Type",
      "HSN_SAC",
      "Unit",
      "SalePrice",
      "PurchasePrice",
      "GSTRate",
      "OpeningStock",
      "ReorderLevel",
    ],
    sample: [["Widget A", "goods", "8471", "Nos", 1000, 800, 18, 100, 10]],
  },
  sales_invoices: {
    headers: [
      "InvoiceNumber",
      "Date",
      "PartyName",
      "PartyGSTIN",
      "ItemDescription",
      "HSN",
      "Qty",
      "Unit",
      "UnitPrice",
      "GSTRate",
      "Notes",
    ],
    sample: [
      [
        "INV-001",
        "2026-01-15",
        "Acme Corp",
        "27AABCU9603R1ZX",
        "Consulting Services",
        "998314",
        1,
        "Hrs",
        5000,
        18,
        "",
      ],
    ],
  },
  purchases: {
    headers: [
      "BillNumber",
      "BillDate",
      "VendorName",
      "VendorGSTIN",
      "ItemDescription",
      "HSN",
      "Qty",
      "Unit",
      "UnitPrice",
      "GSTRate",
      "IsRCM",
    ],
    sample: [
      [
        "BILL-001",
        "2026-01-10",
        "Supplier Ltd",
        "29AABCU9603R1ZX",
        "Office Supplies",
        "4820",
        10,
        "Nos",
        200,
        12,
        "No",
      ],
    ],
  },
  chart_of_accounts: {
    headers: ["Code", "Name", "Type", "ParentGroup", "OpeningBalance"],
    sample: [["6001", "Marketing Expense", "expense", "Expenses", 0]],
  },
  cashbook: {
    headers: ["Date", "Type", "Amount", "Narration", "Category"],
    sample: [
      ["2026-01-01", "receipt", 10000, "Sales cash collection", "Sales"],
      ["2026-01-02", "payment", 2000, "Office rent", "Rent"],
    ],
  },
};

const MODULES = [
  { key: "parties", label: "Parties" },
  { key: "items", label: "Items" },
  { key: "sales_invoices", label: "Sales Invoices" },
  { key: "purchases", label: "Purchases" },
  { key: "chart_of_accounts", label: "Chart of Accounts" },
  { key: "cashbook", label: "CashBook" },
] as const;

type ModuleKey = (typeof MODULES)[number]["key"];

interface ImportState {
  rows: Record<string, string>[];
  total: number;
  toImport: number;
  duplicates: number;
  errors: number;
  previewed: boolean;
  importing: boolean;
  done: boolean;
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normaliseDate(raw: string): string {
  if (!raw) return new Date().toISOString().split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmy = raw.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Excel serial date (number)
  const num = Number(raw);
  if (!Number.isNaN(num) && num > 40000) {
    const date = new Date((num - 25569) * 86400 * 1000);
    return date.toISOString().split("T")[0];
  }
  return raw;
}

function parseFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "json") {
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          resolve(Array.isArray(data) ? data : [data]);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    } else if (ext === "csv") {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) {
          resolve([]);
          return;
        }
        const headers = lines[0]
          .split(",")
          .map((h) => h.trim().replace(/^"|"$/g, ""));
        const rows = lines.slice(1).map((line) => {
          const vals = line
            .split(",")
            .map((v) => v.trim().replace(/^"|"$/g, ""));
          const obj: Record<string, string> = {};
          headers.forEach((h, i) => {
            obj[h] = vals[i] ?? "";
          });
          return obj;
        });
        resolve(rows);
      };
      reader.readAsText(file);
    } else {
      // Excel
      reader.onload = async (e) => {
        try {
          const XLSX = await getXLSX();
          const wb = XLSX.read(e.target?.result, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
          resolve(rows as Record<string, string>[]);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    }

    reader.onerror = reject;
  });
}

function downloadTemplate(moduleKey: ModuleKey) {
  const tpl = TEMPLATES[moduleKey];
  if (!tpl) return;
  // Build and download template as CSV (no XLSX dependency needed for templates)
  const rows = [tpl.headers, ...tpl.sample];
  const csv = rows.map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${moduleKey}_template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Per-module import logic ──────────────────────────────────────────────────

function useDuplicateDetectors() {
  const { invoices } = useInvoices();
  const { purchases } = usePurchases();
  const { transactions } = useBankTransactions();

  return {
    sales_invoices: (row: Record<string, string>) =>
      invoices.some(
        (inv) => inv.invoiceNumber === (row.InvoiceNumber || row.invoicenumber),
      ),
    purchases: (row: Record<string, string>) =>
      purchases.some(
        (p) => p.billNumber === (row.BillNumber || row.billnumber),
      ),
    parties: (_row: Record<string, string>) => false, // backend-managed
    items: (_row: Record<string, string>) => false, // backend-managed
    chart_of_accounts: (row: Record<string, string>) => {
      const stored = localStorage.getItem("gst_custom_accounts");
      if (!stored) return false;
      const accounts: { code: string }[] = JSON.parse(stored);
      return accounts.some((a) => a.code === (row.Code || row.code));
    },
    cashbook: (row: Record<string, string>) =>
      transactions.some(
        (t) =>
          t.date === normaliseDate(row.Date || row.date) &&
          Math.abs(t.credit - Number(row.Amount || row.amount)) < 0.01 &&
          t.description === (row.Narration || row.narration),
      ),
  };
}

function ModuleImportPanel({ moduleKey }: { moduleKey: ModuleKey }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [state, setState] = useState<ImportState>({
    rows: [],
    total: 0,
    toImport: 0,
    duplicates: 0,
    errors: 0,
    previewed: false,
    importing: false,
    done: false,
  });
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [importProgress, setImportProgress] = useState(0);

  const { addInvoice } = useInvoices();
  const { addPurchase } = usePurchases();
  const { addTransaction } = useBankTransactions();
  const { addAccount } = useCustomAccounts();
  const dupDetectors = useDuplicateDetectors();

  const handleFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "csv", "json"].includes(ext ?? "")) {
      toast.error("Please upload .xlsx, .csv, or .json files only");
      return;
    }
    try {
      const rows = await parseFile(file);
      const detector = dupDetectors[moduleKey];
      let dups = 0;
      for (const row of rows) {
        if (detector(row)) dups++;
      }
      setPreviewRows(rows.slice(0, 10));
      setState({
        rows,
        total: rows.length,
        toImport: rows.length - dups,
        duplicates: dups,
        errors: 0,
        previewed: true,
        importing: false,
        done: false,
      });
    } catch (err) {
      toast.error(
        `Failed to parse file: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleConfirm = async () => {
    setState((prev) => ({ ...prev, importing: true }));
    setImportProgress(0);
    const detector = dupDetectors[moduleKey];
    let imported = 0;
    let errors = 0;
    const total = state.rows.length;

    for (let i = 0; i < state.rows.length; i++) {
      const row = state.rows[i];
      if (detector(row)) {
        setImportProgress(Math.round(((i + 1) / total) * 100));
        continue;
      }
      try {
        await importRow(moduleKey, row, {
          addInvoice,
          addPurchase,
          addTransaction,
          addAccount,
        });
        imported++;
      } catch {
        errors++;
      }
      setImportProgress(Math.round(((i + 1) / total) * 100));
    }

    setState((prev) => ({
      ...prev,
      importing: false,
      done: true,
      toImport: imported,
      errors,
    }));
    toast.success(
      `Import complete: ${imported} records added, ${state.duplicates} duplicates skipped${
        errors > 0 ? `, ${errors} errors` : ""
      }`,
    );
  };

  const reset = () => {
    setState({
      rows: [],
      total: 0,
      toImport: 0,
      duplicates: 0,
      errors: 0,
      previewed: false,
      importing: false,
      done: false,
    });
    setPreviewRows([]);
    setImportProgress(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  const tpl = TEMPLATES[moduleKey];
  const previewHeaders =
    previewRows.length > 0 ? Object.keys(previewRows[0]) : (tpl?.headers ?? []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Download the template, fill in your data, then upload.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadTemplate(moduleKey)}
          data-ocid="import.download_button"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Download Template
        </Button>
      </div>

      {/* Upload zone */}
      {!state.previewed && (
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
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter") fileRef.current?.click();
          }}
          data-ocid="import.dropzone"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <FileUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Drop your file here</p>
              <p className="text-xs text-muted-foreground">
                Supports .xlsx, .csv, .json
              </p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.csv,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            data-ocid="import.upload_button"
          />
        </div>
      )}

      {/* Summary */}
      {state.previewed && !state.done && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Badge variant="secondary">{state.total} records found</Badge>
            <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400">
              {state.toImport} to import
            </Badge>
            {state.duplicates > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400">
                {state.duplicates} duplicates (skipped)
              </Badge>
            )}
          </div>

          {/* Preview Table */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {previewHeaders.slice(0, 7).map((h) => (
                    <TableHead key={h} className="text-xs py-2">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, idx) => (
                  <TableRow
                    // biome-ignore lint/suspicious/noArrayIndexKey: preview rows have no stable id
                    key={idx}
                    data-ocid={`import.item.${idx + 1}`}
                  >
                    {previewHeaders.slice(0, 7).map((h) => (
                      <TableCell
                        key={h}
                        className="text-xs py-2 max-w-[120px] truncate"
                      >
                        {row[h]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {state.total > 10 && (
            <p className="text-xs text-muted-foreground">
              Showing first 10 of {state.total} rows
            </p>
          )}

          {state.importing && (
            <div className="space-y-2">
              <Progress value={importProgress} />
              <p className="text-xs text-muted-foreground text-center">
                Importing... {importProgress}%
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleConfirm}
              disabled={state.importing || state.toImport === 0}
              data-ocid="import.confirm_button"
            >
              {state.importing ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-pulse" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Confirm Import ({state.toImport} records)
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={reset}
              disabled={state.importing}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Done state */}
      {state.done && (
        <div className="space-y-4" data-ocid="import.success_state">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                Import Successful
              </p>
              <p className="text-xs text-green-700 dark:text-green-400">
                {state.toImport} records imported, {state.duplicates} duplicates
                skipped
                {state.errors > 0 && `, ${state.errors} errors`}
              </p>
            </div>
          </div>
          {state.errors > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {state.errors} rows could not be imported — check the data
                format and try again.
              </p>
            </div>
          )}
          <Button variant="outline" onClick={reset}>
            Import More
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Per-row import logic ─────────────────────────────────────────────────────

type ImportHooks = {
  addInvoice: ReturnType<typeof useInvoices>["addInvoice"];
  addPurchase: ReturnType<typeof usePurchases>["addPurchase"];
  addTransaction: ReturnType<typeof useBankTransactions>["addTransaction"];
  addAccount: ReturnType<typeof useCustomAccounts>["addAccount"];
};

async function importRow(
  moduleKey: ModuleKey,
  row: Record<string, string>,
  hooks: ImportHooks,
) {
  const g = (k: string) => row[k] ?? row[k.toLowerCase()] ?? "";
  const n = (k: string) => Number(g(k)) || 0;

  const lineItem = {
    id: generateId(),
    itemId: "",
    description: g("ItemDescription") || g("Name"),
    hsnSacCode: g("HSN") || g("HSN_SAC"),
    qty: n("Qty") || 1,
    unit: g("Unit") || "Nos",
    unitPrice: n("UnitPrice"),
    discountPercent: 0,
    gstRate: n("GSTRate"),
    cgst: (n("UnitPrice") * (n("Qty") || 1) * n("GSTRate")) / 200,
    sgst: (n("UnitPrice") * (n("Qty") || 1) * n("GSTRate")) / 200,
    igst: 0,
    cessPercent: 0,
    cess: 0,
    lineTotal: n("UnitPrice") * (n("Qty") || 1) * (1 + n("GSTRate") / 100),
  };

  switch (moduleKey) {
    case "sales_invoices": {
      const subtotal = lineItem.unitPrice * lineItem.qty;
      const cgst = subtotal * (lineItem.gstRate / 200);
      const sgst = subtotal * (lineItem.gstRate / 200);
      hooks.addInvoice({
        type: "sales",
        invoiceNumber: g("InvoiceNumber"),
        date: normaliseDate(g("Date")),
        dueDate: normaliseDate(g("Date")),
        partyId: "",
        partyName: g("PartyName"),
        partyGstin: g("PartyGSTIN"),
        placeOfSupply: "",
        placeOfSupplyName: "",
        lineItems: [lineItem],
        subtotal,
        totalDiscount: 0,
        totalCgst: cgst,
        totalSgst: sgst,
        totalIgst: 0,
        totalCess: 0,
        grandTotal: subtotal + cgst + sgst,
        irnNumber: "",
        eWayBillNumber: "",
        notes: g("Notes"),
        termsConditions: "",
        status: "confirmed",
      });
      break;
    }
    case "purchases": {
      const subtotal = lineItem.unitPrice * lineItem.qty;
      const cgst = subtotal * (lineItem.gstRate / 200);
      const sgst = subtotal * (lineItem.gstRate / 200);
      hooks.addPurchase({
        billNumber: g("BillNumber"),
        billDate: normaliseDate(g("BillDate")),
        dueDate: normaliseDate(g("BillDate")),
        vendorId: "",
        vendorName: g("VendorName"),
        vendorGstin: g("VendorGSTIN"),
        lineItems: [lineItem],
        subtotal,
        totalDiscount: 0,
        totalCgst: cgst,
        totalSgst: sgst,
        totalIgst: 0,
        totalCess: 0,
        grandTotal: subtotal + cgst + sgst,
        isRcm: g("IsRCM")?.toLowerCase() === "yes",
        itcEligible: true,
        status: "confirmed",
        notes: "",
      });
      break;
    }
    case "parties": {
      // Parties are stored in the backend, write to localStorage fallback
      const stored = localStorage.getItem("gst_parties_import") ?? "[]";
      const arr = JSON.parse(stored);
      arr.push({
        id: generateId(),
        name: g("Name"),
        gstin: g("GSTIN"),
        pan: g("PAN"),
        billingAddress: [g("Address"), g("City"), g("State")]
          .filter(Boolean)
          .join(", "),
        phone: g("Phone"),
        email: g("Email"),
        partyType: g("Type") || "customer",
        isActive: true,
        stateCode: 27,
        shippingAddress: "",
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("gst_parties_import", JSON.stringify(arr));
      break;
    }
    case "items": {
      const stored = localStorage.getItem("gst_items_import") ?? "[]";
      const arr = JSON.parse(stored);
      arr.push({
        id: generateId(),
        name: g("Name"),
        itemType: g("Type") || "goods",
        hsnSacCode: g("HSN_SAC"),
        unit: g("Unit") || "Nos",
        sellingPrice: n("SalePrice"),
        purchasePrice: n("PurchasePrice"),
        gstRate: n("GSTRate"),
        cessPercent: 0,
        openingStock: n("OpeningStock"),
        isActive: true,
        description: "",
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("gst_items_import", JSON.stringify(arr));
      break;
    }
    case "chart_of_accounts": {
      hooks.addAccount({
        code: g("Code"),
        name: g("Name"),
        type:
          (g("Type") as
            | "asset"
            | "liability"
            | "equity"
            | "income"
            | "expense") || "expense",
      });
      break;
    }
    case "cashbook": {
      const amount = n("Amount");
      const type =
        g("Type")?.toLowerCase() === "payment" ? "payment" : "receipt";
      // Use the first bank account or a placeholder
      const accts = JSON.parse(
        localStorage.getItem("gst_bank_accounts") ?? "[]",
      );
      const accountId = accts[0]?.id ?? "cash";
      hooks.addTransaction({
        accountId,
        date: normaliseDate(g("Date")),
        description: g("Narration"),
        debit: type === "payment" ? amount : 0,
        credit: type === "receipt" ? amount : 0,
        balance: 0,
        reference: g("Category"),
        reconciled: false,
      });
      break;
    }
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DataImport() {
  return (
    <div className="max-w-5xl space-y-6" data-ocid="import.section">
      <div>
        <h2 className="text-lg font-semibold">Import Data</h2>
        <p className="text-sm text-muted-foreground">
          Import existing records from Excel, CSV, or JSON. Duplicates are
          detected automatically and skipped.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Select Module</CardTitle>
          <CardDescription>
            Choose the module you want to import data into, download the
            template, fill it out, then upload.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="parties">
            <TabsList className="flex-wrap h-auto gap-1 mb-6">
              {MODULES.map((m) => (
                <TabsTrigger key={m.key} value={m.key} data-ocid="import.tab">
                  {m.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {MODULES.map((m) => (
              <TabsContent key={m.key} value={m.key}>
                <ModuleImportPanel moduleKey={m.key} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
