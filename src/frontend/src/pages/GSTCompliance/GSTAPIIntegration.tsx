import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  AlertCircle,
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

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

interface ApiResult {
  [key: string]: string | number | boolean;
}

interface ApiCardState {
  loading: boolean;
  result: ApiResult | null;
  error: string | null;
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
      "Total Taxable Value": "₹2,45,000",
      "Total Tax": "₹44,100",
    });
    toast.success("GSTR data fetched (simulated)");
  };

  const handleGSTINValidate = () => {
    if (!gstinInput) {
      toast.error("Enter a GSTIN to validate");
      return;
    }
    if (!GSTIN_REGEX.test(gstinInput)) {
      setGstinValidState({
        loading: false,
        result: null,
        error: "Invalid GSTIN format",
      });
      toast.error("Invalid GSTIN format");
      return;
    }
    // Generate fake legal name from GSTIN chars 2-7 (alpha part)
    const alphaChars = gstinInput.slice(2, 7);
    const legalName = `${alphaChars.split("").reverse().join("")} ENTERPRISES PVT LTD`;
    setGstinValidState({ loading: true, result: null, error: null });
    setTimeout(() => {
      setGstinValidState({
        loading: false,
        result: {
          GSTIN: gstinInput,
          "Legal Name": legalName,
          Status: "Active",
          "Registration Type": "Regular",
          "State Code": gstinInput.slice(0, 2),
          "Registration Date": "2018-04-01",
        },
        error: null,
      });
      setGstinHistory((prev) =>
        [
          {
            gstin: gstinInput,
            result: `${legalName} | Active`,
            time: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 5),
      );
      toast.success("GSTIN validated successfully");
    }, 1000);
  };

  const handlePANValidate = () => {
    if (!panInput) {
      toast.error("Enter a PAN to validate");
      return;
    }
    if (!PAN_REGEX.test(panInput)) {
      setPanValidState({
        loading: false,
        result: null,
        error: "Invalid PAN format (e.g. ABCDE1234F)",
      });
      toast.error("Invalid PAN format");
      return;
    }
    const name = `${panInput.slice(0, 3).split("").reverse().join("")}U ${panInput.slice(3, 5)}HA ENTERPRISES`;
    setPanValidState({ loading: true, result: null, error: null });
    setTimeout(() => {
      setPanValidState({
        loading: false,
        result: {
          PAN: panInput,
          Name: name,
          Status: "Active",
          Type: panInput[3] === "P" ? "Individual" : "Company",
          "Last Updated": "2024-01-15",
        },
        error: null,
      });
      toast.success("PAN validated successfully");
    }, 1000);
  };

  const handleBankSync = () => {
    simulateApi(setBankSyncState, 2000, {
      "Account Balance": "₹12,34,567.89",
      "Available Balance": "₹11,00,000.00",
      "Last Sync": new Date().toLocaleString("en-IN"),
      "Transactions Fetched": 25,
      "Pending Reconciliation": 8,
      Status: "Connected",
    });
    toast.success("Bank sync completed (simulated)");
  };

  const renderResult = (result: ApiResult | null, error: string | null) => {
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
      <div className="mt-3 p-3 rounded-lg bg-chart-2/10 border border-chart-2/20 space-y-1.5">
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
    );
  };

  return (
    <div className="space-y-6" data-ocid="api.section">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-cabinet font-bold text-foreground">
            GST API Integration
          </h1>
          <p className="text-sm text-muted-foreground">
            Simulated GSTN, PAN, Banking & e-Invoice API endpoints
          </p>
        </div>
        <Badge variant="secondary" className="ml-auto text-xs">
          Simulated
        </Badge>
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
                className="text-xs text-chart-2 border-chart-2/30 shrink-0"
              >
                Active
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
            {renderResult(eInvoiceState.result, eInvoiceState.error)}
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
                className="text-xs text-chart-2 border-chart-2/30 shrink-0"
              >
                Active
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
            {renderResult(eWayBillState.result, eWayBillState.error)}
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
                className="text-xs text-chart-2 border-chart-2/30 shrink-0"
              >
                Active
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
            {renderResult(gstReturnState.result, gstReturnState.error)}
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
                    /api/validate/gstin
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="text-xs text-chart-2 border-chart-2/30 shrink-0"
              >
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Real-time taxpayer lookup — returns legal name, registration type,
              and status.
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
              onClick={handleGSTINValidate}
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
            {renderResult(gstinValidState.result, gstinValidState.error)}

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
                    /api/validate/pan
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="text-xs text-chart-2 border-chart-2/30 shrink-0"
              >
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Validate PAN numbers and retrieve taxpayer name and status from
              the Income Tax database.
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
              onClick={handlePANValidate}
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
            {renderResult(panValidState.result, panValidState.error)}
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
                className="text-xs text-chart-2 border-chart-2/30 shrink-0"
              >
                Active
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
            {renderResult(bankSyncState.result, bankSyncState.error)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
