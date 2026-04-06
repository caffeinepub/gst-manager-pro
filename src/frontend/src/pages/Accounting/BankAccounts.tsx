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
import type { BankAccount } from "@/types/gst";
import { formatINR } from "@/utils/formatting";
import { Edit, Landmark, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const emptyAccount: Omit<BankAccount, "id" | "createdAt"> = {
  bankName: "",
  accountNumber: "",
  ifsc: "",
  openingBalance: 0,
  accountType: "current",
  isActive: true,
};

export function BankAccounts() {
  const { addLog } = useAuditLogs();
  const { accounts, addAccount, updateAccount, deleteAccount } =
    useBankAccounts();
  const { transactions } = useBankTransactions();
  const [showDialog, setShowDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(
    null,
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<BankAccount, "id" | "createdAt">>({
    ...emptyAccount,
  });

  const openAdd = () => {
    setEditingAccount(null);
    setForm({ ...emptyAccount });
    setShowDialog(true);
  };
  const openEdit = (a: BankAccount) => {
    setEditingAccount(a);
    setForm({ ...a });
    setShowDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bankName) {
      toast.error("Bank name required");
      return;
    }
    if (editingAccount) {
      updateAccount(editingAccount.id, form);
      addLog({
        action: "update",
        entity: "BankAccount",
        entityId: String(editingAccount?.id ?? ""),
        description: `Bank account "${form.bankName}" updated`,
      });
      toast.success("Account updated");
    } else {
      addAccount(form);
      addLog({
        action: "create",
        entity: "BankAccount",
        entityId: "",
        description: `Bank account "${form.bankName}" added`,
      });
      toast.success("Account added");
    }
    setShowDialog(false);
  };

  // Compute real-time balance: opening + credits - debits
  const getAccountBalance = (accId: string, openingBalance: number) => {
    const credits = transactions
      .filter((t) => t.accountId === accId && t.credit > 0)
      .reduce((s, t) => s + t.credit, 0);
    const debits = transactions
      .filter((t) => t.accountId === accId && t.debit > 0)
      .reduce((s, t) => s + t.debit, 0);
    return openingBalance + credits - debits;
  };

  const totalBalance = accounts.reduce(
    (sum, acc) => sum + getAccountBalance(acc.id, acc.openingBalance),
    0,
  );

  return (
    <div className="space-y-4" data-ocid="bank.section">
      <div className="flex items-center justify-between">
        <div className="flex gap-3 items-center">
          <Landmark className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Total Balance</p>
            <p className="font-cabinet font-bold text-lg font-numeric">
              {formatINR(totalBalance)}
            </p>
          </div>
        </div>
        <Button onClick={openAdd} data-ocid="bank.add_button" className="gap-2">
          <Plus className="w-4 h-4" /> Add Account
        </Button>
      </div>

      <Card className="bg-card border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Landmark className="w-4 h-4 text-primary" />
            Bank Accounts ({accounts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {accounts.length === 0 ? (
            <div className="p-12 text-center" data-ocid="bank.empty_state">
              <Landmark className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                No bank accounts added
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={openAdd}
              >
                Add Account
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="bank.list.table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Bank Name</TableHead>
                    <TableHead>Account Number</TableHead>
                    <TableHead>IFSC</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">
                      Opening Balance
                    </TableHead>
                    <TableHead className="text-right">
                      Current Balance
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((acc, idx) => (
                    <TableRow key={acc.id} data-ocid={`bank.item.${idx + 1}`}>
                      <TableCell className="pl-4 font-medium">
                        {acc.bankName}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {acc.accountNumber}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {acc.ifsc}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {acc.accountType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-numeric font-medium">
                        {formatINR(acc.openingBalance)}
                      </TableCell>
                      <TableCell className="text-right font-numeric font-medium text-primary">
                        {formatINR(
                          getAccountBalance(acc.id, acc.openingBalance),
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={acc.isActive ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {acc.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(acc)}
                            data-ocid={`bank.edit_button.${idx + 1}`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(acc.id)}
                            data-ocid={`bank.delete_button.${idx + 1}`}
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
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent data-ocid="bank.dialog">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "Edit Account" : "Add Bank Account"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Bank Name *</Label>
                <Input
                  value={form.bankName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, bankName: e.target.value }))
                  }
                  placeholder="State Bank of India"
                  data-ocid="bank.name.input"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Account Number</Label>
                <Input
                  value={form.accountNumber}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, accountNumber: e.target.value }))
                  }
                  placeholder="XXXXXXXXXXXX"
                  className="font-mono"
                  data-ocid="bank.accountnumber.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>IFSC Code</Label>
                <Input
                  value={form.ifsc}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      ifsc: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="SBIN0001234"
                  className="font-mono"
                  data-ocid="bank.ifsc.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Account Type</Label>
                <Select
                  value={form.accountType}
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      accountType: v as BankAccount["accountType"],
                    }))
                  }
                >
                  <SelectTrigger data-ocid="bank.type.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="current">Current</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Opening Balance (₹)</Label>
                <Input
                  type="number"
                  value={form.openingBalance}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      openingBalance: Number(e.target.value),
                    }))
                  }
                  min="0"
                  step="0.01"
                  data-ocid="bank.balance.input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                data-ocid="bank.cancel_button"
              >
                Cancel
              </Button>
              <Button type="submit" data-ocid="bank.submit_button">
                {editingAccount ? "Update" : "Add Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent data-ocid="bank.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="bank.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              data-ocid="bank.delete.confirm_button"
              onClick={() => {
                if (deleteId) {
                  deleteAccount(deleteId);
                  addLog({
                    action: "delete",
                    entity: "BankAccount",
                    entityId: String(deleteId),
                    description: "Bank account deleted",
                  });
                  toast.success("Account deleted");
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
