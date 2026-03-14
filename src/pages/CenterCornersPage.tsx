import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Crosshair, Download, Play, Target, Square, Circle, Disc,
  ChevronLeft, ChevronRight, Copy, ShieldCheck, ArrowDown, AlertTriangle,
  Upload, Wrench, FileText, Check, Eye,
} from "lucide-react";
import {
  generateCenterCornersGcode, defaultCenterCornersConfig,
  type LocationMode, type CenterCornersConfig, type CenterCornersResult,
  type ZProbeMode, type HoleZStrategy, type ProbeType, type PostLocationAction,
  type CustomProbeConfig, defaultCustomProbeConfig,
} from "@/lib/center-corners-engine";
import InteractiveProbeDiagram from "@/components/center-corners/InteractiveProbeDiagram";

/* ── Mode metadata ── */
const MODE_INFO: Record<LocationMode, { label: string; icon: typeof Square; desc: string }> = {
  corner: { label: "Achar Quina", icon: Square, desc: "Toque em dois lados para encontrar o vértice da peça." },
  "rect-center": { label: "Centro Retangular", icon: Target, desc: "Toque nos 4 lados para encontrar o centro." },
  "circle-center": { label: "Centro Circular", icon: Circle, desc: "Toque ao redor do círculo para o centro." },
  "hole-center": { label: "Centro de Furo", icon: Disc, desc: "Toque nas bordas internas para o centro do furo." },
};

/* ── Wizard step definitions ── */
const WIZARD_STEPS = [
  { key: "mode", label: "Tipo", icon: Crosshair },
  { key: "touchX", label: "Toque X", icon: ChevronRight },
  { key: "touchY", label: "Toque Y", icon: ChevronRight },
  { key: "safeZ", label: "Altura Z", icon: ArrowDown },
  { key: "refine", label: "Conferência", icon: ShieldCheck },
  { key: "probeZ", label: "Probe Z", icon: ArrowDown },
  { key: "custom", label: "Probe Custom", icon: Wrench },
  { key: "apply", label: "Aplicar", icon: FileText },
];

/* ── Num field ── */
function NumField({ label, value, onChange, step, hint }: {
  label: string; value: number; onChange: (v: number) => void; step?: number; hint?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground font-medium">{label}</Label>
      <Input type="number" value={value} step={step ?? 1}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="h-10 text-sm font-mono" />
      {hint && <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{hint}</p>}
    </div>
  );
}

