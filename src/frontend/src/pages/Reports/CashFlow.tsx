import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useInvoices, usePurchases } from "@/hooks/useGSTStore";
import { formatINR, getCurrentMonth } from "@/utils/formatting";
import { Download, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

interface CashFlowSection {
  title: string;
  items: { label: string; amount: number; isOutflow?: boolean }[];
}

export function CashFlow() {
  const { invoices } = useInvoices();
  const { purchases } = usePurchases();
  const { start: defaultStart, end: defaultEnd } = getCurrentMonth();
  const [fromDate, setFromDate] = useState(defaultStart);
  const [toDate, setToDate] = useState(defaultEnd);

  const { sections, netCashFlow } = useMemo(() => {
    // Cash received from customers (confirmed sales/service invoices in range)
    const cashFromCustomers = invoices
      .filter(
        (inv) =>
          ["sales", "service"].includes(inv.type) &&
          inv.status === "confirmed" &&
          inv.date >= fromDate &&
          inv.date <= toDate,
      )
      .reduce((sum, inv) => sum + inv.grandTotal, 0);

    // Cash paid to vendors (confirmed purchases in range)
    const cashToVendors = purchases
      .filter(
        (p) =>
          p.status === "confirmed" &&
          p.billDate >= fromDate &&
          p.billDate <= toDate,
      )
      .reduce((sum, p) => sum + p.grandTotal, 0);

    const netOperating = cashFromCustomers - cashToVendors;

    const sectionData: CashFlowSection[] = [
      {
        title: "A. Cash Flow from Operating Activities",
        items: [
          {
            label: "Cash Received from Customers (Sales & Services)",
            amount: cashFromCustomers,
          },
          {
            label: "Cash Paid to Vendors (Purchases)",
            amount: cashToVendors,
            isOutflow: true,
          },
        ],
      },
      {
        title: "B. Cash Flow from Investing Activities",
        items: [
          { label: "Capital Expenditure", amount: 0, isOutflow: true },
          { label: "Purchase of Fixed Assets", amount: 0, isOutflow: true },
          { label: "Proceeds from Asset Sales", amount: 0 },
        ],
      },
      {
        title: "C. Cash Flow from Financing Activities",
        items: [
          { label: "Loan Receipts", amount: 0 },
          { label: "Loan Repayments", amount: 0, isOutflow: true },
          { label: "Capital Introduced", amount: 0 },
          { label: "Capital Withdrawn", amount: 0, isOutflow: true },
        ],
      },
    ];

    return { sections: sectionData, netCashFlow: netOperating };
  }, [invoices, purchases, fromDate, toDate]);

  const exportCSV = () => {
    const lines: string[] = [
      `Cash Flow Statement,${fromDate} to ${toDate}`,
      "",
    ];
    for (const section of sections) {
      lines.push(section.title);
      for (const item of section.items) {
        const signed = item.isOutflow ? -item.amount : item.amount;
        lines.push(`"${item.label}",${signed.toFixed(2)}`);
      }
      const sectionNet = section.items.reduce(
        (sum, it) => sum + (it.isOutflow ? -it.amount : it.amount),
        0,
      );
      lines.push(
        `Net - ${section.title.split(".")[0]},${sectionNet.toFixed(2)}`,
      );
      lines.push("");
    }
    lines.push(`Net Cash Flow,${netCashFlow.toFixed(2)}`);
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cash-flow-${fromDate}-to-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4" data-ocid="cashflow.section">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-cabinet font-bold text-foreground">
          Cash Flow Statement
        </h1>
        <Button
          variant="outline"
          onClick={exportCSV}
          className="gap-2"
          data-ocid="cashflow.export.button"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card className="bg-card border-border/70">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-4 flex-wrap items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">From Date</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-sm w-40"
                data-ocid="cashflow.from.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">To Date</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-sm w-40"
                data-ocid="cashflow.to.input"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Net Cash Flow Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-chart-2" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Total Inflows
              </p>
            </div>
            <p className="text-xl font-cabinet font-bold text-chart-2 font-numeric">
              {formatINR(
                sections
                  .flatMap((s) => s.items.filter((i) => !i.isOutflow))
                  .reduce((sum, i) => sum + i.amount, 0),
              )}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-chart-4" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Total Outflows
              </p>
            </div>
            <p className="text-xl font-cabinet font-bold text-chart-4 font-numeric">
              {formatINR(
                sections
                  .flatMap((s) => s.items.filter((i) => i.isOutflow))
                  .reduce((sum, i) => sum + i.amount, 0),
              )}
            </p>
          </CardContent>
        </Card>
        <Card
          className={`border-border/70 ${netCashFlow >= 0 ? "bg-chart-2/5" : "bg-chart-4/5"}`}
        >
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Net Cash Flow
            </p>
            <p
              className={`text-xl font-cabinet font-bold font-numeric ${netCashFlow >= 0 ? "text-chart-2" : "text-chart-4"}`}
            >
              {formatINR(netCashFlow)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Sections */}
      <Card className="bg-card border-border/70">
        <CardContent className="p-6 space-y-6">
          {sections.map((section, sIdx) => {
            const sectionNet = section.items.reduce(
              (sum, it) => sum + (it.isOutflow ? -it.amount : it.amount),
              0,
            );
            return (
              <div key={section.title}>
                {sIdx > 0 && <Separator className="mb-6" />}
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  {section.title}
                </h3>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <div
                      key={item.label}
                      className="flex justify-between items-center py-1 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {item.label}
                      </span>
                      <span
                        className={`font-numeric font-medium ${
                          item.isOutflow
                            ? "text-chart-4"
                            : item.amount > 0
                              ? "text-chart-2"
                              : "text-muted-foreground"
                        }`}
                      >
                        {item.isOutflow
                          ? `(${formatINR(item.amount)})`
                          : formatINR(item.amount)}
                      </span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between items-center py-1 text-sm font-semibold">
                    <span>
                      Net {section.title.split(" ").slice(0, 4).join(" ")}
                    </span>
                    <span
                      className={`font-numeric ${sectionNet >= 0 ? "text-chart-2" : "text-chart-4"}`}
                    >
                      {formatINR(sectionNet)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          <Separator />

          {/* Net Cash Flow */}
          <div className="flex justify-between items-center pt-2">
            <span className="text-base font-cabinet font-bold text-foreground">
              Net Cash Flow (A + B + C)
            </span>
            <span
              className={`text-lg font-cabinet font-bold font-numeric ${netCashFlow >= 0 ? "text-chart-2" : "text-chart-4"}`}
            >
              {formatINR(netCashFlow)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
