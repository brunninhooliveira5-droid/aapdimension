import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Plus, Trash2, ChevronDown, Layers, Sparkles, Settings2,
  CircleDot, Waves, Wind, Target
} from "lucide-react";
import { toast } from "sonner";
import {
  type Operation3D,
  type Roughing3DOperation,
  type Finishing3DOperation,
  type Tool3D,
  type Roughing3DStrategy,
  type Finishing3DStrategy,
} from "@/lib/toolpath-3d-engine";

interface Operation3DPanelProps {
  operations: Operation3D[];
  tools: Tool3D[];
  onOperationsChange: (operations: Operation3D[]) => void;
  activeOperationId: string | null;
  onSetActiveOperation: (id: string | null) => void;
}

const ROUGHING_STRATEGIES: { value: Roughing3DStrategy; label: string; icon: React.ReactNode }[] = [
  { value: "raster", label: "Raster", icon: <Layers className="h-3 w-3" /> },
  { value: "offset", label: "Offset", icon: <CircleDot className="h-3 w-3" /> },
  { value: "adaptive", label: "Adaptive", icon: <Sparkles className="h-3 w-3" /> },
  { value: "z-level", label: "Z-Level", icon: <Layers className="h-3 w-3" /> },
];

const FINISHING_STRATEGIES: { value: Finishing3DStrategy; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "raster", label: "Raster", icon: <Layers className="h-3 w-3" />, description: "Linhas paralelas" },
  { value: "parallel", label: "Parallel", icon: <Wind className="h-3 w-3" />, description: "Superfícies inclinadas" },
  { value: "waterline", label: "Waterline", icon: <Waves className="h-3 w-3" />, description: "Paredes verticais" },
  { value: "spiral", label: "Spiral", icon: <CircleDot className="h-3 w-3" />, description: "Relevos circulares" },
  { value: "pencil", label: "Pencil", icon: <Target className="h-3 w-3" />, description: "Cantos internos" },
];

