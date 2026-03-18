import { useSidebar } from "@/components/ui/sidebar";
import type { AppPage } from "@/types/gst";
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  Menu,
  MessageSquare,
  ShieldCheck,
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
  },
  {
    label: "GST",
    page: "gst-gstr1",
    icon: ShieldCheck,
    ocid: "bottom_nav.gst.link",
  },
  {
    label: "Reports",
    page: "reports-sales",
    icon: BarChart3,
    ocid: "bottom_nav.reports.link",
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
  "reports-sales",
  "ai-assistant",
]);

export function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  const { setOpenMobile } = useSidebar();

  const isMenuActive =
    !DIRECT_NAV_PAGES.has(currentPage) &&
    !currentPage.startsWith("invoicing") &&
    !currentPage.startsWith("gst") &&
    !currentPage.startsWith("reports");

  const btnClass = (isActive: boolean) =>
    `flex flex-shrink-0 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors min-h-[52px] min-w-[64px] touch-manipulation ${
      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-sidebar border-t border-sidebar-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="flex items-stretch overflow-x-auto"
        style={{ touchAction: "pan-x", scrollbarWidth: "none" }}
      >
        {BOTTOM_NAV_ITEMS.map((item) => {
          const isActive =
            currentPage === item.page ||
            (item.page === "invoicing-sales" &&
              currentPage.startsWith("invoicing")) ||
            (item.page === "gst-gstr1" && currentPage.startsWith("gst")) ||
            (item.page === "reports-sales" &&
              currentPage.startsWith("reports"));

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
