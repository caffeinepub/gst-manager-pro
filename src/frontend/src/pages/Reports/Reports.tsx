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
import { useBusinessLogo, useLocalBusinessName } from "@/hooks/useBusinessLogo";
import {
  useBankAccounts,
  useInvoices,
  useJournalEntries,
  usePurchases,
} from "@/hooks/useGSTStore";
import { useBusinessProfile } from "@/hooks/useQueries";
import type { AppPage } from "@/types/gst";
import { formatDate, formatINR, getCurrentMonth } from "@/utils/formatting";
import { downloadReportPDF } from "@/utils/pdfExport";
import { Download, FileText } from "lucide-react";
import { useState } from "react";

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface ReportsProps {
  page: AppPage;
}

export function Reports({ page }: ReportsProps) {
  const { invoices } = useInvoices();
  const { purchases } = usePurchases();
  const { entries } = useJournalEntries();
  const { accounts } = useBankAccounts();
  const { start: defStart, end: defEnd } = getCurrentMonth();
  const [dateFrom, setDateFrom] = useState(defStart);
  const [dateTo, setDateTo] = useState(defEnd);

  const FilterBar = ({ onExport }: { onExport: () => void }) => (
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
            />
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
          </div>
          <Button
            variant="outline"
            onClick={onExport}
            className="gap-2"
            data-ocid="report.export.button"
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (page === "reports-sales") {
    const filtered = invoices.filter(
      (inv) =>
        ["sales", "service"].includes(inv.type) &&
        inv.date >= dateFrom &&
        inv.date <= dateTo,
    );
    const exportSales = () => {
      const rows: string[][] = [
        [
          "Invoice #",
          "Date",
          "Party",
          "Taxable",
          "CGST",
          "SGST",
          "IGST",
          "Grand Total",
          "Status",
        ],
        ...filtered.map((inv) => [
          inv.invoiceNumber,
          inv.date,
          inv.partyName,
          String((inv.subtotal - inv.totalDiscount).toFixed(2)),
          String(inv.totalCgst.toFixed(2)),
          String(inv.totalSgst.toFixed(2)),
          String(inv.totalIgst.toFixed(2)),
          String(inv.grandTotal.toFixed(2)),
          inv.status,
        ]),
        [
          "TOTAL",
          "",
          `${filtered.length} invoices`,
          String(
            filtered
              .reduce((s, inv) => s + (inv.subtotal - inv.totalDiscount), 0)
              .toFixed(2),
          ),
          String(filtered.reduce((s, inv) => s + inv.totalCgst, 0).toFixed(2)),
          String(filtered.reduce((s, inv) => s + inv.totalSgst, 0).toFixed(2)),
          String(filtered.reduce((s, inv) => s + inv.totalIgst, 0).toFixed(2)),
          String(filtered.reduce((s, inv) => s + inv.grandTotal, 0).toFixed(2)),
          "",
        ],
      ];
      downloadCSV(`sales-register-${dateFrom}-to-${dateTo}.csv`, rows);
    };
    return (
      <div className="space-y-4" data-ocid="report.sales.section">
        <FilterBar onExport={exportSales} />
        <Card className="bg-card border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Sales Register ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div
                className="p-8 text-center text-sm text-muted-foreground"
                data-ocid="report.sales.empty_state"
              >
                No sales found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-ocid="report.sales.table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Party</TableHead>
                      <TableHead>Taxable</TableHead>
                      <TableHead>CGST</TableHead>
                      <TableHead>SGST</TableHead>
                      <TableHead>IGST</TableHead>
                      <TableHead className="text-right">Grand Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((inv, idx) => (
                      <TableRow
                        key={inv.id}
                        data-ocid={`report.sales.item.${idx + 1}`}
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
                        <TableCell className="font-numeric text-sm">
                          {formatINR(inv.subtotal - inv.totalDiscount)}
                        </TableCell>
                        <TableCell className="font-numeric text-sm">
                          {formatINR(inv.totalCgst)}
                        </TableCell>
                        <TableCell className="font-numeric text-sm">
                          {formatINR(inv.totalSgst)}
                        </TableCell>
                        <TableCell className="font-numeric text-sm">
                          {formatINR(inv.totalIgst)}
                        </TableCell>
                        <TableCell className="text-right font-numeric font-bold">
                          {formatINR(inv.grandTotal)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              inv.status === "confirmed"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs capitalize"
                          >
                            {inv.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2 bg-muted/30">
                      <TableCell className="pl-4" colSpan={3}>
                        Total ({filtered.length} invoices)
                      </TableCell>
                      <TableCell className="font-numeric">
                        {formatINR(
                          filtered.reduce(
                            (s, inv) => s + (inv.subtotal - inv.totalDiscount),
                            0,
                          ),
                        )}
                      </TableCell>
                      <TableCell className="font-numeric">
                        {formatINR(
                          filtered.reduce((s, inv) => s + inv.totalCgst, 0),
                        )}
                      </TableCell>
                      <TableCell className="font-numeric">
                        {formatINR(
                          filtered.reduce((s, inv) => s + inv.totalSgst, 0),
                        )}
                      </TableCell>
                      <TableCell className="font-numeric">
                        {formatINR(
                          filtered.reduce((s, inv) => s + inv.totalIgst, 0),
                        )}
                      </TableCell>
                      <TableCell className="text-right font-numeric">
                        {formatINR(
                          filtered.reduce((s, inv) => s + inv.grandTotal, 0),
                        )}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (page === "reports-purchase") {
    const filtered = purchases.filter(
      (p) => p.billDate >= dateFrom && p.billDate <= dateTo,
    );
    const exportPurchase = () => {
      const rows: string[][] = [
        [
          "Bill #",
          "Date",
          "Vendor",
          "Taxable",
          "CGST",
          "SGST",
          "IGST",
          "RCM",
          "Grand Total",
        ],
        ...filtered.map((p) => [
          p.billNumber,
          p.billDate,
          p.vendorName,
          String((p.subtotal - p.totalDiscount).toFixed(2)),
          String(p.totalCgst.toFixed(2)),
          String(p.totalSgst.toFixed(2)),
          String(p.totalIgst.toFixed(2)),
          p.isRcm ? "Yes" : "No",
          String(p.grandTotal.toFixed(2)),
        ]),
        [
          "TOTAL",
          "",
          `${filtered.length} bills`,
          String(
            filtered
              .reduce((s, p) => s + (p.subtotal - p.totalDiscount), 0)
              .toFixed(2),
          ),
          String(filtered.reduce((s, p) => s + p.totalCgst, 0).toFixed(2)),
          String(filtered.reduce((s, p) => s + p.totalSgst, 0).toFixed(2)),
          String(filtered.reduce((s, p) => s + p.totalIgst, 0).toFixed(2)),
          "",
          String(filtered.reduce((s, p) => s + p.grandTotal, 0).toFixed(2)),
        ],
      ];
      downloadCSV(`purchase-register-${dateFrom}-to-${dateTo}.csv`, rows);
    };
    return (
      <div className="space-y-4" data-ocid="report.purchase.section">
        <FilterBar onExport={exportPurchase} />
        <Card className="bg-card border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Purchase Register ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div
                className="p-8 text-center text-sm text-muted-foreground"
                data-ocid="report.purchase.empty_state"
              >
                No purchases found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-ocid="report.purchase.table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Bill #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Taxable</TableHead>
                      <TableHead>CGST</TableHead>
                      <TableHead>SGST</TableHead>
                      <TableHead>RCM</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p, idx) => (
                      <TableRow
                        key={p.id}
                        data-ocid={`report.purchase.item.${idx + 1}`}
                      >
                        <TableCell className="pl-4 font-mono text-xs text-primary">
                          {p.billNumber}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(p.billDate)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {p.vendorName}
                        </TableCell>
                        <TableCell className="font-numeric text-sm">
                          {formatINR(p.subtotal - p.totalDiscount)}
                        </TableCell>
                        <TableCell className="font-numeric text-sm">
                          {formatINR(p.totalCgst)}
                        </TableCell>
                        <TableCell className="font-numeric text-sm">
                          {formatINR(p.totalSgst)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={p.isRcm ? "outline" : "secondary"}
                            className="text-xs"
                          >
                            {p.isRcm ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-numeric font-bold">
                          {formatINR(p.grandTotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2 bg-muted/30">
                      <TableCell className="pl-4" colSpan={3}>
                        Total ({filtered.length} bills)
                      </TableCell>
                      <TableCell className="font-numeric">
                        {formatINR(
                          filtered.reduce(
                            (s, p) => s + (p.subtotal - p.totalDiscount),
                            0,
                          ),
                        )}
                      </TableCell>
                      <TableCell className="font-numeric">
                        {formatINR(
                          filtered.reduce((s, p) => s + p.totalCgst, 0),
                        )}
                      </TableCell>
                      <TableCell className="font-numeric">
                        {formatINR(
                          filtered.reduce((s, p) => s + p.totalSgst, 0),
                        )}
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-right font-numeric">
                        {formatINR(
                          filtered.reduce((s, p) => s + p.grandTotal, 0),
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (page === "reports-gst-summary") {
    const months: Record<
      string,
      { sales: number; cgst: number; sgst: number; igst: number; cess: number }
    > = {};
    for (const inv of invoices.filter((inv) => inv.status === "confirmed")) {
      const month = inv.date.slice(0, 7);
      if (!months[month])
        months[month] = { sales: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 };
      months[month].sales += inv.grandTotal;
      months[month].cgst += inv.totalCgst;
      months[month].sgst += inv.totalSgst;
      months[month].igst += inv.totalIgst;
      months[month].cess += inv.totalCess;
    }
    const rows = Object.entries(months).sort((a, b) =>
      b[0].localeCompare(a[0]),
    );
    return (
      <div className="space-y-4" data-ocid="report.gst.section">
        <Card className="bg-card border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">GST Summary by Month</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <div
                className="p-8 text-center text-sm text-muted-foreground"
                data-ocid="report.gst.empty_state"
              >
                No data
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-ocid="report.gst.table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Month</TableHead>
                      <TableHead className="text-right">Total Sales</TableHead>
                      <TableHead className="text-right">CGST</TableHead>
                      <TableHead className="text-right">SGST</TableHead>
                      <TableHead className="text-right">IGST</TableHead>
                      <TableHead className="text-right">Cess</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(([month, d], idx) => (
                      <TableRow
                        key={month}
                        data-ocid={`report.gst.item.${idx + 1}`}
                      >
                        <TableCell className="pl-4 font-medium">
                          {month}
                        </TableCell>
                        <TableCell className="text-right font-numeric">
                          {formatINR(d.sales)}
                        </TableCell>
                        <TableCell className="text-right font-numeric text-primary">
                          {formatINR(d.cgst)}
                        </TableCell>
                        <TableCell className="text-right font-numeric text-primary">
                          {formatINR(d.sgst)}
                        </TableCell>
                        <TableCell className="text-right font-numeric text-chart-2">
                          {formatINR(d.igst)}
                        </TableCell>
                        <TableCell className="text-right font-numeric">
                          {formatINR(d.cess)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (page === "reports-ar-ageing" || page === "reports-ap-ageing") {
    const isAR = page === "reports-ar-ageing";
    const list = isAR
      ? invoices.filter(
          (inv) =>
            ["sales", "service"].includes(inv.type) &&
            inv.status === "confirmed",
        )
      : purchases.filter((p) => p.status === "confirmed");

    const now = new Date();
    const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };

    for (const item of list) {
      const dateStr = item.dueDate;
      const diff = Math.ceil(
        (now.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24),
      );
      const amount = item.grandTotal;
      if (diff <= 30) buckets["0-30"] += amount;
      else if (diff <= 60) buckets["31-60"] += amount;
      else if (diff <= 90) buckets["61-90"] += amount;
      else buckets["90+"] += amount;
    }

    return (
      <div
        className="space-y-4"
        data-ocid={`report.${isAR ? "ar" : "ap"}.section`}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(buckets).map(([label, amount]) => (
            <Card key={label} className="bg-card border-border/70">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{label} Days</p>
                <p className="text-xl font-cabinet font-bold font-numeric text-primary">
                  {formatINR(amount)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="bg-card border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {isAR ? "Accounts Receivable" : "Accounts Payable"} Ageing
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {list.length === 0 ? (
              <div
                className="p-8 text-center text-sm text-muted-foreground"
                data-ocid={`report.${isAR ? "ar" : "ap"}.empty_state`}
              >
                No data
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Reference #</TableHead>
                      <TableHead>Party</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Days Overdue</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((item, idx) => {
                      const dueDate = item.dueDate;
                      const diff = Math.ceil(
                        (now.getTime() - new Date(dueDate).getTime()) /
                          (1000 * 60 * 60 * 24),
                      );
                      const ref =
                        "invoiceNumber" in item
                          ? item.invoiceNumber
                          : item.billNumber;
                      const party =
                        "partyName" in item ? item.partyName : item.vendorName;
                      return (
                        <TableRow
                          key={item.id}
                          data-ocid={`report.${isAR ? "ar" : "ap"}.item.${idx + 1}`}
                        >
                          <TableCell className="pl-4 font-mono text-xs text-primary">
                            {ref}
                          </TableCell>
                          <TableCell className="text-sm">{party}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(dueDate)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                diff > 90
                                  ? "destructive"
                                  : diff > 30
                                    ? "outline"
                                    : "secondary"
                              }
                              className="text-xs"
                            >
                              {diff > 0 ? `${diff} days` : "Not due"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-numeric font-bold">
                            {formatINR(item.grandTotal)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (page === "reports-trial-balance") {
    const accountTotals: Record<
      string,
      { debit: number; credit: number; name: string }
    > = {};
    for (const entry of entries) {
      for (const line of entry.lines) {
        if (!accountTotals[line.accountCode]) {
          accountTotals[line.accountCode] = {
            debit: 0,
            credit: 0,
            name: line.accountName,
          };
        }
        if (line.type === "debit")
          accountTotals[line.accountCode].debit += line.amount;
        else accountTotals[line.accountCode].credit += line.amount;
      }
    }

    const rows = Object.entries(accountTotals);
    const totalDr = rows.reduce((s, [, v]) => s + v.debit, 0);
    const totalCr = rows.reduce((s, [, v]) => s + v.credit, 0);

    return (
      <div className="space-y-4" data-ocid="report.trial.section">
        <Card className="bg-card border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Trial Balance</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <div
                className="p-8 text-center text-sm text-muted-foreground"
                data-ocid="report.trial.empty_state"
              >
                No journal entries found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-ocid="report.trial.table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Account Code</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(([code, v], idx) => (
                      <TableRow
                        key={code}
                        data-ocid={`report.trial.item.${idx + 1}`}
                      >
                        <TableCell className="pl-4 font-mono text-xs text-primary">
                          {code}
                        </TableCell>
                        <TableCell className="text-sm">{v.name}</TableCell>
                        <TableCell className="text-right font-numeric">
                          {v.debit > 0 ? formatINR(v.debit) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-numeric">
                          {v.credit > 0 ? formatINR(v.credit) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2">
                      <TableCell className="pl-4" colSpan={2}>
                        Total
                      </TableCell>
                      <TableCell className="text-right font-numeric">
                        {formatINR(totalDr)}
                      </TableCell>
                      <TableCell className="text-right font-numeric">
                        {formatINR(totalCr)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (page === "reports-pl") {
    const income = invoices
      .filter(
        (inv) =>
          ["sales", "service"].includes(inv.type) &&
          inv.status === "confirmed" &&
          inv.date >= dateFrom &&
          inv.date <= dateTo,
      )
      .reduce((s, inv) => s + inv.grandTotal, 0);
    const expenses = purchases
      .filter(
        (p) =>
          p.status === "confirmed" &&
          p.billDate >= dateFrom &&
          p.billDate <= dateTo,
      )
      .reduce((s, p) => s + p.grandTotal, 0);
    const profit = income - expenses;

    const exportPL = () => {
      const rows: string[][] = [
        ["Profit & Loss Statement", `${dateFrom} to ${dateTo}`],
        [],
        ["Category", "Description", "Amount (₹)"],
        ["Income", "Sales Revenue", String(income.toFixed(2))],
        ["Income", "Total Income", String(income.toFixed(2))],
        ["Expenses", "Cost of Purchases", String(expenses.toFixed(2))],
        ["Expenses", "Total Expenses", String(expenses.toFixed(2))],
        [
          "Net",
          profit >= 0 ? "Net Profit" : "Net Loss",
          String(Math.abs(profit).toFixed(2)),
        ],
      ];
      downloadCSV(`profit-loss-${dateFrom}-to-${dateTo}.csv`, rows);
    };

    return (
      <div className="space-y-4" data-ocid="report.pl.section">
        <FilterBar onExport={exportPL} />
        <Card className="bg-card border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Profit & Loss Statement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="font-semibold">Income</span>
                <span />
              </div>
              <div className="flex justify-between py-1 text-sm">
                <span className="text-muted-foreground pl-4">
                  Sales Revenue
                </span>
                <span className="font-numeric">{formatINR(income)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border font-semibold">
                <span>Total Income</span>
                <span className="font-numeric text-primary">
                  {formatINR(income)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-border mt-3">
                <span className="font-semibold">Expenses</span>
                <span />
              </div>
              <div className="flex justify-between py-1 text-sm">
                <span className="text-muted-foreground pl-4">
                  Cost of Purchases
                </span>
                <span className="font-numeric">{formatINR(expenses)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border font-semibold">
                <span>Total Expenses</span>
                <span className="font-numeric text-destructive">
                  {formatINR(expenses)}
                </span>
              </div>
              <div className="flex justify-between py-3 bg-primary/10 rounded-lg px-3 font-bold text-lg">
                <span>Net Profit / (Loss)</span>
                <span
                  className={`font-numeric ${profit >= 0 ? "text-primary" : "text-destructive"}`}
                >
                  {formatINR(profit)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (page === "reports-balance-sheet") {
    const bankBalance = accounts.reduce((s, a) => s + a.openingBalance, 0);
    const receivables = invoices
      .filter((inv) => inv.status === "confirmed")
      .reduce((s, inv) => s + inv.grandTotal, 0);
    const payables = purchases
      .filter((p) => p.status === "confirmed")
      .reduce((s, p) => s + p.grandTotal, 0);

    return (
      <div className="space-y-4" data-ocid="report.bs.section">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="bg-card border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Cash & Bank</span>
                  <span className="font-numeric">{formatINR(bankBalance)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">
                    Trade Receivables
                  </span>
                  <span className="font-numeric">{formatINR(receivables)}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-border font-bold">
                  <span>Total Assets</span>
                  <span className="font-numeric text-primary">
                    {formatINR(bankBalance + receivables)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Liabilities & Equity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Trade Payables</span>
                  <span className="font-numeric">{formatINR(payables)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Owner's Equity</span>
                  <span className="font-numeric">
                    {formatINR(bankBalance + receivables - payables)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-t border-border font-bold">
                  <span>Total L + E</span>
                  <span className="font-numeric text-primary">
                    {formatINR(bankBalance + receivables)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="text-muted-foreground text-sm p-4">
      Select a report from the sidebar
    </div>
  );
}
