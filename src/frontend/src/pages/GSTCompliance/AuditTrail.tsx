import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAuditLogs, useInvoices, usePurchases } from "@/hooks/useGSTStore";
import { formatDateTime } from "@/utils/formatting";
import { History } from "lucide-react";
import { useState } from "react";

export function AuditTrail() {
  const { logs } = useAuditLogs();
  const { invoices } = useInvoices();
  const { purchases } = usePurchases();
  const [actionFilter, setActionFilter] = useState("all");

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

  const filteredLogs =
    actionFilter === "all"
      ? syntheticLogs
      : syntheticLogs.filter((log) =>
          log.action.toLowerCase().includes(actionFilter.toLowerCase()),
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-sm font-medium text-muted-foreground">
          Showing {filteredLogs.length} of {syntheticLogs.length} events
        </h1>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger
            className="w-44"
            data-ocid="audit.action_filter.select"
          >
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="view">View</SelectItem>
            <SelectItem value="export">Export</SelectItem>
            <SelectItem value="file">File</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-card border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            Audit Trail ({syntheticLogs.length} events)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div
              className="p-8 text-center text-sm text-muted-foreground"
              data-ocid="audit.empty_state"
            >
              No audit events found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
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
                    {filteredLogs.slice(0, 100).map((log, idx) => (
                      <TableRow
                        key={log.id}
                        data-ocid={`audit.item.${idx + 1}`}
                      >
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
              </div>
              {filteredLogs.length > 100 && (
                <p className="text-xs text-muted-foreground p-3 text-right border-t border-border/50">
                  Showing latest 100 of {filteredLogs.length} events
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
