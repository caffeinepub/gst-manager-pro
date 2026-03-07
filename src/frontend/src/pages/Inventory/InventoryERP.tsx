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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  type StockMovement,
  useInvoices,
  usePurchases,
  useStockMovements,
} from "@/hooks/useGSTStore";
import { useItems } from "@/hooks/useQueries";
import { formatDate, formatINR, today } from "@/utils/formatting";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Package,
  PackagePlus,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type MovementType = "receipt" | "issue";

const emptyMovementForm = {
  itemId: "",
  itemName: "",
  type: "receipt" as MovementType,
  qty: 1,
  date: today(),
  reference: "",
  narration: "",
};

export function InventoryERP() {
  const { data: items = [] } = useItems();
  const { invoices } = useInvoices();
  const { purchases } = usePurchases();
  const { movements, addMovement, deleteMovement } = useStockMovements();

  const [openDialog, setOpenDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyMovementForm);

  // Calculate stock per item
  const stockData = useMemo(() => {
    return items.map((item) => {
      const itemId = String(item.id);
      const itemName = item.name;

      // Opening stock from item data
      const openingStock = Number(item.openingStock) || 0;

      // Units sold from confirmed sales/service invoices
      const unitsSold = invoices
        .filter(
          (inv) =>
            ["sales", "service"].includes(inv.type) &&
            inv.status === "confirmed",
        )
        .flatMap((inv) => inv.lineItems)
        .filter((li) => String(li.itemId) === itemId)
        .reduce((s, li) => s + li.qty, 0);

      // Units purchased from confirmed purchases
      const unitsPurchased = purchases
        .filter((p) => p.status === "confirmed")
        .flatMap((p) => p.lineItems)
        .filter((li) => String(li.itemId) === itemId)
        .reduce((s, li) => s + li.qty, 0);

      // Additional receipts from movements
      const movementReceipts = movements
        .filter((m) => m.itemId === itemId && m.type === "receipt")
        .reduce((s, m) => s + m.qty, 0);

      // Additional issues from movements
      const movementIssues = movements
        .filter((m) => m.itemId === itemId && m.type === "issue")
        .reduce((s, m) => s + m.qty, 0);

      const closingStock =
        openingStock +
        unitsPurchased +
        movementReceipts -
        unitsSold -
        movementIssues;

      const sellingPrice = Number(item.sellingPrice) / 100;
      const stockValue = Math.max(0, closingStock) * sellingPrice;

      return {
        id: itemId,
        name: itemName,
        hsnSacCode: item.hsnSacCode,
        openingStock,
        unitsSold,
        unitsPurchased: unitsPurchased + movementReceipts,
        closingStock,
        stockValue,
        sellingPrice,
        isLowStock: closingStock <= 5 && closingStock > 0,
        isOutOfStock: closingStock <= 0,
      };
    });
  }, [items, invoices, purchases, movements]);

  const dashboardStats = useMemo(() => {
    const totalItems = stockData.length;
    const totalStockValue = stockData.reduce(
      (s, item) => s + item.stockValue,
      0,
    );
    const lowStockAlerts = stockData.filter(
      (item) => item.isLowStock || item.isOutOfStock,
    ).length;
    const totalMovements = movements.length;
    return { totalItems, totalStockValue, lowStockAlerts, totalMovements };
  }, [stockData, movements]);

  const handleAddMovement = () => {
    if (!form.itemId) {
      toast.error("Please select an item");
      return;
    }
    if (form.qty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    addMovement({
      itemId: form.itemId,
      itemName: form.itemName,
      type: form.type,
      qty: form.qty,
      date: form.date,
      reference: form.reference,
      narration: form.narration,
    });
    toast.success(
      `${form.type === "receipt" ? "Receipt" : "Issue"} of ${form.qty} units recorded`,
    );
    setForm(emptyMovementForm);
    setOpenDialog(false);
  };

  const handleItemSelect = (itemId: string) => {
    const item = items.find((i) => String(i.id) === itemId);
    setForm((p) => ({
      ...p,
      itemId,
      itemName: item?.name || "",
    }));
  };

  return (
    <div className="space-y-4" data-ocid="inventory.section">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Items</p>
            <p className="text-2xl font-cabinet font-bold text-primary">
              {dashboardStats.totalItems}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Active in catalog
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Stock Value</p>
            <p className="text-xl font-cabinet font-bold text-primary font-numeric">
              {formatINR(dashboardStats.totalStockValue)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">At MRP</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Low Stock Alerts</p>
            <p
              className={`text-2xl font-cabinet font-bold ${dashboardStats.lowStockAlerts > 0 ? "text-destructive" : "text-primary"}`}
            >
              {dashboardStats.lowStockAlerts}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Items need reorder
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Stock Movements</p>
            <p className="text-2xl font-cabinet font-bold text-primary">
              {dashboardStats.totalMovements}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Total transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="stock" data-ocid="inventory.tab">
        <TabsList>
          <TabsTrigger value="stock" data-ocid="inventory.stock.tab">
            Stock List
          </TabsTrigger>
          <TabsTrigger value="movements" data-ocid="inventory.movements.tab">
            Stock Movements ({movements.length})
          </TabsTrigger>
        </TabsList>

        {/* Stock List Tab */}
        <TabsContent value="stock">
          <Card className="bg-card border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                Inventory Stock ({stockData.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {stockData.length === 0 ? (
                <div
                  className="p-12 text-center text-sm text-muted-foreground"
                  data-ocid="inventory.stock.empty_state"
                >
                  No items found. Add items in Masters → Items & Services.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table data-ocid="inventory.stock.table">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Item Name</TableHead>
                        <TableHead>HSN/SAC</TableHead>
                        <TableHead className="text-right">Opening</TableHead>
                        <TableHead className="text-right">Purchased</TableHead>
                        <TableHead className="text-right">Sold</TableHead>
                        <TableHead className="text-right">Closing</TableHead>
                        <TableHead className="text-right pr-4">
                          Stock Value
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockData.map((item, idx) => (
                        <TableRow
                          key={item.id}
                          data-ocid={`inventory.item.${idx + 1}`}
                          className={
                            item.isOutOfStock
                              ? "bg-destructive/5"
                              : item.isLowStock
                                ? "bg-yellow-500/5"
                                : ""
                          }
                        >
                          <TableCell className="pl-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {item.name}
                              </span>
                              {item.isOutOfStock && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  Out of Stock
                                </Badge>
                              )}
                              {item.isLowStock && !item.isOutOfStock && (
                                <Badge
                                  variant="outline"
                                  className="text-xs border-yellow-500 text-yellow-700 dark:text-yellow-400"
                                >
                                  <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                                  Low
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {item.hsnSacCode || "—"}
                          </TableCell>
                          <TableCell className="text-right font-numeric text-sm">
                            {item.openingStock}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-green-600 dark:text-green-400 font-numeric text-sm flex items-center justify-end gap-1">
                              <TrendingUp className="w-3 h-3" />
                              {item.unitsPurchased}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-red-600 dark:text-red-400 font-numeric text-sm flex items-center justify-end gap-1">
                              <TrendingDown className="w-3 h-3" />
                              {item.unitsSold}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-numeric font-bold text-sm">
                            {item.closingStock}
                          </TableCell>
                          <TableCell className="text-right font-numeric font-bold text-sm pr-4">
                            {formatINR(item.stockValue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Movements Tab */}
        <TabsContent value="movements">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => setForm(emptyMovementForm)}
                    data-ocid="inventory.movement.open_modal_button"
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" /> Record Movement
                  </Button>
                </DialogTrigger>
                <DialogContent data-ocid="inventory.movement.dialog">
                  <DialogHeader>
                    <DialogTitle>Record Stock Movement</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                      <Label>Item *</Label>
                      <Select
                        value={form.itemId}
                        onValueChange={handleItemSelect}
                      >
                        <SelectTrigger data-ocid="inventory.movement.item.select">
                          <SelectValue placeholder="Select item..." />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map((item) => (
                            <SelectItem
                              key={String(item.id)}
                              value={String(item.id)}
                            >
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Movement Type *</Label>
                        <Select
                          value={form.type}
                          onValueChange={(v) =>
                            setForm((p) => ({
                              ...p,
                              type: v as MovementType,
                            }))
                          }
                        >
                          <SelectTrigger data-ocid="inventory.movement.type.select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="receipt">
                              Receipt (GRN)
                            </SelectItem>
                            <SelectItem value="issue">
                              Issue (Goods Out)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          value={form.qty}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              qty: Number(e.target.value),
                            }))
                          }
                          min="1"
                          step="1"
                          data-ocid="inventory.movement.qty.input"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={form.date}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, date: e.target.value }))
                        }
                        data-ocid="inventory.movement.date.input"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Reference #</Label>
                      <Input
                        value={form.reference}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, reference: e.target.value }))
                        }
                        placeholder="PO number, GRN number..."
                        className="font-mono"
                        data-ocid="inventory.movement.reference.input"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Narration</Label>
                      <Textarea
                        value={form.narration}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, narration: e.target.value }))
                        }
                        placeholder="Purpose / reason for movement..."
                        rows={2}
                        data-ocid="inventory.movement.narration.textarea"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setOpenDialog(false)}
                      data-ocid="inventory.movement.cancel_button"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddMovement}
                      data-ocid="inventory.movement.save_button"
                    >
                      <PackagePlus className="w-4 h-4 mr-1.5" />
                      Record Movement
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="bg-card border-border/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <PackagePlus className="w-4 h-4 text-primary" />
                  Stock Movements Log ({movements.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {movements.length === 0 ? (
                  <div
                    className="p-12 text-center text-sm text-muted-foreground"
                    data-ocid="inventory.movements.empty_state"
                  >
                    No stock movements recorded. Click "Record Movement" to add
                    goods receipt or issue.
                  </div>
                ) : (
                  <Table data-ocid="inventory.movements.table">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Date</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Narration</TableHead>
                        <TableHead className="text-right pr-4 w-16">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((movement: StockMovement, idx: number) => (
                        <TableRow
                          key={movement.id}
                          data-ocid={`inventory.movement.item.${idx + 1}`}
                        >
                          <TableCell className="pl-4 text-xs text-muted-foreground">
                            {formatDate(movement.date)}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {movement.itemName}
                          </TableCell>
                          <TableCell>
                            {movement.type === "receipt" ? (
                              <Badge
                                variant="default"
                                className="text-xs gap-1"
                              >
                                <ArrowDown className="w-2.5 h-2.5" />
                                Receipt
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-xs gap-1 border-orange-400 text-orange-700 dark:text-orange-400"
                              >
                                <ArrowUp className="w-2.5 h-2.5" />
                                Issue
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-numeric font-bold text-sm">
                            {movement.qty}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {movement.reference || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {movement.narration || "—"}
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(movement.id)}
                              data-ocid={`inventory.movement.delete_button.${idx + 1}`}
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
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent data-ocid="inventory.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stock Movement?</AlertDialogTitle>
            <AlertDialogDescription>
              This movement record will be permanently deleted. Stock levels
              will be recalculated accordingly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="inventory.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              data-ocid="inventory.delete.confirm_button"
              onClick={() => {
                if (deleteId) {
                  deleteMovement(deleteId);
                  toast.success("Movement deleted");
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
