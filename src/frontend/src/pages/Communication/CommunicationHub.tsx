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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Invoice } from "@/types/gst";
import { formatDate, formatINR } from "@/utils/formatting";
import {
  CheckCircle,
  Clock,
  Mail,
  MessageCircle,
  Phone,
  Send,
  Smartphone,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type CommChannel = "email" | "sms" | "whatsapp";
type CommType = "invoice" | "payslip" | "reminder";
type CommStatus = "sent" | "failed";

interface CommLog {
  id: string;
  timestamp: string;
  recipient: string;
  channel: CommChannel;
  type: CommType;
  status: CommStatus;
  messagePreview: string;
  error?: string;
}

interface ApiCfg {
  sms?: { provider: string; key: string; senderId: string; enabled: boolean };
  whatsapp?: {
    provider: string;
    key: string;
    phoneNumberId: string;
    enabled: boolean;
  };
  email?: { key: string; senderId: string; enabled: boolean };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBizId(): string {
  return localStorage.getItem("gst_active_business") ?? "";
}

function getApiCfg(): ApiCfg {
  const bizId = getBizId();
  const raw = bizId ? localStorage.getItem(`gst_${bizId}_api_settings`) : null;
  if (raw) {
    try {
      return JSON.parse(raw) as ApiCfg;
    } catch {
      /* ignore */
    }
  }
  // Fallback legacy key
  const legacy = localStorage.getItem("gst_api_settings");
  if (legacy) {
    try {
      return JSON.parse(legacy) as ApiCfg;
    } catch {
      /* ignore */
    }
  }
  return {};
}

function getLogs(): CommLog[] {
  const bizId = getBizId();
  const key = `gst_${bizId}_comm_logs`;
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as CommLog[];
  } catch {
    return [];
  }
}

function appendLog(log: CommLog): void {
  const bizId = getBizId();
  const key = `gst_${bizId}_comm_logs`;
  const existing = getLogs();
  localStorage.setItem(key, JSON.stringify([log, ...existing].slice(0, 500)));
}

function getInvoices(): Invoice[] {
  const bizId = getBizId();
  try {
    return JSON.parse(
      localStorage.getItem(`gst_${bizId}_invoices`) ?? "[]",
    ) as Invoice[];
  } catch {
    return [];
  }
}

function getEmployees(): {
  id: string;
  name: string;
  pan: string;
  bankName: string;
  email?: string;
  phone?: string;
}[] {
  const bizId = getBizId();
  try {
    return JSON.parse(localStorage.getItem(`gst_${bizId}_employees`) ?? "[]");
  } catch {
    return [];
  }
}

function getOverdueInvoices(): Invoice[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return getInvoices().filter((inv) => {
    if (inv.status !== "confirmed") return false;
    if (!inv.dueDate) return false;
    const due = new Date(inv.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  });
}

function daysOverdue(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

function channelConfigured(cfg: ApiCfg, channel: CommChannel): boolean {
  if (channel === "email") return !!cfg.sms?.key || !!cfg.email?.key; // SMS card doubles as email
  if (channel === "sms") return !!cfg.sms?.key;
  if (channel === "whatsapp") return !!cfg.whatsapp?.key;
  return false;
}

const CHANNEL_ICONS: Record<
  CommChannel,
  React.ComponentType<{ className?: string }>
> = {
  email: Mail,
  sms: Phone,
  whatsapp: MessageCircle,
};

const CHANNEL_LABELS: Record<CommChannel, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

// ─── Send API ─────────────────────────────────────────────────────────────────

async function sendViaChannel(
  channel: CommChannel,
  cfg: ApiCfg,
  to: { name: string; email: string; phone: string },
  subject: string,
  body: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    if (channel === "email") {
      const key = cfg.sms?.key ?? cfg.email?.key ?? "";
      const from = cfg.sms?.senderId ?? "noreply@gstmanager.app";
      if (!key) return { ok: false, message: "Email API key not configured" };
      const provider = cfg.sms?.provider ?? "sendgrid";

      if (provider === "sendgrid") {
        const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to.email, name: to.name }] }],
            from: { email: from },
            subject,
            content: [{ type: "text/plain", value: body }],
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok || res.status === 202)
          return { ok: true, message: "Email sent via SendGrid" };
        return { ok: false, message: `SendGrid error: HTTP ${res.status}` };
      }

      if (provider === "msg91") {
        const res = await fetch("https://api.msg91.com/api/v5/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", authkey: key },
          body: JSON.stringify({
            to: [{ email: to.email, name: to.name }],
            from: { email: from },
            subject,
            html: body,
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) return { ok: true, message: "Email sent via MSG91" };
        return { ok: false, message: `MSG91 error: HTTP ${res.status}` };
      }

      // Custom — treat sms.url as endpoint
      return {
        ok: false,
        message: "Custom email: configure endpoint in API Config",
      };
    }

    if (channel === "sms") {
      const smsCfg = cfg.sms;
      if (!smsCfg?.key)
        return { ok: false, message: "SMS API key not configured" };
      const provider = smsCfg.provider;

      if (provider === "msg91") {
        const res = await fetch("https://api.msg91.com/api/v5/flow/", {
          method: "POST",
          headers: { "Content-Type": "application/json", authkey: smsCfg.key },
          body: JSON.stringify({
            sender: smsCfg.senderId,
            mobiles: to.phone.replace(/\D/g, ""),
            message: body,
          }),
          signal: AbortSignal.timeout(10000),
        });
        const data = (await res.json().catch(() => ({}))) as { type?: string };
        if (data.type === "success" || res.ok)
          return { ok: true, message: "SMS sent via MSG91" };
        return { ok: false, message: `MSG91 error: ${JSON.stringify(data)}` };
      }

      if (provider === "twilio") {
        const accountSid = smsCfg.senderId;
        const [sid, token] = smsCfg.key.split(":");
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
            },
            body: new URLSearchParams({
              From: smsCfg.senderId,
              To: to.phone,
              Body: body,
            }).toString(),
            signal: AbortSignal.timeout(10000),
          },
        );
        if (res.ok) return { ok: true, message: "SMS sent via Twilio" };
        return { ok: false, message: `Twilio error: HTTP ${res.status}` };
      }

      return {
        ok: false,
        message: "Custom SMS: configure provider endpoint in API Config",
      };
    }

    if (channel === "whatsapp") {
      const waCfg = cfg.whatsapp;
      if (!waCfg?.key)
        return { ok: false, message: "WhatsApp API key not configured" };

      if (waCfg.provider === "meta" || !waCfg.provider) {
        const phoneId = waCfg.phoneNumberId;
        const res = await fetch(
          `https://graph.facebook.com/v18.0/${phoneId}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${waCfg.key}`,
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: to.phone.replace(/\D/g, ""),
              type: "text",
              text: { body },
            }),
            signal: AbortSignal.timeout(10000),
          },
        );
        if (res.ok)
          return {
            ok: true,
            message: "WhatsApp message sent via Meta Business API",
          };
        const err = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        return {
          ok: false,
          message: `Meta API error: ${err?.error?.message ?? `HTTP ${res.status}`}`,
        };
      }

      return {
        ok: false,
        message: "Configure WhatsApp provider in API Config",
      };
    }

    return { ok: false, message: "Unknown channel" };
  } catch (err) {
    const msg = (err as Error)?.message ?? "Unknown error";
    if (
      msg.includes("CORS") ||
      msg.includes("Failed to fetch") ||
      msg.includes("NetworkError")
    ) {
      return {
        ok: false,
        message: `CORS blocked — API call must go through a server proxy. (${msg})`,
      };
    }
    return { ok: false, message: msg };
  }
}

