import { useState, useMemo, useCallback, useRef } from "react";
import { ZMappingAnimation } from "@/components/ZMappingAnimation";
import { CompensationSimulator } from "@/components/z-mapping/CompensationSimulator";
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
  Play, Ruler, Timer, Cpu, MapPin, Eye, EyeOff, CircleDot, Layers
} from "lucide-react";
import {
  analyzeGcode, generateMesh, generateUnifiedGcode,
  defaultConfigMM, defaultConfigInch,
  fmt, type ZUnit, type GcodeAnalysis, type MeshConfig,
  type ControllerType, type UnifiedResult,
} from "@/lib/z-mapping-engine";

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

/* ── Curve precision presets ───────────────────────────── */
type CurvePrecision = "high" | "medium" | "fast";

function getArcSegmentLen(precision: CurvePrecision, unit: ZUnit): number {
  if (unit === "mm") {
    if (precision === "high") return 0.5;
    if (precision === "medium") return 1.0;
    return 2.0;
  }
  // inch
  if (precision === "high") return 0.02;
  if (precision === "medium") return 0.04;
  return 0.08;
}

export default function ZMappingPage() {
  const [showAnimation, setShowAnimation] = useState(false);
  const [originalGcode, setOriginalGcode] = useState("");
  const [originalFileName, setOriginalFileName] = useState("");
  const [analysis, setAnalysis] = useState<GcodeAnalysis | null>(null);

  const [unit, setUnit] = useState<ZUnit>("mm");
  const defaults = unit === "mm" ? defaultConfigMM : defaultConfigInch;
  const [xStart, setXStart] = useState(0);
  const [yStart, setYStart] = useState(0);
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(100);
  const [spacingX, setSpacingX] = useState(defaults.spacing);
  const [spacingY, setSpacingY] = useState(defaults.spacing);
  const [probeFeed, setProbeFeed] = useState(defaults.probeFeed);
  const [probeDepth, setProbeDepth] = useState(defaults.probeDepth);
  const [clearance, setClearance] = useState(defaults.clearance);
  const [safeHeight, setSafeHeight] = useState(defaults.safeHeight);
  const [maxSegmentLen, setMaxSegmentLen] = useState(defaults.maxSegmentLen);
  const [decimalPlaces, setDecimalPlaces] = useState(defaults.decimalPlaces);
  const [outOfMeshRule, setOutOfMeshRule] = useState<"block" | "warn" | "nearest">("warn");
  const [tolerance, setTolerance] = useState(defaults.tolerance);
  const [controller, setController] = useState<ControllerType>("mach3");

  // Curve precision
  const [curvePrecision, setCurvePrecision] = useState<CurvePrecision>("medium");
  const [customArcSegLen, setCustomArcSegLen] = useState<number | null>(null);
  const arcSegmentLen = customArcSegLen ?? getArcSegmentLen(curvePrecision, unit);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [result, setResult] = useState<UnifiedResult | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const spacing = (spacingX + spacingY) / 2;

  const config: MeshConfig = useMemo(() => ({
    unit, xStart, yStart, width, height, spacing, probeFeed, probeDepth,
    clearance, safeHeight, maxSegmentLen, arcSegmentLen, decimalPlaces, outOfMeshRule, tolerance,
  }), [unit, xStart, yStart, width, height, spacing, probeFeed, probeDepth,
    clearance, safeHeight, maxSegmentLen, arcSegmentLen, decimalPlaces, outOfMeshRule, tolerance]);

  const mesh = useMemo(() => {
    if (width <= 0 || height <= 0 || spacing <= 0) return null;
    return generateMesh(config);
  }, [config, width, height, spacing]);

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
        setSpacingX(d.spacing); setSpacingY(d.spacing);
        setProbeFeed(d.probeFeed); setProbeDepth(d.probeDepth);
        setClearance(d.clearance); setSafeHeight(d.safeHeight);
        setMaxSegmentLen(d.maxSegmentLen); setTolerance(d.tolerance);
        setCustomArcSegLen(null);
      }
      if (a.width > 0) {
        setXStart(parseFloat(a.xMin.toFixed(3)));
        setYStart(parseFloat(a.yMin.toFixed(3)));
        setWidth(parseFloat(a.width.toFixed(3)));
        setHeight(parseFloat(a.height.toFixed(3)));
      }
      toast.success("Arquivo carregado com sucesso");
    };
    reader.readAsText(file);
  }, []);

  const handleGenerate = useCallback(() => {
    if (!mesh || !originalGcode) return;
    const r = generateUnifiedGcode(originalGcode, mesh, config, originalFileName || "file", controller);
    setResult(r);
    toast.success("Arquivo de nivelamento gerado!");
  }, [mesh, originalGcode, config, originalFileName, controller]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    const blob = new Blob([result.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = result.fileName; a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const formatTime = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
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
              {analysis.arcCount} curva{analysis.arcCount > 1 ? "s" : ""} detectada{analysis.arcCount > 1 ? "s" : ""} — serão divididas automaticamente para manter a correção de altura com mais precisão.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Card 2: Configurações principais ── */}
      {analysis && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Ruler className="h-4 w-4 text-primary" /> Configurações
            </CardTitle>
            <CardDescription>Ajuste a distância entre os pontos de medição e a altura segura.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {numField("Altura Z segura", safeHeight, setSafeHeight)}
              {numField("Distância entre pontos X", spacingX, setSpacingX)}
              {numField("Distância entre pontos Y", spacingY, setSpacingY)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Card 3: Resumo ── */}
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
                <p className="text-xs text-muted-foreground">Área detectada</p>
                <p className="text-sm font-semibold">{fmt(width)} × {fmt(height)} {unit}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total de pontos</p>
                <p className="text-sm font-semibold flex items-center gap-1">
                  <Grid3x3 className="h-3.5 w-3.5 text-primary" /> {mesh.totalPoints}
                </p>
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
            {analysis.arcCount > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CircleDot className="h-3 w-3 text-primary" /> Curvas: <strong className="text-foreground">{analysis.arcCount}</strong>
                </span>
                <span>Precisão: <strong className="text-foreground">
                  {curvePrecision === "high" ? "Alta" : curvePrecision === "medium" ? "Média" : "Rápida"}
                </strong></span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Card 4: Botão principal ── */}
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

      {/* ── Card 5: Configurações avançadas ── */}
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
                  }}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mm">mm</SelectItem>
                      <SelectItem value="inch">pol</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {numField("X inicial", xStart, setXStart)}
                {numField("Y inicial", yStart, setYStart)}
                {numField("Largura", width, setWidth)}
                {numField("Altura", height, setHeight)}
                {numField("Velocidade de medição", probeFeed, setProbeFeed)}
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

      {/* ── Simulator ── */}
      {analysis && mesh && originalGcode && showSimulator && (
        <CompensationSimulator
          originalGcode={originalGcode}
          mesh={mesh}
          config={config}
          onClose={() => setShowSimulator(false)}
        />
      )}

      {/* ── Card 6: Visualização (opcional) ── */}
      {analysis && mesh && originalGcode && (
        <div className="flex items-center gap-2">
          {!showSimulator && (
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground"
              onClick={() => setShowSimulator(true)}>
              <Layers className="h-3.5 w-3.5" /> Visualizar compensação
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
