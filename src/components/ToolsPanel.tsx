import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Hammer, ChevronRight } from "lucide-react";

interface ToolsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const toolTabs = [
  { id: "tool1", label: "Em breve…", icon: Hammer, disabled: true },
];

export function ToolsPanel({ open, onOpenChange }: ToolsPanelProps) {
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
              className="justify-between h-10 text-sm font-normal hover:bg-accent"
            >
              <span className="flex items-center gap-2">
                <tab.icon className="h-4 w-4 text-muted-foreground" />
                {tab.label}
              </span>
              {!tab.disabled && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            </Button>
          ))}

          <p className="text-[11px] text-muted-foreground text-center mt-4 px-2">
            Novas ferramentas serão adicionadas aqui.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
