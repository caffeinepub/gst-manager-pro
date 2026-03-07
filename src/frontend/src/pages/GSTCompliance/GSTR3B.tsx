import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useInvoices, usePurchases } from "@/hooks/useGSTStore";
import { formatINR } from "@/utils/formatting";
import { getCurrentMonth } from "@/utils/formatting";
import { ClipboardList, Download } from "lucide-react";
import { useMemo, useState } from "react";

export function GSTR3B() {
  const { invoices } = useInvoices();
  const { purchases } = usePurchases();
  const { start: defStart, end: defEnd } = getCurrentMonth();
  const [dateFrom, setDateFrom] = useState(defStart);
  const [dateTo, setDateTo] = useState(defEnd);

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
    };

    const rcm = inward.filter((p) => p.isRcm);
    const rcmSum = {
      cgst: rcm.reduce((s, p) => s + p.totalCgst, 0),
      sgst: rcm.reduce((s, p) => s + p.totalSgst, 0),
    };

    const netPayable = {
      cgst: Math.max(0, outSum.cgst + rcmSum.cgst - itcSum.cgst),
      sgst: Math.max(0, outSum.sgst + rcmSum.sgst - itcSum.sgst),
      igst: Math.max(0, outSum.igst - itcSum.igst),
      cess: Math.max(0, outSum.cess - itcSum.cess),
    };

    return { outSum, itcSum, rcmSum, netPayable };
  }, [invoices, purchases, dateFrom, dateTo]);

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
      className={`grid grid-cols-5 gap-2 py-2 text-sm ${bold ? "font-bold border-t border-border" : ""}`}
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
            <Button
              variant="outline"
              onClick={() => {
                const blob = new Blob([JSON.stringify(data, null, 2)], {
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
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            GSTR-3B Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Column Headers */}
          <div className="grid grid-cols-5 gap-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border mb-2">
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
              3.2 - RCM Liability
            </p>
            <Row
              label="Inward supplies (RCM)"
              cgst={data.rcmSum.cgst}
              sgst={data.rcmSum.sgst}
              igst={0}
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
        </CardContent>
      </Card>

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
