import type { Party } from "@/backend.d";
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
import { useAuditLogs } from "@/hooks/useGSTStore";
import {
  PartyType,
  useAddParty,
  useDeleteParty,
  useParties,
  useUpdateParty,
} from "@/hooks/useQueries";
import { verifyGSTIN, verifyPAN } from "@/services/gstVerificationService";
import { INDIAN_STATES } from "@/types/gst";
import {
  CheckCircle2,
  Edit,
  Info,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const emptyParty: Omit<Party, "id"> = {
  name: "",
  gstin: "",
  pan: "",
  partyType: PartyType.customer,
  stateCode: BigInt(27),
  billingAddress: "",
  shippingAddress: "",
  email: "",
  phone: "",
  isActive: true,
};

export function Parties() {
  const { data: parties = [], isLoading } = useParties();
  const { mutate: addParty, isPending: isAdding } = useAddParty();
  const { mutate: updateParty, isPending: isUpdating } = useUpdateParty();
  const { mutate: deleteParty, isPending: isDeleting } = useDeleteParty();

  const { addLog } = useAuditLogs();

  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [form, setForm] = useState<Omit<Party, "id">>({ ...emptyParty });
  const [filterType, setFilterType] = useState("all");

  // GSTIN verification state
  const [gstinValidating, setGstinValidating] = useState(false);
  const [gstinValidResult, setGstinValidResult] = useState<{
    status: "success" | "error" | "cors" | "format_only";
    message: string;
    detail?: string;
  } | null>(null);

  // PAN verification state
  const [panValidating, setPanValidating] = useState(false);
  const [panValidResult, setPanValidResult] = useState<{
    status: "success" | "error" | "cors" | "format_only";
    message: string;
  } | null>(null);

  const filtered = parties.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.gstin.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || p.partyType === filterType;
    return matchSearch && matchType;
  });

  const openAdd = () => {
    setEditingParty(null);
    setForm({ ...emptyParty });
    setGstinValidResult(null);
    setPanValidResult(null);
    setShowDialog(true);
  };

  const openEdit = (party: Party) => {
    setEditingParty(party);
    setForm({ ...party });
    setGstinValidResult(null);
    setPanValidResult(null);
    setShowDialog(true);
  };

  const validateGstin = async () => {
    if (!form.gstin) {
      toast.error("Enter a GSTIN to validate");
      return;
    }
    setGstinValidating(true);
    setGstinValidResult(null);
    const result = await verifyGSTIN(form.gstin);
    setGstinValidating(false);

    if (result.success) {
      const detail = [
        result.legalName ?? result.tradeName,
        result.status,
        result.taxpayerType,
      ]
        .filter(Boolean)
        .join(" | ");

      setGstinValidResult({
        status: "success",
        message:
          result.source === "live"
            ? `✓ Verified from Government Database: ${detail}`
            : `Format valid: ${detail || "Valid GSTIN format"}`,
        detail: result.legalName ?? result.tradeName,
      });

      // Auto-populate name if blank
      if (!form.name && (result.legalName || result.tradeName)) {
        setForm((p) => ({
          ...p,
          name: result.legalName ?? result.tradeName ?? p.name,
        }));
      }

      // Auto-populate state code if available
      if (result.stateCode) {
        const numCode = Number.parseInt(result.stateCode, 10);
        if (!Number.isNaN(numCode)) {
          setForm((p) => ({ ...p, stateCode: BigInt(numCode) }));
        }
      }

      toast.success(
        result.source === "live"
          ? "GSTIN verified from Government Database"
          : "GSTIN format valid",
      );
    } else if (result.errorCode === "CORS_BLOCKED") {
      setGstinValidResult({
        status: "cors",
        message:
          "Format valid — live lookup CORS blocked (expected in browser)",
      });
      toast.warning("Live API CORS blocked — format validated");
    } else if (result.errorCode === "NO_API_KEY") {
      setGstinValidResult({
        status: "format_only",
        message:
          "Format valid — live lookup unavailable (no API key configured)",
      });
      toast.success("GSTIN format is valid");
    } else {
      setGstinValidResult({
        status: "error",
        message: result.error ?? "Validation failed",
      });
      toast.error(result.error ?? "Validation failed");
    }
  };

  const validatePan = async () => {
    if (!form.pan) {
      toast.error("Enter a PAN to validate");
      return;
    }
    setPanValidating(true);
    setPanValidResult(null);
    const result = await verifyPAN(form.pan);
    setPanValidating(false);

    if (result.success) {
      const detail = [result.panHolderName, result.panType, result.status]
        .filter(Boolean)
        .join(" | ");
      setPanValidResult({
        status: "success",
        message:
          result.source === "live"
            ? `✓ Verified: ${detail}`
            : `Format valid: ${detail || "Valid PAN format"}`,
      });
      toast.success(
        result.source === "live"
          ? "PAN verified from Government Database"
          : "PAN format valid",
      );
    } else if (result.errorCode === "CORS_BLOCKED") {
      setPanValidResult({
        status: "cors",
        message:
          "Format valid — live lookup CORS blocked (expected in browser)",
      });
      toast.warning("Live API CORS blocked — format validated");
    } else if (result.errorCode === "NO_API_KEY") {
      setPanValidResult({
        status: "format_only",
        message:
          "Format valid — live lookup unavailable (no API key configured)",
      });
      toast.success("PAN format is valid");
    } else {
      setPanValidResult({
        status: "error",
        message: result.error ?? "Validation failed",
      });
      toast.error(result.error ?? "Validation failed");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast.error("Party name is required");
      return;
    }

    if (editingParty) {
      updateParty(
        { id: editingParty.id, party: { ...form, id: editingParty.id } },
        {
          onSuccess: () => {
            toast.success("Party updated");
            addLog({
              action: "update",
              entity: "Party",
              entityId: String(editingParty?.id ?? ""),
              description: `Party "${form.name}" updated`,
            });
            setShowDialog(false);
          },
          onError: () => toast.error("Failed to update party"),
        },
      );
    } else {
      addParty(
        { ...form, id: BigInt(0) },
        {
          onSuccess: () => {
            toast.success("Party added");
            addLog({
              action: "create",
              entity: "Party",
              entityId: "",
              description: `Party "${form.name}" created`,
            });
            setShowDialog(false);
          },
          onError: () => toast.error("Failed to add party"),
        },
      );
    }
  };

  const partyTypeBadge = (type: PartyType) => {
    if (type === PartyType.customer)
      return (
        <Badge className="text-xs bg-primary/20 text-primary border-primary/30">
          Customer
        </Badge>
      );
    if (type === PartyType.vendor)
      return (
        <Badge variant="secondary" className="text-xs">
          Vendor
        </Badge>
      );
    return (
      <Badge variant="outline" className="text-xs">
        Both
      </Badge>
    );
  };

  const inlineResultClass = (status: string) => {
    if (status === "success")
      return "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    if (status === "cors" || status === "format_only")
      return "bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    return "bg-destructive/10 text-destructive border-destructive/20";
  };

  const inlineResultIcon = (status: string) => {
    if (status === "success")
      return <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />;
    if (status === "cors" || status === "format_only")
      return <Info className="w-3 h-3 mt-0.5 shrink-0" />;
    return <XCircle className="w-3 h-3 mt-0.5 shrink-0" />;
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-64"
        data-ocid="party.loading_state"
      >
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-ocid="party.section">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search parties..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
              data-ocid="party.search_input"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36" data-ocid="party.filter.select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value={PartyType.customer}>Customers</SelectItem>
              <SelectItem value={PartyType.vendor}>Vendors</SelectItem>
              <SelectItem value={PartyType.both}>Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={openAdd}
          data-ocid="party.add_button"
          className="gap-2"
        >
          <Plus className="w-4 h-4" /> Add Party
        </Button>
      </div>

      <Card className="bg-card border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Parties ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center" data-ocid="party.empty_state">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No parties found</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={openAdd}
              >
                Add First Party
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="party.list.table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Name</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((party, idx) => {
                    const state = INDIAN_STATES.find(
                      (s) => BigInt(s.code) === party.stateCode,
                    );
                    return (
                      <TableRow
                        key={String(party.id)}
                        data-ocid={`party.item.${idx + 1}`}
                      >
                        <TableCell className="pl-4 font-medium">
                          {party.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {party.gstin || "-"}
                        </TableCell>
                        <TableCell>{partyTypeBadge(party.partyType)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {state?.name || "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {party.phone || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={party.isActive ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {party.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(party)}
                              data-ocid={`party.edit_button.${idx + 1}`}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(party.id)}
                              data-ocid={`party.delete_button.${idx + 1}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
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

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="party.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {editingParty ? "Edit Party" : "Add Party"}
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
                  placeholder="Party name"
                  data-ocid="party.name.input"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Party Type</Label>
                <Select
                  value={form.partyType}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, partyType: v as PartyType }))
                  }
                >
                  <SelectTrigger data-ocid="party.type.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PartyType.customer}>Customer</SelectItem>
                    <SelectItem value={PartyType.vendor}>Vendor</SelectItem>
                    <SelectItem value={PartyType.both}>Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* GSTIN with inline verification */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                  GSTIN
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={form.gstin}
                    onChange={(e) => {
                      setForm((p) => ({
                        ...p,
                        gstin: e.target.value.toUpperCase(),
                      }));
                      setGstinValidResult(null);
                    }}
                    placeholder="GSTIN (15 chars)"
                    className="font-mono flex-1"
                    maxLength={15}
                    data-ocid="party.gstin.input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void validateGstin()}
                    disabled={gstinValidating || !form.gstin}
                    data-ocid="party.gstin_validate.button"
                    className="shrink-0 gap-1.5 text-xs"
                  >
                    {gstinValidating ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3 h-3" />
                    )}
                    Verify
                  </Button>
                </div>
                {gstinValidating && (
                  <p
                    className="text-xs text-muted-foreground flex items-center gap-1"
                    data-ocid="party.gstin_validate.loading_state"
                  >
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Querying GST Network...
                  </p>
                )}
                {gstinValidResult && (
                  <div
                    className={`flex items-start gap-1.5 text-xs p-2 rounded-md border ${inlineResultClass(gstinValidResult.status)}`}
                    data-ocid="party.gstin_validate.success_state"
                  >
                    {inlineResultIcon(gstinValidResult.status)}
                    <span>{gstinValidResult.message}</span>
                  </div>
                )}
              </div>

              {/* PAN with inline verification */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  PAN
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={form.pan}
                    onChange={(e) => {
                      setForm((p) => ({
                        ...p,
                        pan: e.target.value.toUpperCase(),
                      }));
                      setPanValidResult(null);
                    }}
                    placeholder="PAN (10 chars)"
                    className="font-mono flex-1"
                    maxLength={10}
                    data-ocid="party.pan.input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void validatePan()}
                    disabled={panValidating || !form.pan}
                    data-ocid="party.pan_validate.button"
                    className="shrink-0 gap-1.5 text-xs"
                  >
                    {panValidating ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <User className="w-3 h-3" />
                    )}
                    Verify
                  </Button>
                </div>
                {panValidating && (
                  <p
                    className="text-xs text-muted-foreground flex items-center gap-1"
                    data-ocid="party.pan_validate.loading_state"
                  >
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Querying Income Tax e-Filing...
                  </p>
                )}
                {panValidResult && (
                  <div
                    className={`flex items-start gap-1.5 text-xs p-2 rounded-md border ${inlineResultClass(panValidResult.status)}`}
                    data-ocid="party.pan_validate.success_state"
                  >
                    {inlineResultIcon(panValidResult.status)}
                    <span>{panValidResult.message}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>State</Label>
                <Select
                  value={String(form.stateCode).padStart(2, "0")}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, stateCode: BigInt(v) }))
                  }
                >
                  <SelectTrigger data-ocid="party.state.select">
                    <SelectValue />
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
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  placeholder="+91 XXXXX XXXXX"
                  data-ocid="party.phone.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="email@example.com"
                  data-ocid="party.email.input"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Billing Address</Label>
                <Input
                  value={form.billingAddress}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, billingAddress: e.target.value }))
                  }
                  placeholder="Billing address"
                  data-ocid="party.billing_address.input"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Shipping Address</Label>
                <Input
                  value={form.shippingAddress}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, shippingAddress: e.target.value }))
                  }
                  placeholder="Shipping address (if different)"
                  data-ocid="party.shipping_address.input"
                />
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) =>
                    setForm((p) => ({ ...p, isActive: v }))
                  }
                  data-ocid="party.active.switch"
                />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                data-ocid="party.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isAdding || isUpdating}
                data-ocid="party.submit_button"
              >
                {(isAdding || isUpdating) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingParty ? "Update" : "Add Party"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent data-ocid="party.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Party?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The party will be permanently
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="party.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              data-ocid="party.delete.confirm_button"
              onClick={() => {
                if (deleteId !== null) {
                  deleteParty(deleteId, {
                    onSuccess: () => {
                      toast.success("Party deleted");
                      addLog({
                        action: "delete",
                        entity: "Party",
                        entityId: String(deleteId ?? ""),
                        description: "Party deleted",
                      });
                      setDeleteId(null);
                    },
                    onError: () => toast.error("Failed to delete party"),
                  });
                }
              }}
              disabled={isDeleting}
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
