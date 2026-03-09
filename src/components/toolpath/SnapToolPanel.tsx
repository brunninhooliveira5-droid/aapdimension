import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Crosshair, Plus, Trash2, Save, FolderOpen, AlertTriangle, Wrench,
  ToggleLeft, Code, Download, Upload, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import type {
  SnapToolConfig, SnapToolSlot, ToolpathOperation, ToolpathProject,
  CncTool, CustomGcodeConfig, PostProcessor
} from "@/lib/toolpath-engine";
import { generateGcode, FILE_EXTENSIONS } from "@/lib/toolpath-engine";

interface SnapToolPanelProps {
  config: SnapToolConfig;
  onChange: (config: SnapToolConfig) => void;
  operations: ToolpathOperation[];
  tools: CncTool[];
  project: ToolpathProject;
  customGcode?: CustomGcodeConfig;
}

const DEFAULT_SLOT: Omit<SnapToolSlot, "slotNumber"> = {
  name: "",
  toolType: "flat-end",
  diameter: 6,
  posX: 0,
  posY: 0,
  active: true,
};

export function SnapToolPanel({ config, onChange, operations, tools, project, customGcode }: SnapToolPanelProps) {
  const [importedGcode, setImportedGcode] = useState("");
  const [processedGcode, setProcessedGcode] = useState("");
  const [postProcessor, setPostProcessor] = useState<PostProcessor>("grbl");

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
      if (saved) { onChange(saved); toast.success("Configuração global carregada"); }
      else toast.error("Nenhuma configuração global encontrada");
    } catch { toast.error("Erro ao carregar configuração"); }
  };

  // Generate from project
  const handleGenerateFromProject = () => {
    if (!config.enabled) {
      toast.error("Ative o SnapTool primeiro");
      return;
    }
    const code = generateGcode(project, postProcessor, customGcode, config);
    setProcessedGcode(code);
    toast.success("G-code gerado com configuração SnapTool");
  };

  // Process imported G-code: inject SnapTool commands
  const handleProcessImported = () => {
    if (!importedGcode.trim()) {
      toast.error("Cole ou importe um G-code primeiro");
      return;
    }
    if (!config.enabled) {
      toast.error("Ative o SnapTool primeiro");
      return;
    }

    const lines = importedGcode.split("\n");
    const result: string[] = [];
    let currentToolSlot: number | undefined;

    for (const line of lines) {
      const trimmed = line.trim().toUpperCase();

      // Detect tool change commands (M06 Tn, T<n> M06, etc.)
      const toolMatch = trimmed.match(/T(\d+)/);
      if (toolMatch && (trimmed.includes("M06") || trimmed.includes("M6"))) {
        const toolNum = parseInt(toolMatch[1]);
        const slot = config.slots.find(s => s.slotNumber === toolNum && s.active);

        if (slot && toolNum !== currentToolSlot) {
          result.push(`(=== TROCA SNAPTOOL: T${slot.slotNumber} - ${slot.name || "Sem nome"} ===)`);
          result.push(`M05`);
          result.push(`G0 Z${config.safeZ.toFixed(3)}`);
          if (config.changeX !== undefined && config.changeY !== undefined) {
            result.push(`G0 X${config.changeX.toFixed(4)} Y${config.changeY.toFixed(4)} (posição de troca)`);
          }
          result.push(`G0 X${slot.posX.toFixed(4)} Y${slot.posY.toFixed(4)} (slot T${slot.slotNumber})`);
          result.push(`M00 (Troque para T${slot.slotNumber}: ${slot.name} D${slot.diameter}mm)`);
          if (config.autoProbe) {
            result.push(`(Probing automático)`);
            result.push(`G0 Z${config.safeZ.toFixed(3)}`);
            result.push(`G0 X${config.probeX.toFixed(4)} Y${config.probeY.toFixed(4)} (posição probe)`);
            result.push(`G38.2 Z-50 F${config.probeFeedRate} (probe descida)`);
            result.push(`G10 L20 P1 Z${config.probeZeroValue.toFixed(4)} (zeramento probe)`);
            result.push(`G0 Z${config.safeZ.toFixed(3)}`);
          }
          result.push(`(=== FIM TROCA T${slot.slotNumber} ===)`);
          currentToolSlot = toolNum;
        } else {
          // No slot found, keep original line
          result.push(line);
          if (slot) currentToolSlot = toolNum;
        }
        continue;
      }

      result.push(line);
    }

    setProcessedGcode(result.join("\n"));
    toast.success("G-code processado com comandos SnapTool inseridos");
  };

  const handleImportFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".gcode,.nc,.tap,.ngc,.txt";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setImportedGcode(reader.result as string);
        toast.success(`Arquivo "${file.name}" importado`);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleDownloadProcessed = () => {
    if (!processedGcode) return;
    const blob = new Blob([processedGcode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `snaptool_${project.name || "output"}${FILE_EXTENSIONS[postProcessor]}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeSlots = config.slots.filter(s => s.active);
  const toolChangeCount = countToolChanges(operations, config);

  return (
    <div className="h-full flex gap-0">
      {/* LEFT: Configuration */}
      <ScrollArea className="w-80 border-r border-border shrink-0">
        <div className="p-3 space-y-3">
          {/* Activation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crosshair className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">SnapTool</span>
              {config.enabled && <Badge variant="default" className="text-[9px] h-5">Ativo</Badge>}
            </div>
            <Switch checked={config.enabled} onCheckedChange={handleToggle} />
          </div>

          {!config.enabled && (
            <div className="rounded-lg border border-dashed border-border p-4 text-center">
              <Crosshair className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">
                Ative o SnapTool para configurar troca automática de ferramentas com probing.
              </p>
            </div>
          )}

          {config.enabled && (
            <>
              {/* Persistence */}
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 flex-1" onClick={handleSaveGlobal}>
                  <Save className="h-3 w-3" /> Salvar Global
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 flex-1" onClick={handleLoadGlobal}>
                  <FolderOpen className="h-3 w-3" /> Carregar
                </Button>
              </div>

              {/* General Settings */}
              <Card className="border-border">
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="text-xs flex items-center gap-1.5">
                    <Wrench className="h-3 w-3 text-primary" /> Configurações
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
                      <Label className="text-[10px]">Zeramento Probe</Label>
                      <Input type="number" step={0.001} value={config.probeZeroValue}
                        onChange={e => updateField("probeZeroValue", parseFloat(e.target.value) || 0)}
                        className="h-7 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Feed Probe</Label>
                      <Input type="number" step={1} value={config.probeFeedRate}
                        onChange={e => updateField("probeFeedRate", parseFloat(e.target.value) || 100)}
                        className="h-7 text-xs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Troca X</Label>
                      <Input type="number" step={0.001} value={config.changeX ?? ""}
                        onChange={e => updateField("changeX", e.target.value ? parseFloat(e.target.value) : undefined)}
                        className="h-7 text-xs" placeholder="—" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Troca Y</Label>
                      <Input type="number" step={0.001} value={config.changeY ?? ""}
                        onChange={e => updateField("changeY", e.target.value ? parseFloat(e.target.value) : undefined)}
                        className="h-7 text-xs" placeholder="—" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px]">Probing automático</Label>
                    <Switch checked={config.autoProbe} onCheckedChange={v => updateField("autoProbe", v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px]">Ferramenta manual T0</Label>
                    <Switch checked={config.useManualT0} onCheckedChange={v => updateField("useManualT0", v)} />
                  </div>
                </CardContent>
              </Card>

              {/* Tool Slots */}
              <Card className="border-border">
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="text-xs flex items-center gap-1.5">
                    <ToggleLeft className="h-3 w-3 text-primary" /> Ferramentas ({config.slots.length})
                    <div className="flex-1" />
                    <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={addSlot}>
                      <Plus className="h-3 w-3" /> Add
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-2">
                  {config.slots.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center py-3">
                      Nenhuma ferramenta. Clique em Add.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {config.slots.map((slot, idx) => (
                        <div key={idx} className={`flex items-center gap-1 p-1.5 rounded-md border border-border ${!slot.active ? "opacity-40" : ""}`}>
                          <Badge variant="outline" className="text-[9px] h-5 shrink-0">T{slot.slotNumber}</Badge>
                          <Input value={slot.name} onChange={e => updateSlot(idx, { name: e.target.value })}
                            className="h-6 text-[10px] px-1 flex-1 min-w-0" placeholder="Nome" />
                          <Input type="number" step={0.1} value={slot.diameter}
                            onChange={e => updateSlot(idx, { diameter: parseFloat(e.target.value) || 0 })}
                            className="h-6 text-[10px] px-1 w-12" placeholder="Ø" />
                          <Input type="number" step={0.0001} value={slot.posX}
                            onChange={e => updateSlot(idx, { posX: parseFloat(e.target.value) || 0 })}
                            className="h-6 text-[10px] px-1 w-16" placeholder="X" />
                          <Input type="number" step={0.0001} value={slot.posY}
                            onChange={e => updateSlot(idx, { posY: parseFloat(e.target.value) || 0 })}
                            className="h-6 text-[10px] px-1 w-16" placeholder="Y" />
                          <Switch checked={slot.active} onCheckedChange={v => updateSlot(idx, { active: v })} />
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => removeSlot(idx)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Validation */}
              <Card className="border-border">
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="text-xs flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-primary" /> Resumo
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    <p>Slots ativos: <span className="text-foreground font-medium">{activeSlots.length}</span></p>
                    <p>Trocas previstas: <span className="text-foreground font-medium">{toolChangeCount}</span></p>
                    <p>Probe: <span className="text-foreground font-medium">X{config.probeX} Y{config.probeY}</span></p>
                    {config.autoProbe && <p className="text-primary">✓ Probing automático ativo</p>}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </ScrollArea>

      {/* RIGHT: G-code area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30 shrink-0 flex-wrap">
          <Select value={postProcessor} onValueChange={(v: PostProcessor) => setPostProcessor(v)}>
            <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="grbl">GRBL</SelectItem>
              <SelectItem value="mach3">Mach3</SelectItem>
              <SelectItem value="ddcs">DDCS</SelectItem>
              <SelectItem value="linuxcnc">LinuxCNC</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleImportFile}>
            <Upload className="h-3.5 w-3.5" /> Importar G-code
          </Button>

          <Button variant="default" size="sm" className="h-7 text-xs gap-1" onClick={handleGenerateFromProject}
            disabled={!config.enabled || operations.filter(o => o.enabled).length === 0}>
            <Sparkles className="h-3.5 w-3.5" /> Gerar do Projeto
          </Button>

          <Button variant="default" size="sm" className="h-7 text-xs gap-1" onClick={handleProcessImported}
            disabled={!config.enabled || !importedGcode.trim()}>
            <Code className="h-3.5 w-3.5" /> Processar Importado
          </Button>

          <div className="flex-1" />

          {processedGcode && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleDownloadProcessed}>
              <Download className="h-3.5 w-3.5" /> Baixar {FILE_EXTENSIONS[postProcessor]}
            </Button>
          )}
        </div>

        {/* G-code panels */}
        <div className="flex-1 flex min-h-0">
          {/* Input G-code */}
          <div className="flex-1 flex flex-col border-r border-border min-w-0">
            <div className="px-3 py-1.5 border-b border-border bg-muted/20 shrink-0">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                G-code Entrada (cole ou importe)
              </span>
            </div>
            <Textarea
              value={importedGcode}
              onChange={e => setImportedGcode(e.target.value)}
              placeholder={"Cole aqui um G-code existente para reprocessar com as configurações SnapTool.\n\nO sistema detecta comandos T<n> M06 e substitui pela sequência de troca com posições e probing configurados.\n\nOu use \"Gerar do Projeto\" para criar G-code novo com SnapTool a partir das operações atuais."}
              className="flex-1 font-mono text-[10px] rounded-none border-0 resize-none min-h-0 bg-background focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          {/* Output G-code */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-3 py-1.5 border-b border-border bg-muted/20 shrink-0">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                G-code Saída (com SnapTool)
              </span>
              {processedGcode && (
                <Badge variant="outline" className="ml-2 text-[8px] h-4">
                  {processedGcode.split("\n").length} linhas
                </Badge>
              )}
            </div>
            <Textarea
              value={processedGcode}
              readOnly
              placeholder="O G-code processado aparecerá aqui..."
              className="flex-1 font-mono text-[10px] rounded-none border-0 resize-none min-h-0 bg-muted/10 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>
      </div>
    </div>
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
