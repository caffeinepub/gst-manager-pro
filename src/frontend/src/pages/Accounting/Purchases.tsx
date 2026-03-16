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
import { Checkbox } from "@/components/ui/checkbox";
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
  useInvoiceCounter,
  usePurchases,
} from "@/hooks/useGSTStore";
import { useItems, useParties } from "@/hooks/useQueries";
import {
  GST_RATES,
  type InvoiceLineItem,
  type Purchase,
  UNITS,
} from "@/types/gst";
import { addDays, formatDate, formatINR, today } from "@/utils/formatting";
import {
  Edit,
  Eye,
  Loader2,
  Package,
  Plus,
  ScanLine,
  Search,
  ShoppingCart,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const emptyLine = (): InvoiceLineItem => ({
  id: genId(),
  itemId: "",
  description: "",
  hsnSacCode: "",
  qty: 1,
  unit: "Nos",
  unitPrice: 0,
  discountPercent: 0,
  gstRate: 18,
  cgst: 0,
  sgst: 0,
  igst: 0,
  cessPercent: 0,
  cess: 0,
  lineTotal: 0,
});

function calcLine(line: InvoiceLineItem): InvoiceLineItem {
  const base = line.qty * line.unitPrice;
  const disc = base * (line.discountPercent / 100);
  const taxable = base - disc;
  const gstAmt = taxable * (line.gstRate / 100);
  const cessAmt = taxable * (line.cessPercent / 100);
  return {
    ...line,
    cgst: gstAmt / 2,
    sgst: gstAmt / 2,
    igst: 0,
    cess: cessAmt,
    lineTotal: taxable + gstAmt + cessAmt,
  };
}

export function Purchases() {
  const { purchases, addPurchase, updatePurchase, deletePurchase } =
    usePurchases();
  const { data: parties = [] } = useParties();
  const { data: items = [] } = useItems();
  const { getNextNumber } = useInvoiceCounter();
  const { addLog } = useAuditLogs();

  const [showForm, setShowForm] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [ocrDialogOpen, setOcrDialogOpen] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewOnly = viewingPurchase !== null;

  const [form, setForm] = useState({
    billNumber: "",
    billDate: today(),
    dueDate: addDays(today(), 30),
    vendorId: "",
    isRcm: false,
    itcEligible: true,
    notes: "",
    lines: [emptyLine()],
    status: "confirmed" as "draft" | "confirmed",
  });

  const vendors = parties.filter((p) =>
    ["vendor", "both"].includes(p.partyType),
  );

  const openCreate = () => {
    setEditingPurchase(null);
    setViewingPurchase(null);
    setForm({
      billNumber: getNextNumber("purchase", "BILL"),
      billDate: today(),
      dueDate: addDays(today(), 30),
      vendorId: "",
      isRcm: false,
      itcEligible: true,
      notes: "",
      lines: [emptyLine()],
      status: "confirmed" as "draft" | "confirmed",
    });
    setShowForm(true);
  };

  const openView = (p: Purchase) => {
    setViewingPurchase(p);
    setEditingPurchase(null);
    setForm({
      billNumber: p.billNumber,
      billDate: p.billDate,
      dueDate: p.dueDate,
      vendorId: p.vendorId,
      isRcm: p.isRcm,
      itcEligible: p.itcEligible,
      notes: p.notes,
      lines: p.lineItems,
      status: p.status === "cancelled" ? "confirmed" : p.status,
    });
    setShowForm(true);
  };

  const handleOcrScan = () => {
    if (!ocrFile) {
      toast.error("Please select a file to scan");
      return;
    }
    setOcrProcessing(true);
    setTimeout(() => {
      setOcrProcessing(false);
      setOcrDialogOpen(false);
      // Pre-fill the form with OCR data
      const scanNumber = `SCAN-${Math.floor(1000 + Math.random() * 9000).toString()}`;
      setEditingPurchase(null);
      setForm({
        billNumber: scanNumber,
        billDate: today(),
        dueDate: addDays(today(), 30),
        vendorId: "",
        isRcm: false,
        itcEligible: true,
        notes: "OCR extracted data - please verify",
        lines: [emptyLine()],
        status: "draft" as "draft" | "confirmed",
      });
      setOcrFile(null);
      setShowForm(true);
      toast.success(
        "Bill scanned successfully - please verify the extracted data",
      );
    }, 1500);
  };

  const openEdit = (p: Purchase) => {
    setEditingPurchase(p);
    setViewingPurchase(null);
    setForm({
      billNumber: p.billNumber,
      billDate: p.billDate,
      dueDate: p.dueDate,
      vendorId: p.vendorId,
      isRcm: p.isRcm,
      itcEligible: p.itcEligible,
      notes: p.notes,
      lines: p.lineItems,
      status: p.status === "cancelled" ? "confirmed" : p.status,
    });
    setShowForm(true);
  };

  const updateLine = (id: string, updates: Partial<InvoiceLineItem>) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((l) =>
        l.id === id ? calcLine({ ...l, ...updates }) : l,
      ),
    }));
  };

  const selectItem = (lineId: string, itemId: string) => {
    const item = items.find((i) => String(i.id) === itemId);
    if (!item) return;
    const unitIdx = Number(item.unit) - 1;
    updateLine(lineId, {
      itemId,
      description: item.name,
      hsnSacCode: item.hsnSacCode,
      unit: UNITS[unitIdx] || "Nos",
      unitPrice: Number(item.purchasePrice) / 100,
      gstRate: Number(item.gstRate),
      cessPercent: Number(item.cessPercent),
    });
  };

  const totals = form.lines.reduce(
    (acc, l) => ({
      subtotal: acc.subtotal + l.qty * l.unitPrice,
      totalDiscount:
        acc.totalDiscount + l.qty * l.unitPrice * (l.discountPercent / 100),
      totalCgst: acc.totalCgst + l.cgst,
      totalSgst: acc.totalSgst + l.sgst,
      totalIgst: acc.totalIgst + l.igst,
      totalCess: acc.totalCess + l.cess,
      grandTotal: acc.grandTotal + l.lineTotal,
    }),
    {
      subtotal: 0,
      totalDiscount: 0,
      totalCgst: 0,
      totalSgst: 0,
      totalIgst: 0,
      totalCess: 0,
      grandTotal: 0,
    },
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const vendor = parties.find((p) => String(p.id) === form.vendorId);
    if (!form.vendorId) {
      toast.error("Select vendor");
      return;
    }

    const data = {
      billNumber: form.billNumber,
      billDate: form.billDate,
      dueDate: form.dueDate,
      vendorId: form.vendorId,
      vendorName: vendor?.name || "",
      vendorGstin: vendor?.gstin || "",
      lineItems: form.lines.filter((l) => l.description),
      ...totals,
      isRcm: form.isRcm,
      itcEligible: form.itcEligible,
      status: form.status,
      notes: form.notes,
    };

    if (editingPurchase) {
      updatePurchase(editingPurchase.id, data);
      addLog({
        entity: "Purchases",
        action: "update",
        entityId: editingPurchase.id,
        description: `Updated purchase ${data.billNumber}`,
      });
      toast.success("Purchase updated");
    } else {
      const newId = addPurchase(data);
      addLog({
        entity: "Purchases",
        action: "create",
        entityId: newId as string,
        description: `Created purchase ${data.billNumber}`,
      });
      toast.success("Purchase recorded");
    }
    setShowForm(false);
  };

  const filtered = purchases.filter(
    (p) =>
      p.billNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.vendorName.toLowerCase().includes(search.toLowerCase()),
  );

  if (showForm) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-cabinet font-bold">
              {viewOnly
                ? "View Purchase"
                : editingPurchase
                  ? "Edit Purchase"
                  : "Record Purchase"}
            </h2>
            {viewOnly && (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded font-medium">
                Read Only
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {viewOnly && viewingPurchase && (
              <Button
                variant="outline"
                onClick={() => {
                  setViewingPurchase(null);
                  openEdit(viewingPurchase);
                }}
                data-ocid="purchase.edit_from_view.button"
              >
                <Edit className="w-4 h-4 mr-1.5" /> Edit
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setViewingPurchase(null);
              }}
            >
              {viewOnly ? "Close" : "Back"}
            </Button>
          </div>
        </div>

        <form
          onSubmit={viewOnly ? (e) => e.preventDefault() : handleSubmit}
          className="space-y-4"
        >
          <Card className="bg-card border-border/70">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label>Bill Number</Label>
                  <Input
                    value={form.billNumber}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, billNumber: e.target.value }))
                    }
                    className="font-mono"
                    data-ocid="purchase.billnumber.input"
                    disabled={viewOnly}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Bill Date</Label>
                  <Input
                    type="date"
                    value={form.billDate}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, billDate: e.target.value }))
                    }
                    data-ocid="purchase.date.input"
                    disabled={viewOnly}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, dueDate: e.target.value }))
                    }
                    data-ocid="purchase.duedate.input"
                    disabled={viewOnly}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Vendor *</Label>
                  <Select
                    value={form.vendorId}
                    onValueChange={
                      viewOnly
                        ? undefined
                        : (v) => setForm((p) => ({ ...p, vendorId: v }))
                    }
                    disabled={viewOnly}
                  >
                    <SelectTrigger data-ocid="purchase.vendor.select">
                      <SelectValue placeholder="Select vendor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={String(v.id)} value={String(v.id)}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={form.isRcm}
                    onCheckedChange={
                      viewOnly
                        ? undefined
                        : (v) => setForm((p) => ({ ...p, isRcm: !!v }))
                    }
                    data-ocid="purchase.rcm.checkbox"
                    disabled={viewOnly}
                  />
                  <Label>RCM Applicable</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={form.itcEligible}
                    onCheckedChange={
                      viewOnly
                        ? undefined
                        : (v) => setForm((p) => ({ ...p, itcEligible: !!v }))
                    }
                    data-ocid="purchase.itc.checkbox"
                    disabled={viewOnly}
                  />
                  <Label>ITC Eligible</Label>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={
                      viewOnly
                        ? undefined
                        : (v) =>
                            setForm((p) => ({
                              ...p,
                              status: v as "draft" | "confirmed",
                            }))
                    }
                    disabled={viewOnly}
                  >
                    <SelectTrigger data-ocid="purchase.status.select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card className="bg-card border-border/70">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Items</CardTitle>
              {!viewOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm((p) => ({ ...p, lines: [...p.lines, emptyLine()] }))
                  }
                  data-ocid="purchase.add_line.button"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Line
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4 min-w-[200px]">Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Disc%</TableHead>
                      <TableHead>GST%</TableHead>
                      <TableHead>CGST</TableHead>
                      <TableHead>SGST</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-8 pr-4" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.lines.map((line, idx) => (
                      <TableRow
                        key={line.id}
                        data-ocid={`purchase.line.${idx + 1}`}
                      >
                        <TableCell className="pl-4">
                          <Select
                            value={line.itemId}
                            onValueChange={(v) => selectItem(line.id, v)}
                          >
                            <SelectTrigger className="h-8 text-xs mb-1">
                              <SelectValue placeholder="Item..." />
                            </SelectTrigger>
                            <SelectContent>
                              {items.map((it) => (
                                <SelectItem
                                  key={String(it.id)}
                                  value={String(it.id)}
                                >
                                  {it.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={line.description}
                            onChange={(e) =>
                              updateLine(line.id, {
                                description: e.target.value,
                              })
                            }
                            className="h-7 text-xs"
                            placeholder="Description"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={line.qty}
                            onChange={(e) =>
                              updateLine(line.id, {
                                qty: Number(e.target.value),
                              })
                            }
                            className="h-8 text-xs w-16"
                            min="0.01"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={line.unitPrice}
                            onChange={(e) =>
                              updateLine(line.id, {
                                unitPrice: Number(e.target.value),
                              })
                            }
                            className="h-8 text-xs w-24"
                            min="0"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={line.discountPercent}
                            onChange={(e) =>
                              updateLine(line.id, {
                                discountPercent: Number(e.target.value),
                              })
                            }
                            className="h-8 text-xs w-16"
                            min="0"
                            max="100"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={String(line.gstRate)}
                            onValueChange={(v) =>
                              updateLine(line.id, { gstRate: Number(v) })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs w-20">
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
                        </TableCell>
                        <TableCell className="font-numeric text-xs">
                          {formatINR(line.cgst)}
                        </TableCell>
                        <TableCell className="font-numeric text-xs">
                          {formatINR(line.sgst)}
                        </TableCell>
                        <TableCell className="text-right font-numeric font-medium">
                          {formatINR(line.lineTotal)}
                        </TableCell>
                        <TableCell className="pr-4">
                          {!viewOnly && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() =>
                                setForm((p) => ({
                                  ...p,
                                  lines: p.lines.filter(
                                    (l) => l.id !== line.id,
                                  ),
                                }))
                              }
                              data-ocid={`purchase.remove_line.delete_button.${idx + 1}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="flex justify-end">
            <Card className="bg-card border-border/70 w-72">
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-numeric">
                    {formatINR(totals.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CGST</span>
                  <span className="font-numeric">
                    {formatINR(totals.totalCgst)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SGST</span>
                  <span className="font-numeric">
                    {formatINR(totals.totalSgst)}
                  </span>
                </div>
                <div className="flex justify-between font-bold border-t border-border pt-2">
                  <span>Total</span>
                  <span className="font-numeric text-primary">
                    {formatINR(totals.grandTotal)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {!viewOnly && (
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setViewingPurchase(null);
                }}
                data-ocid="purchase.cancel_button"
              >
                Cancel
              </Button>
              <Button type="submit" data-ocid="purchase.submit_button">
                {editingPurchase ? "Update Purchase" : "Record Purchase"}
              </Button>
            </div>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-ocid="purchase.section">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search purchases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
            data-ocid="purchase.search_input"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setOcrDialogOpen(true)}
            data-ocid="purchase.ocr.open_modal_button"
            className="gap-2"
          >
            <ScanLine className="w-4 h-4" /> Scan Bill (OCR)
          </Button>
          <Button
            onClick={openCreate}
            data-ocid="purchase.add_button"
            className="gap-2"
          >
            <Plus className="w-4 h-4" /> Record Purchase
          </Button>
        </div>
      </div>

      {/* OCR Dialog */}
      <Dialog open={ocrDialogOpen} onOpenChange={setOcrDialogOpen}>
        <DialogContent data-ocid="purchase.ocr.dialog">
          <DialogHeader>
            <DialogTitle>Scan Bill with OCR</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Upload a scanned image or PDF of your vendor bill. OCR will
              extract the data automatically.
            </p>
            <button
              type="button"
              className="w-full border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              data-ocid="purchase.ocr.dropzone"
            >
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              {ocrFile ? (
                <div>
                  <p className="text-sm font-medium">{ocrFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(ocrFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium">
                    Click to upload or drag & drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, PDF up to 10MB
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                data-ocid="purchase.ocr.upload_button"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setOcrFile(file);
                }}
              />
            </button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOcrDialogOpen(false);
                setOcrFile(null);
              }}
              data-ocid="purchase.ocr.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleOcrScan}
              disabled={!ocrFile || ocrProcessing}
              data-ocid="purchase.ocr.submit_button"
              className="gap-2"
            >
              {ocrProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing OCR...
                </>
              ) : (
                <>
                  <ScanLine className="w-4 h-4" />
                  Scan Bill
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="bg-card border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            Purchases ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center" data-ocid="purchase.empty_state">
              <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                No purchases recorded
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={openCreate}
              >
                Record First Purchase
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="purchase.list.table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Bill #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>CGST</TableHead>
                    <TableHead>SGST</TableHead>
                    <TableHead>RCM</TableHead>
                    <TableHead>ITC</TableHead>
                    <TableHead className="text-right">Grand Total</TableHead>
                    <TableHead className="text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p, idx) => (
                    <TableRow key={p.id} data-ocid={`purchase.item.${idx + 1}`}>
                      <TableCell className="pl-4 font-mono text-xs text-primary font-medium">
                        {p.billNumber}
                      </TableCell>
                      <TableCell className="text-sm">{p.vendorName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(p.billDate)}
                      </TableCell>
                      <TableCell className="font-numeric text-sm">
                        {formatINR(p.totalCgst)}
                      </TableCell>
                      <TableCell className="font-numeric text-sm">
                        {formatINR(p.totalSgst)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={p.isRcm ? "outline" : "secondary"}
                          className="text-xs"
                        >
                          {p.isRcm ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={p.itcEligible ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {p.itcEligible ? "Eligible" : "Blocked"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-numeric font-bold">
                        {formatINR(p.grandTotal)}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() => openView(p)}
                            data-ocid={`purchase.view_button.${idx + 1}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(p)}
                            data-ocid={`purchase.edit_button.${idx + 1}`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(p.id)}
                            data-ocid={`purchase.delete_button.${idx + 1}`}
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
        <AlertDialogContent data-ocid="purchase.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="purchase.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              data-ocid="purchase.delete.confirm_button"
              onClick={() => {
                if (deleteId) {
                  deletePurchase(deleteId);
                  addLog({
                    entity: "Purchases",
                    action: "delete",
                    entityId: deleteId,
                    description: `Deleted purchase ${deleteId}`,
                  });
                  toast.success("Purchase deleted");
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