/* ── Main Page ── */
export default function CenterCornersPage() {
  const [wizardStep, setWizardStep] = useState(0);
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
  const [result, setResult] = useState<CenterCornersResult | null>(null);

  const [refinementEnabled, setRefinementEnabled] = useState(defaultCenterCornersConfig.refinementEnabled);
  const [refinementDistance, setRefinementDistance] = useState(defaultCenterCornersConfig.refinementDistance);
  const [refinementFeed, setRefinementFeed] = useState(defaultCenterCornersConfig.refinementFeed);
  const [refinementCycles, setRefinementCycles] = useState(defaultCenterCornersConfig.refinementCycles);

  const [zProbeMode, setZProbeMode] = useState<ZProbeMode>(defaultCenterCornersConfig.zProbeMode);
  const [zProbeFeed, setZProbeFeed] = useState(defaultCenterCornersConfig.zProbeFeed);
  const [zProbeTravel, setZProbeTravel] = useState(defaultCenterCornersConfig.zProbeTravel);
  const [zSetOrigin, setZSetOrigin] = useState(defaultCenterCornersConfig.zSetOrigin);
  const [zCornerInset, setZCornerInset] = useState(defaultCenterCornersConfig.zCornerInset);
  const [holeZStrategy, setHoleZStrategy] = useState<HoleZStrategy>(defaultCenterCornersConfig.holeZStrategy);
  const [holeZSafetyMargin, setHoleZSafetyMargin] = useState(defaultCenterCornersConfig.holeZSafetyMargin);
  const [holeZManualOffsetX, setHoleZManualOffsetX] = useState(defaultCenterCornersConfig.holeZManualOffsetX);
  const [holeZManualOffsetY, setHoleZManualOffsetY] = useState(defaultCenterCornersConfig.holeZManualOffsetY);

  const [probeType, setProbeType] = useState<ProbeType>(defaultCenterCornersConfig.probeType);
  const [customProbe, setCustomProbe] = useState<CustomProbeConfig>({ ...defaultCustomProbeConfig });
  const updateCustomProbe = (patch: Partial<CustomProbeConfig>) => setCustomProbe(prev => ({ ...prev, ...patch }));

  const [postAction, setPostAction] = useState<PostLocationAction>(defaultCenterCornersConfig.postAction);
  const [workGcode, setWorkGcode] = useState<string>("");
  const [workFileName, setWorkFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showGcode, setShowGcode] = useState(false);

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
      setShowGcode(true);
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

  const isLastStep = wizardStep === WIZARD_STEPS.length - 1;

  /* ── Step descriptions for the user ── */
  const stepDescriptions: Record<number, string> = {
    0: "Escolha o tipo de localização que deseja realizar.",
    1: "Agora escolha a distância do primeiro toque lateral.",
    2: "Agora defina o toque no eixo Y (frontal).",
    3: "Agora defina a altura segura acima da peça.",
    4: "Agora configure a conferência para mais precisão.",
    5: "Configure o toque vertical para medir a altura.",
    6: "Configure o probe personalizado, se necessário.",
    7: "Revise e aplique a configuração ao trabalho.",
  };

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
            <p className="text-[10px] text-muted-foreground">Configuração Assistida Visual</p>
          </div>
        </div>
        <div className="flex-1" />
        {result && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant={showGcode ? "default" : "outline"} onClick={() => setShowGcode(!showGcode)} className="gap-1.5 text-xs h-8">
              <Eye className="h-3.5 w-3.5" /> {showGcode ? "Voltar" : "Ver G-code"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5 text-xs h-8">
              <Copy className="h-3.5 w-3.5" /> Copiar
            </Button>
            <Button size="sm" onClick={handleDownload} className="gap-1.5 text-xs h-8">
              <Download className="h-3.5 w-3.5" /> Baixar
            </Button>
          </div>
        )}
      </div>

      {/* ── Progress steps bar ── */}
      <div className="border-b border-border bg-card/40 px-4 py-2 overflow-x-auto shrink-0">
        <div className="flex items-center gap-1 min-w-max">
          {WIZARD_STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === wizardStep;
            const isDone = i < wizardStep;
            return (
              <div key={s.key} className="flex items-center">
                <button
                  onClick={() => setWizardStep(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : isDone
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {isDone ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </button>
                {i < WIZARD_STEPS.length - 1 && (
                  <div className={`w-4 h-px mx-0.5 ${isDone ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main content ── */}
      {showGcode && result ? (
        <div className="flex-1 overflow-auto p-4">
          <div className="rounded-xl border border-border bg-card p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="text-xs">{result.fileName}</Badge>
              <p className="text-xs text-muted-foreground">{result.description}</p>
            </div>
            <pre className="text-[11px] text-primary font-mono whitespace-pre leading-relaxed max-h-[60vh] overflow-auto">
              {result.code}
            </pre>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* ── Illustration area ── */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden min-h-0">
            {/* Step instruction */}
            <div className="mb-3 text-center">
              <h2 className="text-base font-bold text-foreground mb-1">
                {WIZARD_STEPS[wizardStep].label}
              </h2>
              <p className="text-sm text-muted-foreground max-w-md">
                {stepDescriptions[wizardStep]}
              </p>
            </div>

            {/* SVG Illustration */}
            <div className="flex-1 w-full max-w-xl min-h-0 rounded-xl border border-border/50 bg-muted/5 overflow-hidden">
              <InteractiveProbeDiagram
                wizardStep={wizardStep}
                mode={mode}
                cornerQuadrant={cornerQuadrant}
                approxSizeX={approxSizeX}
                approxSizeY={approxSizeY}
                approxDiameter={approxDiameter}
                circlePoints={circlePoints}
                probeDepth={probeDepth}
                probeFeed={probeFeed}
                safeZ={safeZ}
                refinementEnabled={refinementEnabled}
                refinementDistance={refinementDistance}
                refinementFeed={refinementFeed}
                zProbeActive={zProbeActive}
                zCornerInset={zCornerInset}
                holeZStrategy={holeZStrategy}
                holeZSafetyMargin={holeZSafetyMargin}
                customProbeOffsetX={customProbe.offsetX}
                customProbeOffsetY={customProbe.offsetY}
                customProbeOffsetZ={customProbe.offsetZ}
              />
            </div>
          </div>

          {/* ── Step parameters panel ── */}
          <div className="w-full lg:w-[340px] shrink-0 border-t lg:border-t-0 lg:border-l border-border bg-card/60 overflow-auto">
            <div className="p-4 space-y-4">
              {/* STEP 0 — Mode */}
              {wizardStep === 0 && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-medium">Tipo de localização</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.entries(MODE_INFO) as [LocationMode, typeof MODE_INFO["corner"]][]).map(([key, info]) => {
                        const Icon = info.icon;
                        return (
                          <button key={key} onClick={() => { setMode(key); setResult(null); }}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs transition-all ${
                              mode === key
                                ? "border-primary bg-primary/5 text-primary font-semibold ring-2 ring-primary/20"
                                : "border-border hover:bg-muted/50 text-muted-foreground"
                            }`}>
                            <Icon className="h-5 w-5" />
                            {info.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground/80 leading-relaxed bg-muted/30 rounded-lg p-3">
                    {MODE_INFO[mode].desc}
                  </p>
                  {mode === "corner" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-medium">Quina a localizar</Label>
                      <Select value={cornerQuadrant} onValueChange={(v) => setCornerQuadrant(v as any)}>
                        <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="front-left">Frontal esquerda</SelectItem>
                          <SelectItem value="front-right">Frontal direita</SelectItem>
                          <SelectItem value="back-left">Traseira esquerda</SelectItem>
                          <SelectItem value="back-right">Traseira direita</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Separator />
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium">Controlador</Label>
                    <Select value={controller} onValueChange={(v) => setController(v as any)}>
                      <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mach3">Mach3</SelectItem>
                        <SelectItem value="grbl">GRBL</SelectItem>
                        <SelectItem value="linuxcnc">LinuxCNC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* STEP 1 — Touch X */}
              {wizardStep === 1 && (
                <>
                  <NumField label="Distância do toque X (mm)" value={probeDepth} onChange={setProbeDepth} step={0.5}
                    hint="Distância que o probe percorre até tocar na lateral da peça." />
                  <NumField label="Velocidade do toque (mm/min)" value={probeFeed} onChange={setProbeFeed} step={10}
                    hint="Velocidade usada durante o primeiro toque." />
                  <NumField label="Diâmetro do probe (mm)" value={probeDiameter} onChange={setProbeDiameter} step={0.1}
                    hint="Diâmetro da ponta de medição." />
                  {(mode === "rect-center") && (
                    <NumField label="Tamanho aprox. X (mm)" value={approxSizeX} onChange={setApproxSizeX} step={5}
                      hint="Largura aproximada da peça no eixo X." />
                  )}
                  {(mode === "circle-center" || mode === "hole-center") && (
                    <NumField label="Diâmetro aproximado (mm)" value={approxDiameter} onChange={setApproxDiameter} step={5}
                      hint="Diâmetro aproximado da peça ou furo." />
                  )}
                </>
              )}

              {/* STEP 2 — Touch Y */}
              {wizardStep === 2 && (
                <>
                  <NumField label="Distância do toque Y (mm)" value={probeDepth} onChange={setProbeDepth} step={0.5}
                    hint="Distância que o probe percorre até tocar na frente da peça." />
                  <NumField label="Velocidade do toque (mm/min)" value={probeFeed} onChange={setProbeFeed} step={10}
                    hint="Velocidade usada durante o toque frontal." />
                  {(mode === "rect-center") && (
                    <NumField label="Tamanho aprox. Y (mm)" value={approxSizeY} onChange={setApproxSizeY} step={5}
                      hint="Comprimento aproximado da peça no eixo Y." />
                  )}
                  {mode === "circle-center" && (
                    <NumField label="Pontos de medição" value={circlePoints} onChange={(v) => setCirclePoints(Math.max(3, Math.round(v)))} step={1}
                      hint="Mais pontos = mais precisão." />
                  )}
                </>
              )}

              {/* STEP 3 — Safe Z */}
              {wizardStep === 3 && (
                <>
                  <NumField label="Altura segura Z (mm)" value={safeZ} onChange={setSafeZ} step={0.5}
                    hint="Altura usada para movimentações seguras acima da peça." />
                </>
              )}

              {/* STEP 4 — Refinement */}
              {wizardStep === 4 && (
                <>
                  <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-chart-2" />
                      <Label className="text-xs font-medium">Conferência de precisão</Label>
                    </div>
                    <Switch checked={refinementEnabled} onCheckedChange={setRefinementEnabled} />
                  </div>
                  <p className="text-xs text-muted-foreground/70 leading-relaxed">
                    Refaz a medição mais perto da borda para aumentar a precisão.
                  </p>
                  {refinementEnabled && (
                    <>
                      <NumField label="Distância de refinamento (mm)" value={refinementDistance} onChange={setRefinementDistance} step={0.5}
                        hint="Curso menor para o toque de conferência." />
                      <NumField label="Velocidade do 2º toque (mm/min)" value={refinementFeed} onChange={setRefinementFeed} step={5}
                        hint="Mais lento = mais precisão." />
                      <NumField label="Ciclos de conferência" value={refinementCycles} onChange={(v) => setRefinementCycles(Math.max(1, Math.round(v)))} step={1}
                        hint="Número de repetições do refinamento." />
                    </>
                  )}
                </>
              )}

              {/* STEP 5 — Probe Z */}
              {wizardStep === 5 && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium">Probe em Z após localização</Label>
                    <Select value={zProbeMode} onValueChange={(v) => setZProbeMode(v as ZProbeMode)}>
                      <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não fazer</SelectItem>
                        <SelectItem value="auto">Fazer automaticamente</SelectItem>
                        <SelectItem value="manual">Configurar manualmente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground/70 leading-relaxed">
                    Após localizar centro ou quina, a máquina também pode medir a altura da peça.
                  </p>

                  {zProbeActive && mode === "hole-center" && (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-xs text-destructive leading-relaxed">
                        Em furos, o toque em Z não será feito no centro vazio, e sim em uma região segura ao redor.
                      </p>
                    </div>
                  )}

                  {zProbeActive && mode === "hole-center" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-medium">Estratégia Z para furo</Label>
                      <Select value={holeZStrategy} onValueChange={(v) => setHoleZStrategy(v as HoleZStrategy)}>
                        <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto-safe">Automática pela borda segura</SelectItem>
                          <SelectItem value="manual-offset">Ponto deslocado manual</SelectItem>
                          <SelectItem value="none">Não fazer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {zProbeActive && (
                    <>
                      <NumField label="Velocidade do probe Z (mm/min)" value={zProbeFeed} onChange={setZProbeFeed} step={5}
                        hint="Velocidade do toque vertical." />
                      <NumField label="Curso do probe Z (mm)" value={zProbeTravel} onChange={setZProbeTravel} step={1}
                        hint="Distância máxima de descida." />
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Definir Z=0</Label>
                        <Switch checked={zSetOrigin} onCheckedChange={setZSetOrigin} />
                      </div>
                      {mode === "corner" && zProbeMode === "auto" && (
                        <NumField label="Recuo interno da aresta (mm)" value={zCornerInset} onChange={setZCornerInset} step={0.5}
                          hint="Deslocamento para dentro ao medir Z na quina." />
                      )}
                      {zProbeMode === "manual" && (
                        <>
                          <NumField label="Posição X (mm)" value={holeZManualOffsetX} onChange={setHoleZManualOffsetX} step={1} />
                          <NumField label="Posição Y (mm)" value={holeZManualOffsetY} onChange={setHoleZManualOffsetY} step={1} />
                        </>
                      )}
                      {mode === "hole-center" && zProbeMode === "auto" && (
                        <NumField label="Margem de segurança do furo (mm)" value={holeZSafetyMargin} onChange={setHoleZSafetyMargin} step={1}
                          hint="Distância além do raio do furo." />
                      )}
                    </>
                  )}
                </>
              )}

              {/* STEP 6 — Custom probe */}
              {wizardStep === 6 && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium">Tipo de probe</Label>
                    <Select value={probeType} onValueChange={(v) => setProbeType(v as ProbeType)}>
                      <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Probe padrão</SelectItem>
                        <SelectItem value="custom">Probe personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {probeType === "custom" && (
                    <>
                      <p className="text-xs text-muted-foreground/70">
                        Para probe lateral ao spindle, pneumático ou outro sistema deslocado.
                      </p>
                      <Separator />
                      <NumField label="Offset X (mm)" value={customProbe.offsetX} onChange={(v) => updateCustomProbe({ offsetX: v })} step={0.1} />
                      <NumField label="Offset Y (mm)" value={customProbe.offsetY} onChange={(v) => updateCustomProbe({ offsetY: v })} step={0.1} />
                      <NumField label="Offset Z (mm)" value={customProbe.offsetZ} onChange={(v) => updateCustomProbe({ offsetZ: v })} step={0.1} />
                      <Separator />
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground font-medium">Comando inicial</Label>
                        <Input value={customProbe.startCommand} onChange={(e) => updateCustomProbe({ startCommand: e.target.value })}
                          className="h-10 text-sm font-mono" placeholder="M10" />
                      </div>
                      <NumField label="Espera após acionamento (s)" value={customProbe.startDwell} onChange={(v) => updateCustomProbe({ startDwell: v })} step={0.5} />
                      <NumField label="Altura segura antes (mm)" value={customProbe.startSafeZ} onChange={(v) => updateCustomProbe({ startSafeZ: v })} step={1} />
                      <Separator />
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground font-medium">Comando final</Label>
                        <Input value={customProbe.endCommand} onChange={(e) => updateCustomProbe({ endCommand: e.target.value })}
                          className="h-10 text-sm font-mono" placeholder="M11" />
                      </div>
                      <NumField label="Espera após recolhimento (s)" value={customProbe.endDwell} onChange={(v) => updateCustomProbe({ endDwell: v })} step={0.5} />
                      <NumField label="Altura segura antes do trabalho (mm)" value={customProbe.endSafeZ} onChange={(v) => updateCustomProbe({ endSafeZ: v })} step={1} />
                    </>
                  )}
                </>
              )}

              {/* STEP 7 — Apply */}
              {wizardStep === 7 && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium">Após a localização</Label>
                    <Select value={postAction} onValueChange={(v) => setPostAction(v as PostLocationAction)}>
                      <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="locate-only">Apenas localizar</SelectItem>
                        <SelectItem value="locate-origin">Localizar e definir origem</SelectItem>
                        <SelectItem value="locate-machining">Localizar e iniciar usinagem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {postAction === "locate-machining" && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground/70 leading-relaxed">
                        Localiza a peça e inicia o trabalho automaticamente.
                      </p>
                      <input ref={fileInputRef} type="file" accept=".tap,.nc,.gcode,.txt,.ngc" className="hidden" onChange={handleFileUpload} />
                      <Button variant="outline" size="sm" className="w-full text-xs h-10 gap-2" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-4 w-4" />
                        {workFileName || "Carregar G-code do trabalho"}
                      </Button>
                      {workFileName && (
                        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                          <p className="text-xs text-primary font-medium">{workFileName}</p>
                          <p className="text-[10px] text-muted-foreground">{workGcode.split("\n").length} linhas carregadas</p>
                        </div>
                      )}
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Definir origem X/Y</Label>
                    <Switch checked={setOrigin} onCheckedChange={setSetOrigin} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Mover para ponto encontrado</Label>
                    <Switch checked={moveToCenter} onCheckedChange={setMoveToCenter} />
                  </div>

                  <Separator />

                  {/* Summary */}
                  <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Resumo</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">Modo</span><span className="font-medium">{MODE_INFO[mode].label}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Controlador</span><span className="font-medium">{controller.toUpperCase()}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Altura segura</span><span>{safeZ} mm</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Vel. toque</span><span>{probeFeed} mm/min</span></div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Conferência</span>
                        <Badge variant={refinementEnabled ? "default" : "secondary"} className="text-[9px] h-4">
                          {refinementEnabled ? "Ligada" : "Desligada"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Probe Z</span>
                        <Badge variant={zProbeActive ? "default" : "secondary"} className="text-[9px] h-4">
                          {zProbeActive ? "Ativo" : "Desligado"}
                        </Badge>
                      </div>
                      {probeType === "custom" && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Probe custom</span>
                          <Badge variant="outline" className="text-[9px] h-4 border-chart-3 text-chart-3">Ativo</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom navigation ── */}
      <div className="h-14 border-t border-border bg-card/80 flex items-center justify-between px-4 shrink-0">
        <Button variant="outline" size="sm" className="gap-1.5 h-9"
          disabled={wizardStep <= 0}
          onClick={() => { setWizardStep(s => s - 1); setShowGcode(false); }}>
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Button>

        <div className="flex items-center gap-2">
          {isLastStep ? (
            <Button size="sm" className="gap-1.5 h-9" onClick={handleGenerate}>
              <Play className="h-4 w-4" /> Gerar G-code
            </Button>
          ) : (
            <Button size="sm" className="gap-1.5 h-9"
              onClick={() => { setWizardStep(s => s + 1); setShowGcode(false); }}>
              Próximo <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
