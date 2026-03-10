import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Wrench, ChevronRight, Package, FileText, Factory, BookOpen, Receipt } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface OperationsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const operationTabs = [
  { id: "producao", label: "Controle de Produção", icon: Factory, route: "/controle-producao", disabled: false },
  { id: "estoque", label: "Controle de Estoque", icon: Package, route: "/operacoes/estoque", disabled: false },
  { id: "fichas", label: "Fichas de Operação", icon: FileText, route: "/operacoes/fichas", disabled: false },
  { id: "diario", label: "Diário de Obra / Serviço", icon: BookOpen, route: "/operacoes/diario", disabled: false },
  { id: "comprovantes", label: "Comprovante de Pagamento", icon: Receipt, route: "/operacoes/comprovantes", disabled: false },
];

export function OperationsPanel({ open, onOpenChange }: OperationsPanelProps) {
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
            <Wrench className="h-4 w-4 text-primary" />
            Operações
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-1 p-3">
          {operationTabs.map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              disabled={tab.disabled}
              onClick={() => handleClick(tab.route)}
              className="justify-between h-10 text-sm font-normal hover:bg-accent"
            >
              <span className="flex items-center gap-2">
                <tab.icon className="h-4 w-4 text-muted-foreground" />
                {tab.label}
              </span>
              {!tab.disabled && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
