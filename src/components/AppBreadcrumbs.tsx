import { useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const routeLabels: Record<string, string> = {
  "/": "Home",
  "/maquinas": "Minhas Máquinas",
  "/suporte": "Suporte",
  "/manutencao": "Manutenção",
  "/equipamentos": "Equipamentos Dimension",
  "/pecas": "Peças e Acessórios",
  "/gestao-financeira": "Financeiro",
  "/boletos": "Boletos",
  "/configuracoes": "Configurações",
  "/usuarios": "Usuários",
  "/boletins": "Boletins Técnicos",
  "/orcamento": "Orçamento de Corte",
  "/arquivos": "Arquivos",
};

interface AppBreadcrumbsProps {
  /** Extra crumbs to append after the route-level breadcrumb */
  extra?: { label: string; onClick?: () => void }[];
  className?: string;
}

export function AppBreadcrumbs({ extra, className }: AppBreadcrumbsProps) {
  const location = useLocation();
  const pathname = location.pathname;

  // Find the matching route label
  const matchedRoute = Object.keys(routeLabels)
    .filter((r) => r !== "/")
    .find((r) => pathname.startsWith(r));

  const crumbs: { label: string; onClick?: () => void; isHome?: boolean }[] = [
    { label: "Home", isHome: true },
  ];

  if (matchedRoute) {
    crumbs.push({ label: routeLabels[matchedRoute] });
  }

  if (extra) {
    crumbs.push(...extra);
  }

  return (
    <nav className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="w-3 h-3 shrink-0" />}
          {crumb.isHome ? (
            <Home className="w-3 h-3 shrink-0" />
          ) : crumb.onClick ? (
            <button
              onClick={crumb.onClick}
              className="hover:text-foreground transition-colors truncate max-w-[120px] md:max-w-none"
            >
              {crumb.label}
            </button>
          ) : i === crumbs.length - 1 ? (
            <span className="text-foreground font-medium truncate max-w-[120px] md:max-w-none">
              {crumb.label}
            </span>
          ) : (
            <span className="truncate max-w-[120px] md:max-w-none">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
