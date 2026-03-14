import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Crosshair, Download, Play, Target, Square, Circle, Disc,
  Settings2, ChevronDown, Eye, Copy, ShieldCheck, ArrowDown, AlertTriangle,
  Upload, Wrench, FileText,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  generateCenterCornersGcode, defaultCenterCornersConfig,
  type LocationMode, type CenterCornersConfig, type CenterCornersResult,
  type ZProbeMode, type HoleZStrategy, type ProbeType, type PostLocationAction,
  type CustomProbeConfig, defaultCustomProbeConfig,
} from "@/lib/center-corners-engine";
import InteractiveProbeDiagram from "@/components/center-corners/InteractiveProbeDiagram";

/* ── Mode metadata ─────────────────────────────── */
const MODE_INFO: Record<LocationMode, { label: string; icon: typeof Square; desc: string }> = {
  corner: { label: "Achar Quina", icon: Square, desc: "Toque em dois lados para encontrar o vértice da peça." },
  "rect-center": { label: "Centro Retangular", icon: Target, desc: "Toque nos 4 lados para encontrar o centro da peça." },
  "circle-center": { label: "Centro Circular", icon: Circle, desc: "Toque em pontos ao redor do círculo para encontrar o centro." },
  "hole-center": { label: "Centro de Furo", icon: Disc, desc: "Toque as bordas internas para encontrar o centro do furo." },
};

const Z_PROBE_LABELS: Record<ZProbeMode, string> = {
  none: "Não fazer",
  auto: "Fazer automaticamente",
  manual: "Configurar manualmente",
};

