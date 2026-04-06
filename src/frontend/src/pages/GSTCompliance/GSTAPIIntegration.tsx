import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useApiSettings } from "@/hooks/useGSTStore";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { verifyGSTIN, verifyPAN } from "@/services/gstVerificationService";
import type { ApiSettings } from "@/types/gst";
import {
  AlertCircle,
  BadgeCheck,
  BanknoteIcon,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  QrCode,
  RefreshCw,
  Settings,
  Shield,
  Truck,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface GstinHistoryEntry {
  gstin: string;
  result: string;
  time: string;
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

interface ApiResult {
  [key: string]: string | number | boolean;
}

interface ApiCardState {
  loading: boolean;
  result: ApiResult | null;
  error: string | null;
  corsBlocked?: boolean;
  source?: "live" | "format_only" | "no_key";
}

// getApiSettings removed — settings now passed as parameter to API functions

// ─── e-Invoice IRN API ────────────────────────────────────────────────────────

async function callEInvoiceAPI(settings: ApiSettings): Promise<ApiCardState> {
  const cfg = settings.einvoice;

  if (!cfg?.enabled || !cfg.key) {
    return {
      loading: false,
      result: null,
      error:
        "e-Invoice API key not configured. Go to Settings > API Config to set up your IRP credentials.",
      source: "no_key",
    };
  }

  const baseUrl =
    cfg.url ||
    (cfg.sandboxMode
      ? "https://einvoice1-sand.nic.in/irisapi/einvoice/generate"
      : "https://einvoice1.gst.gov.in/irisapi/einvoice/generate");

  const payload = {
    Version: "1.1",
    TranDtls: { TaxSch: "GST", SupTyp: "B2B", RegRev: "N" },
    DocDtls: {
      Typ: "INV",
      No: `INV-${Date.now()}`,
      Dt: new Date().toLocaleDateString("en-IN"),
    },
  };

  try {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        client_id: cfg.clientId || "",
        client_secret: cfg.clientSecret || "",
        user_name: cfg.key,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });

    if (res.status === 401)
      return {
        loading: false,
        result: null,
        error:
          "Authentication failed — check Client ID, Client Secret, and username.",
        source: "live",
      };
    if (res.status === 429)
      return {
        loading: false,
        result: null,
        error: "Rate limit exceeded. Try again shortly.",
        source: "live",
      };

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        loading: false,
        result: null,
        error: `API error (HTTP ${res.status}): ${body || res.statusText}`,
        source: "live",
      };
    }

    const data = await res.json();
    const info = data?.data ?? data?.Data ?? data;
    return {
      loading: false,
      result: {
        IRN: info?.Irn ?? info?.irn ?? "(see full response)",
        AckNo: info?.AckNo ?? info?.ackNo ?? "",
        AckDate: info?.AckDt ?? info?.ackDt ?? "",
        Status: info?.Status ?? "Generated",
        "Signed QR": info?.SignedQRCode
          ? `${String(info.SignedQRCode).slice(0, 24)}...`
          : "(in response)",
      },
      error: null,
      source: "live",
    };
  } catch (err) {
    const isTypeError =
      err instanceof TypeError ||
      (err as Error)?.name === "TypeError" ||
      (err as Error)?.name === "AbortError";
    return {
      loading: false,
      result: null,
      error: isTypeError
        ? "Network/CORS error — IRP APIs require a whitelisted server IP or GSP proxy. Configure your GSP proxy URL in Settings > API Config."
        : `Error: ${(err as Error).message}`,
      corsBlocked: isTypeError,
      source: "live",
    };
  }
}

// ─── e-Way Bill API ───────────────────────────────────────────────────────────

