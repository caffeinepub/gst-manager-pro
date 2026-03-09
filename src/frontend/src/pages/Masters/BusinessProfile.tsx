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
import { Textarea } from "@/components/ui/textarea";
import { useInvoiceDefaults } from "@/hooks/useGSTStore";
import { RegistrationType } from "@/hooks/useQueries";
import { useBusinessProfile, useSetBusinessProfile } from "@/hooks/useQueries";
import { INDIAN_STATES } from "@/types/gst";
import { Building2, FileText, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function BusinessProfile() {
  const { data: profile, isLoading } = useBusinessProfile();
  const { mutate: saveProfile, isPending } = useSetBusinessProfile();
  const { defaults: invoiceDefaults, saveDefaults } = useInvoiceDefaults();

  const [defaultsForm, setDefaultsForm] = useState({
    declaration: invoiceDefaults.declaration,
    termsConditions: invoiceDefaults.termsConditions,
  });

  const handleSaveDefaults = (e: React.FormEvent) => {
    e.preventDefault();
    saveDefaults(defaultsForm);
    toast.success("Invoice defaults saved");
  };

  const [form, setForm] = useState({
    businessName: "",
    gstin: "",
    registrationType: RegistrationType.regular as string,
    stateCode: "27",
    address: "",
    contactDetails: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        businessName: profile.businessName,
        gstin: profile.gstin,
        registrationType: profile.registrationType,
        stateCode: String(profile.stateCode),
        address: profile.address,
        contactDetails: profile.contactDetails,
      });
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName || !form.gstin) {
      toast.error("Business name and GSTIN are required");
      return;
    }
    if (!GSTIN_REGEX.test(form.gstin)) {
      toast.error(
        "Invalid GSTIN format. Should be 15 characters like: 27AABCU9603R1ZX",
      );
      return;
    }
    saveProfile(
      {
        businessName: form.businessName,
        gstin: form.gstin,
        registrationType: form.registrationType as RegistrationType,
        stateCode: BigInt(form.stateCode),
        address: form.address,
        contactDetails: form.contactDetails,
      },
      {
        onSuccess: () => toast.success("Business profile saved successfully"),
        onError: () => toast.error("Failed to save profile"),
      },
    );
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-64"
        data-ocid="profile.loading_state"
      >
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6" data-ocid="profile.section">
      <Card className="bg-card border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-5 h-5 text-primary" />
            Business Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  value={form.businessName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, businessName: e.target.value }))
                  }
                  placeholder="e.g. Acme Technologies Pvt Ltd"
                  data-ocid="profile.businessName.input"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gstin">GSTIN *</Label>
                <Input
                  id="gstin"
                  value={form.gstin}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      gstin: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="27AABCU9603R1ZX"
                  maxLength={15}
                  className="font-mono"
                  data-ocid="profile.gstin.input"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Registration Type</Label>
                <Select
                  value={form.registrationType}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, registrationType: v }))
                  }
                >
                  <SelectTrigger data-ocid="profile.regType.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={RegistrationType.regular}>
                      Regular
                    </SelectItem>
                    <SelectItem value={RegistrationType.composition}>
                      Composition
                    </SelectItem>
                    <SelectItem value={RegistrationType.unregistered}>
                      Unregistered
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Select
                  value={form.stateCode}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, stateCode: v }))
                  }
                >
                  <SelectTrigger data-ocid="profile.state.select">
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
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, address: e.target.value }))
                  }
                  placeholder="Full business address"
                  data-ocid="profile.address.input"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="contact">Contact Details</Label>
                <Input
                  id="contact"
                  value={form.contactDetails}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, contactDetails: e.target.value }))
                  }
                  placeholder="Phone, email, website"
                  data-ocid="profile.contact.input"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isPending}
                data-ocid="profile.save_button"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Invoice Defaults: Declaration & Terms */}
      <Card className="bg-card border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-5 h-5 text-primary" />
            Invoice Defaults
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            These texts appear on all new invoices by default. You can still
            edit them per invoice.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveDefaults} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="declaration">Declaration</Label>
              <Textarea
                id="declaration"
                value={defaultsForm.declaration}
                onChange={(e) =>
                  setDefaultsForm((p) => ({
                    ...p,
                    declaration: e.target.value,
                  }))
                }
                rows={3}
                placeholder="Declaration text..."
                data-ocid="profile.declaration.textarea"
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Printed on every invoice below the totals.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="termsConditions">Terms &amp; Conditions</Label>
              <Textarea
                id="termsConditions"
                value={defaultsForm.termsConditions}
                onChange={(e) =>
                  setDefaultsForm((p) => ({
                    ...p,
                    termsConditions: e.target.value,
                  }))
                }
                rows={8}
                placeholder="Terms and conditions..."
                data-ocid="profile.terms.textarea"
                className="text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Replace "BUSINESS NAME" with your actual business name and
                "STATE" with your state.
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" data-ocid="profile.defaults.save_button">
                <Save className="w-4 h-4 mr-2" />
                Save Defaults
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