export function Operation3DPanel({
  operations,
  tools,
  onOperationsChange,
  activeOperationId,
  onSetActiveOperation,
}: Operation3DPanelProps) {
  const [expandedOps, setExpandedOps] = useState<Set<string>>(new Set());
  
  const toggleExpanded = useCallback((id: string) => {
    setExpandedOps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  
  const addRoughingOperation = useCallback(() => {
    const defaultTool = tools.find((t) => t.type === "flat-end") || tools[0];
    if (!defaultTool) {
      toast.error("Adicione uma ferramenta primeiro");
      return;
    }
    
    const newOp: Roughing3DOperation = {
      id: `rough-${Date.now()}`,
      name: `Desbaste ${operations.filter((o) => o.type === "roughing-3d").length + 1}`,
      type: "roughing-3d",
      strategy: "adaptive",
      toolId: defaultTool.id,
      stepDown: defaultTool.stepDown,
      stepOver: defaultTool.stepOver,
      stockToLeave: 0.5,
      feedRate: defaultTool.feedRate,
      plungeRate: defaultTool.plungeRate,
      spindleSpeed: defaultTool.spindleSpeed,
      enabled: true,
    };
    
    onOperationsChange([...operations, newOp]);
    setExpandedOps((prev) => new Set(prev).add(newOp.id));
    onSetActiveOperation(newOp.id);
    toast.success("Operação de desbaste adicionada");
  }, [operations, tools, onOperationsChange, onSetActiveOperation]);
  
  const addFinishingOperation = useCallback((strategy: Finishing3DStrategy) => {
    const defaultTool = tools.find((t) => t.type === "ball-nose") || tools[0];
    if (!defaultTool) {
      toast.error("Adicione uma ferramenta primeiro");
      return;
    }
    
    const strategyLabel = FINISHING_STRATEGIES.find((s) => s.value === strategy)?.label || strategy;
    
    const newOp: Finishing3DOperation = {
      id: `finish-${strategy}-${Date.now()}`,
      name: `Acabamento ${strategyLabel}`,
      type: "finishing-3d",
      strategy,
      toolId: defaultTool.id,
      stepOver: defaultTool.stepOver,
      feedRate: defaultTool.feedRate,
      plungeRate: defaultTool.plungeRate,
      spindleSpeed: defaultTool.spindleSpeed,
      tolerance: 0.01,
      waterlineStepDown: strategy === "waterline" ? 0.5 : undefined,
      enabled: true,
    };
    
    onOperationsChange([...operations, newOp]);
    setExpandedOps((prev) => new Set(prev).add(newOp.id));
    onSetActiveOperation(newOp.id);
    toast.success(`Acabamento ${strategyLabel} adicionado`);
  }, [operations, tools, onOperationsChange, onSetActiveOperation]);
  
  const updateOperation = useCallback((id: string, updates: Partial<Operation3D>) => {
    onOperationsChange(
      operations.map((op) => (op.id === id ? { ...op, ...updates } : op))
    );
  }, [operations, onOperationsChange]);
  
  const deleteOperation = useCallback((id: string) => {
    onOperationsChange(operations.filter((op) => op.id !== id));
    if (activeOperationId === id) onSetActiveOperation(null);
    toast.success("Operação removida");
  }, [operations, onOperationsChange, activeOperationId, onSetActiveOperation]);
  
  const moveOperation = useCallback((id: string, direction: "up" | "down") => {
    const idx = operations.findIndex((op) => op.id === id);
    if (idx === -1) return;
    
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= operations.length) return;
    
    const newOps = [...operations];
    [newOps[idx], newOps[newIdx]] = [newOps[newIdx], newOps[idx]];
    onOperationsChange(newOps);
  }, [operations, onOperationsChange]);
  
  return (
    <Card className="border-border">
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle className="text-xs flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Settings2 className="h-3 w-3 text-primary" />
            Operações 3D
          </span>
          <Badge variant="outline" className="text-[8px] h-4">
            {operations.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-2 space-y-2">
        {/* Add buttons */}
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="flex-1 h-7 text-[9px] gap-1" onClick={addRoughingOperation}>
            <Plus className="h-3 w-3" /> Desbaste
          </Button>
          <Select onValueChange={(v) => addFinishingOperation(v as Finishing3DStrategy)}>
            <SelectTrigger className="flex-1 h-7 text-[9px]">
              <span className="flex items-center gap-1">
                <Plus className="h-3 w-3" /> Acabamento
              </span>
            </SelectTrigger>
            <SelectContent>
              {FINISHING_STRATEGIES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  <div className="flex items-center gap-2">
                    {s.icon}
                    <div>
                      <div className="text-xs">{s.label}</div>
                      <div className="text-[9px] text-muted-foreground">{s.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Separator />
        
        {/* Operations list */}
        <ScrollArea className="h-[300px]">
          <div className="space-y-1.5">
            {operations.length === 0 ? (
              <div className="text-center text-[10px] text-muted-foreground py-8">
                Nenhuma operação. Clique em + para adicionar.
              </div>
            ) : (
              operations.map((op, idx) => (
                <Collapsible
                  key={op.id}
                  open={expandedOps.has(op.id)}
                  onOpenChange={() => toggleExpanded(op.id)}
                >
                  <div
                    className={`rounded-md border transition-colors ${
                      activeOperationId === op.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <CollapsibleTrigger asChild>
                      <div
                        className="flex items-center gap-2 p-2 cursor-pointer"
                        onClick={() => onSetActiveOperation(op.id)}
                      >
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <Switch
                            checked={op.enabled}
                            onCheckedChange={(checked) => updateOperation(op.id, { enabled: checked })}
                            onClick={(e) => e.stopPropagation()}
                            className="scale-75"
                          />
                          <Badge
                            variant={op.type === "roughing-3d" ? "default" : "secondary"}
                            className="text-[8px] h-4 shrink-0"
                          >
                            {op.type === "roughing-3d" ? "DES" : "ACA"}
                          </Badge>
                          <span className="text-[10px] font-medium truncate">{op.name}</span>
                        </div>
                        <ChevronDown className={`h-3 w-3 transition-transform ${expandedOps.has(op.id) ? "rotate-180" : ""}`} />
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="px-2 pb-2 space-y-2">
                        <Separator />
                        
                        {/* Name */}
                        <div>
                          <Label className="text-[9px]">Nome</Label>
                          <Input
                            value={op.name}
                            onChange={(e) => updateOperation(op.id, { name: e.target.value })}
                            className="h-6 text-[10px]"
                          />
                        </div>
                        
                        {/* Strategy (for roughing) */}
                        {op.type === "roughing-3d" && (
                          <div>
                            <Label className="text-[9px]">Estratégia</Label>
                            <Select
                              value={(op as Roughing3DOperation).strategy}
                              onValueChange={(v) => updateOperation(op.id, { strategy: v as Roughing3DStrategy })}
                            >
                              <SelectTrigger className="h-6 text-[10px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROUGHING_STRATEGIES.map((s) => (
                                  <SelectItem key={s.value} value={s.value}>
                                    <span className="flex items-center gap-1.5">
                                      {s.icon} {s.label}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        
                        {/* Tool */}
                        <div>
                          <Label className="text-[9px]">Ferramenta</Label>
                          <Select
                            value={op.toolId}
                            onValueChange={(v) => updateOperation(op.id, { toolId: v })}
                          >
                            <SelectTrigger className="h-6 text-[10px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {tools.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name} (Ø{t.diameter}mm)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Parameters grid */}
                        <div className="grid grid-cols-2 gap-1.5">
                          {op.type === "roughing-3d" && (
                            <>
                              <div>
                                <Label className="text-[8px]">Step-down</Label>
                                <Input
                                  type="number"
                                  value={(op as Roughing3DOperation).stepDown}
                                  onChange={(e) => updateOperation(op.id, { stepDown: parseFloat(e.target.value) || 0 })}
                                  className="h-6 text-[10px]"
                                  step="0.1"
                                />
                              </div>
                              <div>
                                <Label className="text-[8px]">Sobremetal</Label>
                                <Input
                                  type="number"
                                  value={(op as Roughing3DOperation).stockToLeave}
                                  onChange={(e) => updateOperation(op.id, { stockToLeave: parseFloat(e.target.value) || 0 })}
                                  className="h-6 text-[10px]"
                                  step="0.1"
                                />
                              </div>
                            </>
                          )}
                          
                          {op.type === "finishing-3d" && (op as Finishing3DOperation).strategy === "waterline" && (
                            <div>
                              <Label className="text-[8px]">Passo Z</Label>
                              <Input
                                type="number"
                                value={(op as Finishing3DOperation).waterlineStepDown || 0.5}
                                onChange={(e) => updateOperation(op.id, { waterlineStepDown: parseFloat(e.target.value) || 0.5 })}
                                className="h-6 text-[10px]"
                                step="0.1"
                              />
                            </div>
                          )}
                          
                          <div>
                            <Label className="text-[8px]">Step-over %</Label>
                            <Input
                              type="number"
                              value={op.stepOver}
                              onChange={(e) => updateOperation(op.id, { stepOver: parseFloat(e.target.value) || 0 })}
                              className="h-6 text-[10px]"
                            />
                          </div>
                          
                          <div>
                            <Label className="text-[8px]">Avanço</Label>
                            <Input
                              type="number"
                              value={op.feedRate}
                              onChange={(e) => updateOperation(op.id, { feedRate: parseFloat(e.target.value) || 0 })}
                              className="h-6 text-[10px]"
                            />
                          </div>
                          
                          <div>
                            <Label className="text-[8px]">Rotação</Label>
                            <Input
                              type="number"
                              value={op.spindleSpeed}
                              onChange={(e) => updateOperation(op.id, { spindleSpeed: parseFloat(e.target.value) || 0 })}
                              className="h-6 text-[10px]"
                            />
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-1 pt-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[9px]"
                            onClick={() => moveOperation(op.id, "up")}
                            disabled={idx === 0}
                          >
                            ↑
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[9px]"
                            onClick={() => moveOperation(op.id, "down")}
                            disabled={idx === operations.length - 1}
                          >
                            ↓
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[9px] text-destructive hover:text-destructive ml-auto"
                            onClick={() => deleteOperation(op.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
