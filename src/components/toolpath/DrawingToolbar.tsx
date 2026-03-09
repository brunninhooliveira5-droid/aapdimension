import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  MousePointer2, Minus, Square, Circle, Pentagon, Spline, Type,
  Move, Trash2, Merge, Split, ArrowLeftRight, CornerDownRight,
  Magnet, Grid3X3, RotateCcw, Scissors, ScanSearch, Maximize2
} from "lucide-react";

export type DrawingTool =
  | "select" | "line" | "rectangle" | "circle" | "polygon" | "arc"
  | "text" | "spline" | "move" | "erase";

export type EditAction =
  | "simplify" | "reverse" | "close" | "split" | "join" | "offset"
  | "detect-inner" | "detect-outer" | "break";

interface DrawingToolbarProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  onEditAction: (action: EditAction) => void;
  snapGrid: boolean;
  snapPoints: boolean;
  snapLines: boolean;
  onSnapGridChange: (v: boolean) => void;
  onSnapPointsChange: (v: boolean) => void;
  onSnapLinesChange: (v: boolean) => void;
  hasSelection: boolean;
  isDrawingMode: boolean;
  onDrawingModeChange: (v: boolean) => void;
}

const TOOLS: { id: DrawingTool; icon: React.ReactNode; label: string; shortcut: string }[] = [
  { id: "select", icon: <MousePointer2 className="h-4 w-4" />, label: "Selecionar", shortcut: "V" },
  { id: "line", icon: <Minus className="h-4 w-4" />, label: "Linha", shortcut: "L" },
  { id: "rectangle", icon: <Square className="h-4 w-4" />, label: "Retângulo", shortcut: "R" },
  { id: "circle", icon: <Circle className="h-4 w-4" />, label: "Círculo", shortcut: "C" },
  { id: "polygon", icon: <Pentagon className="h-4 w-4" />, label: "Polígono", shortcut: "P" },
  { id: "arc", icon: <CornerDownRight className="h-4 w-4" />, label: "Arco", shortcut: "A" },
  { id: "text", icon: <Type className="h-4 w-4" />, label: "Texto", shortcut: "T" },
  { id: "spline", icon: <Spline className="h-4 w-4" />, label: "Spline", shortcut: "S" },
  { id: "move", icon: <Move className="h-4 w-4" />, label: "Mover", shortcut: "M" },
  { id: "erase", icon: <Trash2 className="h-4 w-4" />, label: "Apagar", shortcut: "Del" },
];

const EDIT_ACTIONS: { id: EditAction; icon: React.ReactNode; label: string }[] = [
  { id: "simplify", icon: <ScanSearch className="h-3.5 w-3.5" />, label: "Simplificar vetor" },
  { id: "reverse", icon: <ArrowLeftRight className="h-3.5 w-3.5" />, label: "Inverter direção" },
  { id: "close", icon: <Maximize2 className="h-3.5 w-3.5" />, label: "Fechar vetor" },
  { id: "split", icon: <Scissors className="h-3.5 w-3.5" />, label: "Dividir vetor" },
  { id: "join", icon: <Merge className="h-3.5 w-3.5" />, label: "Unir vetores" },
  { id: "break", icon: <Split className="h-3.5 w-3.5" />, label: "Quebrar vetor" },
  { id: "offset", icon: <Maximize2 className="h-3.5 w-3.5" />, label: "Offset de vetor" },
  { id: "detect-inner", icon: <ScanSearch className="h-3.5 w-3.5" />, label: "Detectar internos" },
  { id: "detect-outer", icon: <ScanSearch className="h-3.5 w-3.5" />, label: "Detectar externos" },
];

export function DrawingToolbar({
  activeTool,
  onToolChange,
  onEditAction,
  snapGrid,
  snapPoints,
  snapLines,
  onSnapGridChange,
  onSnapPointsChange,
  onSnapLinesChange,
  hasSelection,
  isDrawingMode,
  onDrawingModeChange,
}: DrawingToolbarProps) {
  // Keyboard shortcuts
  useEffect(() => {
    if (!isDrawingMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toUpperCase();
      const map: Record<string, DrawingTool> = {
        V: "select", L: "line", R: "rectangle", C: "circle",
        P: "polygon", A: "arc", T: "text", S: "spline", M: "move",
      };
      if (key === "DELETE" || key === "BACKSPACE") { onToolChange("erase"); return; }
      if (map[key]) { onToolChange(map[key]); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isDrawingMode, onToolChange]);

  if (!isDrawingMode) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="absolute left-2 top-12 z-20 flex flex-col gap-1 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-1.5 shadow-lg">
        {/* Drawing tools */}
        {TOOLS.map((tool) => (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === tool.id ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => onToolChange(tool.id)}
              >
                {tool.icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {tool.label} <kbd className="ml-1 px-1 py-0.5 bg-muted rounded text-[10px]">{tool.shortcut}</kbd>
            </TooltipContent>
          </Tooltip>
        ))}

        <Separator className="my-1" />

        {/* Editing actions */}
        <div className="space-y-0.5">
          {EDIT_ACTIONS.map((action) => (
            <Tooltip key={action.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={!hasSelection}
                  onClick={() => onEditAction(action.id)}
                >
                  {action.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {action.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Separator className="my-1" />

        {/* Snap controls */}
        <div className="flex flex-col gap-1 px-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onSnapGridChange(!snapGrid)}
                className={`flex items-center gap-1 p-1 rounded text-[10px] ${snapGrid ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent"}`}
              >
                <Grid3X3 className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">Snap ao grid</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onSnapPointsChange(!snapPoints)}
                className={`flex items-center gap-1 p-1 rounded text-[10px] ${snapPoints ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent"}`}
              >
                <Magnet className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">Snap a pontos</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onSnapLinesChange(!snapLines)}
                className={`flex items-center gap-1 p-1 rounded text-[10px] ${snapLines ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent"}`}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">Snap a linhas</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
