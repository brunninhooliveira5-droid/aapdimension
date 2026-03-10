import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Wrench, ChevronRight, Package, FileText, Factory, BookOpen, Receipt, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface OperationsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const operationTabs = [
  { id: "producao", label: "Controle de Produção", icon: Factory, route: "/controle-producao", sectionKey: "controle_producao" },
  { id: "estoque", label: "Controle de Estoque", icon: Package, route: "/operacoes/estoque", sectionKey: "op_estoque" },
  { id: "fichas", label: "Fichas de Operação", icon: FileText, route: "/operacoes/fichas", sectionKey: "op_fichas" },
  { id: "diario", label: "Diário de Obra / Serviço", icon: BookOpen, route: "/operacoes/diario", sectionKey: "op_diario" },
  { id: "comprovantes", label: "Comprovante de Pagamento", icon: Receipt, route: "/operacoes/comprovantes", sectionKey: "op_comprovantes" },
];

export function OperationsPanel({ open, onOpenChange }: OperationsPanelProps) {
  const navigate = useNavigate();
  const { getSectionVisibility } = useAuth();

  const handleClick = (route: string) => {
    navigate(route);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 sm:w-80 p-0 border-r border-border">
        <SheetHeader className="px-4 py-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-4 w-4 text-primary" />
            Operações
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-1 p-3">
          {operationTabs.map((tab) => {
            const visibility = getSectionVisibility(tab.sectionKey);
            if (visibility === "hidden") return null;

            if (visibility === "locked") {
              return (
                <TooltipProvider key={tab.id} delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        disabled
                        className="justify-between h-10 text-sm font-normal opacity-50 cursor-not-allowed"
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
                key={tab.id}
                variant="ghost"
                onClick={() => handleClick(tab.route)}
                className="justify-between h-10 text-sm font-normal hover:bg-accent"
              >
                <span className="flex items-center gap-2">
                  <tab.icon className="h-4 w-4 text-muted-foreground" />
                  {tab.label}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
