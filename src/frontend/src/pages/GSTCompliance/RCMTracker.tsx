import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuditLogs, usePurchases } from "@/hooks/useGSTStore";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { formatDate, formatINR } from "@/utils/formatting";
import { CheckCircle2, PiggyBank } from "lucide-react";
import { useMemo } from "react";

export function RCMTracker() {
  const { purchases } = usePurchases();
  const [paidRcm, setPaidRcm] = useLocalStorage<string[]>("rcm_paid_ids", []);
  const { addLog } = useAuditLogs();

  const rcmPurchases = useMemo(
    () => purchases.filter((p) => p.isRcm && p.status === "confirmed"),
    [purchases],
  );

  const totals = useMemo(
    () => ({
      cgst: rcmPurchases.reduce((s, p) => s + p.totalCgst, 0),
      sgst: rcmPurchases.reduce((s, p) => s + p.totalSgst, 0),
      total: rcmPurchases.reduce((s, p) => s + p.grandTotal, 0),
    }),
    [rcmPurchases],
  );

  const paidCount = rcmPurchases.filter((p) => paidRcm.includes(p.id)).length;
  const pendingCount = rcmPurchases.length - paidCount;

  const markPaid = (id: string) => {
    setPaidRcm((prev) => (prev.includes(id) ? prev : [...prev, id]));
    addLog({
      action: "approve",
      entity: "RCM",
      entityId: id,
      description: "RCM tax marked as paid",
    });
  };

  return (
    <div className="space-y-4" data-ocid="rcm.section">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">RCM CGST Payable</p>
            <p className="text-xl font-cabinet font-bold text-primary font-numeric">
              {formatINR(totals.cgst)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">RCM SGST Payable</p>
            <p className="text-xl font-cabinet font-bold text-primary font-numeric">
              {formatINR(totals.sgst)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Tax Paid</p>
            <p className="text-xl font-cabinet font-bold text-chart-2 font-numeric">
              {paidCount}
            </p>
            <p className="text-xs text-muted-foreground">
              of {rcmPurchases.length} bills
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Pending Payment</p>
            <p className="text-xl font-cabinet font-bold text-chart-4 font-numeric">
              {pendingCount}
            </p>
            <p className="text-xs text-muted-foreground">bills pending</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-primary" />
            RCM Transactions ({rcmPurchases.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rcmPurchases.length === 0 ? (
            <div
              className="p-8 text-center text-sm text-muted-foreground"
              data-ocid="rcm.empty_state"
            >
              No RCM transactions found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="rcm.list.table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Bill #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>CGST (RCM)</TableHead>
                    <TableHead>SGST (RCM)</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rcmPurchases.map((p, idx) => {
                    const isPaid = paidRcm.includes(p.id);
                    return (
                      <TableRow key={p.id} data-ocid={`rcm.item.${idx + 1}`}>
                        <TableCell className="pl-4 font-mono text-xs text-primary">
                          {p.billNumber}
                        </TableCell>
                        <TableCell className="text-sm">
                          {p.vendorName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(p.billDate)}
                        </TableCell>
                        <TableCell className="font-numeric text-sm">
                          {formatINR(p.totalCgst)}
                        </TableCell>
                        <TableCell className="font-numeric text-sm">
                          {formatINR(p.totalSgst)}
                        </TableCell>
                        <TableCell className="text-right font-numeric font-bold">
                          {formatINR(p.grandTotal)}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          {isPaid ? (
                            <Badge
                              variant="default"
                              className="text-xs bg-chart-2 hover:bg-chart-2 gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Tax Paid
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => markPaid(p.id)}
                              data-ocid={`rcm.mark_paid.button.${idx + 1}`}
                            >
                              Mark Paid
                            </Button>
                          )}
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
