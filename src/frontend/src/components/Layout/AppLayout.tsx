import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import type { AppPage } from "@/types/gst";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";

interface AppLayoutProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  children: React.ReactNode;
}

export function AppLayout({
  currentPage,
  onNavigate,
  children,
}: AppLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <AppSidebar currentPage={currentPage} onNavigate={onNavigate} />
      <SidebarInset className="flex flex-col min-h-0">
        <Header currentPage={currentPage} onNavigate={onNavigate} />
        {/* Main content scrolls independently; bottom nav is fixed so we add bottom padding equal to nav height + safe area */}
        <main
          className="flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 sm:p-6 animate-fade-in"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4rem)",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {children}
        </main>
        <BottomNav currentPage={currentPage} onNavigate={onNavigate} />
        <footer className="py-3 px-6 text-center border-t border-border/50 no-print hidden sm:block">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
