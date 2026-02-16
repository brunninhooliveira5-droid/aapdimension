import { useState } from "react";
import { FinanceDashboard } from "@/components/financeiro/FinanceDashboard";
import { AccountsPayable } from "@/components/financeiro/AccountsPayable";
import { AccountsReceivable } from "@/components/financeiro/AccountsReceivable";
import { CashFlow } from "@/components/financeiro/CashFlow";
import Financial from "@/pages/Financial";
import { FinanceReports } from "@/components/financeiro/FinanceReports";
import { FinanceCategories } from "@/components/financeiro/FinanceCategories";
import { LegalModule } from "@/components/financeiro/LegalModule";
import { DebtsModule } from "@/components/financeiro/DebtsModule";
import { DecisionSimulator } from "@/components/financeiro/DecisionSimulator";
import {
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  FileBarChart,
  Tags,
  Scale,
  CreditCard,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
const sections = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "payable", label: "Contas a Pagar", icon: ArrowDownCircle },
  { id: "receivable", label: "Contas a Receber", icon: ArrowUpCircle },
  { id: "cashflow", label: "Fluxo de Caixa", icon: Wallet },
  { id: "boletos", label: "Boletos", icon: Receipt },
  { id: "reports", label: "Relatórios", icon: FileBarChart },
  { id: "categories", label: "Categorias", icon: Tags },
  { id: "legal", label: "Jurídico", icon: Scale },
  { id: "debts", label: "Dívidas", icon: CreditCard },
  { id: "simulator", label: "Simulador", icon: Calculator },
] as const;

type SectionId = (typeof sections)[number]["id"];

export default function GestaoFinanceiraPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  const activeLabel = sections.find((s) => s.id === activeSection)?.label ?? "";

  const handleNavigate = (id: string) => {
    setActiveSection(id as SectionId);
    if (isMobile) setMobileOpen(false);
  };

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <FinanceDashboard onNavigate={handleNavigate} />;
      case "payable":
        return <AccountsPayable />;
      case "receivable":
        return <AccountsReceivable />;
      case "cashflow":
        return <CashFlow />;
      case "boletos":
        return <Financial />;
      case "reports":
        return <FinanceReports />;
      case "categories":
        return <FinanceCategories />;
      case "legal":
        return <LegalModule />;
      case "debts":
        return <DebtsModule />;
      case "simulator":
        return <DecisionSimulator />;
      default:
        return null;
    }
  };

  const navContent = (
    <nav className="flex-1 py-2 space-y-0.5 px-2 overflow-y-auto">
      {sections.map((section) => {
        const isActive = activeSection === section.id;
        return (
          <button
            key={section.id}
            onClick={() => handleNavigate(section.id)}
            title={!isMobile && collapsed ? section.label : undefined}
            className={cn(
              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
              isActive
                ? "bg-primary/15 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <section.icon className={cn("w-4 h-4 shrink-0", isActive && "text-primary")} />
            <span className="truncate">{section.label}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="flex gap-0 animate-fade-in min-h-[calc(100vh-4rem)]">
      {/* Mobile: hamburger + sheet */}
      {isMobile && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-56 p-0 pt-4">
            <SheetTitle className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Financeiro
            </SheetTitle>
            {navContent}
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop: persistent sidebar */}
      {!isMobile && (
        <aside
          className={cn(
            "shrink-0 border-r border-border bg-card/50 flex flex-col transition-all duration-200",
            collapsed ? "w-14" : "w-52"
          )}
        >
          <div className="flex items-center justify-between px-3 py-3 border-b border-border">
            {!collapsed && (
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Financeiro
              </h2>
            )}
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="p-1 rounded-md hover:bg-accent text-muted-foreground transition-colors ml-auto"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          <nav className="flex-1 py-2 space-y-0.5 px-2 overflow-y-auto">
            {sections.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  title={collapsed ? section.label : undefined}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-primary/15 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <section.icon className={cn("w-4 h-4 shrink-0", isActive && "text-primary")} />
                  {!collapsed && <span className="truncate">{section.label}</span>}
                </button>
              );
            })}
          </nav>
        </aside>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 p-4 md:p-6 overflow-y-auto">
        {isMobile && (
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-md hover:bg-accent text-muted-foreground transition-colors shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            {activeSection !== "dashboard" && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <button onClick={() => setActiveSection("dashboard")} className="hover:text-foreground transition-colors">
                  Dashboard
                </button>
                <ChevronRight className="w-3 h-3" />
                <span className="text-foreground font-medium truncate">{activeLabel}</span>
              </div>
            )}
          </div>
        )}
        {!isMobile && activeSection !== "dashboard" && (
          <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
            <button onClick={() => setActiveSection("dashboard")} className="hover:text-foreground transition-colors">
              Dashboard
            </button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">{activeLabel}</span>
          </div>
        )}
        {activeSection !== "dashboard" && (
          <h1 className="text-lg font-bold text-foreground mb-4">{activeLabel}</h1>
        )}
        {renderContent()}
      </main>
    </div>
  );
}