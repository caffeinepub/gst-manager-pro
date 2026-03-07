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
import { useAuditLogs, useInvoices, usePurchases } from "@/hooks/useGSTStore";
import { formatDateTime } from "@/utils/formatting";
import { History } from "lucide-react";

export function AuditTrail() {
  const { logs } = useAuditLogs();
  const { invoices } = useInvoices();
  const { purchases } = usePurchases();

  // Build synthetic audit log from invoices and purchases
  const syntheticLogs = [
    ...invoices.map((inv) => ({
      id: `inv-${inv.id}`,
      action: "create" as const,
      entity: "Invoice",
      entityId: inv.invoiceNumber,
      description: `Invoice ${inv.invoiceNumber} created for ${inv.partyName} - ${inv.status}`,
      timestamp: inv.createdAt,
    })),
    ...purchases.map((p) => ({
      id: `pur-${p.id}`,
      action: "create" as const,
      entity: "Purchase",
      entityId: p.billNumber,
      description: `Purchase ${p.billNumber} from ${p.vendorName} recorded`,
      timestamp: p.createdAt,
    })),
    ...logs,
  ].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  const actionVariant = (
    action: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (action === "create") return "default";
    if (action === "delete") return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-4" data-ocid="audit.section">
      <Card className="bg-card border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            Audit Trail ({syntheticLogs.length} events)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {syntheticLogs.length === 0 ? (
            <div
              className="p-8 text-center text-sm text-muted-foreground"
              data-ocid="audit.empty_state"
            >
              No audit events found
            </div>
          ) : (
            <>
              <Table data-ocid="audit.list.table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syntheticLogs.slice(0, 100).map((log, idx) => (
                    <TableRow key={log.id} data-ocid={`audit.item.${idx + 1}`}>
                      <TableCell className="pl-4 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={actionVariant(log.action)}
                          className="text-xs capitalize"
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{log.entity}</TableCell>
                      <TableCell className="font-mono text-xs text-primary">
                        {log.entityId}
                      </TableCell>
                      <TableCell className="text-sm max-w-64 truncate">
                        {log.description}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {syntheticLogs.length > 100 && (
                <p className="text-xs text-muted-foreground p-3 text-right border-t border-border/50">
                  Showing latest 100 of {syntheticLogs.length} events
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
