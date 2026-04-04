import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useInvoices } from "@/hooks/useGSTStore";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { formatDate, formatINR } from "@/utils/formatting";
import { getCurrentMonth } from "@/utils/formatting";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  ShieldCheck,
  Table2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type FilingStatus = "not_filed" | "filed" | "acknowledged";
interface FilingRecord {
  status: FilingStatus;
  arn?: string;
}

function randomArn() {
  return `GST${Array.from(
    { length: 14 },
    () =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)],
  ).join("")}`;
}

export function GSTR1() {
  const { invoices } = useInvoices();
  const { start: defStart, end: defEnd } = getCurrentMonth();
  const [dateFrom, setDateFrom] = useState(defStart);
  const [dateTo, setDateTo] = useState(defEnd);

  const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [filingStatus, setFilingStatus] = useLocalStorage<
    Record<string, FilingRecord>
  >("gst_gstr1_status", {});

  const periodStatus = filingStatus[currentPeriod] ?? {
    status: "not_filed" as FilingStatus,
  };

  // Get business state code from profile for B2CS sply_ty determination
  const businessStateCode = (() => {
    try {
      const profile = JSON.parse(
        localStorage.getItem("gst_business_profile") || "{}",
      );
      return String(profile.stateCode || profile.state_code || "27").padStart(
        2,
        "0",
      );
    } catch {
      return "27";
    }
  })();

  const businessGstin = (() => {
    try {
      const profile = JSON.parse(
        localStorage.getItem("gst_business_profile") || "{}",
      );
      return profile.gstin || profile.gstNumber || "";
    } catch {
      return "";
    }
  })();

  const handleFilingAction = () => {
    if (periodStatus.status === "not_filed") {
      const arn = randomArn();
      setFilingStatus((prev) => ({
        ...prev,
        [currentPeriod]: { status: "filed", arn },
      }));
      toast.success(
        `GSTR-1 filed successfully for ${currentPeriod}. ARN: ${arn}`,
      );
    }
  };

  const handleMarkAcknowledged = () => {
    setFilingStatus((prev) => ({
      ...prev,
      [currentPeriod]: {
        ...periodStatus,
        status: "acknowledged",
      },
    }));
    toast.success("GSTR-1 marked as Acknowledged");
  };

  // ─── Invoice Classification ────────────────────────────────────────────────
  const invoicesInPeriod = invoices.filter(
    (inv) =>
      ["sales", "service"].includes(inv.type) &&
      inv.status === "confirmed" &&
      inv.date >= dateFrom &&
      inv.date <= dateTo,
  );

  // B2B: registered buyers (with GSTIN)
  const b2b = invoicesInPeriod.filter((inv) => inv.partyGstin);

  // B2CL: unregistered buyers with invoice > ₹2.5 lakh (Table 5)
  const b2cl = invoicesInPeriod.filter(
    (inv) => !inv.partyGstin?.trim() && inv.grandTotal > 250000,
  );

  // B2CS: unregistered buyers with invoice ≤ ₹2.5 lakh
  const b2cs = invoicesInPeriod.filter(
    (inv) => !inv.partyGstin?.trim() && inv.grandTotal <= 250000,
  );

  // All credit & debit notes in period
  const creditNotes = invoices.filter(
    (inv) =>
      inv.type === "credit_note" &&
      inv.status === "confirmed" &&
      inv.date >= dateFrom &&
      inv.date <= dateTo,
  );
  const debitNotes = invoices.filter(
    (inv) =>
      inv.type === "debit_note" &&
      inv.status === "confirmed" &&
      inv.date >= dateFrom &&
      inv.date <= dateTo,
  );

  // CDNR: credit/debit notes for registered buyers
  const cdnr = [...creditNotes, ...debitNotes].filter((inv) => inv.partyGstin);
  // CDNUR: credit/debit notes for unregistered buyers
  const cdnur = [...creditNotes, ...debitNotes].filter(
    (inv) => !inv.partyGstin?.trim(),
  );

  const allInvoices = useMemo(
    () => [...b2b, ...b2cl, ...b2cs],
    [b2b, b2cl, b2cs],
  );

  const summary = useMemo(() => {
    const calc = (list: typeof invoicesInPeriod) => ({
      taxable: list.reduce(
        (s, inv) => s + (inv.subtotal - inv.totalDiscount),
        0,
      ),
      cgst: list.reduce((s, inv) => s + inv.totalCgst, 0),
      sgst: list.reduce((s, inv) => s + inv.totalSgst, 0),
      igst: list.reduce((s, inv) => s + inv.totalIgst, 0),
      cess: list.reduce((s, inv) => s + inv.totalCess, 0),
    });
    return {
      b2b: calc(b2b),
      b2cl: calc(b2cl),
      b2cs: calc(b2cs),
      total: calc(invoicesInPeriod),
    };
  }, [b2b, b2cl, b2cs, invoicesInPeriod]);

  // ─── HSN summary with digit warning ──────────────────────────────────────────
  const hsnMap = useMemo(() => {
    const map = new Map<
      string,
      {
        hsn: string;
        desc: string;
        qty: number;
        taxable: number;
        igst: number;
        cgst: number;
        sgst: number;
        shortDigit: boolean;
      }
    >();
    for (const inv of allInvoices) {
      for (const li of inv.lineItems) {
        const hsn = li.hsnSacCode || "0000";
        const existing = map.get(hsn);
        const taxable = li.qty * li.unitPrice * (1 - li.discountPercent / 100);
        if (existing) {
          existing.qty += li.qty;
          existing.taxable += taxable;
          existing.igst += li.igst;
          existing.cgst += li.cgst;
          existing.sgst += li.sgst;
        } else {
          map.set(hsn, {
            hsn,
            desc: li.description || hsn,
            qty: li.qty,
            taxable,
            igst: li.igst,
            cgst: li.cgst,
            sgst: li.sgst,
            shortDigit: hsn.replace(/\D/g, "").length < 4,
          });
        }
      }
    }
    return map;
  }, [allInvoices]);

  // ─── Export helpers ───────────────────────────────────────────────────────
  const buildGSTR1JSON = () => {
    // B2B grouped by buyer GSTIN
    const b2bGrouped = b2b.reduce<Record<string, object[]>>((acc, inv) => {
      const gstin = inv.partyGstin;
      if (!acc[gstin]) acc[gstin] = [];
      acc[gstin].push({
        inum: inv.invoiceNumber,
        idt: inv.date,
        val: inv.grandTotal,
        pos: inv.placeOfSupply,
        rchrg: (inv as import("@/types/gst").Invoice).isReverseCharge
          ? "Y"
          : "N", // Rule 46(k) fix
        inv: inv.lineItems.map((li) => ({
          num: 1,
          itm_det: {
            txval: li.qty * li.unitPrice * (1 - li.discountPercent / 100),
            rt: li.gstRate,
            camt: li.cgst,
            samt: li.sgst,
            iamt: li.igst,
            csamt: li.cess,
          },
        })),
      });
      return acc;
    }, {});
    const b2bSchema = Object.entries(b2bGrouped).map(([ctin, inv]) => ({
      ctin,
      inv,
    }));

    // B2CL: large unregistered (>2.5L)
    const b2clSchema = b2cl.map((inv) => ({
      inum: inv.invoiceNumber,
      idt: inv.date,
      val: inv.grandTotal,
      pos: inv.placeOfSupply,
      inv: inv.lineItems.map((li) => ({
        num: 1,
        itm_det: {
          txval: li.qty * li.unitPrice * (1 - li.discountPercent / 100),
          rt: li.gstRate,
          iamt: li.igst,
          csamt: li.cess,
        },
      })),
    }));

    // B2CS: group by (placeOfSupply, rate, supply type)
    const b2csGrouped = b2cs.reduce<
      Record<
        string,
        {
          txval: number;
          rt: number;
          iamt: number;
          camt: number;
          samt: number;
          csamt: number;
          isIgst: boolean;
          pos: string;
        }
      >
    >((acc, inv) => {
      const isIgst = inv.totalIgst > 0;
      for (const li of inv.lineItems) {
        const rate = li.gstRate ?? 0;
        const pos = inv.placeOfSupply;
        const key = `${pos}-${rate}-${isIgst ? "I" : "C"}`;
        if (!acc[key])
          acc[key] = {
            txval: 0,
            rt: rate,
            iamt: 0,
            camt: 0,
            samt: 0,
            csamt: 0,
            isIgst,
            pos,
          };
        const taxable = li.qty * li.unitPrice * (1 - li.discountPercent / 100);
        acc[key].txval += taxable;
        acc[key].iamt += li.igst;
        acc[key].camt += li.cgst;
        acc[key].samt += li.sgst;
        acc[key].csamt += li.cess;
      }
      return acc;
    }, {});
    const b2csSchema = Object.values(b2csGrouped).map((val) => ({
      sply_ty: val.pos === businessStateCode ? "INTRA" : "INTER", // B2CS sply_ty fix
      pos: val.pos,
      typ: "OE",
      txval: val.txval,
      rt: val.rt,
      iamt: val.iamt,
      camt: val.camt,
      samt: val.samt,
      csamt: val.csamt,
    }));

    // CDNR: credit/debit notes for registered
    const cdnrMap = cdnr.reduce<Record<string, object[]>>((acc, inv) => {
      if (!acc[inv.partyGstin]) acc[inv.partyGstin] = [];
      acc[inv.partyGstin].push({
        ntNum: inv.invoiceNumber,
        ntdt: inv.date,
        ntty: inv.type === "credit_note" ? "C" : "D",
        rsn: inv.creditDebitReason || "01",
        val: inv.grandTotal,
        nt: inv.lineItems.map((li) => ({
          num: 1,
          itm_det: {
            txval: li.qty * li.unitPrice * (1 - li.discountPercent / 100),
            rt: li.gstRate,
            camt: li.cgst,
            samt: li.sgst,
            iamt: li.igst,
            csamt: li.cess,
          },
        })),
      });
      return acc;
    }, {});

    // CDNUR: credit/debit notes for unregistered
    const cdnurSchema = cdnur.map((inv) => ({
      ntNum: inv.invoiceNumber,
      ntdt: inv.date,
      ntty: inv.type === "credit_note" ? "C" : "D",
      val: inv.grandTotal,
      nt: inv.lineItems.map((li) => ({
        num: 1,
        itm_det: {
          txval: li.qty * li.unitPrice * (1 - li.discountPercent / 100),
          rt: li.gstRate,
          iamt: li.igst,
          csamt: li.cess,
        },
      })),
    }));

    const [year, month] = dateFrom.split("-");
    return {
      version: "GST3.0.4",
      hash: "hash",
      gstin: businessGstin,
      fp: `${month}${year}`,
      gt: allInvoices.reduce((s, i) => s + i.grandTotal, 0),
      cur_gt: allInvoices.reduce((s, i) => s + i.grandTotal, 0),
      b2b: b2bSchema,
      b2cl: b2clSchema,
      b2cs: b2csSchema,
      hsn: { data: Array.from(hsnMap.values()) },
      cdnr: Object.entries(cdnrMap).map(([ctin, nt]) => ({ ctin, nt })),
      cdnur: cdnurSchema,
    };
  };

  return (
    <div className="space-y-4" data-ocid="gstr1.section">
      {/* Filing Status Banner */}
      <Card className="bg-card border-border/70">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                Filing Status ({currentPeriod}):
              </span>
              {periodStatus.status === "not_filed" && (
                <Badge variant="destructive" data-ocid="gstr1.status.badge">
                  Not Filed
                </Badge>
              )}
              {periodStatus.status === "filed" && (
                <Badge variant="default" data-ocid="gstr1.status.badge">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Filed
                </Badge>
              )}
              {periodStatus.status === "acknowledged" && (
                <Badge variant="secondary" data-ocid="gstr1.status.badge">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Acknowledged
                </Badge>
              )}
              {periodStatus.arn && (
                <span className="text-xs font-mono text-muted-foreground">
                  ARN: {periodStatus.arn}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {periodStatus.status === "not_filed" && (
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-xs text-amber-600 border-amber-400"
                  >
                    Demo
                  </Badge>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          onClick={handleFilingAction}
                          data-ocid="gstr1.file.primary_button"
                          className="gap-2"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          File GSTR-1
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        className="max-w-xs text-xs"
                      >
                        This is a simulation. Real filing requires GSTN API
                        credentials in Settings &gt; API Config.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
              {periodStatus.status === "filed" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleMarkAcknowledged}
                  data-ocid="gstr1.acknowledge.secondary_button"
                  className="gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Mark Acknowledged
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters & Export */}
      <Card className="bg-card border-border/70">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
                data-ocid="gstr1.from.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
                data-ocid="gstr1.to.input"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const exportData = buildGSTR1JSON();
                const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `GSTR1_${dateFrom}_${dateTo}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              data-ocid="gstr1.export.button"
              className="gap-2"
            >
              <Download className="w-4 h-4" /> Export JSON
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const allRecs = [
                  ...b2b,
                  ...b2cl,
                  ...b2cs,
                  ...creditNotes,
                  ...debitNotes,
                ];
                const header = [
                  "Invoice #",
                  "Date",
                  "Party",
                  "GSTIN",
                  "Place of Supply",
                  "Taxable",
                  "CGST",
                  "SGST",
                  "IGST",
                  "Cess",
                  "Grand Total",
                  "Type",
                ].join(",");
                const rows = allRecs.map((inv) =>
                  [
                    inv.invoiceNumber,
                    inv.date,
                    `"${inv.partyName}"`,
                    inv.partyGstin || "",
                    `"${inv.placeOfSupplyName}"`,
                    (inv.subtotal - inv.totalDiscount).toFixed(2),
                    inv.totalCgst.toFixed(2),
                    inv.totalSgst.toFixed(2),
                    inv.totalIgst.toFixed(2),
                    inv.totalCess.toFixed(2),
                    inv.grandTotal.toFixed(2),
                    inv.type,
                  ].join(","),
                );
                const csv = [header, ...rows].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `GSTR1_${dateFrom}_${dateTo}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              data-ocid="gstr1.export_csv.button"
              className="gap-2"
            >
              <Table2 className="w-4 h-4" /> Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const w = window as typeof window & {
                    XLSX?: {
                      utils: {
                        json_to_sheet: (d: object[]) => object;
                        book_new: () => object;
                        book_append_sheet: (
                          wb: object,
                          ws: object,
                          name: string,
                        ) => void;
                      };
                      writeFile: (wb: object, name: string) => void;
                    };
                  };
                  if (!w.XLSX) {
                    await new Promise<void>((resolve, reject) => {
                      const s = document.createElement("script");
                      s.src =
                        "https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js";
                      s.onload = () => resolve();
                      s.onerror = () =>
                        reject(new Error("Failed to load XLSX"));
                      document.head.appendChild(s);
                    });
                  }
                  const XLSX = w.XLSX;
                  if (!XLSX) {
                    toast.error("Failed to load Excel library");
                    return;
                  }
                  const b2bData = b2b.map((inv) => ({
                    "Invoice #": inv.invoiceNumber,
                    Date: inv.date,
                    Party: inv.partyName,
                    GSTIN: inv.partyGstin,
                    "Place of Supply": inv.placeOfSupplyName,
                    Taxable: inv.subtotal - inv.totalDiscount,
                    CGST: inv.totalCgst,
                    SGST: inv.totalSgst,
                    IGST: inv.totalIgst,
                    "Grand Total": inv.grandTotal,
                    "Reverse Charge": (inv as import("@/types/gst").Invoice)
                      .isReverseCharge
                      ? "Y"
                      : "N",
                  }));
                  const b2clData = b2cl.map((inv) => ({
                    "Invoice #": inv.invoiceNumber,
                    Date: inv.date,
                    Party: inv.partyName,
                    "Place of Supply": inv.placeOfSupplyName,
                    Taxable: inv.subtotal - inv.totalDiscount,
                    IGST: inv.totalIgst,
                    Cess: inv.totalCess,
                    "Grand Total": inv.grandTotal,
                  }));
                  const b2csData = b2cs.map((inv) => ({
                    "Invoice #": inv.invoiceNumber,
                    Date: inv.date,
                    Party: inv.partyName,
                    "Place of Supply": inv.placeOfSupplyName,
                    Taxable: inv.subtotal - inv.totalDiscount,
                    CGST: inv.totalCgst,
                    SGST: inv.totalSgst,
                    IGST: inv.totalIgst,
                    "Grand Total": inv.grandTotal,
                  }));
                  const cdnrData = cdnr.map((inv) => ({
                    "Note #": inv.invoiceNumber,
                    Date: inv.date,
                    Type: inv.type,
                    Party: inv.partyName,
                    GSTIN: inv.partyGstin,
                    Taxable: inv.subtotal - inv.totalDiscount,
                    CGST: inv.totalCgst,
                    SGST: inv.totalSgst,
                    IGST: inv.totalIgst,
                  }));
                  const cdnurData = cdnur.map((inv) => ({
                    "Note #": inv.invoiceNumber,
                    Date: inv.date,
                    Type: inv.type,
                    Party: inv.partyName,
                    Taxable: inv.subtotal - inv.totalDiscount,
                    IGST: inv.totalIgst,
                  }));
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(
                    wb,
                    XLSX.utils.json_to_sheet(b2bData),
                    "B2B",
                  );
                  XLSX.utils.book_append_sheet(
                    wb,
                    XLSX.utils.json_to_sheet(b2clData),
                    "B2CL",
                  );
                  XLSX.utils.book_append_sheet(
                    wb,
                    XLSX.utils.json_to_sheet(b2csData),
                    "B2CS",
                  );
                  XLSX.utils.book_append_sheet(
                    wb,
                    XLSX.utils.json_to_sheet(cdnrData),
                    "CDNR",
                  );
                  XLSX.utils.book_append_sheet(
                    wb,
                    XLSX.utils.json_to_sheet(cdnurData),
                    "CDNUR",
                  );
                  XLSX.writeFile(wb, `GSTR1_${dateFrom}_${dateTo}.xlsx`);
                } catch {
                  toast.error("Excel export failed");
                }
              }}
              data-ocid="gstr1.export_excel.button"
              className="gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "B2B Invoices",
            count: b2b.length,
            taxable: summary.b2b.taxable,
          },
          {
            label: "B2CL (>\u20b92.5L)",
            count: b2cl.length,
            taxable: summary.b2cl.taxable,
          },
          {
            label: "B2CS (₹2.5L)",
            count: b2cs.length,
            taxable: summary.b2cs.taxable,
          },
          {
            label: "Total GST",
            count: invoicesInPeriod.length,
            taxable:
              summary.total.cgst + summary.total.sgst + summary.total.igst,
          },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border/70">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-cabinet font-bold text-primary font-numeric">
                {formatINR(s.taxable)}
              </p>
              <p className="text-xs text-muted-foreground">{s.count} records</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tables */}
      <Tabs defaultValue="b2b" data-ocid="gstr1.tab">
        <TabsList>
          <TabsTrigger value="b2b" data-ocid="gstr1.b2b.tab">
            B2B ({b2b.length})
          </TabsTrigger>
          <TabsTrigger value="b2cl" data-ocid="gstr1.b2cl.tab">
            B2CL ({b2cl.length})
          </TabsTrigger>
          <TabsTrigger value="b2cs" data-ocid="gstr1.b2cs.tab">
            B2CS ({b2cs.length})
          </TabsTrigger>
          <TabsTrigger value="cdnr" data-ocid="gstr1.cdnr.tab">
            CDNR ({cdnr.length})
          </TabsTrigger>
          <TabsTrigger value="cdnur" data-ocid="gstr1.cdnur.tab">
            CDNUR ({cdnur.length})
          </TabsTrigger>
          <TabsTrigger value="hsn" data-ocid="gstr1.hsn.tab">
            HSN Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="b2b">
          <Card className="bg-card border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                B2B Invoices (Registered Buyers)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <GSTTable invoices={b2b} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="b2cl">
          <Card className="bg-card border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                B2CL — Unregistered Buyers (Invoice &gt; ₹2,50,000)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {b2cl.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No B2CL invoices in this period
                </div>
              ) : (
                <GSTTable invoices={b2cl} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="b2cs">
          <Card className="bg-card border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                B2CS — Unregistered Buyers (Invoice ≤ ₹2,50,000)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <GSTTable invoices={b2cs} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cdnr">
          <Card className="bg-card border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                CDNR — Credit/Debit Notes (Registered Buyers)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <GSTTable invoices={cdnr} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cdnur">
          <Card className="bg-card border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                CDNUR — Credit/Debit Notes (Unregistered Buyers)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <GSTTable invoices={cdnur} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hsn">
          <Card className="bg-card border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">HSN/SAC Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {hsnMap.size === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No HSN data
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">HSN/SAC</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Taxable</TableHead>
                        <TableHead className="text-right">CGST</TableHead>
                        <TableHead className="text-right">SGST</TableHead>
                        <TableHead className="text-right">IGST</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from(hsnMap.values()).map((row, idx) => (
                        <TableRow
                          key={row.hsn}
                          data-ocid={`gstr1.hsn.item.${idx + 1}`}
                        >
                          <TableCell className="pl-4 font-mono text-sm">
                            <div className="flex items-center gap-1">
                              {row.hsn}
                              {row.shortDigit && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="text-xs max-w-xs">
                                      Minimum 4-digit HSN required (Notification
                                      78/2020-CT). Please update this HSN code.
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">
                            {row.desc}
                          </TableCell>
                          <TableCell className="text-right font-numeric text-sm">
                            {row.qty}
                          </TableCell>
                          <TableCell className="text-right font-numeric text-sm">
                            {formatINR(row.taxable)}
                          </TableCell>
                          <TableCell className="text-right font-numeric text-sm">
                            {formatINR(row.cgst)}
                          </TableCell>
                          <TableCell className="text-right font-numeric text-sm">
                            {formatINR(row.sgst)}
                          </TableCell>
                          <TableCell className="text-right font-numeric text-sm">
                            {formatINR(row.igst)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tax Summary Row */}
      <Card className="bg-card border-border/70">
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Taxable Value</p>
              <p className="font-numeric font-bold">
                {formatINR(summary.total.taxable)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">CGST</p>
              <p className="font-numeric font-bold text-primary">
                {formatINR(summary.total.cgst)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">SGST</p>
              <p className="font-numeric font-bold text-primary">
                {formatINR(summary.total.sgst)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">IGST</p>
              <p className="font-numeric font-bold text-chart-2">
                {formatINR(summary.total.igst)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Cess</p>
              <p className="font-numeric font-bold">
                {formatINR(summary.total.cess)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GSTTable({
  invoices,
}: {
  invoices: {
    id: string;
    invoiceNumber: string;
    date: string;
    partyName: string;
    partyGstin: string;
    placeOfSupplyName: string;
    subtotal: number;
    totalDiscount: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    totalCess: number;
    grandTotal: number;
    status: string;
    type: string;
  }[];
}) {
  if (invoices.length === 0) {
    return (
      <div
        className="p-8 text-center text-sm text-muted-foreground"
        data-ocid="gstr1.empty_state"
      >
        No records found
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <Table data-ocid="gstr1.list.table">
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Invoice #</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Party</TableHead>
            <TableHead>GSTIN</TableHead>
            <TableHead>Place of Supply</TableHead>
            <TableHead className="text-right">Taxable</TableHead>
            <TableHead className="text-right">CGST</TableHead>
            <TableHead className="text-right">SGST</TableHead>
            <TableHead className="text-right">IGST</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv, idx) => (
            <TableRow key={inv.id} data-ocid={`gstr1.item.${idx + 1}`}>
              <TableCell className="pl-4 font-mono text-xs text-primary">
                {inv.invoiceNumber}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatDate(inv.date)}
              </TableCell>
              <TableCell className="text-sm">{inv.partyName}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {inv.partyGstin || "-"}
              </TableCell>
              <TableCell className="text-xs">{inv.placeOfSupplyName}</TableCell>
              <TableCell className="text-right font-numeric text-sm">
                {formatINR(inv.subtotal - inv.totalDiscount)}
              </TableCell>
              <TableCell className="text-right font-numeric text-sm">
                {formatINR(inv.totalCgst)}
              </TableCell>
              <TableCell className="text-right font-numeric text-sm">
                {formatINR(inv.totalSgst)}
              </TableCell>
              <TableCell className="text-right font-numeric text-sm">
                {formatINR(inv.totalIgst)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
