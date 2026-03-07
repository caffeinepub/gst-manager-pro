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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
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
  FileMinus,
  FilePlus,
  FileSpreadsheet,
  FileText,
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
  Settings,
  ShieldCheck,
  TrendingUp,
  Truck,
  Users,
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
  {
    label: "Dashboard",
    page: "dashboard",
    icon: LayoutDashboard,
  },
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
      { label: "Quotations", page: "invoicing-quotations", icon: FileText },
      {
        label: "Proforma Invoices",
        page: "invoicing-proforma",
        icon: FileSpreadsheet,
      },
      {
        label: "Credit Notes",
        page: "invoicing-credit-notes",
        icon: FileMinus,
      },
      { label: "Debit Notes", page: "invoicing-debit-notes", icon: FilePlus },
      {
        label: "Bill of Supply",
        page: "invoicing-bill-of-supply",
        icon: FileText,
      },
      {
        label: "Delivery Challans",
        page: "invoicing-delivery-challans",
        icon: Truck,
      },
      { label: "Payments", page: "invoicing-payments", icon: CreditCard },
    ],
  },
  {
    label: "Accounting",
    icon: BookOpen,
    children: [
      {
        label: "Purchases",
        page: "accounting-purchases",
        icon: ShoppingCartIcon,
      },
      { label: "Journal Entries", page: "accounting-journal", icon: BookOpen },
      { label: "Bank Accounts", page: "accounting-bank", icon: Landmark },
      {
        label: "Cash Book / Transactions",
        page: "accounting-cashbook",
        icon: Banknote,
      },
      {
        label: "Chart of Accounts",
        page: "accounting-chart-of-accounts" as AppPage,
        icon: BookMarked,
      },
      {
        label: "Bank Reconciliation",
        page: "accounting-reconciliation" as AppPage,
        icon: RefreshCw,
      },
    ],
  },
  {
    label: "Inventory",
    icon: Package,
    children: [
      {
        label: "Inventory ERP",
        page: "inventory-erp" as AppPage,
        icon: BarChart3,
      },
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
      {
        label: "Purchase Register",
        page: "reports-purchase",
        icon: ShoppingCartIcon,
      },
      { label: "GST Summary", page: "reports-gst-summary", icon: ReceiptText },
      { label: "AR Ageing", page: "reports-ar-ageing", icon: Users },
      { label: "AP Ageing", page: "reports-ap-ageing", icon: Building2 },
      { label: "Trial Balance", page: "reports-trial-balance", icon: Scale },
      { label: "P&L Statement", page: "reports-pl", icon: BarChart3 },
      { label: "Balance Sheet", page: "reports-balance-sheet", icon: Landmark },
      {
        label: "Stock Summary",
        page: "reports-stock" as AppPage,
        icon: Package,
      },
      {
        label: "Cash Flow",
        page: "reports-cashflow" as AppPage,
        icon: TrendingUp,
      },
    ],
  },
  {
    label: "AI Tax Assistant",
    page: "ai-assistant",
    icon: MessageSquare,
  },
];

function ShoppingCartIcon({ className }: { className?: string }) {
  return <Package className={className} />;
}

export function AppSidebar({ currentPage, onNavigate }: AppSidebarProps) {
  const { clear, identity } = useInternetIdentity();
  const { data: userProfile } = useUserProfile();
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(["Masters", "Invoicing", "Accounting", "GST Compliance"]),
  );

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
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="overflow-hidden">
            <p className="font-cabinet font-bold text-sm text-sidebar-foreground truncate">
              GST Manager
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Enterprise Suite
            </p>
          </div>
        </div>
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
                        onClick={() => item.page && onNavigate(item.page)}
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
                                onClick={() => onNavigate(child.page)}
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
