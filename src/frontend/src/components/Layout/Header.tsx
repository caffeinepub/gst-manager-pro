import { CloudSyncStatus } from "@/components/CloudSyncStatus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useBusinessLogo, useLocalBusinessName } from "@/hooks/useBusinessLogo";
import { useInvoices, usePurchases } from "@/hooks/useGSTStore";
import { useLanguage } from "@/hooks/useLanguage";
import { useBusinessProfile } from "@/hooks/useQueries";
import type { AppPage } from "@/types/gst";
import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle2,
  FileText,
  Languages,
  Plus,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";
import { useMemo, useState } from "react";

const PAGE_TITLES: Record<AppPage, string> = {
  dashboard: "Dashboard",
  "masters-profile": "Business Profile",
  "masters-parties": "Parties",
  "masters-items": "Items & Services",
  "masters-taxrates": "Tax Rates",
  "invoicing-sales": "Sales Invoices",
  "invoicing-service": "Service Invoices",
  "invoicing-einvoice": "e-Invoice",
  "invoicing-quotations": "Quotations",
  "invoicing-proforma": "Proforma Invoices",
  "invoicing-eway-bill": "e-Way Bill",
  "invoicing-credit-notes": "Credit Notes",
  "invoicing-debit-notes": "Debit Notes",
  "invoicing-bill-of-supply": "Bill of Supply",
  "invoicing-delivery-challans": "Delivery Challans",
  "invoicing-all": "All Invoices",
  "invoicing-payments": "Payments",
  "accounting-purchases": "Purchases",
  "accounting-journal": "Journal Entries",
  "accounting-bank": "Bank Accounts",
  "accounting-cashbook": "Cash Book",
  "accounting-chart-of-accounts": "Chart of Accounts",
  "accounting-reconciliation": "Bank Reconciliation",
  "gst-gstr1": "GSTR-1 Report",
  "gst-gstr3b": "GSTR-3B Return",
  "gst-itc": "ITC Reconciliation",
  "gst-rcm": "RCM Tracker",
  "gst-audit": "Audit Trail",
  "reports-sales": "Sales Register",
  "reports-purchase": "Purchase Register",
  "reports-gst-summary": "GST Summary",
  "reports-ar-ageing": "AR Ageing",
  "reports-ap-ageing": "AP Ageing",
  "reports-trial-balance": "Trial Balance",
  "reports-pl": "Profit & Loss Statement",
  "reports-balance-sheet": "Balance Sheet",
  "reports-stock": "Stock Summary",
  "reports-cashflow": "Cash Flow Statement",
  "inventory-erp": "Inventory ERP",
  "ai-assistant": "AI Tax Assistant",
  "gst-api-integration": "GST API Integration",
  "workflow-automation": "Workflow Automation",
  "backup-restore": "Backup & Restore",
  "settings-api-config": "API Configuration",
  "settings-ocr": "OCR / Document Capture",
  "settings-import": "Import Data",
  "settings-preferences": "Preferences",
  "uat-dashboard": "UAT Dashboard",
  "payroll-employees": "Employees",
  "payroll-attendance": "Attendance",
  "payroll-process": "Process Payroll",
  "payroll-payslips": "Payslips",
  "payroll-reports": "Payroll Reports",
  "payroll-statutory": "Statutory Compliance",
};

