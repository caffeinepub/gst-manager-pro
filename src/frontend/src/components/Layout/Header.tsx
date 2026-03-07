import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useInvoices, usePurchases } from "@/hooks/useGSTStore";
import { useLanguage } from "@/hooks/useLanguage";
import type { AppPage } from "@/types/gst";
import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle2,
  FileText,
  Languages,
  Plus,
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
  "invoicing-quotations": "Quotations",
  "invoicing-proforma": "Proforma Invoices",
  "invoicing-credit-notes": "Credit Notes",
  "invoicing-debit-notes": "Debit Notes",
  "invoicing-bill-of-supply": "Bill of Supply",
  "invoicing-delivery-challans": "Delivery Challans",
  "invoicing-payments": "Payments",
  "accounting-purchases": "Purchases",
  "accounting-journal": "Journal Entries",
  "accounting-bank": "Bank Accounts",
  "accounting-cashbook": "Cash Book / Transactions",
  "accounting-chart-of-accounts": "Chart of Accounts",
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
  "accounting-reconciliation": "Bank Reconciliation",
  "inventory-erp": "Inventory ERP",
  "ai-assistant": "AI Tax Assistant",
  "gst-api-integration": "GST API Integration",
  "workflow-automation": "Workflow Automation",
};

const PAGE_BREADCRUMBS: Partial<Record<AppPage, string[]>> = {
  "masters-profile": ["Masters", "Business Profile"],
  "masters-parties": ["Masters", "Parties"],
  "masters-items": ["Masters", "Items & Services"],
  "masters-taxrates": ["Masters", "Tax Rates"],
  "invoicing-sales": ["Invoicing", "Sales Invoices"],
  "invoicing-service": ["Invoicing", "Service Invoices"],
  "invoicing-quotations": ["Invoicing", "Quotations"],
  "invoicing-proforma": ["Invoicing", "Proforma Invoices"],
  "invoicing-credit-notes": ["Invoicing", "Credit Notes"],
  "invoicing-debit-notes": ["Invoicing", "Debit Notes"],
  "invoicing-bill-of-supply": ["Invoicing", "Bill of Supply"],
  "invoicing-delivery-challans": ["Invoicing", "Delivery Challans"],
  "invoicing-payments": ["Invoicing", "Payments"],
  "accounting-purchases": ["Accounting", "Purchases"],
  "accounting-journal": ["Accounting", "Journal Entries"],
  "accounting-bank": ["Accounting", "Bank Accounts"],
  "accounting-cashbook": ["Accounting", "Cash Book"],
  "accounting-chart-of-accounts": ["Accounting", "Chart of Accounts"],
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
  "accounting-reconciliation": ["Accounting", "Bank Reconciliation"],
  "inventory-erp": ["Inventory", "Inventory ERP"],
  "gst-api-integration": ["GST Compliance", "API Integration"],
  "workflow-automation": ["GST Compliance", "Workflow Automation"],
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

    // Overdue invoices
    const overdueInvoices = invoices.filter((inv) => {
      if (inv.status !== "confirmed") return false;
      if (!["sales", "service"].includes(inv.type)) return false;
      const dueDate = new Date(inv.dueDate);
      return dueDate < today;
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

    // Upcoming invoices (due within 7 days)
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

    // GSTR-1 due (11th of next month)
    const gstr1Due = new Date(today.getFullYear(), today.getMonth() + 1, 11);
    const gstr1DiffDays = Math.ceil(
      (gstr1Due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (gstr1DiffDays >= 0 && gstr1DiffDays <= 7) {
      notifications.push({
        id: "gstr1-due",
        icon: <Calendar className="w-4 h-4 text-orange-500" />,
        message: `GSTR-1 filing due in ${gstr1DiffDays} day${gstr1DiffDays !== 1 ? "s" : ""}`,
        timeAgo: `${gstr1DiffDays}d`,
        type: "warning",
      });
    }

    // GSTR-3B due (20th of next month)
    const gstr3bDue = new Date(today.getFullYear(), today.getMonth() + 1, 20);
    const gstr3bDiffDays = Math.ceil(
      (gstr3bDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (gstr3bDiffDays >= 0 && gstr3bDiffDays <= 7) {
      notifications.push({
        id: "gstr3b-due",
        icon: <Calendar className="w-4 h-4 text-orange-500" />,
        message: `GSTR-3B filing due in ${gstr3bDiffDays} day${gstr3bDiffDays !== 1 ? "s" : ""}`,
        timeAgo: `${gstr3bDiffDays}d`,
        type: "warning",
      });
    }

    // RCM purchases unpaid
    const rcmUnpaid = purchases.filter(
      (p) => p.isRcm && p.status === "confirmed",
    );
    if (rcmUnpaid.length > 0) {
      notifications.push({
        id: "rcm",
        icon: <ShoppingCart className="w-4 h-4 text-blue-500" />,
        message: `${rcmUnpaid.length} RCM purchase${rcmUnpaid.length > 1 ? "s" : ""} pending tax payment`,
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

  const unreadCount = readAll ? 0 : notifications.length;

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/80 bg-background/95 backdrop-blur px-4 no-print">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />

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
        {/* Language Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs font-medium gap-1.5"
          onClick={() => setLang(lang === "en" ? "hi" : "en")}
          data-ocid="header.language.toggle"
          title="Toggle language"
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
        {(currentPage.startsWith("invoicing") ||
          currentPage.startsWith("accounting")) &&
          currentPage !== "invoicing-payments" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              className="text-xs no-print"
            >
              Print
            </Button>
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
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
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
