import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { ZMappingAnimation } from "@/components/ZMappingAnimation";
import { CompensationSimulator3D } from "@/components/z-mapping/CompensationSimulator3D";
import { GcodePreview } from "@/components/z-mapping/GcodePreview";
import { ZMappingWizard } from "@/components/z-mapping/ZMappingWizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Upload, Grid3x3, Download, CheckCircle2, FileUp, Settings2, ChevronDown,
  Play, Timer, Cpu, Layers, PenTool, AlertTriangle, ShieldCheck, Wand2,
  Save, Box, Crosshair, HelpCircle, Monitor, BarChart3, Activity,
  FileCode, Maximize2, RotateCcw, ArrowUp, ArrowRight, SquareDashedBottomCode,
  Scan, Target, Info, Gauge, Eye,
} from "lucide-react";
import { EnhancedHelpTip, PARAM_HELP } from "@/components/z-mapping/VisualHelpSystem";
import {
  analyzeGcode, generateMesh, generateUnifiedGcode, analyzeDensity, generateAdaptiveMesh, generateDenseMesh,
  defaultConfigMM, defaultConfigInch,
  fmt, type ZUnit, type GcodeAnalysis, type MeshConfig,
  type ControllerType, type UnifiedResult, type DensityMap,
  type RetractionMode, type RetractionConfig,
  type ProbeType, type CustomProbeConfig, type PostMappingMode, type ToolMeasureConfig,
} from "@/lib/z-mapping-engine";

/* ── localStorage persistence ──────────────────────────── */
const STORAGE_KEY = "zmapping-settings";

interface SavedSettings {
  probeFeed: number;
  probeDepth: number;
  safeHeight: number;
  spacingX: number;
  spacingY: number;
  clearance: number;
  maxSegmentLen: number;
  decimalPlaces: number;
  controller: ControllerType;
  curvePrecision: CurvePrecision;
  touchPrecision: TouchPrecision;
  customTouches: number | null;
  touchStrategy: "last" | "average";
  outOfMeshRule: "block" | "warn" | "nearest";
  unit: ZUnit;
  areaMode: AreaMode;
  buffer: number;
  mappingPrecision: MappingPrecision;
}