async function callEWayBillAPI(settings: ApiSettings): Promise<ApiCardState> {
  const cfg = settings.ewaybill;

  if (!cfg?.enabled || !cfg.key) {
    return {
      loading: false,
      result: null,
      error:
        "e-Way Bill API key not configured. Go to Settings > API Config to set up your NIC credentials.",
      source: "no_key",
    };
  }

  const baseUrl =
    cfg.url ||
    (cfg.sandboxMode
      ? "https://ewaybillgst.gov.in/api/sandbox/ewayapi/genewaybill"
      : "https://ewaybillgst.gov.in/api/ewayapi/genewaybill");

  const payload = {
    supplyType: "O",
    subSupplyType: 1,
    docType: "INV",
    docNo: `EWB-${Date.now()}`,
    docDate: new Date().toLocaleDateString("en-IN"),
    fromGstin: "",
    toGstin: "",
    transDistance: "100",
    transMode: "1",
    vehicleType: "R",
  };

  try {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        username: cfg.username || "",
        "auth-token": cfg.key,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });

    if (res.status === 401)
      return {
        loading: false,
        result: null,
        error: "Authentication failed — check username and auth-token.",
        source: "live",
      };
    if (res.status === 429)
      return {
        loading: false,
        result: null,
        error: "Rate limit exceeded. Try again shortly.",
        source: "live",
      };

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        loading: false,
        result: null,
        error: `API error (HTTP ${res.status}): ${body || res.statusText}`,
        source: "live",
      };
    }

    const data = await res.json();
    const info = data?.data ?? data;
    return {
      loading: false,
      result: {
        "EWB Number": info?.ewbNo ?? info?.EwbNo ?? "(see response)",
        "Valid From":
          info?.ewbDt ??
          info?.validFrom ??
          new Date().toLocaleDateString("en-IN"),
        "Valid To": info?.ewbValidTill ?? info?.validTo ?? "",
        Distance: `${info?.distance ?? 100} km`,
        Status: "Generated",
      },
      error: null,
      source: "live",
    };
  } catch (err) {
    const isTypeError =
      err instanceof TypeError ||
      (err as Error)?.name === "TypeError" ||
      (err as Error)?.name === "AbortError";
    return {
      loading: false,
      result: null,
      error: isTypeError
        ? "Network/CORS error — NIC e-Way Bill API requires a whitelisted server IP. Configure your GSP proxy URL in Settings > API Config."
        : `Error: ${(err as Error).message}`,
      corsBlocked: isTypeError,
      source: "live",
    };
  }
}

// ─── GSTN Return Fetch ────────────────────────────────────────────────────────

