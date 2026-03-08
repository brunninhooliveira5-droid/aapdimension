import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Save, FolderOpen, Wand2, AlertTriangle, AlertCircle, CheckCircle2,
  BookTemplate, Layers as LayersIcon, Sparkles
} from "lucide-react";
import { toast } from "sonner";

import { SvgCanvas } from "@/components/toolpath/SvgCanvas";
import { VectorsList } from "@/components/toolpath/VectorsList";
import { MaterialPanel } from "@/components/toolpath/MaterialPanel";
import { ToolLibrary } from "@/components/toolpath/ToolLibrary";
import { OperationPanel } from "@/components/toolpath/OperationPanel";
import { OperationsList } from "@/components/toolpath/OperationsList";
import { GcodePanel } from "@/components/toolpath/GcodePanel";
import { Simulation3D } from "@/components/toolpath/Simulation3D";

import {
  parseSvgContent,
  DEFAULT_TOOLS,
  DEFAULT_MATERIAL,
  generateAutoCam,
  validateProject,
  saveTemplate,
  getPresetById,
  isMetal,
  type SvgVector,
  type MaterialConfig,
  type CncTool,
  type ToolpathOperation,
  type ToolpathProject,
  type ValidationIssue,
  type MachiningTemplate,
  type AutoCamResult,
  type MaterialPreset,
} from "@/lib/toolpath-engine";

