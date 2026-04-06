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
import { Textarea } from "@/components/ui/textarea";
import {
  useAuditLogs,
  useCustomAccounts,
  useInvoiceCounter,
  useJournalEntries,
} from "@/hooks/useGSTStore";
import { CHART_OF_ACCOUNTS } from "@/types/gst";
import type { JournalEntry, JournalLine } from "@/types/gst";
import { formatDate, formatINR, today } from "@/utils/formatting";
import { BookOpen, Edit, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const emptyLine = (): JournalLine => ({
  id: genId(),
  accountCode: "",
  accountName: "",
  type: "debit",
  amount: 0,
  narration: "",
});

export function JournalEntries() {
  const { entries, addEntry, updateEntry, deleteEntry } = useJournalEntries();
  const { customAccounts } = useCustomAccounts();
  const { getNextNumber } = useInvoiceCounter();
  const { addLog } = useAuditLogs();
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    entryNumber: "",
    date: today(),
    reference: "",
    narration: "",
    lines: [emptyLine(), emptyLine()],
  });

  const openCreate = () => {
    setForm({
      entryNumber: getNextNumber("journal", "JE"),
      date: today(),
      reference: "",
      narration: "",
      lines: [emptyLine(), emptyLine()],
    });
    setShowForm(true);
  };

  // Merge hardcoded + custom accounts for the dropdown
  const allAccounts = [
    ...CHART_OF_ACCOUNTS,
    ...customAccounts.map((a) => ({
      code: a.code,
      name: a.name,
      type: a.type,
    })),
  ];

  const updateLine = (id: string, updates: Partial<JournalLine>) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((l) => {
        if (l.id !== id) return l;
        const u = { ...l, ...updates };
        if (updates.accountCode) {
          const acc = allAccounts.find((a) => a.code === updates.accountCode);
          if (acc) u.accountName = acc.name;
        }
        return u;
      }),
    }));
  };

  const totalDebit = form.lines
    .filter((l) => l.type === "debit")
    .reduce((s, l) => s + l.amount, 0);
  const totalCredit = form.lines
    .filter((l) => l.type === "credit")
    .reduce((s, l) => s + l.amount, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const openEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setForm({
      entryNumber: entry.entryNumber,
      date: entry.date,
      reference: entry.reference,
      narration: entry.narration,
      lines: entry.lines.length > 0 ? entry.lines : [emptyLine(), emptyLine()],
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      toast.error("Journal entry is not balanced. Debits must equal credits.");
      return;
    }
    if (totalDebit === 0) {
      toast.error("Add at least one journal line");
      return;
    }

    const filteredLines = form.lines.filter(
      (l) => l.accountCode && l.amount > 0,
    );
    if (editingEntry) {
      updateEntry(editingEntry.id, {
        entryNumber: form.entryNumber,
        date: form.date,
        reference: form.reference,
        narration: form.narration,
        lines: filteredLines,
        totalDebit,
        totalCredit,
      });
      addLog({
        entity: "JournalEntry",
        action: "update",
        entityId: editingEntry.id,
        description: `Updated journal entry ${form.entryNumber}`,
      });
      toast.success("Journal entry updated");
    } else {
      const entryId = addEntry({
        entryNumber: form.entryNumber,
        date: form.date,
        reference: form.reference,
        narration: form.narration,
        lines: filteredLines,
        totalDebit,
        totalCredit,
      });
      addLog({
        entity: "Journal",
        action: "create",
        entityId: entryId as string,
        description: `Created journal entry ${form.entryNumber}`,
      });
      toast.success("Journal entry saved");
    }
    setEditingEntry(null);
    setShowForm(false);
  };

  if (showForm) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-cabinet font-bold">
            {editingEntry ? "Edit Journal Entry" : "New Journal Entry"}
          </h2>
          <Button
            variant="outline"
            onClick={() => {
              setShowForm(false);
              setEditingEntry(null);
            }}
          >
            Back
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="bg-card border-border/70">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label>Entry #</Label>
                  <Input
                    value={form.entryNumber}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, entryNumber: e.target.value }))
                    }
                    className="font-mono"
                    data-ocid="journal.number.input"
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
                    data-ocid="journal.date.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Reference</Label>
                  <Input
                    value={form.reference}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, reference: e.target.value }))
                    }
                    data-ocid="journal.reference.input"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-4">
                  <Label>Narration</Label>
                  <Textarea
                    value={form.narration}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, narration: e.target.value }))
                    }
                    rows={2}
                    data-ocid="journal.narration.textarea"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/70">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Journal Lines</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((p) => ({ ...p, lines: [...p.lines, emptyLine()] }))
                }
                data-ocid="journal.add_line.button"
              >
                <Plus className="w-3 h-3 mr-1" /> Add Line
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Account</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Narration</TableHead>
                      <TableHead className="w-8 pr-4" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.lines.map((line, idx) => (
                      <TableRow
                        key={line.id}
                        data-ocid={`journal.line.${idx + 1}`}
                      >
                        <TableCell className="pl-4">
                          <Select
                            value={line.accountCode}
                            onValueChange={(v) =>
                              updateLine(line.id, { accountCode: v })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select account..." />
                            </SelectTrigger>
                            <SelectContent>
                              {allAccounts.map((acc) => (
                                <SelectItem key={acc.code} value={acc.code}>
                                  {acc.code} - {acc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={line.type}
                            onValueChange={(v) =>
                              updateLine(line.id, {
                                type: v as "debit" | "credit",
                              })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="debit">Debit (Dr)</SelectItem>
                              <SelectItem value="credit">
                                Credit (Cr)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={line.amount}
                            onChange={(e) =>
                              updateLine(line.id, {
                                amount: Number(e.target.value),
                              })
                            }
                            className="h-8 text-xs w-28"
                            min="0"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={line.narration}
                            onChange={(e) =>
                              updateLine(line.id, { narration: e.target.value })
                            }
                            className="h-8 text-xs"
                            placeholder="Line narration"
                          />
                        </TableCell>
                        <TableCell className="pr-4">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() =>
                              setForm((p) => ({
                                ...p,
                                lines: p.lines.filter((l) => l.id !== line.id),
                              }))
                            }
                            data-ocid={`journal.remove_line.delete_button.${idx + 1}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <div className="flex gap-6 text-sm">
              <span>
                Total Debit:{" "}
                <strong className="font-numeric">
                  {formatINR(totalDebit)}
                </strong>
              </span>
              <span>
                Total Credit:{" "}
                <strong className="font-numeric">
                  {formatINR(totalCredit)}
                </strong>
              </span>
              {!isBalanced && totalDebit > 0 && (
                <Badge
                  variant="destructive"
                  className="text-xs"
                  data-ocid="journal.balance.error_state"
                >
                  Unbalanced
                </Badge>
              )}
              {isBalanced && totalDebit > 0 && (
                <Badge
                  variant="default"
                  className="text-xs"
                  data-ocid="journal.balance.success_state"
                >
                  Balanced
                </Badge>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                data-ocid="journal.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isBalanced}
                data-ocid="journal.submit_button"
              >
                Post Entry
              </Button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-ocid="journal.section">
      <div className="flex justify-end">
        <Button
          onClick={openCreate}
          data-ocid="journal.add_button"
          className="gap-2"
        >
          <Plus className="w-4 h-4" /> New Journal Entry
        </Button>
      </div>

      <Card className="bg-card border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Journal Entries ({entries.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="p-12 text-center" data-ocid="journal.empty_state">
              <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                No journal entries yet
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={openCreate}
              >
                Create Entry
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="journal.list.table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Entry #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Narration</TableHead>
                    <TableHead>Lines</TableHead>
                    <TableHead className="text-right">Total Debit</TableHead>
                    <TableHead className="text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry, idx) => (
                    <TableRow
                      key={entry.id}
                      data-ocid={`journal.item.${idx + 1}`}
                    >
                      <TableCell className="pl-4 font-mono text-xs text-primary font-medium">
                        {entry.entryNumber}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(entry.date)}
                      </TableCell>
                      <TableCell className="text-sm max-w-48 truncate">
                        {entry.narration}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.lines.length} lines
                      </TableCell>
                      <TableCell className="text-right font-numeric font-medium">
                        {formatINR(entry.totalDebit)}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(entry)}
                            data-ocid={`journal.edit_button.${idx + 1}`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(entry.id)}
                            data-ocid={`journal.delete_button.${idx + 1}`}
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

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent data-ocid="journal.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="journal.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              data-ocid="journal.delete.confirm_button"
              onClick={() => {
                if (deleteId) {
                  deleteEntry(deleteId);
                  addLog({
                    entity: "Journal",
                    action: "delete",
                    entityId: deleteId,
                    description: `Deleted journal entry ${deleteId}`,
                  });
                  toast.success("Entry deleted");
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
