import { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Save, FolderOpen, Wand2, AlertTriangle, AlertCircle, CheckCircle2,
  BookTemplate, Layers as LayersIcon, Sparkles, Box, FileImage, Clock,
  Bot, Wrench, Mic, Upload, FilePlus, Maximize, Minimize,
  ChevronDown, ChevronUp, PenTool
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

// Layout & Drawing
import { DrawingToolbar, type DrawingTool, type EditAction } from "@/components/toolpath/DrawingToolbar";
import { LayoutSelector, type LayoutMode } from "@/components/toolpath/LayoutSelector";

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
  createDefaultOperation,
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
type BottomPanel = "operations" | "simulation" | "gcode" | "intelligent" | "validation" | null;

export default function ToolpathGeneratorPage() {
  // Mode
  const [workMode, setWorkMode] = useState<WorkMode>("2d");
  const [camMode, setCamMode] = useState<CamMode>("manual");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("default");

  // Layout
  const [bottomPanel, setBottomPanel] = useState<BottomPanel>("operations");
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // Drawing
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingTool, setDrawingTool] = useState<DrawingTool>("select");
  const [snapGrid, setSnapGrid] = useState(true);
  const [snapPoints, setSnapPoints] = useState(true);
  const [snapLines, setSnapLines] = useState(false);

  // Common state
  const [projectName, setProjectName] = useState("Novo Projeto");

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

  // ======================== Layout effects ========================
  useEffect(() => {
    if (layoutMode === "preview") {
      setIsPreviewExpanded(true);
      setIsDrawingMode(false);
    } else if (layoutMode === "vectors") {
      setIsDrawingMode(true);
      setIsPreviewExpanded(false);
    } else if (layoutMode === "cam") {
      setIsPreviewExpanded(false);
      setIsDrawingMode(false);
    } else {
      setIsPreviewExpanded(false);
      setIsDrawingMode(false);
    }
  }, [layoutMode]);

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

  const handleImportSvgFromHeader = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".svg,.dxf";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        handleImportSvg(reader.result as string);
      };
      reader.readAsText(file);
    };
    input.click();
  }, [handleImportSvg]);

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
    setCamMode("manual");
    if (result.operations.length > 0) {
      setActiveOperationId(result.operations[0].id);
    }
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
      toolSettings: tool ? { feedXY: tool.feedXY, feedZ: tool.feedZ, spindleRpm: tool.spindleRpm } : {},
      operationDefaults: {},
      quality: intelligentQuality,
      workType: intelligentResult.geometryAnalysis.detectedWorkType,
      notes: "",
    });
    setShowSaveIntelligentTemplate(false);
    setIntelligentTemplateName("");
    toast.success("Template inteligente salvo!");
  };

  // ======================== Drawing & Vector Manipulation Handlers ========================
  const handleEditAction = useCallback((action: EditAction) => {
    if (selectedVectorIds.length === 0) {
      toast.error("Selecione um ou mais vetores primeiro.");
      return;
    }
    toast.info(`Ação "${action}" aplicada em ${selectedVectorIds.length} vetor(es)`);
  }, [selectedVectorIds]);

  const handleAddVector = useCallback((vector: SvgVector) => {
    setVectors(prev => [...prev, vector]);
    setSelectedVectorIds([vector.id]);
    toast.success(`Vetor "${vector.label}" criado`);
  }, []);

  const handleMoveVectors = useCallback((ids: string[], dx: number, dy: number) => {
    setVectors(prev => prev.map(v => {
      if (!ids.includes(v.id)) return v;
      const newPath = v.pathData.replace(
        /([MLHVCSQTAZ])\s*([\d.\-e]+(?:\s+[\d.\-e]+)*)/gi,
        (match, cmd: string, coords: string) => {
          const upper = cmd.toUpperCase();
          if (upper === 'Z' || upper === 'A') return match;
          if (cmd === cmd.toLowerCase()) return match; // relative commands unchanged
          const nums = coords.trim().split(/[\s,]+/).map(Number);
          if (upper === 'H') return `${cmd} ${nums[0] + dx}`;
          if (upper === 'V') return `${cmd} ${nums[0] + dy}`;
          const shifted = nums.map((n, i) => i % 2 === 0 ? n + dx : n + dy);
          return `${cmd} ${shifted.join(' ')}`;
        }
      );
      return {
        ...v,
        pathData: newPath,
        boundingBox: {
          ...v.boundingBox,
          x: v.boundingBox.x + dx,
          y: v.boundingBox.y + dy,
        },
      };
    }));
  }, []);

  const handleDeleteVectors = useCallback((ids: string[]) => {
    setVectors(prev => prev.filter(v => !ids.includes(v.id)));
    setSelectedVectorIds(prev => prev.filter(id => !ids.includes(id)));
    setOperations(prev => prev.map(op => ({
      ...op,
      vectorIds: op.vectorIds.filter(vid => !ids.includes(vid)),
    })));
    toast.success(`${ids.length} vetor(es) excluído(s)`);
  }, []);

  const handleGroupVectors = useCallback((ids: string[]) => {
    const groupId = `group-${Date.now()}`;
    setVectors(prev => prev.map(v =>
      ids.includes(v.id) ? { ...v, groupId, layer: `Grupo ${groupId.slice(-4)}` } : v
    ));
    toast.success(`${ids.length} vetores agrupados`);
  }, []);

  const handleUngroupVectors = useCallback((ids: string[]) => {
    setVectors(prev => prev.map(v =>
      ids.includes(v.id) ? { ...v, groupId: "", layer: "Desenho" } : v
    ));
    toast.success("Vetores desagrupados");
  }, []);

  const handleCreateToolpathFromSelection = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const selectedVecs = vectors.filter(v => ids.includes(v.id));
    const hasClosedOuter = selectedVecs.some(v => v.closed && (v.geometryClass === "contour-outer" || v.geometryClass === "pocket"));
    const hasHoles = selectedVecs.some(v => v.geometryClass === "hole");
    const allOpen = selectedVecs.every(v => !v.closed);

    const newOp = createDefaultOperation(operations.length + 1);
    newOp.vectorIds = [...ids];
    if (tools.length > 0) newOp.toolId = tools[0].id;

    if (hasHoles) {
      newOp.type = "drill";
      newOp.name = `Furação Seleção (${ids.length})`;
    } else if (hasClosedOuter) {
      newOp.type = "profile-outside";
      newOp.cutSide = "outside";
      newOp.name = `Perfil Externo Seleção (${ids.length})`;
    } else if (allOpen) {
      newOp.type = "on-line";
      newOp.cutSide = "on-line";
      newOp.name = `Percurso Linha Seleção (${ids.length})`;
    } else {
      newOp.type = "pocket";
      newOp.name = `Bolso Seleção (${ids.length})`;
    }

    setOperations(prev => [...prev, newOp]);
    setActiveOperationId(newOp.id);
    toast.success(`Percurso "${newOp.name}" criado com ${ids.length} vetor(es)`);
  }, [vectors, operations, tools]);

  // Keyboard shortcut: Delete selected vectors
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedVectorIds.length > 0 && !isDrawingMode) {
        handleDeleteVectors(selectedVectorIds);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedVectorIds, isDrawingMode, handleDeleteVectors]);

  // ======================== 3D Handlers ========================
  const handleAutoCam3D = useCallback(() => {
    if (!model3D) { toast.error("Importe um modelo 3D primeiro."); return; }
    const result = generateAutoCam3D(model3D, materialBlock, tools3D);
    setOperations3D(result.operations);
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
    if (result.operations.length > 0) setActiveOperation3DId(result.operations[0].id);
    const analysis = result.analysis;
    toast.success(
      `Auto-CAM 3D V5: ${result.operations.length} operações geradas\n` +
      `Análise: ${analysis.flatAreas} áreas planas, ${analysis.steepAreas} inclinadas, ${analysis.verticalWalls} verticais`
    );
  }, [model3D, materialBlock, tools3D]);

  const handleGenerateToolpaths3D = useCallback(() => {
    if (!model3D) { toast.error("Importe um modelo 3D primeiro."); return; }
    const enabledOps = operations3D.filter(op => op.enabled);
    if (enabledOps.length === 0) { toast.error("Nenhuma operação habilitada."); return; }
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
    id: `proj3d-${Date.now()}`, name: projectName, model: model3D, materialBlock,
    tools: tools3D, operations: operations3D, toolpaths: toolpaths3D,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });

  const handleSave3D = () => {
    const project = buildProject3D();
    const saveProject = { ...project, model: project.model ? { ...project.model, geometry: null, vertices: null } : null };
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

  // Determine visibility based on layout
  const showLeftPanel = leftPanelOpen && !isPreviewExpanded && layoutMode !== "preview";
  const showRightPanel = rightPanelOpen && !isPreviewExpanded && layoutMode !== "preview";
  const showBottomPanel = !isPreviewExpanded && bottomPanel !== null;

  // Toggle bottom panel
  const handleBottomTabClick = (tab: BottomPanel) => {
    setBottomPanel(prev => prev === tab ? null : tab);
  };

  // ======================== Render ========================

  // Voice mode
  if (camMode === "voice" && workMode === "2d") {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight">Gerador de Percurso</h1>
            <Badge variant="default" className="text-[9px] h-5">V8 Voz</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setCamMode("manual")}>
            <Wrench className="h-4 w-4 mr-1" /> Modo Manual
          </Button>
        </div>
        <div className="flex-1 flex">
          <div className="w-[400px] border-r border-border overflow-auto">
            <VoiceCamAssistant
              vectors={vectors} material={material} tools={tools} operations={operations}
              customPresets={customPresets} onMaterialChange={setMaterial}
              onOperationsChange={setOperations} onGenerateCam={handleAutoCam2D}
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

  // Automatic mode
  if (camMode === "automatic" && workMode === "2d") {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight">Gerador de Percurso</h1>
            <Badge variant="default" className="text-[9px] h-5">V8 Automático</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setCamMode("manual")}>
            <Wrench className="h-4 w-4 mr-1" /> Modo Manual
          </Button>
        </div>
        <div className="flex-1">
          <AutomaticCamWizard
            onComplete={handleIntelligentCamComplete}
            onCancel={() => setCamMode("manual")}
            tools={tools} customPresets={customPresets}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* ===== HEADER BAR ===== */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card/50 shrink-0 flex-wrap">
        {/* Left: title + mode */}
        <h1 className="text-sm font-bold tracking-tight shrink-0">Gerador de Percurso</h1>
        <Badge variant="outline" className="text-[9px] h-5 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 text-primary shrink-0">V8</Badge>

        <ToggleGroup type="single" value={workMode} onValueChange={(v) => v && setWorkMode(v as WorkMode)} className="h-7 shrink-0">
          <ToggleGroupItem value="2d" className="h-7 text-xs px-2.5 gap-1"><FileImage className="h-3 w-3" /> 2D</ToggleGroupItem>
          <ToggleGroupItem value="3d" className="h-7 text-xs px-2.5 gap-1"><Box className="h-3 w-3" /> 3D</ToggleGroupItem>
        </ToggleGroup>

        {workMode === "2d" && activePreset && (
          <Badge variant="outline" className="text-[9px] h-5 shrink-0">
            {activePreset.name}{isMetal(activePreset.category) && " ⚡"}{(activePreset as any).coolantRequired && " 💧"}
          </Badge>
        )}

        <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="h-7 w-36 text-xs shrink-0" />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: action buttons */}
        <div className="flex items-center gap-1 flex-wrap">
          {workMode === "2d" && (
            <>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleImportSvgFromHeader}>
                <Upload className="h-3.5 w-3.5" /> Importar Vetor
              </Button>
              <Button variant="default" size="sm" className="h-7 text-xs gap-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0" onClick={() => setCamMode("automatic")}>
                <Bot className="h-3.5 w-3.5" /> CAM Inteligente
              </Button>
              <Button variant="default" size="sm" className="h-7 text-xs gap-1" onClick={() => setCamMode("voice")}>
                <Mic className="h-3.5 w-3.5" /> Voz
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleAutoCam2D} disabled={vectors.length === 0}>
                <Wand2 className="h-3.5 w-3.5" /> Auto
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleValidate2D} disabled={operations.length === 0}>
                <AlertTriangle className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {workMode === "3d" && (
            <>
              <Button variant="default" size="sm" className="h-7 text-xs gap-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0" onClick={handleAutoCam3D} disabled={!model3D}>
                <Wand2 className="h-3.5 w-3.5" /> Auto CAM 3D
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleGenerateToolpaths3D} disabled={operations3D.length === 0}>
                <Sparkles className="h-3.5 w-3.5" /> Percursos
              </Button>
            </>
          )}

          <LayoutSelector layout={layoutMode} onChange={setLayoutMode} />

          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setTemplateName(""); setTemplateMaterial(""); setShowTemplateDialog(true); }}>
            <BookTemplate className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={workMode === "2d" ? handleLoad2D : () => {}}>
            <FolderOpen className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={workMode === "2d" ? handleSave2D : handleSave3D}>
            <Save className="h-3.5 w-3.5" />
          </Button>

          {workMode === "2d" && (
            <Button
              variant={isDrawingMode ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => {
                setIsDrawingMode(!isDrawingMode);
                if (!isDrawingMode) setLayoutMode("vectors");
                else setLayoutMode("default");
              }}
            >
              <PenTool className="h-3.5 w-3.5" /> Desenho
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => {
              setIsPreviewExpanded(!isPreviewExpanded);
              if (!isPreviewExpanded) setLayoutMode("preview");
              else setLayoutMode("default");
            }}
          >
            {isPreviewExpanded ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* ===== INFO BARS ===== */}
      {workMode === "2d" && issues.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 border-b border-border text-xs shrink-0">
          {errorCount > 0 && <Badge variant="destructive" className="text-[9px] h-5 gap-0.5 shrink-0"><AlertCircle className="h-3 w-3" /> {errorCount}</Badge>}
          {warningCount > 0 && <Badge variant="outline" className="text-[9px] h-5 gap-0.5 border-warning text-warning shrink-0"><AlertTriangle className="h-3 w-3" /> {warningCount}</Badge>}
          <ScrollArea className="flex-1"><div className="flex gap-2">{issues.slice(0, 3).map((issue, i) => (
            <span key={i} className={`shrink-0 ${issue.severity === "error" ? "text-destructive" : "text-warning"}`}>{issue.message}</span>
          ))}</div></ScrollArea>
        </div>
      )}

      {workMode === "2d" && autoCamResult && !intelligentResult && (
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border-b border-emerald-500/30 text-xs shrink-0">
          <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span className="text-foreground">{autoCamResult.summary.holes} furos, {autoCamResult.summary.pockets} bolsos, {autoCamResult.summary.outerContours} ext.</span>
          <Button variant="ghost" size="sm" className="h-5 text-[9px] ml-auto" onClick={() => setAutoCamResult(null)}>✕</Button>
        </div>
      )}

      {workMode === "2d" && intelligentResult && (
        <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-purple-500/30 text-xs shrink-0">
          <Bot className="h-3.5 w-3.5 text-purple-500 shrink-0" />
          <span className="text-foreground">{intelligentResult.operations.length} ops | {intelligentResult.timeEstimate.total.toFixed(1)} min</span>
          <Button variant="ghost" size="sm" className="h-5 text-[9px] ml-auto" onClick={() => setIntelligentResult(null)}>✕</Button>
        </div>
      )}

      {workMode === "3d" && model3D && (
        <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 border-b border-purple-500/30 text-xs shrink-0">
          <Box className="h-3.5 w-3.5 text-purple-500 shrink-0" />
          <span className="text-foreground">{model3D.name} | {model3D.dimensions.width.toFixed(1)}×{model3D.dimensions.depth.toFixed(1)}×{model3D.dimensions.height.toFixed(1)} mm</span>
          {timeEstimate3D && <Badge variant="outline" className="text-[9px] h-5 gap-1 ml-auto"><Clock className="h-3 w-3" />{timeEstimate3D.totalTime.toFixed(1)} min</Badge>}
        </div>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex min-h-0">
        {/* LEFT PANEL TOGGLE */}
        {!isPreviewExpanded && layoutMode !== "preview" && (
          <button
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            className="shrink-0 w-5 flex items-center justify-center border-r border-border bg-muted/30 hover:bg-accent transition-colors"
            title={leftPanelOpen ? "Recolher vetores" : "Expandir vetores"}
          >
            <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${leftPanelOpen ? "-rotate-90" : "rotate-90"}`} />
          </button>
        )}

        {/* LEFT PANEL */}
        {showLeftPanel && (
          <div className="w-56 border-r border-border overflow-auto shrink-0 p-2 space-y-2">
            {workMode === "2d" ? (
              <VectorsList
                vectors={vectors} selectedVectorIds={selectedVectorIds}
                onSelectVector={handleSelectVector} onImportSvg={handleImportSvg}
                onSelectAll={() => setSelectedVectorIds(vectors.map((v) => v.id))}
                onDeselectAll={() => setSelectedVectorIds([])}
              />
            ) : (
              <Model3DPanel model={model3D} materialBlock={materialBlock} onModelChange={setModel3D} onMaterialBlockChange={setMaterialBlock} />
            )}
          </div>
        )}

        {/* CENTER: Preview + Bottom panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Preview area */}
          <div className="flex-1 min-h-0 relative">
            {/* Pass layer slider */}
            {workMode === "2d" && maxPasses > 1 && (
              <div className="absolute top-2 right-14 z-10 flex items-center gap-2 px-2 py-1 bg-background/90 backdrop-blur rounded-md border border-border">
                <LayersIcon className="h-3 w-3 text-muted-foreground" />
                <Slider value={[activePassLayer ?? -1]} onValueChange={([v]) => setActivePassLayer(v === -1 ? null : v)} min={-1} max={maxPasses - 1} step={1} className="w-[120px]" />
                <span className="text-[10px] text-muted-foreground w-10">{activePassLayer === null ? "Todas" : `${activePassLayer + 1}/${maxPasses}`}</span>
              </div>
            )}

            {/* Drawing toolbar */}
            {workMode === "2d" && (
              <DrawingToolbar
                activeTool={drawingTool} onToolChange={setDrawingTool}
                onEditAction={handleEditAction}
                snapGrid={snapGrid} snapPoints={snapPoints} snapLines={snapLines}
                onSnapGridChange={setSnapGrid} onSnapPointsChange={setSnapPoints} onSnapLinesChange={setSnapLines}
                hasSelection={selectedVectorIds.length > 0}
                isDrawingMode={isDrawingMode} onDrawingModeChange={setIsDrawingMode}
              />
            )}

            {workMode === "2d" ? (
              <SvgCanvas
                vectors={vectors} material={material} operations={operations} tools={tools}
                selectedVectorIds={selectedVectorIds} activeOperationId={activeOperationId}
                showToolpath={showToolpath} onSelectVector={handleSelectVector} viewBox={viewBox}
                issues={issues} activePassLayer={activePassLayer}
              />
            ) : (
              <Simulation3DAdvanced model={model3D} materialBlock={materialBlock} operations={operations3D} tools={tools3D} toolpaths={toolpaths3D} />
            )}
          </div>

          {/* ===== BOTTOM TABS BAR ===== */}
          <div className="shrink-0 border-t border-border">
            {/* Tab buttons - compact bar */}
            <div className="flex items-center gap-1 px-2 py-1 bg-muted/30">
              <TabButton active={bottomPanel === "operations"} onClick={() => handleBottomTabClick("operations")}>
                Operações
              </TabButton>
              <TabButton active={bottomPanel === "simulation"} onClick={() => handleBottomTabClick("simulation")}>
                Simulação
              </TabButton>
              <TabButton active={bottomPanel === "gcode"} onClick={() => handleBottomTabClick("gcode")}>
                G-Code
              </TabButton>
              {workMode === "2d" && intelligentResult && (
                <TabButton active={bottomPanel === "intelligent"} onClick={() => handleBottomTabClick("intelligent")}>
                  <Bot className="h-3 w-3" /> Resumo V6
                </TabButton>
              )}
              {workMode === "2d" && (
                <TabButton active={bottomPanel === "validation"} onClick={() => handleBottomTabClick("validation")}>
                  Validação {issues.length > 0 && <Badge variant="destructive" className="ml-1 h-4 text-[8px] px-1">{issues.length}</Badge>}
                </TabButton>
              )}
              <div className="flex-1" />
              {bottomPanel && (
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setBottomPanel(null)}>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Panel content */}
            {showBottomPanel && (
              <div className="h-52 overflow-auto border-t border-border">
                {bottomPanel === "operations" && (
                  <div className="p-2">
                    {workMode === "2d" ? (
                      <OperationsList operations={operations} tools={tools} vectors={vectors}
                        activeOperationId={activeOperationId} showToolpath={showToolpath}
                        onSetActive={setActiveOperationId} onChangeOperations={setOperations} onToggleToolpath={toggleToolpath} />
                    ) : (
                      <Operation3DPanel operations={operations3D} tools={tools3D} onOperationsChange={setOperations3D}
                        activeOperationId={activeOperation3DId} onSetActiveOperation={setActiveOperation3DId} />
                    )}
                  </div>
                )}
                {bottomPanel === "simulation" && (
                  <div className="h-full">
                    {workMode === "2d" ? (
                      <Simulation3D material={material} operations={operations} tools={tools} vectors={vectors} />
                    ) : (
                      <Simulation3DAdvanced model={model3D} materialBlock={materialBlock} operations={operations3D} tools={tools3D} toolpaths={toolpaths3D} />
                    )}
                  </div>
                )}
                {bottomPanel === "gcode" && (
                  <div className="p-2">
                    {workMode === "2d" ? (
                      <GcodePanel project={buildProject2D()} />
                    ) : (
                      <GcodePanel3D project={buildProject3D()} timeEstimate={timeEstimate3D} />
                    )}
                  </div>
                )}
                {bottomPanel === "intelligent" && workMode === "2d" && intelligentResult && (
                  <div className="h-full overflow-hidden">
                    <IntelligentSummary result={intelligentResult} material={material} preset={activePreset} quality={intelligentQuality}
                      onRegenerate={() => setCamMode("automatic")} onSaveTemplate={() => setShowSaveIntelligentTemplate(true)} />
                  </div>
                )}
                {bottomPanel === "validation" && workMode === "2d" && (
                  <div className="p-2 space-y-2">
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
                      <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={handleValidate2D}>Revalidar</Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL TOGGLE */}
        {!isPreviewExpanded && layoutMode !== "preview" && (
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="shrink-0 w-5 flex items-center justify-center border-l border-border bg-muted/30 hover:bg-accent transition-colors"
            title={rightPanelOpen ? "Recolher material" : "Expandir material"}
          >
            <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${rightPanelOpen ? "rotate-90" : "-rotate-90"}`} />
          </button>
        )}

        {/* RIGHT PANEL */}
        {showRightPanel && (
          <div className="w-60 border-l border-border overflow-auto shrink-0 p-2 space-y-2">
            {workMode === "2d" ? (
              <>
                <MaterialPanel material={material} onChange={setMaterial} customPresets={customPresets}
                  onChangeCustomPresets={handleCustomPresetsChange} tools={tools} onToolsSuggestion={setTools} />
                {templates.length > 0 && (
                  <Card className="border-border">
                    <CardHeader className="pb-1 pt-3 px-3">
                      <CardTitle className="text-xs flex items-center gap-1.5"><BookTemplate className="h-3 w-3 text-primary" /> Templates</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-2">
                      <div className="space-y-0.5">
                        {templates.slice(0, 5).map((tpl) => (
                          <div key={tpl.id} className="flex items-center justify-between text-[10px] hover:bg-accent/50 rounded px-1.5 py-0.5 cursor-pointer" onClick={() => handleLoadTemplate(tpl)}>
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
                <Tools3DLibrary tools={tools3D} onToolsChange={setTools3D} selectedToolId={selectedTool3DId} onSelectTool={setSelectedTool3DId} />
                <Operation3DPanel operations={operations3D} tools={tools3D} onOperationsChange={setOperations3D}
                  activeOperationId={activeOperation3DId} onSetActiveOperation={setActiveOperation3DId} />
              </>
            )}
          </div>
        )}
      </div>

      {/* ===== DIALOGS ===== */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Salvar Template de Usinagem</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Nome do Template</Label><Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Ex: Corte MDF 15mm" className="h-8 text-xs" /></div>
            <div><Label className="text-xs">Material</Label><Input value={templateMaterial} onChange={(e) => setTemplateMaterial(e.target.value)} placeholder="Ex: MDF, ACM, Acrílico..." className="h-8 text-xs" /></div>
          </div>
          <DialogFooter><Button size="sm" onClick={handleSaveTemplate} disabled={!templateName}>Salvar Template</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSaveIntelligentTemplate} onOpenChange={setShowSaveIntelligentTemplate}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Salvar Template Inteligente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Nome do Template</Label><Input value={intelligentTemplateName} onChange={(e) => setIntelligentTemplateName(e.target.value)} placeholder="Ex: MDF 15mm Alta Qualidade" className="h-8 text-xs" /></div>
          </div>
          <DialogFooter><Button size="sm" onClick={handleSaveIntelligentTemplate} disabled={!intelligentTemplateName}>Salvar Template</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Compact tab button component
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}