export default function ToolpathGeneratorPage() {
  const [projectName, setProjectName] = useState("Novo Projeto");
  const [svgContent, setSvgContent] = useState("");
  const [viewBox, setViewBox] = useState("0 0 500 500");
  const [vectors, setVectors] = useState<SvgVector[]>([]);
  const [selectedVectorIds, setSelectedVectorIds] = useState<string[]>([]);
  const [material, setMaterial] = useState<MaterialConfig>({ ...DEFAULT_MATERIAL });
  const [tools, setTools] = useState<CncTool[]>([...DEFAULT_TOOLS]);
  const [selectedToolId, setSelectedToolId] = useState(DEFAULT_TOOLS[0]?.id || "");
  const [operations, setOperations] = useState<ToolpathOperation[]>([]);
  const [activeOperationId, setActiveOperationId] = useState<string | null>(null);
  const [showToolpath, setShowToolpath] = useState<Record<string, boolean>>({});
  const [bottomTab, setBottomTab] = useState("operations");
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [autoCamResult, setAutoCamResult] = useState<AutoCamResult | null>(null);
  const [templates, setTemplates] = useState<MachiningTemplate[]>(() => {
    try { return JSON.parse(localStorage.getItem("cam-templates") || "[]"); } catch { return []; }
  });
  const [customPresets, setCustomPresets] = useState<MaterialPreset[]>(() => {
    try { return JSON.parse(localStorage.getItem("cam-material-presets") || "[]"); } catch { return []; }
  });
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateMaterial, setTemplateMaterial] = useState("");
  const [activePassLayer, setActivePassLayer] = useState<number | null>(null);

  const handleCustomPresetsChange = useCallback((presets: MaterialPreset[]) => {
    setCustomPresets(presets);
    localStorage.setItem("cam-material-presets", JSON.stringify(presets));
  }, []);

  const handleImportSvg = useCallback((content: string) => {
    const { vectors: parsed, viewBox: vb } = parseSvgContent(content);
    setSvgContent(content);
    setViewBox(vb);
    setVectors(parsed);
    setSelectedVectorIds([]);
    setOperations([]);
    setActiveOperationId(null);
    setIssues([]);
    setAutoCamResult(null);
    toast.success(`${parsed.length} vetores importados com análise de geometria`);
  }, []);

  const handleSelectVector = useCallback((id: string, multi: boolean) => {
    if (!id) { if (!multi) setSelectedVectorIds([]); return; }
    setSelectedVectorIds((prev) => {
      if (multi) return prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id];
      return [id];
    });
  }, []);

  const toggleToolpath = useCallback((id: string) => {
    setShowToolpath((prev) => ({ ...prev, [id]: prev[id] === false ? true : false }));
  }, []);

  const handleAutoCam = useCallback(() => {
    if (vectors.length === 0) {
      toast.error("Importe um arquivo SVG primeiro.");
      return;
    }
    const preset = getPresetById(material.presetId, customPresets);
    const result = generateAutoCam(vectors, tools, material, customPresets);
    setOperations(result.operations);
    setIssues(result.issues);
    setAutoCamResult(result);
    setShowToolpath({});
    if (result.operations.length > 0) {
      setActiveOperationId(result.operations[0].id);
    }
    const s = result.summary;
    const materialInfo = preset ? ` [${preset.name}]` : "";
    const metalNote = preset && isMetal(preset.category) ? " (entrada helicoidal)" : "";
    toast.success(
      `Auto-CAM V4${materialInfo}${metalNote}: ${result.operations.length} operações\n` +
      `(${s.holes} furos, ${s.pockets} bolsos, ${s.innerContours} int., ${s.outerContours} ext., ${s.openPaths} abertos)`
    );
  }, [vectors, tools, material, customPresets]);

  const handleValidate = useCallback(() => {
    const project = buildProject();
    const validationIssues = validateProject(project, customPresets);
    setIssues(validationIssues);
    if (validationIssues.length === 0) {
      toast.success("Nenhum problema encontrado!");
    } else {
      toast.warning(`${validationIssues.length} problema(s) encontrado(s)`);
    }
  }, [customPresets]);

  const buildProject = (): ToolpathProject => ({
    id: `proj-${Date.now()}`, name: projectName, svgContent, material, tools, operations, vectors,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });

  const handleSave = () => {
    const project = buildProject();
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${projectName}.dtp`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Projeto salvo!");
  };

  const handleLoad = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".dtp,.json";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const project: ToolpathProject = JSON.parse(reader.result as string);
          setProjectName(project.name);
          setSvgContent(project.svgContent);
          setVectors(project.vectors);
          setMaterial(project.material);
          setTools(project.tools);
          setOperations(project.operations);
          setSelectedVectorIds([]);
          setActiveOperationId(null);
          const p = new DOMParser();
          const doc = p.parseFromString(project.svgContent, "image/svg+xml");
          setViewBox(doc.querySelector("svg")?.getAttribute("viewBox") || "0 0 500 500");
          toast.success("Projeto carregado!");
        } catch { toast.error("Arquivo inválido"); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleSaveTemplate = () => {
    if (!templateName) return;
    const tpl = saveTemplate(templateName, templateMaterial, material, tools, operations);
    const updated = [...templates, tpl];
    setTemplates(updated);
    localStorage.setItem("cam-templates", JSON.stringify(updated));
    setShowTemplateDialog(false);
    setTemplateName("");
    setTemplateMaterial("");
    toast.success("Template salvo!");
  };

  const handleLoadTemplate = (tpl: MachiningTemplate) => {
    setMaterial(tpl.material);
    setTools(tpl.tools);
    toast.success(`Template "${tpl.name}" aplicado!`);
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    localStorage.setItem("cam-templates", JSON.stringify(updated));
  };

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const activePreset = getPresetById(material.presetId, customPresets);

  const maxPasses = operations.reduce((max, op) => {
    const tool = tools.find((t) => t.id === op.toolId);
    if (!tool) return max;
    const passes = Math.ceil(Math.abs(op.finalDepth - op.startDepth) / (op.depthPerPass || tool.depthPerPass || 1));
    return Math.max(max, passes);
  }, 0);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1 flex-wrap gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold tracking-tight">Gerador de Percurso</h1>
          <Badge variant="outline" className="text-[9px] h-5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-600">V4</Badge>
          {activePreset && (
            <Badge variant="outline" className="text-[9px] h-5">
              {activePreset.name}
              {isMetal(activePreset.category) && " ⚡"}
            </Badge>
          )}
          <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="h-7 w-44 text-xs" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Button variant="default" size="sm" className="h-7 text-xs gap-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
            onClick={handleAutoCam} disabled={vectors.length === 0}>
            <Wand2 className="h-3.5 w-3.5" /> Auto CAM
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleValidate} disabled={operations.length === 0}>
            <AlertTriangle className="h-3.5 w-3.5" /> Validar
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setTemplateName(""); setTemplateMaterial(""); setShowTemplateDialog(true); }}>
            <BookTemplate className="h-3.5 w-3.5" /> Template
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleLoad}>
            <FolderOpen className="h-3.5 w-3.5" /> Abrir
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave}>
            <Save className="h-3.5 w-3.5" /> Salvar
          </Button>
        </div>
      </div>

      {/* Issues bar */}
      {issues.length > 0 && (
        <div className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-md border border-border text-xs overflow-x-auto">
          {errorCount > 0 && (
            <Badge variant="destructive" className="text-[9px] h-5 gap-0.5 shrink-0">
              <AlertCircle className="h-3 w-3" /> {errorCount} erro(s)
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="outline" className="text-[9px] h-5 gap-0.5 border-amber-500 text-amber-600 shrink-0">
              <AlertTriangle className="h-3 w-3" /> {warningCount} aviso(s)
            </Badge>
          )}
          <ScrollArea className="flex-1">
            <div className="flex gap-2">
              {issues.slice(0, 5).map((issue, i) => (
                <span key={i} className={`shrink-0 ${issue.severity === "error" ? "text-destructive" : "text-amber-600"}`}>
                  {issue.message}
                </span>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Auto-CAM summary */}
      {autoCamResult && (
        <div className="flex items-center gap-2 px-2 py-1 bg-amber-500/10 rounded-md border border-amber-500/30 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span className="text-amber-700 dark:text-amber-400">
            Auto-CAM{activePreset ? ` [${activePreset.name}]` : ""}: {autoCamResult.summary.holes} furos, {autoCamResult.summary.pockets} bolsos,
            {autoCamResult.summary.islands} ilhas, {autoCamResult.summary.innerContours} int.,
            {autoCamResult.summary.outerContours} ext., {autoCamResult.summary.openPaths} abertos
            {activePreset && isMetal(activePreset.category) && " | ⚡ Helicoidal ativo"}
          </span>
          <Button variant="ghost" size="sm" className="h-5 text-[9px] ml-auto" onClick={() => setAutoCamResult(null)}>✕</Button>
        </div>
      )}

      {/* Main layout */}
      <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-lg border border-border">
        {/* Left panel */}
        <ResizablePanel defaultSize={18} minSize={14} maxSize={25}>
          <div className="h-full overflow-auto p-2 space-y-2">
            <VectorsList
              vectors={vectors}
              selectedVectorIds={selectedVectorIds}
              onSelectVector={handleSelectVector}
              onImportSvg={handleImportSvg}
              onSelectAll={() => setSelectedVectorIds(vectors.map((v) => v.id))}
              onDeselectAll={() => setSelectedVectorIds([])}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Center */}
        <ResizablePanel defaultSize={50}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={60} minSize={35}>
              <div className="h-full flex flex-col">
                {maxPasses > 1 && (
                  <div className="flex items-center gap-2 px-2 py-1 border-b border-border bg-background/80 shrink-0">
                    <LayersIcon className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Camada:</span>
                    <Slider
                      value={[activePassLayer ?? -1]}
                      onValueChange={([v]) => setActivePassLayer(v === -1 ? null : v)}
                      min={-1}
                      max={maxPasses - 1}
                      step={1}
                      className="flex-1 max-w-[200px]"
                    />
                    <span className="text-[10px] text-muted-foreground w-12">
                      {activePassLayer === null ? "Todas" : `${activePassLayer + 1}/${maxPasses}`}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-h-0">
                  <SvgCanvas
                    vectors={vectors} material={material} operations={operations} tools={tools}
                    selectedVectorIds={selectedVectorIds} activeOperationId={activeOperationId}
                    showToolpath={showToolpath} onSelectVector={handleSelectVector} viewBox={viewBox}
                    issues={issues} activePassLayer={activePassLayer}
                  />
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={40} minSize={20}>
              <div className="h-full overflow-hidden flex flex-col">
                <Tabs value={bottomTab} onValueChange={setBottomTab} className="flex flex-col h-full">
                  <TabsList className="h-8 mx-2 mt-1 shrink-0">
                    <TabsTrigger value="operations" className="text-xs h-6">Operações</TabsTrigger>
                    <TabsTrigger value="simulation" className="text-xs h-6">Simulação 3D</TabsTrigger>
                    <TabsTrigger value="gcode" className="text-xs h-6">G-Code</TabsTrigger>
                    <TabsTrigger value="validation" className="text-xs h-6">
                      Validação {issues.length > 0 && <Badge variant="destructive" className="ml-1 h-4 text-[8px] px-1">{issues.length}</Badge>}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="operations" className="flex-1 overflow-auto px-2 pb-2">
                    <OperationsList operations={operations} tools={tools} vectors={vectors}
                      activeOperationId={activeOperationId} showToolpath={showToolpath}
                      onSetActive={setActiveOperationId} onChangeOperations={setOperations} onToggleToolpath={toggleToolpath} />
                  </TabsContent>
                  <TabsContent value="simulation" className="flex-1 min-h-0">
                    <Simulation3D material={material} operations={operations} tools={tools} vectors={vectors} />
                  </TabsContent>
                  <TabsContent value="gcode" className="flex-1 overflow-auto px-2 pb-2">
                    <GcodePanel project={buildProject()} />
                  </TabsContent>
                  <TabsContent value="validation" className="flex-1 overflow-auto px-2 pb-2">
                    <div className="space-y-2">
                      {issues.length === 0 ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
                          <CheckCircle2 className="h-4 w-4 text-green-500" /> Nenhum problema detectado.
                        </div>
                      ) : (
                        issues.map((issue, i) => (
                          <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded-md ${issue.severity === "error" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}>
                            {issue.severity === "error" ? <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                            <span>{issue.message}</span>
                          </div>
                        ))
                      )}
                      {issues.length > 0 && (
                        <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={handleValidate}>
                          Revalidar
                        </Button>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right panel */}
        <ResizablePanel defaultSize={22} minSize={16} maxSize={30}>
          <div className="h-full overflow-auto p-2 space-y-2">
            <MaterialPanel
              material={material}
              onChange={setMaterial}
              customPresets={customPresets}
              onChangeCustomPresets={handleCustomPresetsChange}
              tools={tools}
              onToolsSuggestion={setTools}
            />

            {/* Templates quick access */}
            {templates.length > 0 && (
              <Card className="border-border">
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="text-xs flex items-center gap-1.5"><BookTemplate className="h-3 w-3 text-primary" /> Templates</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-2">
                  <div className="space-y-0.5">
                    {templates.slice(0, 5).map((tpl) => (
                      <div key={tpl.id} className="flex items-center justify-between text-[10px] hover:bg-accent/50 rounded px-1.5 py-0.5 cursor-pointer"
                        onClick={() => handleLoadTemplate(tpl)}>
                        <span className="truncate">{tpl.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(tpl.id); }} className="text-muted-foreground hover:text-destructive">✕</button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <ToolLibrary tools={tools} onChange={setTools} selectedToolId={selectedToolId} onSelectTool={setSelectedToolId} />
            <OperationPanel operations={operations} tools={tools} vectors={vectors}
              selectedVectorIds={selectedVectorIds} activeOperationId={activeOperationId}
              onChangeOperations={setOperations} onSetActive={setActiveOperationId} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Save Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Salvar Template de Usinagem</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Nome do Template</Label><Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Ex: Corte MDF 15mm" className="h-8 text-xs" /></div>
            <div><Label className="text-xs">Material</Label><Input value={templateMaterial} onChange={(e) => setTemplateMaterial(e.target.value)} placeholder="Ex: MDF, ACM, Acrílico..." className="h-8 text-xs" /></div>
            <p className="text-[10px] text-muted-foreground">O template salva: material, ferramentas e configurações de operação atuais.</p>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={handleSaveTemplate} disabled={!templateName}>Salvar Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
