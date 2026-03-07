import type { TaxRate } from "@/backend.d";
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
import { Switch } from "@/components/ui/switch";
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
  useAddTaxRate,
  useDeleteTaxRate,
  useTaxRates,
  useUpdateTaxRate,
} from "@/hooks/useQueries";
import { Edit, Loader2, Plus, ReceiptText, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const emptyRate: Omit<TaxRate, "id"> = {
  name: "",
  description: "",
  gstRatePercent: BigInt(18),
  cessPercent: BigInt(0),
  isExempt: false,
  isRcmApplicable: false,
};

export function TaxRates() {
  const { data: taxRates = [], isLoading } = useTaxRates();
  const { mutate: addTaxRate, isPending: isAdding } = useAddTaxRate();
  const { mutate: updateTaxRate, isPending: isUpdating } = useUpdateTaxRate();
  const { mutate: deleteTaxRate, isPending: isDeleting } = useDeleteTaxRate();

  const [showDialog, setShowDialog] = useState(false);
  const [editingRate, setEditingRate] = useState<TaxRate | null>(null);
  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [form, setForm] = useState<Omit<TaxRate, "id">>({ ...emptyRate });

  const openAdd = () => {
    setEditingRate(null);
    setForm({ ...emptyRate });
    setShowDialog(true);
  };

  const openEdit = (rate: TaxRate) => {
    setEditingRate(rate);
    setForm({ ...rate });
    setShowDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast.error("Name is required");
      return;
    }

    if (editingRate) {
      updateTaxRate(
        { id: editingRate.id, taxRate: { ...form, id: editingRate.id } },
        {
          onSuccess: () => {
            toast.success("Tax rate updated");
            setShowDialog(false);
          },
          onError: () => toast.error("Failed to update tax rate"),
        },
      );
    } else {
      addTaxRate(
        { ...form, id: BigInt(0) },
        {
          onSuccess: () => {
            toast.success("Tax rate added");
            setShowDialog(false);
          },
          onError: () => toast.error("Failed to add tax rate"),
        },
      );
    }
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-64"
        data-ocid="taxrate.loading_state"
      >
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-ocid="taxrate.section">
      <div className="flex justify-end">
        <Button
          onClick={openAdd}
          data-ocid="taxrate.add_button"
          className="gap-2"
        >
          <Plus className="w-4 h-4" /> Add Tax Rate
        </Button>
      </div>

      <Card className="bg-card border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-primary" />
            Tax Rates ({taxRates.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {taxRates.length === 0 ? (
            <div className="p-12 text-center" data-ocid="taxrate.empty_state">
              <ReceiptText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                No tax rates defined
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={openAdd}
              >
                Add Tax Rate
              </Button>
            </div>
          ) : (
            <Table data-ocid="taxrate.list.table">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Name</TableHead>
                  <TableHead>GST Rate</TableHead>
                  <TableHead>Cess</TableHead>
                  <TableHead>Exempt</TableHead>
                  <TableHead>RCM</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxRates.map((rate, idx) => (
                  <TableRow
                    key={String(rate.id)}
                    data-ocid={`taxrate.item.${idx + 1}`}
                  >
                    <TableCell className="pl-4 font-medium">
                      {rate.name}
                    </TableCell>
                    <TableCell className="font-numeric text-sm">
                      {String(rate.gstRatePercent)}%
                    </TableCell>
                    <TableCell className="font-numeric text-sm">
                      {String(rate.cessPercent)}%
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={rate.isExempt ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {rate.isExempt ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={rate.isRcmApplicable ? "outline" : "secondary"}
                        className="text-xs"
                      >
                        {rate.isRcmApplicable ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-48 truncate">
                      {rate.description}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(rate)}
                          data-ocid={`taxrate.edit_button.${idx + 1}`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(rate.id)}
                          data-ocid={`taxrate.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent data-ocid="taxrate.dialog">
          <DialogHeader>
            <DialogTitle>
              {editingRate ? "Edit Tax Rate" : "Add Tax Rate"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. GST 18%"
                  data-ocid="taxrate.name.input"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>GST Rate (%)</Label>
                <Input
                  type="number"
                  value={String(form.gstRatePercent)}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      gstRatePercent: BigInt(e.target.value || "0"),
                    }))
                  }
                  placeholder="18"
                  min="0"
                  max="100"
                  data-ocid="taxrate.rate.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cess (%)</Label>
                <Input
                  type="number"
                  value={String(form.cessPercent)}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      cessPercent: BigInt(e.target.value || "0"),
                    }))
                  }
                  placeholder="0"
                  min="0"
                  data-ocid="taxrate.cess.input"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Tax rate description"
                  rows={2}
                  data-ocid="taxrate.description.textarea"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isExempt}
                  onCheckedChange={(v) =>
                    setForm((p) => ({ ...p, isExempt: v }))
                  }
                  data-ocid="taxrate.exempt.switch"
                />
                <Label>Exempt</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isRcmApplicable}
                  onCheckedChange={(v) =>
                    setForm((p) => ({ ...p, isRcmApplicable: v }))
                  }
                  data-ocid="taxrate.rcm.switch"
                />
                <Label>RCM Applicable</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                data-ocid="taxrate.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isAdding || isUpdating}
                data-ocid="taxrate.submit_button"
              >
                {(isAdding || isUpdating) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingRate ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent data-ocid="taxrate.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tax Rate?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="taxrate.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              data-ocid="taxrate.delete.confirm_button"
              onClick={() => {
                if (deleteId !== null) {
                  deleteTaxRate(deleteId, {
                    onSuccess: () => {
                      toast.success("Tax rate deleted");
                      setDeleteId(null);
                    },
                    onError: () => toast.error("Failed to delete"),
                  });
                }
              }}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
