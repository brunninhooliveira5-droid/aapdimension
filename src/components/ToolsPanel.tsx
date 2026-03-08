import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Hammer, ChevronRight, Calculator, LayoutGrid } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ToolsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const toolTabs = [
  { id: "orcamento", label: "Orçamento de Corte", icon: Calculator, route: "/orcamento", disabled: false },
  { id: "plano-corte", label: "Plano de Corte", icon: LayoutGrid, route: "/plano-corte", disabled: false },
];

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
          {toolTabs.map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              disabled={tab.disabled}
              onClick={() => !tab.disabled && handleClick(tab.route)}
              className="justify-between h-10 text-sm font-normal hover:bg-accent"
            >
              <span className="flex items-center gap-2">
                <tab.icon className="h-4 w-4 text-muted-foreground" />
                {tab.label}
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
