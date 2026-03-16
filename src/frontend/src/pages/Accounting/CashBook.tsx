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
import {
  useAuditLogs,
  useBankAccounts,
  useBankTransactions,
} from "@/hooks/useGSTStore";
import type { BankTransaction } from "@/types/gst";
import { formatDate, formatINR, today } from "@/utils/formatting";
import { Banknote, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function CashBook() {
  const { accounts } = useBankAccounts();
  const { transactions, addTransaction, deleteTransaction } =
    useBankTransactions();
  const { addLog } = useAuditLogs();
  const [showDialog, setShowDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterAccount, setFilterAccount] = useState("all");

  const [form, setForm] = useState({
    accountId: "",
    date: today(),
    description: "",
    debit: 0,
    credit: 0,
    reference: "",
  });

  const filtered =
    filterAccount === "all"
      ? transactions
      : transactions.filter((t) => t.accountId === filterAccount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accountId) {
      toast.error("Select an account");
      return;
    }
    if (form.debit === 0 && form.credit === 0) {
      toast.error("Enter debit or credit amount");
      return;
    }

    addTransaction({ ...form, balance: form.credit - form.debit });
    addLog({
      action: "create",
      entity: "CashBook",
      entityId: "",
      description: `Cash entry: ${form.description || "Transaction"} (Dr: ${form.debit}, Cr: ${form.credit})`,
    });
    toast.success("Transaction added");
    setShowDialog(false);
    setForm({
      accountId: "",
      date: today(),
      description: "",
      debit: 0,
      credit: 0,
      reference: "",
    });
  };

  const totalDebit = filtered.reduce((s, t) => s + t.debit, 0);
  const totalCredit = filtered.reduce((s, t) => s + t.credit, 0);

  // Calculate running balance sorted by date
  const sortedFiltered = [...filtered].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const runningBalances = new Map<string, number>();
  let runningTotal = 0;
  for (const txn of sortedFiltered) {
    runningTotal += txn.credit - txn.debit;
    runningBalances.set(txn.id, runningTotal);
  }

  return (
    <div className="space-y-4" data-ocid="cashbook.section">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border/70">
            <TrendingUp className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Total Credit</p>
              <p className="font-bold font-numeric text-sm text-primary">
                {formatINR(totalCredit)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border/70">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">Total Debit</p>
              <p className="font-bold font-numeric text-sm text-destructive">
                {formatINR(totalDebit)}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={filterAccount} onValueChange={setFilterAccount}>
            <SelectTrigger className="w-48" data-ocid="cashbook.account.select">
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.bankName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => setShowDialog(true)}
            data-ocid="cashbook.add_button"
            className="gap-2"
          >
            <Plus className="w-4 h-4" /> Add Transaction
          </Button>
        </div>
      </div>

      <Card className="bg-card border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Banknote className="w-4 h-4 text-primary" />
            Transactions ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center" data-ocid="cashbook.empty_state">
              <Banknote className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                No transactions recorded
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setShowDialog(true)}
              >
                Add Transaction
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="cashbook.list.table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Date</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((txn, idx) => {
                    const acc = accounts.find((a) => a.id === txn.accountId);
                    const balance = runningBalances.get(txn.id) ?? 0;
                    return (
                      <TableRow
                        key={txn.id}
                        data-ocid={`cashbook.item.${idx + 1}`}
                      >
                        <TableCell className="pl-4 text-xs text-muted-foreground">
                          {formatDate(txn.date)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {acc?.bankName || "Unknown"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {txn.description}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {txn.reference || "-"}
                        </TableCell>
                        <TableCell className="text-right font-numeric text-destructive">
                          {txn.debit > 0 ? formatINR(txn.debit) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-numeric text-primary">
                          {txn.credit > 0 ? formatINR(txn.credit) : "-"}
                        </TableCell>
                        <TableCell
                          className={`text-right font-numeric font-medium text-sm ${balance >= 0 ? "text-chart-2" : "text-destructive"}`}
                          data-ocid={`cashbook.balance.${idx + 1}`}
                        >
                          {formatINR(balance)}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(txn.id)}
                            data-ocid={`cashbook.delete_button.${idx + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent data-ocid="cashbook.dialog">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Account *</Label>
                <Select
                  value={form.accountId}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, accountId: v }))
                  }
                >
                  <SelectTrigger data-ocid="cashbook.acct.select">
                    <SelectValue placeholder="Select account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.bankName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, date: e.target.value }))
                  }
                  data-ocid="cashbook.date.input"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Transaction description"
                  data-ocid="cashbook.description.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Debit (₹)</Label>
                <Input
                  type="number"
                  value={form.debit}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, debit: Number(e.target.value) }))
                  }
                  min="0"
                  step="0.01"
                  data-ocid="cashbook.debit.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Credit (₹)</Label>
                <Input
                  type="number"
                  value={form.credit}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, credit: Number(e.target.value) }))
                  }
                  min="0"
                  step="0.01"
                  data-ocid="cashbook.credit.input"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Reference</Label>
                <Input
                  value={form.reference}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, reference: e.target.value }))
                  }
                  placeholder="Cheque no / UTR ref"
                  data-ocid="cashbook.reference.input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                data-ocid="cashbook.cancel_button"
              >
                Cancel
              </Button>
              <Button type="submit" data-ocid="cashbook.submit_button">
                Add Transaction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent data-ocid="cashbook.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="cashbook.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              data-ocid="cashbook.delete.confirm_button"
              onClick={() => {
                if (deleteId) {
                  deleteTransaction(deleteId);
                  toast.success("Transaction deleted");
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
