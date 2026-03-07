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
import { RefreshCw } from "lucide-react";
import { useMemo } from "react";

export function ITCReconciliation() {
  const { purchases } = usePurchases();

  const data = useMemo(() => {
    const eligible = purchases.filter(
      (p) => p.itcEligible && p.status === "confirmed",
    );
    const blocked = purchases.filter(
      (p) => !p.itcEligible && p.status === "confirmed",
    );

    return {
      eligible,
      blocked,
      totalEligibleCgst: eligible.reduce((s, p) => s + p.totalCgst, 0),
      totalEligibleSgst: eligible.reduce((s, p) => s + p.totalSgst, 0),
      totalEligibleIgst: eligible.reduce((s, p) => s + p.totalIgst, 0),
      totalBlocked: blocked.reduce(
        (s, p) => s + p.totalCgst + p.totalSgst + p.totalIgst,
        0,
      ),
    };
  }, [purchases]);

  return (
    <div className="space-y-4" data-ocid="itc.section">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">ITC CGST</p>
            <p className="text-xl font-cabinet font-bold text-primary font-numeric">
              {formatINR(data.totalEligibleCgst)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">ITC SGST</p>
            <p className="text-xl font-cabinet font-bold text-primary font-numeric">
              {formatINR(data.totalEligibleSgst)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">ITC IGST</p>
            <p className="text-xl font-cabinet font-bold text-chart-2 font-numeric">
              {formatINR(data.totalEligibleIgst)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Blocked ITC</p>
            <p className="text-xl font-cabinet font-bold text-destructive font-numeric">
              {formatINR(data.totalBlocked)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            ITC Eligible Purchases ({data.eligible.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.eligible.length === 0 ? (
            <div
              className="p-8 text-center text-sm text-muted-foreground"
              data-ocid="itc.empty_state"
            >
              No ITC eligible purchases
            </div>
          ) : (
            <Table data-ocid="itc.list.table">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Bill #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>CGST</TableHead>
                  <TableHead>SGST</TableHead>
                  <TableHead>IGST</TableHead>
                  <TableHead>Total ITC</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.eligible.map((p, idx) => (
                  <TableRow key={p.id} data-ocid={`itc.item.${idx + 1}`}>
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
                    <TableCell className="font-numeric text-sm">
                      {formatINR(p.totalIgst)}
                    </TableCell>
                    <TableCell className="font-numeric font-bold">
                      {formatINR(p.totalCgst + p.totalSgst + p.totalIgst)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="text-xs">
                        Eligible
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
