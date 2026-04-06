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
import { useAuditLogs, useTaxRates } from "@/hooks/useGSTStore";
import type { GSTTaxRate } from "@/hooks/useGSTStore";
import { Edit, Loader2, Lock, Plus, ReceiptText, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const emptyRate: Omit<GSTTaxRate, "id" | "createdAt" | "updatedAt"> = {
  name: "",
  description: "",
  gstRatePercent: 18,
  cessPercent: 0,
  isExempt: false,
  isRcmApplicable: false,
};

export function TaxRates() {
  const { taxRates, addTaxRate, updateTaxRate, deleteTaxRate, isLoading } =
    useTaxRates();
  const { addLog } = useAuditLogs();

  const [showDialog, setShowDialog] = useState(false);
  const [editingRate, setEditingRate] = useState<GSTTaxRate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<
    Omit<GSTTaxRate, "id" | "createdAt" | "updatedAt">
  >({ ...emptyRate });

  const openAdd = () => {
    setEditingRate(null);
    setForm({ ...emptyRate });
    setShowDialog(true);
  };

  const openEdit = (rate: GSTTaxRate) => {
    setEditingRate(rate);
    setForm({
      name: rate.name,
      description: rate.description,
      gstRatePercent: rate.gstRatePercent,
      cessPercent: rate.cessPercent,
      isExempt: rate.isExempt,
      isRcmApplicable: rate.isRcmApplicable,
      isDefault: rate.isDefault,
    });
    setShowDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast.error("Name is required");
      return;
    }

    if (editingRate) {
      updateTaxRate(editingRate.id, form);
      addLog({
        action: "update",
        entity: "TaxRate",
        entityId: editingRate.id,
        description: `Tax rate "${form.name}" updated`,
      });
      toast.success("Tax rate updated");
      setShowDialog(false);
    } else {
      addTaxRate(form);
      addLog({
        action: "create",
        entity: "TaxRate",
        entityId: "",
        description: `Tax rate "${form.name}" created`,
      });
      toast.success("Tax rate added");
      setShowDialog(false);
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

  const standardRates = [
    { rate: "0%", description: "Exempted / Nil rated goods and services" },
    {
      rate: "5%",
      description:
        "Essential goods: food items, fertilizers, medicines (basic)",
    },
    {
      rate: "12%",
      description: "Processed food, computers, business class air travel",
    },
    {
      rate: "18%",
      description:
        "Most goods & services: AC restaurants, telecom, IT services",
    },
    {
      rate: "28%",
      description: "Luxury goods: automobiles, tobacco, aerated drinks + Cess",
    },
  ];

  return (
    <div className="space-y-4" data-ocid="taxrate.section">
      {/* Standard GST Rates Reference */}
      <Card className="bg-card border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-primary" />
            Standard GST Rates (Reference)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">GST Rate</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="pr-4 text-right">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standardRates.map((r) => (
                  <TableRow key={r.rate}>
                    <TableCell className="pl-4 font-bold text-primary font-numeric">
                      {r.rate}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.description}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Badge
                        variant="secondary"
                        className="text-xs flex items-center gap-1 w-fit ml-auto"
                      >
                        <Lock className="w-2.5 h-2.5" />
                        System
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={openAdd}
          data-ocid="taxrate.add_button"
          className="gap-2"
        >
          <Plus className="w-4 h-4" /> Add Custom Tax Rate
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
            <div className="overflow-x-auto">
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
                      key={rate.id}
                      data-ocid={`taxrate.item.${idx + 1}`}
                    >
                      <TableCell className="pl-4 font-medium">
                        {rate.name}
                      </TableCell>
                      <TableCell className="font-numeric text-sm">
                        {rate.gstRatePercent}%
                      </TableCell>
                      <TableCell className="font-numeric text-sm">
                        {rate.cessPercent}%
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
                          variant={
                            rate.isRcmApplicable ? "outline" : "secondary"
                          }
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
            </div>
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
                  value={form.gstRatePercent}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      gstRatePercent: Number(e.target.value) || 0,
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
                  value={form.cessPercent}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      cessPercent: Number(e.target.value) || 0,
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
              <Button type="submit" data-ocid="taxrate.submit_button">
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
                  deleteTaxRate(deleteId);
                  addLog({
                    action: "delete",
                    entity: "TaxRate",
                    entityId: deleteId,
                    description: "Tax rate deleted",
                  });
                  toast.success("Tax rate deleted");
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
