import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wrench, Plus, Pencil, Copy, Trash2 } from "lucide-react";
import type { CncTool, ToolType } from "@/lib/toolpath-engine";

const TOOL_TYPE_LABELS: Record<ToolType, string> = {
  straight: "Fresa Reta",
  "flat-end": "Fresa Topo Plano",
  "v-bit": "V-Bit",
  "ball-nose": "Fresa Esférica",
  finishing: "Fresa de Acabamento",
};

interface ToolLibraryProps {
  tools: CncTool[];
  onChange: (tools: CncTool[]) => void;
  selectedToolId: string;
  onSelectTool: (id: string) => void;
}

const emptyTool: CncTool = {
  id: "",
  name: "",
  type: "straight",
  diameter: 3,
  feedXY: 1200,
  feedZ: 300,
  spindleRpm: 18000,
  depthPerPass: 1,
  stepOver: 40,
  fluteLength: 15,
  notes: "",
};

export function ToolLibrary({ tools, onChange, selectedToolId, onSelectTool }: ToolLibraryProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTool, setEditTool] = useState<CncTool>(emptyTool);
  const [isEditing, setIsEditing] = useState(false);

  const openCreate = () => {
    setEditTool({ ...emptyTool, id: `tool-${Date.now()}` });
    setIsEditing(false);
    setDialogOpen(true);
  };

  const openEdit = (t: CncTool) => {
    setEditTool({ ...t });
    setIsEditing(true);
    setDialogOpen(true);
  };

  const duplicate = (t: CncTool) => {
    const dup = { ...t, id: `tool-${Date.now()}`, name: `${t.name} (cópia)` };
    onChange([...tools, dup]);
  };

  const remove = (id: string) => onChange(tools.filter((t) => t.id !== id));

  const save = () => {
    if (isEditing) {
      onChange(tools.map((t) => (t.id === editTool.id ? editTool : t)));
    } else {
      onChange([...tools, editTool]);
    }
    setDialogOpen(false);
  };

  const setField = (key: keyof CncTool, val: any) => setEditTool((prev) => ({ ...prev, [key]: val }));

  return (
    <>
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4 px-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5 text-primary" /> Ferramentas
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={openCreate}><Plus className="h-3.5 w-3.5" /></Button>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <ScrollArea className="max-h-[200px]">
            <div className="space-y-1">
              {tools.map((t) => (
                <div
                  key={t.id}
                  className={`flex items-center justify-between rounded-md px-2 py-1.5 text-xs cursor-pointer hover:bg-accent/50 transition-colors ${selectedToolId === t.id ? "bg-primary/10 border border-primary/30" : ""}`}
                  onClick={() => onSelectTool(t.id)}
                >
                  <div className="truncate">
                    <span className="font-medium">{t.name}</span>
                    <span className="text-muted-foreground ml-1">Ø{t.diameter}</span>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(t); }} className="p-0.5 hover:text-primary"><Pencil className="h-3 w-3" /></button>
                    <button onClick={(e) => { e.stopPropagation(); duplicate(t); }} className="p-0.5 hover:text-primary"><Copy className="h-3 w-3" /></button>
                    <button onClick={(e) => { e.stopPropagation(); remove(t.id); }} className="p-0.5 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{isEditing ? "Editar Ferramenta" : "Nova Ferramenta"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label className="text-xs">Nome</Label><Input value={editTool.name} onChange={(e) => setField("name", e.target.value)} className="h-8 text-xs" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={editTool.type} onValueChange={(v: ToolType) => setField("type", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TOOL_TYPE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Diâmetro (mm)</Label><Input type="number" min={0.1} step={0.1} value={editTool.diameter} onChange={(e) => setField("diameter", +e.target.value)} className="h-8 text-xs" /></div>
            </div>
            {editTool.type === "v-bit" && (
              <div><Label className="text-xs">Ângulo (°)</Label><Input type="number" value={editTool.angle || 90} onChange={(e) => setField("angle", +e.target.value)} className="h-8 text-xs" /></div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">Avanço XY</Label><Input type="number" value={editTool.feedXY} onChange={(e) => setField("feedXY", +e.target.value)} className="h-8 text-xs" /></div>
              <div><Label className="text-xs">Avanço Z</Label><Input type="number" value={editTool.feedZ} onChange={(e) => setField("feedZ", +e.target.value)} className="h-8 text-xs" /></div>
              <div><Label className="text-xs">RPM</Label><Input type="number" value={editTool.spindleRpm} onChange={(e) => setField("spindleRpm", +e.target.value)} className="h-8 text-xs" /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">Prof./Passada</Label><Input type="number" step={0.1} value={editTool.depthPerPass} onChange={(e) => setField("depthPerPass", +e.target.value)} className="h-8 text-xs" /></div>
              <div><Label className="text-xs">Step-Over %</Label><Input type="number" min={1} max={100} value={editTool.stepOver} onChange={(e) => setField("stepOver", +e.target.value)} className="h-8 text-xs" /></div>
              <div><Label className="text-xs">Comp. Útil</Label><Input type="number" step={0.1} value={editTool.fluteLength} onChange={(e) => setField("fluteLength", +e.target.value)} className="h-8 text-xs" /></div>
            </div>
            <div><Label className="text-xs">Observação</Label><Input value={editTool.notes} onChange={(e) => setField("notes", e.target.value)} className="h-8 text-xs" /></div>
          </div>
          <DialogFooter><Button size="sm" onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
