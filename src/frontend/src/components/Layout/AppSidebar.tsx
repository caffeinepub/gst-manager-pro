import { BusinessHeader } from "@/components/BusinessHeader/BusinessHeader";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useUserProfile } from "@/hooks/useQueries";
import type { AppPage } from "@/types/gst";
import {
  Banknote,
  BarChart3,
  BookMarked,
  BookOpen,
  Building2,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Database,
  FileMinus,
  FilePlus,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  History,
  Landmark,
  LayoutDashboard,
  MessageSquare,
  Package,
  PiggyBank,
  Receipt,
  ReceiptText,
  RefreshCw,
  Scale,
  ScanLine,
  Settings,
  Settings2,
  Shield,
  ShieldCheck,
  Sliders,
  TrendingUp,
  Truck,
  Upload,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";

interface AppSidebarProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
}

interface NavItem {
  label: string;
  page?: AppPage;
  icon: React.ComponentType<{ className?: string }>;
  children?: {
    label: string;
    page: AppPage;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", page: "dashboard", icon: LayoutDashboard },
  {
    label: "Masters",
    icon: Settings,
    children: [
      { label: "Business Profile", page: "masters-profile", icon: Building2 },
      { label: "Parties", page: "masters-parties", icon: Users },
      { label: "Items & Services", page: "masters-items", icon: Package },
      { label: "Tax Rates", page: "masters-taxrates", icon: ReceiptText },
    ],
  },
  {
    label: "Invoicing",
    icon: FileText,
    children: [
      { label: "Sales Invoices", page: "invoicing-sales", icon: Receipt },
      {
        label: "Service Invoices",
        page: "invoicing-service",
        icon: BookMarked,
      },
      { label: "e-Invoice", page: "invoicing-einvoice", icon: FileSpreadsheet },
      { label: "Quotations", page: "invoicing-quotations", icon: FileText },
      {
        label: "Proforma Invoices",
        page: "invoicing-proforma",
        icon: FileSpreadsheet,
      },
      { label: "e-Way Bill", page: "invoicing-eway-bill", icon: Truck },
      {
        label: "Bill of Supply",
        page: "invoicing-bill-of-supply",
        icon: FileText,
      },
      {
        label: "Credit Notes",
        page: "invoicing-credit-notes",
        icon: FileMinus,
      },
      { label: "Debit Notes", page: "invoicing-debit-notes", icon: FilePlus },
      {
        label: "Delivery Challans",
        page: "invoicing-delivery-challans",
        icon: Truck,
      },
      { label: "All Invoices", page: "invoicing-all", icon: ClipboardList },
      { label: "Payments", page: "invoicing-payments", icon: CreditCard },
    ],
  },
  {
    label: "Accounting",
    icon: BookOpen,
    children: [
      { label: "Purchases", page: "accounting-purchases", icon: Package },
      { label: "Journal Entries", page: "accounting-journal", icon: BookOpen },
      { label: "Bank Accounts", page: "accounting-bank", icon: Landmark },
      { label: "Cash Book", page: "accounting-cashbook", icon: Banknote },
      {
        label: "Bank Reconciliation",
        page: "accounting-reconciliation",
        icon: RefreshCw,
      },
      {
        label: "Chart of Accounts",
        page: "accounting-chart-of-accounts",
        icon: BookMarked,
      },
    ],
  },
  {
    label: "Inventory",
    icon: Package,
    children: [
      { label: "Inventory ERP", page: "inventory-erp", icon: BarChart3 },
    ],
  },
  {
    label: "GST Compliance",
    icon: ShieldCheck,
    children: [
      { label: "GSTR-1", page: "gst-gstr1", icon: FileSpreadsheet },
      { label: "GSTR-3B", page: "gst-gstr3b", icon: ClipboardList },
      { label: "ITC Reconciliation", page: "gst-itc", icon: RefreshCw },
      { label: "RCM Tracker", page: "gst-rcm", icon: PiggyBank },
      { label: "Audit Trail", page: "gst-audit", icon: History },
    ],
  },
  {
    label: "Reports",
    icon: BarChart3,
    children: [
      { label: "Sales Register", page: "reports-sales", icon: TrendingUp },
      { label: "Purchase Register", page: "reports-purchase", icon: Package },
      { label: "GST Summary", page: "reports-gst-summary", icon: ReceiptText },
      { label: "AR Ageing", page: "reports-ar-ageing", icon: Users },
      { label: "AP Ageing", page: "reports-ap-ageing", icon: Building2 },
      { label: "Trial Balance", page: "reports-trial-balance", icon: Scale },
      { label: "P&L Statement", page: "reports-pl", icon: BarChart3 },
      { label: "Balance Sheet", page: "reports-balance-sheet", icon: Landmark },
      { label: "Stock Summary", page: "reports-stock", icon: Package },
      { label: "Cash Flow", page: "reports-cashflow", icon: TrendingUp },
    ],
  },
  { label: "AI Tax Assistant", page: "ai-assistant", icon: MessageSquare },
  {
    label: "Settings",
    icon: Settings2,
    children: [
      { label: "API Configuration", page: "settings-api-config", icon: Shield },
      { label: "Workflow Automation", page: "workflow-automation", icon: Zap },
      { label: "OCR Capture", page: "settings-ocr", icon: ScanLine },
      { label: "Import Data", page: "settings-import", icon: Upload },
      { label: "Backup & Restore", page: "backup-restore", icon: Database },
      { label: "Preferences", page: "settings-preferences", icon: Sliders },
      { label: "UAT Dashboard", page: "uat-dashboard", icon: FlaskConical },
    ],
  },
];

export function AppSidebar({ currentPage, onNavigate }: AppSidebarProps) {
  const { clear, identity } = useInternetIdentity();
  const { data: userProfile } = useUserProfile();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const { isMobile, setOpenMobile } = useSidebar();

  const toggleSection = (label: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const isActive = (page?: AppPage) => page === currentPage;
  const hasActiveChild = (item: NavItem) =>
    item.children?.some((child) => child.page === currentPage) ?? false;

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <BusinessHeader variant="sidebar" />
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                if (!item.children) {
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        isActive={isActive(item.page)}
                        onClick={() => {
                          if (item.page) {
                            onNavigate(item.page);
                            if (isMobile) setOpenMobile(false);
                          }
                        }}
                        tooltip={item.label}
                        data-ocid={`nav.${item.label.toLowerCase().replace(/\s+/g, "-")}.link`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <Collapsible
                    key={item.label}
                    open={openSections.has(item.label) || hasActiveChild(item)}
                    onOpenChange={() => toggleSection(item.label)}
                    asChild
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.label}
                          className={hasActiveChild(item) ? "text-primary" : ""}
                          data-ocid={`nav.${item.label.toLowerCase().replace(/\s+/g, "-")}.link`}
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.label}</span>
                          <ChevronDown
                            className={`ml-auto w-3 h-3 transition-transform ${
                              openSections.has(item.label) ||
                              hasActiveChild(item)
                                ? "rotate-0"
                                : "-rotate-90"
                            }`}
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.children.map((child) => (
                            <SidebarMenuSubItem key={child.page}>
                              <SidebarMenuSubButton
                                isActive={isActive(child.page)}
                                onClick={() => {
                                  onNavigate(child.page);
                                  if (isMobile) setOpenMobile(false);
                                }}
                                data-ocid={`nav.${child.page.replace(/-/g, "_")}.link`}
                              >
                                <child.icon className="w-3 h-3" />
                                <span>{child.label}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => void clear()}
              className="text-muted-foreground hover:text-destructive"
              tooltip="Logout"
              data-ocid="nav.logout.button"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-label="Logout"
              >
                <title>Logout</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="text-xs">
                {userProfile?.name ||
                  identity?.getPrincipal().toString().slice(0, 12) ||
                  "User"}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
