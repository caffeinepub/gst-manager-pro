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
import { useBusinessLogo, useExtendedProfile } from "@/hooks/useBusinessLogo";
import { useInvoiceDefaults } from "@/hooks/useGSTStore";
import { RegistrationType } from "@/hooks/useQueries";
import { useBusinessProfile, useSetBusinessProfile } from "@/hooks/useQueries";
import { INDIAN_STATES } from "@/types/gst";
import {
  Building2,
  CreditCard,
  FileText,
  ImageIcon,
  Loader2,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function BusinessProfile() {
  const { data: profile, isLoading } = useBusinessProfile();
  const { mutate: saveProfile, isPending } = useSetBusinessProfile();
  const { defaults: invoiceDefaults, saveDefaults } = useInvoiceDefaults();
  const { logo, saveLogo, clearLogo } = useBusinessLogo();
  const { profile: extended, saveProfile: saveExtended } = useExtendedProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [defaultsForm, setDefaultsForm] = useState({
    declaration: invoiceDefaults.declaration,
    termsConditions: invoiceDefaults.termsConditions,
  });

  const [form, setForm] = useState({
    businessName: "",
    gstin: "",
    registrationType: RegistrationType.regular as string,
    stateCode: "27",
    address: "",
    contactDetails: "",
  });

  const [extForm, setExtForm] = useState({ ...extended });

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

  useEffect(() => {
    setExtForm({ ...extended });
  }, [extended]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo file must be smaller than 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      saveLogo(result);
      toast.success("Logo uploaded successfully");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.match(/image\/(png|jpg|jpeg|svg|svg\+xml)/)) {
      toast.error("Please upload PNG, JPG, or SVG");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo file must be smaller than 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      saveLogo(ev.target?.result as string);
      toast.success("Logo uploaded");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim()) {
      toast.error("Business name is required");
      return;
    }
    if (form.gstin.trim() && !GSTIN_REGEX.test(form.gstin.trim())) {
      toast.warning("GSTIN format looks incorrect. Saving anyway.");
    }
    saveProfile(
      {
        businessName: form.businessName.trim(),
        gstin: form.gstin.trim(),
        registrationType: form.registrationType as RegistrationType,
        stateCode: BigInt(form.stateCode),
        address: form.address,
        contactDetails: form.contactDetails,
      },
      {
        onSuccess: () => {
          saveExtended(extForm);
          toast.success("Business profile saved successfully");
        },
        onError: (err) =>
          toast.error(
            `Failed to save: ${(err as Error)?.message || "Please try again"}`,
          ),
      },
    );
  };

  const handleSaveDefaults = (e: React.FormEvent) => {
    e.preventDefault();
    saveDefaults(defaultsForm);
    toast.success("Invoice defaults saved");
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
    <div className="max-w-3xl space-y-6" data-ocid="profile.section">
      {/* Logo Upload */}
      <Card className="bg-card border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="w-5 h-5 text-primary" />
            Business Logo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            {/* Preview */}
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 flex-shrink-0 overflow-hidden">
              {logo ? (
                <img
                  src={logo}
                  alt="Business logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Building2 className="w-10 h-10 text-muted-foreground/40" />
              )}
            </div>
            {/* Controls */}
            <div className="space-y-3 flex-1">
              <div
                className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) =>
                  e.key === "Enter" && fileInputRef.current?.click()
                }
                data-ocid="profile.logo.dropzone"
              >
                <ImageIcon className="w-6 h-6 mx-auto mb-2 text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">
                  Drag & drop or{" "}
                  <span className="text-primary underline">
                    click to upload
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, SVG • Max 2MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpg,image/jpeg,image/svg+xml"
                className="hidden"
                onChange={handleLogoUpload}
                data-ocid="profile.logo.upload_button"
              />
              {logo && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearLogo}
                  className="text-destructive border-destructive/40 hover:bg-destructive/10"
                  data-ocid="profile.logo.delete_button"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Remove Logo
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Core Profile (saved to backend) */}
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
                  data-ocid="profile.businessname.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tradeName">Trade Name</Label>
                <Input
                  id="tradeName"
                  value={extForm.tradeName}
                  onChange={(e) =>
                    setExtForm((p) => ({ ...p, tradeName: e.target.value }))
                  }
                  placeholder="Trade / Brand name"
                  data-ocid="profile.tradename.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gstin">GSTIN</Label>
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
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pan">PAN</Label>
                <Input
                  id="pan"
                  value={extForm.pan}
                  onChange={(e) =>
                    setExtForm((p) => ({
                      ...p,
                      pan: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="AABCU9603R"
                  maxLength={10}
                  className="font-mono"
                  data-ocid="profile.pan.input"
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
                  <SelectTrigger data-ocid="profile.regtype.select">
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
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={extForm.city}
                  onChange={(e) =>
                    setExtForm((p) => ({ ...p, city: e.target.value }))
                  }
                  placeholder="Mumbai"
                  data-ocid="profile.city.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pin">PIN Code</Label>
                <Input
                  id="pin"
                  value={extForm.pin}
                  onChange={(e) =>
                    setExtForm((p) => ({ ...p, pin: e.target.value }))
                  }
                  placeholder="400001"
                  maxLength={6}
                  data-ocid="profile.pin.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={extForm.phone}
                  onChange={(e) =>
                    setExtForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  placeholder="+91 98765 43210"
                  data-ocid="profile.phone.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={extForm.email}
                  onChange={(e) =>
                    setExtForm((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="info@company.com"
                  data-ocid="profile.email.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={extForm.website}
                  onChange={(e) =>
                    setExtForm((p) => ({ ...p, website: e.target.value }))
                  }
                  placeholder="www.company.com"
                  data-ocid="profile.website.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactDetails">Contact Details (legacy)</Label>
                <Input
                  id="contactDetails"
                  value={form.contactDetails}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, contactDetails: e.target.value }))
                  }
                  placeholder="Phone, email, website (combined)"
                  data-ocid="profile.contactdetails.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                <Input
                  id="invoicePrefix"
                  value={extForm.invoicePrefix}
                  onChange={(e) =>
                    setExtForm((p) => ({
                      ...p,
                      invoicePrefix: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="INV"
                  maxLength={6}
                  data-ocid="profile.invoiceprefix.input"
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

      {/* Bank Details */}
      <Card className="bg-card border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="w-5 h-5 text-primary" />
            Bank Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={extForm.bankName}
                onChange={(e) =>
                  setExtForm((p) => ({ ...p, bankName: e.target.value }))
                }
                placeholder="State Bank of India"
                data-ocid="profile.bankname.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accountNo">Account Number</Label>
              <Input
                id="accountNo"
                value={extForm.accountNo}
                onChange={(e) =>
                  setExtForm((p) => ({ ...p, accountNo: e.target.value }))
                }
                placeholder="XXXXXXXXXX"
                className="font-mono"
                data-ocid="profile.accountno.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ifsc">IFSC Code</Label>
              <Input
                id="ifsc"
                value={extForm.ifsc}
                onChange={(e) =>
                  setExtForm((p) => ({
                    ...p,
                    ifsc: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="SBIN0001234"
                maxLength={11}
                className="font-mono"
                data-ocid="profile.ifsc.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="branch">Branch</Label>
              <Input
                id="branch"
                value={extForm.branch}
                onChange={(e) =>
                  setExtForm((p) => ({ ...p, branch: e.target.value }))
                }
                placeholder="Fort, Mumbai"
                data-ocid="profile.branch.input"
              />
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button
              type="button"
              onClick={() => {
                saveExtended(extForm);
                toast.success("Bank details saved");
              }}
              variant="outline"
              data-ocid="profile.bankdetails.save_button"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Bank Details
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Defaults */}
      <Card className="bg-card border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-5 h-5 text-primary" />
            Invoice Defaults
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            These texts appear on all new invoices by default.
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
