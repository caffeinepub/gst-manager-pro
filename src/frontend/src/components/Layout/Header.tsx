import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { AppPage } from "@/types/gst";
import { FileText, Plus, ShoppingCart } from "lucide-react";

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
  "ai-assistant": "AI Tax Assistant",
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
};

interface HeaderProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
}

export function Header({ currentPage, onNavigate }: HeaderProps) {
  const breadcrumbs = PAGE_BREADCRUMBS[currentPage];

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
        {currentPage === "dashboard" && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate("invoicing-sales")}
              className="text-xs"
              data-ocid="dashboard.invoice.primary_button"
            >
              <FileText className="w-3 h-3 mr-1.5" />
              New Invoice
            </Button>
            <Button
              size="sm"
              onClick={() => onNavigate("accounting-purchases")}
              className="text-xs"
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
      </div>
    </header>
  );
}
