import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Edit2, Wrench, Circle, Triangle } from "lucide-react";
import { toast } from "sonner";
import { type Tool3D, type Tool3DType, DEFAULT_TOOLS_3D } from "@/lib/toolpath-3d-engine";

interface Tools3DLibraryProps {
  tools: Tool3D[];
  onToolsChange: (tools: Tool3D[]) => void;
  selectedToolId: string;
  onSelectTool: (id: string) => void;
}

const TOOL_TYPES: { value: Tool3DType; label: string; icon: React.ReactNode }[] = [
  { value: "ball-nose", label: "Esférica", icon: <Circle className="h-3 w-3" /> },
  { value: "flat-end", label: "Topo Plano", icon: <div className="w-3 h-3 border-2 border-current" /> },
  { value: "bull-nose", label: "Bull-nose", icon: <Circle className="h-3 w-3" /> },
  { value: "tapered", label: "Cônica", icon: <Triangle className="h-3 w-3" /> },
  { value: "v-bit", label: "V-Bit", icon: <Triangle className="h-3 w-3 rotate-180" /> },
];

export function Tools3DLibrary({
  tools,
  onToolsChange,
  selectedToolId,
  onSelectTool,
}: Tools3DLibraryProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool3D | null>(null);
  const [formData, setFormData] = useState<Partial<Tool3D>>({});
  
  const openAddDialog = useCallback(() => {
    setEditingTool(null);
    setFormData({
      name: "Nova Ferramenta",
      type: "ball-nose",
      diameter: 6,
      tipRadius: 3,
      fluteLength: 22,
      shankDiameter: 6,
      feedRate: 2000,
      plungeRate: 800,
      spindleSpeed: 18000,
      stepOver: 15,
      stepDown: 2,
    });
    setShowDialog(true);
  }, []);
  
  const openEditDialog = useCallback((tool: Tool3D) => {
    setEditingTool(tool);
    setFormData({ ...tool });
    setShowDialog(true);
  }, []);
  
  const handleSave = useCallback(() => {
    if (!formData.name || !formData.diameter) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    
    if (editingTool) {
      onToolsChange(tools.map((t) => (t.id === editingTool.id ? { ...t, ...formData } as Tool3D : t)));
      toast.success("Ferramenta atualizada");
    } else {
      const newTool: Tool3D = {
        id: `tool-${Date.now()}`,
        ...formData,
      } as Tool3D;
      onToolsChange([...tools, newTool]);
      toast.success("Ferramenta adicionada");
    }
    
    setShowDialog(false);
  }, [editingTool, formData, tools, onToolsChange]);
  
  const handleDelete = useCallback((id: string) => {
    onToolsChange(tools.filter((t) => t.id !== id));
    if (selectedToolId === id && tools.length > 1) {
      onSelectTool(tools.find((t) => t.id !== id)?.id || "");
    }
    toast.success("Ferramenta removida");
  }, [tools, onToolsChange, selectedToolId, onSelectTool]);
  
  const resetToDefaults = useCallback(() => {
    onToolsChange([...DEFAULT_TOOLS_3D]);
    if (DEFAULT_TOOLS_3D.length > 0) {
      onSelectTool(DEFAULT_TOOLS_3D[0].id);
    }
    toast.success("Ferramentas resetadas");
  }, [onToolsChange, onSelectTool]);
  
  return (
    <>
      <Card className="border-border">
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Wrench className="h-3 w-3 text-primary" />
              Ferramentas 3D
            </span>
            <Badge variant="outline" className="text-[8px] h-4">
              {tools.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-2 space-y-2">
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="flex-1 h-7 text-[9px] gap-1" onClick={openAddDialog}>
              <Plus className="h-3 w-3" /> Adicionar
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-[9px]" onClick={resetToDefaults}>
              Reset
            </Button>
          </div>
          
          <ScrollArea className="h-[180px]">
            <div className="space-y-1">
              {tools.map((tool) => {
                const typeInfo = TOOL_TYPES.find((t) => t.value === tool.type);
                return (
                  <div
                    key={tool.id}
                    className={`flex items-center gap-2 p-1.5 rounded-md border cursor-pointer transition-colors ${
                      selectedToolId === tool.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => onSelectTool(tool.id)}
                  >
                    <div className="w-6 h-6 rounded bg-muted/50 flex items-center justify-center text-muted-foreground">
                      {typeInfo?.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-medium truncate">{tool.name}</div>
                      <div className="text-[9px] text-muted-foreground">
                        Ø{tool.diameter}mm • {typeInfo?.label}
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                        onClick={(e) => { e.stopPropagation(); openEditDialog(tool); }}
                      >
                        <Edit2 className="h-2.5 w-2.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(tool.id); }}
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* Edit/Add Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editingTool ? "Editar Ferramenta" : "Nova Ferramenta 3D"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v as Tool3DType })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TOOL_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="flex items-center gap-1.5">
                          {t.icon} {t.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Diâmetro (mm)</Label>
                <Input
                  type="number"
                  value={formData.diameter || 0}
                  onChange={(e) => setFormData({ ...formData, diameter: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-xs"
                  step="0.5"
                />
              </div>
            </div>
            
            {(formData.type === "ball-nose" || formData.type === "bull-nose") && (
              <div>
                <Label className="text-xs">Raio da Ponta (mm)</Label>
                <Input
                  type="number"
                  value={formData.tipRadius || 0}
                  onChange={(e) => setFormData({ ...formData, tipRadius: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-xs"
                  step="0.5"
                />
              </div>
            )}
            
            {(formData.type === "tapered" || formData.type === "v-bit") && (
              <div>
                <Label className="text-xs">Ângulo (graus)</Label>
                <Input
                  type="number"
                  value={formData.taperAngle || 0}
                  onChange={(e) => setFormData({ ...formData, taperAngle: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-xs"
                />
              </div>
            )}
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Avanço (mm/min)</Label>
                <Input
                  type="number"
                  value={formData.feedRate || 0}
                  onChange={(e) => setFormData({ ...formData, feedRate: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Rotação (RPM)</Label>
                <Input
                  type="number"
                  value={formData.spindleSpeed || 0}
                  onChange={(e) => setFormData({ ...formData, spindleSpeed: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Step-over (%)</Label>
                <Input
                  type="number"
                  value={formData.stepOver || 0}
                  onChange={(e) => setFormData({ ...formData, stepOver: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Step-down (mm)</Label>
                <Input
                  type="number"
                  value={formData.stepDown || 0}
                  onChange={(e) => setFormData({ ...formData, stepDown: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-xs"
                  step="0.5"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave}>
              {editingTool ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