const PAGE_BREADCRUMBS: Partial<Record<AppPage, string[]>> = {
  "masters-profile": ["Masters", "Business Profile"],
  "masters-parties": ["Masters", "Parties"],
  "masters-items": ["Masters", "Items & Services"],
  "masters-taxrates": ["Masters", "Tax Rates"],
  "invoicing-sales": ["Invoicing", "Sales Invoices"],
  "invoicing-service": ["Invoicing", "Service Invoices"],
  "invoicing-einvoice": ["Invoicing", "e-Invoice"],
  "invoicing-quotations": ["Invoicing", "Quotations"],
  "invoicing-proforma": ["Invoicing", "Proforma Invoices"],
  "invoicing-eway-bill": ["Invoicing", "e-Way Bill"],
  "invoicing-credit-notes": ["Invoicing", "Credit Notes"],
  "invoicing-debit-notes": ["Invoicing", "Debit Notes"],
  "invoicing-bill-of-supply": ["Invoicing", "Bill of Supply"],
  "invoicing-delivery-challans": ["Invoicing", "Delivery Challans"],
  "invoicing-all": ["Invoicing", "All Invoices"],
  "invoicing-payments": ["Invoicing", "Payments"],
  "accounting-purchases": ["Accounting", "Purchases"],
  "accounting-journal": ["Accounting", "Journal Entries"],
  "accounting-bank": ["Accounting", "Bank Accounts"],
  "accounting-cashbook": ["Accounting", "Cash Book"],
  "accounting-chart-of-accounts": ["Accounting", "Chart of Accounts"],
  "accounting-reconciliation": ["Accounting", "Bank Reconciliation"],
  "gst-gstr1": ["GST Compliance", "GSTR-1"],
  "gst-gstr3b": ["GST Compliance", "GSTR-3B"],
  "gst-itc": ["GST Compliance", "ITC Reconciliation"],
  "gst-rcm": ["GST Compliance", "RCM Tracker"],
  "gst-audit": ["GST Compliance", "Audit Trail"],
  "reports-sales": ["Reports", "Sales Register"],
  "reports-purchase": ["Reports", "Purchase Register"],
  "reports-gst-summary": ["Reports", "GST Summary"],
  "reports-ar-ageing": ["Reports", "AR Ageing"],
  "reports-ap-ageing": ["Reports", "AP Ageing"],
  "reports-trial-balance": ["Reports", "Trial Balance"],
  "reports-pl": ["Reports", "P&L Statement"],
  "reports-balance-sheet": ["Reports", "Balance Sheet"],
  "reports-stock": ["Reports", "Stock Summary"],
  "reports-cashflow": ["Reports", "Cash Flow"],
  "inventory-erp": ["Inventory", "Inventory ERP"],
  "gst-api-integration": ["GST Compliance", "API Integration"],
  "workflow-automation": ["Settings", "Workflow Automation"],
  "backup-restore": ["Settings", "Backup & Restore"],
  "settings-api-config": ["Settings", "API Configuration"],
  "settings-ocr": ["Settings", "OCR Capture"],
  "settings-import": ["Settings", "Import Data"],
  "settings-preferences": ["Settings", "Preferences"],
  "uat-dashboard": ["Settings", "UAT Dashboard"],
};

interface Notification {
  id: string;
  icon: React.ReactNode;
  message: string;
  timeAgo: string;
  type: "warning" | "info" | "error";
}

