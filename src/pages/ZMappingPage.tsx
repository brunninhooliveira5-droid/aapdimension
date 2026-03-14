import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { ZMappingAnimation } from "@/components/ZMappingAnimation";
import { CompensationSimulator3D } from "@/components/z-mapping/CompensationSimulator3D";
import { GcodePreview } from "@/components/z-mapping/GcodePreview";
import { ZMappingWizard } from "@/components/z-mapping/ZMappingWizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Upload, Grid3x3, Download, CheckCircle2, FileUp, Settings2, ChevronDown,
  Play, Ruler, Timer, Cpu, MapPin, Eye, EyeOff, CircleDot, Layers, ScanSearch,
  PenTool, AlertTriangle, ShieldCheck, Wand2, Save, Box, Crosshair,
  HelpCircle, Monitor, BarChart3, Gauge, Activity,
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

  const numField = (label: string, value: number, onChange: (v: number) => void, step?: number, help?: string, helpKey?: string) => (
    <div className="space-y-1">
      <Label className="text-[11px] flex items-center gap-1">
        {label}
        {helpKey && PARAM_HELP[helpKey] ? (
          <EnhancedHelpTip {...PARAM_HELP[helpKey]} />
        ) : help ? (
          <EnhancedHelpTip text={help} />
        ) : null}
      </Label>
      <Input type="number" value={value} step={step ?? (unit === "mm" ? 1 : 0.01)}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
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

  // ── Status items for bottom bar
  const statusItems = [
    { label: "Arquivo", active: !!originalFileName, text: originalFileName || "Nenhum" },
    { label: "Malha", active: !!mesh, text: mesh ? `${mesh.totalPoints} pontos` : "—" },
    { label: "Simulação", active: showSimulator, text: showSimulator ? "Ativa" : "—" },
    { label: "G-code", active: !!result, text: result ? "Pronto" : "—" },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* ══════════════ TOP TOOLBAR ══════════════ */}
      <div className="shrink-0 border-b border-border bg-card/80 backdrop-blur-sm px-4 py-2">
        <div className="flex items-center justify-between gap-3">
          {/* Left: branding + file info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Grid3x3 className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight truncate">Nivelamento Automático</h1>
              {analysis && (
                <p className="text-[10px] text-muted-foreground truncate">
                  {originalFileName} — {fmt(analysis.width)} × {fmt(analysis.height)} {unit}
                  {analysis.arcCount > 0 && ` — ${analysis.arcCount} curvas`}
                </p>
              )}
            </div>
          </div>

          {/* Center: main actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <input ref={fileRef} type="file" accept=".nc,.tap,.gcode,.txt" className="hidden" onChange={handleFileUpload} />
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> Carregar G-code
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setWizardMode(true)}>
              <Wand2 className="h-3.5 w-3.5" /> Assistente
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleSaveConfig}>
              <Save className="h-3.5 w-3.5" /> Salvar
            </Button>
            {analysis && mesh && originalGcode && (
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
                onClick={() => { setShowSimulator(true); setViewMode("simulation"); }}>
                <Box className="h-3.5 w-3.5" /> Simulação 3D
              </Button>
            )}
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleGenerate}
              disabled={!mesh || !originalGcode}>
              <Play className="h-3.5 w-3.5" /> Gerar G-code
            </Button>
          </div>

          {/* Right: info button */}
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 shrink-0" onClick={() => setShowAnimation(s => !s)}>
            <HelpCircle className="h-3.5 w-3.5" />
          </Button>
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
        <div className="w-[280px] shrink-0 border-r border-border bg-card/50 flex flex-col overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border/50">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Settings2 className="h-3 w-3" /> Parâmetros
            </h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-4">

              {/* Quick params */}
              <div className="space-y-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Medição</p>
                {numField(`Altura segura (${unit})`, safeHeight, setSafeHeight, undefined,
                  undefined, "safeHeight")}
                {numField(`Distância X (${unit})`, spacingX, setSpacingX, undefined,
                  undefined, "spacingX")}
                {numField(`Distância Y (${unit})`, spacingY, setSpacingY, undefined,
                  undefined, "spacingY")}
                {numField(`Vel. toque (${unit}/min)`, probeFeed, setProbeFeed, undefined,
                  undefined, "probeFeed")}
              </div>

              <Separator />

              {/* Engraving mode */}
              <div className="space-y-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <PenTool className="h-3 w-3" /> Tipo de gravação
                </p>
                <RadioGroup value={engravingMode} onValueChange={(v) => setEngravingMode(v as EngravingMode)} className="space-y-1">
                  <label className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="standard" id="eng-std-p" />
                    <span>Usinagem normal</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="curved" id="eng-curved-p" />
                    <span>Superfície curva</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="vbit-curved" id="eng-vbit-p" />
                    <span>V-bit em superfície curva</span>
                  </label>
                </RadioGroup>

                {toolType === "vbit" && (
                  <div className="space-y-2 bg-muted/30 rounded-lg p-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Ângulo V-bit</Label>
                      <Select value={String(vbitAngle)} onValueChange={(v) => setVbitAngle(Number(v))}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30°</SelectItem>
                          <SelectItem value="45">45°</SelectItem>
                          <SelectItem value="60">60°</SelectItem>
                          <SelectItem value="90">90°</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {numField(`Prof. gravação (${unit})`, nominalDepth, setNominalDepth, unit === "mm" ? 0.05 : 0.002)}
                    <p className="text-[10px] text-muted-foreground">
                      Largura: <strong className="text-foreground">
                        {fmt(2 * nominalDepth * Math.tan((vbitAngle / 2) * Math.PI / 180), 3)} {unit}
                      </strong>
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Mapping precision */}
              <div className="space-y-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Crosshair className="h-3 w-3" /> Modo de mapeamento
                </p>
                <RadioGroup value={mappingPrecision} onValueChange={(v) => setMappingPrecision(v as MappingPrecision)} className="space-y-1">
                  <label className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="uniform" id="map-uni-p" />
                    <span>Grade tradicional</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="smart" id="map-smart-p" />
                    <span>Inteligente</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="maximum" id="map-max-p" />
                    <span>Varredura máxima</span>
                  </label>
                </RadioGroup>
              </div>

              <Separator />

              {/* Tool type */}
              <div className="space-y-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ferramenta</p>
                <RadioGroup
                  value={toolType}
                  onValueChange={(v) => {
                    setToolType(v as ToolTypeOption);
                    if (v !== "vbit") {
                      setVbitCompMode("off");
                      if (engravingMode === "vbit-curved") setEngravingMode("curved");
                    }
                  }}
                  className="space-y-1"
                >
                  <label className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="straight" id="tool-str-p" />
                    <span>Fresa reta</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="fine-tip" id="tool-fin-p" />
                    <span>Ponta fina</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="vbit" id="tool-vb-p" />
                    <span>V-bit</span>
                  </label>
                </RadioGroup>
              </div>

              <Separator />

              {/* Advanced settings */}
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors w-full">
                    <Settings2 className="h-3 w-3" />
                    Configurações avançadas
                    <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  {numField("Prof. máxima probe", probeDepth, setProbeDepth, 0.01,
                    undefined, "probeDepth")}
                  {numField(`Folga adaptativa (${unit})`, retAdaptiveClearance, setRetAdaptiveClearance, 0.5)}
                  
                  {engravingMode === "vbit-curved" && toolType === "vbit" && (
                    <div className="space-y-1.5">
                      <Label className="text-[11px]">Compensação V-bit</Label>
                      <RadioGroup value={vbitCompMode} onValueChange={(v) => setVbitCompMode(v as VbitCompMode)} className="space-y-1">
                        <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                          <RadioGroupItem value="off" id="vc-off-p" /> Desligada
                        </label>
                        <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                          <RadioGroupItem value="basic" id="vc-bas-p" /> Básica
                        </label>
                        <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                          <RadioGroupItem value="advanced" id="vc-adv-p" /> Avançada
                        </label>
                      </RadioGroup>
                    </div>
                  )}

                  {numField(`Segmento de arco (${unit})`, arcSegmentLen, (v) => setCustomArcSegLen(v > 0 ? v : null), unit === "mm" ? 0.1 : 0.01)}
                  {numField("Comp. divisão", maxSegmentLen, setMaxSegmentLen)}
                  {numField("Casas decimais", decimalPlaces, (v) => setDecimalPlaces(Math.max(1, Math.min(8, Math.round(v)))), 1)}
                  {numField("Tolerância", tolerance, setTolerance, 0.0001)}

                  <div className="space-y-1">
                    <Label className="text-[11px]">Controlador</Label>
                    <Select value={controller} onValueChange={(v) => setController(v as ControllerType)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mach3">Mach3</SelectItem>
                        <SelectItem value="generic">Genérico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px]">Unidade</Label>
                    <Select value={unit} onValueChange={(v) => {
                      const u = v as ZUnit;
                      setUnit(u);
                      const d = u === "mm" ? defaultConfigMM : defaultConfigInch;
                      setSpacingX(d.spacing); setSpacingY(d.spacing);
                      setProbeFeed(d.probeFeed); setProbeDepth(d.probeDepth);
                      setClearance(d.clearance); setSafeHeight(d.safeHeight);
                      setMaxSegmentLen(d.maxSegmentLen); setTolerance(d.tolerance);
                      setCustomArcSegLen(null);
                      setBuffer(u === "mm" ? 5 : 0.2);
                    }}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mm">mm</SelectItem>
                        <SelectItem value="inch">pol</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px]">Fora da área</Label>
                    <Select value={outOfMeshRule} onValueChange={(v) => setOutOfMeshRule(v as any)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="block">Bloquear</SelectItem>
                        <SelectItem value="warn">Avisar</SelectItem>
                        <SelectItem value="nearest">Ponto próximo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Touch precision */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Precisão do toque</Label>
                    <RadioGroup
                      value={touchPrecision}
                      onValueChange={(v) => { setTouchPrecision(v as TouchPrecision); setCustomTouches(null); }}
                      className="space-y-1"
                    >
                      <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                        <RadioGroupItem value="fast" id="tp-fast-p" /> Rápida (1)
                      </label>
                      <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                        <RadioGroupItem value="normal" id="tp-norm-p" /> Normal (2)
                      </label>
                      <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                        <RadioGroupItem value="high" id="tp-high-p" /> Alta (3)
                      </label>
                    </RadioGroup>
                  </div>

                  {/* Touch strategy */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Estratégia multi-toque</Label>
                    <RadioGroup value={touchStrategy} onValueChange={(v) => setTouchStrategy(v as "last" | "average")} className="space-y-1">
                      <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                        <RadioGroupItem value="last" id="ts-last-p" /> Último toque
                      </label>
                      <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                        <RadioGroupItem value="average" id="ts-avg-p" /> Média
                      </label>
                    </RadioGroup>
                  </div>

                  {/* Area mode */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Área de mapeamento</Label>
                    <RadioGroup value={areaMode} onValueChange={(v) => setAreaMode(v as AreaMode)} className="space-y-1">
                      <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                        <RadioGroupItem value="auto" id="am-auto-p" /> Automática
                      </label>
                      <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                        <RadioGroupItem value="manual" id="am-man-p" /> Manual
                      </label>
                    </RadioGroup>
                    {areaMode === "auto" && (
                      <div className="pt-1">
                        {numField(`Margem (${unit})`, buffer, setBuffer, unit === "mm" ? 1 : 0.05)}
                      </div>
                    )}
                    {areaMode === "manual" && (
                      <div className="space-y-2 pt-1">
                        {numField("X inicial", manualXStart, setManualXStart)}
                        {numField("Y inicial", manualYStart, setManualYStart)}
                        {numField("Largura", manualWidth, setManualWidth)}
                        {numField("Altura", manualHeight, setManualHeight)}
                      </div>
                    )}
                  </div>

                  {/* Curve precision */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Precisão de curvas</Label>
                    <RadioGroup
                      value={curvePrecision}
                      onValueChange={(v) => { setCurvePrecision(v as CurvePrecision); setCustomArcSegLen(null); }}
                      className="space-y-1"
                    >
                      <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                        <RadioGroupItem value="high" id="cp-hi-p" /> Alta
                      </label>
                      <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                        <RadioGroupItem value="medium" id="cp-med-p" /> Média
                      </label>
                      <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                        <RadioGroupItem value="fast" id="cp-fast-p" /> Rápida
                      </label>
                    </RadioGroup>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </ScrollArea>
        </div>

        {/* ── CENTER: Visualization ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          {/* View mode tabs */}
          <div className="shrink-0 border-b border-border/50 px-3 py-1.5 flex items-center gap-1">
            <button
              onClick={() => setViewMode("gcode")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "gcode"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-1.5"><Monitor className="h-3 w-3" /> G-code</span>
            </button>
            <button
              onClick={() => setViewMode("surface")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "surface"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-1.5"><BarChart3 className="h-3 w-3" /> Superfície</span>
            </button>
            <button
              onClick={() => { setViewMode("simulation"); setShowSimulator(true); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "simulation"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
              disabled={!analysis || !mesh || !originalGcode}
            >
              <span className="flex items-center gap-1.5"><Box className="h-3 w-3" /> Simulação 3D</span>
            </button>
          </div>

          {/* Visualization content */}
          <div className="flex-1 overflow-auto p-3">
            {!analysis && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4 text-muted-foreground">
                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <Upload className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Nenhum arquivo carregado</p>
                  <p className="text-xs mt-1">Carregue um arquivo G-code para começar ou use o assistente.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5 text-xs">
                    <FileUp className="h-3.5 w-3.5" /> Carregar arquivo
                  </Button>
                  <Button variant="default" size="sm" onClick={() => setWizardMode(true)} className="gap-1.5 text-xs">
                    <Wand2 className="h-3.5 w-3.5" /> Assistente
                  </Button>
                </div>
              </div>
            )}

            {analysis && originalGcode && viewMode === "gcode" && (
              <div className="h-full">
                <GcodePreview
                  originalGcode={originalGcode}
                  mesh={mesh}
                  config={config}
                  xMin={analysis.xMin}
                  yMin={analysis.yMin}
                  xMax={analysis.xMax}
                  yMax={analysis.yMax}
                  densityMap={densityMap}
                />
              </div>
            )}

            {analysis && mesh && viewMode === "surface" && (
              <div className="h-full flex flex-col gap-3">
                <SurfaceHeatmap
                  mesh={mesh.points}
                  spacingX={mesh.actualSpacingX}
                  spacingY={mesh.actualSpacingY}
                  cols={mesh.pointsPerRow}
                  rows={mesh.rows}
                />
                {/* Surface height scale */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Altura mínima</p>
                    <p className="text-sm font-semibold text-foreground">0.000 {unit}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Altura máxima</p>
                    <p className="text-sm font-semibold text-foreground">~ simulada</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Variação total</p>
                    <p className="text-sm font-semibold text-foreground">~ simulada</p>
                  </div>
                </div>
              </div>
            )}

            {analysis && mesh && originalGcode && viewMode === "simulation" && showSimulator && (
              <div className="h-full">
                <CompensationSimulator3D
                  originalGcode={originalGcode}
                  mesh={mesh}
                  config={config}
                  onClose={() => { setShowSimulator(false); setViewMode("gcode"); }}
                  vbitSettings={engravingMode === "vbit-curved" && toolType === "vbit" ? {
                    enabled: true,
                    angle: vbitAngle,
                    nominalDepth: nominalDepth,
                    compMode: vbitCompMode,
                  } : undefined}
                />
              </div>
            )}

            {analysis && mesh && originalGcode && viewMode === "simulation" && !showSimulator && (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Box className="h-10 w-10" />
                <p className="text-sm">Clique para abrir a simulação 3D</p>
                <Button variant="outline" size="sm" onClick={() => setShowSimulator(true)} className="gap-1.5 text-xs">
                  <Layers className="h-3.5 w-3.5" /> Abrir simulação
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: Actions & Results ── */}
        <div className="w-[260px] shrink-0 border-l border-border bg-card/50 flex flex-col overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border/50">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="h-3 w-3" /> Resultados
            </h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-4">

              {/* Stats */}
              {mesh && (
                <div className="space-y-2">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Resumo</p>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="rounded-lg bg-muted/40 p-2.5">
                      <p className="text-[10px] text-muted-foreground">Pontos de medição</p>
                      <p className="text-lg font-bold text-foreground flex items-center gap-1.5">
                        <Grid3x3 className="h-4 w-4 text-primary" /> {mesh.totalPoints}
                      </p>
                      {mappingPrecision === "smart" && uniformPointCount > 0 && mesh.totalPoints < uniformPointCount && (
                        <p className="text-[10px] text-emerald-500 mt-0.5">
                          {Math.round((1 - mesh.totalPoints / uniformPointCount) * 100)}% menos medições
                        </p>
                      )}
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2.5">
                      <p className="text-[10px] text-muted-foreground">Tempo estimado</p>
                      <p className="text-lg font-bold text-foreground flex items-center gap-1.5">
                        <Timer className="h-4 w-4 text-primary" /> {formatTime(mesh.estimatedTimeSec)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2.5">
                      <p className="text-[10px] text-muted-foreground">Área de cobertura</p>
                      <p className="text-sm font-semibold text-foreground">
                        {fmt(effectiveWidth)} × {fmt(effectiveHeight)} {unit}
                      </p>
                      {areaMode === "auto" && analysis && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Corte: {fmt(analysis.width)} × {fmt(analysis.height)} + margem
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Retraction mode */}
              <div className="space-y-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Deslocamento entre pontos
                </p>
                <RadioGroup value={retractionMode} onValueChange={(v) => setRetractionMode(v as RetractionMode)} className="space-y-1">
                  <label className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="standard" id="ret-std-r" />
                    <span>Padrão</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="safe" id="ret-safe-r" />
                    <span>Seguro</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="curved" id="ret-curved-r" />
                    <span>Superfície curva</span>
                  </label>
                </RadioGroup>

                {retractionMode !== "standard" && (
                  <div className="space-y-2 bg-muted/30 rounded-lg p-2.5">
                    {numField(`Z seguro mín. (${unit})`, retMinSafeZ, setRetMinSafeZ, 0.5)}
                    {numField(`Margem adapt. (${unit})`, retAdaptiveClearance, setRetAdaptiveClearance, 0.5)}
                    {retractionMode === "curved" && numField(`Margem reforç. (${unit})`, retReinforcedClearance, setRetReinforcedClearance, 0.5)}
                  </div>
                )}
              </div>

              <Separator />

              {/* Custom probe */}
              <div className="space-y-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Cpu className="h-3 w-3" /> Tipo de probe
                </p>
                <RadioGroup value={probeType} onValueChange={(v) => setProbeType(v as ProbeType)} className="space-y-1">
                  <label className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="standard" id="probe-std-r" />
                    <span>Padrão</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="custom" id="probe-custom-r" />
                    <span>Probe personalizado</span>
                  </label>
                </RadioGroup>

                {probeType === "custom" && (
                  <div className="space-y-3">
                    <p className="text-[10px] text-muted-foreground">
                      Use esta opção quando sua máquina tiver um probe fixo lateral ou sistema automático de abertura e recolhimento.
                    </p>

                    {/* Offsets */}
                    <div className="space-y-2 bg-muted/30 rounded-lg p-2.5">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Offset do probe</p>
                      {numField(`Offset X (${unit})`, cpOffsetX, setCpOffsetX, unit === "mm" ? 0.1 : 0.005,
                        "Diferença em X entre o centro da ferramenta e o ponto de toque do probe.")}
                      {numField(`Offset Y (${unit})`, cpOffsetY, setCpOffsetY, unit === "mm" ? 0.1 : 0.005,
                        "Diferença em Y entre o centro da ferramenta e o ponto de toque do probe.")}
                      {numField(`Offset Z (${unit})`, cpOffsetZ, setCpOffsetZ, unit === "mm" ? 0.1 : 0.005,
                        "Diferença em Z (opcional).")}
                    </div>

                    {/* Start behavior */}
                    <div className="space-y-2 bg-muted/30 rounded-lg p-2.5">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Início do mapeamento</p>
                      <div className="space-y-1">
                        <Label className="text-[11px] flex items-center gap-1">
                          Comando inicial <HelpTip text="Ex: M11 para acionar atuador, M64 P0 para saída digital." />
                        </Label>
                        <Input value={cpStartCmd} onChange={(e) => setCpStartCmd(e.target.value)} className="h-7 text-xs font-mono" placeholder="M11" />
                      </div>
                      {numField(`Espera após acionar (s)`, cpStartDwell, setCpStartDwell, 0.5,
                        "Tempo de espera após acionar o probe.")}
                      {numField(`Altura segura início (${unit})`, cpStartSafeZ, setCpStartSafeZ, 1,
                        "Altura segura antes de acionar o probe.")}
                    </div>

                    {/* End behavior */}
                    <div className="space-y-2 bg-muted/30 rounded-lg p-2.5">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Final do mapeamento</p>
                      <div className="space-y-1">
                        <Label className="text-[11px] flex items-center gap-1">
                          Comando final <HelpTip text="Ex: M10 para recolher atuador, M65 P0 para desligar saída." />
                        </Label>
                        <Input value={cpEndCmd} onChange={(e) => setCpEndCmd(e.target.value)} className="h-7 text-xs font-mono" placeholder="M10" />
                      </div>
                      {numField(`Espera após recolher (s)`, cpEndDwell, setCpEndDwell, 0.5,
                        "Tempo de espera após recolher o probe.")}
                      {numField(`Altura segura final (${unit})`, cpEndSafeZ, setCpEndSafeZ, 1,
                        "Altura segura antes de recolher o probe.")}
                    </div>

                    {/* Post-mapping mode */}
                    <div className="space-y-2 bg-muted/30 rounded-lg p-2.5">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Finalização do mapeamento</p>
                      <RadioGroup value={postMappingMode} onValueChange={(v) => setPostMappingMode(v as PostMappingMode)} className="space-y-1">
                        <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                          <RadioGroupItem value="manual" id="pm-manual" />
                          <span>Manual</span>
                          <HelpTip text="Pausa para o operador trocar ferramenta e zerar Z." />
                        </label>
                        <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                          <RadioGroupItem value="auto_offset" id="pm-auto" />
                          <span>Automática</span>
                          <HelpTip text="Usa offset calibrado entre probe e ferramenta para iniciar sem pausa." />
                        </label>
                        <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                          <RadioGroupItem value="auto_measure" id="pm-measure" />
                          <span>Automática com medição</span>
                          <HelpTip text="Mede a ferramenta automaticamente após recolher o probe." />
                        </label>
                      </RadioGroup>

                      {postMappingMode === "auto_offset" && (
                        <div className="space-y-2 pt-1">
                          {numField(`Offset Z ferramenta (${unit})`, cpToolOffsetZ, setCpToolOffsetZ, unit === "mm" ? 0.01 : 0.001,
                            "Diferença em Z entre a ponta do probe e a ponta da ferramenta de corte.")}
                          {numField(`Altura segura pós-recolhimento (${unit})`, cpPostSafeZ, setCpPostSafeZ, 1,
                            "Altura segura após recolher o probe antes de iniciar a usinagem.")}
                        </div>
                      )}

                      {postMappingMode === "auto_measure" && (
                        <div className="space-y-2 pt-1">
                          {numField(`Posição X medição (${unit})`, cpMeasureX, setCpMeasureX, 1,
                            "Posição X do sensor de medição de ferramenta.")}
                          {numField(`Posição Y medição (${unit})`, cpMeasureY, setCpMeasureY, 1,
                            "Posição Y do sensor de medição de ferramenta.")}
                          <div className="space-y-1">
                            <Label className="text-[11px] flex items-center gap-1">
                              Comando de medição <HelpTip text="Comando G-code para medir a ferramenta. Ex: G31 Z-50 F100" />
                            </Label>
                            <Input value={cpMeasureCmd} onChange={(e) => setCpMeasureCmd(e.target.value)} className="h-7 text-xs font-mono" placeholder="G31 Z-50 F100" />
                          </div>
                          {numField(`Espera após medição (s)`, cpMeasureDwell, setCpMeasureDwell, 0.5)}
                          {numField(`Altura segura pós-medição (${unit})`, cpPostSafeZ, setCpPostSafeZ, 1)}
                        </div>
                      )}

                      {postMappingMode !== "manual" && (
                        <Alert className="border-amber-500/30 bg-amber-500/5 mt-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          <AlertDescription className="text-[10px] text-muted-foreground">
                            Use este modo apenas se o sistema estiver calibrado e tiver repetibilidade suficiente.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Action buttons */}
              <div className="space-y-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ações</p>
                <Button onClick={handleGenerate} size="sm" className="gap-1.5 w-full text-xs h-9" disabled={!mesh || !originalGcode}>
                  <Play className="h-3.5 w-3.5" /> Gerar G-code de mapeamento
                </Button>
                {analysis && mesh && originalGcode && (
                  <Button variant="outline" size="sm" className="gap-1.5 w-full text-xs h-9"
                    onClick={() => { setShowSimulator(true); setViewMode("simulation"); }}>
                    <Layers className="h-3.5 w-3.5" /> Abrir simulação 3D
                  </Button>
                )}
              </div>

              {/* Result */}
              {result && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-500">Arquivo pronto!</span>
                    </div>

                    <Alert className="border-amber-500/30 bg-amber-500/5">
                      <AlertDescription className="text-[10px] text-amber-300">
                        <strong>Instruções:</strong> Após o mapeamento, coloque a fresa, zere o Z e pressione iniciar.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Arquivo</span>
                        <span className="font-medium truncate ml-2 max-w-[120px]">{result.fileName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pontos</span>
                        <span className="font-medium">{result.totalPoints}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Toques/ponto</span>
                        <span className="font-medium">{touchesPerPoint}</span>
                      </div>
                      {result.arcsDetected > 0 && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Curvas</span>
                            <span className="font-medium">{result.arcsDetected}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Segmentos</span>
                            <span className="font-medium">{result.arcSegmentsGenerated}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <Button onClick={handleDownload} className="gap-1.5 w-full text-xs h-9">
                      <Download className="h-3.5 w-3.5" /> Baixar arquivo
                    </Button>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* ══════════════ BOTTOM STATUS BAR ══════════════ */}
      <div className="shrink-0 border-t border-border bg-card/80 px-4 py-1.5 flex items-center gap-6 text-[10px]">
        {statusItems.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`h-1.5 w-1.5 rounded-full ${item.active ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
            <span className="text-muted-foreground">{item.label}:</span>
            <span className={item.active ? "text-foreground font-medium" : "text-muted-foreground"}>{item.text}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-muted-foreground">
            Controlador: <strong className="text-foreground">{controller === "mach3" ? "Mach3" : "Genérico"}</strong>
          </span>
          <span className="text-muted-foreground">
            Modo: <strong className="text-foreground">
              {mappingPrecision === "smart" ? "Inteligente" : mappingPrecision === "maximum" ? "Máxima" : "Uniforme"}
            </strong>
          </span>
          {retractionMode !== "standard" && (
            <span className="text-muted-foreground">
              Retração: <strong className="text-foreground">
                {retractionMode === "safe" ? "Segura" : "Curva"}
              </strong>
            </span>
          )}
          {probeType === "custom" && (
            <span className="text-muted-foreground">
              Probe: <strong className="text-foreground">Personalizado</strong>
              {postMappingMode !== "manual" && (
                <> · Finalização: <strong>{postMappingMode === "auto_offset" ? "Auto" : "Auto+Medição"}</strong></>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Heatmap mini-component ───────────────────────────── */
function SurfaceHeatmap({ mesh, spacingX, spacingY, cols, rows }: {
  mesh: { x: number; y: number }[];
  spacingX: number; spacingY: number; cols: number; rows: number;
}) {
  const cellW = 400 / cols;
  const cellH = 300 / rows;
  return (
    <div className="space-y-2 flex flex-col items-center">
      <svg viewBox={`0 0 400 300`} className="w-full max-w-lg border rounded-lg bg-muted/30">
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => (
            <rect
              key={`${r}-${c}`}
              x={c * cellW} y={(rows - 1 - r) * cellH}
              width={cellW} height={cellH}
              fill="hsl(var(--primary))"
              opacity={0.1 + (r / rows) * 0.3}
              stroke="hsl(var(--border))" strokeWidth={0.5}
            />
          ))
        )}
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => (
            <circle
              key={`p${r}-${c}`}
              cx={c * cellW + cellW / 2} cy={(rows - 1 - r) * cellH + cellH / 2}
              r={2.5} fill="hsl(var(--primary))" opacity={0.6}
            />
          ))
        )}
      </svg>
      <p className="text-xs text-muted-foreground">
        Grade de medição: {cols} × {rows} = {cols * rows} pontos
      </p>
    </div>
  );
}
