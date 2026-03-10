import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Save, Sliders } from "lucide-react";
import { toast } from "sonner";

interface Preferences {
  language: string;
  defaultInvoiceType: string;
  fiscalYearStart: string;
  dateFormat: string;
  currencyDisplay: string;
  compactNumbers: boolean;
  autoBackup: boolean;
}

const DEFAULTS: Preferences = {
  language: "en",
  defaultInvoiceType: "sales",
  fiscalYearStart: "04",
  dateFormat: "dd-MMM-yyyy",
  currencyDisplay: "symbol",
  compactNumbers: false,
  autoBackup: false,
};

export function Preferences() {
  const [prefs, setPrefs] = useLocalStorage<Preferences>(
    "gst_preferences",
    DEFAULTS,
  );

  const update = (key: keyof Preferences, value: string | boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="max-w-2xl space-y-6" data-ocid="preferences.section">
      <div>
        <h2 className="text-lg font-semibold">Preferences</h2>
        <p className="text-sm text-muted-foreground">
          Customize your GST Manager experience.
        </p>
      </div>

      <Card className="bg-card border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sliders className="w-5 h-5 text-primary" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Language</Label>
              <Select
                value={prefs.language}
                onValueChange={(v) => update("language", v)}
              >
                <SelectTrigger data-ocid="preferences.language.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">Hindi (हिन्दी)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Default Invoice Type</Label>
              <Select
                value={prefs.defaultInvoiceType}
                onValueChange={(v) => update("defaultInvoiceType", v)}
              >
                <SelectTrigger data-ocid="preferences.invoicetype.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales Invoice</SelectItem>
                  <SelectItem value="service">Service Invoice</SelectItem>
                  <SelectItem value="einvoice">e-Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Fiscal Year Start</Label>
              <Select
                value={prefs.fiscalYearStart}
                onValueChange={(v) => update("fiscalYearStart", v)}
              >
                <SelectTrigger data-ocid="preferences.fiscalyear.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="04">April (Indian FY)</SelectItem>
                  <SelectItem value="01">January</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Date Format</Label>
              <Select
                value={prefs.dateFormat}
                onValueChange={(v) => update("dateFormat", v)}
              >
                <SelectTrigger data-ocid="preferences.dateformat.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dd-MMM-yyyy">15-Jan-2025</SelectItem>
                  <SelectItem value="dd/MM/yyyy">15/01/2025</SelectItem>
                  <SelectItem value="MM/dd/yyyy">01/15/2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Compact Numbers</Label>
                <p className="text-xs text-muted-foreground">
                  Show ₹10L instead of ₹10,00,000
                </p>
              </div>
              <Switch
                checked={prefs.compactNumbers}
                onCheckedChange={(v) => update("compactNumbers", v)}
                data-ocid="preferences.compact.switch"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Auto Backup Reminder</Label>
                <p className="text-xs text-muted-foreground">
                  Remind to backup weekly
                </p>
              </div>
              <Switch
                checked={prefs.autoBackup}
                onCheckedChange={(v) => update("autoBackup", v)}
                data-ocid="preferences.autobackup.switch"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => toast.success("Preferences saved")}
              data-ocid="preferences.save_button"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
