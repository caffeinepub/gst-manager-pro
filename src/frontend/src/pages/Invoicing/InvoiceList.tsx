import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useAuditLogs, useInvoices } from "@/hooks/useGSTStore";
import { useSwipeToDelete } from "@/hooks/useSwipeToDelete";
import type { Invoice, InvoiceType } from "@/types/gst";
import { formatDate, formatINR } from "@/utils/formatting";
import { Edit, Eye, FileText, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { InvoiceForm } from "./InvoiceForm";

const TYPE_LABELS: Record<InvoiceType | "all", string> = {
  all: "All Invoices",
  sales: "Sales Invoice",
  service: "Service Invoice",
  einvoice: "e-Invoice",
  quotation: "Quotation",
  proforma: "Proforma Invoice",
  eway_bill: "e-Way Bill",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
  bill_of_supply: "Bill of Supply",
  delivery_challan: "Delivery Challan",
};

interface InvoiceListProps {
  type: InvoiceType | "all";
}

// Swipeable card component for mobile invoice rows
function SwipeableInvoiceCard({
  inv,
  idx,
  onView,
  onEdit,
  onDelete,
  statusVariant,
}: {
  inv: Invoice;
  idx: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  statusVariant: (
    s: string,
  ) => "default" | "secondary" | "destructive" | "outline";
}) {
  const { swipeX, onTouchStart, onTouchMove, onTouchEnd } =
    useSwipeToDelete(onDelete);
  const isRevealed = swipeX < -40;

  return (
    <div className="relative overflow-hidden">
      {/* Delete background */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end bg-destructive px-4 transition-opacity"
        style={{ opacity: isRevealed ? 1 : 0 }}
        aria-hidden="true"
      >
        <Trash2 className="w-5 h-5 text-destructive-foreground" />
        <span className="text-destructive-foreground text-xs ml-1 font-medium">
          Delete
        </span>
      </div>
      {/* Card content */}
      <div
        className="px-4 py-3 space-y-2 bg-card relative z-10 transition-transform touch-pan-y"
        style={{ transform: `translateX(${swipeX}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        data-ocid={`invoice.item.${idx + 1}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-primary font-medium">
                {inv.invoiceNumber}
              </span>
              <Badge variant="outline" className="text-[10px] capitalize">
                {inv.type.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="text-sm truncate mt-0.5">{inv.partyName}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(inv.date)}
              {inv.dueDate && ` · Due ${formatDate(inv.dueDate)}`}
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
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground"
            onClick={onView}
            data-ocid={`invoice.view_button.${idx + 1}`}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={onEdit}
            data-ocid={`invoice.edit_button.${idx + 1}`}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-destructive hover:text-destructive"
            onClick={onDelete}
            data-ocid={`invoice.delete_button.${idx + 1}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function InvoiceList({ type }: InvoiceListProps) {
  const { invoices, deleteInvoice } = useInvoices();
  const { addLog } = useAuditLogs();
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>(
    undefined,
  );
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | undefined>(
    undefined,
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const typeInvoices =
    type === "all" ? invoices : invoices.filter((inv) => inv.type === type);
  const filtered = typeInvoices.filter((inv) => {
    const matchSearch =
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.partyName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCreate = () => {
    setEditingInvoice(undefined);
    setViewingInvoice(undefined);
    setShowForm(true);
  };

  const openEdit = (inv: Invoice) => {
    setEditingInvoice(inv);
    setViewingInvoice(undefined);
    setShowForm(true);
  };

  const openView = (inv: Invoice) => {
    setViewingInvoice(inv);
    setEditingInvoice(undefined);
    setShowForm(true);
  };

  if (showForm) {
    return (
      <InvoiceForm
        type={type === "all" ? "sales" : type}
        editingInvoice={viewingInvoice ?? editingInvoice}
        onClose={() => {
          setShowForm(false);
          setEditingInvoice(undefined);
          setViewingInvoice(undefined);
        }}
        viewOnly={!!viewingInvoice}
      />
    );
  }

  const statusVariant = (
    s: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (s === "confirmed") return "default";
    if (s === "cancelled") return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-4" data-ocid="invoice.section">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder={`Search ${TYPE_LABELS[type]}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
              data-ocid="invoice.search_input"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36" data-ocid="invoice.status.select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={openCreate}
          data-ocid="invoice.add_button"
          className="gap-2"
        >
          <Plus className="w-4 h-4" /> New {TYPE_LABELS[type]}
        </Button>
      </div>

      <Card className="bg-card border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            {TYPE_LABELS[type]} ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center" data-ocid="invoice.empty_state">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                No {TYPE_LABELS[type].toLowerCase()}s found
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={openCreate}
              >
                Create First {TYPE_LABELS[type]}
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
                      <TableHead>Due Date</TableHead>
                      <TableHead>Taxable</TableHead>
                      <TableHead>GST</TableHead>
                      <TableHead className="text-right">Grand Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((inv, idx) => (
                      <TableRow
                        key={inv.id}
                        data-ocid={`invoice.item.${idx + 1}`}
                      >
                        <TableCell className="pl-4 font-mono text-xs text-primary font-medium">
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell className="text-sm">
                          {inv.partyName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(inv.date)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(inv.dueDate)}
                        </TableCell>
                        <TableCell className="font-numeric text-sm">
                          {formatINR(inv.subtotal - inv.totalDiscount)}
                        </TableCell>
                        <TableCell className="font-numeric text-sm text-primary">
                          {formatINR(
                            inv.totalCgst + inv.totalSgst + inv.totalIgst,
                          )}
                        </TableCell>
                        <TableCell className="text-right font-numeric font-bold">
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
                        <TableCell className="text-right pr-4">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground"
                              onClick={() => openView(inv)}
                              data-ocid={`invoice.view_button.${idx + 1}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(inv)}
                              data-ocid={`invoice.edit_button.${idx + 1}`}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(inv.id)}
                              data-ocid={`invoice.delete_button.${idx + 1}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile card list - swipe left to delete */}
              <div className="md:hidden divide-y divide-border">
                {filtered.map((inv, idx) => (
                  <SwipeableInvoiceCard
                    key={inv.id}
                    inv={inv}
                    idx={idx}
                    onView={() => openView(inv)}
                    onEdit={() => openEdit(inv)}
                    onDelete={() => setDeleteId(inv.id)}
                    statusVariant={statusVariant}
                  />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent data-ocid="invoice.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="invoice.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              data-ocid="invoice.delete.confirm_button"
              onClick={() => {
                if (deleteId) {
                  deleteInvoice(deleteId);
                  addLog({
                    entity: "Invoicing",
                    action: "delete",
                    entityId: deleteId,
                    description: `Deleted invoice ${deleteId}`,
                  });
                  toast.success("Invoice deleted");
                  setDeleteId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
