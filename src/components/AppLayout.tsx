import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import { Outlet } from "react-router-dom";
import { CalculatorProvider } from "@/contexts/CalculatorContext";
import { CalculatorWidget } from "@/components/CalculatorWidget";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { useImpersonation } from "@/contexts/ImpersonationContext";

export function AppLayout() {
  const { isImpersonating } = useImpersonation();

  return (
    <CalculatorProvider>
      <SidebarProvider>
        <ImpersonationBanner />
        <div className={`min-h-screen flex w-full ${isImpersonating ? "pt-10" : ""}`}>
          <AppSidebar />
          <main className="flex-1 flex flex-col min-w-0">
            <header className="h-14 flex items-center gap-3 border-b border-border px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground shrink-0" />
              <AppBreadcrumbs />
            </header>
            <div className="flex-1 p-4 md:p-6 overflow-auto">
              <Outlet />
            </div>
          </main>
        </div>
        <CalculatorWidget />
      </SidebarProvider>
    </CalculatorProvider>
  );
}