/* ── Num field ─────────────────────────────────── */
function NumField({ label, value, onChange, step, hint }: {
  label: string; value: number; onChange: (v: number) => void; step?: number; hint?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Input type="number" value={value} step={step ?? 1}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="h-8 text-xs" />
      {hint && <p className="text-[10px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

/* ── Main Page ─────────────────────────────────── */
export default function CenterCornersPage() {
  const [mode, setMode] = useState<LocationMode>("corner");
  const [safeZ, setSafeZ] = useState(defaultCenterCornersConfig.safeZ);
  const [probeFeed, setProbeFeed] = useState(defaultCenterCornersConfig.probeFeed);
  const [probeDepth, setProbeDepth] = useState(defaultCenterCornersConfig.probeDepth);
  const [probeDiameter, setProbeDiameter] = useState(defaultCenterCornersConfig.probeDiameter);
  const [cornerQuadrant, setCornerQuadrant] = useState(defaultCenterCornersConfig.cornerQuadrant);
  const [approxSizeX, setApproxSizeX] = useState(defaultCenterCornersConfig.approxSizeX);
  const [approxSizeY, setApproxSizeY] = useState(defaultCenterCornersConfig.approxSizeY);
  const [approxDiameter, setApproxDiameter] = useState(defaultCenterCornersConfig.approxDiameter);
  const [circlePoints, setCirclePoints] = useState(defaultCenterCornersConfig.circlePoints);
  const [setOrigin, setSetOrigin] = useState(defaultCenterCornersConfig.setOrigin);
  const [moveToCenter, setMoveToCenter] = useState(defaultCenterCornersConfig.moveToCenter);
  const [controller, setController] = useState(defaultCenterCornersConfig.controller);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [result, setResult] = useState<CenterCornersResult | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  // Refinement
  const [refinementEnabled, setRefinementEnabled] = useState(defaultCenterCornersConfig.refinementEnabled);
  const [refinementDistance, setRefinementDistance] = useState(defaultCenterCornersConfig.refinementDistance);
  const [refinementFeed, setRefinementFeed] = useState(defaultCenterCornersConfig.refinementFeed);
  const [refinementCycles, setRefinementCycles] = useState(defaultCenterCornersConfig.refinementCycles);

  // Z Probe
  const [zProbeMode, setZProbeMode] = useState<ZProbeMode>(defaultCenterCornersConfig.zProbeMode);
  const [zProbeFeed, setZProbeFeed] = useState(defaultCenterCornersConfig.zProbeFeed);
  const [zProbeTravel, setZProbeTravel] = useState(defaultCenterCornersConfig.zProbeTravel);
  const [zSetOrigin, setZSetOrigin] = useState(defaultCenterCornersConfig.zSetOrigin);
  const [zCornerInset, setZCornerInset] = useState(defaultCenterCornersConfig.zCornerInset);
  const [holeZStrategy, setHoleZStrategy] = useState<HoleZStrategy>(defaultCenterCornersConfig.holeZStrategy);
  const [holeZSafetyMargin, setHoleZSafetyMargin] = useState(defaultCenterCornersConfig.holeZSafetyMargin);
  const [holeZManualOffsetX, setHoleZManualOffsetX] = useState(defaultCenterCornersConfig.holeZManualOffsetX);
  const [holeZManualOffsetY, setHoleZManualOffsetY] = useState(defaultCenterCornersConfig.holeZManualOffsetY);

  // Custom probe
  const [probeType, setProbeType] = useState<ProbeType>(defaultCenterCornersConfig.probeType);
  const [customProbe, setCustomProbe] = useState<CustomProbeConfig>({ ...defaultCustomProbeConfig });
  const updateCustomProbe = (patch: Partial<CustomProbeConfig>) => setCustomProbe(prev => ({ ...prev, ...patch }));

  // Post-location action
  const [postAction, setPostAction] = useState<PostLocationAction>(defaultCenterCornersConfig.postAction);
  const [workGcode, setWorkGcode] = useState<string>("");
  const [workFileName, setWorkFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const modeInfo = MODE_INFO[mode];
  const zProbeActive = zProbeMode !== "none";

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWorkFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setWorkGcode(ev.target?.result as string || "");
      toast.success(`Arquivo "${file.name}" carregado!`);
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const handleGenerate = useCallback(() => {
    const cfg: CenterCornersConfig = {
      mode, safeZ, probeFeed, probeDepth, probeDiameter,
      cornerQuadrant: cornerQuadrant as any,
      approxSizeX, approxSizeY, approxDiameter, circlePoints,
      setOrigin, moveToCenter, decimalPlaces: 3, controller: controller as any,
      refinementEnabled, refinementDistance, refinementFeed, refinementCycles,
      zProbeMode, zProbeFeed, zProbeTravel, zSetOrigin, zCornerInset,
      holeZStrategy, holeZSafetyMargin, holeZManualOffsetX, holeZManualOffsetY,
      probeType, customProbe, postAction,
    };
    try {
      const gcWork = postAction === "locate-machining" ? workGcode : undefined;
      const r = generateCenterCornersGcode(cfg, gcWork);
      setResult(r);
      toast.success("G-code gerado com sucesso!");
    } catch (err: any) {
      toast.error("Erro: " + (err?.message || "erro desconhecido"));
    }
  }, [mode, safeZ, probeFeed, probeDepth, probeDiameter, cornerQuadrant, approxSizeX, approxSizeY, approxDiameter, circlePoints, setOrigin, moveToCenter, controller, refinementEnabled, refinementDistance, refinementFeed, refinementCycles, zProbeMode, zProbeFeed, zProbeTravel, zSetOrigin, zCornerInset, holeZStrategy, holeZSafetyMargin, holeZManualOffsetX, holeZManualOffsetY, probeType, customProbe, postAction, workGcode]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    const blob = new Blob([result.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = result.fileName; a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo baixado!");
  }, [result]);

  const handleCopy = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result.code);
    toast.success("Copiado!");
  }, [result]);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-background overflow-hidden">
      {/* ── Top bar ── */}
      <div className="h-12 border-b border-border bg-card/80 flex items-center px-4 gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
            <Crosshair className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-none">Centro e Quinas</h1>
            <p className="text-[10px] text-muted-foreground">Localizar centro e quinas de peças com probe</p>
          </div>
        </div>

        <div className="flex-1" />

        <Button size="sm" variant="outline" onClick={handleGenerate} className="gap-1.5 text-xs h-8">
          <Play className="h-3.5 w-3.5" /> Gerar G-code
        </Button>
        {result && (
          <>
            <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5 text-xs h-8">
              <Copy className="h-3.5 w-3.5" /> Copiar
            </Button>
            <Button size="sm" onClick={handleDownload} className="gap-1.5 text-xs h-8">
              <Download className="h-3.5 w-3.5" /> Baixar
            </Button>
          </>
        )}
      </div>

      {/* ── Main 3 columns ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT PANEL */}
        <div className="w-[270px] shrink-0 border-r border-border bg-card/60 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-border/50">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Settings2 className="h-3 w-3" /> Configuração
            </span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-4">

              {/* Mode selector */}
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Tipo de localização</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.entries(MODE_INFO) as [LocationMode, typeof MODE_INFO["corner"]][]).map(([key, info]) => {
                    const Icon = info.icon;
                    return (
                      <button key={key} onClick={() => { setMode(key); setResult(null); }}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-[10px] transition-all ${
                          mode === key
                            ? "border-primary bg-primary/5 text-primary font-medium"
                            : "border-border hover:bg-muted/50 text-muted-foreground"
                        }`}>
                        <Icon className="h-4 w-4" />
                        {info.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground/80 leading-relaxed">{modeInfo.desc}</p>

              <Separator />

              {/* Main params */}
              <NumField label="Altura segura (mm)" value={safeZ} onChange={setSafeZ} step={0.5}
                hint="Altura de deslocamento sem tocar na peça." />
              <NumField label="Velocidade do toque (mm/min)" value={probeFeed} onChange={setProbeFeed} step={10}
                hint="Velocidade usada para medir a superfície." />
              <NumField label="Diâmetro do probe (mm)" value={probeDiameter} onChange={setProbeDiameter} step={0.1}
                hint="Diâmetro da ponta de medição." />

              {/* Mode-specific params */}
              {mode === "corner" && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Quina a localizar</Label>
                  <Select value={cornerQuadrant} onValueChange={(v) => setCornerQuadrant(v as any)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="front-left">Frontal esquerda</SelectItem>
                      <SelectItem value="front-right">Frontal direita</SelectItem>
                      <SelectItem value="back-left">Traseira esquerda</SelectItem>
                      <SelectItem value="back-right">Traseira direita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {mode === "rect-center" && (
                <>
                  <NumField label="Tamanho aprox. X (mm)" value={approxSizeX} onChange={setApproxSizeX} step={5} />
                  <NumField label="Tamanho aprox. Y (mm)" value={approxSizeY} onChange={setApproxSizeY} step={5} />
                </>
              )}

              {(mode === "circle-center" || mode === "hole-center") && (
                <NumField label="Diâmetro aproximado (mm)" value={approxDiameter} onChange={setApproxDiameter} step={5} />
              )}

              {mode === "circle-center" && (
                <NumField label="Pontos de medição" value={circlePoints} onChange={(v) => setCirclePoints(Math.max(3, Math.round(v)))} step={1}
                  hint="Mais pontos = mais precisão." />
              )}

              <Separator />

              {/* ── Refinement toggle ── */}
              <div className="rounded-lg border border-border/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-chart-2" />
                    <Label className="text-[11px] font-medium">Conferência de precisão</Label>
                  </div>
                  <Switch checked={refinementEnabled} onCheckedChange={setRefinementEnabled} />
                </div>
                <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                  Refaz a medição mais perto da borda para aumentar a precisão.
                </p>
              </div>

              <Separator />

              {/* ── Z Probe toggle ── */}
              <div className="rounded-lg border border-border/50 p-3 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <ArrowDown className="h-3.5 w-3.5 text-chart-5" />
                  <Label className="text-[11px] font-medium">Probe em Z após localização</Label>
                </div>
                <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                  Após localizar centro ou quina, a máquina também pode medir a altura da peça.
                </p>
                <Select value={zProbeMode} onValueChange={(v) => setZProbeMode(v as ZProbeMode)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não fazer</SelectItem>
                    <SelectItem value="auto">Fazer automaticamente</SelectItem>
                    <SelectItem value="manual">Configurar manualmente</SelectItem>
                  </SelectContent>
                </Select>

                {/* Hole-specific warning */}
                {zProbeActive && mode === "hole-center" && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2 flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-[10px] text-destructive leading-relaxed">
                      Em furos, o toque em Z não será feito no centro vazio, e sim em uma região segura ao redor.
                    </p>
                  </div>
                )}

                {/* Hole Z strategy */}
                {zProbeActive && mode === "hole-center" && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-chart-5 font-semibold uppercase">Estratégia Z para furo</Label>
                    <Select value={holeZStrategy} onValueChange={(v) => setHoleZStrategy(v as HoleZStrategy)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto-safe">Automática pela borda segura</SelectItem>
                        <SelectItem value="manual-offset">Ponto deslocado manual</SelectItem>
                        <SelectItem value="none">Não fazer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Z set origin */}
                {zProbeActive && (
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-muted-foreground">Definir Z=0</Label>
                    <Switch checked={zSetOrigin} onCheckedChange={setZSetOrigin} />
                  </div>
                )}
              </div>

              <Separator />

              {/* ── Probe Type ── */}
              <div className="rounded-lg border border-border/50 p-3 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5 text-chart-3" />
                  <Label className="text-[11px] font-medium">Tipo de probe</Label>
                </div>
                <Select value={probeType} onValueChange={(v) => setProbeType(v as ProbeType)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Probe padrão</SelectItem>
                    <SelectItem value="custom">Probe personalizado</SelectItem>
                  </SelectContent>
                </Select>

                {probeType === "custom" && (
                  <div className="space-y-2.5 pt-1">
                    <p className="text-[10px] text-muted-foreground/70">
                      Para probe lateral ao spindle, pneumático ou outro sistema deslocado.
                    </p>

                    <p className="text-[10px] font-semibold text-chart-3 uppercase tracking-wider">Offset do probe</p>
                    <NumField label="Offset X (mm)" value={customProbe.offsetX} onChange={(v) => updateCustomProbe({ offsetX: v })} step={0.1} />
                    <NumField label="Offset Y (mm)" value={customProbe.offsetY} onChange={(v) => updateCustomProbe({ offsetY: v })} step={0.1} />
                    <NumField label="Offset Z (mm)" value={customProbe.offsetZ} onChange={(v) => updateCustomProbe({ offsetZ: v })} step={0.1} />

                    <Separator />
                    <p className="text-[10px] font-semibold text-chart-3 uppercase tracking-wider">Início do probe</p>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Comando inicial</Label>
                      <Input value={customProbe.startCommand} onChange={(e) => updateCustomProbe({ startCommand: e.target.value })}
                        className="h-8 text-xs font-mono" placeholder="M10" />
                    </div>
                    <NumField label="Espera após acionamento (s)" value={customProbe.startDwell} onChange={(v) => updateCustomProbe({ startDwell: v })} step={0.5} />
                    <NumField label="Altura segura antes (mm)" value={customProbe.startSafeZ} onChange={(v) => updateCustomProbe({ startSafeZ: v })} step={1} />

                    <Separator />
                    <p className="text-[10px] font-semibold text-chart-3 uppercase tracking-wider">Final do probe</p>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Comando final</Label>
                      <Input value={customProbe.endCommand} onChange={(e) => updateCustomProbe({ endCommand: e.target.value })}
                        className="h-8 text-xs font-mono" placeholder="M11" />
                    </div>
                    <NumField label="Espera após recolhimento (s)" value={customProbe.endDwell} onChange={(v) => updateCustomProbe({ endDwell: v })} step={0.5} />
                    <NumField label="Altura segura antes do trabalho (mm)" value={customProbe.endSafeZ} onChange={(v) => updateCustomProbe({ endSafeZ: v })} step={1} />
                  </div>
                )}
              </div>

              <Separator />

              {/* ── Post-location action ── */}
              <div className="rounded-lg border border-border/50 p-3 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-chart-1" />
                  <Label className="text-[11px] font-medium">Após a localização</Label>
                </div>
                <Select value={postAction} onValueChange={(v) => setPostAction(v as PostLocationAction)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="locate-only">Apenas localizar</SelectItem>
                    <SelectItem value="locate-origin">Localizar e definir origem</SelectItem>
                    <SelectItem value="locate-machining">Localizar e iniciar usinagem</SelectItem>
                  </SelectContent>
                </Select>

                {postAction === "locate-machining" && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                      Localiza a peça automaticamente e inicia o trabalho em seguida, sem rodar dois arquivos separados.
                    </p>
                    <input ref={fileInputRef} type="file" accept=".tap,.nc,.gcode,.txt,.ngc" className="hidden" onChange={handleFileUpload} />
                    <Button variant="outline" size="sm" className="w-full text-xs h-8 gap-1.5" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-3.5 w-3.5" />
                      {workFileName || "Carregar G-code do trabalho"}
                    </Button>
                    {workFileName && (
                      <div className="rounded-md bg-chart-1/10 border border-chart-1/20 p-2">
                        <p className="text-[10px] text-chart-1 font-medium">{workFileName}</p>
                        <p className="text-[9px] text-muted-foreground">{workGcode.split("\n").length} linhas carregadas</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Options */}
              <div className="flex items-center justify-between">
                <Label className="text-[11px] text-muted-foreground">Definir origem X/Y</Label>
                <Switch checked={setOrigin} onCheckedChange={setSetOrigin} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-[11px] text-muted-foreground">Mover para ponto encontrado</Label>
                <Switch checked={moveToCenter} onCheckedChange={setMoveToCenter} />
              </div>

              {/* Advanced */}
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between text-xs h-8 text-muted-foreground">
                    Configurações avançadas
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  <NumField label="Profundidade do probe (mm)" value={probeDepth} onChange={setProbeDepth} step={0.5} />
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Controlador</Label>
                    <Select value={controller} onValueChange={(v) => setController(v as any)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mach3">Mach3</SelectItem>
                        <SelectItem value="grbl">GRBL</SelectItem>
                        <SelectItem value="linuxcnc">LinuxCNC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Refinement advanced */}
                  {refinementEnabled && (
                    <>
                      <Separator />
                      <p className="text-[10px] font-semibold text-chart-2 uppercase tracking-wider">Parâmetros do refinamento</p>
                      <NumField label="Distância de refinamento (mm)" value={refinementDistance} onChange={setRefinementDistance} step={0.5}
                        hint="Curso menor para o toque de conferência." />
                      <NumField label="Velocidade do segundo toque (mm/min)" value={refinementFeed} onChange={setRefinementFeed} step={5}
                        hint="Mais lento = mais precisão." />
                      <NumField label="Ciclos de conferência" value={refinementCycles} onChange={(v) => setRefinementCycles(Math.max(1, Math.round(v)))} step={1}
                        hint="Número de repetições do refinamento." />
                    </>
                  )}

                  {/* Z Probe advanced */}
                  {zProbeActive && (
                    <>
                      <Separator />
                      <p className="text-[10px] font-semibold text-chart-5 uppercase tracking-wider">Parâmetros do probe Z</p>
                      <NumField label="Velocidade do probe Z (mm/min)" value={zProbeFeed} onChange={setZProbeFeed} step={5}
                        hint="Velocidade do toque vertical." />
                      <NumField label="Curso do probe Z (mm)" value={zProbeTravel} onChange={setZProbeTravel} step={1}
                        hint="Distância máxima de descida (negativo)." />

                      {mode === "corner" && zProbeMode === "auto" && (
                        <NumField label="Recuo interno da aresta (mm)" value={zCornerInset} onChange={setZCornerInset} step={0.5}
                          hint="Deslocamento para dentro ao medir Z na quina." />
                      )}

                      {zProbeMode === "manual" && (
                        <>
                          <p className="text-[10px] text-muted-foreground">Posição manual do probe Z</p>
                          <NumField label="Posição X (mm)" value={holeZManualOffsetX} onChange={setHoleZManualOffsetX} step={1}
                            hint="Coordenada X onde o probe Z será realizado." />
                          <NumField label="Posição Y (mm)" value={holeZManualOffsetY} onChange={setHoleZManualOffsetY} step={1}
                            hint="Coordenada Y onde o probe Z será realizado." />
                        </>
                      )}

                      {mode === "hole-center" && zProbeMode === "auto" && (
                        <NumField label="Margem de segurança do furo (mm)" value={holeZSafetyMargin} onChange={setHoleZSafetyMargin} step={1}
                          hint="Distância além do raio do furo." />
                      )}
                    </>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>
          </ScrollArea>
        </div>

        {/* CENTER PANEL */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-10 border-b border-border bg-card/40 flex items-center px-3 gap-2">
            <button onClick={() => setShowPreview(true)}
              className={`px-3 py-1.5 rounded text-[11px] font-medium transition-colors ${showPreview ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <Eye className="h-3 w-3 inline mr-1" /> Ilustração
            </button>
            <button onClick={() => setShowPreview(false)}
              className={`px-3 py-1.5 rounded text-[11px] font-medium transition-colors ${!showPreview ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              G-code
            </button>
          </div>

          <div className="flex-1 overflow-auto p-2">
            {showPreview ? (
              <div className="h-full flex flex-col">
                <div className="flex items-center gap-2 mb-2 px-2 flex-wrap">
                  {(() => { const Icon = modeInfo.icon; return <Icon className="h-4 w-4 text-primary" />; })()}
                  <h2 className="text-xs font-semibold">{modeInfo.label}</h2>
                  {refinementEnabled && (
                    <Badge variant="outline" className="text-[9px] border-chart-2 text-chart-2 gap-1">
                      <ShieldCheck className="h-2.5 w-2.5" /> Conferência
                    </Badge>
                  )}
                  {zProbeActive && (
                    <Badge variant="outline" className="text-[9px] border-chart-5 text-chart-5 gap-1">
                      <ArrowDown className="h-2.5 w-2.5" /> Probe Z
                    </Badge>
                  )}
                  {probeType === "custom" && (
                    <Badge variant="outline" className="text-[9px] border-chart-3 text-chart-3 gap-1">
                      <Wrench className="h-2.5 w-2.5" /> Custom
                    </Badge>
                  )}
                  {postAction === "locate-machining" && (
                    <Badge variant="outline" className="text-[9px] border-chart-1 text-chart-1 gap-1">
                      <FileText className="h-2.5 w-2.5" /> + Trabalho
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[9px] ml-auto">
                    {controller.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex-1 rounded-lg border border-border/50 bg-muted/10 overflow-hidden">
                  <InteractiveProbeDiagram
                    mode={mode}
                    cornerQuadrant={cornerQuadrant}
                    approxSizeX={approxSizeX}
                    approxSizeY={approxSizeY}
                    approxDiameter={approxDiameter}
                    circlePoints={circlePoints}
                    probeFeed={probeFeed}
                    probeDepth={probeDepth}
                    safeZ={safeZ}
                    refinementEnabled={refinementEnabled}
                    refinementDistance={refinementDistance}
                    zProbeActive={zProbeActive}
                    zCornerInset={zCornerInset}
                    holeZStrategy={holeZStrategy}
                    holeZSafetyMargin={holeZSafetyMargin}
                    onApproxSizeXChange={setApproxSizeX}
                    onApproxSizeYChange={setApproxSizeY}
                    onApproxDiameterChange={setApproxDiameter}
                    onSafeZChange={setSafeZ}
                    onZCornerInsetChange={setZCornerInset}
                    onHoleZSafetyMarginChange={setHoleZSafetyMargin}
                    onProbeDepthChange={setProbeDepth}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-1">{modeInfo.desc}</p>
              </div>
            ) : (
              <div className="h-full">
                {result ? (
                  <div className="rounded-lg border border-border bg-card p-4 h-full overflow-auto">
                    <pre className="text-[11px] text-primary font-mono whitespace-pre leading-relaxed">
                      {result.code}
                    </pre>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                    <Crosshair className="h-10 w-10 opacity-20" />
                    <p className="text-xs">Clique em "Gerar G-code" para visualizar</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-[200px] shrink-0 border-l border-border bg-card/60 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-border/50">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Resumo</span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              <div className="rounded-lg border border-border/50 p-2.5 space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Modo</p>
                <p className="text-xs font-medium">{modeInfo.label}</p>
              </div>

              <div className="rounded-lg border border-border/50 p-2.5 space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Parâmetros</p>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between"><span className="text-muted-foreground">Altura segura</span><span>{safeZ} mm</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Vel. toque</span><span>{probeFeed} mm/min</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Ø Probe</span><span>{probeDiameter} mm</span></div>
                  {mode === "circle-center" && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Pontos</span><span>{circlePoints}</span></div>
                  )}
                </div>
              </div>

              {/* Refinement summary */}
              <div className={`rounded-lg border p-2.5 space-y-1.5 ${refinementEnabled ? "border-chart-2/40 bg-chart-2/5" : "border-border/50"}`}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Conferência
                </p>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={refinementEnabled ? "default" : "secondary"} className="text-[9px] h-4">
                      {refinementEnabled ? "Ligada" : "Desligada"}
                    </Badge>
                  </div>
                  {refinementEnabled && (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">Dist. refinam.</span><span>{refinementDistance} mm</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Vel. 2º toque</span><span>{refinementFeed} mm/min</span></div>
                    </>
                  )}
                </div>
              </div>

              {/* Z Probe summary */}
              <div className={`rounded-lg border p-2.5 space-y-1.5 ${zProbeActive ? "border-chart-5/40 bg-chart-5/5" : "border-border/50"}`}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <ArrowDown className="h-3 w-3" /> Probe Z
                </p>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={zProbeActive ? "default" : "secondary"} className="text-[9px] h-4">
                      {Z_PROBE_LABELS[zProbeMode]}
                    </Badge>
                  </div>
                  {zProbeActive && (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">Vel. Z</span><span>{zProbeFeed} mm/min</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Curso Z</span><span>{zProbeTravel} mm</span></div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Definir Z=0</span>
                        <Badge variant={zSetOrigin ? "default" : "secondary"} className="text-[9px] h-4">
                          {zSetOrigin ? "Sim" : "Não"}
                        </Badge>
                      </div>
                      {mode === "hole-center" && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Estratégia</span>
                          <span className="text-[10px]">
                            {holeZStrategy === "auto-safe" ? "Auto" : holeZStrategy === "manual-offset" ? "Manual" : "—"}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Custom probe summary */}
              {probeType === "custom" && (
                <div className="rounded-lg border border-chart-3/40 bg-chart-3/5 p-2.5 space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                    <Wrench className="h-3 w-3" /> Probe Custom
                  </p>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between"><span className="text-muted-foreground">Offset X</span><span>{customProbe.offsetX} mm</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Offset Y</span><span>{customProbe.offsetY} mm</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Início</span><span className="font-mono text-[10px]">{customProbe.startCommand}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Fim</span><span className="font-mono text-[10px]">{customProbe.endCommand}</span></div>
                  </div>
                </div>
              )}

              {/* Post-action summary */}
              <div className={`rounded-lg border p-2.5 space-y-1.5 ${postAction === "locate-machining" ? "border-chart-1/40 bg-chart-1/5" : "border-border/50"}`}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Após localização
                </p>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ação</span>
                    <Badge variant={postAction === "locate-machining" ? "default" : "secondary"} className="text-[9px] h-4">
                      {postAction === "locate-only" ? "Localizar" : postAction === "locate-origin" ? "Origem" : "Usinagem"}
                    </Badge>
                  </div>
                  {postAction === "locate-machining" && workFileName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Arquivo</span>
                      <span className="text-[10px] truncate max-w-[90px]">{workFileName}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border/50 p-2.5 space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Opções</p>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Origem X/Y</span>
                    <Badge variant={setOrigin ? "default" : "secondary"} className="text-[9px] h-4">
                      {setOrigin ? "Sim" : "Não"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mover ao centro</span>
                    <Badge variant={moveToCenter ? "default" : "secondary"} className="text-[9px] h-4">
                      {moveToCenter ? "Sim" : "Não"}
                    </Badge>
                  </div>
                </div>
              </div>

              {result && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 space-y-1.5">
                  <p className="text-[10px] font-semibold text-primary uppercase">Arquivo Gerado</p>
                  <p className="text-[11px] font-medium">{result.fileName}</p>
                  <p className="text-[10px] text-muted-foreground">{result.description}</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
