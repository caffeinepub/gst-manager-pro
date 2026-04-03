import { useSidebar } from "@/components/ui/sidebar";
import type { AppPage } from "@/types/gst";
import {
  BarChart3,
  BookOpen,
  FileText,
  LayoutDashboard,
  Menu,
  MessageSquare,
  ShieldCheck,
  Users2,
} from "lucide-react";

interface BottomNavProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
}

const BOTTOM_NAV_ITEMS: Array<{
  label: string;
  page: AppPage;
  icon: React.ComponentType<{ className?: string }>;
  ocid: string;
  matchPrefix?: string;
}> = [
  {
    label: "Dashboard",
    page: "dashboard",
    icon: LayoutDashboard,
    ocid: "bottom_nav.dashboard.link",
  },
  {
    label: "Invoices",
    page: "invoicing-sales",
    icon: FileText,
    ocid: "bottom_nav.invoices.link",
    matchPrefix: "invoicing",
  },
  {
    label: "GST",
    page: "gst-gstr1",
    icon: ShieldCheck,
    ocid: "bottom_nav.gst.link",
    matchPrefix: "gst",
  },
  {
    label: "Accounts",
    page: "accounting-cashbook",
    icon: BookOpen,
    ocid: "bottom_nav.accounting.link",
    matchPrefix: "accounting",
  },
  {
    label: "Reports",
    page: "reports-sales",
    icon: BarChart3,
    ocid: "bottom_nav.reports.link",
    matchPrefix: "reports",
  },
  {
    label: "Payroll",
    page: "payroll-employees",
    icon: Users2,
    ocid: "bottom_nav.payroll.link",
    matchPrefix: "payroll",
  },
  {
    label: "AI Chat",
    page: "ai-assistant",
    icon: MessageSquare,
    ocid: "bottom_nav.ai.link",
  },
];

const DIRECT_NAV_PAGES = new Set<AppPage>([
  "dashboard",
  "invoicing-sales",
  "gst-gstr1",
  "accounting-cashbook",
  "reports-sales",
  "payroll-employees",
  "ai-assistant",
]);

export function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  const { setOpenMobile } = useSidebar();

  const isMenuActive =
    !DIRECT_NAV_PAGES.has(currentPage) &&
    !currentPage.startsWith("invoicing") &&
    !currentPage.startsWith("gst") &&
    !currentPage.startsWith("accounting") &&
    !currentPage.startsWith("reports") &&
    !currentPage.startsWith("payroll") &&
    currentPage !== "ai-assistant";

  const btnClass = (isActive: boolean) =>
    `flex flex-shrink-0 flex-col items-center justify-center gap-0.5 py-1.5 text-[9px] font-medium transition-colors min-h-[52px] min-w-[52px] px-1 touch-manipulation ${
      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-sidebar border-t border-sidebar-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Horizontally scrollable, hidden scrollbar, allows vertical scroll on page */}
      <div
        className="flex items-stretch overflow-x-auto"
        style={{
          touchAction: "pan-x pan-y",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {BOTTOM_NAV_ITEMS.map((item) => {
          const isActive =
            currentPage === item.page ||
            (item.matchPrefix
              ? currentPage.startsWith(item.matchPrefix)
              : false);

          return (
            <button
              key={item.page}
              type="button"
              className={btnClass(isActive)}
              onClick={() => onNavigate(item.page)}
              data-ocid={item.ocid}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Menu button — opens the full sidebar drawer for all other sections */}
        <button
          type="button"
          className={btnClass(isMenuActive)}
          onClick={() => setOpenMobile(true)}
          data-ocid="bottom_nav.menu.button"
        >
          <Menu className="w-5 h-5" />
          <span>Menu</span>
        </button>
      </div>
    </nav>
  );
}
