import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Crosshair, Plus, Trash2, Save, FolderOpen, AlertTriangle, Wrench, ToggleLeft
} from "lucide-react";
import { toast } from "sonner";
import type { SnapToolConfig, SnapToolSlot, ToolpathOperation } from "@/lib/toolpath-engine";

interface SnapToolPanelProps {
  config: SnapToolConfig;
  onChange: (config: SnapToolConfig) => void;
  operations: ToolpathOperation[];
}

const DEFAULT_SLOT: Omit<SnapToolSlot, "slotNumber"> = {
  name: "",
  toolType: "flat-end",
  diameter: 6,
  posX: 0,
  posY: 0,
  active: true,
};

type ConfigLevel = "project" | "global";

export function SnapToolPanel({ config, onChange, operations }: SnapToolPanelProps) {
  const [configLevel, setConfigLevel] = useState<ConfigLevel>("project");

  const handleToggle = (enabled: boolean) => {
    onChange({ ...config, enabled });
  };

  const updateField = <K extends keyof SnapToolConfig>(key: K, value: SnapToolConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  const addSlot = () => {
    const nextNum = config.slots.length > 0
      ? Math.max(...config.slots.map(s => s.slotNumber)) + 1
      : 1;
    onChange({
      ...config,
      slots: [...config.slots, { ...DEFAULT_SLOT, slotNumber: nextNum }],
    });
  };

  const removeSlot = (idx: number) => {
    onChange({ ...config, slots: config.slots.filter((_, i) => i !== idx) });
  };

  const updateSlot = (idx: number, partial: Partial<SnapToolSlot>) => {
    const updated = config.slots.map((s, i) => i === idx ? { ...s, ...partial } : s);
    onChange({ ...config, slots: updated });
  };

  const handleSaveGlobal = () => {
    localStorage.setItem("dimension-snaptool-global", JSON.stringify(config));
    toast.success("Configuração SnapTool salva como global");
  };

  const handleLoadGlobal = () => {
    try {
      const saved = JSON.parse(localStorage.getItem("dimension-snaptool-global") || "null");
      if (saved) {
        onChange(saved);
        toast.success("Configuração global carregada");
      } else {
        toast.error("Nenhuma configuração global encontrada");
      }
    } catch {
      toast.error("Erro ao carregar configuração");
    }
  };

  // Validation: check if operations reference tools not in slots
  const usedToolIds = new Set(operations.filter(op => op.enabled && op.snapToolSlot !== undefined).map(op => op.snapToolSlot));
  const activeSlots = config.slots.filter(s => s.active);
  const missingSlots = [...usedToolIds].filter(num => num !== undefined && !activeSlots.some(s => s.slotNumber === num));
  const toolChangeCount = countToolChanges(operations, config);

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Configuração SnapTool</span>
            {config.enabled && <Badge variant="default" className="text-[9px] h-5">Ativo</Badge>}
          </div>
          <Switch checked={config.enabled} onCheckedChange={handleToggle} />
        </div>

        {!config.enabled && (
          <p className="text-xs text-muted-foreground">
            Ative o SnapTool para configurar troca automática de ferramentas com probing.
          </p>
        )}

        {config.enabled && (
          <>
            {/* Config level & persistence */}
            <div className="flex items-center gap-2">
              <Select value={configLevel} onValueChange={(v) => setConfigLevel(v as ConfigLevel)}>
                <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Projeto Atual</SelectItem>
                  <SelectItem value="global">Global</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleSaveGlobal}>
                <Save className="h-3 w-3" /> Salvar Global
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleLoadGlobal}>
                <FolderOpen className="h-3 w-3" /> Carregar
              </Button>
            </div>

            {/* General settings */}
            <Card className="border-border">
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <Wrench className="h-3 w-3 text-primary" /> Configurações Gerais
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Nº Ferramentas</Label>
                    <Input type="number" min={1} max={20} value={config.totalSlots}
                      onChange={e => updateField("totalSlots", parseInt(e.target.value) || 1)}
                      className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Altura Segura Z</Label>
                    <Input type="number" step={0.1} value={config.safeZ}
                      onChange={e => updateField("safeZ", parseFloat(e.target.value) || 25)}
                      className="h-7 text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Probe X</Label>
                    <Input type="number" step={0.001} value={config.probeX}
                      onChange={e => updateField("probeX", parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Probe Y</Label>
                    <Input type="number" step={0.001} value={config.probeY}
                      onChange={e => updateField("probeY", parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Valor Zeramento Probe</Label>
                    <Input type="number" step={0.001} value={config.probeZeroValue}
                      onChange={e => updateField("probeZeroValue", parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Feed Probe (mm/min)</Label>
                    <Input type="number" step={1} value={config.probeFeedRate}
                      onChange={e => updateField("probeFeedRate", parseFloat(e.target.value) || 100)}
                      className="h-7 text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Troca X (opcional)</Label>
                    <Input type="number" step={0.001} value={config.changeX ?? ""}
                      onChange={e => updateField("changeX", e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="h-7 text-xs" placeholder="—" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Troca Y (opcional)</Label>
                    <Input type="number" step={0.001} value={config.changeY ?? ""}
                      onChange={e => updateField("changeY", e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="h-7 text-xs" placeholder="—" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-[10px]">Probing automático após troca</Label>
                  <Switch checked={config.autoProbe} onCheckedChange={v => updateField("autoProbe", v)} />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-[10px]">Usar ferramenta manual T0</Label>
                  <Switch checked={config.useManualT0} onCheckedChange={v => updateField("useManualT0", v)} />
                </div>
              </CardContent>
            </Card>

            {/* Tool slots */}
            <Card className="border-border">
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <ToggleLeft className="h-3 w-3 text-primary" /> Ferramentas ({config.slots.length})
                  <div className="flex-1" />
                  <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={addSlot}>
                    <Plus className="h-3 w-3" /> Adicionar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-2">
                {config.slots.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-3">
                    Nenhuma ferramenta cadastrada. Clique em Adicionar.
                  </p>
                ) : (
                  <div className="overflow-auto max-h-[200px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="h-7 text-[10px] px-1 w-10">T#</TableHead>
                          <TableHead className="h-7 text-[10px] px-1">Nome</TableHead>
                          <TableHead className="h-7 text-[10px] px-1 w-14">Ø mm</TableHead>
                          <TableHead className="h-7 text-[10px] px-1 w-16">Pos X</TableHead>
                          <TableHead className="h-7 text-[10px] px-1 w-16">Pos Y</TableHead>
                          <TableHead className="h-7 text-[10px] px-1 w-8"></TableHead>
                          <TableHead className="h-7 text-[10px] px-1 w-8"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.slots.map((slot, idx) => (
                          <TableRow key={idx} className={!slot.active ? "opacity-40" : ""}>
                            <TableCell className="py-0.5 px-1">
                              <Badge variant="outline" className="text-[9px] h-5">T{slot.slotNumber}</Badge>
                            </TableCell>
                            <TableCell className="py-0.5 px-1">
                              <Input value={slot.name} onChange={e => updateSlot(idx, { name: e.target.value })}
                                className="h-6 text-[10px] px-1" placeholder="Nome" />
                            </TableCell>
                            <TableCell className="py-0.5 px-1">
                              <Input type="number" step={0.1} value={slot.diameter}
                                onChange={e => updateSlot(idx, { diameter: parseFloat(e.target.value) || 0 })}
                                className="h-6 text-[10px] px-1 w-14" />
                            </TableCell>
                            <TableCell className="py-0.5 px-1">
                              <Input type="number" step={0.0001} value={slot.posX}
                                onChange={e => updateSlot(idx, { posX: parseFloat(e.target.value) || 0 })}
                                className="h-6 text-[10px] px-1 w-16" />
                            </TableCell>
                            <TableCell className="py-0.5 px-1">
                              <Input type="number" step={0.0001} value={slot.posY}
                                onChange={e => updateSlot(idx, { posY: parseFloat(e.target.value) || 0 })}
                                className="h-6 text-[10px] px-1 w-16" />
                            </TableCell>
                            <TableCell className="py-0.5 px-1">
                              <Switch checked={slot.active} onCheckedChange={v => updateSlot(idx, { active: v })} />
                            </TableCell>
                            <TableCell className="py-0.5 px-1">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeSlot(idx)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Validation summary */}
            <Card className="border-border">
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-primary" /> Resumo / Validação
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-1">
                <div className="text-[10px] text-muted-foreground space-y-0.5">
                  <p>Slots ativos: <span className="text-foreground font-medium">{activeSlots.length}</span></p>
                  <p>Trocas de ferramenta: <span className="text-foreground font-medium">{toolChangeCount}</span></p>
                  <p>Probe: <span className="text-foreground font-medium">X{config.probeX} Y{config.probeY}</span></p>
                  {config.autoProbe && <p className="text-primary">✓ Probing automático ativo</p>}
                </div>
                {missingSlots.length > 0 && (
                  <div className="flex items-start gap-1.5 mt-2 p-2 rounded-md bg-destructive/10 text-destructive text-[10px]">
                    <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                    <span>Operações referenciam slots não cadastrados: {missingSlots.map(s => `T${s}`).join(", ")}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ScrollArea>
  );
}

function countToolChanges(operations: ToolpathOperation[], config: SnapToolConfig): number {
  if (!config.enabled) return 0;
  const enabledOps = operations.filter(op => op.enabled).sort((a, b) => a.order - b.order);
  let changes = 0;
  let lastSlot: number | undefined;
  for (const op of enabledOps) {
    const slot = op.snapToolSlot;
    if (slot !== undefined && slot !== lastSlot) {
      if (lastSlot !== undefined) changes++;
      lastSlot = slot;
    }
  }
  return changes;
}
