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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useInvoices, usePayments } from "@/hooks/useGSTStore";
import type { Payment } from "@/types/gst";
import { formatDate, formatINR, today } from "@/utils/formatting";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CreditCard,
  Plus,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function Payments() {
  const { invoices } = useInvoices();
  const { payments, addPayment, deletePayment } = usePayments();
  const [showDialog, setShowDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    invoiceId: "",
    amount: 0,
    date: today(),
    mode: "bank" as Payment["mode"],
    reference: "",
    notes: "",
    type: "received" as "received" | "paid",
  });

  const salesInvoices = invoices.filter(
    (inv) =>
      ["sales", "service"].includes(inv.type) && inv.status === "confirmed",
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inv = invoices.find((i) => i.id === form.invoiceId);
    if (!inv) {
      toast.error("Select an invoice");
      return;
    }
    if (form.amount <= 0) {
      toast.error("Amount must be > 0");
      return;
    }

    addPayment({
      ...form,
      invoiceNumber: inv.invoiceNumber,
      partyName: inv.partyName,
    });
    toast.success("Payment recorded");
    setShowDialog(false);
    setForm({
      invoiceId: "",
      amount: 0,
      date: today(),
      mode: "bank",
      reference: "",
      notes: "",
      type: "received",
    });
  };

  const totalReceived = payments
    .filter((p) => p.type === "received")
    .reduce((s, p) => s + p.amount, 0);
  const totalPaid = payments
    .filter((p) => p.type === "paid")
    .reduce((s, p) => s + p.amount, 0);
  const netAmount = totalReceived - totalPaid;

  return (
    <div className="space-y-4" data-ocid="payment.section">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Total Received
              </p>
              <ArrowDownCircle className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-cabinet font-bold text-primary font-numeric">
              {formatINR(totalReceived)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {payments.filter((p) => p.type === "received").length} payments
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Total Paid
              </p>
              <ArrowUpCircle className="w-4 h-4 text-chart-4" />
            </div>
            <p className="text-2xl font-cabinet font-bold text-chart-4 font-numeric">
              {formatINR(totalPaid)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {payments.filter((p) => p.type === "paid").length} payments
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Net Balance
              </p>
              <TrendingUp className="w-4 h-4 text-chart-3" />
            </div>
            <p
              className={`text-2xl font-cabinet font-bold font-numeric ${netAmount >= 0 ? "text-primary" : "text-destructive"}`}
            >
              {formatINR(netAmount)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Received minus paid
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => setShowDialog(true)}
          data-ocid="payment.add_button"
          className="gap-2"
        >
          <Plus className="w-4 h-4" /> Record Payment
        </Button>
      </div>

      <Card className="bg-card border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Payments ({payments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="p-12 text-center" data-ocid="payment.empty_state">
              <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                No payments recorded yet
              </p>
            </div>
          ) : (
            <Table data-ocid="payment.list.table">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Invoice #</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((pmt, idx) => (
                  <TableRow key={pmt.id} data-ocid={`payment.item.${idx + 1}`}>
                    <TableCell className="pl-4 font-mono text-xs text-primary">
                      {pmt.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-sm">{pmt.partyName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(pmt.date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {pmt.mode.replace("_", "/")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {pmt.reference || "-"}
                    </TableCell>
                    <TableCell className="text-right font-numeric font-medium">
                      {formatINR(pmt.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          pmt.type === "received" ? "default" : "secondary"
                        }
                        className="text-xs capitalize"
                      >
                        {pmt.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(pmt.id)}
                        data-ocid={`payment.delete_button.${idx + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent data-ocid="payment.dialog">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Invoice *</Label>
              <Select
                value={form.invoiceId}
                onValueChange={(v) => {
                  const inv = invoices.find((i) => i.id === v);
                  setForm((p) => ({
                    ...p,
                    invoiceId: v,
                    amount: inv?.grandTotal || 0,
                  }));
                }}
              >
                <SelectTrigger data-ocid="payment.invoice.select">
                  <SelectValue placeholder="Select invoice..." />
                </SelectTrigger>
                <SelectContent>
                  {salesInvoices.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - {inv.partyName} (
                      {formatINR(inv.grandTotal)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, amount: Number(e.target.value) }))
                  }
                  min="0.01"
                  step="0.01"
                  data-ocid="payment.amount.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, date: e.target.value }))
                  }
                  data-ocid="payment.date.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Payment Mode</Label>
                <Select
                  value={form.mode}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, mode: v as Payment["mode"] }))
                  }
                >
                  <SelectTrigger data-ocid="payment.mode.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="neft_rtgs">NEFT/RTGS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, type: v as "received" | "paid" }))
                  }
                >
                  <SelectTrigger data-ocid="payment.type.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reference / Cheque #</Label>
              <Input
                value={form.reference}
                onChange={(e) =>
                  setForm((p) => ({ ...p, reference: e.target.value }))
                }
                placeholder="Transaction reference"
                data-ocid="payment.reference.input"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                data-ocid="payment.cancel_button"
              >
                Cancel
              </Button>
              <Button type="submit" data-ocid="payment.submit_button">
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent data-ocid="payment.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="payment.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              data-ocid="payment.delete.confirm_button"
              onClick={() => {
                if (deleteId) {
                  deletePayment(deleteId);
                  toast.success("Payment deleted");
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
