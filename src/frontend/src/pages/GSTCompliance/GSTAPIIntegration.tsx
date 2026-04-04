import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { verifyGSTIN, verifyPAN } from "@/services/gstVerificationService";
import {
  AlertCircle,
  BadgeCheck,
  BanknoteIcon,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  QrCode,
  RefreshCw,
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
  source?: "live" | "format_only";
}

function generateIRN(): string {
  return Array.from(
    { length: 64 },
    () => "0123456789abcdef"[Math.floor(Math.random() * 16)],
  ).join("");
}

function generateEWBNumber(): string {
  return `EWB${Array.from({ length: 12 }, () =>
    Math.floor(Math.random() * 10),
  ).join("")}`;
}

export function GSTAPIIntegration() {
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

  const simulateApi = (
    setState: (s: ApiCardState) => void,
    delay: number,
    result: ApiResult,
  ) => {
    setState({ loading: true, result: null, error: null });
    setTimeout(() => {
      setState({ loading: false, result, error: null });
    }, delay);
  };

  const handleEInvoice = () => {
    const irn = generateIRN();
    simulateApi(setEInvoiceState, 1200, {
      IRN: irn,
      "IRN Preview": `${irn.slice(0, 16)}...`,
      "QR Data": "GSTN:27AABCU9603R1ZX|INV:INV0001|DATE:2026-03-07",
      AckNo: `ACK${Date.now()}`,
      AckDate: new Date().toISOString().split("T")[0],
      Status: "Active",
    });
    toast.success("e-Invoice IRN generated (simulated)");
  };

  const handleEWayBill = () => {
    const ewb = generateEWBNumber();
    simulateApi(setEWayBillState, 1000, {
      "EWB Number": ewb,
      "Valid From": new Date().toISOString().split("T")[0],
      "Valid To": new Date(Date.now() + 86400000).toISOString().split("T")[0],
      Distance: "100 km",
      Mode: "Road",
      Status: "Active",
    });
    toast.success("e-Way Bill generated (simulated)");
  };

  const handleGSTRFetch = () => {
    const now = new Date();
    const period = `${String(now.getMonth() + 1).padStart(2, "0")}${now.getFullYear()}`;
    simulateApi(setGstReturnState, 1500, {
      Period: period,
      ReturnType: "GSTR-1",
      Status: "Not Filed",
      "Due Date": `11/${String(now.getMonth() + 2).padStart(2, "0")}/${now.getFullYear()}`,
      "Total Taxable Value": "\u20b92,45,000",
      "Total Tax": "\u20b944,100",
    });
    toast.success("GSTR data fetched (simulated)");
  };

  const handleGSTINValidate = async () => {
    if (!gstinInput) {
      toast.error("Enter a GSTIN to validate");
      return;
    }
    setGstinValidState({ loading: true, result: null, error: null });
    const result = await verifyGSTIN(gstinInput);

    if (result.success) {
      const apiResult: ApiResult = {
        GSTIN: result.gstin,
      };
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
      if (result.errorCode !== "INVALID_FORMAT") {
        toast.error(result.error ?? "Verification failed");
      } else {
        toast.error("Invalid GSTIN format");
      }
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
      if (result.errorCode !== "INVALID_FORMAT") {
        toast.error(result.error ?? "Verification failed");
      } else {
        toast.error("Invalid PAN format (e.g. ABCDE1234F)");
      }
    }
  };

  const handleBankSync = () => {
    simulateApi(setBankSyncState, 2000, {
      "Account Balance": "\u20b912,34,567.89",
      "Available Balance": "\u20b911,00,000.00",
      "Last Sync": new Date().toLocaleString("en-IN"),
      "Transactions Fetched": 25,
      "Pending Reconciliation": 8,
      Status: "Connected",
    });
    toast.success("Bank sync completed (simulated)");
  };

  const getSourceBadge = (state: ApiCardState) => {
    if (!state.result && !state.error) return null;
    if (state.source === "live") {
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
    return null;
  };

  const renderResult = (state: ApiCardState, showSource = false) => {
    const { result, error } = state;
    if (error) {
      return (
        <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      );
    }
    if (!result) return null;
    return (
      <div className="mt-3 space-y-1.5">
        {showSource && (
          <div className="flex justify-end">{getSourceBadge(state)}</div>
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
      {/* Simulation Disclaimer Banner */}
      <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Demo / Simulation Mode
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              GSTIN and PAN validation use real government APIs when credentials
              are configured. Other APIs (e-Invoice, e-Way Bill, Bank Sync) are
              simulated. Configure credentials in Settings &gt; API Config.
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
            GSTIN/PAN: live when API key configured — other APIs simulated
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
                    /api/einvoice/generate
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="text-xs text-amber-600 border-amber-400 shrink-0"
              >
                Simulated
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Generate Invoice Reference Number (IRN) and QR code data for
              e-invoicing compliance.
            </p>
            <Button
              size="sm"
              className="w-full gap-2"
              onClick={handleEInvoice}
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
                    /api/ewaybill/generate
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="text-xs text-amber-600 border-amber-400 shrink-0"
              >
                Simulated
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Auto-generate e-Way Bills for goods movement above ₹50,000.
              Validates distance and vehicle details.
            </p>
            <Button
              size="sm"
              className="w-full gap-2"
              variant="outline"
              onClick={handleEWayBill}
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
                    /api/gstn/returns/fetch
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="text-xs text-amber-600 border-amber-400 shrink-0"
              >
                Simulated
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Fetch GSTR-1/3B filing status and data from the GSTN portal for
              the current period.
            </p>
            <Button
              size="sm"
              className="w-full gap-2"
              variant="outline"
              onClick={handleGSTRFetch}
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
              type, and filing status. Requires GSTN API key.
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
              type, and status. Requires IT Dept API key.
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

        {/* Banking Sync API */}
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
                  <CardTitle className="text-sm">Banking Sync API</CardTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    /api/banking/sync
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="text-xs text-amber-600 border-amber-400 shrink-0"
              >
                Simulated
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Sync bank transactions for payment reconciliation. Supports ICICI,
              HDFC, SBI, Axis via Account Aggregator.
            </p>
            <Button
              size="sm"
              className="w-full gap-2"
              onClick={handleBankSync}
              disabled={bankSyncState.loading}
              data-ocid="api.bank_sync.primary_button"
            >
              {bankSyncState.loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <BanknoteIcon className="w-3.5 h-3.5" />
              )}
              Sync Transactions
            </Button>
            {renderResult(bankSyncState)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
