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
  DialogTrigger,
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
import { type CustomAccount, useCustomAccounts } from "@/hooks/useGSTStore";
import { CHART_OF_ACCOUNTS } from "@/types/gst";
import { BookMarked, Edit, Lock, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type AccountType = "asset" | "liability" | "equity" | "income" | "expense";
type FilterType = "all" | AccountType;

const TYPE_COLORS: Record<AccountType, string> = {
  asset: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  liability: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  equity:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  income:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  expense:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

const emptyForm = {
  code: "",
  name: "",
  type: "asset" as AccountType,
};

export function ChartOfAccounts() {
  const { customAccounts, addAccount, updateAccount, deleteAccount } =
    useCustomAccounts();
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<CustomAccount | null>(
    null,
  );
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editForm, setEditForm] = useState(emptyForm);
  const [form, setForm] = useState(emptyForm);

  // Merge system accounts + custom accounts
  const systemAccounts = CHART_OF_ACCOUNTS.map((a) => ({
    ...a,
    isCustom: false,
    id: `sys-${a.code}`,
  }));

  const allAccounts = [
    ...systemAccounts,
    ...customAccounts.map((a) => ({ ...a, isCustom: true })),
  ];

  const filtered = allAccounts.filter((a) => {
    const matchesType = filter === "all" || a.type === filter;
    const matchesSearch =
      search === "" ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.code.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleAdd = () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Code and name are required");
      return;
    }
    // Check for duplicate code
    const exists = allAccounts.some((a) => a.code === form.code.trim());
    if (exists) {
      toast.error("Account code already exists");
      return;
    }
    addAccount({
      code: form.code.trim(),
      name: form.name.trim(),
      type: form.type,
    });
    toast.success(`Account ${form.code} - ${form.name} created`);
    setForm(emptyForm);
    setOpenDialog(false);
  };

  const handleOpenEditDialog = (account: CustomAccount) => {
    setEditingAccount(account);
    setEditForm({ code: account.code, name: account.name, type: account.type });
    setOpenEditDialog(true);
  };

  const handleEditSave = () => {
    if (!editingAccount) return;
    if (!editForm.name.trim()) {
      toast.error("Account name is required");
      return;
    }
    updateAccount(editingAccount.id, {
      name: editForm.name.trim(),
      type: editForm.type,
    });
    toast.success("Account updated");
    setOpenEditDialog(false);
    setEditingAccount(null);
  };

  const counts = {
    all: allAccounts.length,
    asset: allAccounts.filter((a) => a.type === "asset").length,
    liability: allAccounts.filter((a) => a.type === "liability").length,
    equity: allAccounts.filter((a) => a.type === "equity").length,
    income: allAccounts.filter((a) => a.type === "income").length,
    expense: allAccounts.filter((a) => a.type === "expense").length,
  };

  return (
    <div className="space-y-4" data-ocid="coa.section">
      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {(
          ["all", "asset", "liability", "equity", "income", "expense"] as const
        ).map((t) => (
          <Card
            key={t}
            className={`bg-card border-border/70 cursor-pointer transition-all ${
              filter === t ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setFilter(t)}
            data-ocid={`coa.filter.${t}.tab`}
          >
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-muted-foreground capitalize">{t}</p>
              <p className="text-lg font-bold font-cabinet text-primary">
                {counts[t]}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
            data-ocid="coa.search_input"
          />
        </div>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button
              onClick={() => setForm(emptyForm)}
              data-ocid="coa.add.open_modal_button"
              className="gap-2"
            >
              <Plus className="w-4 h-4" /> Add Custom Account
            </Button>
          </DialogTrigger>
          <DialogContent data-ocid="coa.add.dialog">
            <DialogHeader>
              <DialogTitle>Add Custom Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Account Code *</Label>
                <Input
                  value={form.code}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, code: e.target.value }))
                  }
                  placeholder="e.g. 6001"
                  className="font-mono"
                  data-ocid="coa.code.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Account Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Office Equipment"
                  data-ocid="coa.name.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Account Type *</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, type: v as AccountType }))
                  }
                >
                  <SelectTrigger data-ocid="coa.type.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Asset</SelectItem>
                    <SelectItem value="liability">Liability</SelectItem>
                    <SelectItem value="equity">Equity</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpenDialog(false)}
                data-ocid="coa.add.cancel_button"
              >
                Cancel
              </Button>
              <Button onClick={handleAdd} data-ocid="coa.add.save_button">
                Create Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card className="bg-card border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-primary" />
            Chart of Accounts ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div
              className="p-12 text-center text-sm text-muted-foreground"
              data-ocid="coa.empty_state"
            >
              No accounts match your search
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="coa.list.table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4 w-24">Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right pr-4 w-16">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((account, idx) => (
                    <TableRow
                      key={account.id}
                      data-ocid={`coa.item.${idx + 1}`}
                    >
                      <TableCell className="pl-4 font-mono text-xs font-medium text-primary">
                        {account.code}
                      </TableCell>
                      <TableCell className="text-sm">{account.name}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_COLORS[account.type as AccountType]}`}
                        >
                          {account.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        {account.isCustom ? (
                          <Badge variant="outline" className="text-xs">
                            Custom
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-xs flex items-center gap-1 w-fit"
                          >
                            <Lock className="w-2.5 h-2.5" />
                            System
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        {account.isCustom ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                handleOpenEditDialog(account as CustomAccount)
                              }
                              data-ocid={`coa.edit_button.${idx + 1}`}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(account.id)}
                              data-ocid={`coa.delete_button.${idx + 1}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent data-ocid="coa.edit.dialog">
          <DialogHeader>
            <DialogTitle>Edit Custom Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Account Code</Label>
              <Input
                value={editForm.code}
                disabled
                className="font-mono bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Account code cannot be changed
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Account Name *</Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g. Office Equipment"
                data-ocid="coa.edit.name.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Account Type *</Label>
              <Select
                value={editForm.type}
                onValueChange={(v) =>
                  setEditForm((p) => ({ ...p, type: v as AccountType }))
                }
              >
                <SelectTrigger data-ocid="coa.edit.type.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asset">Asset</SelectItem>
                  <SelectItem value="liability">Liability</SelectItem>
                  <SelectItem value="equity">Equity</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenEditDialog(false)}
              data-ocid="coa.edit.cancel_button"
            >
              Cancel
            </Button>
            <Button onClick={handleEditSave} data-ocid="coa.edit.save_button">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent data-ocid="coa.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This account will be permanently removed. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="coa.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              data-ocid="coa.delete.confirm_button"
              onClick={() => {
                if (deleteId) {
                  deleteAccount(deleteId);
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