async function callGSTNReturnAPI(
  settings: ApiSettings,
  businessGstin: string,
): Promise<ApiCardState> {
  const cfg = settings.gstnReturn;

  if (!cfg?.enabled || !cfg.key) {
    return {
      loading: false,
      result: null,
      error: "GSTN Return API key not configured. Go to Settings > API Config.",
      source: "no_key",
    };
  }

  const gstnSettings = settings.gstn;
  const gstin = businessGstin;

  const now = new Date();
  const period = `${String(now.getMonth() + 1).padStart(2, "0")}${now.getFullYear()}`;

  const baseUrl =
    cfg.url ||
    `https://api.gst.gov.in/enriched/returns/gstr1?action=RETSUM&gstin=${gstin}&ret_period=${period}`;

  try {
    const res = await fetch(baseUrl, {
      method: "GET",
      headers: {
        "Auth-Token": cfg.key,
        client_id: cfg.clientId || gstnSettings?.clientId || "",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (res.status === 401)
      return {
        loading: false,
        result: null,
        error: "Authentication failed — check Auth-Token and Client ID.",
        source: "live",
      };
    if (res.status === 404)
      return {
        loading: false,
        result: null,
        error: "Return data not found for the current period.",
        source: "live",
      };
    if (res.status === 429)
      return {
        loading: false,
        result: null,
        error: "Rate limit exceeded. Try again shortly.",
        source: "live",
      };

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        loading: false,
        result: null,
        error: `API error (HTTP ${res.status}): ${body || res.statusText}`,
        source: "live",
      };
    }

    const data = await res.json();
    const info = data?.data ?? data?.returnDetails ?? data;
    return {
      loading: false,
      result: {
        Period: period,
        ReturnType: info?.retType ?? "GSTR-1",
        Status: info?.sts ?? info?.status ?? "Not Filed",
        "Due Date":
          info?.dueDate ??
          `11/${String(now.getMonth() + 2).padStart(2, "0")}/${now.getFullYear()}`,
        "Total Taxable Value": info?.totTxval
          ? `₹${Number(info.totTxval).toLocaleString("en-IN")}`
          : "(see portal)",
        "Total Tax": info?.totTax
          ? `₹${Number(info.totTax).toLocaleString("en-IN")}`
          : "(see portal)",
      },
      error: null,
      source: "live",
    };
  } catch (err) {
    const isTypeError =
      err instanceof TypeError ||
      (err as Error)?.name === "TypeError" ||
      (err as Error)?.name === "AbortError";
    return {
      loading: false,
      result: null,
      error: isTypeError
        ? "Network/CORS error — GSTN API requires a GSP-registered whitelisted IP. Configure your proxy URL in Settings > API Config."
        : `Error: ${(err as Error).message}`,
      corsBlocked: isTypeError,
      source: "live",
    };
  }
}

// ─── RBI Account Aggregator ───────────────────────────────────────────────────

async function callAccountAggregatorAPI(
  settings: ApiSettings,
): Promise<ApiCardState> {
  const cfg = settings.accountAggregator;

  if (!cfg?.enabled || !cfg.clientId) {
    return {
      loading: false,
      result: null,
      error:
        "Account Aggregator not configured. Go to Settings > API Config to set up your AA client credentials.",
      source: "no_key",
    };
  }

  const baseUrl =
    cfg.url ||
    (cfg.sandboxMode
      ? "https://api.sandbox.sahamati.org.in"
      : "https://api.sahamati.org.in");

  // Step 1: Ping the AA discovery/health endpoint
  try {
    const _healthRes = await fetch(`${baseUrl}/health`, {
      method: "GET",
      headers: {
        "x-client-id": cfg.clientId,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    // Step 2: Initiate a consent request session
    const consentPayload = {
      ver: "2.0.0",
      timestamp: new Date().toISOString(),
      txnid: `TXN-${Date.now()}`,
      ConsentDetail: {
        consentStart: new Date().toISOString(),
        consentExpiry: new Date(Date.now() + 86400000).toISOString(),
        consentMode: "VIEW",
        fetchType: "ONETIME",
        Purpose: {
          code: "101",
          refUri: "https://api.rebit.org.in/aa/purpose",
          text: "Account aggregation",
          Category: { type: "personal" },
        },
        FITypes: ["DEPOSIT"],
        DataLife: { unit: "DAY", value: 1 },
        Frequency: { unit: "DAY", value: 1 },
        DataFilter: [{ type: "TRANSACTIONAMOUNT", operator: ">=", value: "0" }],
      },
      redirectUrl: cfg.redirectUri || window.location.origin,
    };

    const consentRes = await fetch(`${baseUrl}/Consent`, {
      method: "POST",
      headers: {
        "x-client-id": cfg.clientId,
        "x-client-secret": cfg.clientSecret,
        "Content-Type": "application/json",
        "x-jws-signature": "pending-signing",
      },
      body: JSON.stringify(consentPayload),
      signal: AbortSignal.timeout(12000),
    });

    if (consentRes.status === 401) {
      return {
        loading: false,
        result: null,
        error:
          "Authentication failed — check Client ID and Client Secret in Settings > API Config.",
        source: "live",
      };
    }

    if (consentRes.ok) {
      const consentData = await consentRes.json();
      const redirectUrl = consentData?.url ?? consentData?.redirectUrl;
      if (redirectUrl) {
        window.open(redirectUrl, "_blank", "width=600,height=700");
      }
      return {
        loading: false,
        result: {
          Status: "Consent Request Initiated",
          "Consent Handle":
            consentData?.ConsentHandle ??
            consentData?.consentHandle ??
            "(returned in response)",
          "AA Redirect": redirectUrl
            ? "Opened in new window"
            : "(check response for URL)",
          Note: "User must approve consent on the AA app. Fetch FI data after approval.",
          Environment: cfg.sandboxMode ? "Sandbox" : "Production",
        },
        error: null,
        source: "live",
      };
    }

    const body = await consentRes.text().catch(() => "");
    return {
      loading: false,
      result: null,
      error: `Consent API error (HTTP ${consentRes.status}): ${body || consentRes.statusText}`,
      source: "live",
    };
  } catch (err) {
    const isTypeError =
      err instanceof TypeError ||
      (err as Error)?.name === "TypeError" ||
      (err as Error)?.name === "AbortError";
    return {
      loading: false,
      result: null,
      error: isTypeError
        ? "Network/CORS error — Account Aggregator API requires backend JWS signing. Browser calls will be blocked. Use the ICP backend canister for production. Sandbox URL configured."
        : `Error: ${(err as Error).message}`,
      corsBlocked: isTypeError,
      source: "live",
    };
  }
}

export function GSTAPIIntegration() {
  const [apiSettings] = useApiSettings();
  const { activeBusiness } = useBusinessContext();
  const [gstinInput, setGstinInput] = useState("");
  const [gstinHistory, setGstinHistory] = useLocalStorage<GstinHistoryEntry[]>(
    "gstin_validation_history",
    [],
  );
  const [panInput, setPanInput] = useState("");

  const [eInvoiceState, setEInvoiceState] = useState<ApiCardState>({
    loading: false,
    result: null,
    error: null,
  });
  const [eWayBillState, setEWayBillState] = useState<ApiCardState>({
    loading: false,
    result: null,
    error: null,
  });
  const [gstReturnState, setGstReturnState] = useState<ApiCardState>({
    loading: false,
    result: null,
    error: null,
  });
  const [gstinValidState, setGstinValidState] = useState<ApiCardState>({
    loading: false,
    result: null,
    error: null,
  });
  const [panValidState, setPanValidState] = useState<ApiCardState>({
    loading: false,
    result: null,
    error: null,
  });
  const [bankSyncState, setBankSyncState] = useState<ApiCardState>({
    loading: false,
    result: null,
    error: null,
  });

  const handleEInvoice = async () => {
    setEInvoiceState({ loading: true, result: null, error: null });
    const result = await callEInvoiceAPI(apiSettings);
    setEInvoiceState(result);
    if (result.source === "no_key")
      toast.warning("Configure e-Invoice credentials in Settings > API Config");
    else if (result.error && !result.corsBlocked) toast.error(result.error);
    else if (result.corsBlocked)
      toast.warning("CORS blocked — server proxy required");
    else if (result.result) toast.success("e-Invoice IRN generated from IRP");
  };

  const handleEWayBill = async () => {
    setEWayBillState({ loading: true, result: null, error: null });
    const result = await callEWayBillAPI(apiSettings);
    setEWayBillState(result);
    if (result.source === "no_key")
      toast.warning(
        "Configure e-Way Bill credentials in Settings > API Config",
      );
    else if (result.error && !result.corsBlocked) toast.error(result.error);
    else if (result.corsBlocked)
      toast.warning("CORS blocked — server proxy required");
    else if (result.result)
      toast.success("e-Way Bill generated from NIC portal");
  };

  const handleGSTRFetch = async () => {
    setGstReturnState({ loading: true, result: null, error: null });
    const result = await callGSTNReturnAPI(
      apiSettings,
      activeBusiness?.gstin ?? "",
    );
    setGstReturnState(result);
    if (result.source === "no_key")
      toast.warning(
        "Configure GSTN Return credentials in Settings > API Config",
      );
    else if (result.error && !result.corsBlocked) toast.error(result.error);
    else if (result.corsBlocked)
      toast.warning("CORS blocked — GSP proxy required");
    else if (result.result) toast.success("GSTR data fetched from GSTN");
  };

  const handleGSTINValidate = async () => {
    if (!gstinInput) {
      toast.error("Enter a GSTIN to validate");
      return;
    }
    setGstinValidState({ loading: true, result: null, error: null });
    const result = await verifyGSTIN(gstinInput);
    if (result.success) {
      const apiResult: ApiResult = { GSTIN: result.gstin };
      if (result.legalName) apiResult["Legal Name"] = result.legalName;
      if (result.tradeName && result.tradeName !== result.legalName)
        apiResult["Trade Name"] = result.tradeName;
      if (result.status) apiResult.Status = result.status;
      if (result.taxpayerType) apiResult["Taxpayer Type"] = result.taxpayerType;
      if (result.stateCode)
        apiResult.State = `${result.stateCode} — ${result.stateName ?? ""}`;
      if (result.registrationDate)
        apiResult["Registered On"] = result.registrationDate;
      if (result.principalAddress) apiResult.Address = result.principalAddress;
      setGstinValidState({
        loading: false,
        result: apiResult,
        error: null,
        source: result.source,
      });
      setGstinHistory((prev) =>
        [
          {
            gstin: result.gstin,
            result: `${result.legalName ?? result.tradeName ?? result.gstin} | ${result.status ?? ""} | ${result.source === "live" ? "Live ✓" : "Format Only"}`,
            time: new Date().toISOString(),
          },
          ...prev.filter((h) => h.gstin !== result.gstin),
        ].slice(0, 5),
      );
      toast.success(
        result.source === "live"
          ? "GSTIN verified from Government Database"
          : "GSTIN format valid",
      );
    } else if (result.errorCode === "CORS_BLOCKED") {
      setGstinValidState({
        loading: false,
        result: {
          GSTIN: result.gstin,
          Note: "Format valid — live API call blocked by CORS (backend proxy required)",
        },
        error: null,
        source: result.source,
      });
      toast.warning("Live API CORS blocked — format validated");
    } else {
      setGstinValidState({
        loading: false,
        result: null,
        error: result.error ?? "Verification failed",
        source: result.source,
      });
      if (result.errorCode !== "INVALID_FORMAT")
        toast.error(result.error ?? "Verification failed");
      else toast.error("Invalid GSTIN format");
    }
  };

  const handlePANValidate = async () => {
    if (!panInput) {
      toast.error("Enter a PAN to validate");
      return;
    }
    setPanValidState({ loading: true, result: null, error: null });
    const result = await verifyPAN(panInput);
    if (result.success) {
      const apiResult: ApiResult = { PAN: result.pan };
      if (result.panHolderName) apiResult["Holder Name"] = result.panHolderName;
      if (result.panType) apiResult["PAN Type"] = result.panType;
      if (result.status) apiResult.Status = result.status;
      if (result.assessingOfficerCode)
        apiResult["AO Code"] = result.assessingOfficerCode;
      setPanValidState({
        loading: false,
        result: apiResult,
        error: null,
        source: result.source,
      });
      toast.success(
        result.source === "live"
          ? "PAN verified from Government Database"
          : "PAN format valid",
      );
    } else if (result.errorCode === "CORS_BLOCKED") {
      setPanValidState({
        loading: false,
        result: {
          PAN: result.pan,
          Note: "Format valid — live API call blocked by CORS (backend proxy required)",
        },
        error: null,
        source: result.source,
      });
      toast.warning("Live API CORS blocked — format validated");
    } else {
      setPanValidState({
        loading: false,
        result: null,
        error: result.error ?? "Verification failed",
        source: result.source,
      });
      if (result.errorCode !== "INVALID_FORMAT")
        toast.error(result.error ?? "Verification failed");
      else toast.error("Invalid PAN format (e.g. ABCDE1234F)");
    }
  };

  const handleBankSync = async () => {
    setBankSyncState({ loading: true, result: null, error: null });
    const result = await callAccountAggregatorAPI(apiSettings);
    setBankSyncState(result);
    if (result.source === "no_key")
      toast.warning(
        "Configure Account Aggregator credentials in Settings > API Config",
      );
    else if (result.error && !result.corsBlocked) toast.error(result.error);
    else if (result.corsBlocked)
      toast.warning("CORS blocked — backend signing required");
    else if (result.result)
      toast.success("Account Aggregator consent initiated");
  };

  const getStatusBadge = (state: ApiCardState, defaultLabel = "Direct API") => {
    if (state.source === "live" && state.result) {
      return (
        <Badge
          variant="default"
          className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-600 shrink-0"
        >
          <BadgeCheck className="w-3 h-3" /> Live ✓
        </Badge>
      );
    }
    if (state.source === "format_only") {
      return (
        <Badge
          variant="outline"
          className="text-xs text-blue-600 border-blue-400 shrink-0"
        >
          Format Only
        </Badge>
      );
    }
    if (state.corsBlocked) {
      return (
        <Badge
          variant="outline"
          className="text-xs text-amber-600 border-amber-400 shrink-0"
        >
          CORS Blocked
        </Badge>
      );
    }
    if (state.source === "no_key") {
      return (
        <Badge
          variant="outline"
          className="text-xs text-muted-foreground border-border shrink-0"
        >
          Not Configured
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="text-xs text-blue-600 border-blue-400 shrink-0"
      >
        {defaultLabel}
      </Badge>
    );
  };

  const renderResult = (state: ApiCardState, showSource = false) => {
    const { result, error, corsBlocked } = state;
    if (error) {
      return (
        <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-1.5">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          {corsBlocked && (
            <div className="flex items-center gap-1.5 text-muted-foreground border-t border-destructive/10 pt-1.5">
              <Settings className="w-3 h-3" />
              <a href="#api-config" className="underline hover:text-foreground">
                Configure proxy URL in Settings &gt; API Config
              </a>
            </div>
          )}
        </div>
      );
    }
    if (!result) return null;
    return (
      <div className="mt-3 space-y-1.5">
        {showSource && (
          <div className="flex justify-end">{getStatusBadge(state)}</div>
        )}
        <div className="p-3 rounded-lg bg-chart-2/10 border border-chart-2/20 space-y-1.5">
          {Object.entries(result).map(([key, val]) => (
            <div
              key={key}
              className="flex justify-between items-start gap-2 text-xs"
            >
              <span className="text-muted-foreground font-medium shrink-0">
                {key}:
              </span>
              <span className="text-foreground text-right font-mono break-all">
                {String(val)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" data-ocid="api.section">
      {/* CORS Info Banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
              Direct API Mode
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
              All API calls are made directly from the browser. GSTIN and PAN
              validation work when API keys are configured. e-Invoice, e-Way
              Bill, GSTN Return, and Account Aggregator APIs require a
              GSP-whitelisted server IP — configure a proxy URL in{" "}
              <span className="underline font-medium cursor-pointer">
                Settings &gt; API Config
              </span>{" "}
              for production use.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-cabinet font-bold text-foreground">
            GST API Integration
          </h1>
          <p className="text-sm text-muted-foreground">
            All APIs use direct calls — configure credentials in Settings &gt;
            API Config
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* e-Invoice IRN API */}
        <Card
          className="bg-card border-border/70"
          data-ocid="api.einvoice.card"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">e-Invoice IRN API</CardTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    einvoice1.gst.gov.in
                  </p>
                </div>
              </div>
              {getStatusBadge(eInvoiceState)}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Generate Invoice Reference Number (IRN) and QR code via IRP.
              Requires IRP/GSP credentials.
            </p>
            <Button
              size="sm"
              className="w-full gap-2"
              onClick={() => void handleEInvoice()}
              disabled={eInvoiceState.loading}
              data-ocid="api.einvoice.primary_button"
            >
              {eInvoiceState.loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <QrCode className="w-3.5 h-3.5" />
              )}
              Generate IRN
            </Button>
            {renderResult(eInvoiceState)}
          </CardContent>
        </Card>

        {/* e-Way Bill API */}
        <Card className="bg-card border-border/70" data-ocid="api.eway.card">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-chart-3/10 flex items-center justify-center">
                  <Truck className="w-4 h-4 text-chart-3" />
                </div>
                <div>
                  <CardTitle className="text-sm">e-Way Bill API</CardTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    ewaybillgst.gov.in
                  </p>
                </div>
              </div>
              {getStatusBadge(eWayBillState)}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Generate e-Way Bills for goods movement above ₹50,000 via NIC
              portal. Requires NIC credentials.
            </p>
            <Button
              size="sm"
              className="w-full gap-2"
              variant="outline"
              onClick={() => void handleEWayBill()}
              disabled={eWayBillState.loading}
              data-ocid="api.eway.secondary_button"
            >
              {eWayBillState.loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Truck className="w-3.5 h-3.5" />
              )}
              Generate e-Way Bill
            </Button>
            {renderResult(eWayBillState)}
          </CardContent>
        </Card>

        {/* GSTN Return Fetch API */}
        <Card className="bg-card border-border/70" data-ocid="api.gstn.card">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-chart-2/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-chart-2" />
                </div>
                <div>
                  <CardTitle className="text-sm">GSTN Return Fetch</CardTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    api.gst.gov.in/returns
                  </p>
                </div>
              </div>
              {getStatusBadge(gstReturnState)}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Fetch GSTR-1/3B filing status and summary from GSTN for the
              current period. Requires GSP Auth-Token.
            </p>
            <Button
              size="sm"
              className="w-full gap-2"
              variant="outline"
              onClick={() => void handleGSTRFetch()}
              disabled={gstReturnState.loading}
              data-ocid="api.gstn.secondary_button"
            >
              {gstReturnState.loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Fetch GSTR Data
            </Button>
            {renderResult(gstReturnState)}
          </CardContent>
        </Card>

        {/* GSTIN Validation API */}
        <Card
          className="bg-card border-border/70"
          data-ocid="api.gstin_valid.card"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">
                    GSTIN Validation API
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    api.gst.gov.in
                  </p>
                </div>
              </div>
              {gstinValidState.source === "live" && gstinValidState.result ? (
                <Badge
                  variant="default"
                  className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-600 shrink-0"
                >
                  <BadgeCheck className="w-3 h-3" /> Live ✓
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-xs text-blue-600 border-blue-400 shrink-0"
                >
                  {gstinValidState.source === "format_only"
                    ? "Format Only"
                    : "Direct API"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Queries GST Network directly. Returns legal name, registration
              type, and filing status.
            </p>
            <div className="space-y-2">
              <Label className="text-xs">GSTIN to Validate</Label>
              <Input
                value={gstinInput}
                onChange={(e) => setGstinInput(e.target.value.toUpperCase())}
                placeholder="e.g. 27AABCU9603R1ZX"
                className="font-mono text-sm"
                maxLength={15}
                data-ocid="api.gstin_valid.input"
              />
            </div>
            <Button
              size="sm"
              className="w-full gap-2"
              onClick={() => void handleGSTINValidate()}
              disabled={gstinValidState.loading}
              data-ocid="api.gstin_valid.primary_button"
            >
              {gstinValidState.loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              Validate GSTIN
            </Button>
            {renderResult(gstinValidState, true)}
            {gstinHistory.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Recent Validations
                </p>
                <div className="space-y-1">
                  {gstinHistory.map((h, i) => (
                    <div
                      key={`${h.gstin}-${i}`}
                      className="flex justify-between items-start gap-2 p-2 rounded bg-muted/50 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-primary truncate">
                          {h.gstin}
                        </p>
                        <p className="text-muted-foreground truncate">
                          {h.result}
                        </p>
                      </div>
                      <span className="text-muted-foreground shrink-0">
                        {formatRelativeTime(h.time)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PAN Validation API */}
        <Card
          className="bg-card border-border/70"
          data-ocid="api.pan_valid.card"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-chart-4/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-chart-4" />
                </div>
                <div>
                  <CardTitle className="text-sm">PAN Validation API</CardTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    api.incometax.gov.in
                  </p>
                </div>
              </div>
              {panValidState.source === "live" && panValidState.result ? (
                <Badge
                  variant="default"
                  className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-600 shrink-0"
                >
                  <BadgeCheck className="w-3 h-3" /> Live ✓
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-xs text-blue-600 border-blue-400 shrink-0"
                >
                  {panValidState.source === "format_only"
                    ? "Format Only"
                    : "Direct API"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Queries Income Tax e-Filing API directly. Returns PAN holder name,
              type, and status.
            </p>
            <div className="space-y-2">
              <Label className="text-xs">PAN to Validate</Label>
              <Input
                value={panInput}
                onChange={(e) => setPanInput(e.target.value.toUpperCase())}
                placeholder="e.g. ABCDE1234F"
                className="font-mono text-sm"
                maxLength={10}
                data-ocid="api.pan_valid.input"
              />
            </div>
            <Button
              size="sm"
              className="w-full gap-2"
              variant="outline"
              onClick={() => void handlePANValidate()}
              disabled={panValidState.loading}
              data-ocid="api.pan_valid.secondary_button"
            >
              {panValidState.loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <User className="w-3.5 h-3.5" />
              )}
              Validate PAN
            </Button>
            {renderResult(panValidState, true)}
          </CardContent>
        </Card>

        {/* RBI Account Aggregator */}
        <Card
          className="bg-card border-border/70"
          data-ocid="api.bank_sync.card"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-chart-2/10 flex items-center justify-center">
                  <BanknoteIcon className="w-4 h-4 text-chart-2" />
                </div>
                <div>
                  <CardTitle className="text-sm">Account Aggregator</CardTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    sahamati.org.in (RBI AA)
                  </p>
                </div>
              </div>
              {getStatusBadge(bankSyncState)}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Initiate RBI Account Aggregator consent flow to fetch bank account
              data. Opens AA redirect in a new window.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ExternalLink className="w-3 h-3 shrink-0" />
              <a
                href="https://www.sahamati.org.in"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Sahamati AA Framework
              </a>
            </div>
            <Button
              size="sm"
              className="w-full gap-2"
              onClick={() => void handleBankSync()}
              disabled={bankSyncState.loading}
              data-ocid="api.bank_sync.primary_button"
            >
              {bankSyncState.loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <BanknoteIcon className="w-3.5 h-3.5" />
              )}
              Initiate AA Consent
            </Button>
            {renderResult(bankSyncState)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
