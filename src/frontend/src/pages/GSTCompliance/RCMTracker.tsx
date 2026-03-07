import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePurchases } from "@/hooks/useGSTStore";
import { formatDate, formatINR } from "@/utils/formatting";
import { PiggyBank } from "lucide-react";
import { useMemo } from "react";

export function RCMTracker() {
  const { purchases } = usePurchases();

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

  return (
    <div className="space-y-4" data-ocid="rcm.section">
      <div className="grid grid-cols-3 gap-3">
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
            <p className="text-xs text-muted-foreground">Total RCM Value</p>
            <p className="text-xl font-cabinet font-bold text-chart-4 font-numeric">
              {formatINR(totals.total)}
            </p>
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
            <Table data-ocid="rcm.list.table">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Bill #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>CGST (RCM)</TableHead>
                  <TableHead>SGST (RCM)</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rcmPurchases.map((p, idx) => (
                  <TableRow key={p.id} data-ocid={`rcm.item.${idx + 1}`}>
                    <TableCell className="pl-4 font-mono text-xs text-primary">
                      {p.billNumber}
                    </TableCell>
                    <TableCell className="text-sm">{p.vendorName}</TableCell>
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
