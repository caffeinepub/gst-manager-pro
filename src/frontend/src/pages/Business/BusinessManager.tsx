import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import type { Business } from "@/hooks/useBusinessContext";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { INDIAN_STATES } from "@/types/gst";
import {
  Building2,
  CheckCircle2,
  Edit3,
  PlusCircle,
  Trash2,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

const HUXLEY_FONT =
  '"Huxley Titling", "Cinzel", "Playfair Display", Georgia, serif';

type BusinessType = "Regular" | "Composition" | "Unregistered";

interface BusinessFormState {
  name: string;
  gstin: string;
  stateCode: string;
  businessType: BusinessType;
  role: "admin" | "user";
}

const DEFAULT_FORM: BusinessFormState = {
  name: "",
  gstin: "",
  stateCode: "",
  businessType: "Regular",
  role: "user",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const BIZ_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-teal-500",
];

function getBizColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % BIZ_COLORS.length;
  }
  return BIZ_COLORS[hash];
}

function validateGstin(v: string) {
  return (
    !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v)
  );
}

export function BusinessManager() {
  const {
    businesses,
    activeBizId,
    addBusiness,
    updateBusiness,
    deleteBusiness,
    switchBusiness,
  } = useBusinessContext();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Business | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Business | null>(null);
  const [form, setForm] = useState<BusinessFormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateForm = (key: keyof BusinessFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Business name is required";
    if (form.gstin && !validateGstin(form.gstin))
      errs.gstin = "Invalid GSTIN format";
    if (!form.stateCode) errs.stateCode = "Please select a state";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAdd = () => {
    if (!validateForm()) return;
    addBusiness({
      name: form.name.trim(),
      gstin: form.gstin.toUpperCase(),
      stateCode: form.stateCode,
      businessType: form.businessType,
      role: form.role,
    });
    setForm(DEFAULT_FORM);
    setAddOpen(false);
  };

  const handleEditOpen = (biz: Business) => {
    setEditTarget(biz);
    setForm({
      name: biz.name,
      gstin: biz.gstin,
      stateCode: biz.stateCode,
      businessType: (biz.businessType as BusinessType) ?? "Regular",
      role: biz.role,
    });
    setErrors({});
  };

  const handleEditSave = () => {
    if (!validateForm() || !editTarget) return;
    updateBusiness(editTarget.id, {
      name: form.name.trim(),
      gstin: form.gstin.toUpperCase(),
      stateCode: form.stateCode,
      businessType: form.businessType,
      role: form.role,
    });
    setEditTarget(null);
    setForm(DEFAULT_FORM);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    // If deleting the currently active business, switch first
    if (deleteTarget.id === activeBizId) {
      const remaining = businesses.filter((b) => b.id !== deleteTarget.id);
      if (remaining.length > 0) {
        switchBusiness(remaining[0].id);
      }
      // If no remaining businesses, deleteBusiness will handle UI reset
    }
    deleteBusiness(deleteTarget.id);
    setDeleteTarget(null);
  };

  const stateName = (code: string) =>
    INDIAN_STATES.find((s) => s.code === code)?.name ?? code;

  const BusinessForm = () => (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Business Name *</Label>
        <Input
          value={form.name}
          onChange={(e) => updateForm("name", e.target.value)}
          placeholder="e.g. Militis Technologies Pvt Ltd"
          className="mt-1.5"
          data-ocid="biz_manager.name.input"
        />
        {errors.name && (
          <p
            className="text-xs text-destructive mt-1"
            data-ocid="biz_manager.name.error_state"
          >
            {errors.name}
          </p>
        )}
      </div>
      <div>
        <Label className="text-sm font-medium">
          GSTIN{" "}
          <span className="text-muted-foreground font-normal">(Optional)</span>
        </Label>
        <Input
          value={form.gstin}
          onChange={(e) => updateForm("gstin", e.target.value.toUpperCase())}
          placeholder="15-character GSTIN"
          className="mt-1.5 font-mono"
          maxLength={15}
          data-ocid="biz_manager.gstin.input"
        />
        {errors.gstin && (
          <p
            className="text-xs text-destructive mt-1"
            data-ocid="biz_manager.gstin.error_state"
          >
            {errors.gstin}
          </p>
        )}
      </div>
      <div>
        <Label className="text-sm font-medium">State *</Label>
        <Select
          value={form.stateCode}
          onValueChange={(v) => updateForm("stateCode", v)}
        >
          <SelectTrigger
            className="mt-1.5"
            data-ocid="biz_manager.state.select"
          >
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent>
            {INDIAN_STATES.map((s) => (
              <SelectItem key={s.code} value={s.code}>
                {s.name} ({s.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.stateCode && (
          <p
            className="text-xs text-destructive mt-1"
            data-ocid="biz_manager.state.error_state"
          >
            {errors.stateCode}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-sm font-medium">Business Type</Label>
          <Select
            value={form.businessType}
            onValueChange={(v) => updateForm("businessType", v)}
          >
            <SelectTrigger
              className="mt-1.5"
              data-ocid="biz_manager.type.select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Regular">Regular</SelectItem>
              <SelectItem value="Composition">Composition</SelectItem>
              <SelectItem value="Unregistered">Unregistered</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm font-medium">Role</Label>
          <Select
            value={form.role}
            onValueChange={(v) => updateForm("role", v)}
          >
            <SelectTrigger
              className="mt-1.5"
              data-ocid="biz_manager.role.select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Business Owner</SelectItem>
              <SelectItem value="admin">CA / Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Business Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {businesses.length} business{businesses.length !== 1 ? "es" : ""}{" "}
            configured
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setForm(DEFAULT_FORM);
                setErrors({});
              }}
              data-ocid="biz_manager.add.button"
            >
              <PlusCircle className="mr-2 w-4 h-4" />
              Add New Business
            </Button>
          </DialogTrigger>
          <DialogContent
            className="sm:max-w-md"
            data-ocid="biz_manager.add.dialog"
          >
            <DialogHeader>
              <DialogTitle>Add New Business</DialogTitle>
              <DialogDescription>
                Set up a new business entity to manage separately.
              </DialogDescription>
            </DialogHeader>
            <BusinessForm />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddOpen(false)}
                data-ocid="biz_manager.add.cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                data-ocid="biz_manager.add.submit_button"
              >
                Create Business
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Business Grid */}
      {businesses.length === 0 ? (
        <div
          className="text-center py-16 rounded-2xl border-2 border-dashed border-border"
          data-ocid="biz_manager.empty_state"
        >
          <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            No businesses added yet
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setAddOpen(true)}
            data-ocid="biz_manager.add_first.button"
          >
            <PlusCircle className="mr-2 w-4 h-4" />
            Add Your First Business
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {businesses.map((biz, idx) => (
            <motion.div
              key={biz.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              data-ocid={`biz_manager.item.${idx + 1}`}
            >
              <Card
                className={`relative transition-shadow hover:shadow-md ${
                  biz.id === activeBizId ? "ring-2 ring-primary" : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                        biz.logo ? "" : getBizColor(biz.id)
                      }`}
                    >
                      {biz.logo ? (
                        <img
                          src={biz.logo}
                          alt={biz.name}
                          className="w-full h-full rounded-xl object-contain"
                        />
                      ) : (
                        getInitials(biz.name)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle
                          className="text-sm leading-tight truncate"
                          style={{
                            fontFamily: HUXLEY_FONT,
                            letterSpacing: "0.02em",
                          }}
                        >
                          {biz.name}
                        </CardTitle>
                        {biz.id === activeBizId && (
                          <Badge
                            className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0"
                            data-ocid={`biz_manager.active.${idx + 1}`}
                          >
                            Active
                          </Badge>
                        )}
                      </div>
                      {biz.gstin ? (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                          {biz.gstin}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          No GSTIN
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                    {biz.stateCode && (
                      <span className="bg-muted px-2 py-0.5 rounded-md">
                        {stateName(biz.stateCode)}
                      </span>
                    )}
                    {biz.businessType && (
                      <span className="bg-muted px-2 py-0.5 rounded-md">
                        {biz.businessType}
                      </span>
                    )}
                    <span className="bg-muted px-2 py-0.5 rounded-md flex items-center gap-1">
                      {biz.role === "admin" ? (
                        <Users className="w-3 h-3" />
                      ) : (
                        <Building2 className="w-3 h-3" />
                      )}
                      {biz.role === "admin" ? "CA/Admin" : "Owner"}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {biz.id !== activeBizId && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => switchBusiness(biz.id)}
                        data-ocid={`biz_manager.switch.${idx + 1}`}
                      >
                        <CheckCircle2 className="mr-1.5 w-3.5 h-3.5" />
                        Switch
                      </Button>
                    )}
                    {biz.id === activeBizId && (
                      <div className="flex-1 flex items-center justify-center gap-1.5 text-xs text-primary font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Currently Active
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditOpen(biz)}
                      data-ocid={`biz_manager.edit.${idx + 1}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => setDeleteTarget(biz)}
                      disabled={businesses.length === 1}
                      data-ocid={`biz_manager.delete.${idx + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          data-ocid="biz_manager.edit.dialog"
        >
          <DialogHeader>
            <DialogTitle>Edit Business</DialogTitle>
            <DialogDescription>Update business details.</DialogDescription>
          </DialogHeader>
          <BusinessForm />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditTarget(null)}
              data-ocid="biz_manager.edit.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              data-ocid="biz_manager.edit.save_button"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent
          className="sm:max-w-sm"
          data-ocid="biz_manager.delete.dialog"
        >
          <DialogHeader>
            <DialogTitle>Delete Business?</DialogTitle>
            <DialogDescription>
              This will remove <strong>{deleteTarget?.name}</strong> and all its
              data cannot be recovered. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              data-ocid="biz_manager.delete.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              data-ocid="biz_manager.delete.confirm_button"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
