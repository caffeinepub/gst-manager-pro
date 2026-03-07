import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  useBankAccounts,
  useBankTransactions,
  useInvoices,
} from "@/hooks/useGSTStore";
import { formatDate, formatINR, getCurrentMonth } from "@/utils/formatting";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

export function BankReconciliation() {
  const { accounts } = useBankAccounts();
  const { transactions } = useBankTransactions();
  const { invoices } = useInvoices();
  const { start: defaultStart, end: defaultEnd } = getCurrentMonth();

  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [fromDate, setFromDate] = useState(defaultStart);
  const [toDate, setToDate] = useState(defaultEnd);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const inAccount =
        selectedAccountId === "all" || t.accountId === selectedAccountId;
      const inRange = t.date >= fromDate && t.date <= toDate;
      return inAccount && inRange;
    });
  }, [transactions, selectedAccountId, fromDate, toDate]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const isSalesType = ["sales", "service"].includes(inv.type);
      const isConfirmed = inv.status === "confirmed";
      const inRange = inv.date >= fromDate && inv.date <= toDate;
      return isSalesType && isConfirmed && inRange;
    });
  }, [invoices, fromDate, toDate]);

  const { bankCreditsTotal, invoiceTotal, variance } = useMemo(() => {
    const bankCreditsTotal = filteredTransactions.reduce(
      (sum, t) => sum + t.credit,
      0,
    );
    const invoiceTotal = filteredInvoices.reduce(
      (sum, inv) => sum + inv.grandTotal,
      0,
    );
    const variance = Math.abs(bankCreditsTotal - invoiceTotal);
    return { bankCreditsTotal, invoiceTotal, variance };
  }, [filteredTransactions, filteredInvoices]);

  const isReconciled = variance < 1;

  return (
    <div className="space-y-4" data-ocid="reconciliation.section">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-cabinet font-bold text-foreground flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-primary" />
          Bank Reconciliation
        </h1>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border/70">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-4 flex-wrap items-end">
            <div className="space-y-1.5 min-w-52">
              <Label className="text-xs text-muted-foreground">
                Bank Account
              </Label>
              <Select
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
              >
                <SelectTrigger data-ocid="reconciliation.account.select">
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.bankName} - {acc.accountNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">From Date</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-sm w-40"
                data-ocid="reconciliation.from.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">To Date</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-sm w-40"
                data-ocid="reconciliation.to.input"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="bank">
        <TabsList className="mb-4">
          <TabsTrigger value="bank" data-ocid="reconciliation.bank.tab">
            Bank Transactions ({filteredTransactions.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" data-ocid="reconciliation.invoice.tab">
            Invoice Payments ({filteredInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="summary" data-ocid="reconciliation.summary.tab">
            Reconciliation Summary
          </TabsTrigger>
        </TabsList>

        {/* Bank Transactions Tab */}
        <TabsContent value="bank">
          <Card className="bg-card border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Bank Transactions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredTransactions.length === 0 ? (
                <div
                  className="p-12 text-center"
                  data-ocid="reconciliation.bank.empty_state"
                >
                  <RefreshCw className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    No bank transactions found for selected period
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right pr-4">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((txn, idx) => (
                      <TableRow
                        key={txn.id}
                        data-ocid={`reconciliation.bank.item.${idx + 1}`}
                      >
                        <TableCell className="pl-4 text-xs text-muted-foreground">
                          {formatDate(txn.date)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {txn.description}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {txn.reference || "-"}
                        </TableCell>
                        <TableCell className="text-right font-numeric text-sm text-chart-4">
                          {txn.debit > 0 ? formatINR(txn.debit) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-numeric text-sm text-chart-2">
                          {txn.credit > 0 ? formatINR(txn.credit) : "-"}
                        </TableCell>
                        <TableCell className="text-right pr-4 font-numeric font-medium">
                          {formatINR(txn.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoice Payments Tab */}
        <TabsContent value="invoices">
          <Card className="bg-card border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Confirmed Sales Invoices
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredInvoices.length === 0 ? (
                <div
                  className="p-12 text-center"
                  data-ocid="reconciliation.invoice.empty_state"
                >
                  <RefreshCw className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    No confirmed invoices found for selected period
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Party</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">CGST</TableHead>
                      <TableHead className="text-right">SGST/IGST</TableHead>
                      <TableHead className="text-right pr-4">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((inv, idx) => (
                      <TableRow
                        key={inv.id}
                        data-ocid={`reconciliation.invoice.item.${idx + 1}`}
                      >
                        <TableCell className="pl-4 font-mono text-xs text-primary">
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(inv.date)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {inv.partyName}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {inv.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-numeric text-sm">
                          {formatINR(inv.totalCgst)}
                        </TableCell>
                        <TableCell className="text-right font-numeric text-sm">
                          {inv.totalIgst > 0
                            ? formatINR(inv.totalIgst)
                            : formatINR(inv.totalSgst)}
                        </TableCell>
                        <TableCell className="text-right pr-4 font-numeric font-medium">
                          {formatINR(inv.grandTotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary">
          <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-card border-border/70">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Bank Credits
                  </p>
                  <p className="text-xl font-cabinet font-bold text-chart-2 font-numeric">
                    {formatINR(bankCreditsTotal)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {filteredTransactions.filter((t) => t.credit > 0).length}{" "}
                    credit transactions
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/70">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Invoice Total
                  </p>
                  <p className="text-xl font-cabinet font-bold text-primary font-numeric">
                    {formatINR(invoiceTotal)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {filteredInvoices.length} confirmed invoices
                  </p>
                </CardContent>
              </Card>
              <Card
                className={`border-border/70 ${isReconciled ? "bg-chart-2/5" : "bg-chart-3/5"}`}
              >
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Variance
                  </p>
                  <p
                    className={`text-xl font-cabinet font-bold font-numeric ${isReconciled ? "text-chart-2" : "text-chart-3"}`}
                  >
                    {formatINR(variance)}
                  </p>
                  <div className="mt-1">
                    {isReconciled ? (
                      <Badge
                        variant="default"
                        className="text-xs gap-1 bg-chart-2"
                        data-ocid="reconciliation.reconciled.badge"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Reconciled
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="text-xs gap-1 text-chart-3"
                        data-ocid="reconciliation.variance.badge"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Variance Detected
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Reconciliation Summary Table */}
            <Card className="bg-card border-border/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Reconciliation Statement
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Period</span>
                  <span className="font-medium">
                    {formatDate(fromDate)} — {formatDate(toDate)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">
                    Bank Credits (Total Credits in Bank Statement)
                  </span>
                  <span className="font-numeric font-medium text-chart-2">
                    {formatINR(bankCreditsTotal)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">
                    Invoice Total (Confirmed Sales & Service Invoices)
                  </span>
                  <span className="font-numeric font-medium text-primary">
                    {formatINR(invoiceTotal)}
                  </span>
                </div>
                <div className="flex justify-between py-2 font-semibold">
                  <span>Variance (Difference)</span>
                  <span
                    className={`font-numeric ${isReconciled ? "text-chart-2" : "text-chart-3"}`}
                  >
                    {formatINR(variance)}
                  </span>
                </div>
                <div className="mt-4 p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">
                    {isReconciled
                      ? "✅ Your bank credits match invoice totals. Accounts are reconciled for this period."
                      : "⚠️ Variance detected. Please check for missing bank entries, unrecorded invoices, or timing differences between bank and book records."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
