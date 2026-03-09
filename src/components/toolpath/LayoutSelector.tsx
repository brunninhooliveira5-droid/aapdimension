import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutGrid, Maximize, Columns, PenTool, Wrench } from "lucide-react";

export type LayoutMode = "default" | "preview" | "cam" | "vectors";

interface LayoutSelectorProps {
  layout: LayoutMode;
  onChange: (layout: LayoutMode) => void;
}

const LAYOUTS: { id: LayoutMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "default", label: "Padrão", icon: <LayoutGrid className="h-3.5 w-3.5" />, desc: "Todos os painéis visíveis" },
  { id: "preview", label: "Preview", icon: <Maximize className="h-3.5 w-3.5" />, desc: "Preview ocupa quase toda a tela" },
  { id: "cam", label: "CAM", icon: <Wrench className="h-3.5 w-3.5" />, desc: "Material + Operações visíveis" },
  { id: "vectors", label: "Vetores", icon: <PenTool className="h-3.5 w-3.5" />, desc: "Ferramentas de desenho ativas" },
];

export function LayoutSelector({ layout, onChange }: LayoutSelectorProps) {
  const active = LAYOUTS.find((l) => l.id === layout) || LAYOUTS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
          {active.icon} Layout
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {LAYOUTS.map((l) => (
          <DropdownMenuItem
            key={l.id}
            onClick={() => onChange(l.id)}
            className={`gap-2 ${layout === l.id ? "bg-accent" : ""}`}
          >
            {l.icon}
            <div>
              <p className="text-xs font-medium">{l.label}</p>
              <p className="text-[10px] text-muted-foreground">{l.desc}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