function loadSettings(): Partial<SavedSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveSettings(s: SavedSettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

/* ── Curve precision presets ───────────────────────────── */
type CurvePrecision = "high" | "medium" | "fast";

function getArcSegmentLen(precision: CurvePrecision, unit: ZUnit): number {
  if (unit === "mm") {
    if (precision === "high") return 0.5;
    if (precision === "medium") return 1.0;
    return 2.0;
  }
  if (precision === "high") return 0.02;
  if (precision === "medium") return 0.04;
  return 0.08;
}

/* ── Touch precision presets ───────────────────────────── */
type TouchPrecision = "fast" | "normal" | "high";

function getTouchCount(precision: TouchPrecision): number {
  if (precision === "fast") return 1;
  if (precision === "normal") return 2;
  return 3;
}

/* ── Area mode ───────────────────────────── */
type AreaMode = "auto" | "manual";

/* ── Mapping precision ───────────────────── */
type MappingPrecision = "uniform" | "smart" | "maximum";

/* ── Engraving mode ──────────────────────── */
type EngravingMode = "standard" | "curved" | "vbit-curved";
type VbitCompMode = "off" | "basic" | "advanced";
type ToolTypeOption = "straight" | "fine-tip" | "vbit";

/* ── View mode for central area ──────────── */
type ViewMode = "gcode" | "surface" | "simulation";

/* ── Inline description texts for explanations mode ──── */
const INLINE_DESCRIPTIONS: Record<string, string> = {
  safeHeight: "Altura usada para movimentações rápidas da ferramenta sem tocar na peça.",
  spacingX: "Define o espaçamento entre os pontos de medição no sentido horizontal.",
  spacingY: "Define o espaçamento entre os pontos de medição no sentido vertical.",
  probeFeed: "Velocidade usada quando o probe desce para tocar a superfície da peça.",
  probeDepth: "Limite máximo que a máquina pode descer procurando a superfície.",
  touchPrecision: "Quantas vezes cada ponto será medido para aumentar a precisão.",
  mappingUniform: "Define a estratégia usada para medir a superfície da peça.",
  vbitComp: "Ajusta a profundidade da gravação considerando a inclinação da superfície.",
  probeOffset: "Distância entre o probe e o centro da ferramenta.",
  retraction: "Define como a ferramenta se desloca entre os pontos de medição.",
};

/* ── Help tooltip (uses VisualHelpSystem) ────────────── */
function HelpTip({ text }: { text: string }) {
  return <EnhancedHelpTip text={text} />;
}

export default function ZMappingPage() {
  const saved = useMemo(() => loadSettings(), []);

  const [showAnimation, setShowAnimation] = useState(false);
  const [wizardMode, setWizardMode] = useState(false);
  const [originalGcode, setOriginalGcode] = useState("");
  const [originalFileName, setOriginalFileName] = useState("");
  const [analysis, setAnalysis] = useState<GcodeAnalysis | null>(null);

  const [unit, setUnit] = useState<ZUnit>(saved.unit ?? "mm");
  const defaults = unit === "mm" ? defaultConfigMM : defaultConfigInch;
  const [xStart, setXStart] = useState(0);
  const [yStart, setYStart] = useState(0);
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(100);

  const [manualXStart, setManualXStart] = useState(0);
  const [manualYStart, setManualYStart] = useState(0);
  const [manualWidth, setManualWidth] = useState(100);
  const [manualHeight, setManualHeight] = useState(100);

  const [spacingX, setSpacingX] = useState(saved.spacingX ?? defaults.spacing);
  const [spacingY, setSpacingY] = useState(saved.spacingY ?? defaults.spacing);
  const [probeFeed, setProbeFeed] = useState(saved.probeFeed ?? defaults.probeFeed);
  const [probeDepth, setProbeDepth] = useState(saved.probeDepth ?? defaults.probeDepth);
  const [clearance, setClearance] = useState(saved.clearance ?? defaults.clearance);
  const [safeHeight, setSafeHeight] = useState(saved.safeHeight ?? defaults.safeHeight);
  const [maxSegmentLen, setMaxSegmentLen] = useState(saved.maxSegmentLen ?? defaults.maxSegmentLen);
  const [decimalPlaces, setDecimalPlaces] = useState(saved.decimalPlaces ?? defaults.decimalPlaces);
  const [outOfMeshRule, setOutOfMeshRule] = useState<"block" | "warn" | "nearest">(saved.outOfMeshRule ?? "warn");
  const [tolerance, setTolerance] = useState(defaults.tolerance);
  const [controller, setController] = useState<ControllerType>(saved.controller ?? "mach3");

  const [areaMode, setAreaMode] = useState<AreaMode>(saved.areaMode ?? "auto");
  const [buffer, setBuffer] = useState(saved.buffer ?? 5);
  const [mappingPrecision, setMappingPrecision] = useState<MappingPrecision>(saved.mappingPrecision ?? "uniform");
  const [curvePrecision, setCurvePrecision] = useState<CurvePrecision>(saved.curvePrecision ?? "medium");
  const [customArcSegLen, setCustomArcSegLen] = useState<number | null>(null);
  const arcSegmentLen = customArcSegLen ?? getArcSegmentLen(curvePrecision, unit);
  const [touchPrecision, setTouchPrecision] = useState<TouchPrecision>(saved.touchPrecision ?? "normal");
  const [customTouches, setCustomTouches] = useState<number | null>(saved.customTouches ?? null);
  const [touchStrategy, setTouchStrategy] = useState<"last" | "average">(saved.touchStrategy ?? "last");
  const touchesPerPoint = customTouches ?? getTouchCount(touchPrecision);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [result, setResult] = useState<UnifiedResult | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("gcode");
  const [showExplanations, setShowExplanations] = useState(() => {
    try { return localStorage.getItem("zmapping-show-explanations") !== "false"; } catch { return true; }
  });

  const [engravingMode, setEngravingMode] = useState<EngravingMode>("standard");
  const [vbitCompMode, setVbitCompMode] = useState<VbitCompMode>("off");
  const [toolType, setToolType] = useState<ToolTypeOption>("straight");
  const [vbitAngle, setVbitAngle] = useState(90);
  const [nominalDepth, setNominalDepth] = useState(unit === "mm" ? 0.3 : 0.012);
  const [slopeWarningThreshold] = useState(20);

  const [retractionMode, setRetractionMode] = useState<RetractionMode>("standard");
  const [retMinSafeZ, setRetMinSafeZ] = useState(unit === "mm" ? 2 : 0.08);
  const [retAdaptiveClearance, setRetAdaptiveClearance] = useState(unit === "mm" ? 3 : 0.12);
  const [retReinforcedClearance, setRetReinforcedClearance] = useState(unit === "mm" ? 5 : 0.2);

  // Custom probe
  const [probeType, setProbeType] = useState<ProbeType>("standard");
  const [cpOffsetX, setCpOffsetX] = useState(0);
  const [cpOffsetY, setCpOffsetY] = useState(0);
  const [cpOffsetZ, setCpOffsetZ] = useState(0);
  const [cpStartCmd, setCpStartCmd] = useState("M11");
  const [cpStartDwell, setCpStartDwell] = useState(1);
  const [cpStartSafeZ, setCpStartSafeZ] = useState(unit === "mm" ? 20 : 1);
  const [cpEndCmd, setCpEndCmd] = useState("M10");
  const [cpEndDwell, setCpEndDwell] = useState(1);
  const [cpEndSafeZ, setCpEndSafeZ] = useState(unit === "mm" ? 20 : 1);

  // Post-mapping mode
  const [postMappingMode, setPostMappingMode] = useState<PostMappingMode>("manual");
  const [cpToolOffsetZ, setCpToolOffsetZ] = useState(0);
  const [cpPostSafeZ, setCpPostSafeZ] = useState(unit === "mm" ? 20 : 1);
  const [cpMeasureX, setCpMeasureX] = useState(0);
  const [cpMeasureY, setCpMeasureY] = useState(0);
  const [cpMeasureCmd, setCpMeasureCmd] = useState("G31 Z-50 F100");
  const [cpMeasureDwell, setCpMeasureDwell] = useState(1);

  const fileRef = useRef<HTMLInputElement>(null);

  const effectiveXStart = areaMode === "auto" ? xStart : manualXStart;
  const effectiveYStart = areaMode === "auto" ? yStart : manualYStart;
  const effectiveWidth = areaMode === "auto" ? width : manualWidth;
  const effectiveHeight = areaMode === "auto" ? height : manualHeight;

  const spacing = (spacingX + spacingY) / 2;

  useEffect(() => {
    saveSettings({
      probeFeed, probeDepth, safeHeight, spacingX, spacingY,
      clearance, maxSegmentLen, decimalPlaces, controller,
      curvePrecision, touchPrecision, customTouches, touchStrategy,
      outOfMeshRule, unit, areaMode, buffer, mappingPrecision,
    });
  }, [probeFeed, probeDepth, safeHeight, spacingX, spacingY,
      clearance, maxSegmentLen, decimalPlaces, controller,
      curvePrecision, touchPrecision, customTouches, touchStrategy,
      outOfMeshRule, unit, areaMode, buffer, mappingPrecision]);

  const densityMap = useMemo<DensityMap | null>(() => {
    if (mappingPrecision !== "smart" || !originalGcode || effectiveWidth <= 0 || effectiveHeight <= 0) return null;
    const cellCount = Math.max(4, Math.min(20, Math.round(Math.max(effectiveWidth, effectiveHeight) / spacing)));
    return analyzeDensity(originalGcode, effectiveXStart, effectiveYStart, effectiveWidth, effectiveHeight, cellCount, cellCount, arcSegmentLen);
  }, [mappingPrecision, originalGcode, effectiveXStart, effectiveYStart, effectiveWidth, effectiveHeight, spacing, arcSegmentLen]);

  const config: MeshConfig = useMemo(() => ({
    unit,
    xStart: effectiveXStart,
    yStart: effectiveYStart,
    width: effectiveWidth,
    height: effectiveHeight,
    spacing, probeFeed, probeDepth,
    clearance, safeHeight, maxSegmentLen, arcSegmentLen, decimalPlaces, outOfMeshRule, tolerance,
  }), [unit, effectiveXStart, effectiveYStart, effectiveWidth, effectiveHeight, spacing, probeFeed, probeDepth,
    clearance, safeHeight, maxSegmentLen, arcSegmentLen, decimalPlaces, outOfMeshRule, tolerance]);

  const mesh = useMemo(() => {
    if (effectiveWidth <= 0 || effectiveHeight <= 0 || spacing <= 0) return null;
    if (mappingPrecision === "smart" && densityMap) {
      return generateAdaptiveMesh(config, densityMap, 2.0, 0.5);
    }
    if (mappingPrecision === "maximum") {
      return generateDenseMesh(config, 0.5);
    }
    return generateMesh(config);
  }, [config, effectiveWidth, effectiveHeight, spacing, mappingPrecision, densityMap]);

  const uniformPointCount = useMemo(() => {
    if (effectiveWidth <= 0 || effectiveHeight <= 0 || spacing <= 0) return 0;
    const sx = Math.max(1, Math.round(effectiveWidth / spacing));
    const sy = Math.max(1, Math.round(effectiveHeight / spacing));
    return (sx + 1) * (sy + 1);
  }, [effectiveWidth, effectiveHeight, spacing]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOriginalFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setOriginalGcode(text);
      const a = analyzeGcode(text);
      setAnalysis(a);
      if (a.unit) {
        setUnit(a.unit);
        const d = a.unit === "mm" ? defaultConfigMM : defaultConfigInch;
        const s = loadSettings();
        if (!s.spacingX) setSpacingX(d.spacing);
        if (!s.spacingY) setSpacingY(d.spacing);
        if (!s.probeFeed) setProbeFeed(d.probeFeed);
        if (!s.probeDepth) setProbeDepth(d.probeDepth);
        if (!s.clearance) setClearance(d.clearance);
        if (!s.safeHeight) setSafeHeight(d.safeHeight);
        if (!s.maxSegmentLen) setMaxSegmentLen(d.maxSegmentLen);
        setTolerance(d.tolerance);
        setCustomArcSegLen(null);
        if (!s.buffer) setBuffer(a.unit === "mm" ? 5 : 0.2);
      }
      if (a.width > 0) {
        const buf = loadSettings().buffer ?? (a.unit === "mm" ? 5 : 0.2);
        const autoX = parseFloat((a.xMin - buf).toFixed(3));
        const autoY = parseFloat((a.yMin - buf).toFixed(3));
        const autoW = parseFloat((a.width + buf * 2).toFixed(3));
        const autoH = parseFloat((a.height + buf * 2).toFixed(3));
        setXStart(autoX);
        setYStart(autoY);
        setWidth(autoW);
        setHeight(autoH);
        setManualXStart(parseFloat(a.xMin.toFixed(3)));
        setManualYStart(parseFloat(a.yMin.toFixed(3)));
        setManualWidth(parseFloat(a.width.toFixed(3)));
        setManualHeight(parseFloat(a.height.toFixed(3)));
      }
      toast.success("Arquivo carregado com sucesso");
    };
    reader.readAsText(file);
  }, []);

  useEffect(() => {
    if (areaMode === "auto" && analysis && analysis.width > 0) {
      setXStart(parseFloat((analysis.xMin - buffer).toFixed(3)));
      setYStart(parseFloat((analysis.yMin - buffer).toFixed(3)));
      setWidth(parseFloat((analysis.width + buffer * 2).toFixed(3)));
      setHeight(parseFloat((analysis.height + buffer * 2).toFixed(3)));
    }
  }, [buffer, areaMode, analysis]);

  const handleGenerate = useCallback(() => {
    if (!mesh || !originalGcode) {
      toast.error("Carregue um arquivo G-code primeiro.");
      return;
    }
    try {
      const retractionCfg: RetractionConfig = {
        mode: retractionMode,
        minSafeZ: retMinSafeZ,
        adaptiveClearance: retAdaptiveClearance,
        reinforcedClearance: retReinforcedClearance,
      };
      const customProbeCfg: CustomProbeConfig | undefined = probeType === "custom" ? {
        enabled: true,
        offsetX: cpOffsetX,
        offsetY: cpOffsetY,
        offsetZ: cpOffsetZ,
        startCommand: cpStartCmd,
        startDwell: cpStartDwell,
        startSafeZ: cpStartSafeZ,
        endCommand: cpEndCmd,
        endDwell: cpEndDwell,
        endSafeZ: cpEndSafeZ,
        postMappingMode,
        toolOffsetZ: cpToolOffsetZ,
        postSafeZ: cpPostSafeZ,
        toolMeasure: postMappingMode === "auto_measure" ? {
          measureX: cpMeasureX,
          measureY: cpMeasureY,
          measureCommand: cpMeasureCmd,
          measureDwell: cpMeasureDwell,
        } : undefined,
      } : undefined;
      const r = generateUnifiedGcode(
        originalGcode, mesh, config, originalFileName || "file", controller,
        touchesPerPoint, touchStrategy, retractionCfg, customProbeCfg
      );
      setResult(r);
      toast.success("Arquivo de nivelamento gerado!");
    } catch (err: any) {
      console.error("Erro ao gerar arquivo:", err);
      toast.error("Erro ao gerar arquivo: " + (err?.message || "erro desconhecido"));
    }
  }, [mesh, originalGcode, config, originalFileName, controller, touchesPerPoint, touchStrategy, retractionMode, retMinSafeZ, retAdaptiveClearance, retReinforcedClearance, probeType, cpOffsetX, cpOffsetY, cpOffsetZ, cpStartCmd, cpStartDwell, cpStartSafeZ, cpEndCmd, cpEndDwell, cpEndSafeZ, postMappingMode, cpToolOffsetZ, cpPostSafeZ, cpMeasureX, cpMeasureY, cpMeasureCmd, cpMeasureDwell]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    const blob = new Blob([result.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = result.fileName; a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const formatTime = (sec: number) => {
    const adjusted = sec * touchesPerPoint;
    if (adjusted < 60) return `${adjusted}s`;
    const m = Math.floor(adjusted / 60);
    const s = adjusted % 60;
    return s > 0 ? `${m}min ${s}s` : `${m}min`;
  };

  const toggleExplanations = useCallback((v: boolean) => {
    setShowExplanations(v);
    try { localStorage.setItem("zmapping-show-explanations", String(v)); } catch {}
  }, []);

  const numField = (label: string, value: number, onChange: (v: number) => void, step?: number, help?: string, helpKey?: string) => (
    <div className="space-y-1">
      <Label className="text-[11px] flex items-center gap-1">
        {label}
        {showExplanations && helpKey && PARAM_HELP[helpKey] ? (
          <EnhancedHelpTip {...PARAM_HELP[helpKey]} />
        ) : showExplanations && help ? (
          <EnhancedHelpTip text={help} />
        ) : null}
      </Label>
      <Input type="number" value={value} step={step ?? (unit === "mm" ? 1 : 0.01)}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
      {showExplanations && helpKey && INLINE_DESCRIPTIONS[helpKey] && (
        <p className="text-[10px] text-muted-foreground leading-relaxed">{INLINE_DESCRIPTIONS[helpKey]}</p>
      )}
      {showExplanations && help && !helpKey && (
        <p className="text-[10px] text-muted-foreground leading-relaxed">{help}</p>
      )}
    </div>
  );

  const handleSaveConfig = useCallback(() => {
    toast.success("Configurações salvas com sucesso!");
  }, []);

  if (wizardMode) {
    return (
      <ZMappingWizard
        onClose={() => setWizardMode(false)}
        originalGcode={originalGcode}
        originalFileName={originalFileName}
        analysis={analysis}
        onFileUpload={handleFileUpload}
        fileRef={fileRef}
        unit={unit}
        safeHeight={safeHeight} setSafeHeight={setSafeHeight}
        spacingX={spacingX} setSpacingX={setSpacingX}
        spacingY={spacingY} setSpacingY={setSpacingY}
        probeFeed={probeFeed} setProbeFeed={setProbeFeed}
        mappingPrecision={mappingPrecision} setMappingPrecision={setMappingPrecision}
        retractionMode={retractionMode} setRetractionMode={setRetractionMode}
        retMinSafeZ={retMinSafeZ} setRetMinSafeZ={setRetMinSafeZ}
        retAdaptiveClearance={retAdaptiveClearance} setRetAdaptiveClearance={setRetAdaptiveClearance}
        engravingMode={engravingMode} setEngravingMode={setEngravingMode}
        vbitAngle={vbitAngle} setVbitAngle={setVbitAngle}
        nominalDepth={nominalDepth} setNominalDepth={setNominalDepth}
        mesh={mesh}
        config={config}
        densityMap={densityMap}
        onGenerate={handleGenerate}
        onDownload={handleDownload}
        result={result}
        showSimulator={showSimulator}
        setShowSimulator={setShowSimulator}
      />
    );
  }

  // ── Status pipeline for bottom bar
  const pipeline = [
    { label: "Arquivo", done: !!originalFileName },
    { label: "Área detectada", done: !!analysis },
    { label: "Malha pronta", done: !!mesh },
    { label: "Compensação", done: !!result },
    { label: "Exportação", done: !!result },
  ];

  const pointsX = mesh ? mesh.pointsPerRow : 0;
  const pointsY = mesh ? mesh.rows : 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* ══════════════ TOP TOOLBAR ══════════════ */}
      <div className="shrink-0 border-b border-border bg-card px-4 py-0">
        <div className="flex items-center h-12 gap-4">
          {/* Left: branding */}
          <div className="flex items-center gap-2.5 min-w-0 shrink-0">
            <div className="h-7 w-7 rounded bg-primary/15 flex items-center justify-center">
              <Grid3x3 className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-bold tracking-tight text-foreground leading-none">Mapeamento Z</h1>
              <p className="text-[9px] text-muted-foreground leading-tight mt-0.5 truncate max-w-[240px]">
                {analysis
                  ? `${originalFileName} · ${fmt(analysis.width)}×${fmt(analysis.height)} ${unit}`
                  : "Correção automática de usinagem em superfícies planas, curvas ou inclinadas"}
              </p>
            </div>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Center actions */}
          <div className="flex items-center gap-1 flex-1 justify-center">
            <input ref={fileRef} type="file" accept=".nc,.tap,.gcode,.txt" className="hidden" onChange={handleFileUpload} />
            <TooltipProvider delayDuration={300}>
              <Tooltip><TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[11px] gap-1.5" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-3 w-3" /> <span className="hidden lg:inline">Carregar</span>
                </Button>
              </TooltipTrigger><TooltipContent className="text-xs">Carregar arquivo G-code</TooltipContent></Tooltip>

              <Tooltip><TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[11px] gap-1.5" onClick={() => setWizardMode(true)}>
                  <Wand2 className="h-3 w-3" /> <span className="hidden lg:inline">Assistente</span>
                </Button>
              </TooltipTrigger><TooltipContent className="text-xs">Modo assistente guiado</TooltipContent></Tooltip>

              {analysis && mesh && originalGcode && (
                <Tooltip><TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[11px] gap-1.5"
                    onClick={() => { setShowSimulator(true); setViewMode("simulation"); }}>
                    <Box className="h-3 w-3" /> <span className="hidden lg:inline">3D</span>
                  </Button>
                </TooltipTrigger><TooltipContent className="text-xs">Simulação 3D</TooltipContent></Tooltip>
              )}

              <Separator orientation="vertical" className="h-5 mx-1" />

              <Button size="sm" className="h-7 px-3 text-[11px] gap-1.5 bg-primary hover:bg-primary/90" onClick={handleGenerate}
                disabled={!mesh || !originalGcode}>
                <Play className="h-3 w-3" /> Gerar
              </Button>

              {result && (
                <Button size="sm" variant="outline" className="h-7 px-3 text-[11px] gap-1.5 border-primary/30 text-primary hover:bg-primary/10" onClick={handleDownload}>
                  <Download className="h-3 w-3" /> Baixar
                </Button>
              )}
            </TooltipProvider>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Right: toggle + info */}
          <div className="flex items-center gap-2 shrink-0">
            <Label htmlFor="show-explanations" className="text-[9px] text-muted-foreground cursor-pointer select-none">
              Explicações
            </Label>
            <Switch id="show-explanations" checked={showExplanations} onCheckedChange={toggleExplanations}
              className="h-4 w-7 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-3" />
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowAnimation(s => !s)}>
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>

      {showAnimation && (
        <div className="shrink-0">
          <ZMappingAnimation onClose={() => setShowAnimation(false)} />
        </div>
      )}

      {/* ══════════════ MAIN CONTENT: 3-panel layout ══════════════ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT PANEL: Parameters ── */}
        <div className="w-[240px] shrink-0 border-r border-border bg-card/60 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Settings2 className="h-3 w-3" /> Parâmetros
            </span>
            <Badge variant="outline" className="text-[8px] h-4 px-1.5 border-border">{unit}</Badge>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2.5 space-y-3">
              {/* ─── Measurement ─── */}
              <SectionLabel icon={<Scan className="h-3 w-3" />} label="Medição" />
              <div className="space-y-2">
                {numField(`Altura segura (${unit})`, safeHeight, setSafeHeight, undefined, undefined, "safeHeight")}
                <div className="grid grid-cols-2 gap-1.5">
                  {numField(`Dist. X`, spacingX, setSpacingX, undefined, undefined, "spacingX")}
                  {numField(`Dist. Y`, spacingY, setSpacingY, undefined, undefined, "spacingY")}
                </div>
                {numField(`Vel. toque (${unit}/min)`, probeFeed, setProbeFeed, undefined, undefined, "probeFeed")}
              </div>

              <Separator className="opacity-50" />

              {/* ─── Engraving mode ─── */}
              <SectionLabel icon={<PenTool className="h-3 w-3" />} label="Gravação" />
              {showExplanations && <p className="text-[9px] text-muted-foreground -mt-1">Tipo de compensação aplicada ao percurso.</p>}
              <RadioGroup value={engravingMode} onValueChange={(v) => setEngravingMode(v as EngravingMode)} className="space-y-0.5">
                <RadioOption value="standard" id="eng-std" label="Normal" />
                <RadioOption value="curved" id="eng-curved" label="Superfície curva" />
                <RadioOption value="vbit-curved" id="eng-vbit" label="V-bit curva" />
              </RadioGroup>
              {toolType === "vbit" && (
                <div className="space-y-1.5 bg-muted/30 rounded-md p-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Ângulo V-bit</Label>
                    <Select value={String(vbitAngle)} onValueChange={(v) => setVbitAngle(Number(v))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[30, 45, 60, 90].map(a => <SelectItem key={a} value={String(a)}>{a}°</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {numField(`Prof. (${unit})`, nominalDepth, setNominalDepth, unit === "mm" ? 0.05 : 0.002)}
                  <p className="text-[9px] text-muted-foreground">
                    Largura: <strong className="text-foreground">{fmt(2 * nominalDepth * Math.tan((vbitAngle / 2) * Math.PI / 180), 3)} {unit}</strong>
                  </p>
                </div>
              )}

              <Separator className="opacity-50" />

              {/* ─── Mapping mode ─── */}
              <SectionLabel icon={<Crosshair className="h-3 w-3" />} label="Mapeamento" />
              {showExplanations && <p className="text-[9px] text-muted-foreground -mt-1">Estratégia de distribuição dos pontos.</p>}
              <RadioGroup value={mappingPrecision} onValueChange={(v) => setMappingPrecision(v as MappingPrecision)} className="space-y-0.5">
                <RadioOption value="uniform" id="map-uni" label="Grade uniforme" />
                <RadioOption value="smart" id="map-smart" label="Inteligente" />
                <RadioOption value="maximum" id="map-max" label="Máxima" />
              </RadioGroup>

              <Separator className="opacity-50" />

              {/* ─── Retraction ─── */}
              <SectionLabel icon={<ShieldCheck className="h-3 w-3" />} label="Deslocamento" />
              {showExplanations && <p className="text-[9px] text-muted-foreground -mt-1">Segurança entre pontos de medição.</p>}
              <RadioGroup value={retractionMode} onValueChange={(v) => setRetractionMode(v as RetractionMode)} className="space-y-0.5">
                <RadioOption value="standard" id="ret-std" label="Padrão" />
                <RadioOption value="safe" id="ret-safe" label="Seguro" />
                <RadioOption value="curved" id="ret-curv" label="Curva" />
              </RadioGroup>
              {retractionMode !== "standard" && (
                <div className="space-y-1.5 bg-muted/30 rounded-md p-2">
                  {numField(`Z seguro mín.`, retMinSafeZ, setRetMinSafeZ, 0.5)}
                  {numField(`Margem adapt.`, retAdaptiveClearance, setRetAdaptiveClearance, 0.5)}
                  {retractionMode === "curved" && numField(`Margem reforç.`, retReinforcedClearance, setRetReinforcedClearance, 0.5)}
                </div>
              )}

              <Separator className="opacity-50" />

              {/* ─── Tool ─── */}
              <SectionLabel icon={<Target className="h-3 w-3" />} label="Ferramenta" />
              <RadioGroup value={toolType} onValueChange={(v) => {
                setToolType(v as ToolTypeOption);
                if (v !== "vbit") { setVbitCompMode("off"); if (engravingMode === "vbit-curved") setEngravingMode("curved"); }
              }} className="space-y-0.5">
                <RadioOption value="straight" id="tool-str" label="Fresa reta" />
                <RadioOption value="fine-tip" id="tool-fin" label="Ponta fina" />
                <RadioOption value="vbit" id="tool-vb" label="V-bit" />
              </RadioGroup>

              <Separator className="opacity-50" />

              {/* ─── Actions ─── */}
              <div className="space-y-1.5">
                <Button onClick={handleGenerate} size="sm" className="gap-1.5 w-full text-[11px] h-8" disabled={!mesh || !originalGcode}>
                  <Play className="h-3 w-3" /> Gerar G-code
                </Button>
                {result && (
                  <Button onClick={handleDownload} variant="outline" size="sm" className="gap-1.5 w-full text-[11px] h-8 border-primary/30 text-primary hover:bg-primary/10">
                    <Download className="h-3 w-3" /> Baixar arquivo
                  </Button>
                )}
              </div>

              <Separator className="opacity-50" />

              {/* ─── Advanced ─── */}
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-1.5 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors w-full py-1">
                    <Settings2 className="h-3 w-3" />
                    Configurações avançadas
                    <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2.5 pt-1.5">
                  {numField("Prof. máx. probe", probeDepth, setProbeDepth, 0.01, undefined, "probeDepth")}
                  {numField(`Folga adapt. (${unit})`, retAdaptiveClearance, setRetAdaptiveClearance, 0.5)}

                  {engravingMode === "vbit-curved" && toolType === "vbit" && (
                    <div className="space-y-1.5">
                      <Label className="text-[10px]">Compensação V-bit</Label>
                      <RadioGroup value={vbitCompMode} onValueChange={(v) => setVbitCompMode(v as VbitCompMode)} className="space-y-0.5">
                        <RadioOption value="off" id="vc-off" label="Desligada" small />
                        <RadioOption value="basic" id="vc-bas" label="Básica" small />
                        <RadioOption value="advanced" id="vc-adv" label="Avançada" small />
                      </RadioGroup>
                    </div>
                  )}

                  {numField(`Segmento arco (${unit})`, arcSegmentLen, (v) => setCustomArcSegLen(v > 0 ? v : null), unit === "mm" ? 0.1 : 0.01)}
                  {numField("Divisão comp.", maxSegmentLen, setMaxSegmentLen)}
                  {numField("Decimais", decimalPlaces, (v) => setDecimalPlaces(Math.max(1, Math.min(8, Math.round(v)))), 1)}
                  {numField("Tolerância", tolerance, setTolerance, 0.0001)}

                  <div className="space-y-1">
                    <Label className="text-[10px]">Controlador</Label>
                    <Select value={controller} onValueChange={(v) => setController(v as ControllerType)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mach3">Mach3</SelectItem>
                        <SelectItem value="generic">Genérico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px]">Unidade</Label>
                    <Select value={unit} onValueChange={(v) => {
                      const u = v as ZUnit; setUnit(u);
                      const d = u === "mm" ? defaultConfigMM : defaultConfigInch;
                      setSpacingX(d.spacing); setSpacingY(d.spacing); setProbeFeed(d.probeFeed); setProbeDepth(d.probeDepth);
                      setClearance(d.clearance); setSafeHeight(d.safeHeight); setMaxSegmentLen(d.maxSegmentLen); setTolerance(d.tolerance);
                      setCustomArcSegLen(null); setBuffer(u === "mm" ? 5 : 0.2);
                    }}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="mm">mm</SelectItem><SelectItem value="inch">pol</SelectItem></SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px]">Fora da área</Label>
                    <Select value={outOfMeshRule} onValueChange={(v) => setOutOfMeshRule(v as any)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="block">Bloquear</SelectItem>
                        <SelectItem value="warn">Avisar</SelectItem>
                        <SelectItem value="nearest">Ponto próximo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px]">Precisão do toque</Label>
                    <RadioGroup value={touchPrecision} onValueChange={(v) => { setTouchPrecision(v as TouchPrecision); setCustomTouches(null); }} className="space-y-0.5">
                      <RadioOption value="fast" id="tp-fast" label="Rápida (1)" small />
                      <RadioOption value="normal" id="tp-norm" label="Normal (2)" small />
                      <RadioOption value="high" id="tp-high" label="Alta (3)" small />
                    </RadioGroup>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px]">Multi-toque</Label>
                    <RadioGroup value={touchStrategy} onValueChange={(v) => setTouchStrategy(v as "last" | "average")} className="space-y-0.5">
                      <RadioOption value="last" id="ts-last" label="Último" small />
                      <RadioOption value="average" id="ts-avg" label="Média" small />
                    </RadioGroup>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px]">Área de mapeamento</Label>
                    <RadioGroup value={areaMode} onValueChange={(v) => setAreaMode(v as AreaMode)} className="space-y-0.5">
                      <RadioOption value="auto" id="am-auto" label="Automática" small />
                      <RadioOption value="manual" id="am-man" label="Manual" small />
                    </RadioGroup>
                    {areaMode === "auto" && <div className="pt-1">{numField(`Margem (${unit})`, buffer, setBuffer, unit === "mm" ? 1 : 0.05)}</div>}
                    {areaMode === "manual" && (
                      <div className="space-y-1.5 pt-1">
                        {numField("X inicial", manualXStart, setManualXStart)}
                        {numField("Y inicial", manualYStart, setManualYStart)}
                        {numField("Largura", manualWidth, setManualWidth)}
                        {numField("Altura", manualHeight, setManualHeight)}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px]">Precisão curvas</Label>
                    <RadioGroup value={curvePrecision} onValueChange={(v) => { setCurvePrecision(v as CurvePrecision); setCustomArcSegLen(null); }} className="space-y-0.5">
                      <RadioOption value="high" id="cp-hi" label="Alta" small />
                      <RadioOption value="medium" id="cp-med" label="Média" small />
                      <RadioOption value="fast" id="cp-fast" label="Rápida" small />
                    </RadioGroup>
                  </div>

                  {/* ─── Custom Probe ─── */}
                  <Separator className="opacity-50" />
                  <SectionLabel icon={<Cpu className="h-3 w-3" />} label="Probe" />
                  <RadioGroup value={probeType} onValueChange={(v) => setProbeType(v as ProbeType)} className="space-y-0.5">
                    <RadioOption value="standard" id="probe-std" label="Padrão" small />
                    <RadioOption value="custom" id="probe-cust" label="Personalizado" small />
                  </RadioGroup>

                  {probeType === "custom" && (
                    <div className="space-y-2">
                      {showExplanations && <p className="text-[9px] text-muted-foreground">Probe fixo lateral ou sistema automatizado.</p>}
                      <div className="space-y-1.5 bg-muted/30 rounded-md p-2">
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase">Offset</p>
                        {numField(`X (${unit})`, cpOffsetX, setCpOffsetX, unit === "mm" ? 0.1 : 0.005, undefined, "probeOffsetX")}
                        {numField(`Y (${unit})`, cpOffsetY, setCpOffsetY, unit === "mm" ? 0.1 : 0.005, undefined, "probeOffsetY")}
                        {numField(`Z (${unit})`, cpOffsetZ, setCpOffsetZ, unit === "mm" ? 0.1 : 0.005, undefined, "probeOffsetZ")}
                      </div>
                      <div className="space-y-1.5 bg-muted/30 rounded-md p-2">
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase">Início</p>
                        <div className="space-y-1">
                          <Label className="text-[10px] flex items-center gap-1">Cmd. inicial <HelpTip text="Ex: M11" /></Label>
                          <Input value={cpStartCmd} onChange={(e) => setCpStartCmd(e.target.value)} className="h-6 text-[10px] font-mono" placeholder="M11" />
                        </div>
                        {numField(`Espera (s)`, cpStartDwell, setCpStartDwell, 0.5)}
                        {numField(`Safe Z`, cpStartSafeZ, setCpStartSafeZ, 1)}
                      </div>
                      <div className="space-y-1.5 bg-muted/30 rounded-md p-2">
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase">Final</p>
                        <div className="space-y-1">
                          <Label className="text-[10px] flex items-center gap-1">Cmd. final <HelpTip text="Ex: M10" /></Label>
                          <Input value={cpEndCmd} onChange={(e) => setCpEndCmd(e.target.value)} className="h-6 text-[10px] font-mono" placeholder="M10" />
                        </div>
                        {numField(`Espera (s)`, cpEndDwell, setCpEndDwell, 0.5)}
                        {numField(`Safe Z`, cpEndSafeZ, setCpEndSafeZ, 1)}
                      </div>
                      <div className="space-y-1.5 bg-muted/30 rounded-md p-2">
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase">Finalização</p>
                        <RadioGroup value={postMappingMode} onValueChange={(v) => setPostMappingMode(v as PostMappingMode)} className="space-y-0.5">
                          <RadioOption value="manual" id="pm-man" label="Manual" small />
                          <RadioOption value="auto_offset" id="pm-auto" label="Automática" small />
                          <RadioOption value="auto_measure" id="pm-meas" label="Auto+Medição" small />
                        </RadioGroup>
                        {postMappingMode === "auto_offset" && (
                          <div className="space-y-1.5 pt-1">
                            {numField(`Offset Z ferra.`, cpToolOffsetZ, setCpToolOffsetZ, 0.01)}
                            {numField(`Safe Z pós`, cpPostSafeZ, setCpPostSafeZ, 1)}
                          </div>
                        )}
                        {postMappingMode === "auto_measure" && (
                          <div className="space-y-1.5 pt-1">
                            {numField(`X medição`, cpMeasureX, setCpMeasureX, 1)}
                            {numField(`Y medição`, cpMeasureY, setCpMeasureY, 1)}
                            <div className="space-y-1">
                              <Label className="text-[10px]">Cmd. medição</Label>
                              <Input value={cpMeasureCmd} onChange={(e) => setCpMeasureCmd(e.target.value)} className="h-6 text-[10px] font-mono" />
                            </div>
                            {numField(`Espera`, cpMeasureDwell, setCpMeasureDwell, 0.5)}
                            {numField(`Safe Z`, cpPostSafeZ, setCpPostSafeZ, 1)}
                          </div>
                        )}
                        {postMappingMode !== "manual" && (
                          <Alert className="border-amber-500/30 bg-amber-500/5 mt-1.5 py-1.5">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            <AlertDescription className="text-[9px] text-muted-foreground">
                              Apenas com sistema calibrado.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>
          </ScrollArea>
        </div>

        {/* ── CENTER: Visualization ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* View mode tabs */}
          <div className="shrink-0 border-b border-border/50 px-3 py-1 flex items-center gap-0.5 bg-card/40">
            <ViewTab active={viewMode === "gcode"} onClick={() => setViewMode("gcode")} icon={<FileCode className="h-3 w-3" />} label="G-code" />
            <ViewTab active={viewMode === "surface"} onClick={() => setViewMode("surface")} icon={<BarChart3 className="h-3 w-3" />} label="Superfície" />
            <ViewTab active={viewMode === "simulation"} onClick={() => { setViewMode("simulation"); setShowSimulator(true); }} icon={<Box className="h-3 w-3" />} label="Simulação 3D" disabled={!analysis || !mesh || !originalGcode} />
          </div>

          {/* Visualization content */}
          <div className="flex-1 overflow-auto">
            {!analysis && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-5 text-muted-foreground px-8">
                <div className="h-20 w-20 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-center">
                  <Upload className="h-9 w-9 text-muted-foreground/30" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Nenhum arquivo carregado</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Carregue um arquivo G-code (.nc, .tap, .gcode) para visualizar e configurar o mapeamento da superfície.
                  </p>
                  {showExplanations && (
                    <p className="text-[11px] text-muted-foreground/70 max-w-md mt-3 leading-relaxed">
                      Esta ferramenta mede a superfície da peça e ajusta automaticamente o percurso da usinagem para manter a profundidade correta mesmo em superfícies inclinadas ou irregulares.
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5 text-xs">
                    <FileUp className="h-3.5 w-3.5" /> Carregar arquivo
                  </Button>
                  <Button size="sm" onClick={() => setWizardMode(true)} className="gap-1.5 text-xs">
                    <Wand2 className="h-3.5 w-3.5" /> Assistente
                  </Button>
                </div>
              </div>
            )}

            {analysis && originalGcode && viewMode === "gcode" && (
              <div className="h-full p-2">
                <GcodePreview
                  originalGcode={originalGcode} mesh={mesh} config={config}
                  xMin={analysis.xMin} yMin={analysis.yMin} xMax={analysis.xMax} yMax={analysis.yMax}
                  densityMap={densityMap}
                />
              </div>
            )}

            {analysis && mesh && viewMode === "surface" && (
              <div className="h-full p-3 flex flex-col gap-3">
                <ProfessionalHeatmap mesh={mesh.points} cols={mesh.pointsPerRow} rows={mesh.rows} unit={unit} spacingX={spacingX} spacingY={spacingY} />
              </div>
            )}

            {analysis && mesh && originalGcode && viewMode === "simulation" && showSimulator && (
              <div className="h-full">
                <CompensationSimulator3D
                  originalGcode={originalGcode} mesh={mesh} config={config}
                  onClose={() => { setShowSimulator(false); setViewMode("gcode"); }}
                  vbitSettings={engravingMode === "vbit-curved" && toolType === "vbit" ? {
                    enabled: true, angle: vbitAngle, nominalDepth, compMode: vbitCompMode,
                  } : undefined}
                />
              </div>
            )}

            {analysis && mesh && originalGcode && viewMode === "simulation" && !showSimulator && (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Box className="h-10 w-10 opacity-30" />
                <p className="text-xs">Clique para iniciar a simulação 3D</p>
                <Button variant="outline" size="sm" onClick={() => setShowSimulator(true)} className="gap-1.5 text-xs">
                  <Layers className="h-3.5 w-3.5" /> Abrir simulação
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: Summary cards ── */}
        <div className="w-[220px] shrink-0 border-l border-border bg-card/60 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-border/50">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="h-3 w-3" /> Resumo
            </span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2.5 space-y-2.5">

              {/* Card: File */}
              <SummaryCard title="Arquivo" icon={<FileCode className="h-3 w-3" />}>
                {analysis ? (
                  <div className="space-y-1 text-[10px]">
                    <SummaryRow label="Unidade" value={unit === "mm" ? "Milímetros" : "Polegadas"} />
                    <SummaryRow label="Largura" value={`${fmt(analysis.width)} ${unit}`} />
                    <SummaryRow label="Altura" value={`${fmt(analysis.height)} ${unit}`} />
                    <SummaryRow label="Área" value={`${fmt(analysis.width * analysis.height)} ${unit}²`} />
                    {analysis.arcCount > 0 && <SummaryRow label="Curvas" value={String(analysis.arcCount)} />}
                    <SummaryRow label="Linhas" value={String(analysis.lineCount)} />
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground/60 italic">Nenhum arquivo</p>
                )}
              </SummaryCard>

              {/* Card: Mapping */}
              <SummaryCard title="Mapeamento" icon={<Grid3x3 className="h-3 w-3" />}>
                {mesh ? (
                  <div className="space-y-1 text-[10px]">
                    <SummaryRow label="Pontos X" value={String(pointsX)} />
                    <SummaryRow label="Pontos Y" value={String(pointsY)} />
                    <SummaryRow label="Total" value={String(mesh.totalPoints)} highlight />
                    <SummaryRow label="Tempo est." value={formatTime(mesh.estimatedTimeSec)} />
                    <SummaryRow label="Modo" value={mappingPrecision === "smart" ? "Inteligente" : mappingPrecision === "maximum" ? "Máxima" : "Uniforme"} />
                    {mappingPrecision === "smart" && uniformPointCount > 0 && mesh.totalPoints < uniformPointCount && (
                      <p className="text-[9px] text-primary mt-0.5">
                        {Math.round((1 - mesh.totalPoints / uniformPointCount) * 100)}% menos medições
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground/60 italic">Aguardando dados</p>
                )}
              </SummaryCard>

              {/* Card: Surface */}
              <SummaryCard title="Superfície" icon={<BarChart3 className="h-3 w-3" />}>
                <div className="space-y-1 text-[10px]">
                  <SummaryRow label="Cobertura" value={mesh ? `${fmt(effectiveWidth)}×${fmt(effectiveHeight)} ${unit}` : "—"} />
                  <SummaryRow label="Alt. mín." value={`0.000 ${unit}`} />
                  <SummaryRow label="Alt. máx." value="~ simulada" />
                  <SummaryRow label="Variação" value="~ simulada" />
                </div>
              </SummaryCard>

              {/* Card: Status */}
              <SummaryCard title="Status" icon={<CheckCircle2 className="h-3 w-3" />}>
                <div className="space-y-1">
                  <StatusDot label="G-code carregado" active={!!originalFileName} />
                  <StatusDot label="Malha gerada" active={!!mesh} />
                  <StatusDot label="Simulação disponível" active={!!(analysis && mesh && originalGcode)} />
                  <StatusDot label="Arquivo pronto" active={!!result} />
                </div>
              </SummaryCard>

              {/* Result details */}
              {result && (
                <SummaryCard title="Resultado" icon={<Download className="h-3 w-3" />} accent>
                  <div className="space-y-1 text-[10px]">
                    <SummaryRow label="Arquivo" value={result.fileName} />
                    <SummaryRow label="Pontos" value={String(result.totalPoints)} />
                    <SummaryRow label="Toques/pt" value={String(touchesPerPoint)} />
                    {result.arcsDetected > 0 && (
                      <>
                        <SummaryRow label="Curvas" value={String(result.arcsDetected)} />
                        <SummaryRow label="Segmentos" value={String(result.arcSegmentsGenerated)} />
                      </>
                    )}
                  </div>
                  <Button onClick={handleDownload} size="sm" className="gap-1.5 w-full text-[10px] h-7 mt-2">
                    <Download className="h-3 w-3" /> Baixar
                  </Button>
                </SummaryCard>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* ══════════════ BOTTOM STATUS BAR ══════════════ */}
      <div className="shrink-0 border-t border-border bg-card h-7 px-4 flex items-center gap-5 text-[9px]">
        {pipeline.map((step, i) => (
          <div key={step.label} className="flex items-center gap-1.5">
            <div className={`h-1.5 w-1.5 rounded-full transition-colors ${step.done ? "bg-primary" : "bg-muted-foreground/20"}`} />
            <span className={step.done ? "text-foreground font-medium" : "text-muted-foreground"}>{step.label}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-3 text-muted-foreground">
          <span>Ctrl: <strong className="text-foreground">{controller === "mach3" ? "Mach3" : "Gen."}</strong></span>
          <span>Modo: <strong className="text-foreground">{mappingPrecision === "smart" ? "Smart" : mappingPrecision === "maximum" ? "Max" : "Uni"}</strong></span>
          {probeType === "custom" && <span>Probe: <strong className="text-foreground">Custom</strong></span>}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Sub-components (internal to this file)
   ══════════════════════════════════════════════════════════════ */

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
      {icon} {label}
    </p>
  );
}

function RadioOption({ value, id, label, small }: { value: string; id: string; label: string; small?: boolean }) {
  return (
    <label htmlFor={id} className={`flex items-center gap-2 cursor-pointer rounded transition-colors hover:bg-muted/50 ${small ? "text-[10px] p-1" : "text-[11px] p-1.5"}`}>
      <RadioGroupItem value={value} id={id} /> <span>{label}</span>
    </label>
  );
}

function ViewTab({ active, onClick, icon, label, disabled }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`px-3 py-1.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed ${
        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      }`}>
      {icon} {label}
    </button>
  );
}

function SummaryCard({ title, icon, children, accent }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-2.5 space-y-1.5 ${accent ? "border-primary/30 bg-primary/5" : "border-border/50 bg-muted/20"}`}>
      <div className="flex items-center gap-1.5">
        <span className={accent ? "text-primary" : "text-muted-foreground"}>{icon}</span>
        <span className="text-[10px] font-semibold text-foreground uppercase tracking-wider">{title}</span>
      </div>
      {children}
    </div>
  );
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium truncate ml-2 max-w-[100px] text-right ${highlight ? "text-primary" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

function StatusDot({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <div className={`h-1.5 w-1.5 rounded-full ${active ? "bg-primary" : "bg-muted-foreground/20"}`} />
      <span className={active ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

/* ── Professional Heatmap ─────────────────────────────── */
function ProfessionalHeatmap({ mesh, cols, rows, unit, spacingX, spacingY }: {
  mesh: { x: number; y: number }[]; cols: number; rows: number; unit: string; spacingX: number; spacingY: number;
}) {
  // Use actual spacing ratio so cells reflect real X/Y distances
  const totalW = cols * spacingX;
  const totalH = rows * spacingY;
  const maxSvgW = 440;
  const maxSvgH = 320;
  const scaleToFit = Math.min(maxSvgW / totalW, maxSvgH / totalH);
  const svgW = totalW * scaleToFit;
  const svgH = totalH * scaleToFit;
  const cellW = spacingX * scaleToFit;
  const cellH = spacingY * scaleToFit;

  function heatColor(t: number): string {
    // t: 0 = low, 1 = high → blue → cyan → green → yellow → red
    if (t < 0.25) {
      const r = 0, g = Math.round(t * 4 * 200), b = Math.round(180 + t * 4 * 75);
      return `rgb(${r},${g},${b})`;
    } else if (t < 0.5) {
      const r = 0, g = Math.round(200 + (t - 0.25) * 4 * 55), b = Math.round(255 - (t - 0.25) * 4 * 255);
      return `rgb(${r},${g},${b})`;
    } else if (t < 0.75) {
      const r = Math.round((t - 0.5) * 4 * 255), g = 255, b = 0;
      return `rgb(${r},${g},${b})`;
    } else {
      const r = 255, g = Math.round(255 - (t - 0.75) * 4 * 255), b = 0;
      return `rgb(${r},${g},${b})`;
    }
  }

  return (
    <div className="flex gap-3 items-start justify-center flex-1">
      <div className="flex-1 max-w-2xl">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full border border-border/50 rounded-lg bg-background">
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((_, c) => {
              const t = r / Math.max(1, rows - 1);
              return (
                <rect key={`h${r}-${c}`}
                  x={c * cellW} y={(rows - 1 - r) * cellH} width={cellW} height={cellH}
                  fill={heatColor(t)} opacity={0.55}
                  stroke="hsl(var(--border))" strokeWidth={0.3} />
              );
            })
          )}
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((_, c) => (
              <circle key={`p${r}-${c}`}
                cx={c * cellW + cellW / 2} cy={(rows - 1 - r) * cellH + cellH / 2}
                r={Math.min(cellW, cellH) * 0.15} fill="white" opacity={0.5} />
            ))
          )}
        </svg>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Grade: {cols} × {rows} = {cols * rows} pontos · Espaçamento simulado
        </p>
      </div>
      {/* Color scale */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <span className="text-[8px] text-muted-foreground">Alto</span>
        <div className="w-3 h-40 rounded-sm overflow-hidden border border-border/50"
          style={{ background: "linear-gradient(to bottom, rgb(255,0,0), rgb(255,255,0), rgb(0,255,0), rgb(0,200,255), rgb(0,0,180))" }} />
        <span className="text-[8px] text-muted-foreground">Baixo</span>
      </div>
    </div>
  );
}
