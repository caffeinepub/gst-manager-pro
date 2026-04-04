import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useInvoices, usePurchases } from "@/hooks/useGSTStore";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { formatINR } from "@/utils/formatting";
import { getCurrentMonth } from "@/utils/formatting";
import { CheckCircle2, ClipboardList, Download, Table2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

function randomArn3b() {
  return `GST3B${Array.from(
    { length: 11 },
    () =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)],
  ).join("")}`;
}

export function GSTR3B() {
  const { invoices } = useInvoices();
  const { purchases } = usePurchases();
  const { start: defStart, end: defEnd } = getCurrentMonth();
  const [dateFrom, setDateFrom] = useState(defStart);
  const [dateTo, setDateTo] = useState(defEnd);

  const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [filingStatus, setFilingStatus] = useLocalStorage<
    Record<string, { status: "not_filed" | "filed"; arn?: string }>
  >("gst_gstr3b_status", {});

  const periodStatus = filingStatus[currentPeriod] ?? { status: "not_filed" };

  // Business profile
  const businessStateCode = (() => {
    try {
      const p = JSON.parse(
        localStorage.getItem("gst_business_profile") || "{}",
      );
      return String(p.stateCode || p.state_code || "27").padStart(2, "0");
    } catch {
      return "27";
    }
  })();

  const businessGstin = (() => {
    try {
      const p = JSON.parse(
        localStorage.getItem("gst_business_profile") || "{}",
      );
      return p.gstin || p.gstNumber || "";
    } catch {
      return "";
    }
  })();

  // Derive ret_period from selected date range
  const retPeriod = (() => {
    const [year, month] = dateFrom.split("-");
    return `${month}${year}`; // e.g. "032026"
  })();

  const handleFile = () => {
    const arn = randomArn3b();
    setFilingStatus((prev) => ({
      ...prev,
      [currentPeriod]: { status: "filed", arn },
    }));
    toast.success(`GSTR-3B filed successfully. ARN: ${arn}`);
  };

  const data = useMemo(() => {
    const outward = invoices.filter(
      (inv) =>
        ["sales", "service"].includes(inv.type) &&
        inv.status === "confirmed" &&
        inv.date >= dateFrom &&
        inv.date <= dateTo,
    );
    const inward = purchases.filter(
      (p) =>
        p.status === "confirmed" &&
        p.billDate >= dateFrom &&
        p.billDate <= dateTo,
    );

    const outSum = {
      taxable: outward.reduce(
        (s, inv) => s + (inv.subtotal - inv.totalDiscount),
        0,
      ),
      cgst: outward.reduce((s, inv) => s + inv.totalCgst, 0),
      sgst: outward.reduce((s, inv) => s + inv.totalSgst, 0),
      igst: outward.reduce((s, inv) => s + inv.totalIgst, 0),
      cess: outward.reduce((s, inv) => s + inv.totalCess, 0),
    };

    const itcEligible = inward.filter((p) => p.itcEligible);
    const itcSum = {
      cgst: itcEligible.reduce((s, p) => s + p.totalCgst, 0),
      sgst: itcEligible.reduce((s, p) => s + p.totalSgst, 0),
      igst: itcEligible.reduce((s, p) => s + p.totalIgst, 0),
      cess: itcEligible.reduce((s, p) => s + p.totalCess, 0),
      taxable: itcEligible.reduce(
        (s, p) => s + (p.subtotal - p.totalDiscount),
        0,
      ),
    };

    const rcm = inward.filter((p) => p.isRcm);
    const rcmSum = {
      cgst: rcm.reduce((s, p) => s + p.totalCgst, 0),
      sgst: rcm.reduce((s, p) => s + p.totalSgst, 0),
      igst: rcm.reduce((s, p) => s + p.totalIgst, 0),
      taxable: rcm.reduce((s, p) => s + (p.subtotal - p.totalDiscount), 0),
    };

    // Table 3.2: Inter-state B2C by place of supply
    const table32 = outward
      .filter(
        (inv) => !inv.partyGstin && inv.placeOfSupply !== businessStateCode,
      )
      .reduce(
        (acc, inv) => {
          const pos = inv.placeOfSupply || "00";
          if (!acc[pos]) acc[pos] = { pos, taxable: 0, igst: 0 };
          acc[pos].taxable += inv.subtotal - inv.totalDiscount;
          acc[pos].igst += inv.totalIgst;
          return acc;
        },
        {} as Record<string, { pos: string; taxable: number; igst: number }>,
      );

    // GST ITC set-off (Section 49A & 49B)
    const rawCgstLiability = outSum.cgst + rcmSum.cgst;
    const rawSgstLiability = outSum.sgst + rcmSum.sgst;
    const rawIgstLiability = outSum.igst + rcmSum.igst;

    let remainingIgstItc = itcSum.igst;
    const igstAfterItc = Math.max(0, rawIgstLiability - remainingIgstItc);
    remainingIgstItc = Math.max(0, remainingIgstItc - rawIgstLiability);

    const cgstAfterIgstItc = Math.max(0, rawCgstLiability - remainingIgstItc);
    remainingIgstItc = Math.max(0, remainingIgstItc - rawCgstLiability);

    const sgstAfterIgstItc = Math.max(0, rawSgstLiability - remainingIgstItc);

    const cgstAfterAllItc = Math.max(0, cgstAfterIgstItc - itcSum.cgst);
    const sgstAfterAllItc = Math.max(0, sgstAfterIgstItc - itcSum.sgst);

    const netPayable = {
      cgst: cgstAfterAllItc,
      sgst: sgstAfterAllItc,
      igst: igstAfterItc,
      cess: Math.max(0, outSum.cess - itcSum.cess),
    };

    return { outSum, itcSum, rcmSum, netPayable, table32 };
  }, [invoices, purchases, dateFrom, dateTo, businessStateCode]);

  const Row = ({
    label,
    cgst,
    sgst,
    igst,
    cess,
    bold,
  }: {
    label: string;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    bold?: boolean;
  }) => (
    <div
      className={`grid grid-cols-5 gap-2 py-2 text-sm min-w-[480px] ${
        bold ? "font-bold border-t border-border" : ""
      }`}
    >
      <span className={`${bold ? "" : "text-muted-foreground"}`}>{label}</span>
      <span className="font-numeric text-right">{formatINR(cgst)}</span>
      <span className="font-numeric text-right">{formatINR(sgst)}</span>
      <span className="font-numeric text-right">{formatINR(igst)}</span>
      <span className="font-numeric text-right">{formatINR(cess)}</span>
    </div>
  );

  return (
    <div className="space-y-4" data-ocid="gstr3b.section">
      {/* Filing Status Banner */}
      <Card className="bg-card border-border/70">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                GSTR-3B Status ({currentPeriod}):
              </span>
              {periodStatus.status === "not_filed" ? (
                <Badge variant="destructive" data-ocid="gstr3b.status.badge">
                  Not Filed
                </Badge>
              ) : (
                <Badge variant="default" data-ocid="gstr3b.status.badge">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Filed
                </Badge>
              )}
              {periodStatus.arn && (
                <span className="text-xs font-mono text-muted-foreground">
                  ARN: {periodStatus.arn}
                </span>
              )}
            </div>
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
                        onClick={handleFile}
                        data-ocid="gstr3b.file.primary_button"
                        className="gap-2"
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        Generate & File GSTR-3B
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      This is a simulation. Real filing requires GSTN API
                      credentials in Settings &gt; API Config.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
          {periodStatus.status === "not_filed" && (
            <div className="mt-3 p-3 rounded bg-muted/40 text-xs">
              <p className="font-medium mb-1">Tax Summary (current data):</p>
              <div className="grid grid-cols-4 gap-2">
                <span>
                  CGST:{" "}
                  <span className="font-bold text-primary">
                    {formatINR(data.netPayable.cgst)}
                  </span>
                </span>
                <span>
                  SGST:{" "}
                  <span className="font-bold text-primary">
                    {formatINR(data.netPayable.sgst)}
                  </span>
                </span>
                <span>
                  IGST:{" "}
                  <span className="font-bold text-primary">
                    {formatINR(data.netPayable.igst)}
                  </span>
                </span>
                <span>
                  Total:{" "}
                  <span className="font-bold text-primary">
                    {formatINR(
                      data.netPayable.cgst +
                        data.netPayable.sgst +
                        data.netPayable.igst +
                        data.netPayable.cess,
                    )}
                  </span>
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                data-ocid="gstr3b.from.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
                data-ocid="gstr3b.to.input"
              />
            </div>
            {/* JSON Export: proper GSTN schema */}
            <Button
              variant="outline"
              onClick={() => {
                const gstr3bSchema = {
                  gstin: businessGstin,
                  ret_period: retPeriod,
                  sup_details: {
                    osup_det: {
                      txval: data.outSum.taxable,
                      iamt: data.outSum.igst,
                      camt: data.outSum.cgst,
                      samt: data.outSum.sgst,
                      csamt: data.outSum.cess,
                    },
                    osup_zero: {
                      txval: 0,
                      iamt: 0,
                      camt: 0,
                      samt: 0,
                      csamt: 0,
                    },
                    osup_nil_exmp: { txval: 0 },
                    isup_rev: {
                      txval: data.rcmSum.taxable,
                      iamt: data.rcmSum.igst,
                      camt: data.rcmSum.cgst,
                      samt: data.rcmSum.sgst,
                      csamt: 0,
                    },
                  },
                  itc_elg: {
                    itc_avl: [
                      { ty: "IMPG", iamt: 0, camt: 0, samt: 0, csamt: 0 },
                      { ty: "IMPS", iamt: 0, camt: 0, samt: 0, csamt: 0 },
                      {
                        ty: "ISRC",
                        iamt: data.rcmSum.igst,
                        camt: data.rcmSum.cgst,
                        samt: data.rcmSum.sgst,
                        csamt: 0,
                      },
                      { ty: "ISD", iamt: 0, camt: 0, samt: 0, csamt: 0 },
                      {
                        ty: "OTH",
                        iamt: data.itcSum.igst,
                        camt: data.itcSum.cgst,
                        samt: data.itcSum.sgst,
                        csamt: data.itcSum.cess,
                      },
                    ],
                    itc_rev: [
                      { ty: "RUL", iamt: 0, camt: 0, samt: 0, csamt: 0 },
                      { ty: "OTH", iamt: 0, camt: 0, samt: 0, csamt: 0 },
                    ],
                    itc_net: {
                      iamt: data.itcSum.igst + data.rcmSum.igst,
                      camt: data.itcSum.cgst + data.rcmSum.cgst,
                      samt: data.itcSum.sgst + data.rcmSum.sgst,
                      csamt: data.itcSum.cess,
                    },
                  },
                  intr_ltfee: {
                    intr_details: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
                    ltfee_details: { camt: 0, samt: 0 },
                  },
                };
                const blob = new Blob([JSON.stringify(gstr3bSchema, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `GSTR3B_${dateFrom}_${dateTo}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              data-ocid="gstr3b.export.button"
              className="gap-2"
            >
              <Download className="w-4 h-4" /> Export JSON
            </Button>
            {/* CSV Export: fix RCM IGST hardcoded 0.00 */}
            <Button
              variant="outline"
              onClick={() => {
                const rows = [
                  ["Description", "CGST", "SGST", "IGST", "Cess"],
                  [
                    "Taxable Outward Supplies",
                    data.outSum.cgst.toFixed(2),
                    data.outSum.sgst.toFixed(2),
                    data.outSum.igst.toFixed(2),
                    data.outSum.cess.toFixed(2),
                  ],
                  [
                    "RCM Liability",
                    data.rcmSum.cgst.toFixed(2),
                    data.rcmSum.sgst.toFixed(2),
                    data.rcmSum.igst.toFixed(2), // was hardcoded "0.00" — FIXED
                    "0.00",
                  ],
                  [
                    "Eligible ITC",
                    data.itcSum.cgst.toFixed(2),
                    data.itcSum.sgst.toFixed(2),
                    data.itcSum.igst.toFixed(2),
                    data.itcSum.cess.toFixed(2),
                  ],
                  [
                    "Net Tax Payable",
                    data.netPayable.cgst.toFixed(2),
                    data.netPayable.sgst.toFixed(2),
                    data.netPayable.igst.toFixed(2),
                    data.netPayable.cess.toFixed(2),
                  ],
                ];
                const csv = rows.map((r) => r.join(",")).join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `GSTR3B_${dateFrom}_${dateTo}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              data-ocid="gstr3b.export_csv.button"
              className="gap-2"
            >
              <Table2 className="w-4 h-4" /> Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main GSTR-3B Summary Table */}
      <Card className="bg-card border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            GSTR-3B Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-5 gap-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border mb-2 min-w-[480px]">
              <span>Description</span>
              <span className="text-right">CGST</span>
              <span className="text-right">SGST</span>
              <span className="text-right">IGST</span>
              <span className="text-right">Cess</span>
            </div>

            <div className="space-y-0">
              <p className="text-xs font-semibold text-muted-foreground mt-3 mb-1 uppercase tracking-wide">
                3.1 - Outward Supplies
              </p>
              <Row label="Taxable outward supplies (A)" {...data.outSum} />
              <Row
                label="Zero rated supplies"
                cgst={0}
                sgst={0}
                igst={0}
                cess={0}
              />
              <Row
                label="Nil rated / Exempted"
                cgst={0}
                sgst={0}
                igst={0}
                cess={0}
              />

              <Separator className="my-3" />
              <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                3.2 - Inter-State B2C Supplies by State
              </p>
              <Row
                label="Inward supplies (RCM)"
                cgst={data.rcmSum.cgst}
                sgst={data.rcmSum.sgst}
                igst={data.rcmSum.igst}
                cess={0}
              />

              <Separator className="my-3" />
              <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                4 - Eligible ITC
              </p>
              <Row
                label="ITC Available (B)"
                cgst={data.itcSum.cgst}
                sgst={data.itcSum.sgst}
                igst={data.itcSum.igst}
                cess={data.itcSum.cess}
              />

              <Separator className="my-3" />
              <Row label="Net Tax Payable (A - B)" {...data.netPayable} bold />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table 3.2: Inter-state B2C by place of supply */}
      {Object.keys(data.table32).length > 0 && (
        <Card className="bg-card border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Table 3.2 — Inter-State B2C Supplies by Place of Supply
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">
                      Place of Supply (State Code)
                    </TableHead>
                    <TableHead className="text-right">Taxable Value</TableHead>
                    <TableHead className="text-right">IGST</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(data.table32).map((row, idx) => (
                    <TableRow
                      key={row.pos}
                      data-ocid={`gstr3b.table32.item.${idx + 1}`}
                    >
                      <TableCell className="pl-4 font-mono text-sm">
                        {row.pos}
                      </TableCell>
                      <TableCell className="text-right font-numeric">
                        {formatINR(row.taxable)}
                      </TableCell>
                      <TableCell className="text-right font-numeric">
                        {formatINR(row.igst)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">CGST Payable</p>
            <p className="text-xl font-cabinet font-bold text-primary font-numeric">
              {formatINR(data.netPayable.cgst)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">SGST Payable</p>
            <p className="text-xl font-cabinet font-bold text-primary font-numeric">
              {formatINR(data.netPayable.sgst)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">IGST Payable</p>
            <p className="text-xl font-cabinet font-bold text-chart-2 font-numeric">
              {formatINR(data.netPayable.igst)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total GST Payable</p>
            <p className="text-xl font-cabinet font-bold text-chart-4 font-numeric">
              {formatINR(
                data.netPayable.cgst +
                  data.netPayable.sgst +
                  data.netPayable.igst +
                  data.netPayable.cess,
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
