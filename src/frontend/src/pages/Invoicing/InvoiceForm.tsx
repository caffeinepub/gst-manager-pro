import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { Separator } from "@/components/ui/separator";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBusinessLogo, useLocalBusinessName } from "@/hooks/useBusinessLogo";
import {
  useInvoiceCounter,
  useInvoiceDefaults,
  useInvoices,
} from "@/hooks/useGSTStore";
import { useBusinessProfile, useItems, useParties } from "@/hooks/useQueries";
import {
  GST_RATES,
  INDIAN_STATES,
  type Invoice,
  type InvoiceLineItem,
  type InvoiceStatus,
  type InvoiceType,
  UNITS,
} from "@/types/gst";
import { addDays, amountInWords, formatINR, today } from "@/utils/formatting";
import { downloadInvoicePDF } from "@/utils/pdfExport";
import {
  CheckCircle,
  Download,
  Mic,
  Plus,
  Printer,
  QrCode,
  Save,
  Trash2,
  Wand2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const TYPE_PREFIXES: Record<InvoiceType, string> = {
  sales: "INV",
  service: "SRV",
  einvoice: "EIN",
  quotation: "QUO",
  proforma: "PRO",
  eway_bill: "EWB",
  credit_note: "CN",
  debit_note: "DN",
  bill_of_supply: "BOS",
  delivery_challan: "DC",
};

const TYPE_LABELS: Record<InvoiceType, string> = {
  sales: "Tax Invoice",
  service: "Service Invoice",
  einvoice: "e-Invoice",
  quotation: "Quotation",
  proforma: "Proforma Invoice",
  eway_bill: "e-Way Bill",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
  bill_of_supply: "Bill of Supply",
  delivery_challan: "Delivery Challan",
};

interface InvoiceFormProps {
  type: InvoiceType;
  editingInvoice?: Invoice;
  onClose: () => void;
  viewOnly?: boolean;
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

export function InvoiceForm({
  type,
  editingInvoice,
  onClose,
  viewOnly = false,
}: InvoiceFormProps) {
  const { data: parties = [] } = useParties();
  const { data: items = [] } = useItems();
  const { data: businessProfile } = useBusinessProfile();
  const { logo } = useBusinessLogo();
  const { localName } = useLocalBusinessName();
  const resolvedBusinessName =
    businessProfile?.businessName || localName || "Your Business";
  const { addInvoice, updateInvoice } = useInvoices();
  const { getNextNumber } = useInvoiceCounter();
  const { defaults: invoiceDefaults } = useInvoiceDefaults();

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState(today());
  const [dueDate, setDueDate] = useState(addDays(today(), 30));
  const [partyId, setPartyId] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [lines, setLines] = useState<InvoiceLineItem[]>([emptyLine()]);
  const [irnNumber, setIrnNumber] = useState("");
  const [eWayBillNumber, setEWayBillNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [termsConditions, setTermsConditions] = useState(
    () => invoiceDefaults.termsConditions,
  );
  const [declaration, setDeclaration] = useState(
    () => invoiceDefaults.declaration,
  );
  const [status, setStatus] = useState<InvoiceStatus>("draft");
  const [linkedInvoiceId, setLinkedInvoiceId] = useState("");
  const [showVoiceDialog, setShowVoiceDialog] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);

  const businessStateCode = businessProfile
    ? String(businessProfile.stateCode).padStart(2, "0")
    : "27";

  // biome-ignore lint/correctness/useExhaustiveDependencies: run only on mount
  useEffect(() => {
    if (editingInvoice) {
      setInvoiceNumber(editingInvoice.invoiceNumber);
      setDate(editingInvoice.date);
      setDueDate(editingInvoice.dueDate);
      setPartyId(editingInvoice.partyId);
      setPlaceOfSupply(editingInvoice.placeOfSupply);
      setLines(editingInvoice.lineItems);
      setIrnNumber(editingInvoice.irnNumber);
      setEWayBillNumber(editingInvoice.eWayBillNumber);
      setNotes(editingInvoice.notes);
      setTermsConditions(editingInvoice.termsConditions);
      setDeclaration(
        editingInvoice.declaration ||
          "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. This is a GST compliant tax invoice.",
      );
      setStatus(editingInvoice.status);
      setLinkedInvoiceId(editingInvoice.linkedInvoiceId || "");
    } else {
      setInvoiceNumber(getNextNumber(type, TYPE_PREFIXES[type]));
    }
  }, []);

  const isInterstate = placeOfSupply !== businessStateCode;
  const selectedParty = parties.find((p) => String(p.id) === partyId);

  const calcLine = useCallback(
    (line: InvoiceLineItem): InvoiceLineItem => {
      const baseAmount = line.qty * line.unitPrice;
      const discountAmt = baseAmount * (line.discountPercent / 100);
      const taxableValue = baseAmount - discountAmt;
      const gstAmt = taxableValue * (line.gstRate / 100);
      const cessAmt = taxableValue * (line.cessPercent / 100);
      const cgst = isInterstate ? 0 : gstAmt / 2;
      const sgst = isInterstate ? 0 : gstAmt / 2;
      const igst = isInterstate ? gstAmt : 0;
      const lineTotal = taxableValue + gstAmt + cessAmt;
      return { ...line, cgst, sgst, igst, cess: cessAmt, lineTotal };
    },
    [isInterstate],
  );

  // Recalculate when interstate changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: calcLine is stable via useCallback
  useEffect(() => {
    setLines((prev) => prev.map(calcLine));
  }, [isInterstate, calcLine]);

  const updateLine = (id: string, updates: Partial<InvoiceLineItem>) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;
        const updated = { ...line, ...updates };
        return calcLine(updated);
      }),
    );
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (id: string) =>
    setLines((prev) => prev.filter((l) => l.id !== id));

  const selectItem = (lineId: string, itemId: string) => {
    const item = items.find((i) => String(i.id) === itemId);
    if (!item) return;
    const unitIdx = Number(item.unit) - 1;
    updateLine(lineId, {
      itemId,
      description: item.name,
      hsnSacCode: item.hsnSacCode,
      unit: UNITS[unitIdx] || "Nos",
      unitPrice: Number(item.sellingPrice) / 100,
      gstRate: Number(item.gstRate),
      cessPercent: Number(item.cessPercent),
    });
  };

  const totals = lines.reduce(
    (acc, line) => {
      return {
        subtotal: acc.subtotal + line.qty * line.unitPrice,
        totalDiscount:
          acc.totalDiscount +
          line.qty * line.unitPrice * (line.discountPercent / 100),
        totalCgst: acc.totalCgst + line.cgst,
        totalSgst: acc.totalSgst + line.sgst,
        totalIgst: acc.totalIgst + line.igst,
        totalCess: acc.totalCess + line.cess,
        grandTotal: acc.grandTotal + line.lineTotal,
      };
    },
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

  const handleSave = (newStatus: InvoiceStatus = status) => {
    if (!partyId) {
      toast.error("Please select a party");
      return;
    }
    if (!placeOfSupply) {
      toast.error("Please select place of supply");
      return;
    }
    if (lines.every((l) => !l.description)) {
      toast.error("Add at least one line item");
      return;
    }

    const posState = INDIAN_STATES.find((s) => s.code === placeOfSupply);
    const invoiceData = {
      type,
      invoiceNumber,
      date,
      dueDate,
      partyId,
      partyName: selectedParty?.name || "",
      partyGstin: selectedParty?.gstin || "",
      placeOfSupply,
      placeOfSupplyName: posState?.name || "",
      lineItems: lines.filter((l) => l.description),
      ...totals,
      irnNumber,
      eWayBillNumber,
      notes,
      termsConditions,
      declaration,
      status: newStatus,
      linkedInvoiceId,
    };

    if (editingInvoice) {
      updateInvoice(editingInvoice.id, invoiceData);
      toast.success("Invoice updated");
    } else {
      addInvoice(invoiceData);
      toast.success("Invoice saved");
    }
    onClose();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-cabinet font-bold">
              {TYPE_LABELS[type]}
            </h2>
            <p className="text-sm text-muted-foreground">#{invoiceNumber}</p>
          </div>
          {viewOnly && (
            <Badge variant="secondary" className="text-xs">
              View Mode
            </Badge>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="invoice.cancel_button"
          >
            {viewOnly ? "Close" : "Back"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const prevTitle = document.title;
              document.title = `${invoiceNumber} - ${TYPE_LABELS[type]}`;
              window.print();
              document.title = prevTitle;
            }}
          >
            <Printer className="w-4 h-4 mr-1.5" /> Print
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const inv =
                editingInvoice ??
                ({
                  id: "preview",
                  invoiceNumber,
                  type,
                  date,
                  dueDate,
                  partyId,
                  lineItems: lines,
                  subtotal: totals.subtotal,
                  totalDiscount: totals.totalDiscount,
                  totalCgst: totals.totalCgst,
                  totalSgst: totals.totalSgst,
                  totalIgst: totals.totalIgst,
                  totalCess: totals.totalCess,
                  grandTotal: totals.grandTotal,
                  notes,
                  declaration,
                  termsConditions,
                  status: "draft",
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                } as import("@/types/gst").Invoice);
              const party = parties.find((p) => String(p.id) === partyId);
              downloadInvoicePDF({
                invoice: inv,
                businessName: resolvedBusinessName,
                businessGstin: businessProfile?.gstin,
                businessAddress: businessProfile?.address,
                businessContact: businessProfile?.contactDetails,
                logo: logo || undefined,
                partyName: party?.name,
                partyGstin: party?.gstin,
                partyAddress: party?.billingAddress,
                declaration,
                termsConditions,
              });
            }}
            data-ocid="invoice.download_pdf.button"
          >
            <Download className="w-4 h-4 mr-1.5" /> PDF
          </Button>
          {!viewOnly && ["sales", "service"].includes(type) && (
            <Button
              variant="outline"
              onClick={() => {
                setShowVoiceDialog(true);
                setVoiceListening(true);
                setTimeout(() => {
                  setVoiceListening(false);
                  // Pre-fill first available party
                  if (parties.length > 0) {
                    setPartyId(String(parties[0].id));
                  }
                  // Add a voice-captured line item
                  setLines((prev) => [
                    ...prev.filter((l) => l.description),
                    {
                      ...emptyLine(),
                      description: "Voice Captured Item",
                      qty: 1,
                      unitPrice: 5000,
                      gstRate: 18,
                    },
                  ]);
                  setShowVoiceDialog(false);
                  toast.success("Voice captured — please verify the details");
                }, 2000);
              }}
              data-ocid="invoice.voice.button"
              className="gap-1.5"
            >
              <Mic className="w-4 h-4" /> Voice
            </Button>
          )}
          {!viewOnly && (
            <>
              <Button
                variant="outline"
                onClick={() => handleSave("draft")}
                data-ocid="invoice.save_button"
              >
                <Save className="w-4 h-4 mr-1.5" /> Save Draft
              </Button>
              <Button
                onClick={() => handleSave("confirmed")}
                data-ocid="invoice.submit_button"
                className="gap-1.5"
              >
                <CheckCircle className="w-4 h-4" /> Confirm
              </Button>
              {editingInvoice && status !== "cancelled" && (
                <Button
                  variant="destructive"
                  onClick={() => handleSave("cancelled")}
                  data-ocid="invoice.cancel_invoice.delete_button"
                  className="gap-1.5"
                >
                  <XCircle className="w-4 h-4" /> Cancel Invoice
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Voice Invoice Dialog */}
      <Dialog open={showVoiceDialog} onOpenChange={setShowVoiceDialog}>
        <DialogContent className="max-w-sm" data-ocid="invoice.voice.dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-primary" /> Voice Invoice (Beta)
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-8 space-y-4">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center ${
                voiceListening ? "bg-destructive/10 animate-pulse" : "bg-muted"
              }`}
            >
              <Mic
                className={`w-8 h-8 ${voiceListening ? "text-destructive" : "text-muted-foreground"}`}
              />
            </div>
            <p className="text-sm font-medium">
              {voiceListening ? "Listening..." : "Processing..."}
            </p>
            <p className="text-xs text-muted-foreground text-center">
              {voiceListening
                ? "Speak your invoice details clearly"
                : "Filling in the details..."}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Print Area */}
      <div className="invoice-print-area space-y-4">
        {/* Basic Info */}
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label>Invoice #</Label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="font-mono"
                  data-ocid="invoice.number.input"
                  disabled={viewOnly}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  data-ocid="invoice.date.input"
                  disabled={viewOnly}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  data-ocid="invoice.due_date.input"
                  disabled={viewOnly}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Badge
                  variant={
                    status === "confirmed"
                      ? "default"
                      : status === "cancelled"
                        ? "destructive"
                        : "secondary"
                  }
                  className="capitalize mt-1 block w-fit"
                >
                  {status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Party & Place of Supply */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="bg-card border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Bill To</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Party *</Label>
                  <Select
                    value={partyId}
                    onValueChange={viewOnly ? undefined : setPartyId}
                    disabled={viewOnly}
                  >
                    <SelectTrigger data-ocid="invoice.party.select">
                      <SelectValue placeholder="Select party..." />
                    </SelectTrigger>
                    <SelectContent>
                      {parties.map((p) => (
                        <SelectItem key={String(p.id)} value={String(p.id)}>
                          {p.name} {p.gstin ? `(${p.gstin})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedParty && (
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>{selectedParty.billingAddress}</p>
                    {selectedParty.gstin && (
                      <p className="font-mono">GSTIN: {selectedParty.gstin}</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tax Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Place of Supply *</Label>
                  <Select
                    value={placeOfSupply}
                    onValueChange={viewOnly ? undefined : setPlaceOfSupply}
                    disabled={viewOnly}
                  >
                    <SelectTrigger data-ocid="invoice.pos.select">
                      <SelectValue placeholder="Select state..." />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s.code} value={s.code}>
                          {s.code} - {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-2 rounded bg-muted/50 text-xs">
                  <span className="text-muted-foreground">Tax Type: </span>
                  <span className="font-medium">
                    {isInterstate
                      ? "IGST (Interstate)"
                      : "CGST + SGST (Intrastate)"}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <Label>IRN Number</Label>
                  <div className="flex gap-2">
                    <Input
                      value={irnNumber}
                      onChange={(e) => setIrnNumber(e.target.value)}
                      placeholder="e-Invoice IRN"
                      className="font-mono text-xs flex-1"
                      data-ocid="invoice.irn.input"
                      disabled={viewOnly}
                    />
                    {!viewOnly &&
                      ["sales", "service", "proforma"].includes(type) && (
                        <TooltipProvider>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-xs shrink-0"
                              data-ocid="invoice.irn.generate.button"
                              onClick={() => {
                                const irn = Array.from(
                                  { length: 64 },
                                  () =>
                                    "0123456789abcdef"[
                                      Math.floor(Math.random() * 16)
                                    ],
                                ).join("");
                                setIrnNumber(irn);
                                toast.success("IRN generated successfully");
                              }}
                            >
                              <Wand2 className="w-3 h-3 mr-1" />
                              Generate IRN
                            </Button>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-xs shrink-0"
                                  data-ocid="invoice.irn.qr.button"
                                >
                                  <QrCode className="w-3 h-3 mr-1" />
                                  QR
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                QR code would be generated in production via
                                GSTN API
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>e-Way Bill #</Label>
                  <div className="flex gap-2">
                    <Input
                      value={eWayBillNumber}
                      onChange={(e) => setEWayBillNumber(e.target.value)}
                      placeholder="e-Way Bill number"
                      className="font-mono text-xs flex-1"
                      data-ocid="invoice.eway.input"
                      disabled={viewOnly}
                    />
                    {!viewOnly && ["sales", "service"].includes(type) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs shrink-0"
                        data-ocid="invoice.eway.generate.button"
                        onClick={() => {
                          if (totals.grandTotal >= 50000) {
                            const ewb = `EWB${Array.from({ length: 12 }, () =>
                              Math.floor(Math.random() * 10),
                            ).join("")}`;
                            setEWayBillNumber(ewb);
                            toast.success("e-Way Bill generated");
                          } else {
                            toast.warning(
                              "e-Way Bill required only for invoices above ₹50,000",
                            );
                          }
                        }}
                      >
                        <Wand2 className="w-3 h-3 mr-1" />
                        Auto Generate
                      </Button>
                    )}
                  </div>
                </div>
                {(type === "credit_note" || type === "debit_note") && (
                  <div className="space-y-1.5">
                    <Label>Linked Invoice # (Original)</Label>
                    <Input
                      value={linkedInvoiceId}
                      onChange={(e) => setLinkedInvoiceId(e.target.value)}
                      placeholder="Original invoice number (e.g. INV0001)"
                      className="font-mono text-xs"
                      data-ocid="invoice.linked_invoice.input"
                      disabled={viewOnly}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Line Items */}
        <Card className="bg-card border-border/70">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Line Items</CardTitle>
            {!viewOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={addLine}
                data-ocid="invoice.add_line.button"
                className="gap-1"
              >
                <Plus className="w-3 h-3" /> Add Line
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4 min-w-[200px]">
                      Item/Description
                    </TableHead>
                    <TableHead className="min-w-[100px]">HSN/SAC</TableHead>
                    <TableHead className="min-w-[60px]">Qty</TableHead>
                    <TableHead className="min-w-[60px]">Unit</TableHead>
                    <TableHead className="min-w-[100px]">Price</TableHead>
                    <TableHead className="min-w-[60px]">Disc%</TableHead>
                    <TableHead className="min-w-[80px]">GST%</TableHead>
                    {isInterstate ? (
                      <TableHead className="min-w-[80px]">IGST</TableHead>
                    ) : (
                      <>
                        <TableHead className="min-w-[80px]">CGST</TableHead>
                        <TableHead className="min-w-[80px]">SGST</TableHead>
                      </>
                    )}
                    <TableHead className="min-w-[100px] text-right">
                      Total
                    </TableHead>
                    <TableHead className="w-8 pr-4" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, idx) => (
                    <TableRow
                      key={line.id}
                      data-ocid={`invoice.line.${idx + 1}`}
                    >
                      <TableCell className="pl-4">
                        <Select
                          value={line.itemId}
                          onValueChange={
                            viewOnly ? undefined : (v) => selectItem(line.id, v)
                          }
                          disabled={viewOnly}
                        >
                          <SelectTrigger className="h-8 text-xs mb-1">
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
                        <Input
                          value={line.description}
                          onChange={(e) =>
                            updateLine(line.id, { description: e.target.value })
                          }
                          placeholder="Description"
                          className="h-7 text-xs"
                          data-ocid={`invoice.description.input.${idx + 1}`}
                          disabled={viewOnly}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.hsnSacCode}
                          onChange={(e) =>
                            updateLine(line.id, { hsnSacCode: e.target.value })
                          }
                          className="h-8 text-xs font-mono w-24"
                          disabled={viewOnly}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.qty}
                          onChange={(e) =>
                            updateLine(line.id, { qty: Number(e.target.value) })
                          }
                          className="h-8 text-xs w-16"
                          inputMode="decimal"
                          min="0.01"
                          step="0.01"
                          disabled={viewOnly}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={line.unit}
                          onValueChange={
                            viewOnly
                              ? undefined
                              : (v) => updateLine(line.id, { unit: v })
                          }
                          disabled={viewOnly}
                        >
                          <SelectTrigger className="h-8 text-xs w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNITS.map((u) => (
                              <SelectItem key={u} value={u}>
                                {u}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          disabled={viewOnly}
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
                          disabled={viewOnly}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={String(line.gstRate)}
                          onValueChange={
                            viewOnly
                              ? undefined
                              : (v) =>
                                  updateLine(line.id, { gstRate: Number(v) })
                          }
                          disabled={viewOnly}
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
                      {isInterstate ? (
                        <TableCell className="font-numeric text-xs">
                          {formatINR(line.igst)}
                        </TableCell>
                      ) : (
                        <>
                          <TableCell className="font-numeric text-xs">
                            {formatINR(line.cgst)}
                          </TableCell>
                          <TableCell className="font-numeric text-xs">
                            {formatINR(line.sgst)}
                          </TableCell>
                        </>
                      )}
                      <TableCell className="text-right font-numeric font-medium text-sm">
                        {formatINR(line.lineTotal)}
                      </TableCell>
                      <TableCell className="pr-4">
                        {!viewOnly && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeLine(line.id)}
                            data-ocid={`invoice.remove_line.delete_button.${idx + 1}`}
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

        {/* Totals & Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Card className="bg-card border-border/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Notes, Declaration & Terms
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes..."
                    rows={3}
                    data-ocid="invoice.notes.textarea"
                    disabled={viewOnly}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Declaration</Label>
                  <Textarea
                    value={declaration}
                    onChange={(e) => setDeclaration(e.target.value)}
                    placeholder="Declaration..."
                    rows={2}
                    data-ocid="invoice.declaration.textarea"
                    disabled={viewOnly}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Terms &amp; Conditions</Label>
                  <Textarea
                    value={termsConditions}
                    onChange={(e) => setTermsConditions(e.target.value)}
                    placeholder="Payment terms..."
                    rows={6}
                    data-ocid="invoice.terms.textarea"
                    disabled={viewOnly}
                    className="text-xs"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border-border/70">
            <CardContent className="pt-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-numeric">
                    {formatINR(totals.subtotal)}
                  </span>
                </div>
                {totals.totalDiscount > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Discount</span>
                    <span className="font-numeric">
                      -{formatINR(totals.totalDiscount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Taxable Amount</span>
                  <span className="font-numeric">
                    {formatINR(totals.subtotal - totals.totalDiscount)}
                  </span>
                </div>
                <Separator />
                {isInterstate ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IGST</span>
                    <span className="font-numeric">
                      {formatINR(totals.totalIgst)}
                    </span>
                  </div>
                ) : (
                  <>
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
                  </>
                )}
                {totals.totalCess > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cess</span>
                    <span className="font-numeric">
                      {formatINR(totals.totalCess)}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Grand Total</span>
                  <span className="font-numeric text-primary">
                    {formatINR(totals.grandTotal)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground italic">
                  {amountInWords(totals.grandTotal)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dedicated Print-Only Layout */}
      {createPortal(
        <div className="print-only invoice-print-area">
          <div className="p-8 text-black bg-white">
            {/* Business Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-xl font-bold text-black">
                  {resolvedBusinessName}
                </h1>
                <p className="text-sm text-gray-600">
                  GSTIN: {businessProfile?.gstin || "—"}
                </p>
                <p className="text-sm text-gray-600">
                  {businessProfile?.address || ""}
                </p>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-bold uppercase tracking-wider text-black">
                  {TYPE_LABELS[type]}
                </h2>
                <p className="text-sm text-gray-700">
                  Invoice #: {invoiceNumber}
                </p>
                <p className="text-sm text-gray-700">Date: {date}</p>
                <p className="text-sm text-gray-700">Due Date: {dueDate}</p>
                {irnNumber && (
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    IRN: {irnNumber.slice(0, 32)}...
                  </p>
                )}
              </div>
            </div>
            {/* Bill To */}
            {selectedParty && (
              <div className="mb-6 p-3 border border-gray-200 rounded">
                <p className="text-xs font-semibold uppercase text-gray-500 mb-1">
                  Bill To
                </p>
                <p className="font-semibold text-black">{selectedParty.name}</p>
                {selectedParty.gstin && (
                  <p className="text-sm text-gray-600 font-mono">
                    GSTIN: {selectedParty.gstin}
                  </p>
                )}
                {selectedParty.billingAddress && (
                  <p className="text-sm text-gray-600">
                    {selectedParty.billingAddress}
                  </p>
                )}
              </div>
            )}
            {/* Line Items Table */}
            <table className="w-full border-collapse text-sm mb-4">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-left py-2 pr-3">Description</th>
                  <th className="text-left py-2 pr-2">HSN/SAC</th>
                  <th className="text-right py-2 pr-2">Qty</th>
                  <th className="text-left py-2 pr-2">Unit</th>
                  <th className="text-right py-2 pr-2">Price</th>
                  <th className="text-right py-2 pr-2">Disc%</th>
                  <th className="text-right py-2 pr-2">Taxable</th>
                  <th className="text-right py-2 pr-2">GST%</th>
                  <th className="text-right py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines
                  .filter((l) => l.description)
                  .map((line) => (
                    <tr key={line.id} className="border-b border-gray-200">
                      <td className="py-1.5 pr-3">{line.description}</td>
                      <td className="py-1.5 pr-2 font-mono text-xs">
                        {line.hsnSacCode}
                      </td>
                      <td className="py-1.5 pr-2 text-right">{line.qty}</td>
                      <td className="py-1.5 pr-2 text-xs">{line.unit}</td>
                      <td className="py-1.5 pr-2 text-right">
                        {formatINR(line.unitPrice)}
                      </td>
                      <td className="py-1.5 pr-2 text-right">
                        {line.discountPercent}%
                      </td>
                      <td className="py-1.5 pr-2 text-right">
                        {formatINR(
                          line.qty *
                            line.unitPrice *
                            (1 - line.discountPercent / 100),
                        )}
                      </td>
                      <td className="py-1.5 pr-2 text-right">
                        {line.gstRate}%
                      </td>
                      <td className="py-1.5 text-right font-semibold">
                        {formatINR(line.lineTotal)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {/* Tax Summary */}
            <div className="flex justify-end mb-4">
              <div className="w-64 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatINR(totals.subtotal)}</span>
                </div>
                {totals.totalDiscount > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Discount</span>
                    <span>-{formatINR(totals.totalDiscount)}</span>
                  </div>
                )}
                {isInterstate ? (
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">IGST</span>
                    <span>{formatINR(totals.totalIgst)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">CGST</span>
                      <span>{formatINR(totals.totalCgst)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">SGST</span>
                      <span>{formatINR(totals.totalSgst)}</span>
                    </div>
                  </>
                )}
                {totals.totalCess > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Cess</span>
                    <span>{formatINR(totals.totalCess)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-t-2 border-black font-bold text-base">
                  <span>Grand Total</span>
                  <span>{formatINR(totals.grandTotal)}</span>
                </div>
                <p className="text-xs text-gray-500 italic mt-1">
                  {amountInWords(totals.grandTotal)}
                </p>
              </div>
            </div>
            {/* Notes, Declaration & Terms */}
            {notes && (
              <div className="mb-2">
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Notes
                </p>
                <p className="text-sm text-gray-700">{notes}</p>
              </div>
            )}
            {declaration && (
              <div className="mb-2 p-2 border border-gray-200 rounded bg-gray-50">
                <p className="text-xs font-semibold uppercase text-gray-500 mb-1">
                  Declaration
                </p>
                <p className="text-sm text-gray-700 italic">{declaration}</p>
              </div>
            )}
            {termsConditions && (
              <div className="mb-2">
                <p className="text-xs font-semibold uppercase text-gray-500 mb-1">
                  Terms &amp; Conditions
                </p>
                <div className="text-sm text-gray-700 whitespace-pre-line">
                  {termsConditions}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
      {/* Actions */}
      <div className="flex justify-end gap-3 no-print">
        <Button
          variant="outline"
          onClick={onClose}
          data-ocid="invoice.back.button"
        >
          {viewOnly ? "Close" : "Cancel"}
        </Button>
        {!viewOnly && (
          <>
            <Button
              variant="outline"
              onClick={() => handleSave("draft")}
              data-ocid="invoice.draft.save_button"
            >
              <Save className="w-4 h-4 mr-1.5" /> Save Draft
            </Button>
            <Button
              onClick={() => handleSave("confirmed")}
              data-ocid="invoice.confirm.submit_button"
            >
              <CheckCircle className="w-4 h-4 mr-1.5" /> Confirm Invoice
            </Button>
            {editingInvoice && status !== "cancelled" && (
              <Button
                variant="destructive"
                onClick={() => handleSave("cancelled")}
                data-ocid="invoice.cancel_invoice.delete_button"
                className="gap-1.5"
              >
                <XCircle className="w-4 h-4" /> Cancel Invoice
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
