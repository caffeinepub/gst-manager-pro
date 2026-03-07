import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
import {
  useInvoices,
  usePayments,
  usePurchases,
  useStockMovements,
} from "@/hooks/useGSTStore";
import { useItems, useParties } from "@/hooks/useQueries";
import type { AppPage } from "@/types/gst";
import {
  formatDate,
  formatINR,
  getCurrentMonth,
  getGSTR1DueDate,
  getGSTR3BDueDate,
} from "@/utils/formatting";
import {
  AlertCircle,
  Bot,
  Calendar,
  Clock,
  FileText,
  Package,
  Plus,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useMemo } from "react";

interface DashboardProps {
  onNavigate: (page: AppPage) => void;
}

function getDaysTo(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function getAlertColor(days: number): string {
  if (days <= 3) return "bg-destructive/5 border-destructive/20";
  if (days <= 7) return "bg-chart-4/5 border-chart-4/20";
  return "bg-muted/50 border-border/50";
}

function getAlertTextColor(days: number): string {
  if (days <= 3) return "text-destructive";
  if (days <= 7) return "text-chart-4";
  return "text-foreground";
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { invoices } = useInvoices();
  const { purchases } = usePurchases();
  const { payments } = usePayments();
  const { movements } = useStockMovements();
  const { data: items = [] } = useItems();
  const { data: parties = [] } = useParties();
  const { start, end } = getCurrentMonth();

  const stats = useMemo(() => {
    const monthInvoices = invoices.filter(
      (inv) =>
        inv.date >= start && inv.date <= end && inv.status !== "cancelled",
    );
    const monthPurchases = purchases.filter(
      (p) =>
        p.billDate >= start && p.billDate <= end && p.status !== "cancelled",
    );

    const totalSales = monthInvoices
      .filter((inv) => ["sales", "service"].includes(inv.type))
      .reduce((sum, inv) => sum + inv.grandTotal, 0);

    const totalPurchases = monthPurchases.reduce(
      (sum, p) => sum + p.grandTotal,
      0,
    );

    const confirmedInvoices = invoices.filter(
      (inv) => inv.status === "confirmed",
    ).length;
    const complianceHealth =
      invoices.length > 0
        ? Math.round((confirmedInvoices / invoices.length) * 100)
        : 100;

    const outstandingReceivable = invoices
      .filter(
        (inv) =>
          ["sales", "service"].includes(inv.type) && inv.status === "confirmed",
      )
      .reduce((sum, inv) => sum + inv.grandTotal, 0);

    const outstandingPayable = purchases
      .filter((p) => p.status === "confirmed")
      .reduce((sum, p) => sum + p.grandTotal, 0);

    // Stock value calculation
    const totalStockValue = items.reduce((sum, item) => {
      const openingStock = Number(item.openingStock ?? 0);
      const itemId = String(item.id);
      const soldQty = invoices
        .filter(
          (inv) =>
            ["sales", "service"].includes(inv.type) &&
            inv.status !== "cancelled",
        )
        .flatMap((inv) => inv.lineItems)
        .filter((li) => li.itemId === itemId)
        .reduce((s, li) => s + li.qty, 0);
      const purchasedQty = purchases
        .filter((p) => p.status !== "cancelled")
        .flatMap((p) => p.lineItems)
        .filter((li) => li.itemId === itemId)
        .reduce((s, li) => s + li.qty, 0);
      const receiptQty = movements
        .filter((m) => m.itemId === itemId && m.type === "receipt")
        .reduce((s, m) => s + m.qty, 0);
      const issueQty = movements
        .filter((m) => m.itemId === itemId && m.type === "issue")
        .reduce((s, m) => s + m.qty, 0);
      const closingStock = Math.max(
        0,
        openingStock + purchasedQty + receiptQty - soldQty - issueQty,
      );
      const price = Number(item.sellingPrice) / 100;
      return sum + closingStock * price;
    }, 0);

    return {
      totalSales,
      totalPurchases,
      outstandingReceivable,
      outstandingPayable,
      complianceHealth,
      totalStockValue,
    };
  }, [invoices, purchases, movements, items, start, end]);

  const alerts = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const salesServiceInvoices = invoices.filter((inv) =>
      ["sales", "service"].includes(inv.type),
    );

    const overdueInvoices = salesServiceInvoices.filter(
      (inv) =>
        inv.status === "confirmed" && inv.dueDate && inv.dueDate < todayStr,
    );
    const overdueAmount = overdueInvoices.reduce(
      (sum, inv) => sum + inv.grandTotal,
      0,
    );

    const paidInvoiceIds = new Set(payments.map((p) => p.invoiceId));
    const unpaidInvoices = salesServiceInvoices.filter(
      (inv) => inv.status === "confirmed" && !paidInvoiceIds.has(inv.id),
    );

    const now = new Date();

    // GSTR-1: 11th of next month
    const gstr1Due = new Date(now.getFullYear(), now.getMonth() + 1, 11);
    const daysToGstr1 = getDaysTo(gstr1Due);

    // GSTR-3B: 20th of next month
    const gstr3bDue = new Date(now.getFullYear(), now.getMonth() + 1, 20);
    const daysToGstr3b = getDaysTo(gstr3bDue);

    // GSTR-9: Dec 31 current year
    const gstr9Due = new Date(now.getFullYear(), 11, 31);
    const daysToGstr9 = getDaysTo(gstr9Due);

    // TDS Return: 7th of next month
    const tdsDue = new Date(now.getFullYear(), now.getMonth() + 1, 7);
    const daysToTds = getDaysTo(tdsDue);

    return {
      overdueCount: overdueInvoices.length,
      overdueAmount,
      unpaidCount: unpaidInvoices.length,
      daysToGstr1,
      gstr1Due: gstr1Due.toISOString().split("T")[0],
      daysToGstr3b,
      gstr3bDue: gstr3bDue.toISOString().split("T")[0],
      daysToGstr9,
      gstr9Due: gstr9Due.toISOString().split("T")[0],
      daysToTds,
      tdsDue: tdsDue.toISOString().split("T")[0],
    };
  }, [invoices, payments]);

  // Predictive analytics: 3-month forecast
  const forecast = useMemo(() => {
    const now = new Date();
    const months: Array<{ start: string; end: string }> = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const endStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${lastDay}`;
      months.push({ start: startStr, end: endStr });
    }

    const monthlySales = months.map((m) =>
      invoices
        .filter(
          (inv) =>
            ["sales", "service"].includes(inv.type) &&
            inv.status !== "cancelled" &&
            inv.date >= m.start &&
            inv.date <= m.end,
        )
        .reduce((sum, inv) => sum + inv.grandTotal, 0),
    );
    const monthlyPurchases = months.map((m) =>
      purchases
        .filter(
          (p) =>
            p.status !== "cancelled" &&
            p.billDate >= m.start &&
            p.billDate <= m.end,
        )
        .reduce((sum, p) => sum + p.grandTotal, 0),
    );

    const avgSales = monthlySales.reduce((s, v) => s + v, 0) / 3;
    const avgPurchases = monthlyPurchases.reduce((s, v) => s + v, 0) / 3;

    const forecastMonths = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      return d.toLocaleString("en-IN", { month: "short", year: "numeric" });
    });

    return {
      forecastMonths,
      avgSales,
      avgPurchases,
      netPositive: avgSales > avgPurchases,
    };
  }, [invoices, purchases]);

  // Anomaly detection
  const anomalies = useMemo(() => {
    const results: Array<{
      severity: "Warning" | "Error";
      message: string;
    }> = [];

    // 1. Duplicate invoice numbers
    const invNumbers = invoices.map((inv) => inv.invoiceNumber);
    const dupNums = invNumbers.filter(
      (n, i) => invNumbers.indexOf(n) !== i && n,
    );
    const uniqueDups = [...new Set(dupNums)];
    for (const dup of uniqueDups) {
      results.push({
        severity: "Error",
        message: `Duplicate invoice number detected: ${dup}`,
      });
    }

    // 2. Invoices > 50000 without GSTIN
    const noGstinHigh = invoices.filter(
      (inv) =>
        inv.grandTotal > 50000 && !inv.partyGstin && inv.status !== "cancelled",
    );
    for (const inv of noGstinHigh) {
      results.push({
        severity: "Warning",
        message: `Invoice ${inv.invoiceNumber} (${formatINR(inv.grandTotal)}) has no party GSTIN`,
      });
    }

    // 3. Sales invoices with all 0% GST but grandTotal > 10000
    const zeroGstHighValue = invoices.filter(
      (inv) =>
        ["sales", "service"].includes(inv.type) &&
        inv.status !== "cancelled" &&
        inv.grandTotal > 10000 &&
        inv.lineItems.length > 0 &&
        inv.lineItems.every((li) => li.gstRate === 0),
    );
    for (const inv of zeroGstHighValue) {
      results.push({
        severity: "Warning",
        message: `Invoice ${inv.invoiceNumber} worth ${formatINR(inv.grandTotal)} has 0% GST on all items`,
      });
    }

    // 4. RCM purchases with no notes
    const rcmNoNotes = purchases.filter(
      (p) => p.isRcm && (!p.notes || p.notes.trim() === ""),
    );
    for (const p of rcmNoNotes) {
      results.push({
        severity: "Warning",
        message: `RCM Purchase ${p.billNumber} has no notes/justification`,
      });
    }

    // 5. Credit/Debit notes with no linked invoice
    const unlinkedNotes = invoices.filter(
      (inv) =>
        ["credit_note", "debit_note"].includes(inv.type) &&
        inv.status !== "cancelled" &&
        !inv.linkedInvoiceId,
    );
    for (const inv of unlinkedNotes) {
      results.push({
        severity: "Warning",
        message: `${inv.type === "credit_note" ? "Credit" : "Debit"} Note ${inv.invoiceNumber} has no linked invoice`,
      });
    }

    return results;
  }, [invoices, purchases]);

  const recentInvoices = invoices.slice(0, 5);

  const statusVariant = (
    status: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (status === "confirmed") return "default";
    if (status === "cancelled") return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-6" data-ocid="dashboard.section">
      {/* KPI Cards - 5 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <Card className="bg-card border-border/70 shadow-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Sales (This Month)
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-cabinet font-bold text-foreground font-numeric">
              {formatINR(stats.totalSales)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {
                invoices.filter(
                  (inv) =>
                    ["sales", "service"].includes(inv.type) &&
                    inv.date >= start &&
                    inv.date <= end,
                ).length
              }{" "}
              invoices
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/70 shadow-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Purchases (This Month)
            </CardTitle>
            <TrendingDown className="w-4 h-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-cabinet font-bold text-foreground font-numeric">
              {formatINR(stats.totalPurchases)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {
                purchases.filter(
                  (p) => p.billDate >= start && p.billDate <= end,
                ).length
              }{" "}
              bills
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/70 shadow-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Receivables
            </CardTitle>
            <Clock className="w-4 h-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-cabinet font-bold text-chart-3 font-numeric">
              {formatINR(stats.outstandingReceivable)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Outstanding</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/70 shadow-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Payables
            </CardTitle>
            <AlertCircle className="w-4 h-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-cabinet font-bold text-chart-4 font-numeric">
              {formatINR(stats.outstandingPayable)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Outstanding</p>
          </CardContent>
        </Card>

        <Card
          className="bg-card border-border/70 shadow-card cursor-pointer hover:border-chart-2/40 transition-colors"
          onClick={() => onNavigate("inventory-erp")}
          data-ocid="dashboard.stock_value.card"
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Stock Value
            </CardTitle>
            <Package className="w-4 h-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-cabinet font-bold text-chart-2 font-numeric">
              {formatINR(stats.totalStockValue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Current stock value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card
          className="bg-card border-border/70 cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => onNavigate("masters-items")}
          data-ocid="dashboard.items.card"
        >
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-cabinet font-bold leading-none">
                  {items.filter((i) => i.isActive).length}
                </p>
                <p className="text-xs text-muted-foreground">Active Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className="bg-card border-border/70 cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => onNavigate("masters-parties")}
          data-ocid="dashboard.parties.card"
        >
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-chart-3/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-chart-3" />
              </div>
              <div>
                <p className="text-lg font-cabinet font-bold leading-none">
                  {parties.filter((p) => p.isActive).length}
                </p>
                <p className="text-xs text-muted-foreground">Active Parties</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className="bg-card border-border/70 cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => onNavigate("invoicing-sales")}
          data-ocid="dashboard.total_invoices.card"
        >
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-chart-2/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-chart-2" />
              </div>
              <div>
                <p className="text-lg font-cabinet font-bold leading-none">
                  {invoices.length}
                </p>
                <p className="text-xs text-muted-foreground">Total Invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className="bg-card border-border/70 cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => onNavigate("gst-gstr1")}
          data-ocid="dashboard.compliance.card"
        >
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-cabinet font-bold leading-none">
                  {stats.complianceHealth}%
                </p>
                <p className="text-xs text-muted-foreground">Compliance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Alerts - 6 tiles */}
      <Card
        className="bg-card border-border/70"
        data-ocid="dashboard.alerts.section"
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-chart-4" />
            Workflow Alerts & Due Dates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* Overdue Invoices */}
            <div
              className={`p-3 rounded-lg border ${alerts.overdueCount > 0 ? "bg-destructive/5 border-destructive/20" : "bg-muted/50 border-border/50"}`}
            >
              <p className="text-xs text-muted-foreground mb-1 font-medium">
                Overdue Invoices
              </p>
              {alerts.overdueCount === 0 ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-chart-2" />
                  <span className="text-xs font-semibold text-chart-2">
                    All Clear
                  </span>
                </div>
              ) : (
                <>
                  <p className="text-lg font-cabinet font-bold text-destructive leading-none">
                    {alerts.overdueCount}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-numeric">
                    {formatINR(alerts.overdueAmount)}
                  </p>
                </>
              )}
            </div>

            {/* Unpaid Invoices */}
            <div
              className={`p-3 rounded-lg border ${alerts.unpaidCount > 0 ? "bg-chart-3/5 border-chart-3/20" : "bg-muted/50 border-border/50"}`}
            >
              <p className="text-xs text-muted-foreground mb-1 font-medium">
                Unpaid Invoices
              </p>
              {alerts.unpaidCount === 0 ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-chart-2" />
                  <span className="text-xs font-semibold text-chart-2">
                    All Paid
                  </span>
                </div>
              ) : (
                <>
                  <p className="text-lg font-cabinet font-bold text-chart-3 leading-none">
                    {alerts.unpaidCount}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    pending
                  </p>
                </>
              )}
            </div>

            {/* GSTR-1 Due */}
            <div
              className={`p-3 rounded-lg border ${getAlertColor(alerts.daysToGstr1)}`}
            >
              <p className="text-xs text-muted-foreground mb-1 font-medium">
                GSTR-1 Due
              </p>
              <p
                className={`text-lg font-cabinet font-bold leading-none ${getAlertTextColor(alerts.daysToGstr1)}`}
              >
                {alerts.daysToGstr1}d
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 font-numeric">
                {alerts.gstr1Due}
              </p>
            </div>

            {/* GSTR-3B Due */}
            <div
              className={`p-3 rounded-lg border ${getAlertColor(alerts.daysToGstr3b)}`}
            >
              <p className="text-xs text-muted-foreground mb-1 font-medium">
                GSTR-3B Due
              </p>
              <p
                className={`text-lg font-cabinet font-bold leading-none ${getAlertTextColor(alerts.daysToGstr3b)}`}
              >
                {alerts.daysToGstr3b}d
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 font-numeric">
                {alerts.gstr3bDue}
              </p>
            </div>

            {/* GSTR-9 Annual */}
            <div
              className={`p-3 rounded-lg border ${getAlertColor(alerts.daysToGstr9)}`}
            >
              <p className="text-xs text-muted-foreground mb-1 font-medium">
                GSTR-9 Annual
              </p>
              <p
                className={`text-lg font-cabinet font-bold leading-none ${getAlertTextColor(alerts.daysToGstr9)}`}
              >
                {alerts.daysToGstr9}d
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 font-numeric">
                {alerts.gstr9Due}
              </p>
            </div>

            {/* TDS Return */}
            <div
              className={`p-3 rounded-lg border ${getAlertColor(alerts.daysToTds)}`}
            >
              <p className="text-xs text-muted-foreground mb-1 font-medium">
                TDS Return
              </p>
              <p
                className={`text-lg font-cabinet font-bold leading-none ${getAlertTextColor(alerts.daysToTds)}`}
              >
                {alerts.daysToTds}d
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 font-numeric">
                {alerts.tdsDue}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Predictive Analytics + AI Anomaly Detection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Predictive Cash Flow */}
        <Card
          className="bg-card border-border/70"
          data-ocid="dashboard.forecast.card"
        >
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-chart-2" />
              Predictive Cash Flow (3-Month Forecast)
            </CardTitle>
            <Badge
              variant={forecast.netPositive ? "default" : "destructive"}
              className="text-xs"
            >
              {forecast.netPositive ? "↑ Positive" : "↓ Negative"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-1.5 text-muted-foreground font-medium">
                      Month
                    </th>
                    <th className="text-right py-1.5 text-muted-foreground font-medium">
                      Proj. Sales
                    </th>
                    <th className="text-right py-1.5 text-muted-foreground font-medium">
                      Proj. Purchases
                    </th>
                    <th className="text-right py-1.5 text-muted-foreground font-medium">
                      Net
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.forecastMonths.map((month) => {
                    const net = forecast.avgSales - forecast.avgPurchases;
                    return (
                      <tr key={month} className="border-b border-border/30">
                        <td className="py-2 font-medium">{month}</td>
                        <td className="py-2 text-right font-numeric text-chart-2">
                          {formatINR(forecast.avgSales)}
                        </td>
                        <td className="py-2 text-right font-numeric text-chart-4">
                          {formatINR(forecast.avgPurchases)}
                        </td>
                        <td
                          className={`py-2 text-right font-numeric font-semibold ${net >= 0 ? "text-chart-2" : "text-destructive"}`}
                        >
                          {formatINR(net)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">
              Based on 3-month historical average. For planning purposes only.
            </p>
          </CardContent>
        </Card>

        {/* AI Anomaly Detection */}
        <Card
          className="bg-card border-border/70"
          data-ocid="dashboard.anomaly.card"
        >
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              AI Anomaly Detection
            </CardTitle>
            {anomalies.length > 0 ? (
              <Badge variant="destructive" className="text-xs">
                {anomalies.length} issue
                {anomalies.length !== 1 ? "s" : ""}
              </Badge>
            ) : (
              <Badge
                variant="default"
                className="text-xs bg-chart-2 hover:bg-chart-2"
              >
                Clean
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {anomalies.length === 0 ? (
              <div
                className="py-6 text-center space-y-2"
                data-ocid="dashboard.anomaly.empty_state"
              >
                <div className="w-10 h-10 rounded-full bg-chart-2/10 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-5 h-5 text-chart-2" />
                </div>
                <p className="text-sm font-medium text-chart-2">
                  No anomalies detected
                </p>
                <p className="text-xs text-muted-foreground">
                  All invoices and purchases look clean
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {anomalies.map((anomaly, idx) => (
                  <div
                    key={anomaly.message.slice(0, 40)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs ${
                      anomaly.severity === "Error"
                        ? "bg-destructive/5 border-destructive/20"
                        : "bg-chart-4/5 border-chart-4/20"
                    }`}
                    data-ocid={`dashboard.anomaly.item.${idx + 1}`}
                  >
                    <AlertCircle
                      className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                        anomaly.severity === "Error"
                          ? "text-destructive"
                          : "text-chart-4"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <Badge
                        variant={
                          anomaly.severity === "Error"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-[10px] mb-1"
                      >
                        {anomaly.severity}
                      </Badge>
                      <p className="text-muted-foreground">{anomaly.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Compliance Health */}
        <Card className="bg-card border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              GST Compliance Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <TooltipProvider>
              <div className="flex items-end justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-3xl font-cabinet font-bold text-primary cursor-help">
                      {stats.complianceHealth}%
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs text-xs">
                    Percentage of all invoices that are in 'Confirmed' status. A
                    higher score means better GST filing readiness.
                  </TooltipContent>
                </Tooltip>
                <Badge
                  variant={
                    stats.complianceHealth >= 80 ? "default" : "destructive"
                  }
                >
                  {stats.complianceHealth >= 80 ? "Healthy" : "Needs Attention"}
                </Badge>
              </div>
            </TooltipProvider>
            <Progress value={stats.complianceHealth} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {stats.complianceHealth}% of invoices are confirmed
            </p>
          </CardContent>
        </Card>

        {/* GST Filing Dates */}
        <Card className="bg-card border-border/70 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Upcoming GST Filing Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-xs font-medium text-muted-foreground">
                    GSTR-1
                  </span>
                </div>
                <p className="font-cabinet font-bold text-foreground">
                  {getGSTR1DueDate()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Outward supplies
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-chart-3" />
                  <span className="text-xs font-medium text-muted-foreground">
                    GSTR-3B
                  </span>
                </div>
                <p className="font-cabinet font-bold text-foreground">
                  {getGSTR3BDueDate()}
                </p>
                <p className="text-xs text-muted-foreground">Summary return</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-chart-2" />
                  <span className="text-xs font-medium text-muted-foreground">
                    GSTR-2B
                  </span>
                </div>
                <p className="font-cabinet font-bold text-foreground">
                  14th of Next Month
                </p>
                <p className="text-xs text-muted-foreground">ITC statement</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-chart-4" />
                  <span className="text-xs font-medium text-muted-foreground">
                    GSTR-9
                  </span>
                </div>
                <p className="font-cabinet font-bold text-foreground">
                  31st Dec
                </p>
                <p className="text-xs text-muted-foreground">Annual return</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => onNavigate("invoicing-sales")}
          data-ocid="dashboard.invoice.button"
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </Button>
        <Button
          variant="outline"
          onClick={() => onNavigate("accounting-purchases")}
          data-ocid="dashboard.purchase.button"
          className="gap-2"
        >
          <Package className="w-4 h-4" />
          New Purchase
        </Button>
        <Button
          variant="outline"
          onClick={() => onNavigate("masters-parties")}
          data-ocid="dashboard.party.button"
          className="gap-2"
        >
          <Users className="w-4 h-4" />
          New Party
        </Button>
        <Button
          variant="outline"
          onClick={() => onNavigate("gst-gstr1")}
          data-ocid="dashboard.gstr1.button"
          className="gap-2"
        >
          <ShieldCheck className="w-4 h-4" />
          View GSTR-1
        </Button>
        <Button
          variant="outline"
          onClick={() => onNavigate("workflow-automation")}
          data-ocid="dashboard.workflow.button"
          className="gap-2"
        >
          <Zap className="w-4 h-4" />
          Workflows
        </Button>
      </div>

      {/* Recent Invoices */}
      <Card className="bg-card border-border/70">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Recent Invoices</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("invoicing-sales")}
            className="text-xs text-primary"
          >
            View All
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recentInvoices.length === 0 ? (
            <div className="p-8 text-center" data-ocid="invoice.empty_state">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No invoices yet</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => onNavigate("invoicing-sales")}
              >
                Create First Invoice
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table data-ocid="invoice.list.table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Invoice #</TableHead>
                      <TableHead>Party</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentInvoices.map((inv, idx) => (
                      <TableRow
                        key={inv.id}
                        data-ocid={`invoice.item.${idx + 1}`}
                      >
                        <TableCell className="pl-4 font-mono text-xs text-primary">
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell className="text-sm">
                          {inv.partyName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(inv.date)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {inv.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-numeric font-medium">
                          {formatINR(inv.grandTotal)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusVariant(inv.status)}
                            className="text-xs capitalize"
                          >
                            {inv.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile card list */}
              <div className="md:hidden divide-y divide-border">
                {recentInvoices.map((inv, idx) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-3 px-4 py-3"
                    data-ocid={`invoice.item.${idx + 1}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-primary font-medium truncate">
                        {inv.invoiceNumber}
                      </p>
                      <p className="text-sm truncate">{inv.partyName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(inv.date)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-numeric font-bold text-sm">
                        {formatINR(inv.grandTotal)}
                      </p>
                      <Badge
                        variant={statusVariant(inv.status)}
                        className="text-[10px] capitalize mt-0.5"
                      >
                        {inv.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
