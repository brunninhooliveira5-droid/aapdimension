import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Crosshair, Plus, Trash2, Save, FolderOpen, AlertTriangle, Wrench,
  ToggleLeft, Download, Upload, Sparkles, CheckCircle2, AlertCircle,
  FileText, ArrowRight, Info
} from "lucide-react";
import { toast } from "sonner";
import type {
  SnapToolConfig, SnapToolSlot, SnapToolSafetyConfig, ToolpathOperation, ToolpathProject,
  CncTool, CustomGcodeConfig, PostProcessor
} from "@/lib/toolpath-engine";
import { generateGcode, FILE_EXTENSIONS, DEFAULT_SNAPTOOL_SAFETY } from "@/lib/toolpath-engine";

// ── Types ──

interface ValidationMessage {
  type: "error" | "warning" | "info";
  message: string;
}

interface ToolChangeEvent {
  lineIndex: number;
  fromTool: number;
  toTool: number;
  skipped: boolean;
  reason?: string;
}

// ── Props ──

interface SnapToolPanelProps {
  config: SnapToolConfig;
  onChange: (config: SnapToolConfig) => void;
  operations: ToolpathOperation[];
  tools: CncTool[];
  project: ToolpathProject;
  customGcode?: CustomGcodeConfig;
}

// ── Defaults ──

const DEFAULT_SLOT: Omit<SnapToolSlot, "slotNumber"> = {
  name: "",
  toolType: "flat-end",
  diameter: 6,
  posX: 0,
  posY: 0,
  active: true,
};

// ── Component ──

