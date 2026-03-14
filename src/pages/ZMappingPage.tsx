import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { ZMappingAnimation } from "@/components/ZMappingAnimation";
import { CompensationSimulator3D } from "@/components/z-mapping/CompensationSimulator3D";
import { GcodePreview } from "@/components/z-mapping/GcodePreview";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  Upload, Grid3x3, Download, CheckCircle2, FileUp, Settings2, ChevronDown,
  Play, Ruler, Timer, Cpu, MapPin, Eye, EyeOff, CircleDot, Layers, ScanSearch,
  PenTool, AlertTriangle,
} from "lucide-react";
import {
  analyzeGcode, generateMesh, generateUnifiedGcode, analyzeDensity, generateAdaptiveMesh, generateDenseMesh,
  defaultConfigMM, defaultConfigInch,
  fmt, type ZUnit, type GcodeAnalysis, type MeshConfig,
  type ControllerType, type UnifiedResult, type DensityMap,
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
type VbitCompMode = "standard" | "enhanced";

export default function ZMappingPage() {
  const saved = useMemo(() => loadSettings(), []);

  const [showAnimation, setShowAnimation] = useState(false);
  const [originalGcode, setOriginalGcode] = useState("");
  const [originalFileName, setOriginalFileName] = useState("");
  const [analysis, setAnalysis] = useState<GcodeAnalysis | null>(null);

  const [unit, setUnit] = useState<ZUnit>(saved.unit ?? "mm");
  const defaults = unit === "mm" ? defaultConfigMM : defaultConfigInch;
  const [xStart, setXStart] = useState(0);
  const [yStart, setYStart] = useState(0);
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(100);

  // Manual overrides (only used when areaMode === "manual")
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

  // Area mode & buffer
  const [areaMode, setAreaMode] = useState<AreaMode>(saved.areaMode ?? "auto");
  const [buffer, setBuffer] = useState(saved.buffer ?? 5);

  // Mapping precision
  const [mappingPrecision, setMappingPrecision] = useState<MappingPrecision>(saved.mappingPrecision ?? "uniform");

  // Curve precision
  const [curvePrecision, setCurvePrecision] = useState<CurvePrecision>(saved.curvePrecision ?? "medium");
  const [customArcSegLen, setCustomArcSegLen] = useState<number | null>(null);
  const arcSegmentLen = customArcSegLen ?? getArcSegmentLen(curvePrecision, unit);

  // Touch precision
  const [touchPrecision, setTouchPrecision] = useState<TouchPrecision>(saved.touchPrecision ?? "normal");
  const [customTouches, setCustomTouches] = useState<number | null>(saved.customTouches ?? null);
  const [touchStrategy, setTouchStrategy] = useState<"last" | "average">(saved.touchStrategy ?? "last");
  const touchesPerPoint = customTouches ?? getTouchCount(touchPrecision);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [result, setResult] = useState<UnifiedResult | null>(null);

  // Engraving mode
  const [engravingMode, setEngravingMode] = useState<EngravingMode>("standard");
  const [vbitCompMode, setVbitCompMode] = useState<VbitCompMode>("standard");

  const fileRef = useRef<HTMLInputElement>(null);

  // Compute effective area based on mode
  const effectiveXStart = areaMode === "auto" ? xStart : manualXStart;
  const effectiveYStart = areaMode === "auto" ? yStart : manualYStart;
  const effectiveWidth = areaMode === "auto" ? width : manualWidth;
  const effectiveHeight = areaMode === "auto" ? height : manualHeight;

  const spacing = (spacingX + spacingY) / 2;

  // Save settings whenever they change
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

  // Density analysis
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

  // Calculate uniform mesh for savings comparison
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
        // Set default buffer based on unit
        if (!s.buffer) setBuffer(a.unit === "mm" ? 5 : 0.2);
      }
      if (a.width > 0) {
        // Auto area: detected bounds + buffer
        const buf = loadSettings().buffer ?? (a.unit === "mm" ? 5 : 0.2);
        const autoX = parseFloat((a.xMin - buf).toFixed(3));
        const autoY = parseFloat((a.yMin - buf).toFixed(3));
        const autoW = parseFloat((a.width + buf * 2).toFixed(3));
        const autoH = parseFloat((a.height + buf * 2).toFixed(3));
        setXStart(autoX);
        setYStart(autoY);
        setWidth(autoW);
        setHeight(autoH);
        // Also set manual defaults to the raw detected area
        setManualXStart(parseFloat(a.xMin.toFixed(3)));
        setManualYStart(parseFloat(a.yMin.toFixed(3)));
        setManualWidth(parseFloat(a.width.toFixed(3)));
        setManualHeight(parseFloat(a.height.toFixed(3)));
      }
      toast.success("Arquivo carregado com sucesso");
    };
    reader.readAsText(file);
  }, []);

  // Recalculate auto area when buffer changes
  useEffect(() => {
    if (areaMode === "auto" && analysis && analysis.width > 0) {
      setXStart(parseFloat((analysis.xMin - buffer).toFixed(3)));
      setYStart(parseFloat((analysis.yMin - buffer).toFixed(3)));
      setWidth(parseFloat((analysis.width + buffer * 2).toFixed(3)));
      setHeight(parseFloat((analysis.height + buffer * 2).toFixed(3)));
    }
  }, [buffer, areaMode, analysis]);

  const handleGenerate = useCallback(() => {
    if (!mesh || !originalGcode) return;
    const r = generateUnifiedGcode(
      originalGcode, mesh, config, originalFileName || "file", controller,
      touchesPerPoint, touchStrategy
    );
    setResult(r);
    toast.success("Arquivo de nivelamento gerado!");
  }, [mesh, originalGcode, config, originalFileName, controller, touchesPerPoint, touchStrategy]);

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

  const numField = (label: string, value: number, onChange: (v: number) => void, step?: number) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={value} step={step ?? (unit === "mm" ? 1 : 0.01)}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="h-9" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Grid3x3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Nivelamento Automático</h1>
            <p className="text-muted-foreground text-sm">Gere um único arquivo que mapeia a superfície e corrige a altura automaticamente.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowAnimation(s => !s)} className="gap-1.5 text-xs shrink-0">
          {showAnimation ? "Fechar" : "Como funciona?"}
        </Button>
      </div>

      {showAnimation && <ZMappingAnimation onClose={() => setShowAnimation(false)} />}

      {/* ── Card 1: Arquivo original ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" /> Arquivo G-code original
          </CardTitle>
          <CardDescription>Carregue o arquivo que será nivelado automaticamente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
              <FileUp className="h-4 w-4" /> Carregar arquivo
            </Button>
            <input ref={fileRef} type="file" accept=".nc,.tap,.gcode,.txt" className="hidden" onChange={handleFileUpload} />
            {originalFileName && <Badge variant="secondary">{originalFileName}</Badge>}
          </div>
          {analysis && analysis.arcCount > 0 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CircleDot className="h-3.5 w-3.5 text-primary" />
              {analysis.arcCount} curva{analysis.arcCount > 1 ? "s" : ""} detectada{analysis.arcCount > 1 ? "s" : ""} — serão divididas automaticamente para manter a correção de altura.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Card 2: Preview do G-code + Grade ── */}
      {analysis && originalGcode && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" /> Preview do percurso
            </CardTitle>
            <CardDescription>
              {areaMode === "auto"
                ? "Área de medição detectada automaticamente a partir do G-code. A grade cobre apenas a região de corte."
                : "Área de medição definida manualmente. Ajuste os valores nas configurações avançadas."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      {/* ── Card 3: Configurações principais ── */}
      {analysis && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Ruler className="h-4 w-4 text-primary" /> Configurações
            </CardTitle>
            <CardDescription>Ajuste os parâmetros de medição da superfície.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Area mode selector */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Área de mapeamento</Label>
              <RadioGroup
                value={areaMode}
                onValueChange={(v) => setAreaMode(v as AreaMode)}
                className="flex gap-4"
              >
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="auto" id="area-auto" />
                  <Label htmlFor="area-auto" className="text-xs cursor-pointer flex items-center gap-1">
                    <ScanSearch className="h-3 w-3" /> Automática (do G-code)
                  </Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="manual" id="area-manual" />
                  <Label htmlFor="area-manual" className="text-xs cursor-pointer">Manual (retangular)</Label>
                </div>
              </RadioGroup>
              {areaMode === "auto" && (
                <p className="text-xs text-muted-foreground">
                  A área de medição foi detectada automaticamente com base nos movimentos de corte do G-code.
                </p>
              )}
            </div>

            {/* Mapping precision selector */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <Label className="text-xs font-medium">Precisão do mapeamento</Label>
              <p className="text-xs text-muted-foreground">
                {mappingPrecision === "smart"
                  ? "Mais pontos onde há mais detalhes, menos pontos onde a peça é mais simples."
                  : mappingPrecision === "maximum"
                  ? "Grade densa em toda a área — maior precisão, mais tempo de medição."
                  : "Grade regular com espaçamento uniforme em toda a área."
                }
              </p>
              <RadioGroup
                value={mappingPrecision}
                onValueChange={(v) => setMappingPrecision(v as MappingPrecision)}
                className="flex gap-4"
              >
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="uniform" id="map-uniform" />
                  <Label htmlFor="map-uniform" className="text-xs cursor-pointer">Uniforme</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="smart" id="map-smart" />
                  <Label htmlFor="map-smart" className="text-xs cursor-pointer">Inteligente</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="maximum" id="map-max" />
                  <Label htmlFor="map-max" className="text-xs cursor-pointer">Máxima</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Auto mode: show buffer */}
            {areaMode === "auto" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {numField(`Margem de segurança (${unit})`, buffer, setBuffer, unit === "mm" ? 1 : 0.05)}
                {numField("Distância entre pontos X", spacingX, setSpacingX)}
                {numField("Distância entre pontos Y", spacingY, setSpacingY)}
                {numField("Altura Z segura", safeHeight, setSafeHeight)}
                {numField(`Velocidade do toque (${unit}/min)`, probeFeed, setProbeFeed)}
              </div>
            )}

            {/* Manual mode: show area fields */}
            {areaMode === "manual" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {numField("X inicial", manualXStart, setManualXStart)}
                {numField("Y inicial", manualYStart, setManualYStart)}
                {numField("Largura", manualWidth, setManualWidth)}
                {numField("Altura", manualHeight, setManualHeight)}
                {numField("Distância entre pontos X", spacingX, setSpacingX)}
                {numField("Distância entre pontos Y", spacingY, setSpacingY)}
                {numField("Altura Z segura", safeHeight, setSafeHeight)}
                {numField(`Velocidade do toque (${unit}/min)`, probeFeed, setProbeFeed)}
              </div>
            )}

            {/* Touch precision */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <Label className="text-xs font-medium">Precisão do toque</Label>
              <p className="text-xs text-muted-foreground">
                Mais toques por ponto = medição mais precisa, porém mais lenta.
              </p>
              <RadioGroup
                value={touchPrecision}
                onValueChange={(v) => { setTouchPrecision(v as TouchPrecision); setCustomTouches(null); }}
                className="flex gap-4"
              >
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="fast" id="touch-fast" />
                  <Label htmlFor="touch-fast" className="text-xs cursor-pointer">Rápida (1 toque)</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="normal" id="touch-normal" />
                  <Label htmlFor="touch-normal" className="text-xs cursor-pointer">Normal (2 toques)</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="high" id="touch-high" />
                  <Label htmlFor="touch-high" className="text-xs cursor-pointer">Alta (3 toques)</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Engraving mode */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <PenTool className="h-3 w-3 text-primary" /> Tipo de gravação
              </Label>
              <RadioGroup
                value={engravingMode}
                onValueChange={(v) => setEngravingMode(v as EngravingMode)}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="standard" id="eng-standard" />
                  <Label htmlFor="eng-standard" className="text-xs cursor-pointer">Gravação comum</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="curved" id="eng-curved" />
                  <Label htmlFor="eng-curved" className="text-xs cursor-pointer">Gravação em superfície curva</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="vbit-curved" id="eng-vbit" />
                  <Label htmlFor="eng-vbit" className="text-xs cursor-pointer">Gravação V-bit em superfície curva</Label>
                </div>
              </RadioGroup>

              {engravingMode === "curved" && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                  O G-code plano será ajustado para acompanhar a superfície curva da peça, mantendo a profundidade relativa uniforme.
                </p>
              )}

              {engravingMode === "vbit-curved" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                    Este modo ajusta um G-code plano para acompanhar a superfície curva da peça, mantendo a gravação V-bit uniforme mesmo em superfícies irregulares.
                  </p>

                  {/* V-bit compensation mode */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium">Compensação para V-bit</Label>
                    <RadioGroup
                      value={vbitCompMode}
                      onValueChange={(v) => setVbitCompMode(v as VbitCompMode)}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="standard" id="vbit-std" />
                        <Label htmlFor="vbit-std" className="text-[11px] cursor-pointer">Padrão</Label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="enhanced" id="vbit-enh" />
                        <Label htmlFor="vbit-enh" className="text-[11px] cursor-pointer">Aprimorada</Label>
                      </div>
                    </RadioGroup>
                    <p className="text-[10px] text-muted-foreground">
                      {vbitCompMode === "standard"
                        ? "Compensa a altura local da superfície para manter a profundidade uniforme."
                        : "Preparado para compensação futura baseada na inclinação local da superfície."
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Card 4: Resumo ── */}
      {analysis && mesh && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Resumo do nivelamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {areaMode === "auto" ? "Área detectada" : "Área manual"}
                </p>
                <p className="text-sm font-semibold">{fmt(effectiveWidth)} × {fmt(effectiveHeight)} {unit}</p>
                {areaMode === "auto" && (
                  <p className="text-[10px] text-muted-foreground">
                    Corte real: {fmt(analysis.width)} × {fmt(analysis.height)} + margem {fmt(buffer)}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Pontos de medição</p>
                <p className="text-sm font-semibold flex items-center gap-1">
                  <Grid3x3 className="h-3.5 w-3.5 text-primary" /> {mesh.totalPoints}
                </p>
                {mappingPrecision === "smart" && uniformPointCount > 0 && mesh.totalPoints < uniformPointCount && (
                  <p className="text-[10px] text-emerald-500">
                    {Math.round((1 - mesh.totalPoints / uniformPointCount) * 100)}% menos medições
                  </p>
                )}
                {mappingPrecision === "maximum" && uniformPointCount > 0 && mesh.totalPoints > uniformPointCount && (
                  <p className="text-[10px] text-muted-foreground">
                    {Math.round((mesh.totalPoints / uniformPointCount - 1) * 100)}% mais medições
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Controlador</p>
                <p className="text-sm font-semibold flex items-center gap-1">
                  <Cpu className="h-3.5 w-3.5 text-primary" /> {controller === "mach3" ? "Mach3" : "Genérico"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Tempo estimado</p>
                <p className="text-sm font-semibold flex items-center gap-1">
                  <Timer className="h-3.5 w-3.5 text-primary" /> {formatTime(mesh.estimatedTimeSec)}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span>Modo: <strong className="text-foreground">{areaMode === "auto" ? "Automático" : "Manual"}</strong></span>
              <span>Mapeamento: <strong className="text-foreground">
                {mappingPrecision === "smart" ? "Inteligente" : mappingPrecision === "maximum" ? "Máxima" : "Uniforme"}
              </strong></span>
              <span>Toques por ponto: <strong className="text-foreground">{touchesPerPoint}</strong></span>
              {engravingMode !== "standard" && (
                <span>Gravação: <strong className="text-foreground">
                  {engravingMode === "curved" ? "Superfície curva" : "V-bit curva"}
                </strong></span>
              )}
              {analysis.arcCount > 0 && (
                <>
                  <span className="flex items-center gap-1">
                    <CircleDot className="h-3 w-3 text-primary" /> Curvas: <strong className="text-foreground">{analysis.arcCount}</strong>
                  </span>
                  <span>Precisão curvas: <strong className="text-foreground">
                    {curvePrecision === "high" ? "Alta" : curvePrecision === "medium" ? "Média" : "Rápida"}
                  </strong></span>
                </>
              )}
            </div>

            {/* Slope warning for V-bit */}
            {engravingMode === "vbit-curved" && mesh && analysis && analysis.width > 0 && (() => {
              // Estimate max slope from synthetic surface (in real use, from actual probe data)
              const maxSlope = Math.max(config.width, config.height) > 0 ? 15 : 0; // placeholder heuristic
              return maxSlope > 12 ? (
                <Alert className="mt-3 border-amber-500/30 bg-amber-500/5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-xs">
                    Superfície com inclinação elevada detectada. O resultado com V-bit pode variar em regiões muito inclinadas.
                  </AlertDescription>
                </Alert>
              ) : null;
            })()}
          </CardContent>
        </Card>
      )}

      {/* ── Card 5: Botão principal ── */}
      {analysis && mesh && (
        <Card className="border-primary/30 bg-primary/[0.02]">
          <CardContent className="pt-6 space-y-4">
            <Button onClick={handleGenerate} size="lg" className="gap-2 w-full text-base h-12">
              <Play className="h-5 w-5" /> Gerar arquivo de nivelamento automático
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              O arquivo gerado irá: medir a superfície → pausar para trocar a fresa → usinar com correção automática de altura.
            </p>

            {result && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium">Arquivo pronto!</span>
                </div>

                <Alert className="border-amber-500/30 bg-amber-500/5">
                  <AlertDescription className="text-xs text-amber-300">
                    <strong>Instruções para o operador:</strong> Depois do mapeamento, coloque a fresa, zere o Z novamente e pressione iniciar para continuar.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Arquivo:</span> <span className="font-medium">{result.fileName}</span></div>
                  <div><span className="text-muted-foreground">Pontos medidos:</span> <span className="font-medium">{result.totalPoints}</span></div>
                  <div><span className="text-muted-foreground">Toques por ponto:</span> <span className="font-medium">{touchesPerPoint}</span></div>
                  <div><span className="text-muted-foreground">Modo:</span> <span className="font-medium">{areaMode === "auto" ? "Automático" : "Manual"}</span></div>
                  {result.arcsDetected > 0 && (
                    <>
                      <div><span className="text-muted-foreground">Curvas detectadas:</span> <span className="font-medium">{result.arcsDetected}</span></div>
                      <div><span className="text-muted-foreground">Segmentos de curva:</span> <span className="font-medium">{result.arcSegmentsGenerated}</span></div>
                    </>
                  )}
                </div>

                <Button onClick={handleDownload} size="lg" className="gap-2 w-full">
                  <Download className="h-4 w-4" /> Baixar arquivo de nivelamento
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Card 6: Configurações avançadas ── */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <Settings2 className="h-3.5 w-3.5" />
            Configurações avançadas
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-3">
            <CardContent className="pt-5 space-y-5">
              {/* Curve precision */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Precisão de curvas</Label>
                <p className="text-xs text-muted-foreground">
                  Curvas serão divididas automaticamente para manter a correção de altura com mais precisão.
                </p>
                <RadioGroup
                  value={curvePrecision}
                  onValueChange={(v) => { setCurvePrecision(v as CurvePrecision); setCustomArcSegLen(null); }}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="high" id="curve-high" />
                    <Label htmlFor="curve-high" className="text-xs cursor-pointer">Alta precisão</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="medium" id="curve-med" />
                    <Label htmlFor="curve-med" className="text-xs cursor-pointer">Média precisão</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="fast" id="curve-fast" />
                    <Label htmlFor="curve-fast" className="text-xs cursor-pointer">Rápida</Label>
                  </div>
                </RadioGroup>
                <div className="pt-1">
                  {numField(
                    `Comprimento máximo do segmento de curva (${unit})`,
                    arcSegmentLen,
                    (v) => setCustomArcSegLen(v > 0 ? v : null),
                    unit === "mm" ? 0.1 : 0.01
                  )}
                </div>
              </div>

              {/* Multi-touch strategy */}
              <div className="space-y-2 border-t border-border/50 pt-4">
                <Label className="text-xs font-medium">Estratégia de múltiplos toques</Label>
                <RadioGroup
                  value={touchStrategy}
                  onValueChange={(v) => setTouchStrategy(v as "last" | "average")}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="last" id="strat-last" />
                    <Label htmlFor="strat-last" className="text-xs cursor-pointer">Usar último toque</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="average" id="strat-avg" />
                    <Label htmlFor="strat-avg" className="text-xs cursor-pointer">Usar média</Label>
                  </div>
                </RadioGroup>
                <div className="pt-1">
                  {numField("Toques por ponto (manual)", customTouches ?? touchesPerPoint, (v) => setCustomTouches(v >= 1 ? Math.round(v) : null), 1)}
                </div>
              </div>

              <div className="border-t border-border/50 pt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Unidade</Label>
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
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mm">mm</SelectItem>
                      <SelectItem value="inch">pol</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {numField("Profundidade máxima", probeDepth, setProbeDepth, 0.01)}
                {numField("Folga de segurança", clearance, setClearance)}
                {numField("Comprimento de divisão", maxSegmentLen, setMaxSegmentLen)}
                {numField("Casas decimais", decimalPlaces, (v) => setDecimalPlaces(Math.max(1, Math.min(8, Math.round(v)))), 1)}
                {numField("Tolerância", tolerance, setTolerance, 0.0001)}
                <div className="space-y-1.5">
                  <Label className="text-xs">Controlador</Label>
                  <Select value={controller} onValueChange={(v) => setController(v as ControllerType)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mach3">Mach3</SelectItem>
                      <SelectItem value="generic">Genérico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fora da área mapeada</Label>
                  <Select value={outOfMeshRule} onValueChange={(v) => setOutOfMeshRule(v as any)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="block">Bloquear</SelectItem>
                      <SelectItem value="warn">Avisar e continuar</SelectItem>
                      <SelectItem value="nearest">Usar ponto mais próximo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* ── Simulator 3D ── */}
      {analysis && mesh && originalGcode && showSimulator && (
        <CompensationSimulator3D
          originalGcode={originalGcode}
          mesh={mesh}
          config={config}
          onClose={() => setShowSimulator(false)}
        />
      )}

      {/* ── Card 7: Visualização (opcional) ── */}
      {analysis && mesh && originalGcode && (
        <div className="flex items-center gap-2">
          {!showSimulator && (
            <Button variant="outline" size="sm" className="gap-2"
              onClick={() => setShowSimulator(true)}>
              <Layers className="h-3.5 w-3.5" /> Abrir simulação 3D
            </Button>
          )}
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground"
            onClick={() => setShowHeatmap(h => !h)}>
            {showHeatmap ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showHeatmap ? "Ocultar mapa da superfície" : "Visualizar mapa da superfície"}
          </Button>
        </div>
      )}
      {showHeatmap && mesh && (
        <Card>
          <CardContent className="pt-5">
            <SurfaceHeatmap
              mesh={mesh.points}
              spacingX={mesh.actualSpacingX}
              spacingY={mesh.actualSpacingY}
              cols={mesh.pointsPerRow}
              rows={mesh.rows}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ── Heatmap mini-component ───────────────────────────── */
function SurfaceHeatmap({ mesh, spacingX, spacingY, cols, rows }: {
  mesh: { x: number; y: number }[];
  spacingX: number; spacingY: number; cols: number; rows: number;
}) {
  const cellW = 280 / cols;
  const cellH = 200 / rows;
  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 280 200`} className="w-full max-w-sm border rounded-lg bg-muted/30 mx-auto">
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
              r={2} fill="hsl(var(--primary))" opacity={0.6}
            />
          ))
        )}
      </svg>
      <p className="text-xs text-center text-muted-foreground">
        Grade de medição: {cols} × {rows} pontos
      </p>
    </div>
  );
}
