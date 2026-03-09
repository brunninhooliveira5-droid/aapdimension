import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Route, Plus, Zap, RotateCcw } from "lucide-react";
import type {
  ToolpathOperation,
  OperationType,
  CutSide,
  CutDirection,
  CncTool,
  SvgVector,
  EntryMode,
  LeadType,
  PocketStrategy,
} from "@/lib/toolpath-engine";
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

  const updateEntry = (key: string, val: any) => {
    if (!activeOp) return;
    onChangeOperations(operations.map((o) => (o.id === activeOp.id ? { ...o, entry: { ...o.entry, [key]: val } } : o)));
  };

  const updateLeadIn = (key: string, val: any) => {
    if (!activeOp) return;
    onChangeOperations(operations.map((o) => (o.id === activeOp.id ? { ...o, leadIn: { ...o.leadIn, [key]: val } } : o)));
  };

  const updateLeadOut = (key: string, val: any) => {
    if (!activeOp) return;
    onChangeOperations(operations.map((o) => (o.id === activeOp.id ? { ...o, leadOut: { ...o.leadOut, [key]: val } } : o)));
  };

  const updateRoughFinish = (key: string, val: any) => {
    if (!activeOp) return;
    onChangeOperations(operations.map((o) => (o.id === activeOp.id ? { ...o, roughFinish: { ...o.roughFinish, [key]: val } } : o)));
  };

  const updateTrochoidal = (key: string, val: any) => {
    if (!activeOp) return;
    onChangeOperations(operations.map((o) => (o.id === activeOp.id ? { ...o, trochoidal: { ...o.trochoidal, [key]: val } } : o)));
  };

  const updateAdaptive = (key: string, val: any) => {
    if (!activeOp) return;
    onChangeOperations(operations.map((o) => (o.id === activeOp.id ? { ...o, adaptive: { ...o.adaptive, [key]: val } } : o)));
  };

  const assignSelectedVectors = () => {
    if (!activeOp) return;
    updateOp("vectorIds", [...selectedVectorIds]);
  };

  const isAdvancedType = activeOp?.type === "adaptive" || activeOp?.type === "trochoidal" || activeOp?.type === "spiral-pocket";

  return (
    <Card className="border-border">
      <CardHeader className="pb-2 pt-4 px-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Route className="h-3.5 w-3.5 text-primary" /> Percurso V4.2
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={addOperation}><Plus className="h-3.5 w-3.5" /></Button>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {!activeOp ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Selecione vetores e clique + para criar uma operação.
          </p>
        ) : (
          <ScrollArea className="max-h-[600px] pr-1">
            <div className="space-y-2.5">
              <div><Label className="text-xs">Nome</Label><Input value={activeOp.name} onChange={(e) => updateOp("name", e.target.value)} className="h-8 text-xs" /></div>

              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={activeOp.type} onValueChange={(v: OperationType) => updateOp("type", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1 text-[9px] font-semibold text-muted-foreground uppercase">Básico</div>
                    {(["profile-outside", "profile-inside", "on-line", "pocket", "drill", "groove", "v-carve"] as OperationType[]).map(k => (
                      <SelectItem key={k} value={k}>{OPERATION_LABELS[k]}</SelectItem>
                    ))}
                    <div className="px-2 py-1 text-[9px] font-semibold text-muted-foreground uppercase">Avançado</div>
                    {(["roughing", "finishing", "adaptive", "trochoidal", "spiral-pocket"] as OperationType[]).map(k => (
                      <SelectItem key={k} value={k}>
                        {OPERATION_LABELS[k]}
                        {(k === "adaptive" || k === "trochoidal") && " ⚡"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isAdvancedType && (
                <Badge variant="outline" className="text-[8px] h-4 border-amber-500/50 text-amber-600">
                  <Zap className="h-2.5 w-2.5 mr-0.5" /> Estratégia Avançada
                </Badge>
              )}

              <div>
                <Label className="text-xs">Ferramenta</Label>
                <Select value={activeOp.toolId} onValueChange={(v) => updateOp("toolId", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>{tools.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} (Ø{t.diameter}) {t.coating && `[${t.coating}]`}
                    </SelectItem>
                  ))}</SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Vetores: {activeOp.vectorIds.length}</span>
                <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={assignSelectedVectors} disabled={selectedVectorIds.length === 0}>
                  Atribuir Selecionados ({selectedVectorIds.length})
                </Button>
              </div>

              {/* Depth */}
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Prof. Inicial</Label><Input type="number" step={0.1} value={activeOp.startDepth} onChange={(e) => updateOp("startDepth", +e.target.value)} className="h-8 text-xs" /></div>
                <div><Label className="text-xs">Prof. Final</Label><Input type="number" step={0.1} value={activeOp.finalDepth} onChange={(e) => updateOp("finalDepth", +e.target.value)} className="h-8 text-xs" /></div>
                <div><Label className="text-xs">Prof./Passada</Label><Input type="number" step={0.1} value={activeOp.depthPerPass} onChange={(e) => updateOp("depthPerPass", +e.target.value)} className="h-8 text-xs" /></div>
              </div>

              {/* Cut side & direction */}
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

              {/* Pocket Strategy */}
              {(activeOp.type === "pocket" || activeOp.type === "roughing" || activeOp.type === "spiral-pocket") && (
                <div>
                  <Label className="text-xs">Estratégia de Pocket</Label>
                  <Select value={activeOp.pocketStrategy} onValueChange={(v: PocketStrategy) => updateOp("pocketStrategy", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Padrão</SelectItem>
                      <SelectItem value="spiral">Espiral</SelectItem>
                      <SelectItem value="helical">Helicoidal</SelectItem>
                      <SelectItem value="adaptive">Adaptativo ⚡</SelectItem>
                      <SelectItem value="trochoidal">Trocoidal ⚡</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Separator className="my-1" />

              {/* Trochoidal Settings */}
              {(activeOp.type === "trochoidal" || activeOp.pocketStrategy === "trochoidal") && (
                <div className="space-y-1.5 p-2 bg-amber-500/5 rounded-md border border-amber-500/20">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <RotateCcw className="h-3 w-3 text-amber-500" /> Fresamento Trocoidal
                  </Label>
                  <div className="flex items-center gap-2 mb-1">
                    <Switch checked={activeOp.trochoidal.enabled} onCheckedChange={(v) => updateTrochoidal("enabled", v)} className="scale-[0.65]" />
                    <span className="text-[10px]">Ativar trajetória trocoidal</span>
                  </div>
                  {activeOp.trochoidal.enabled && (
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-[10px]">Raio (mm)</Label><Input type="number" step={0.1} min={0.1} value={activeOp.trochoidal.radius} onChange={(e) => updateTrochoidal("radius", +e.target.value)} className="h-7 text-xs" /></div>
                      <div><Label className="text-[10px]">Dist. Avanço (mm)</Label><Input type="number" step={0.1} min={0.1} value={activeOp.trochoidal.stepDistance} onChange={(e) => updateTrochoidal("stepDistance", +e.target.value)} className="h-7 text-xs" /></div>
                      <div className="col-span-2"><Label className="text-[10px]">Avanço Trocoidal</Label><Input type="number" value={activeOp.trochoidal.feedRate} onChange={(e) => updateTrochoidal("feedRate", +e.target.value)} className="h-7 text-xs" /></div>
                    </div>
                  )}
                </div>
              )}

              {/* Adaptive Roughing Settings */}
              {(activeOp.type === "adaptive" || activeOp.pocketStrategy === "adaptive") && (
                <div className="space-y-1.5 p-2 bg-blue-500/5 rounded-md border border-blue-500/20">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Zap className="h-3 w-3 text-blue-500" /> Adaptive Roughing
                  </Label>
                  <div className="flex items-center gap-2 mb-1">
                    <Switch checked={activeOp.adaptive.enabled} onCheckedChange={(v) => updateAdaptive("enabled", v)} className="scale-[0.65]" />
                    <span className="text-[10px]">Ativar desbaste adaptativo</span>
                  </div>
                  {activeOp.adaptive.enabled && (
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-[10px]">Step-Over Máx (%)</Label><Input type="number" min={5} max={80} value={activeOp.adaptive.maxStepOver} onChange={(e) => updateAdaptive("maxStepOver", +e.target.value)} className="h-7 text-xs" /></div>
                      <div><Label className="text-[10px]">Ângulo Máx (°)</Label><Input type="number" min={10} max={180} value={activeOp.adaptive.maxEngagementAngle} onChange={(e) => updateAdaptive("maxEngagementAngle", +e.target.value)} className="h-7 text-xs" /></div>
                      <div><Label className="text-[10px]">Dist. Parede (mm)</Label><Input type="number" step={0.1} min={0} value={activeOp.adaptive.minWallDistance} onChange={(e) => updateAdaptive("minWallDistance", +e.target.value)} className="h-7 text-xs" /></div>
                      <div><Label className="text-[10px]">Sobremetal (mm)</Label><Input type="number" step={0.05} min={0} value={activeOp.adaptive.stockToLeaveSide} onChange={(e) => updateAdaptive("stockToLeaveSide", +e.target.value)} className="h-7 text-xs" /></div>
                    </div>
                  )}
                </div>
              )}

              {/* Entry Mode */}
              <div className="space-y-1.5 p-2 bg-muted/30 rounded-md">
                <Label className="text-xs font-medium">Entrada da Ferramenta</Label>
                <Select value={activeOp.entry.mode} onValueChange={(v: EntryMode) => updateEntry("mode", v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plunge">Plunge Direto</SelectItem>
                    <SelectItem value="ramp-linear">Rampa Linear</SelectItem>
                    <SelectItem value="ramp-helicoidal">Helicoidal ⚡</SelectItem>
                  </SelectContent>
                </Select>
                {activeOp.entry.mode === "ramp-linear" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-[10px]">Comprimento</Label><Input type="number" step={0.5} value={activeOp.entry.rampLength} onChange={(e) => updateEntry("rampLength", +e.target.value)} className="h-7 text-xs" /></div>
                    <div><Label className="text-[10px]">Ângulo (°)</Label><Input type="number" step={1} value={activeOp.entry.rampAngle} onChange={(e) => updateEntry("rampAngle", +e.target.value)} className="h-7 text-xs" /></div>
                  </div>
                )}
                {activeOp.entry.mode === "ramp-helicoidal" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-[10px]">Ø Hélice (mm)</Label><Input type="number" step={0.5} value={activeOp.entry.helixDiameter} onChange={(e) => updateEntry("helixDiameter", +e.target.value)} className="h-7 text-xs" /></div>
                    <div><Label className="text-[10px]">Passo/volta (mm)</Label><Input type="number" step={0.1} value={activeOp.entry.helixPitchPerRev} onChange={(e) => updateEntry("helixPitchPerRev", +e.target.value)} className="h-7 text-xs" /></div>
                  </div>
                )}
              </div>

              {/* Lead In */}
              <div className="space-y-1.5 p-2 bg-muted/30 rounded-md">
                <Label className="text-xs font-medium">Lead In</Label>
                <Select value={activeOp.leadIn.type} onValueChange={(v: LeadType) => updateLeadIn("type", v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    <SelectItem value="line">Linha Reta</SelectItem>
                    <SelectItem value="arc">Arco</SelectItem>
                  </SelectContent>
                </Select>
                {activeOp.leadIn.type !== "none" && (
                  <div className="grid grid-cols-2 gap-2">
                    {activeOp.leadIn.type === "arc" && (
                      <div><Label className="text-[10px]">Raio</Label><Input type="number" step={0.5} value={activeOp.leadIn.radius} onChange={(e) => updateLeadIn("radius", +e.target.value)} className="h-7 text-xs" /></div>
                    )}
                    <div><Label className="text-[10px]">Comprimento</Label><Input type="number" step={0.5} value={activeOp.leadIn.length} onChange={(e) => updateLeadIn("length", +e.target.value)} className="h-7 text-xs" /></div>
                  </div>
                )}
              </div>

              {/* Lead Out */}
              <div className="space-y-1.5 p-2 bg-muted/30 rounded-md">
                <Label className="text-xs font-medium">Lead Out</Label>
                <Select value={activeOp.leadOut.type} onValueChange={(v: LeadType) => updateLeadOut("type", v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    <SelectItem value="line">Linha Reta</SelectItem>
                    <SelectItem value="arc">Arco</SelectItem>
                  </SelectContent>
                </Select>
                {activeOp.leadOut.type !== "none" && (
                  <div className="grid grid-cols-2 gap-2">
                    {activeOp.leadOut.type === "arc" && (
                      <div><Label className="text-[10px]">Raio</Label><Input type="number" step={0.5} value={activeOp.leadOut.radius} onChange={(e) => updateLeadOut("radius", +e.target.value)} className="h-7 text-xs" /></div>
                    )}
                    <div><Label className="text-[10px]">Comprimento</Label><Input type="number" step={0.5} value={activeOp.leadOut.length} onChange={(e) => updateLeadOut("length", +e.target.value)} className="h-7 text-xs" /></div>
                  </div>
                )}
              </div>

              <Separator className="my-1" />

              {/* Roughing / Finishing */}
              <div className="space-y-1.5 p-2 bg-muted/30 rounded-md">
                <Label className="text-xs font-medium">Desbaste / Acabamento</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-[10px]">Sobremetal Lateral</Label><Input type="number" step={0.05} min={0} value={activeOp.roughFinish.stockToLeaveSide} onChange={(e) => updateRoughFinish("stockToLeaveSide", +e.target.value)} className="h-7 text-xs" /></div>
                  <div><Label className="text-[10px]">Sobremetal Fundo</Label><Input type="number" step={0.05} min={0} value={activeOp.roughFinish.stockToLeaveBottom} onChange={(e) => updateRoughFinish("stockToLeaveBottom", +e.target.value)} className="h-7 text-xs" /></div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 text-[10px]">
                    <Switch checked={activeOp.roughFinish.finishPassSide} onCheckedChange={(v) => updateRoughFinish("finishPassSide", v)} className="scale-[0.65]" />
                    Acabamento Lateral
                  </label>
                  <label className="flex items-center gap-1 text-[10px]">
                    <Switch checked={activeOp.roughFinish.finishPassBottom} onCheckedChange={(v) => updateRoughFinish("finishPassBottom", v)} className="scale-[0.65]" />
                    Acabamento Fundo
                  </label>
                </div>
                {(activeOp.roughFinish.finishPassSide || activeOp.roughFinish.finishPassBottom) && (
                  <div><Label className="text-[10px]">Avanço Acabamento</Label><Input type="number" value={activeOp.roughFinish.finishFeedRate} onChange={(e) => updateRoughFinish("finishFeedRate", +e.target.value)} className="h-7 text-xs" /></div>
                )}
              </div>

              <Separator className="my-1" />

              {/* Tabs */}
              <div className="space-y-1.5 p-2 bg-muted/30 rounded-md">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Tabs / Pontes</Label>
                  <Switch checked={activeOp.tabs.enabled} onCheckedChange={(v) => updateTabs("enabled", v)} />
                </div>
                {activeOp.tabs.enabled && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div><Label className="text-[10px]">Qtd</Label><Input type="number" min={1} value={activeOp.tabs.count} onChange={(e) => updateTabs("count", +e.target.value)} className="h-7 text-xs" /></div>
                      <div><Label className="text-[10px]">Largura</Label><Input type="number" step={0.5} value={activeOp.tabs.width} onChange={(e) => updateTabs("width", +e.target.value)} className="h-7 text-xs" /></div>
                      <div><Label className="text-[10px]">Altura</Label><Input type="number" step={0.5} value={activeOp.tabs.height} onChange={(e) => updateTabs("height", +e.target.value)} className="h-7 text-xs" /></div>
                    </div>
                    <div><Label className="text-[10px]">Dist. Mínima</Label><Input type="number" step={1} value={activeOp.tabs.minDistance} onChange={(e) => updateTabs("minDistance", +e.target.value)} className="h-7 text-xs" /></div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
