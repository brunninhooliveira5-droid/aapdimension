import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Route, Plus } from "lucide-react";
import type { ToolpathOperation, OperationType, CutSide, CutDirection, CncTool, SvgVector } from "@/lib/toolpath-engine";
import { OPERATION_LABELS, createDefaultOperation } from "@/lib/toolpath-engine";

interface OperationPanelProps {
  operations: ToolpathOperation[];
  tools: CncTool[];
  vectors: SvgVector[];
  selectedVectorIds: string[];
  activeOperationId: string | null;
  onChangeOperations: (ops: ToolpathOperation[]) => void;
  onSetActive: (id: string | null) => void;
}

export function OperationPanel({ operations, tools, vectors, selectedVectorIds, activeOperationId, onChangeOperations, onSetActive }: OperationPanelProps) {
  const activeOp = operations.find((o) => o.id === activeOperationId);

  const addOperation = () => {
    const newOp = createDefaultOperation(operations.length + 1);
    newOp.vectorIds = [...selectedVectorIds];
    if (tools.length > 0) newOp.toolId = tools[0].id;
    const next = [...operations, newOp];
    onChangeOperations(next);
    onSetActive(newOp.id);
  };

  const updateOp = (key: keyof ToolpathOperation, val: any) => {
    if (!activeOp) return;
    onChangeOperations(operations.map((o) => (o.id === activeOp.id ? { ...o, [key]: val } : o)));
  };

  const updateTabs = (key: string, val: any) => {
    if (!activeOp) return;
    onChangeOperations(operations.map((o) => (o.id === activeOp.id ? { ...o, tabs: { ...o.tabs, [key]: val } } : o)));
  };

  const assignSelectedVectors = () => {
    if (!activeOp) return;
    updateOp("vectorIds", [...selectedVectorIds]);
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-2 pt-4 px-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Route className="h-3.5 w-3.5 text-primary" /> Percurso
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={addOperation}><Plus className="h-3.5 w-3.5" /></Button>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {!activeOp ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Selecione vetores e clique + para criar uma operação.
          </p>
        ) : (
          <ScrollArea className="max-h-[400px] pr-1">
            <div className="space-y-2.5">
              <div><Label className="text-xs">Nome</Label><Input value={activeOp.name} onChange={(e) => updateOp("name", e.target.value)} className="h-8 text-xs" /></div>

              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={activeOp.type} onValueChange={(v: OperationType) => updateOp("type", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(OPERATION_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Ferramenta</Label>
                <Select value={activeOp.toolId} onValueChange={(v) => updateOp("toolId", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>{tools.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} (Ø{t.diameter})</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Vetores: {activeOp.vectorIds.length}</span>
                <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={assignSelectedVectors} disabled={selectedVectorIds.length === 0}>
                  Atribuir Selecionados ({selectedVectorIds.length})
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Prof. Inicial</Label><Input type="number" step={0.1} value={activeOp.startDepth} onChange={(e) => updateOp("startDepth", +e.target.value)} className="h-8 text-xs" /></div>
                <div><Label className="text-xs">Prof. Final</Label><Input type="number" step={0.1} value={activeOp.finalDepth} onChange={(e) => updateOp("finalDepth", +e.target.value)} className="h-8 text-xs" /></div>
                <div><Label className="text-xs">Prof./Passada</Label><Input type="number" step={0.1} value={activeOp.depthPerPass} onChange={(e) => updateOp("depthPerPass", +e.target.value)} className="h-8 text-xs" /></div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Lado do Corte</Label>
                  <Select value={activeOp.cutSide} onValueChange={(v: CutSide) => updateOp("cutSide", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outside">Externo</SelectItem>
                      <SelectItem value="inside">Interno</SelectItem>
                      <SelectItem value="on-line">Centro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Direção</Label>
                  <Select value={activeOp.cutDirection} onValueChange={(v: CutDirection) => updateOp("cutDirection", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="climb">Climb</SelectItem>
                      <SelectItem value="conventional">Conventional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Lead In</Label><Input type="number" step={0.1} value={activeOp.leadIn} onChange={(e) => updateOp("leadIn", +e.target.value)} className="h-8 text-xs" /></div>
                <div><Label className="text-xs">Lead Out</Label><Input type="number" step={0.1} value={activeOp.leadOut} onChange={(e) => updateOp("leadOut", +e.target.value)} className="h-8 text-xs" /></div>
              </div>

              {/* Tabs */}
              <div className="space-y-1.5 p-2 bg-muted/30 rounded-md">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Tabs / Pontes</Label>
                  <Switch checked={activeOp.tabs.enabled} onCheckedChange={(v) => updateTabs("enabled", v)} />
                </div>
                {activeOp.tabs.enabled && (
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label className="text-[10px]">Qtd</Label><Input type="number" min={1} value={activeOp.tabs.count} onChange={(e) => updateTabs("count", +e.target.value)} className="h-7 text-xs" /></div>
                    <div><Label className="text-[10px]">Largura</Label><Input type="number" step={0.5} value={activeOp.tabs.width} onChange={(e) => updateTabs("width", +e.target.value)} className="h-7 text-xs" /></div>
                    <div><Label className="text-[10px]">Altura</Label><Input type="number" step={0.5} value={activeOp.tabs.height} onChange={(e) => updateTabs("height", +e.target.value)} className="h-7 text-xs" /></div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs">Ramp Entry</Label>
                <Switch checked={activeOp.rampEntry} onCheckedChange={(v) => updateOp("rampEntry", v)} />
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