export function SnapToolPanel({ config, onChange, operations, tools, project, customGcode }: SnapToolPanelProps) {
  const [activeTab, setActiveTab] = useState<"config" | "processor">("processor");
  const [importedGcode, setImportedGcode] = useState("");
  const [processedGcode, setProcessedGcode] = useState("");
  const [currentTool, setCurrentTool] = useState<number>(1);
  const [postProcessor, setPostProcessor] = useState<PostProcessor>("grbl");
  const [fileName, setFileName] = useState("");

  // ── Config handlers ──

  const handleToggle = (enabled: boolean) => onChange({ ...config, enabled });

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

  // ── Validation ──

  const validation = useMemo((): ValidationMessage[] => {
    const msgs: ValidationMessage[] = [];

    if (!config.enabled) {
      msgs.push({ type: "warning", message: "SnapTool está desativado. Ative para processar G-code." });
      return msgs;
    }

    if (config.slots.filter(s => s.active).length === 0) {
      msgs.push({ type: "error", message: "Nenhuma ferramenta cadastrada ou ativa." });
    }

    if (config.safeZ <= 0) {
      msgs.push({ type: "warning", message: "Altura segura Z não configurada ou zero." });
    }

    if (config.autoProbe && config.probeX === 0 && config.probeY === 0) {
      msgs.push({ type: "warning", message: "Posição do probe está em X0 Y0. Verifique se está correto." });
    }

    // Check if current tool exists
    const currentSlot = config.slots.find(s => s.slotNumber === currentTool && s.active);
    if (!currentSlot) {
      msgs.push({ type: "warning", message: `Ferramenta inicial T${currentTool} não está cadastrada como ativa.` });
    }

    // Parse imported gcode for tool references
    if (importedGcode.trim()) {
      const usedTools = extractToolNumbers(importedGcode);
      for (const tn of usedTools) {
        const slot = config.slots.find(s => s.slotNumber === tn && s.active);
        if (!slot) {
          msgs.push({ type: "error", message: `Ferramenta T${tn} usada no G-code mas NÃO cadastrada no SnapTool.` });
        }
      }

      if (usedTools.length === 0) {
        msgs.push({ type: "info", message: "Nenhum comando de troca de ferramenta (M6) encontrado no G-code." });
      } else {
        msgs.push({ type: "info", message: `${usedTools.length} ferramenta(s) referenciada(s): ${usedTools.map(t => `T${t}`).join(", ")}` });
      }
    }

    return msgs;
  }, [config, currentTool, importedGcode]);

  // ── Tool change analysis ──

  const toolChangeAnalysis = useMemo(() => {
    if (!importedGcode.trim() || !config.enabled) return { events: [] as ToolChangeEvent[], sequence: [] as number[] };

    const lines = importedGcode.split("\n");
    const events: ToolChangeEvent[] = [];
    const sequence: number[] = [currentTool];
    let activeTool = currentTool;

    for (let i = 0; i < lines.length; i++) {
      const parsed = parseToolChangeLine(lines[i]);
      if (!parsed) continue;

      const { toolNum, isM6 } = parsed;

      if (isM6 && toolNum !== undefined) {
        if (toolNum === activeTool) {
          events.push({ lineIndex: i, fromTool: activeTool, toTool: toolNum, skipped: true, reason: "Mesma ferramenta" });
        } else {
          events.push({ lineIndex: i, fromTool: activeTool, toTool: toolNum, skipped: false });
          sequence.push(toolNum);
          activeTool = toolNum;
        }
      }
    }

    return { events, sequence };
  }, [importedGcode, currentTool, config.enabled]);

  // ── Process G-code ──

  const handleProcessGcode = () => {
    if (!importedGcode.trim()) {
      toast.error("Carregue ou cole um G-code primeiro");
      return;
    }
    if (!config.enabled) {
      toast.error("Ative o SnapTool na aba Configuração primeiro");
      return;
    }

    const hasErrors = validation.some(v => v.type === "error");
    if (hasErrors) {
      toast.error("Corrija os erros de validação antes de processar");
      return;
    }

    const lines = importedGcode.split("\n");
    const result: string[] = [];
    let activeTool = currentTool;
    let changesInserted = 0;

    // Header
    result.push(`(=== PROCESSADO POR DIMENSION SNAPTOOL ===)`);
    result.push(`(Ferramenta inicial: T${currentTool})`);
    result.push(`(Data: ${new Date().toLocaleString("pt-BR")})`);
    result.push(``);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const parsed = parseToolChangeLine(line);

      if (!parsed || !parsed.isM6 || parsed.toolNum === undefined) {
        result.push(line);
        continue;
      }

      const requestedTool = parsed.toolNum;

      // Same tool — skip M6
      if (requestedTool === activeTool) {
        result.push(`(SnapTool: T${requestedTool} já montada — M6 ignorado)`);
        continue;
      }

      // Different tool — generate full change block
      const fromSlot = config.slots.find(s => s.slotNumber === activeTool && s.active);
      const toSlot = config.slots.find(s => s.slotNumber === requestedTool && s.active);

      if (!toSlot) {
        result.push(`(ERRO SnapTool: T${requestedTool} não cadastrada!)`);
        result.push(line);
        continue;
      }

      result.push(...generateFullToolChange(activeTool, requestedTool, fromSlot, toSlot, config));
      activeTool = requestedTool;
      changesInserted++;
    }

    // Footer
    result.push(``);
    result.push(`(=== FIM PROCESSAMENTO SNAPTOOL ===)`);
    result.push(`(Trocas realizadas: ${changesInserted})`);

    setProcessedGcode(result.join("\n"));
    toast.success(`G-code processado: ${changesInserted} troca(s) de ferramenta inserida(s)`);
  };

  // ── File import ──

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
        setFileName(file.name);
        setProcessedGcode("");
        toast.success(`Arquivo "${file.name}" carregado`);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // ── Generate from project ──

  const handleGenerateFromProject = () => {
    if (!config.enabled) {
      toast.error("Ative o SnapTool primeiro");
      return;
    }
    const code = generateGcode(project, postProcessor, customGcode, config);
    setProcessedGcode(code);
    toast.success("G-code gerado com configuração SnapTool");
  };

  // ── Download ──

  const handleDownload = () => {
    if (!processedGcode) return;
    const blob = new Blob([processedGcode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = fileName ? fileName.replace(/\.[^.]+$/, "") : (project.name || "output");
    a.download = `${baseName}_snaptool${FILE_EXTENSIONS[postProcessor]}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Derived ──

  const activeSlots = config.slots.filter(s => s.active);
  const errorCount = validation.filter(v => v.type === "error").length;
  const warningCount = validation.filter(v => v.type === "warning").length;

  return (
    <div className="h-full flex">
      {/* ── LEFT SIDEBAR ── */}
      <ScrollArea className="w-80 border-r border-border shrink-0">
        <div className="p-3 space-y-2">
          {/* Tab switcher */}
          <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
            <Button
              variant={activeTab === "processor" ? "default" : "ghost"}
              size="sm" className="flex-1 h-7 text-[10px]"
              onClick={() => setActiveTab("processor")}
            >
              <FileText className="h-3 w-3 mr-1" /> Processador
            </Button>
            <Button
              variant={activeTab === "config" ? "default" : "ghost"}
              size="sm" className="flex-1 h-7 text-[10px]"
              onClick={() => setActiveTab("config")}
            >
              <Wrench className="h-3 w-3 mr-1" /> Configuração
            </Button>
          </div>

          {activeTab === "processor" ? (
            <ProcessorSidebar
              config={config}
              currentTool={currentTool}
              setCurrentTool={setCurrentTool}
              postProcessor={postProcessor}
              setPostProcessor={setPostProcessor}
              validation={validation}
              toolChangeAnalysis={toolChangeAnalysis}
              errorCount={errorCount}
              warningCount={warningCount}
              activeSlots={activeSlots}
              onImportFile={handleImportFile}
              onProcess={handleProcessGcode}
              onGenerateFromProject={handleGenerateFromProject}
              onDownload={handleDownload}
              hasImported={!!importedGcode.trim()}
              hasProcessed={!!processedGcode}
              operations={operations}
              fileName={fileName}
            />
          ) : (
            <ConfigSidebar
              config={config}
              onToggle={handleToggle}
              updateField={updateField}
              addSlot={addSlot}
              removeSlot={removeSlot}
              updateSlot={updateSlot}
              onSaveGlobal={handleSaveGlobal}
              onLoadGlobal={handleLoadGlobal}
              activeSlots={activeSlots}
            />
          )}
        </div>
      </ScrollArea>

      {/* ── RIGHT: G-code panels ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30 shrink-0 flex-wrap">
          <Badge variant={config.enabled ? "default" : "secondary"} className="text-[9px] h-5 gap-1">
            <Crosshair className="h-3 w-3" /> {config.enabled ? "Ativo" : "Inativo"}
          </Badge>
          <Badge variant="outline" className="text-[9px] h-5">
            T{currentTool} montada
          </Badge>
          {fileName && (
            <Badge variant="outline" className="text-[9px] h-5 max-w-40 truncate">
              {fileName}
            </Badge>
          )}
          <div className="flex-1" />
          {processedGcode && (
            <Badge variant="outline" className="text-[9px] h-5">
              {processedGcode.split("\n").length} linhas
            </Badge>
          )}
        </div>

        {/* G-code panels */}
        <div className="flex-1 flex min-h-0">
          {/* Input */}
          <div className="flex-1 flex flex-col border-r border-border min-w-0">
            <div className="px-3 py-1.5 border-b border-border bg-muted/20 shrink-0 flex items-center gap-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                G-code Original
              </span>
              {importedGcode && (
                <Badge variant="outline" className="text-[8px] h-4">
                  {importedGcode.split("\n").length} linhas
                </Badge>
              )}
            </div>
            <Textarea
              value={importedGcode}
              onChange={e => { setImportedGcode(e.target.value); setProcessedGcode(""); }}
              placeholder={"Carregue um arquivo G-code (.nc, .tap, .gcode, .txt) ou cole aqui.\n\nO processador detectará comandos M6/Tn e substituirá por blocos completos de troca SnapTool.\n\nExemplo de comandos detectados:\n  M6 T1\n  T2 M6\n  M06 T3\n  T4M6"}
              className="flex-1 font-mono text-[10px] rounded-none border-0 resize-none min-h-0 bg-background focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          {/* Output */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-3 py-1.5 border-b border-border bg-muted/20 shrink-0 flex items-center gap-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                G-code Processado (SnapTool)
              </span>
            </div>
            <Textarea
              value={processedGcode}
              readOnly
              placeholder="O G-code processado com blocos de troca SnapTool aparecerá aqui após clicar em 'Processar'..."
              className="flex-1 font-mono text-[10px] rounded-none border-0 resize-none min-h-0 bg-muted/10 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════

function ProcessorSidebar({
  config, currentTool, setCurrentTool, postProcessor, setPostProcessor,
  validation, toolChangeAnalysis, errorCount, warningCount, activeSlots,
  onImportFile, onProcess, onGenerateFromProject, onDownload,
  hasImported, hasProcessed, operations, fileName,
}: {
  config: SnapToolConfig;
  currentTool: number;
  setCurrentTool: (n: number) => void;
  postProcessor: PostProcessor;
  setPostProcessor: (p: PostProcessor) => void;
  validation: ValidationMessage[];
  toolChangeAnalysis: { events: ToolChangeEvent[]; sequence: number[] };
  errorCount: number;
  warningCount: number;
  activeSlots: SnapToolSlot[];
  onImportFile: () => void;
  onProcess: () => void;
  onGenerateFromProject: () => void;
  onDownload: () => void;
  hasImported: boolean;
  hasProcessed: boolean;
  operations: ToolpathOperation[];
  fileName: string;
}) {
  return (
    <>
      {/* Load file */}
      <Card className="border-border">
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <Upload className="h-3 w-3 text-primary" /> Carregar G-code
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2">
          <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1" onClick={onImportFile}>
            <Upload className="h-3.5 w-3.5" /> Selecionar Arquivo
          </Button>
          <p className="text-[9px] text-muted-foreground">.nc .tap .gcode .txt</p>
          {fileName && (
            <Badge variant="outline" className="text-[9px] w-full justify-center truncate">
              {fileName}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Initial state */}
      <Card className="border-border">
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <Crosshair className="h-3 w-3 text-primary" /> Estado Inicial
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2">
          <div>
            <Label className="text-[10px]">Ferramenta montada na máquina</Label>
            <Select value={String(currentTool)} onValueChange={v => setCurrentTool(parseInt(v))}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {activeSlots.length > 0 ? activeSlots.map(s => (
                  <SelectItem key={s.slotNumber} value={String(s.slotNumber)}>
                    T{s.slotNumber} — {s.name || `Ø${s.diameter}mm`}
                  </SelectItem>
                )) : (
                  <SelectItem value={String(currentTool)}>T{currentTool}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px]">Pós-processador</Label>
            <Select value={postProcessor} onValueChange={(v: PostProcessor) => setPostProcessor(v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="grbl">GRBL</SelectItem>
                <SelectItem value="mach3">Mach3</SelectItem>
                <SelectItem value="ddcs">DDCS</SelectItem>
                <SelectItem value="linuxcnc">LinuxCNC</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-1.5">
        <Button
          variant="default" size="sm"
          className="w-full h-8 text-xs gap-1"
          onClick={onProcess}
          disabled={!config.enabled || !hasImported}
        >
          <Sparkles className="h-3.5 w-3.5" /> Processar G-code
        </Button>
        <Button
          variant="outline" size="sm"
          className="w-full h-8 text-xs gap-1"
          onClick={onGenerateFromProject}
          disabled={!config.enabled}
        >
          <Sparkles className="h-3.5 w-3.5" /> Gerar do Projeto
        </Button>
        {hasProcessed && (
          <Button
            variant="outline" size="sm"
            className="w-full h-8 text-xs gap-1"
            onClick={onDownload}
          >
            <Download className="h-3.5 w-3.5" /> Baixar Arquivo
          </Button>
        )}
      </div>

      {/* Validation */}
      <Card className="border-border">
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-primary" /> Validação
            {errorCount > 0 && <Badge variant="destructive" className="text-[8px] h-4 ml-auto">{errorCount}</Badge>}
            {warningCount > 0 && <Badge variant="secondary" className="text-[8px] h-4">{warningCount}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="space-y-1">
            {validation.map((v, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[10px]">
                {v.type === "error" && <AlertCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />}
                {v.type === "warning" && <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0 mt-0.5" />}
                {v.type === "info" && <Info className="h-3 w-3 text-blue-500 shrink-0 mt-0.5" />}
                <span className={v.type === "error" ? "text-destructive" : "text-muted-foreground"}>
                  {v.message}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Analysis */}
      {toolChangeAnalysis.events.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-primary" /> Análise
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-1.5">
            <div className="text-[10px] text-muted-foreground space-y-0.5">
              <p>Ferramenta inicial: <span className="text-foreground font-medium">T{currentTool}</span></p>
              <p>Sequência: <span className="text-foreground font-medium">
                {toolChangeAnalysis.sequence.map(t => `T${t}`).join(" → ")}
              </span></p>
              <p>Trocas efetivas: <span className="text-foreground font-medium">
                {toolChangeAnalysis.events.filter(e => !e.skipped).length}
              </span></p>
              <p>Trocas ignoradas: <span className="text-foreground font-medium">
                {toolChangeAnalysis.events.filter(e => e.skipped).length}
              </span></p>
            </div>
            <Separator />
            <div className="space-y-0.5">
              {toolChangeAnalysis.events.map((ev, i) => (
                <div key={i} className="flex items-center gap-1 text-[9px]">
                  {ev.skipped ? (
                    <Badge variant="secondary" className="text-[8px] h-4">SKIP</Badge>
                  ) : (
                    <Badge variant="default" className="text-[8px] h-4">TROCA</Badge>
                  )}
                  <span className="text-muted-foreground">
                    L{ev.lineIndex + 1}: T{ev.fromTool}
                  </span>
                  <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className="text-foreground font-medium">T{ev.toTool}</span>
                  {ev.reason && <span className="text-muted-foreground">({ev.reason})</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function ConfigSidebar({
  config, onToggle, updateField, addSlot, removeSlot, updateSlot,
  onSaveGlobal, onLoadGlobal, activeSlots,
}: {
  config: SnapToolConfig;
  onToggle: (enabled: boolean) => void;
  updateField: <K extends keyof SnapToolConfig>(key: K, value: SnapToolConfig[K]) => void;
  addSlot: () => void;
  removeSlot: (idx: number) => void;
  updateSlot: (idx: number, partial: Partial<SnapToolSlot>) => void;
  onSaveGlobal: () => void;
  onLoadGlobal: () => void;
  activeSlots: SnapToolSlot[];
}) {
  return (
    <>
      {/* Activation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crosshair className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">SnapTool</span>
          {config.enabled && <Badge variant="default" className="text-[9px] h-5">Ativo</Badge>}
        </div>
        <Switch checked={config.enabled} onCheckedChange={onToggle} />
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
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 flex-1" onClick={onSaveGlobal}>
              <Save className="h-3 w-3" /> Salvar Global
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 flex-1" onClick={onLoadGlobal}>
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

          {/* Summary */}
          <Card className="border-border">
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-primary" /> Resumo
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <p>Slots ativos: <span className="text-foreground font-medium">{activeSlots.length}</span></p>
                <p>Probe: <span className="text-foreground font-medium">X{config.probeX} Y{config.probeY}</span></p>
                <p>Altura segura: <span className="text-foreground font-medium">{config.safeZ}mm</span></p>
                {config.autoProbe && <p className="text-primary">✓ Probing automático ativo</p>}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}

// ═══════════════════════════════════════════
// Utility functions
// ═══════════════════════════════════════════

/** Parse a line to detect tool change commands: M6 Tn, Tn M6, M06 T3, T2M6, etc. */
function parseToolChangeLine(line: string): { toolNum?: number; isM6: boolean } | null {
  const upper = line.trim().toUpperCase();

  // Skip comments
  if (upper.startsWith("(") || upper.startsWith(";") || upper.startsWith("%")) return null;

  const hasM6 = /M0?6\b/.test(upper);
  const toolMatch = upper.match(/T(\d+)/);

  if (!hasM6 && !toolMatch) return null;

  if (hasM6 && toolMatch) {
    return { toolNum: parseInt(toolMatch[1]), isM6: true };
  }

  // Standalone M6 without T (use previous context — skip for now)
  if (hasM6 && !toolMatch) {
    return { isM6: true };
  }

  // Standalone Tn without M6 — not a tool change command, just a tool call
  return null;
}

/** Extract all unique tool numbers referenced with M6 in the gcode */
function extractToolNumbers(gcode: string): number[] {
  const tools = new Set<number>();
  for (const line of gcode.split("\n")) {
    const parsed = parseToolChangeLine(line);
    if (parsed?.isM6 && parsed.toolNum !== undefined) {
      tools.add(parsed.toolNum);
    }
  }
  return Array.from(tools).sort((a, b) => a - b);
}

/** Generate a full tool change block with safety pauses */
function generateFullToolChange(
  fromToolNum: number,
  toToolNum: number,
  fromSlot: SnapToolSlot | undefined,
  toSlot: SnapToolSlot,
  config: SnapToolConfig,
): string[] {
  const lines: string[] = [];
  const safety = config.safety ?? DEFAULT_SNAPTOOL_SAFETY;
  const pauseCmd = safety.pauseCommand || "M0";

  lines.push(``);
  lines.push(`(========================================)`);
  lines.push(`(  TROCA SNAPTOOL: T${fromToolNum} → T${toToolNum})`);
  lines.push(`(========================================)`);

  // 1) Stop spindle
  lines.push(`M05 (Parar spindle)`);

  // 2) Raise to safe Z
  lines.push(`G0 Z${config.safeZ.toFixed(3)} (Altura segura)`);

  // 3) Release current tool
  if (fromSlot) {
    lines.push(`(--- Soltar T${fromToolNum}: ${fromSlot.name || ""} ---)`);
    lines.push(`G0 X${fromSlot.posX.toFixed(4)} Y${fromSlot.posY.toFixed(4)} (Posição slot T${fromToolNum})`);
    lines.push(`M00 (Soltar ferramenta T${fromToolNum})`);
    lines.push(`G0 Z${config.safeZ.toFixed(3)} (Subir após soltura)`);

    if (safety.enabled && safety.pauseAfterRelease) {
      lines.push(`( SNAPTOOL - AGUARDANDO CONFIRMACAO DO OPERADOR )`);
      lines.push(`( Ferramenta T${fromToolNum} devolvida. Verifique e pressione START )`);
      lines.push(`${pauseCmd}`);
    }
  }

  // 4) Pick new tool
  lines.push(`(--- Pegar T${toToolNum}: ${toSlot.name || ""} D${toSlot.diameter}mm ---)`);
  lines.push(`G0 X${toSlot.posX.toFixed(4)} Y${toSlot.posY.toFixed(4)} (Posição slot T${toToolNum})`);
  lines.push(`M00 (Acoplar ferramenta T${toToolNum})`);

  // 5) Raise after clamping
  lines.push(`G0 Z${config.safeZ.toFixed(3)} (Subir após acoplamento)`);

  if (safety.enabled && safety.pauseAfterPickup) {
    lines.push(`( SNAPTOOL - AGUARDANDO CONFIRMACAO DO OPERADOR )`);
    lines.push(`( Ferramenta T${toToolNum} acoplada. Verifique e pressione START )`);
    lines.push(`${pauseCmd}`);
  }

  // 6) Auto probing
  if (config.autoProbe) {
    if (safety.enabled && safety.pauseBeforeProbing) {
      lines.push(`( SNAPTOOL - AGUARDANDO CONFIRMACAO ANTES DO PROBING )`);
      lines.push(`( Confirmar posicionamento e pressionar START )`);
      lines.push(`${pauseCmd}`);
    }

    lines.push(`(--- Probing automático ---)`);
    lines.push(`G0 X${config.probeX.toFixed(4)} Y${config.probeY.toFixed(4)} (Posição probe)`);
    lines.push(`G38.2 Z-50 F${config.probeFeedRate} (Probe descida)`);
    if (config.probeZeroValue !== 0) {
      lines.push(`G10 L20 P1 Z${config.probeZeroValue.toFixed(4)} (Zeramento probe)`);
    } else {
      lines.push(`G10 L20 P1 Z0 (Zeramento probe)`);
    }
    lines.push(`G0 Z${config.safeZ.toFixed(3)} (Subir após probe)`);

    if (safety.enabled && safety.pauseAfterProbing) {
      lines.push(`( SNAPTOOL - AGUARDANDO CONFIRMACAO APOS PROBING )`);
      lines.push(`( Probing concluído. Pressione START para continuar )`);
      lines.push(`${pauseCmd}`);
    }
  }

  lines.push(`(=== FIM TROCA T${toToolNum} ===)`);
  lines.push(``);

  return lines;
}
