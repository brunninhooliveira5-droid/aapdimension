import { useState, useCallback, useMemo } from "react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Save, FolderOpen, Wand2, AlertTriangle, AlertCircle, CheckCircle2,
  BookTemplate, Layers as LayersIcon, Sparkles, Box, FileImage, Clock,
  Bot, Wrench, Mic
} from "lucide-react";
import { toast } from "sonner";

// 2D Components
import { SvgCanvas } from "@/components/toolpath/SvgCanvas";
import { VectorsList } from "@/components/toolpath/VectorsList";
import { MaterialPanel } from "@/components/toolpath/MaterialPanel";
import { ToolLibrary } from "@/components/toolpath/ToolLibrary";
import { OperationPanel } from "@/components/toolpath/OperationPanel";
import { OperationsList } from "@/components/toolpath/OperationsList";
import { GcodePanel } from "@/components/toolpath/GcodePanel";
import { Simulation3D } from "@/components/toolpath/Simulation3D";

// 3D Components
import { Model3DPanel } from "@/components/toolpath/Model3DPanel";
import { Operation3DPanel } from "@/components/toolpath/Operation3DPanel";
import { Tools3DLibrary } from "@/components/toolpath/Tools3DLibrary";
import { Simulation3DAdvanced } from "@/components/toolpath/Simulation3DAdvanced";
import { GcodePanel3D } from "@/components/toolpath/GcodePanel3D";

// V6+ Intelligent CAM Components
import { AutomaticCamWizard } from "@/components/toolpath/AutomaticCamWizard";
import { IntelligentSummary } from "@/components/toolpath/IntelligentSummary";
import { VoiceCamAssistant } from "@/components/toolpath/VoiceCamAssistant";

// 2D Engine
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

// 3D Engine
import {
  type Model3D,
  type MaterialBlock3D,
  type Tool3D,
  type Operation3D,
  type Toolpath3D,
  type Project3D,
  type TimeEstimate3D,
  DEFAULT_TOOLS_3D,
  DEFAULT_MATERIAL_BLOCK,
  generateAutoCam3D,
  generateRoughingToolpath,
  generateFinishingToolpath,
  estimate3DTime,
} from "@/lib/toolpath-3d-engine";

// V6 Intelligent CAM Engine
import {
  type IntelligentCamResult,
  type QualityLevel,
  addCamHistoryEntry,
  saveIntelligentTemplate,
} from "@/lib/intelligent-cam-engine";

type WorkMode = "2d" | "3d";
type CamMode = "manual" | "automatic" | "voice";

