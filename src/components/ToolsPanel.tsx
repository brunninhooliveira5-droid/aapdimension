import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Hammer, ChevronRight, Calculator, LayoutGrid, Box, PackageOpen, PanelTop, Route, FlaskConical, Lock, Grid3x3, Layers, Crosshair } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ToolsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const productionTools = [
  { id: "orcamento", label: "Orçamento de Corte", icon: Calculator, route: "/orcamento", sectionKey: "orcamento" },
  { id: "plano-corte", label: "Plano de Corte", icon: LayoutGrid, route: "/plano-corte", sectionKey: "ferr_plano_corte" },
  { id: "mapeamento-z", label: "Nivelamento Automático", icon: Grid3x3, route: "/mapeamento-z", sectionKey: "ferr_mapeamento_z" },
  { id: "mapa-usinagem", label: "Mapa por Usinagem", icon: Layers, route: "/mapa-usinagem", sectionKey: "ferr_mapeamento_z" },
];

const labTools = [
  { id: "slicer-3d", label: "Slicer 3D CNC", icon: Box, route: "/slicer-3d", sectionKey: "ferr_slicer_3d" },
  { id: "gerador-caixas", label: "Gerador de Caixas CNC / Laser", icon: PackageOpen, route: "/gerador-caixas", sectionKey: "ferr_gerador_caixas" },
  { id: "planificador-acm", label: "Planificador ACM", icon: PanelTop, route: "/planificador-acm", sectionKey: "ferr_planificador_acm" },
  { id: "gerador-percurso", label: "Gerador de Percurso", icon: Route, route: "/gerador-percurso", sectionKey: "ferr_gerador_percurso" },
];

function ToolButton({ tab, onClick }: { tab: typeof productionTools[0]; onClick: (route: string) => void }) {
  const { getSectionVisibility } = useAuth();
  const visibility = getSectionVisibility(tab.sectionKey);

  if (visibility === "hidden") return null;

  if (visibility === "locked") {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              disabled
              className="justify-between h-10 text-sm font-normal opacity-50 cursor-not-allowed w-full"
            >
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                {tab.label}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Acesso bloqueado pelo administrador
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      variant="ghost"
      onClick={() => onClick(tab.route)}
      className="justify-between h-10 text-sm font-normal hover:bg-accent w-full"
    >
      <span className="flex items-center gap-2">
        <tab.icon className="h-4 w-4 text-muted-foreground" />
        {tab.label}
      </span>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
    </Button>
  );
}

export function ToolsPanel({ open, onOpenChange }: ToolsPanelProps) {
  const navigate = useNavigate();

  const handleClick = (route: string) => {
    navigate(route);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 sm:w-80 p-0 border-r border-border">
        <SheetHeader className="px-4 py-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Hammer className="h-4 w-4 text-primary" />
            Ferramentas
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-1 p-3">
          {/* Production tools */}
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">Produção</p>
          {productionTools.map((tab) => (
            <ToolButton key={tab.id} tab={tab} onClick={handleClick} />
          ))}

          <Separator className="my-2" />

          {/* Lab / Beta tools */}
          <div className="flex items-center gap-2 px-2 mb-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Laboratório</p>
            <Badge variant="outline" className="text-[8px] h-4 px-1.5 border-amber-500/50 text-amber-500 bg-amber-500/10 gap-0.5">
              <FlaskConical className="h-2.5 w-2.5" /> Em desenvolvimento
            </Badge>
          </div>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-1">
            {labTools.map((tab) => (
              <ToolButton key={tab.id} tab={tab} onClick={handleClick} />
            ))}
          </div>

          <p className="text-[9px] text-muted-foreground px-2 mt-1">
            Estas ferramentas estão em fase de desenvolvimento e podem sofrer alterações.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