function useNotifications() {
  const { invoices } = useInvoices();
  const { purchases } = usePurchases();

  return useMemo(() => {
    const today = new Date();
    const notifications: Notification[] = [];

    const overdueInvoices = invoices.filter((inv) => {
      if (inv.status !== "confirmed") return false;
      if (!["sales", "service"].includes(inv.type)) return false;
      return new Date(inv.dueDate) < today;
    });
    if (overdueInvoices.length > 0) {
      notifications.push({
        id: "overdue",
        icon: <AlertCircle className="w-4 h-4 text-destructive" />,
        message: `${overdueInvoices.length} invoice${overdueInvoices.length > 1 ? "s" : ""} overdue`,
        timeAgo: "Now",
        type: "error",
      });
    }

    const upcomingInvoices = invoices.filter((inv) => {
      if (inv.status !== "confirmed") return false;
      if (!["sales", "service"].includes(inv.type)) return false;
      const dueDate = new Date(inv.dueDate);
      const diffDays = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      return diffDays >= 0 && diffDays <= 7;
    });
    if (upcomingInvoices.length > 0) {
      notifications.push({
        id: "upcoming",
        icon: <FileText className="w-4 h-4 text-yellow-500" />,
        message: `${upcomingInvoices.length} invoice${upcomingInvoices.length > 1 ? "s" : ""} due within 7 days`,
        timeAgo: "Upcoming",
        type: "warning",
      });
    }

    const gstr1Due = new Date(today.getFullYear(), today.getMonth() + 1, 11);
    const gstr1Diff = Math.ceil(
      (gstr1Due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (gstr1Diff >= 0 && gstr1Diff <= 7) {
      notifications.push({
        id: "gstr1-due",
        icon: <Calendar className="w-4 h-4 text-orange-500" />,
        message: `GSTR-1 filing due in ${gstr1Diff} day${gstr1Diff !== 1 ? "s" : ""}`,
        timeAgo: `${gstr1Diff}d`,
        type: "warning",
      });
    }

    const gstr3bDue = new Date(today.getFullYear(), today.getMonth() + 1, 20);
    const gstr3bDiff = Math.ceil(
      (gstr3bDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (gstr3bDiff >= 0 && gstr3bDiff <= 7) {
      notifications.push({
        id: "gstr3b-due",
        icon: <Calendar className="w-4 h-4 text-orange-500" />,
        message: `GSTR-3B filing due in ${gstr3bDiff} day${gstr3bDiff !== 1 ? "s" : ""}`,
        timeAgo: `${gstr3bDiff}d`,
        type: "warning",
      });
    }

    const rcmUnpaid = purchases.filter(
      (p) => p.isRcm && p.status === "confirmed",
    );
    if (rcmUnpaid.length > 0) {
      notifications.push({
        id: "rcm",
        icon: <ShoppingCart className="w-4 h-4 text-blue-500" />,
        message: `${rcmUnpaid.length} RCM purchase${rcmUnpaid.length > 1 ? "s" : ""} pending`,
        timeAgo: "Pending",
        type: "info",
      });
    }

    return notifications;
  }, [invoices, purchases]);
}

interface HeaderProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
}

export function Header({ currentPage, onNavigate }: HeaderProps) {
  const breadcrumbs = PAGE_BREADCRUMBS[currentPage];
  const notifications = useNotifications();
  const [readAll, setReadAll] = useState(false);
  const { lang, setLang } = useLanguage();
  const { logo } = useBusinessLogo();
  const { localName } = useLocalBusinessName();
  const { data: profile } = useBusinessProfile();

  const unreadCount = readAll ? 0 : notifications.length;

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/80 bg-background/95 backdrop-blur px-4 no-print">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />

      {/* Business Logo + Name in header */}
      <div className="flex items-center gap-2 mr-2">
        {logo ? (
          <img
            src={logo}
            alt="Logo"
            className="w-7 h-7 object-contain rounded"
          />
        ) : (
          <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
        )}
        {(profile?.businessName || localName) && (
          <span
            className="hidden lg:block text-sm font-semibold text-foreground"
            style={{
              fontFamily:
                '"Huxley Titling", "Cinzel", "Playfair Display", Georgia, serif',
            }}
          >
            {profile?.businessName || localName}
          </span>
        )}
      </div>

      <div className="flex-1">
        {breadcrumbs ? (
          <nav className="flex items-center gap-1.5 text-sm">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-muted-foreground">/</span>}
                <span
                  className={
                    i === breadcrumbs.length - 1
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  }
                >
                  {crumb}
                </span>
              </span>
            ))}
          </nav>
        ) : (
          <h1 className="text-sm font-semibold">{PAGE_TITLES[currentPage]}</h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Cloud Sync Status */}
        <CloudSyncStatus />

        {/* Language Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs font-medium gap-1.5"
          onClick={() => setLang(lang === "en" ? "hi" : "en")}
          data-ocid="header.language.toggle"
        >
          <Languages className="w-3.5 h-3.5" />
          <span className="hidden sm:flex items-center gap-1">
            <span
              className={
                lang === "en"
                  ? "text-foreground font-bold"
                  : "text-muted-foreground"
              }
            >
              EN
            </span>
            <span className="text-muted-foreground">|</span>
            <span
              className={
                lang === "hi"
                  ? "text-foreground font-bold"
                  : "text-muted-foreground"
              }
            >
              HI
            </span>
          </span>
        </Button>

        {currentPage === "dashboard" && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate("invoicing-sales")}
              className="hidden sm:flex text-xs"
              data-ocid="dashboard.invoice.primary_button"
            >
              <FileText className="w-3 h-3 mr-1.5" />
              New Invoice
            </Button>
            <Button
              size="sm"
              onClick={() => onNavigate("accounting-purchases")}
              className="hidden sm:flex text-xs"
              data-ocid="dashboard.purchase.primary_button"
            >
              <Plus className="w-3 h-3 mr-1.5" />
              New Purchase
            </Button>
          </>
        )}

        {/* Notifications Bell */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8"
              data-ocid="header.notifications.button"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-destructive text-[9px] font-bold p-0">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-80 p-0"
            data-ocid="header.notifications.popover"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setReadAll(true)}
                  data-ocid="header.notifications.mark_read.button"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <Bell className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50" />
                  No pending alerts
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 text-sm ${
                        !readAll ? "bg-muted/20" : ""
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">{n.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-tight">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {n.timeAgo}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