export default function ToolpathGeneratorPage() {
  // Mode
  const [workMode, setWorkMode] = useState<WorkMode>("2d");
  const [camMode, setCamMode] = useState<CamMode>("manual");
  
  // Common state
  const [projectName, setProjectName] = useState("Novo Projeto");
  const [bottomTab, setBottomTab] = useState("operations");
  
  // ======================== 2D State ========================
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

  // ======================== V6 Intelligent CAM State ========================
  const [intelligentResult, setIntelligentResult] = useState<IntelligentCamResult | null>(null);
  const [intelligentQuality, setIntelligentQuality] = useState<QualityLevel>("balanced");
  const [showSaveIntelligentTemplate, setShowSaveIntelligentTemplate] = useState(false);
  const [intelligentTemplateName, setIntelligentTemplateName] = useState("");

  // ======================== 3D State ========================
  const [model3D, setModel3D] = useState<Model3D | null>(null);
  const [materialBlock, setMaterialBlock] = useState<MaterialBlock3D>({ ...DEFAULT_MATERIAL_BLOCK });
  const [tools3D, setTools3D] = useState<Tool3D[]>([...DEFAULT_TOOLS_3D]);
  const [selectedTool3DId, setSelectedTool3DId] = useState(DEFAULT_TOOLS_3D[0]?.id || "");
  const [operations3D, setOperations3D] = useState<Operation3D[]>([]);
  const [activeOperation3DId, setActiveOperation3DId] = useState<string | null>(null);
  const [toolpaths3D, setToolpaths3D] = useState<Toolpath3D[]>([]);
  const [issues3D, setIssues3D] = useState<string[]>([]);

  // ======================== 2D Handlers ========================
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
    setIntelligentResult(null);
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

  const handleAutoCam2D = useCallback(() => {
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

  const handleValidate2D = useCallback(() => {
    const project = buildProject2D();
    const validationIssues = validateProject(project, customPresets);
    setIssues(validationIssues);
    if (validationIssues.length === 0) {
      toast.success("Nenhum problema encontrado!");
    } else {
      toast.warning(`${validationIssues.length} problema(s) encontrado(s)`);
    }
  }, [customPresets]);

  const buildProject2D = (): ToolpathProject => ({
    id: `proj-${Date.now()}`, name: projectName, svgContent, material, tools, operations, vectors,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });

  const handleSave2D = () => {
    const project = buildProject2D();
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${projectName}.dtp`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Projeto salvo!");
  };

  const handleLoad2D = () => {
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

  // ======================== V6 Intelligent CAM Handlers ========================
  const handleIntelligentCamComplete = useCallback((result: IntelligentCamResult, newVectors: SvgVector[]) => {
    setVectors(newVectors);
    setOperations(result.operations);
    setIntelligentResult(result);
    setIssues([]);
    setAutoCamResult(null);
    setCamMode("manual"); // Switch back to manual to show results
    
    if (result.operations.length > 0) {
      setActiveOperationId(result.operations[0].id);
    }
    
    // Add to history
    if (result.suggestedTool) {
      addCamHistoryEntry({
        materialPreset: material.presetId,
        toolId: result.suggestedTool.id,
        toolName: result.suggestedTool.name,
        toolDiameter: result.suggestedTool.diameter,
        feedXY: result.suggestedTool.feedXY,
        feedZ: result.suggestedTool.feedZ,
        spindleRpm: result.suggestedTool.spindleRpm,
        workType: result.geometryAnalysis.detectedWorkType,
        quality: intelligentQuality,
        successful: true,
      });
    }
    
    toast.success(`CAM Inteligente V6: ${result.operations.length} operações geradas automaticamente!`);
  }, [material.presetId, intelligentQuality]);

  const handleSaveIntelligentTemplate = () => {
    if (!intelligentTemplateName || !intelligentResult) return;
    
    const tool = intelligentResult.suggestedTool;
    saveIntelligentTemplate({
      name: intelligentTemplateName,
      materialPreset: material.presetId,
      thickness: material.thickness,
      toolId: tool?.id || "",
      toolSettings: tool ? {
        feedXY: tool.feedXY,
        feedZ: tool.feedZ,
        spindleRpm: tool.spindleRpm,
      } : {},
      operationDefaults: {},
      quality: intelligentQuality,
      workType: intelligentResult.geometryAnalysis.detectedWorkType,
      notes: "",
    });
    
    setShowSaveIntelligentTemplate(false);
    setIntelligentTemplateName("");
    toast.success("Template inteligente salvo!");
  };

  // ======================== 3D Handlers ========================
  const handleAutoCam3D = useCallback(() => {
    if (!model3D) {
      toast.error("Importe um modelo 3D primeiro.");
      return;
    }
    
    const result = generateAutoCam3D(model3D, materialBlock, tools3D);
    setOperations3D(result.operations);
    
    // Generate toolpaths
    const newToolpaths: Toolpath3D[] = [];
    for (const op of result.operations) {
      const tool = tools3D.find(t => t.id === op.toolId);
      if (!tool) continue;
      
      if (op.type === "roughing-3d") {
        newToolpaths.push(generateRoughingToolpath(model3D, materialBlock, op, tool));
      } else {
        newToolpaths.push(generateFinishingToolpath(model3D, materialBlock, op, tool));
      }
    }
    setToolpaths3D(newToolpaths);
    
    if (result.operations.length > 0) {
      setActiveOperation3DId(result.operations[0].id);
    }
    
    const analysis = result.analysis;
    toast.success(
      `Auto-CAM 3D V5: ${result.operations.length} operações geradas\n` +
      `Análise: ${analysis.flatAreas} áreas planas, ${analysis.steepAreas} inclinadas, ${analysis.verticalWalls} verticais`
    );
  }, [model3D, materialBlock, tools3D]);

  const handleGenerateToolpaths3D = useCallback(() => {
    if (!model3D) {
      toast.error("Importe um modelo 3D primeiro.");
      return;
    }
    
    const enabledOps = operations3D.filter(op => op.enabled);
    if (enabledOps.length === 0) {
      toast.error("Nenhuma operação habilitada.");
      return;
    }
    
    const newToolpaths: Toolpath3D[] = [];
    for (const op of enabledOps) {
      const tool = tools3D.find(t => t.id === op.toolId);
      if (!tool) continue;
      
      if (op.type === "roughing-3d") {
        newToolpaths.push(generateRoughingToolpath(model3D, materialBlock, op, tool));
      } else {
        newToolpaths.push(generateFinishingToolpath(model3D, materialBlock, op, tool));
      }
    }
    
    setToolpaths3D(newToolpaths);
    toast.success(`${newToolpaths.length} percursos gerados!`);
  }, [model3D, materialBlock, operations3D, tools3D]);

  const buildProject3D = (): Project3D => ({
    id: `proj3d-${Date.now()}`,
    name: projectName,
    model: model3D,
    materialBlock,
    tools: tools3D,
    operations: operations3D,
    toolpaths: toolpaths3D,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const handleSave3D = () => {
    const project = buildProject3D();
    // Remove geometry from model for saving (too large)
    const saveProject = {
      ...project,
      model: project.model ? { ...project.model, geometry: null, vertices: null } : null,
    };
    const blob = new Blob([JSON.stringify(saveProject, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${projectName}_3d.dtp`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Projeto 3D salvo!");
  };

  // ======================== Computed values ========================
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const activePreset = getPresetById(material.presetId, customPresets);

  const maxPasses = operations.reduce((max, op) => {
    const tool = tools.find((t) => t.id === op.toolId);
    if (!tool) return max;
    const passes = Math.ceil(Math.abs(op.finalDepth - op.startDepth) / (op.depthPerPass || tool.depthPerPass || 1));
    return Math.max(max, passes);
  }, 0);

  const timeEstimate3D = useMemo<TimeEstimate3D | null>(() => {
    if (toolpaths3D.length === 0) return null;
    return estimate3DTime(toolpaths3D);
  }, [toolpaths3D]);

  // ======================== Render ========================
  
  // If in voice mode for 2D, show voice assistant alongside preview
  if (camMode === "voice" && workMode === "2d") {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight">Gerador de Percurso</h1>
            <Badge variant="default" className="text-[9px] h-5">
              V8 Voz
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setCamMode("manual")}>
            <Wrench className="h-4 w-4 mr-1" /> Modo Manual
          </Button>
        </div>
        <div className="flex-1 flex">
          <div className="w-[400px] border-r border-border overflow-auto">
            <VoiceCamAssistant
              vectors={vectors}
              material={material}
              tools={tools}
              operations={operations}
              customPresets={customPresets}
              onMaterialChange={setMaterial}
              onOperationsChange={setOperations}
              onGenerateCam={handleAutoCam2D}
              onClose={() => setCamMode("manual")}
            />
          </div>
          <div className="flex-1 p-2">
            <SvgCanvas
              vectors={vectors} material={material} operations={operations} tools={tools}
              selectedVectorIds={selectedVectorIds} activeOperationId={activeOperationId}
              showToolpath={showToolpath} onSelectVector={handleSelectVector} viewBox={viewBox}
              issues={issues} activePassLayer={activePassLayer}
            />
          </div>
        </div>
      </div>
    );
  }

  // If in automatic mode for 2D, show the wizard
  if (camMode === "automatic" && workMode === "2d") {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight">Gerador de Percurso</h1>
            <Badge variant="default" className="text-[9px] h-5">
              V8 Automático
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setCamMode("manual")}>
            <Wrench className="h-4 w-4 mr-1" /> Modo Manual
          </Button>
        </div>
        <div className="flex-1">
          <AutomaticCamWizard
            onComplete={handleIntelligentCamComplete}
            onCancel={() => setCamMode("manual")}
            tools={tools}
            customPresets={customPresets}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1 flex-wrap gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold tracking-tight">Gerador de Percurso</h1>
          <Badge variant="outline" className="text-[9px] h-5 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 text-primary">
            V8
          </Badge>
          
          {/* Dimension Mode Toggle */}
          <ToggleGroup type="single" value={workMode} onValueChange={(v) => v && setWorkMode(v as WorkMode)} className="h-7">
            <ToggleGroupItem value="2d" className="h-7 text-xs px-3 gap-1">
              <FileImage className="h-3 w-3" /> 2D
            </ToggleGroupItem>
            <ToggleGroupItem value="3d" className="h-7 text-xs px-3 gap-1">
              <Box className="h-3 w-3" /> 3D
            </ToggleGroupItem>
          </ToggleGroup>
          
          {workMode === "2d" && activePreset && (
            <Badge variant="outline" className="text-[9px] h-5">
              {activePreset.name}
              {isMetal(activePreset.category) && " ⚡"}
              {(activePreset as any).coolantRequired && " 💧"}
            </Badge>
          )}
          
          <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="h-7 w-44 text-xs" />
        </div>
        
        <div className="flex gap-1.5 flex-wrap">
          {workMode === "2d" ? (
            <>
              {/* V6 Automatic Mode Button */}
              <Button
                variant="default"
                size="sm"
                className="h-7 text-xs gap-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
                onClick={() => setCamMode("automatic")}
              >
                <Bot className="h-3.5 w-3.5" /> CAM Inteligente
              </Button>
              
              <Button
                variant="default"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setCamMode("voice")}
              >
                <Mic className="h-3.5 w-3.5" /> Voz
              </Button>
              
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                onClick={handleAutoCam2D} disabled={vectors.length === 0}>
                <Wand2 className="h-3.5 w-3.5" /> Auto CAM
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleValidate2D} disabled={operations.length === 0}>
                <AlertTriangle className="h-3.5 w-3.5" /> Validar
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setTemplateName(""); setTemplateMaterial(""); setShowTemplateDialog(true); }}>
                <BookTemplate className="h-3.5 w-3.5" /> Template
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleLoad2D}>
                <FolderOpen className="h-3.5 w-3.5" /> Abrir
              </Button>
              <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave2D}>
                <Save className="h-3.5 w-3.5" /> Salvar
              </Button>
            </>
          ) : (
            <>
              <Button variant="default" size="sm" className="h-7 text-xs gap-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
                onClick={handleAutoCam3D} disabled={!model3D}>
                <Wand2 className="h-3.5 w-3.5" /> Auto CAM 3D
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleGenerateToolpaths3D} disabled={operations3D.length === 0}>
                <Sparkles className="h-3.5 w-3.5" /> Gerar Percursos
              </Button>
              <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave3D}>
                <Save className="h-3.5 w-3.5" /> Salvar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Issues bar (2D mode) */}
      {workMode === "2d" && issues.length > 0 && (
        <div className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-md border border-border text-xs overflow-x-auto">
          {errorCount > 0 && (
            <Badge variant="destructive" className="text-[9px] h-5 gap-0.5 shrink-0">
              <AlertCircle className="h-3 w-3" /> {errorCount} erro(s)
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="outline" className="text-[9px] h-5 gap-0.5 border-warning text-warning shrink-0">
              <AlertTriangle className="h-3 w-3" /> {warningCount} aviso(s)
            </Badge>
          )}
          <ScrollArea className="flex-1">
            <div className="flex gap-2">
              {issues.slice(0, 5).map((issue, i) => (
                <span key={i} className={`shrink-0 ${issue.severity === "error" ? "text-destructive" : "text-warning"}`}>
                  {issue.message}
                </span>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Auto-CAM summary (2D mode) */}
      {workMode === "2d" && autoCamResult && !intelligentResult && (
        <div className="flex items-center gap-2 px-2 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/30 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span className="text-primary">
            Auto-CAM V4{activePreset ? ` [${activePreset.name}]` : ""}: {autoCamResult.summary.holes} furos, {autoCamResult.summary.pockets} bolsos,
            {autoCamResult.summary.islands} ilhas, {autoCamResult.summary.innerContours} int.,
            {autoCamResult.summary.outerContours} ext., {autoCamResult.summary.openPaths} abertos
            {activePreset && isMetal(activePreset.category) && " | ⚡ Estratégias avançadas"}
            {(activePreset as any)?.coolantRequired && " | 💧 Refrigeração"}
          </span>
          <Button variant="ghost" size="sm" className="h-5 text-[9px] ml-auto" onClick={() => setAutoCamResult(null)}>✕</Button>
        </div>
      )}

      {/* V6 Intelligent CAM summary (2D mode) */}
      {workMode === "2d" && intelligentResult && (
        <div className="flex items-center gap-2 px-2 py-1 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-md border border-purple-500/30 text-xs">
          <Bot className="h-3.5 w-3.5 text-purple-500 shrink-0" />
          <span className="text-primary">
            CAM Inteligente V6: {intelligentResult.operations.length} operações | 
            {intelligentResult.timeEstimate.total.toFixed(1)} min estimados |
            {intelligentResult.alerts.filter(a => a.type === "warning").length} avisos
          </span>
          <Button variant="ghost" size="sm" className="h-5 text-[9px] ml-auto" onClick={() => setIntelligentResult(null)}>✕</Button>
        </div>
      )}

      {/* 3D Mode info bar */}
      {workMode === "3d" && model3D && (
        <div className="flex items-center gap-2 px-2 py-1 bg-purple-500/10 rounded-md border border-purple-500/30 text-xs">
          <Box className="h-3.5 w-3.5 text-purple-500 shrink-0" />
          <span className="text-primary">
            Modelo: {model3D.name} | 
            {model3D.dimensions.width.toFixed(1)} x {model3D.dimensions.depth.toFixed(1)} x {model3D.dimensions.height.toFixed(1)} mm |
            {model3D.faces.toLocaleString()} faces
          </span>
          {timeEstimate3D && (
            <Badge variant="outline" className="text-[9px] h-5 gap-1 ml-auto">
              <Clock className="h-3 w-3" />
              {timeEstimate3D.totalTime.toFixed(1)} min
            </Badge>
          )}
        </div>
      )}

      {/* Main layout */}
      <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-lg border border-border">
        {/* Left panel */}
        <ResizablePanel defaultSize={18} minSize={14} maxSize={25}>
          <div className="h-full overflow-auto p-2 space-y-2">
            {workMode === "2d" ? (
              <VectorsList
                vectors={vectors}
                selectedVectorIds={selectedVectorIds}
                onSelectVector={handleSelectVector}
                onImportSvg={handleImportSvg}
                onSelectAll={() => setSelectedVectorIds(vectors.map((v) => v.id))}
                onDeselectAll={() => setSelectedVectorIds([])}
              />
            ) : (
              <Model3DPanel
                model={model3D}
                materialBlock={materialBlock}
                onModelChange={setModel3D}
                onMaterialBlockChange={setMaterialBlock}
              />
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Center */}
        <ResizablePanel defaultSize={50}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={60} minSize={35}>
              <div className="h-full flex flex-col">
                {workMode === "2d" && maxPasses > 1 && (
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
                  {workMode === "2d" ? (
                    <SvgCanvas
                      vectors={vectors} material={material} operations={operations} tools={tools}
                      selectedVectorIds={selectedVectorIds} activeOperationId={activeOperationId}
                      showToolpath={showToolpath} onSelectVector={handleSelectVector} viewBox={viewBox}
                      issues={issues} activePassLayer={activePassLayer}
                    />
                  ) : (
                    <Simulation3DAdvanced
                      model={model3D}
                      materialBlock={materialBlock}
                      operations={operations3D}
                      tools={tools3D}
                      toolpaths={toolpaths3D}
                    />
                  )}
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={40} minSize={20}>
              <div className="h-full overflow-hidden flex flex-col">
                <Tabs value={bottomTab} onValueChange={setBottomTab} className="flex flex-col h-full">
                  <TabsList className="h-8 mx-2 mt-1 shrink-0">
                    <TabsTrigger value="operations" className="text-xs h-6">Operações</TabsTrigger>
                    <TabsTrigger value="simulation" className="text-xs h-6">Simulação</TabsTrigger>
                    <TabsTrigger value="gcode" className="text-xs h-6">G-Code</TabsTrigger>
                    {workMode === "2d" && intelligentResult && (
                      <TabsTrigger value="intelligent" className="text-xs h-6 gap-1">
                        <Bot className="h-3 w-3" /> Resumo V6
                      </TabsTrigger>
                    )}
                    {workMode === "2d" && (
                      <TabsTrigger value="validation" className="text-xs h-6">
                        Validação {issues.length > 0 && <Badge variant="destructive" className="ml-1 h-4 text-[8px] px-1">{issues.length}</Badge>}
                      </TabsTrigger>
                    )}
                  </TabsList>
                  
                  <TabsContent value="operations" className="flex-1 overflow-auto px-2 pb-2">
                    {workMode === "2d" ? (
                      <OperationsList operations={operations} tools={tools} vectors={vectors}
                        activeOperationId={activeOperationId} showToolpath={showToolpath}
                        onSetActive={setActiveOperationId} onChangeOperations={setOperations} onToggleToolpath={toggleToolpath} />
                    ) : (
                      <Operation3DPanel
                        operations={operations3D}
                        tools={tools3D}
                        onOperationsChange={setOperations3D}
                        activeOperationId={activeOperation3DId}
                        onSetActiveOperation={setActiveOperation3DId}
                      />
                    )}
                  </TabsContent>
                  
                  <TabsContent value="simulation" className="flex-1 min-h-0">
                    {workMode === "2d" ? (
                      <Simulation3D material={material} operations={operations} tools={tools} vectors={vectors} />
                    ) : (
                      <Simulation3DAdvanced
                        model={model3D}
                        materialBlock={materialBlock}
                        operations={operations3D}
                        tools={tools3D}
                        toolpaths={toolpaths3D}
                      />
                    )}
                  </TabsContent>
                  
                  <TabsContent value="gcode" className="flex-1 overflow-auto">
                    {workMode === "2d" ? (
                      <div className="px-2 pb-2">
                        <GcodePanel project={buildProject2D()} />
                      </div>
                    ) : (
                      <GcodePanel3D project={buildProject3D()} timeEstimate={timeEstimate3D} />
                    )}
                  </TabsContent>

                  {/* V6 Intelligent Summary Tab */}
                  {workMode === "2d" && intelligentResult && (
                    <TabsContent value="intelligent" className="flex-1 overflow-hidden">
                      <IntelligentSummary
                        result={intelligentResult}
                        material={material}
                        preset={activePreset}
                        quality={intelligentQuality}
                        onRegenerate={() => setCamMode("automatic")}
                        onSaveTemplate={() => setShowSaveIntelligentTemplate(true)}
                      />
                    </TabsContent>
                  )}
                  
                  {workMode === "2d" && (
                    <TabsContent value="validation" className="flex-1 overflow-auto px-2 pb-2">
                      <div className="space-y-2">
                        {issues.length === 0 ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
                            <CheckCircle2 className="h-4 w-4 text-green-500" /> Nenhum problema detectado.
                          </div>
                        ) : (
                          issues.map((issue, i) => (
                            <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded-md ${issue.severity === "error" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                              {issue.severity === "error" ? <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                              <span>{issue.message}</span>
                            </div>
                          ))
                        )}
                        {issues.length > 0 && (
                          <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={handleValidate2D}>
                            Revalidar
                          </Button>
                        )}
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right panel */}
        <ResizablePanel defaultSize={22} minSize={16} maxSize={30}>
          <div className="h-full overflow-auto p-2 space-y-2">
            {workMode === "2d" ? (
              <>
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
              </>
            ) : (
              <>
                <Tools3DLibrary
                  tools={tools3D}
                  onToolsChange={setTools3D}
                  selectedToolId={selectedTool3DId}
                  onSelectTool={setSelectedTool3DId}
                />
                <Operation3DPanel
                  operations={operations3D}
                  tools={tools3D}
                  onOperationsChange={setOperations3D}
                  activeOperationId={activeOperation3DId}
                  onSetActiveOperation={setActiveOperation3DId}
                />
              </>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Save Template Dialog (2D) */}
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

      {/* Save Intelligent Template Dialog */}
      <Dialog open={showSaveIntelligentTemplate} onOpenChange={setShowSaveIntelligentTemplate}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Salvar Template Inteligente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome do Template</Label>
              <Input 
                value={intelligentTemplateName} 
                onChange={(e) => setIntelligentTemplateName(e.target.value)} 
                placeholder="Ex: MDF 15mm Alta Qualidade" 
                className="h-8 text-xs" 
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              O template salva: material, ferramenta recomendada, qualidade e configurações automáticas.
            </p>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={handleSaveIntelligentTemplate} disabled={!intelligentTemplateName}>
              Salvar Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
