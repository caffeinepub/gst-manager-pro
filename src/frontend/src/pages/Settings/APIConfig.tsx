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
import type { ApiSettings } from "@/types/gst";
import {
  AlertCircle,
  BanknoteIcon,
  CheckCircle2,
  Eye,
  EyeOff,
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
    url: "https://api.example-gstn.in/v1",
    clientId: "",
    clientSecret: "",
    enabled: false,
  },
  pan: {
    key: "",
    url: "https://api.example-pan.in/v1",
    enabled: false,
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

async function testConnection(
  url: string,
  key: string,
): Promise<{ ok: boolean; message: string }> {
  if (!url || !key) {
    return { ok: false, message: "URL and API Key are required" };
  }
  try {
    const res = await fetch(`${url}/health`, {
      method: "GET",
      headers: { Authorization: `Bearer ${key}`, "X-API-Key": key },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return { ok: true, message: "Connection successful" };
    return { ok: false, message: `HTTP ${res.status}: ${res.statusText}` };
  } catch {
    return {
      ok: false,
      message: "Connection failed — check URL or CORS settings",
    };
  }
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

  const runTest = async (name: string, url: string, key: string) => {
    setTesting(name);
    const result = await testConnection(url, key);
    setTestResults((prev) => ({ ...prev, [name]: result }));
    setTesting(null);
    if (result.ok) toast.success(`${name}: ${result.message}`);
    else toast.error(`${name}: ${result.message}`);
  };

  const handleSave = () => {
    // Already auto-saved via useLocalStorage, just toast
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
              GSTN / e-Invoice API
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
            Used for e-Invoice IRN generation, GSTR filing, and GSTN validation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="gstn-url">Base URL</Label>
              <Input
                id="gstn-url"
                value={settings.gstn.url}
                onChange={(e) => updateGstn("url", e.target.value)}
                placeholder="https://api.gstn.gov.in/v1"
                data-ocid="apiconfig.gstn.url.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gstn-key">API Key</Label>
              <MaskedInput
                id="gstn-key"
                value={settings.gstn.key}
                onChange={(v) => updateGstn("key", v)}
                placeholder="Enter API key"
                data-ocid="apiconfig.gstn.key.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gstn-clientid">Client ID</Label>
              <Input
                id="gstn-clientid"
                value={settings.gstn.clientId}
                onChange={(e) => updateGstn("clientId", e.target.value)}
                placeholder="Client ID"
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
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={testing === "GSTN"}
              onClick={() =>
                void runTest("GSTN", settings.gstn.url, settings.gstn.key)
              }
              data-ocid="apiconfig.gstn.test_button"
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
              PAN / GSTIN Validation API
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
            Real-time taxpayer information lookup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Base URL</Label>
              <Input
                value={settings.pan.url}
                onChange={(e) => updatePan("url", e.target.value)}
                placeholder="https://api.pan-validation.in/v1"
                data-ocid="apiconfig.pan.url.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>API Key</Label>
              <MaskedInput
                value={settings.pan.key}
                onChange={(v) => updatePan("key", v)}
                placeholder="Enter API key"
                data-ocid="apiconfig.pan.key.input"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={testing === "PAN"}
              onClick={() =>
                void runTest("PAN", settings.pan.url, settings.pan.key)
              }
              data-ocid="apiconfig.pan.test_button"
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
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={testing === "Banking"}
              onClick={() =>
                void runTest(
                  "Banking",
                  settings.banking.url,
                  settings.banking.key,
                )
              }
              data-ocid="apiconfig.banking.test_button"
            >
              {testing === "Banking" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wifi className="w-4 h-4 mr-2" />
              )}
              Test Connection
            </Button>
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
