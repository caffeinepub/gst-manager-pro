import type { Item } from "@/backend.d";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuditLogs, useInvoices, usePurchases } from "@/hooks/useGSTStore";
import { ItemType } from "@/hooks/useQueries";
import {
  useAddItem,
  useDeleteItem,
  useItems,
  useUpdateItem,
} from "@/hooks/useQueries";
import { GST_RATES, UNITS } from "@/types/gst";
import { formatINR } from "@/utils/formatting";
import { Edit, Loader2, Package, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const emptyItem: Omit<Item, "id"> = {
  name: "",
  description: "",
  hsnSacCode: "",
  itemType: ItemType.goods,
  unit: BigInt(1),
  gstRate: BigInt(18),
  cessPercent: BigInt(0),
  sellingPrice: BigInt(0),
  purchasePrice: BigInt(0),
  openingStock: BigInt(0),
  isActive: true,
};

export function Items() {
  const { data: items = [], isLoading } = useItems();
  const { invoices } = useInvoices();
  const { purchases } = usePurchases();

  // Compute live closing stock for each item
  const getClosingStock = (itemId: string, openingStock: number): number => {
    const itemIdStr = String(itemId);
    const soldQty = invoices
      .filter((inv) => inv.status === "confirmed")
      .flatMap((inv) => inv.lineItems)
      .filter((li) => String(li.itemId) === itemIdStr)
      .reduce((sum, li) => sum + li.qty, 0);
    const purchasedQty = purchases
      .filter((p) => p.status === "confirmed")
      .flatMap((p) => p.lineItems)
      .filter((li) => String(li.itemId) === itemIdStr)
      .reduce((sum, li) => sum + li.qty, 0);
    return openingStock + purchasedQty - soldQty;
  };
  const { mutate: addItem, isPending: isAdding } = useAddItem();
  const { mutate: updateItem, isPending: isUpdating } = useUpdateItem();
  const { mutate: deleteItem, isPending: isDeleting } = useDeleteItem();

  const { addLog } = useAuditLogs();

  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [form, setForm] = useState<Omit<Item, "id">>({ ...emptyItem });

  const filtered = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.hsnSacCode.toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = () => {
    setEditingItem(null);
    setForm({ ...emptyItem });
    setShowDialog(true);
  };

  const openEdit = (item: Item) => {
    setEditingItem(item);
    setForm({ ...item });
    setShowDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast.error("Item name is required");
      return;
    }

    if (editingItem) {
      updateItem(
        { id: editingItem.id, item: { ...form, id: editingItem.id } },
        {
          onSuccess: () => {
            toast.success("Item updated");
            addLog({
              action: "update",
              entity: "Item",
              entityId: String(editingItem?.id ?? ""),
              description: `Item "${form.name}" updated`,
            });
            setShowDialog(false);
          },
          onError: () => toast.error("Failed to update item"),
        },
      );
    } else {
      addItem(
        { ...form, id: BigInt(0) },
        {
          onSuccess: () => {
            toast.success("Item added");
            addLog({
              action: "create",
              entity: "Item",
              entityId: "",
              description: `Item "${form.name}" created`,
            });
            setShowDialog(false);
          },
          onError: () => toast.error("Failed to add item"),
        },
      );
    }
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-64"
        data-ocid="item.loading_state"
      >
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-ocid="item.section">
      <div className="flex gap-3 items-center justify-between flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search items/HSN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
            data-ocid="item.search_input"
          />
        </div>
        <Button onClick={openAdd} data-ocid="item.add_button" className="gap-2">
          <Plus className="w-4 h-4" /> Add Item
        </Button>
      </div>

      <Card className="bg-card border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Items & Services ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center" data-ocid="item.empty_state">
              <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No items found</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={openAdd}
              >
                Add First Item
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="item.list.table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Name</TableHead>
                    <TableHead>HSN/SAC</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>GST Rate</TableHead>
                    <TableHead>Selling Price</TableHead>
                    <TableHead>Purchase Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item, idx) => (
                    <TableRow
                      key={String(item.id)}
                      data-ocid={`item.item.${idx + 1}`}
                    >
                      <TableCell className="pl-4 font-medium">
                        {item.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {item.hsnSacCode || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.itemType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-numeric text-sm">
                        {String(item.gstRate)}%
                      </TableCell>
                      <TableCell className="font-numeric text-sm">
                        {formatINR(Number(item.sellingPrice) / 100)}
                      </TableCell>
                      <TableCell className="font-numeric text-sm">
                        {formatINR(Number(item.purchasePrice) / 100)}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const closingStock = getClosingStock(
                            String(item.id),
                            Number(item.openingStock),
                          );
                          return (
                            <Badge
                              variant={
                                closingStock > 10
                                  ? "default"
                                  : closingStock > 0
                                    ? "secondary"
                                    : "destructive"
                              }
                              className="font-numeric text-xs"
                              title={`Opening: ${Number(item.openingStock)} | Live: ${closingStock}`}
                            >
                              {closingStock}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.isActive ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(item)}
                            data-ocid={`item.edit_button.${idx + 1}`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(item.id)}
                            data-ocid={`item.delete_button.${idx + 1}`}
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

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="item.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Item" : "Add Item / Service"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Item/Service name"
                  data-ocid="item.name.input"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>HSN/SAC Code</Label>
                <Input
                  value={form.hsnSacCode}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, hsnSacCode: e.target.value }))
                  }
                  placeholder="HSN or SAC code"
                  className="font-mono"
                  data-ocid="item.hsn.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Item Type</Label>
                <Select
                  value={form.itemType}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, itemType: v as ItemType }))
                  }
                >
                  <SelectTrigger data-ocid="item.type.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ItemType.goods}>Goods</SelectItem>
                    <SelectItem value={ItemType.service}>Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>GST Rate (%)</Label>
                <Select
                  value={String(form.gstRate)}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, gstRate: BigInt(v) }))
                  }
                >
                  <SelectTrigger data-ocid="item.gstrate.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GST_RATES.map((r) => (
                      <SelectItem key={r} value={String(r)}>
                        {r}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  data-ocid="item.cess.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select
                  value={String(form.unit)}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, unit: BigInt(v) }))
                  }
                >
                  <SelectTrigger data-ocid="item.unit.select">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u, i) => (
                      <SelectItem key={u} value={String(i + 1)}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Selling Price (₹)</Label>
                <Input
                  type="number"
                  value={Number(form.sellingPrice) / 100}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      sellingPrice: BigInt(
                        Math.round(Number(e.target.value) * 100) || 0,
                      ),
                    }))
                  }
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  data-ocid="item.selling_price.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Purchase Price (₹)</Label>
                <Input
                  type="number"
                  value={Number(form.purchasePrice) / 100}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      purchasePrice: BigInt(
                        Math.round(Number(e.target.value) * 100) || 0,
                      ),
                    }))
                  }
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  data-ocid="item.purchase_price.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Opening Stock</Label>
                <Input
                  type="number"
                  value={String(form.openingStock)}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      openingStock: BigInt(e.target.value || "0"),
                    }))
                  }
                  placeholder="0"
                  min="0"
                  data-ocid="item.opening_stock.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Optional description"
                  data-ocid="item.description.input"
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) =>
                    setForm((p) => ({ ...p, isActive: v }))
                  }
                  data-ocid="item.active.switch"
                />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                data-ocid="item.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isAdding || isUpdating}
                data-ocid="item.submit_button"
              >
                {(isAdding || isUpdating) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingItem ? "Update" : "Add Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent data-ocid="item.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="item.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              data-ocid="item.delete.confirm_button"
              onClick={() => {
                if (deleteId !== null) {
                  deleteItem(deleteId, {
                    onSuccess: () => {
                      addLog({
                        action: "delete",
                        entity: "Item",
                        entityId: String(deleteId ?? ""),
                        description: "Item deleted",
                      });
                      toast.success("Item deleted");
                      setDeleteId(null);
                    },
                    onError: () => toast.error("Failed to delete item"),
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