// ─── Tab: Send Invoice ────────────────────────────────────────────────────────

function SendInvoiceTab({ onLogAdded }: { onLogAdded: () => void }) {
  const invoices = getInvoices();
  const cfg = getApiCfg();

  const [selectedInvoice, setSelectedInvoice] = useState("");
  const [toName, setToName] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [toPhone, setToPhone] = useState("");
  const [channel, setChannel] = useState<CommChannel>("email");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const invoice = invoices.find((i) => i.id === selectedInvoice);

  const getTemplate = (ch: CommChannel, inv?: Invoice): string => {
    if (!inv) return "";
    if (ch === "email")
      return `Dear ${inv.partyName},\n\nPlease find your invoice ${inv.invoiceNumber} dated ${formatDate(inv.date)} for ${formatINR(inv.grandTotal)}.\n\nDue Date: ${formatDate(inv.dueDate)}\n\nThank you for your business.\n\nRegards,\nGST Manager Pro`;
    if (ch === "sms")
      return `Invoice ${inv.invoiceNumber} for ${formatINR(inv.grandTotal)} due ${formatDate(inv.dueDate)}. GST Manager Pro.`;
    return `Invoice *${inv.invoiceNumber}*\nAmount: *${formatINR(inv.grandTotal)}*\nDue: ${formatDate(inv.dueDate)}\n\nReply to confirm receipt.`;
  };

  const handleInvoiceChange = (id: string) => {
    setSelectedInvoice(id);
    const inv = invoices.find((i) => i.id === id);
    if (inv) {
      setToName(inv.partyName ?? "");
      setSubject(`Invoice ${inv.invoiceNumber} - ${formatINR(inv.grandTotal)}`);
      setMessage(getTemplate(channel, inv));
    }
  };

  const handleChannelChange = (ch: CommChannel) => {
    setChannel(ch);
    setMessage(getTemplate(ch, invoice));
  };

  const handleSend = async () => {
    if (!invoice) {
      toast.error("Select an invoice first");
      return;
    }
    if (channel === "email" && !toEmail) {
      toast.error("Enter recipient email");
      return;
    }
    if ((channel === "sms" || channel === "whatsapp") && !toPhone) {
      toast.error("Enter recipient phone");
      return;
    }

    setSending(true);
    const result = await sendViaChannel(
      channel,
      cfg,
      { name: toName, email: toEmail, phone: toPhone },
      subject,
      message,
    );
    const log: CommLog = {
      id: `${Date.now()}`,
      timestamp: new Date().toISOString(),
      recipient: channel === "email" ? toEmail : toPhone,
      channel,
      type: "invoice",
      status: result.ok ? "sent" : "failed",
      messagePreview: message.slice(0, 100),
      error: result.ok ? undefined : result.message,
    };
    appendLog(log);
    onLogAdded();
    setSending(false);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  };

  return (
    <div className="space-y-5" data-ocid="comm.invoice.section">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Select Invoice</Label>
          <Select value={selectedInvoice} onValueChange={handleInvoiceChange}>
            <SelectTrigger data-ocid="comm.invoice.select">
              <SelectValue placeholder="Select an invoice..." />
            </SelectTrigger>
            <SelectContent>
              {invoices.length === 0 && (
                <SelectItem value="__none" disabled>
                  No invoices found
                </SelectItem>
              )}
              {invoices.map((inv) => (
                <SelectItem key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} — {inv.partyName} (
                  {formatINR(inv.grandTotal)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Channel</Label>
          <RadioGroup
            value={channel}
            onValueChange={(v) => handleChannelChange(v as CommChannel)}
            className="flex gap-4"
          >
            {(["email", "sms", "whatsapp"] as CommChannel[]).map((ch) => {
              const Icon = CHANNEL_ICONS[ch];
              const configured = channelConfigured(cfg, ch);
              return (
                <div key={ch} className="flex items-center gap-1.5">
                  <RadioGroupItem
                    value={ch}
                    id={`inv-ch-${ch}`}
                    data-ocid={`comm.invoice.${ch}.radio`}
                  />
                  <Label
                    htmlFor={`inv-ch-${ch}`}
                    className="flex items-center gap-1 cursor-pointer"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {CHANNEL_LABELS[ch]}
                    {!configured && (
                      <Badge
                        variant="outline"
                        className="text-[9px] ml-1 px-1 py-0"
                      >
                        Not configured
                      </Badge>
                    )}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="inv-to-name">Recipient Name</Label>
          <Input
            id="inv-to-name"
            value={toName}
            onChange={(e) => setToName(e.target.value)}
            placeholder="Party name"
            data-ocid="comm.invoice.to_name.input"
          />
        </div>
        {channel === "email" && (
          <div className="space-y-1.5">
            <Label htmlFor="inv-to-email">Email</Label>
            <Input
              id="inv-to-email"
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="party@email.com"
              data-ocid="comm.invoice.to_email.input"
            />
          </div>
        )}
        {(channel === "sms" || channel === "whatsapp") && (
          <div className="space-y-1.5">
            <Label htmlFor="inv-to-phone">Phone Number</Label>
            <Input
              id="inv-to-phone"
              type="tel"
              value={toPhone}
              onChange={(e) => setToPhone(e.target.value)}
              placeholder="+91XXXXXXXXXX"
              data-ocid="comm.invoice.to_phone.input"
            />
          </div>
        )}
        {channel === "email" && (
          <div className="space-y-1.5">
            <Label htmlFor="inv-subject">Subject</Label>
            <Input
              id="inv-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Invoice subject"
              data-ocid="comm.invoice.subject.input"
            />
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="inv-message">Message</Label>
        <Textarea
          id="inv-message"
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message body..."
          data-ocid="comm.invoice.message.textarea"
        />
      </div>

      <Button
        onClick={() => void handleSend()}
        disabled={sending || !selectedInvoice}
        data-ocid="comm.invoice.send_button"
      >
        {sending ? (
          <span className="animate-spin mr-2">⏳</span>
        ) : (
          <Send className="w-4 h-4 mr-2" />
        )}
        Send Invoice
      </Button>
    </div>
  );
}

// ─── Tab: Send Payslip ────────────────────────────────────────────────────────

function SendPayslipTab({ onLogAdded }: { onLogAdded: () => void }) {
  const employees = getEmployees();
  const cfg = getApiCfg();
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [selectedEmp, setSelectedEmp] = useState("");
  const [month, setMonth] = useState(currentMonth);
  const [toEmail, setToEmail] = useState("");
  const [toPhone, setToPhone] = useState("");
  const [channel, setChannel] = useState<CommChannel>("email");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const emp = employees.find((e) => e.id === selectedEmp);

  const getTemplate = (ch: CommChannel): string => {
    if (!emp) return "";
    const m = new Date(`${month}-01`).toLocaleString("en-IN", {
      month: "long",
      year: "numeric",
    });
    if (ch === "email")
      return `Dear ${emp.name},\n\nPlease find your payslip for ${m} attached.\n\nFor any queries, please contact HR.\n\nRegards,\nPayroll Team`;
    if (ch === "sms")
      return `Your payslip for ${m} is ready. Login to GST Manager Pro to view/download.`;
    return `Dear *${emp.name}*,\nYour payslip for *${m}* is now available. Contact HR for any queries.`;
  };

  const handleEmpChange = (id: string) => {
    setSelectedEmp(id);
    const e = employees.find((x) => x.id === id);
    if (e) {
      setToEmail((e as unknown as { email?: string }).email ?? "");
      setToPhone((e as unknown as { phone?: string }).phone ?? "");
    }
    setMessage(getTemplate(channel));
  };

  const handleChannelChange = (ch: CommChannel) => {
    setChannel(ch);
    setMessage(getTemplate(ch));
  };

  const handleSend = async () => {
    if (!emp) {
      toast.error("Select an employee first");
      return;
    }
    if (channel === "email" && !toEmail) {
      toast.error("Enter recipient email");
      return;
    }
    if ((channel === "sms" || channel === "whatsapp") && !toPhone) {
      toast.error("Enter recipient phone");
      return;
    }

    setSending(true);
    const m = new Date(`${month}-01`).toLocaleString("en-IN", {
      month: "long",
      year: "numeric",
    });
    const result = await sendViaChannel(
      channel,
      cfg,
      { name: emp.name, email: toEmail, phone: toPhone },
      `Payslip for ${m}`,
      message,
    );
    const log: CommLog = {
      id: `${Date.now()}`,
      timestamp: new Date().toISOString(),
      recipient: channel === "email" ? toEmail : toPhone,
      channel,
      type: "payslip",
      status: result.ok ? "sent" : "failed",
      messagePreview: message.slice(0, 100),
      error: result.ok ? undefined : result.message,
    };
    appendLog(log);
    onLogAdded();
    setSending(false);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  };

  return (
    <div className="space-y-5" data-ocid="comm.payslip.section">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Select Employee</Label>
          <Select value={selectedEmp} onValueChange={handleEmpChange}>
            <SelectTrigger data-ocid="comm.payslip.employee.select">
              <SelectValue placeholder="Select employee..." />
            </SelectTrigger>
            <SelectContent>
              {employees.length === 0 && (
                <SelectItem value="__none" disabled>
                  No employees found
                </SelectItem>
              )}
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="payslip-month">Month</Label>
          <Input
            id="payslip-month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            data-ocid="comm.payslip.month.input"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Channel</Label>
        <RadioGroup
          value={channel}
          onValueChange={(v) => handleChannelChange(v as CommChannel)}
          className="flex gap-4"
        >
          {(["email", "sms", "whatsapp"] as CommChannel[]).map((ch) => {
            const Icon = CHANNEL_ICONS[ch];
            const configured = channelConfigured(cfg, ch);
            return (
              <div key={ch} className="flex items-center gap-1.5">
                <RadioGroupItem
                  value={ch}
                  id={`ps-ch-${ch}`}
                  data-ocid={`comm.payslip.${ch}.radio`}
                />
                <Label
                  htmlFor={`ps-ch-${ch}`}
                  className="flex items-center gap-1 cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {CHANNEL_LABELS[ch]}
                  {!configured && (
                    <Badge
                      variant="outline"
                      className="text-[9px] ml-1 px-1 py-0"
                    >
                      Not configured
                    </Badge>
                  )}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {channel === "email" && (
          <div className="space-y-1.5">
            <Label htmlFor="ps-email">Email</Label>
            <Input
              id="ps-email"
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="employee@company.com"
              data-ocid="comm.payslip.email.input"
            />
          </div>
        )}
        {(channel === "sms" || channel === "whatsapp") && (
          <div className="space-y-1.5">
            <Label htmlFor="ps-phone">Phone Number</Label>
            <Input
              id="ps-phone"
              type="tel"
              value={toPhone}
              onChange={(e) => setToPhone(e.target.value)}
              placeholder="+91XXXXXXXXXX"
              data-ocid="comm.payslip.phone.input"
            />
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ps-message">Message</Label>
        <Textarea
          id="ps-message"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message body..."
          data-ocid="comm.payslip.message.textarea"
        />
      </div>

      <Button
        onClick={() => void handleSend()}
        disabled={sending || !selectedEmp}
        data-ocid="comm.payslip.send_button"
      >
        {sending ? (
          <span className="animate-spin mr-2">⏳</span>
        ) : (
          <Send className="w-4 h-4 mr-2" />
        )}
        Send Payslip
      </Button>
    </div>
  );
}

// ─── Tab: Payment Reminders ───────────────────────────────────────────────────

function PaymentRemindersTab({ onLogAdded }: { onLogAdded: () => void }) {
  const overdue = getOverdueInvoices();
  const cfg = getApiCfg();
  const [channel, setChannel] = useState<CommChannel>("sms");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);

  const buildReminderMessage = (inv: Invoice, ch: CommChannel): string => {
    const days = daysOverdue(inv.dueDate);
    if (ch === "email")
      return `Dear ${inv.partyName},\n\nThis is a reminder that invoice ${inv.invoiceNumber} for ${formatINR(inv.grandTotal)} was due on ${formatDate(inv.dueDate)} (${days} day${days !== 1 ? "s" : ""} overdue).\n\nPlease make payment at the earliest.\n\nRegards,\nGST Manager Pro`;
    if (ch === "sms")
      return `Reminder: Invoice ${inv.invoiceNumber} for ${formatINR(inv.grandTotal)} is ${days} days overdue. Due: ${formatDate(inv.dueDate)}. Please pay immediately.`;
    return `*Payment Reminder*\nInvoice *${inv.invoiceNumber}* for *${formatINR(inv.grandTotal)}* is *${days} days overdue* (due ${formatDate(inv.dueDate)}).\nPlease make payment immediately.`;
  };

  const sendReminder = async (inv: Invoice) => {
    setSendingId(inv.id);
    const result = await sendViaChannel(
      channel,
      cfg,
      { name: inv.partyName, email: "", phone: "" },
      `Payment Reminder: Invoice ${inv.invoiceNumber}`,
      buildReminderMessage(inv, channel),
    );
    const log: CommLog = {
      id: `${Date.now()}`,
      timestamp: new Date().toISOString(),
      recipient: inv.partyName,
      channel,
      type: "reminder",
      status: result.ok ? "sent" : "failed",
      messagePreview: buildReminderMessage(inv, channel).slice(0, 100),
      error: result.ok ? undefined : result.message,
    };
    appendLog(log);
    onLogAdded();
    setSendingId(null);
    if (result.ok) toast.success(`Reminder sent to ${inv.partyName}`);
    else toast.error(result.message);
  };

  const sendAllReminders = async () => {
    setSendingAll(true);
    for (const inv of overdue) {
      await sendReminder(inv);
    }
    setSendingAll(false);
    toast.success(
      `Sent ${overdue.length} reminder${overdue.length !== 1 ? "s" : ""}`,
    );
  };

  return (
    <div className="space-y-5" data-ocid="comm.reminders.section">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <Label>Send Via</Label>
          <RadioGroup
            value={channel}
            onValueChange={(v) => setChannel(v as CommChannel)}
            className="flex gap-4"
          >
            {(["email", "sms", "whatsapp"] as CommChannel[]).map((ch) => {
              const Icon = CHANNEL_ICONS[ch];
              return (
                <div key={ch} className="flex items-center gap-1.5">
                  <RadioGroupItem
                    value={ch}
                    id={`rem-ch-${ch}`}
                    data-ocid={`comm.reminder.${ch}.radio`}
                  />
                  <Label
                    htmlFor={`rem-ch-${ch}`}
                    className="flex items-center gap-1 cursor-pointer"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {CHANNEL_LABELS[ch]}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>
        <Button
          disabled={overdue.length === 0 || sendingAll}
          onClick={() => void sendAllReminders()}
          data-ocid="comm.reminders.send_all.button"
        >
          <Send className="w-4 h-4 mr-2" />
          Send All Reminders ({overdue.length})
        </Button>
      </div>

      {overdue.length === 0 ? (
        <div
          className="text-center py-12 text-muted-foreground"
          data-ocid="comm.reminders.empty_state"
        >
          <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
          <p className="text-sm font-medium">No overdue invoices! 🎉</p>
          <p className="text-xs mt-1">
            All confirmed invoices are within their due dates.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table data-ocid="comm.reminders.table">
            <TableHeader>
              <TableRow>
                <TableHead>Party</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Overdue</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overdue.map((inv, idx) => (
                <TableRow
                  key={inv.id}
                  data-ocid={`comm.reminders.item.${idx + 1}`}
                >
                  <TableCell className="font-medium text-sm">
                    {inv.partyName}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-primary">
                    {inv.invoiceNumber}
                  </TableCell>
                  <TableCell className="font-numeric text-sm">
                    {formatINR(inv.grandTotal)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(inv.dueDate)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive" className="text-xs">
                      {daysOverdue(inv.dueDate)}d overdue
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={sendingId === inv.id}
                      onClick={() => void sendReminder(inv)}
                      data-ocid={`comm.reminders.send_button.${idx + 1}`}
                    >
                      <Send className="w-3 h-3 mr-1" />
                      Send
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Communication Logs ─────────────────────────────────────────────────

function CommLogsTab({
  logs,
  onClear,
}: { logs: CommLog[]; onClear: () => void }) {
  const STATUS_ICONS: Record<CommStatus, React.ReactNode> = {
    sent: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
    failed: <XCircle className="w-3.5 h-3.5 text-destructive" />,
  };

  return (
    <div className="space-y-4" data-ocid="comm.logs.section">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {logs.length} communication{logs.length !== 1 ? "s" : ""} logged
        </p>
        {logs.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onClear}
            data-ocid="comm.logs.clear.button"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear Logs
          </Button>
        )}
      </div>

      {logs.length === 0 ? (
        <div
          className="text-center py-12 text-muted-foreground"
          data-ocid="comm.logs.empty_state"
        >
          <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No communication logs yet.</p>
        </div>
      ) : (
        <ScrollArea className="h-[420px]">
          <Table data-ocid="comm.logs.table">
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Preview</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log, idx) => {
                const Icon = CHANNEL_ICONS[log.channel];
                return (
                  <TableRow
                    key={log.id}
                    data-ocid={`comm.logs.item.${idx + 1}`}
                  >
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-sm max-w-[120px] truncate">
                      {log.recipient}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Icon className="w-3 h-3" />
                        {CHANNEL_LABELS[log.channel]}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize text-xs">
                      {log.type}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {STATUS_ICONS[log.status]}
                        <span
                          className={`text-xs capitalize ${log.status === "sent" ? "text-emerald-600" : "text-destructive"}`}
                        >
                          {log.status}
                        </span>
                      </div>
                      {log.error && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[160px] truncate">
                          {log.error}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                      {log.messagePreview}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CommunicationHub() {
  const [logs, setLogs] = useState<CommLog[]>(() => getLogs());

  const refreshLogs = () => setLogs(getLogs());

  const clearLogs = () => {
    const bizId = getBizId();
    localStorage.removeItem(`gst_${bizId}_comm_logs`);
    setLogs([]);
    toast.info("Communication logs cleared");
  };

  return (
    <div className="space-y-4 max-w-5xl" data-ocid="comm.page">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Smartphone className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Communication Hub</h1>
          <p className="text-sm text-muted-foreground">
            Send invoices, payslips, and payment reminders via Email, SMS, or
            WhatsApp
          </p>
        </div>
      </div>

      <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            <strong>Setup required:</strong> Configure API keys in{" "}
            <strong>Settings › API Configuration</strong> for Email/SMS (SMS
            Gateway card) and WhatsApp (WhatsApp Business API card) before
            sending. Browser-to-API calls may be CORS-blocked — use a server
            proxy for production.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="send-invoice">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger
            value="send-invoice"
            className="flex items-center gap-1.5"
            data-ocid="comm.invoice.tab"
          >
            <Mail className="w-3.5 h-3.5" />
            Invoice
          </TabsTrigger>
          <TabsTrigger
            value="send-payslip"
            className="flex items-center gap-1.5"
            data-ocid="comm.payslip.tab"
          >
            <Phone className="w-3.5 h-3.5" />
            Payslip
          </TabsTrigger>
          <TabsTrigger
            value="reminders"
            className="flex items-center gap-1.5"
            data-ocid="comm.reminders.tab"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Reminders
          </TabsTrigger>
          <TabsTrigger
            value="logs"
            className="flex items-center gap-1.5"
            data-ocid="comm.logs.tab"
          >
            <Clock className="w-3.5 h-3.5" />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send-invoice" className="mt-5">
          <Card className="bg-card border-border/70">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Send Invoice
              </CardTitle>
              <CardDescription>
                Dispatch an invoice to your customer via Email, SMS, or WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SendInvoiceTab onLogAdded={refreshLogs} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="send-payslip" className="mt-5">
          <Card className="bg-card border-border/70">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                Send Payslip
              </CardTitle>
              <CardDescription>
                Send monthly payslip to an employee
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SendPayslipTab onLogAdded={refreshLogs} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="mt-5">
          <Card className="bg-card border-border/70">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                Payment Reminders
              </CardTitle>
              <CardDescription>
                Overdue invoices with payment reminder dispatch
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentRemindersTab onLogAdded={refreshLogs} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-5">
          <Card className="bg-card border-border/70">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Communication Logs
              </CardTitle>
              <CardDescription>
                History of all sent communications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CommLogsTab logs={logs} onClear={clearLogs} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
