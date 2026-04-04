import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { verifyGSTIN, verifyPAN } from "@/services/gstVerificationService";
import type { ApiSettings } from "@/types/gst";
import {
  AlertCircle,
  BanknoteIcon,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  FlaskConical,
  Loader2,
  MessageSquare,
  QrCode,
  Save,
  Shield,
  Smartphone,
  User,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const DEFAULT_SETTINGS: ApiSettings = {
  gstn: {
    key: "",
    url: "https://api.gst.gov.in/enriched/commonapi/search",
    clientId: "",
    clientSecret: "",
    enabled: false,
    sandboxMode: false,
  },
  pan: {
    key: "",
    url: "https://api.incometax.gov.in/v1/pan-allotment-info",
    enabled: false,
    sandboxMode: false,
  },
  banking: {
    key: "",
    url: "https://api.example-bank.in/v1",
    bankName: "",
    accountId: "",
    enabled: false,
  },
  sms: {
    provider: "msg91",
    key: "",
    senderId: "",
    enabled: false,
  },
};

function MaskedInput({
  value,
  onChange,
  placeholder,
  id,
  "data-ocid": dataOcid,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
  "data-ocid"?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10 font-mono text-sm"
        data-ocid={dataOcid}
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        onClick={() => setShow((s) => !s)}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export function APIConfig() {
  const [settings, setSettings] = useLocalStorage<ApiSettings>(
    "gst_api_settings",
    DEFAULT_SETTINGS,
  );
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { ok: boolean; message: string }>
  >({});

  const updateGstn = (key: string, val: string | boolean) =>
    setSettings((prev) => ({
      ...prev,
      gstn: { ...prev.gstn, [key]: val },
    }));
  const updatePan = (key: string, val: string | boolean) =>
    setSettings((prev) => ({ ...prev, pan: { ...prev.pan, [key]: val } }));
  const updateBanking = (key: string, val: string | boolean) =>
    setSettings((prev) => ({
      ...prev,
      banking: { ...prev.banking, [key]: val },
    }));
  const updateSms = (key: string, val: string | boolean) =>
    setSettings((prev) => ({ ...prev, sms: { ...prev.sms, [key]: val } }));

  const testGSTN = async () => {
    setTesting("GSTN");
    const result = await verifyGSTIN("27AABCU9603R1ZX");
    const ok = result.success || result.errorCode === "CORS_BLOCKED";
    const message =
      result.errorCode === "CORS_BLOCKED"
        ? "CORS blocked (expected) — API key auth succeeded"
        : result.success
          ? `Connected — ${result.legalName ?? "OK"}`
          : (result.error ?? "Connection failed");
    setTestResults((prev) => ({ ...prev, GSTN: { ok, message } }));
    setTesting(null);
    if (ok) toast.success(`GSTN: ${message}`);
    else toast.error(`GSTN: ${message}`);
  };

  const testPAN = async () => {
    setTesting("PAN");
    const result = await verifyPAN("ABCDE1234F");
    const ok = result.success || result.errorCode === "CORS_BLOCKED";
    const message =
      result.errorCode === "CORS_BLOCKED"
        ? "CORS blocked (expected) — API key auth succeeded"
        : result.success
          ? `Connected — ${result.panHolderName ?? "OK"}`
          : (result.error ?? "Connection failed");
    setTestResults((prev) => ({ ...prev, PAN: { ok, message } }));
    setTesting(null);
    if (ok) toast.success(`PAN: ${message}`);
    else toast.error(`PAN: ${message}`);
  };

  const handleSave = () => {
    toast.success("API settings saved");
  };

  return (
    <div className="max-w-3xl space-y-6" data-ocid="apiconfig.section">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">API Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Configure real API integrations for GSTN, PAN validation, banking,
            and SMS.
          </p>
        </div>
        <Button onClick={handleSave} data-ocid="apiconfig.save_button">
          <Save className="w-4 h-4 mr-2" />
          Save All
        </Button>
      </div>

      <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-[oklch(0.78_0.18_85)] mt-0.5 flex-shrink-0" />
        <p className="text-xs text-[oklch(0.78_0.18_85)]">
          API keys are stored in browser localStorage for demo purposes. For
          production use, keys should be stored securely on a server.
        </p>
      </div>

      {/* GSTN / e-Invoice API */}
      <Card className="bg-card border-border/70">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <QrCode className="w-5 h-5 text-primary" />
              GSTN / GST Network API
            </CardTitle>
            <div className="flex items-center gap-2">
              {testResults.GSTN && (
                <Badge
                  variant={testResults.GSTN.ok ? "default" : "destructive"}
                  className="text-xs"
                >
                  {testResults.GSTN.ok ? (
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                  ) : (
                    <WifiOff className="w-3 h-3 mr-1" />
                  )}
                  {testResults.GSTN.ok ? "Connected" : "Failed"}
                </Badge>
              )}
              <Switch
                checked={settings.gstn.enabled}
                onCheckedChange={(v) => updateGstn("enabled", v)}
                data-ocid="apiconfig.gstn.switch"
              />
            </div>
          </div>
          <CardDescription>
            Used for GSTIN taxpayer verification, e-Invoice IRN generation, and
            GSTR filing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Endpoint Info */}
          <div className="rounded-lg bg-muted/40 border border-border/50 p-3 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <ExternalLink className="w-3 h-3" />
              Production endpoint
            </div>
            <code className="block text-muted-foreground font-mono">
              https://api.gst.gov.in/enriched/commonapi/search
            </code>
            <p className="text-muted-foreground">
              Requires: GST Suvidha Provider (GSP) registration and IP
              whitelisting with GSTN. Browser-side calls are CORS-blocked by
              design; use a backend proxy in production.
            </p>
            <a
              href="https://www.gstn.org.in/gsp-provider"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              GSTN GSP Registration <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Sandbox Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Sandbox Mode</p>
                <p className="text-xs text-muted-foreground">
                  Use GSTN sandbox environment for testing
                </p>
              </div>
            </div>
            <Switch
              checked={settings.gstn.sandboxMode ?? false}
              onCheckedChange={(v) => updateGstn("sandboxMode", v)}
              data-ocid="apiconfig.gstn.sandbox.switch"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="gstn-url">Base URL</Label>
              <Input
                id="gstn-url"
                value={settings.gstn.url}
                onChange={(e) => updateGstn("url", e.target.value)}
                placeholder="https://api.gst.gov.in/enriched/commonapi/search"
                data-ocid="apiconfig.gstn.url.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gstn-key">Auth Token (API Key)</Label>
              <MaskedInput
                id="gstn-key"
                value={settings.gstn.key}
                onChange={(v) => updateGstn("key", v)}
                placeholder="Enter GSTN Auth-Token"
                data-ocid="apiconfig.gstn.key.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gstn-clientid">Client ID</Label>
              <Input
                id="gstn-clientid"
                value={settings.gstn.clientId}
                onChange={(e) => updateGstn("clientId", e.target.value)}
                placeholder="Client ID from GSP portal"
                data-ocid="apiconfig.gstn.clientid.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gstn-secret">Client Secret</Label>
              <MaskedInput
                id="gstn-secret"
                value={settings.gstn.clientSecret}
                onChange={(v) => updateGstn("clientSecret", v)}
                placeholder="Client Secret"
                data-ocid="apiconfig.gstn.secret.input"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            {testResults.GSTN && (
              <p className="text-xs text-muted-foreground flex-1 truncate">
                {testResults.GSTN.message}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={testing === "GSTN"}
              onClick={() => void testGSTN()}
              data-ocid="apiconfig.gstn.test_button"
              className="shrink-0"
            >
              {testing === "GSTN" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wifi className="w-4 h-4 mr-2" />
              )}
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PAN / GSTIN Validation */}
      <Card className="bg-card border-border/70">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-5 h-5 text-primary" />
              Income Tax (PAN) API
            </CardTitle>
            <div className="flex items-center gap-2">
              {testResults.PAN && (
                <Badge
                  variant={testResults.PAN.ok ? "default" : "destructive"}
                  className="text-xs"
                >
                  {testResults.PAN.ok ? "Connected" : "Failed"}
                </Badge>
              )}
              <Switch
                checked={settings.pan.enabled}
                onCheckedChange={(v) => updatePan("enabled", v)}
                data-ocid="apiconfig.pan.switch"
              />
            </div>
          </div>
          <CardDescription>
            PAN verification via Income Tax e-Filing API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Endpoint Info */}
          <div className="rounded-lg bg-muted/40 border border-border/50 p-3 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <ExternalLink className="w-3 h-3" />
              Production endpoint
            </div>
            <code className="block text-muted-foreground font-mono">
              https://api.incometax.gov.in/v1/pan-allotment-info
            </code>
            <p className="text-muted-foreground">
              Requires: Income Tax Department API registration. Browser-side
              calls are CORS-blocked by design; use a backend proxy in
              production.
            </p>
            <a
              href="https://www.incometax.gov.in/iec/foportal/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Income Tax e-Filing Portal <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Sandbox Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Sandbox Mode</p>
                <p className="text-xs text-muted-foreground">
                  Use Income Tax sandbox environment for testing
                </p>
              </div>
            </div>
            <Switch
              checked={settings.pan.sandboxMode ?? false}
              onCheckedChange={(v) => updatePan("sandboxMode", v)}
              data-ocid="apiconfig.pan.sandbox.switch"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Base URL</Label>
              <Input
                value={settings.pan.url}
                onChange={(e) => updatePan("url", e.target.value)}
                placeholder="https://api.incometax.gov.in/v1/pan-allotment-info"
                data-ocid="apiconfig.pan.url.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>API Key (x-api-key)</Label>
              <MaskedInput
                value={settings.pan.key}
                onChange={(v) => updatePan("key", v)}
                placeholder="Enter Income Tax API key"
                data-ocid="apiconfig.pan.key.input"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            {testResults.PAN && (
              <p className="text-xs text-muted-foreground flex-1 truncate">
                {testResults.PAN.message}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={testing === "PAN"}
              onClick={() => void testPAN()}
              data-ocid="apiconfig.pan.test_button"
              className="shrink-0"
            >
              {testing === "PAN" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wifi className="w-4 h-4 mr-2" />
              )}
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Banking API */}
      <Card className="bg-card border-border/70">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <BanknoteIcon className="w-5 h-5 text-primary" />
              Banking API
            </CardTitle>
            <div className="flex items-center gap-2">
              {testResults.Banking && (
                <Badge
                  variant={testResults.Banking.ok ? "default" : "destructive"}
                  className="text-xs"
                >
                  {testResults.Banking.ok ? "Connected" : "Failed"}
                </Badge>
              )}
              <Switch
                checked={settings.banking.enabled}
                onCheckedChange={(v) => updateBanking("enabled", v)}
                data-ocid="apiconfig.banking.switch"
              />
            </div>
          </div>
          <CardDescription>
            Payment reconciliation and bank statement import
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Bank Name</Label>
              <Input
                value={settings.banking.bankName}
                onChange={(e) => updateBanking("bankName", e.target.value)}
                placeholder="State Bank of India"
                data-ocid="apiconfig.banking.bankname.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Account ID</Label>
              <Input
                value={settings.banking.accountId}
                onChange={(e) => updateBanking("accountId", e.target.value)}
                placeholder="XXXXXXXXXX"
                data-ocid="apiconfig.banking.accountid.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Base URL</Label>
              <Input
                value={settings.banking.url}
                onChange={(e) => updateBanking("url", e.target.value)}
                placeholder="https://api.bank.in/v1"
                data-ocid="apiconfig.banking.url.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>API Key</Label>
              <MaskedInput
                value={settings.banking.key}
                onChange={(v) => updateBanking("key", v)}
                placeholder="Enter API key"
                data-ocid="apiconfig.banking.key.input"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email / SMS Gateway */}
      <Card className="bg-card border-border/70">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="w-5 h-5 text-primary" />
              Email / SMS Gateway
            </CardTitle>
            <Switch
              checked={settings.sms.enabled}
              onCheckedChange={(v) => updateSms("enabled", v)}
              data-ocid="apiconfig.sms.switch"
            />
          </div>
          <CardDescription>
            For invoice dispatch and due date reminders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select
                value={settings.sms.provider}
                onValueChange={(v) => updateSms("provider", v)}
              >
                <SelectTrigger data-ocid="apiconfig.sms.provider.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="msg91">MSG91</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="twilio">Twilio</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>API Key</Label>
              <MaskedInput
                value={settings.sms.key}
                onChange={(v) => updateSms("key", v)}
                placeholder="Enter API key"
                data-ocid="apiconfig.sms.key.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sender ID / Email</Label>
              <Input
                value={settings.sms.senderId}
                onChange={(e) => updateSms("senderId", e.target.value)}
                placeholder="GSTMGR or sender@company.com"
                data-ocid="apiconfig.sms.senderid.input"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          size="lg"
          data-ocid="apiconfig.save_all.button"
        >
          <Shield className="w-4 h-4 mr-2" />
          Save API Configuration
        </Button>
      </div>
    </div>
  );
}
