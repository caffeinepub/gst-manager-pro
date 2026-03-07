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
import { useInvoices, usePayments, usePurchases } from "@/hooks/useGSTStore";
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
  Calendar,
  Clock,
  FileText,
  Package,
  Plus,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo } from "react";

interface DashboardProps {
  onNavigate: (page: AppPage) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { invoices } = useInvoices();
  const { purchases } = usePurchases();
  const { payments } = usePayments();
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

    // Outstanding receivables (sales invoices confirmed but not fully paid)
    const outstandingReceivable = invoices
      .filter(
        (inv) =>
          ["sales", "service"].includes(inv.type) && inv.status === "confirmed",
      )
      .reduce((sum, inv) => sum + inv.grandTotal, 0);

    // Outstanding payables
    const outstandingPayable = purchases
      .filter((p) => p.status === "confirmed")
      .reduce((sum, p) => sum + p.grandTotal, 0);

    return {
      totalSales,
      totalPurchases,
      outstandingReceivable,
      outstandingPayable,
      complianceHealth,
    };
  }, [invoices, purchases, start, end]);

  const alerts = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const salesServiceInvoices = invoices.filter((inv) =>
      ["sales", "service"].includes(inv.type),
    );

    // Overdue: confirmed invoices where dueDate < today
    const overdueInvoices = salesServiceInvoices.filter(
      (inv) =>
        inv.status === "confirmed" && inv.dueDate && inv.dueDate < todayStr,
    );
    const overdueAmount = overdueInvoices.reduce(
      (sum, inv) => sum + inv.grandTotal,
      0,
    );

    // Unpaid: confirmed invoices with no payment recorded
    const paidInvoiceIds = new Set(payments.map((p) => p.invoiceId));
    const unpaidInvoices = salesServiceInvoices.filter(
      (inv) => inv.status === "confirmed" && !paidInvoiceIds.has(inv.id),
    );

    // GST due dates
    const now = new Date();
    const gstr1Due = new Date(now.getFullYear(), now.getMonth() + 1, 11);
    const gstr3bDue = new Date(now.getFullYear(), now.getMonth() + 1, 20);
    const daysToGstr1 = Math.ceil(
      (gstr1Due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysToGstr3b = Math.ceil(
      (gstr3bDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      overdueCount: overdueInvoices.length,
      overdueAmount,
      unpaidCount: unpaidInvoices.length,
      daysToGstr1,
      daysToGstr3b,
    };
  }, [invoices, payments]);

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
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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

      {/* Workflow Alerts */}
      <Card
        className="bg-card border-border/70"
        data-ocid="dashboard.alerts.section"
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-chart-4" />
            Workflow Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              className={`p-3 rounded-lg border ${alerts.daysToGstr1 <= 5 ? "bg-chart-4/5 border-chart-4/20" : "bg-muted/50 border-border/50"}`}
            >
              <p className="text-xs text-muted-foreground mb-1 font-medium">
                GSTR-1 Due
              </p>
              <p
                className={`text-lg font-cabinet font-bold leading-none ${alerts.daysToGstr1 <= 5 ? "text-chart-4" : "text-foreground"}`}
              >
                {alerts.daysToGstr1}d
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {alerts.daysToGstr1 <= 5 ? "⚠️ Filing soon" : "days remaining"}
              </p>
            </div>

            {/* GSTR-3B Due */}
            <div
              className={`p-3 rounded-lg border ${alerts.daysToGstr3b <= 5 ? "bg-chart-4/5 border-chart-4/20" : "bg-muted/50 border-border/50"}`}
            >
              <p className="text-xs text-muted-foreground mb-1 font-medium">
                GSTR-3B Due
              </p>
              <p
                className={`text-lg font-cabinet font-bold leading-none ${alerts.daysToGstr3b <= 5 ? "text-chart-4" : "text-foreground"}`}
              >
                {alerts.daysToGstr3b}d
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {alerts.daysToGstr3b <= 5 ? "⚠️ Filing soon" : "days remaining"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
            <div className="flex items-end justify-between">
              <p className="text-3xl font-cabinet font-bold text-primary">
                {stats.complianceHealth}%
              </p>
              <Badge
                variant={
                  stats.complianceHealth >= 80 ? "default" : "destructive"
                }
              >
                {stats.complianceHealth >= 80 ? "Healthy" : "Needs Attention"}
              </Badge>
            </div>
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
          <ShoppingCartIcon className="w-4 h-4" />
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
                  <TableRow key={inv.id} data-ocid={`invoice.item.${idx + 1}`}>
                    <TableCell className="pl-4 font-mono text-xs text-primary">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-sm">{inv.partyName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(inv.date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ShoppingCartIcon({ className }: { className?: string }) {
  return <Package className={className} />;
}
