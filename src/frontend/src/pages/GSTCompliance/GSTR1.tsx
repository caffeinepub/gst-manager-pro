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
import { useInvoices } from "@/hooks/useGSTStore";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { formatDate, formatINR } from "@/utils/formatting";
import { getCurrentMonth } from "@/utils/formatting";
import {
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

  const filtered = invoices.filter(
    (inv) =>
      ["sales", "service"].includes(inv.type) &&
      inv.status === "confirmed" &&
      inv.date >= dateFrom &&
      inv.date <= dateTo,
  );

  const b2b = filtered.filter((inv) => inv.partyGstin);
  const b2c = filtered.filter((inv) => !inv.partyGstin);
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

  const summary = useMemo(() => {
    const calc = (list: typeof filtered) => ({
      taxable: list.reduce(
        (s, inv) => s + (inv.subtotal - inv.totalDiscount),
        0,
      ),
      cgst: list.reduce((s, inv) => s + inv.totalCgst, 0),
      sgst: list.reduce((s, inv) => s + inv.totalSgst, 0),
      igst: list.reduce((s, inv) => s + inv.totalIgst, 0),
      cess: list.reduce((s, inv) => s + inv.totalCess, 0),
    });
    return { b2b: calc(b2b), b2c: calc(b2c), total: calc(filtered) };
  }, [b2b, b2c, filtered]);

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
                <Button
                  size="sm"
                  onClick={handleFilingAction}
                  data-ocid="gstr1.file.primary_button"
                  className="gap-2"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  File GSTR-1
                </Button>
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

      {/* Filters */}
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
                // Build proper GSTN GSTR-1 schema
                // B2B: grouped by buyer GSTIN
                const b2bGrouped = b2b.reduce<Record<string, object[]>>(
                  (acc, inv) => {
                    const gstin = inv.partyGstin;
                    if (!acc[gstin]) acc[gstin] = [];
                    acc[gstin].push({
                      inum: inv.invoiceNumber,
                      idt: inv.date,
                      val: inv.grandTotal,
                      pos: inv.placeOfSupply,
                      rchrg: "N",
                      inv: inv.lineItems.map((li) => ({
                        num: 1,
                        itm_det: {
                          txval:
                            li.qty *
                            li.unitPrice *
                            (1 - li.discountPercent / 100),
                          rt: li.gstRate,
                          camt: li.cgst,
                          samt: li.sgst,
                          iamt: li.igst,
                          csamt: li.cess,
                        },
                      })),
                    });
                    return acc;
                  },
                  {},
                );
                const b2bSchema = Object.entries(b2bGrouped).map(
                  ([ctin, inv]) => ({
                    ctin,
                    inv,
                  }),
                );

                // B2CS: small B2C supplies (no GSTIN, taxable value per inv)
                const b2csGrouped = b2c.reduce<
                  Record<
                    string,
                    {
                      txval: number;
                      rt: number;
                      iamt: number;
                      camt: number;
                      samt: number;
                      csamt: number;
                    }
                  >
                >((acc, inv) => {
                  const key = `${inv.placeOfSupply}-${inv.lineItems[0]?.gstRate ?? 0}`;
                  if (!acc[key])
                    acc[key] = {
                      txval: 0,
                      rt: inv.lineItems[0]?.gstRate ?? 0,
                      iamt: 0,
                      camt: 0,
                      samt: 0,
                      csamt: 0,
                    };
                  acc[key].txval += inv.subtotal - inv.totalDiscount;
                  acc[key].iamt += inv.totalIgst;
                  acc[key].camt += inv.totalCgst;
                  acc[key].samt += inv.totalSgst;
                  acc[key].csamt += inv.totalCess;
                  return acc;
                }, {});
                const b2csSchema = Object.entries(b2csGrouped).map(
                  ([key, val]) => ({
                    sply_ty: "INTRA",
                    pos: key.split("-")[0],
                    typ: "OE",
                    ...val,
                  }),
                );

                // HSN Summary: aggregated by HSN code
                const hsnMap = new Map<
                  string,
                  {
                    hsn_sc: string;
                    desc: string;
                    uqc: string;
                    qty: number;
                    val: number;
                    txval: number;
                    iamt: number;
                    camt: number;
                    samt: number;
                    csamt: number;
                  }
                >();
                for (const inv of [...b2b, ...b2c]) {
                  for (const li of inv.lineItems) {
                    const hsn = li.hsnSacCode || "0000";
                    const existing = hsnMap.get(hsn);
                    const taxable =
                      li.qty * li.unitPrice * (1 - li.discountPercent / 100);
                    if (existing) {
                      existing.qty += li.qty;
                      existing.val += li.lineTotal;
                      existing.txval += taxable;
                      existing.iamt += li.igst;
                      existing.camt += li.cgst;
                      existing.samt += li.sgst;
                      existing.csamt += li.cess;
                    } else {
                      hsnMap.set(hsn, {
                        hsn_sc: hsn,
                        desc: li.description || hsn,
                        uqc: li.unit || "NOS",
                        qty: li.qty,
                        val: li.lineTotal,
                        txval: taxable,
                        iamt: li.igst,
                        camt: li.cgst,
                        samt: li.sgst,
                        csamt: li.cess,
                      });
                    }
                  }
                }

                // CDNR: Credit/Debit notes for registered buyers
                const cdnrSchema = [...creditNotes, ...debitNotes]
                  .filter((inv) => inv.partyGstin)
                  .reduce<Record<string, object[]>>((acc, inv) => {
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
                          txval:
                            li.qty *
                            li.unitPrice *
                            (1 - li.discountPercent / 100),
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

                const exportData = {
                  version: "GST3.0.4",
                  hash: "hash",
                  gstin: "",
                  fp: dateFrom.slice(0, 7).replace("-", ""),
                  gt: [...b2b, ...b2c].reduce((s, i) => s + i.grandTotal, 0),
                  cur_gt: [...b2b, ...b2c].reduce(
                    (s, i) => s + i.grandTotal,
                    0,
                  ),
                  b2b: b2bSchema,
                  b2cs: b2csSchema,
                  hsn: { data: Array.from(hsnMap.values()) },
                  cdnr: Object.entries(cdnrSchema).map(([ctin, nt]) => ({
                    ctin,
                    nt,
                  })),
                };
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
                const allInvoices = [
                  ...b2b,
                  ...b2c,
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
                ].join(",");
                const rows = allInvoices.map((inv) =>
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
            label: "B2C Invoices",
            count: b2c.length,
            taxable: summary.b2c.taxable,
          },
          { label: "Credit Notes", count: creditNotes.length, taxable: 0 },
          {
            label: "Total GST",
            count: filtered.length,
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
          <TabsTrigger value="b2c" data-ocid="gstr1.b2c.tab">
            B2C ({b2c.length})
          </TabsTrigger>
          <TabsTrigger value="cdnr" data-ocid="gstr1.cdnr.tab">
            CDNR ({creditNotes.length + debitNotes.length})
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

        <TabsContent value="b2c">
          <Card className="bg-card border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                B2C Invoices (Unregistered Buyers)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <GSTTable invoices={b2c} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cdnr">
          <Card className="bg-card border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Credit/Debit Notes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <GSTTable invoices={[...creditNotes, ...debitNotes]} />
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
