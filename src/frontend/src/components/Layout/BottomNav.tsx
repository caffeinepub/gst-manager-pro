import type { AppPage } from "@/types/gst";
import {
  BarChart3,
  FileText,
  LayoutDashboard,
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

export function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-sidebar border-t border-sidebar-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch">
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
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors min-h-[52px] touch-manipulation ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => onNavigate(item.page)}
              data-ocid={item.ocid}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
