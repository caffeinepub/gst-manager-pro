import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiSettings } from "@/hooks/useGSTStore";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  type GSTINVerificationResult,
  type PANVerificationResult,
  verifyGSTIN,
  verifyPAN,
} from "@/services/gstVerificationService";
import type { AppPage } from "@/types/gst";
import {
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  User,
  UserCheck,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface LookupHistoryEntry {
  value: string;
  summary: string;
  success: boolean;
  time: string;
}

interface GSTINPANVerificationProps {
  onNavigate: (page: AppPage) => void;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// hasApiKey is now component-level using useApiSettings hook
// See useHasApiKey helper inside component

function ApiKeyBanner({
  type,
  onNavigate,
  apiSettings,
}: {
  type: "gstn" | "pan";
  onNavigate: (page: AppPage) => void;
  apiSettings: {
    gstn?: { enabled?: boolean; key?: string };
    pan?: { enabled?: boolean; key?: string };
  };
}) {
  const hasKey =
    type === "gstn"
      ? !!(apiSettings?.gstn?.enabled && apiSettings?.gstn?.key)
      : !!(apiSettings?.pan?.enabled && apiSettings?.pan?.key);
  if (hasKey) return null;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 text-sm">
      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
      <span className="text-amber-800 dark:text-amber-300">
        API key not configured — live government lookup unavailable.{" "}
        <button
          type="button"
          className="underline font-medium hover:no-underline"
          onClick={() => onNavigate("settings-api-config")}
        >
          Configure in Settings &gt; API Config
        </button>
      </span>
    </div>
  );
}

function SourceBadge({
  source,
  errorCode,
}: { source: string; errorCode?: string }) {
  if (source === "live" && errorCode === "CORS_BLOCKED") {
    return (
      <Badge
        variant="outline"
        className="text-xs text-amber-600 border-amber-400 gap-1"
      >
        <AlertTriangle className="w-3 h-3" />
        Live (CORS blocked)
      </Badge>
    );
  }
  if (source === "live") {
    return (
      <Badge
        variant="default"
        className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-600"
      >
        <BadgeCheck className="w-3 h-3" />
        Verified from Government Database
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="text-xs text-blue-600 border-blue-400 gap-1"
    >
      <Info className="w-3 h-3" />
      Format Validation Only
    </Badge>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const isActive =
    status.toLowerCase() === "active" || status.toLowerCase() === "valid";
  return (
    <Badge
      variant={isActive ? "default" : "destructive"}
      className={`text-xs ${isActive ? "bg-emerald-600 hover:bg-emerald-600" : ""}`}
    >
      {isActive ? (
        <CheckCircle2 className="w-3 h-3 mr-1" />
      ) : (
        <XCircle className="w-3 h-3 mr-1" />
      )}
      {status}
    </Badge>
  );
}

function GSTINResult({
  result,
  parties,
  onSaveToParty,
}: {
  result: GSTINVerificationResult;
  parties: Array<{ gstin?: string; name?: string; id?: string }>;
  onSaveToParty: (action: "create" | "update", partyId?: string) => void;
}) {
  const existingParty = parties.find(
    (p) => p.gstin?.toUpperCase() === result.gstin,
  );

  const isCorsBlocked = result.errorCode === "CORS_BLOCKED";
  const showSave = result.source === "live" && result.success;

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge source={result.source} errorCode={result.errorCode} />
      </div>

      {result.source === "format_only" && !result.success && !isCorsBlocked && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {result.error}
        </div>
      )}

      {result.source === "format_only" &&
        result.errorCode !== "INVALID_FORMAT" && (
          <div className="flex items-start gap-2 rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-3 text-sm">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <span className="text-blue-800 dark:text-blue-300">
              Format validation only — live government data not retrieved (API
              key not configured).
            </span>
          </div>
        )}

      {isCorsBlocked && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <span className="text-amber-800 dark:text-amber-300">
            Live API called but blocked by browser CORS policy. This is expected
            in the browser — your system administrator can configure a backend
            proxy. Format validation confirmed.
          </span>
        </div>
      )}

      {result.source === "live" && !result.success && !isCorsBlocked && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {result.error}
        </div>
      )}

      {(result.success ||
        result.errorCode === "CORS_BLOCKED" ||
        result.errorCode === "NO_API_KEY") && (
        <div className="rounded-lg border border-border/70 bg-card overflow-hidden">
          <div className="bg-muted/40 px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              GSTIN Details
            </span>
            <StatusBadge status={result.status} />
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DetailRow
              icon={<ShieldCheck className="w-3.5 h-3.5" />}
              label="GSTIN"
              value={result.gstin}
              mono
            />
            {result.legalName && (
              <DetailRow
                icon={<Building2 className="w-3.5 h-3.5" />}
                label="Legal Name"
                value={result.legalName}
              />
            )}
            {result.tradeName && result.tradeName !== result.legalName && (
              <DetailRow
                icon={<Building2 className="w-3.5 h-3.5" />}
                label="Trade Name"
                value={result.tradeName}
              />
            )}
            {result.taxpayerType && (
              <DetailRow
                icon={<User className="w-3.5 h-3.5" />}
                label="Taxpayer Type"
                value={result.taxpayerType}
              />
            )}
            {result.stateCode && (
              <DetailRow
                icon={<MapPin className="w-3.5 h-3.5" />}
                label="State"
                value={`${result.stateCode} — ${result.stateName ?? ""}`}
              />
            )}
            {result.registrationDate && (
              <DetailRow
                icon={<Clock className="w-3.5 h-3.5" />}
                label="Registered On"
                value={result.registrationDate}
              />
            )}
            {result.principalAddress && (
              <div className="sm:col-span-2">
                <DetailRow
                  icon={<MapPin className="w-3.5 h-3.5" />}
                  label="Principal Address"
                  value={result.principalAddress}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {showSave && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {existingParty ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => onSaveToParty("update", existingParty.id)}
              data-ocid="gstin_verify.update_party_button"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Update Party: {existingParty.name}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => onSaveToParty("create")}
              data-ocid="gstin_verify.create_party_button"
            >
              <Building2 className="w-3.5 h-3.5" />
              Create New Party
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function PANResult({
  result,
  parties,
  onSaveToParty,
}: {
  result: PANVerificationResult;
  parties: Array<{ pan?: string; name?: string; id?: string }>;
  onSaveToParty: (action: "create" | "update", partyId?: string) => void;
}) {
  const existingParty = parties.find(
    (p) => p.pan?.toUpperCase() === result.pan,
  );

  const isCorsBlocked = result.errorCode === "CORS_BLOCKED";
  const showSave = result.source === "live" && result.success;

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge source={result.source} errorCode={result.errorCode} />
      </div>

      {result.source === "format_only" && !result.success && !isCorsBlocked && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {result.error}
        </div>
      )}

      {result.source === "format_only" &&
        result.errorCode !== "INVALID_FORMAT" && (
          <div className="flex items-start gap-2 rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-3 text-sm">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <span className="text-blue-800 dark:text-blue-300">
              Format validation only — live government data not retrieved (API
              key not configured).
            </span>
          </div>
        )}

      {isCorsBlocked && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <span className="text-amber-800 dark:text-amber-300">
            Live API called but blocked by browser CORS policy. This is expected
            in the browser — your system administrator can configure a backend
            proxy. Format validation confirmed.
          </span>
        </div>
      )}

      {result.source === "live" && !result.success && !isCorsBlocked && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {result.error}
        </div>
      )}

      {(result.success ||
        result.errorCode === "CORS_BLOCKED" ||
        result.errorCode === "NO_API_KEY") && (
        <div className="rounded-lg border border-border/70 bg-card overflow-hidden">
          <div className="bg-muted/40 px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              PAN Details
            </span>
            <StatusBadge status={result.status} />
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DetailRow
              icon={<ShieldCheck className="w-3.5 h-3.5" />}
              label="PAN"
              value={result.pan}
              mono
            />
            {result.panHolderName && (
              <DetailRow
                icon={<User className="w-3.5 h-3.5" />}
                label="Holder Name"
                value={result.panHolderName}
              />
            )}
            {result.panType && (
              <DetailRow
                icon={<Building2 className="w-3.5 h-3.5" />}
                label="PAN Type"
                value={result.panType}
              />
            )}
            {result.assessingOfficerCode && (
              <DetailRow
                icon={<Info className="w-3.5 h-3.5" />}
                label="AO Code"
                value={result.assessingOfficerCode}
                mono
              />
            )}
          </div>
        </div>
      )}

      {showSave && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {existingParty ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => onSaveToParty("update", existingParty.id)}
              data-ocid="pan_verify.update_party_button"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Update Party: {existingParty.name}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => onSaveToParty("create")}
              data-ocid="pan_verify.create_party_button"
            >
              <Building2 className="w-3.5 h-3.5" />
              Create New Party
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <p
        className={`text-sm text-foreground break-all ${mono ? "font-mono" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function HistorySection({
  history,
  onSelect,
  label,
}: {
  history: LookupHistoryEntry[];
  onSelect: (value: string) => void;
  label: string;
}) {
  if (!history.length) return null;
  return (
    <div className="space-y-2" data-ocid="verification.history.panel">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Clock className="w-3.5 h-3.5" />
        Recent {label} Lookups (last {history.length})
      </div>
      <div className="space-y-1.5">
        {history.map((entry, i) => (
          <button
            type="button"
            key={`${entry.value}-${i}`}
            className="w-full text-left flex items-start justify-between gap-3 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            onClick={() => onSelect(entry.value)}
            data-ocid={`verification.history.item.${i + 1}`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-mono text-xs font-semibold text-primary">
                  {entry.value}
                </p>
                {entry.success ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-3 h-3 text-destructive shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {entry.summary}
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
              {formatRelativeTime(entry.time)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function GSTINPANVerification({
  onNavigate,
}: GSTINPANVerificationProps) {
  const [apiSettings] = useApiSettings();
  const [gstinInput, setGstinInput] = useState("");
  const [panInput, setPanInput] = useState("");
  const [gstinLoading, setGstinLoading] = useState(false);
  const [panLoading, setPanLoading] = useState(false);
  const [gstinResult, setGstinResult] =
    useState<GSTINVerificationResult | null>(null);
  const [panResult, setPanResult] = useState<PANVerificationResult | null>(
    null,
  );

  const [gstinHistory, setGstinHistory] = useLocalStorage<LookupHistoryEntry[]>(
    "gstin_lookup_history",
    [],
  );
  const [panHistory, setPanHistory] = useLocalStorage<LookupHistoryEntry[]>(
    "pan_lookup_history",
    [],
  );

  const parties = (() => {
    try {
      return JSON.parse(localStorage.getItem("parties") ?? "[]") as Array<{
        id?: string;
        name?: string;
        gstin?: string;
        pan?: string;
      }>;
    } catch {
      return [];
    }
  })();

  const handleVerifyGSTIN = async () => {
    const value = gstinInput.trim().toUpperCase();
    if (!value) {
      toast.error("Enter a GSTIN to verify");
      return;
    }
    setGstinLoading(true);
    setGstinResult(null);
    const result = await verifyGSTIN(value);
    setGstinResult(result);
    setGstinLoading(false);

    const summary = result.success
      ? `${result.legalName ?? result.tradeName ?? ""} | ${result.status ?? ""} | ${result.source === "live" ? "Live" : "Format only"}`
      : (result.error ?? "Failed");

    setGstinHistory((prev) =>
      [
        {
          value,
          summary,
          success: result.success,
          time: new Date().toISOString(),
        },
        ...prev.filter((h) => h.value !== value),
      ].slice(0, 10),
    );

    if (result.success) {
      toast.success(
        result.source === "live"
          ? "GSTIN verified from Government Database"
          : "GSTIN format is valid",
      );
    } else if (result.errorCode === "CORS_BLOCKED") {
      toast.warning("Live API called — CORS blocked (expected in browser)");
    } else {
      toast.error(result.error ?? "Verification failed");
    }
  };

  const handleVerifyPAN = async () => {
    const value = panInput.trim().toUpperCase();
    if (!value) {
      toast.error("Enter a PAN to verify");
      return;
    }
    setPanLoading(true);
    setPanResult(null);
    const result = await verifyPAN(value);
    setPanResult(result);
    setPanLoading(false);

    const summary = result.success
      ? `${result.panHolderName ?? ""} | ${result.panType ?? ""} | ${result.source === "live" ? "Live" : "Format only"}`
      : (result.error ?? "Failed");

    setPanHistory((prev) =>
      [
        {
          value,
          summary,
          success: result.success,
          time: new Date().toISOString(),
        },
        ...prev.filter((h) => h.value !== value),
      ].slice(0, 10),
    );

    if (result.success) {
      toast.success(
        result.source === "live"
          ? "PAN verified from Government Database"
          : "PAN format is valid",
      );
    } else if (result.errorCode === "CORS_BLOCKED") {
      toast.warning("Live API called — CORS blocked (expected in browser)");
    } else {
      toast.error(result.error ?? "Verification failed");
    }
  };

  const handleGSTINSaveToParty = (
    action: "create" | "update",
    partyId?: string,
  ) => {
    if (!gstinResult?.success) return;
    try {
      const storedParties = JSON.parse(
        localStorage.getItem("parties") ?? "[]",
      ) as Array<Record<string, unknown>>;
      if (action === "update" && partyId) {
        const updated = storedParties.map((p) =>
          p.id === partyId
            ? {
                ...p,
                name: p.name || gstinResult.legalName || gstinResult.tradeName,
                gstin: gstinResult.gstin,
                stateCode: gstinResult.stateCode
                  ? BigInt(Number.parseInt(gstinResult.stateCode, 10))
                  : p.stateCode,
              }
            : p,
        );
        localStorage.setItem("parties", JSON.stringify(updated));
        toast.success("Party updated with verified GSTIN data");
      } else {
        toast.info(
          `Navigate to Masters > Parties > Add Party to create a new party with GSTIN: ${gstinResult.gstin}`,
        );
        onNavigate("masters-parties");
      }
    } catch {
      toast.error("Failed to save party");
    }
  };

  const handlePANSaveToParty = (
    action: "create" | "update",
    partyId?: string,
  ) => {
    if (!panResult?.success) return;
    try {
      const storedParties = JSON.parse(
        localStorage.getItem("parties") ?? "[]",
      ) as Array<Record<string, unknown>>;
      if (action === "update" && partyId) {
        const updated = storedParties.map((p) =>
          p.id === partyId
            ? {
                ...p,
                pan: panResult.pan,
                name: p.name || panResult.panHolderName,
              }
            : p,
        );
        localStorage.setItem("parties", JSON.stringify(updated));
        toast.success("Party updated with verified PAN data");
      } else {
        toast.info(
          `Navigate to Masters > Parties > Add Party to create a new party with PAN: ${panResult.pan}`,
        );
        onNavigate("masters-parties");
      }
    } catch {
      toast.error("Failed to save party");
    }
  };

  return (
    <div className="space-y-5" data-ocid="gst_verification.section">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            GSTIN / PAN Verification
          </h1>
          <p className="text-sm text-muted-foreground">
            Verify taxpayer details directly from Government databases
          </p>
        </div>
        <a
          href="https://www.gst.gov.in/"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          data-ocid="gst_verification.gstn_portal.link"
        >
          GST Portal <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <Tabs
        defaultValue="gstin"
        className="space-y-4"
        data-ocid="gst_verification.tabs"
      >
        <TabsList className="grid grid-cols-2 w-full max-w-xs">
          <TabsTrigger value="gstin" data-ocid="gst_verification.gstin.tab">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
            GSTIN
          </TabsTrigger>
          <TabsTrigger value="pan" data-ocid="gst_verification.pan.tab">
            <User className="w-3.5 h-3.5 mr-1.5" />
            PAN
          </TabsTrigger>
        </TabsList>

        {/* ─── GSTIN Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="gstin" className="space-y-4">
          <ApiKeyBanner
            type="gstn"
            onNavigate={onNavigate}
            apiSettings={apiSettings}
          />

          <Card className="bg-card border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                GSTIN Lookup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">GSTIN Number</Label>
                <div className="flex gap-2">
                  <Input
                    value={gstinInput}
                    onChange={(e) => {
                      setGstinInput(e.target.value.toUpperCase());
                      setGstinResult(null);
                    }}
                    onKeyDown={(e) =>
                      e.key === "Enter" && void handleVerifyGSTIN()
                    }
                    placeholder="e.g. 27AABCU9603R1ZX"
                    className="font-mono flex-1"
                    maxLength={15}
                    data-ocid="gstin_verify.input"
                  />
                  <Button
                    onClick={() => void handleVerifyGSTIN()}
                    disabled={gstinLoading}
                    className="gap-2 shrink-0"
                    data-ocid="gstin_verify.primary_button"
                  >
                    {gstinLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Verify
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Format: 2 digits + 5 uppercase letters + 4 digits + 1 letter +
                  1 alphanumeric + Z + 1 alphanumeric
                </p>
              </div>

              {gstinLoading && (
                <div
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  data-ocid="gstin_verify.loading_state"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Querying GST Network...
                </div>
              )}

              {gstinResult && !gstinLoading && (
                <GSTINResult
                  result={gstinResult}
                  parties={parties}
                  onSaveToParty={handleGSTINSaveToParty}
                />
              )}
            </CardContent>
          </Card>

          {gstinHistory.length > 0 && (
            <Card className="bg-card border-border/70">
              <CardContent className="pt-4">
                <HistorySection
                  history={gstinHistory}
                  label="GSTIN"
                  onSelect={(v) => {
                    setGstinInput(v);
                    setGstinResult(null);
                  }}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── PAN Tab ───────────────────────────────────────────────────── */}
        <TabsContent value="pan" className="space-y-4">
          <ApiKeyBanner
            type="pan"
            onNavigate={onNavigate}
            apiSettings={apiSettings}
          />

          <Card className="bg-card border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                PAN Lookup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">PAN Number</Label>
                <div className="flex gap-2">
                  <Input
                    value={panInput}
                    onChange={(e) => {
                      setPanInput(e.target.value.toUpperCase());
                      setPanResult(null);
                    }}
                    onKeyDown={(e) =>
                      e.key === "Enter" && void handleVerifyPAN()
                    }
                    placeholder="e.g. ABCDE1234F"
                    className="font-mono flex-1"
                    maxLength={10}
                    data-ocid="pan_verify.input"
                  />
                  <Button
                    onClick={() => void handleVerifyPAN()}
                    disabled={panLoading}
                    className="gap-2 shrink-0"
                    data-ocid="pan_verify.primary_button"
                  >
                    {panLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Verify
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Format: 5 uppercase letters + 4 digits + 1 uppercase letter
                  (e.g. ABCDE1234F)
                </p>
              </div>

              {panLoading && (
                <div
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  data-ocid="pan_verify.loading_state"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Querying Income Tax e-Filing...
                </div>
              )}

              {panResult && !panLoading && (
                <PANResult
                  result={panResult}
                  parties={parties}
                  onSaveToParty={handlePANSaveToParty}
                />
              )}
            </CardContent>
          </Card>

          {panHistory.length > 0 && (
            <Card className="bg-card border-border/70">
              <CardContent className="pt-4">
                <HistorySection
                  history={panHistory}
                  label="PAN"
                  onSelect={(v) => {
                    setPanInput(v);
                    setPanResult(null);
                  }}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Separator />

      {/* Info Footer */}
      <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-2">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground">
              About Government API Access
            </p>
            <p className="text-xs text-muted-foreground">
              GSTN API:{" "}
              <span className="font-mono text-[10px]">api.gst.gov.in</span> —
              Requires GST Suvidha Provider (GSP) registration and IP
              whitelisting with GSTN.
            </p>
            <p className="text-xs text-muted-foreground">
              Income Tax API:{" "}
              <span className="font-mono text-[10px]">
                api.incometax.gov.in
              </span>{" "}
              — Requires registration with the Income Tax Department API portal.
            </p>
            <p className="text-xs text-muted-foreground">
              Government APIs block browser-side requests via CORS policy. A
              backend proxy is required for production deployments. Configure
              API keys in{" "}
              <button
                type="button"
                className="underline hover:no-underline text-primary"
                onClick={() => onNavigate("settings-api-config")}
              >
                Settings &gt; API Config
              </button>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
