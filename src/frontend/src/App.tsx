import { AppLayout } from "@/components/Layout/AppLayout";
import { Toaster } from "@/components/ui/sonner";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { LanguageProvider } from "@/hooks/useLanguage";
import { AIAssistant } from "@/pages/AIAssistant/AIAssistant";
import { BankAccounts } from "@/pages/Accounting/BankAccounts";
import { BankReconciliation } from "@/pages/Accounting/BankReconciliation";
import { CashBook } from "@/pages/Accounting/CashBook";
import { ChartOfAccounts } from "@/pages/Accounting/ChartOfAccounts";
import { JournalEntries } from "@/pages/Accounting/JournalEntries";
import { Purchases } from "@/pages/Accounting/Purchases";
import { Dashboard } from "@/pages/Dashboard";
import { AuditTrail } from "@/pages/GSTCompliance/AuditTrail";
import { GSTAPIIntegration } from "@/pages/GSTCompliance/GSTAPIIntegration";
import { GSTR1 } from "@/pages/GSTCompliance/GSTR1";
import { GSTR3B } from "@/pages/GSTCompliance/GSTR3B";
import { ITCReconciliation } from "@/pages/GSTCompliance/ITCReconciliation";
import { RCMTracker } from "@/pages/GSTCompliance/RCMTracker";
import { WorkflowAutomation } from "@/pages/GSTCompliance/WorkflowAutomation";
import { InventoryERP } from "@/pages/Inventory/InventoryERP";
import { InvoiceList } from "@/pages/Invoicing/InvoiceList";
import { Payments } from "@/pages/Invoicing/Payments";
import { Login } from "@/pages/Login";
import { BusinessProfile } from "@/pages/Masters/BusinessProfile";
import { Items } from "@/pages/Masters/Items";
import { Parties } from "@/pages/Masters/Parties";
import { TaxRates } from "@/pages/Masters/TaxRates";
import { CashFlow } from "@/pages/Reports/CashFlow";
import { Reports } from "@/pages/Reports/Reports";
import { StockSummary } from "@/pages/Reports/StockSummary";
import { APIConfig } from "@/pages/Settings/APIConfig";
import { BackupRestore } from "@/pages/Settings/BackupRestore";
import { DataImport } from "@/pages/Settings/DataImport";
import { OCRCapture } from "@/pages/Settings/OCRCapture";
import { Preferences } from "@/pages/Settings/Preferences";
import { AutomatedUAT } from "@/pages/UAT/AutomatedUAT";
import type { AppPage } from "@/types/gst";
import { seedInitialData } from "@/utils/seedData";
import { useEffect, useState } from "react";

function PageContent({
  page,
  onNavigate,
}: { page: AppPage; onNavigate: (p: AppPage) => void }) {
  switch (page) {
    case "dashboard":
      return <Dashboard onNavigate={onNavigate} />;
    case "masters-profile":
      return <BusinessProfile />;
    case "masters-parties":
      return <Parties />;
    case "masters-items":
      return <Items />;
    case "masters-taxrates":
      return <TaxRates />;
    case "invoicing-sales":
      return <InvoiceList type="sales" />;
    case "invoicing-service":
      return <InvoiceList type="service" />;
    case "invoicing-einvoice":
      return <InvoiceList type="einvoice" />;
    case "invoicing-quotations":
      return <InvoiceList type="quotation" />;
    case "invoicing-proforma":
      return <InvoiceList type="proforma" />;
    case "invoicing-eway-bill":
      return <InvoiceList type="eway_bill" />;
    case "invoicing-credit-notes":
      return <InvoiceList type="credit_note" />;
    case "invoicing-debit-notes":
      return <InvoiceList type="debit_note" />;
    case "invoicing-bill-of-supply":
      return <InvoiceList type="bill_of_supply" />;
    case "invoicing-delivery-challans":
      return <InvoiceList type="delivery_challan" />;
    case "invoicing-all":
      return <InvoiceList type="all" />;
    case "invoicing-payments":
      return <Payments />;
    case "accounting-purchases":
      return <Purchases />;
    case "accounting-journal":
      return <JournalEntries />;
    case "accounting-bank":
      return <BankAccounts />;
    case "accounting-cashbook":
      return <CashBook />;
    case "gst-gstr1":
      return <GSTR1 />;
    case "gst-gstr3b":
      return <GSTR3B />;
    case "gst-itc":
      return <ITCReconciliation />;
    case "gst-rcm":
      return <RCMTracker />;
    case "gst-audit":
      return <AuditTrail />;
    case "accounting-reconciliation":
      return <BankReconciliation />;
    case "accounting-chart-of-accounts":
      return <ChartOfAccounts />;
    case "inventory-erp":
      return <InventoryERP />;
    case "reports-stock":
      return <StockSummary />;
    case "reports-cashflow":
      return <CashFlow />;
    case "reports-sales":
    case "reports-purchase":
    case "reports-gst-summary":
    case "reports-ar-ageing":
    case "reports-ap-ageing":
    case "reports-trial-balance":
    case "reports-pl":
    case "reports-balance-sheet":
      return <Reports page={page} />;
    case "ai-assistant":
      return <AIAssistant />;
    case "gst-api-integration":
      return <GSTAPIIntegration />;
    case "workflow-automation":
      return <WorkflowAutomation />;
    case "backup-restore":
      return <BackupRestore />;
    case "settings-api-config":
      return <APIConfig />;
    case "settings-ocr":
      return <OCRCapture />;
    case "settings-import":
      return <DataImport />;
    case "settings-preferences":
      return <Preferences />;
    case "uat-dashboard":
      return <AutomatedUAT />;
    default:
      return <Dashboard onNavigate={onNavigate} />;
  }
}

function AuthenticatedApp() {
  const [currentPage, setCurrentPage] = useState<AppPage>("dashboard");
  // Activate cloud sync globally for authenticated users
  useCloudSync();

  return (
    <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      <PageContent page={currentPage} onNavigate={setCurrentPage} />
    </AppLayout>
  );
}

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();

  useEffect(() => {
    seedInitialData();
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">
            Loading GST Manager...
          </p>
        </div>
        <Toaster richColors />
      </div>
    );
  }

  if (!identity) {
    return (
      <LanguageProvider>
        <Login />
        <Toaster richColors />
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      <AuthenticatedApp />
      <Toaster richColors position="top-right" />
    </LanguageProvider>
  );
}
