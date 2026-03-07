import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { AppPage } from "@/types/gst";
import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
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
  const [_open, setOpen] = useState(true);

  return (
    <SidebarProvider defaultOpen={true} onOpenChange={setOpen}>
      <AppSidebar currentPage={currentPage} onNavigate={onNavigate} />
      <SidebarInset>
        <Header currentPage={currentPage} onNavigate={onNavigate} />
        <main className="flex-1 overflow-auto p-6 animate-fade-in">
          {children}
        </main>
        <footer className="py-3 px-6 text-center border-t border-border/50 no-print">
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
