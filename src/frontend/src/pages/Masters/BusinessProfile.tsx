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
import { useBusinessContext } from "@/hooks/useBusinessContext";
import {
  useBusinessLogo,
  useExtendedProfile,
  useLocalBusinessName,
} from "@/hooks/useBusinessLogo";
import { GOOGLE_FONTS, THEME_PRESETS } from "@/hooks/useBusinessTheme";
import { useBankAccounts, useInvoiceDefaults } from "@/hooks/useGSTStore";
import { RegistrationType } from "@/hooks/useQueries";
import { useBusinessProfile, useSetBusinessProfile } from "@/hooks/useQueries";
import type { BankAccount } from "@/types/gst";
import { INDIAN_STATES } from "@/types/gst";
import {
  Building2,
  CreditCard,
  FileText,
  ImageIcon,
  Loader2,
  Palette,
  RefreshCw,
  Save,
  Trash2,
  Type,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// ── Color conversion helpers ───────────────────────────────────────────────

function hexToOklch(hex: string): string {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const C = Math.sqrt((r - L) ** 2 + (g - L) ** 2 + (b - L) ** 2) * 0.5;
  const H = Math.atan2(b - g, r - g) * (180 / Math.PI);
  return `${L.toFixed(3)} ${C.toFixed(3)} ${((H + 360) % 360).toFixed(0)}`;
}

function oklchToHex(oklch: string): string {
  const parts = oklch.trim().split(/\s+/);
  if (parts.length < 3) return "#6366f1";
  const l = Number(parts[0]);
  const c = Number(parts[1]);
  const h = Number(parts[2]);
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b2 = c * Math.sin(hRad);
  const r = Math.max(0, Math.min(1, l + 0.3897 * a + 0.2283 * b2));
  const g = Math.max(0, Math.min(1, l - 0.209 * a - 0.1412 * b2));
  const b = Math.max(0, Math.min(1, l - 0.0091 * a - 1.3342 * b2));
  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ── Preset swatch component ────────────────────────────────────────────────

const SWATCH_ROLES = ["primary", "secondary", "background", "sidebar"] as const;

function PresetCard({
  presetKey,
  isActive,
  onClick,
}: {
  presetKey: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const tokens = THEME_PRESETS[presetKey];
  const label = presetKey
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const swatchColors: Record<string, string> = {
    primary: tokens.primary,
    secondary: tokens.secondary,
    background: tokens.background,
    sidebar: tokens.sidebar,
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-xl border-2 p-3 text-left transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isActive
          ? "border-primary shadow-md ring-1 ring-primary/30"
          : "border-border hover:border-primary/40"
      }`}
      data-ocid="profile.theme.card"
    >
      {/* Color swatches */}
      <div className="flex gap-1 mb-2">
        {SWATCH_ROLES.map((role) => (
          <div
            key={role}
            className="w-5 h-5 rounded-full border border-black/10 flex-shrink-0"
            style={{ background: `oklch(${swatchColors[role]})` }}
          />
        ))}
      </div>
      <p className="text-xs font-medium text-foreground leading-tight">
        {label}
      </p>
      {isActive && (
        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
          <svg
            aria-label="Selected"
            role="img"
            className="w-2.5 h-2.5 text-primary-foreground"
            fill="currentColor"
            viewBox="0 0 12 12"
          >
            <title>Selected</title>
            <path
              d="M10 3L5 8.5 2 5.5"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </button>
  );
}

// ── Custom color row ───────────────────────────────────────────────────────

function ColorRow({
  label,
  value,
  onChange,
  ocid,
}: {
  label: string;
  value: string | undefined;
  onChange: (oklch: string) => void;
  ocid: string;
}) {
  const hexValue = value ? oklchToHex(value) : "#6366f1";

  return (
    <div className="flex items-center gap-3">
      <Label className="w-36 shrink-0 text-sm">{label}</Label>
      <input
        type="color"
        value={hexValue}
        onChange={(e) => onChange(hexToOklch(e.target.value))}
        className="w-9 h-9 rounded-lg border border-border cursor-pointer p-0.5 bg-transparent"
        data-ocid={ocid}
      />
      <code className="text-xs font-mono text-muted-foreground bg-muted/60 px-2 py-1 rounded">
        {value ?? "—"}
      </code>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function BusinessProfile() {
  const { data: profile, isLoading } = useBusinessProfile();
  const { mutate: saveProfile, isPending } = useSetBusinessProfile();
  const { defaults: invoiceDefaults, saveDefaults } = useInvoiceDefaults();
  const { logo, saveLogo, clearLogo } = useBusinessLogo();
  const { saveLocalBusinessName } = useLocalBusinessName();
  const { profile: extended, saveProfile: saveExtended } = useExtendedProfile();
  const { activeBizId, activeBusiness, updateBusiness } = useBusinessContext();
  const {
    accounts,
    addAccount: addBankAccount,
    updateAccount,
  } = useBankAccounts();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fontFileRef = useRef<HTMLInputElement>(null);

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

  // Live preview font state
  const [previewFont, setPreviewFont] = useState<string>(
    activeBusiness?.fontFamily ?? "",
  );

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

  useEffect(() => {
    setPreviewFont(activeBusiness?.fontFamily ?? "");
  }, [activeBusiness?.fontFamily]);

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
      toast.error("Invalid GSTIN format. Please correct before saving.");
      return;
    }

    // 1. Save to localStorage immediately — this is the primary store
    saveLocalBusinessName(form.businessName.trim());
    saveExtended(extForm);
    localStorage.setItem(
      "gst_business_profile",
      JSON.stringify({
        businessName: form.businessName.trim(),
        gstin: form.gstin.trim(),
        registrationType: form.registrationType,
        stateCode: form.stateCode,
        address: form.address,
        contactDetails: form.contactDetails,
      }),
    );
    toast.success("Business profile saved successfully");

    // 2. Attempt backend sync — non-blocking, soft warning on failure
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
        onError: () =>
          toast.warning("Cloud sync unavailable. Your data is saved locally."),
      },
    );
  };

  const handleSaveBankDetails = () => {
    // Save to extended profile
    saveExtended(extForm);

    // Sync to bank accounts store
    const profileEntry: BankAccount = {
      id: "profile-primary-bank",
      bankName: extForm.bankName,
      accountNumber: extForm.accountNo,
      ifsc: extForm.ifsc,
      openingBalance: 0,
      accountType: "current",
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const existingAccount = accounts.find(
      (a) => a.id === "profile-primary-bank",
    );
    if (existingAccount) {
      updateAccount("profile-primary-bank", {
        bankName: extForm.bankName,
        accountNumber: extForm.accountNo,
        ifsc: extForm.ifsc,
      });
    } else if (extForm.bankName || extForm.accountNo || extForm.ifsc) {
      // Use the addAccount hook function to properly persist via store
      addBankAccount(profileEntry);
    }

    toast.success("Bank details saved and synced to Bank Accounts");
  };

  const handleSaveDefaults = (e: React.FormEvent) => {
    e.preventDefault();
    saveDefaults(defaultsForm);
    toast.success("Invoice defaults saved");
  };

  // ── Branding handlers ─────────────────────────────────────────────────

  const handleFontChange = (fontFamily: string) => {
    setPreviewFont(fontFamily);
    if (!activeBizId) return;
    updateBusiness(activeBizId, { fontFamily });
    toast.success(
      fontFamily === "custom"
        ? "Upload a font file below to apply your custom font"
        : `Font changed to ${fontFamily}`,
      { duration: 2000 },
    );
  };

  const handleCustomFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBizId) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Font file must be smaller than 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      updateBusiness(activeBizId, {
        fontFamily: "custom",
        customFontBase64: base64,
        customFontName: file.name,
      });
      toast.success(`Custom font "${file.name}" applied`);
    };
    reader.readAsDataURL(file);
  };

  const handlePresetSelect = (presetKey: string) => {
    if (!activeBizId) return;
    updateBusiness(activeBizId, {
      themePreset: presetKey,
      primaryColor: undefined,
      secondaryColor: undefined,
      bgColor: undefined,
      textColor: undefined,
    });
  };

  const handleColorChange = (
    field: "primaryColor" | "secondaryColor" | "bgColor" | "textColor",
    value: string,
  ) => {
    if (!activeBizId) return;
    updateBusiness(activeBizId, { [field]: value });
  };

  const handleResetBranding = () => {
    if (!activeBizId) return;
    updateBusiness(activeBizId, {
      fontFamily: undefined,
      customFontBase64: undefined,
      customFontName: undefined,
      themePreset: "blue-corporate",
      primaryColor: undefined,
      secondaryColor: undefined,
      bgColor: undefined,
      textColor: undefined,
    });
    setPreviewFont("");
    toast.success("Branding reset to defaults");
  };

  // Compute preview font-family string
  const previewFontFamily =
    previewFont === "custom"
      ? "'BizCustomFont', system-ui, sans-serif"
      : previewFont && GOOGLE_FONTS[previewFont]
        ? `"${GOOGLE_FONTS[previewFont].display}", system-ui, sans-serif`
        : "inherit";

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

      {/* Font & Theme */}
      <Card className="bg-card border-border/70">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="w-5 h-5 text-primary" />
              Font &amp; Theme
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetBranding}
              className="text-muted-foreground hover:text-destructive text-xs"
              data-ocid="profile.branding.reset_button"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Reset to Default
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Changes apply instantly as you configure them.
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Font Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">UI Font</h3>
            </div>

            <div className="space-y-3">
              <Select
                value={previewFont || "__default__"}
                onValueChange={(v) =>
                  handleFontChange(v === "__default__" ? "" : v)
                }
              >
                <SelectTrigger data-ocid="profile.font.select">
                  <SelectValue placeholder="System Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">System Default</SelectItem>
                  {Object.keys(GOOGLE_FONTS).map((fontName) => (
                    <SelectItem key={fontName} value={fontName}>
                      {fontName}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">
                    Custom Font (.ttf / .woff2)
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Live font preview */}
              {previewFont && previewFont !== "custom" && (
                <div
                  className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-foreground"
                  style={{ fontFamily: previewFontFamily }}
                >
                  The quick brown fox jumps over the lazy dog
                </div>
              )}

              {/* Custom font file input */}
              {previewFont === "custom" && (
                <div className="space-y-2">
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fontFileRef.current?.click()}
                    onKeyDown={(e) =>
                      e.key === "Enter" && fontFileRef.current?.click()
                    }
                    data-ocid="profile.font.dropzone"
                  >
                    <Type className="w-5 h-5 mx-auto mb-2 text-muted-foreground/60" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload{" "}
                      <span className="text-primary underline">
                        your font file
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      .ttf or .woff2 • Max 2MB
                    </p>
                  </div>
                  <input
                    ref={fontFileRef}
                    type="file"
                    accept=".ttf,.woff2,font/truetype,font/woff2"
                    className="hidden"
                    onChange={handleCustomFontUpload}
                    data-ocid="profile.font.upload_button"
                  />
                  {activeBusiness?.customFontName && (
                    <p className="text-xs text-muted-foreground">
                      Current:{" "}
                      <span className="text-foreground font-medium">
                        {activeBusiness.customFontName}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Theme Preset Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">Theme Preset</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.keys(THEME_PRESETS).map((key) => (
                <PresetCard
                  key={key}
                  presetKey={key}
                  isActive={
                    (activeBusiness?.themePreset ?? "blue-corporate") === key
                  }
                  onClick={() => handlePresetSelect(key)}
                />
              ))}
            </div>
          </div>

          {/* Custom Colors Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">Custom Colors</h3>
              <span className="text-xs text-muted-foreground">
                (overrides preset)
              </span>
            </div>
            <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
              <ColorRow
                label="Primary Color"
                value={activeBusiness?.primaryColor}
                onChange={(v) => handleColorChange("primaryColor", v)}
                ocid="profile.color.primary"
              />
              <ColorRow
                label="Secondary Color"
                value={activeBusiness?.secondaryColor}
                onChange={(v) => handleColorChange("secondaryColor", v)}
                ocid="profile.color.secondary"
              />
              <ColorRow
                label="Background Color"
                value={activeBusiness?.bgColor}
                onChange={(v) => handleColorChange("bgColor", v)}
                ocid="profile.color.background"
              />
              <ColorRow
                label="Text Color"
                value={activeBusiness?.textColor}
                onChange={(v) => handleColorChange("textColor", v)}
                ocid="profile.color.text"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Custom colors override the selected preset. Use &ldquo;Reset to
              Default&rdquo; to clear all custom colors.
            </p>
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
              onClick={handleSaveBankDetails}
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
