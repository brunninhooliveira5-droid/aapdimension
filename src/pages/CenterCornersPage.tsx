import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Crosshair, Download, Play, Target, Square, Circle, Disc,
  ChevronLeft, ChevronRight, Copy, ShieldCheck, ArrowDown, AlertTriangle,
  Upload, Wrench, FileText, Check, Eye, Save, FolderOpen, Zap, BookOpen,
  Settings2, Trash2, MoveHorizontal, MoveVertical, ArrowUp,
} from "lucide-react";
import {
  generateCenterCornersGcode, defaultCenterCornersConfig,
  type LocationMode, type CenterCornersConfig, type CenterCornersResult,
  type ZProbeMode, type HoleZStrategy, type ProbeType, type PostLocationAction,
  type CustomProbeConfig, defaultCustomProbeConfig,
} from "@/lib/center-corners-engine";
import { loadProfiles, saveProfile, deleteProfile, getDefaultProfiles, type CCProfile } from "@/lib/center-corners-profiles";
import { getWizardSteps, getStepProgress } from "@/lib/center-corners-wizard";
import InteractiveProbeDiagram from "@/components/center-corners/InteractiveProbeDiagram";

/* ── Mode metadata ── */
const MODE_INFO: Record<LocationMode, { label: string; icon: typeof Square; desc: string }> = {
  corner: { label: "Achar Quina", icon: Square, desc: "Toque em dois lados para encontrar o vértice da peça." },
  "rect-center": { label: "Centro Retangular", icon: Target, desc: "Toque nos 4 lados para encontrar o centro." },
  "circle-center": { label: "Centro Circular", icon: Circle, desc: "Toque ao redor do círculo para o centro." },
  "hole-center": { label: "Centro de Furo", icon: Disc, desc: "Toque nas bordas internas para o centro do furo." },
};

const STEP_ICONS: Record<string, typeof Crosshair> = {
  mode: Crosshair,
  touchX: MoveHorizontal,
  touchY: MoveVertical,
  safeZ: ArrowUp,
  refine: ShieldCheck,
  probeZ: ArrowDown,
  custom: Wrench,
  apply: Play,
};

/* ── NumField ── */
function NumField({ label, value, onChange, step, hint }: {
  label: string; value: number; onChange: (v: number) => void; step?: number; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{label}</Label>
      <div className="relative">
        <Input type="number" value={value} step={step ?? 1}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="h-11 text-sm font-mono bg-background/50 border-border/60 focus:border-primary pr-12" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">mm</span>
      </div>
      {hint && <p className="text-[11px] text-muted-foreground/60 leading-relaxed">{hint}</p>}
    </div>
  );
}

/* ── View mode type ── */
type ViewMode = "quick" | "wizard";

/* ── Main Page ── */
export default function CenterCornersPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("wizard");
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
  const [lateralOffsetY, setLateralOffsetY] = useState(0); // Offset Y do probe na etapa Touch X
  const [lateralOffsetX, setLateralOffsetX] = useState(0); // Offset X do probe na etapa Touch Y
  const updateCustomProbe = (patch: Partial<CustomProbeConfig>) => setCustomProbe(prev => ({ ...prev, ...patch }));
  const [postAction, setPostAction] = useState<PostLocationAction>(defaultCenterCornersConfig.postAction);
  const [workGcode, setWorkGcode] = useState<string>("");
  const [workFileName, setWorkFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showGcode, setShowGcode] = useState(false);

  // Profiles
  const [profiles, setProfiles] = useState<CCProfile[]>([]);
  const [showProfiles, setShowProfiles] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileDesc, setProfileDesc] = useState("");

  useEffect(() => {
    const saved = loadProfiles();
    setProfiles(saved.length > 0 ? saved : getDefaultProfiles());
  }, []);

  const zProbeActive = zProbeMode !== "none";
  const steps = getWizardSteps({ mode });
  const progress = getStepProgress(wizardStep, steps.length);
  const isLastStep = wizardStep === steps.length - 1;

  const buildConfig = useCallback((): CenterCornersConfig => ({
    mode, safeZ, probeFeed, probeDepth, probeDiameter,
    cornerQuadrant: cornerQuadrant as any,
    approxSizeX, approxSizeY, approxDiameter, circlePoints,
    setOrigin, moveToCenter, decimalPlaces: 3, controller: controller as any,
    refinementEnabled, refinementDistance, refinementFeed, refinementCycles,
    zProbeMode, zProbeFeed, zProbeTravel, zSetOrigin, zCornerInset,
    holeZStrategy, holeZSafetyMargin, holeZManualOffsetX, holeZManualOffsetY,
    probeType, customProbe, postAction,
  }), [mode, safeZ, probeFeed, probeDepth, probeDiameter, cornerQuadrant, approxSizeX, approxSizeY, approxDiameter, circlePoints, setOrigin, moveToCenter, controller, refinementEnabled, refinementDistance, refinementFeed, refinementCycles, zProbeMode, zProbeFeed, zProbeTravel, zSetOrigin, zCornerInset, holeZStrategy, holeZSafetyMargin, holeZManualOffsetX, holeZManualOffsetY, probeType, customProbe, postAction]);

  const applyConfig = useCallback((cfg: CenterCornersConfig) => {
    setMode(cfg.mode);
    setSafeZ(cfg.safeZ);
    setProbeFeed(cfg.probeFeed);
    setProbeDepth(cfg.probeDepth);
    setProbeDiameter(cfg.probeDiameter);
    setCornerQuadrant(cfg.cornerQuadrant);
    setApproxSizeX(cfg.approxSizeX);
    setApproxSizeY(cfg.approxSizeY);
    setApproxDiameter(cfg.approxDiameter);
    setCirclePoints(cfg.circlePoints);
    setSetOrigin(cfg.setOrigin);
    setMoveToCenter(cfg.moveToCenter);
    setController(cfg.controller);
    setRefinementEnabled(cfg.refinementEnabled);
    setRefinementDistance(cfg.refinementDistance);
    setRefinementFeed(cfg.refinementFeed);
    setRefinementCycles(cfg.refinementCycles);
    setZProbeMode(cfg.zProbeMode);
    setZProbeFeed(cfg.zProbeFeed);
    setZProbeTravel(cfg.zProbeTravel);
    setZSetOrigin(cfg.zSetOrigin);
    setZCornerInset(cfg.zCornerInset);
    setHoleZStrategy(cfg.holeZStrategy);
    setHoleZSafetyMargin(cfg.holeZSafetyMargin);
    setHoleZManualOffsetX(cfg.holeZManualOffsetX);
    setHoleZManualOffsetY(cfg.holeZManualOffsetY);
    setProbeType(cfg.probeType);
    setCustomProbe(cfg.customProbe || { ...defaultCustomProbeConfig });
    setPostAction(cfg.postAction);
  }, []);

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
    try {
      const cfg = buildConfig();
      const gcWork = postAction === "locate-machining" ? workGcode : undefined;
      const r = generateCenterCornersGcode(cfg, gcWork);
      setResult(r);
      setShowGcode(true);
      toast.success("G-code gerado com sucesso!");
    } catch (err: any) {
      toast.error("Erro: " + (err?.message || "erro desconhecido"));
    }
  }, [buildConfig, postAction, workGcode]);

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

  const handleSaveProfile = useCallback(() => {
    if (!profileName.trim()) return;
    const cfg = buildConfig();
    const p = saveProfile(profileName.trim(), profileDesc.trim(), cfg);
    setProfiles(prev => [...prev, p]);
    setShowSaveDialog(false);
    setProfileName("");
    setProfileDesc("");
    toast.success("Perfil salvo!");
  }, [profileName, profileDesc, buildConfig]);

  const handleDeleteProfile = useCallback((id: string) => {
    deleteProfile(id);
    setProfiles(prev => prev.filter(p => p.id !== id));
    toast.success("Perfil removido!");
  }, []);

  const handleLoadProfile = useCallback((p: CCProfile) => {
    applyConfig(p.config);
    setShowProfiles(false);
    setResult(null);
    setWizardStep(0);
    toast.success(`Perfil "${p.name}" carregado!`);
  }, [applyConfig]);

  /* ── Step descriptions ── */
  const stepDescriptions: Record<string, string> = {
    mode: "O que você quer localizar?",
    touchX: "Coloque a ferramenta aproximadamente na quina da peça. A máquina fará o toque lateral para encontrar a posição exata.",
    touchY: "A partir da mesma quina inicial, a máquina fará o toque frontal para localizar o outro lado da quina.",
    safeZ: "Agora defina a altura segura acima da peça.",
    refine: "Agora configure a conferência para mais precisão.",
    probeZ: "Configure o toque vertical para medir a altura.",
    custom: "Configure o probe personalizado, se necessário.",
    apply: "Revise e aplique a configuração ao trabalho.",
  };

  const currentStepKey = steps[wizardStep]?.key || "mode";

  const diagramProps = {
    wizardStep, mode, cornerQuadrant, approxSizeX, approxSizeY, approxDiameter,
    circlePoints, probeDepth, probeFeed, safeZ, refinementEnabled, refinementDistance,
    refinementFeed, zProbeActive, zCornerInset, holeZStrategy, holeZSafetyMargin,
    customProbeOffsetX: customProbe.offsetX, customProbeOffsetY: customProbe.offsetY,
    customProbeOffsetZ: customProbe.offsetZ,
    lateralOffsetY, lateralOffsetX,
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-background overflow-hidden">
      {/* ── Top bar ── */}
      <div className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Crosshair className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-none">Centro e Quinas</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {viewMode === "wizard" ? "Configuração Assistida" : "Modo Rápido"}
            </p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-1 ml-4 bg-muted/50 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("wizard")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
              viewMode === "wizard" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>
            <BookOpen className="h-3.5 w-3.5" /> Assistido
          </button>
          <button
            onClick={() => setViewMode("quick")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
              viewMode === "quick" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>
            <Zap className="h-3.5 w-3.5" /> Rápido
          </button>
        </div>

        <div className="flex-1" />

        {/* Profile buttons */}
        <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-8" onClick={() => setShowProfiles(true)}>
          <FolderOpen className="h-3.5 w-3.5" /> Perfis
        </Button>
        <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-8" onClick={() => setShowSaveDialog(true)}>
          <Save className="h-3.5 w-3.5" /> Salvar
        </Button>

        {result && (
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-border">
            <Button size="sm" variant={showGcode ? "default" : "outline"} onClick={() => setShowGcode(!showGcode)} className="gap-1.5 text-xs h-8">
              <Eye className="h-3.5 w-3.5" /> {showGcode ? "Voltar" : "G-code"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5 text-xs h-8">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" onClick={handleDownload} className="gap-1.5 text-xs h-8">
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* ── Wizard progress bar (only in wizard mode) ── */}
      {viewMode === "wizard" && (
        <div className="border-b border-border bg-card/40 px-4 py-2 shrink-0">
          {/* Progress percentage */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground font-mono w-8 text-right">{progress}%</span>
          </div>
          {/* Step pills */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {steps.map((s, i) => {
              const Icon = STEP_ICONS[s.key] || Settings2;
              const isActive = i === wizardStep;
              const isDone = i < wizardStep;
              return (
                <div key={s.key} className="flex items-center">
                  <button
                    onClick={() => { setWizardStep(i); setShowGcode(false); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md scale-105"
                        : isDone
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted/50"
                    }`}>
                    {isDone ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {i < steps.length - 1 && (
                    <div className={`w-4 h-px mx-0.5 transition-colors ${isDone ? "bg-primary" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── G-code viewer ── */}
      {showGcode && result ? (
        <div className="flex-1 overflow-auto p-4">
          <div className="rounded-xl border border-border bg-card p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="text-xs">{result.fileName}</Badge>
              <p className="text-xs text-muted-foreground">{result.description}</p>
            </div>
            <pre className="text-[11px] text-primary font-mono whitespace-pre leading-relaxed max-h-[60vh] overflow-auto bg-muted/20 rounded-lg p-4">
              {result.code}
            </pre>
          </div>
        </div>
      ) : viewMode === "quick" ? (
        /* ═══ QUICK MODE ═══ */
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left: Illustration */}
          <div className="flex-1 flex items-center justify-center p-4 min-h-0">
            <div className="w-full max-w-xl h-full rounded-xl border border-border/50 bg-muted/5 overflow-hidden">
              <InteractiveProbeDiagram {...diagramProps} />
            </div>
          </div>

          {/* Right: All params in scrollable panel */}
          <div className="w-full lg:w-[380px] shrink-0 border-t lg:border-t-0 lg:border-l border-border bg-card/60 overflow-auto">
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold">Modo Rápido</h2>
              </div>

              {/* Mode select */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Tipo</Label>
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

              <Separator />

              {/* Core params */}
              <NumField label="Distância do toque (mm)" value={probeDepth} onChange={setProbeDepth} step={0.5}
                hint="Distância que o probe percorre até tocar." />
              <NumField label="Velocidade do toque (mm/min)" value={probeFeed} onChange={setProbeFeed} step={10} />
              <NumField label="Diâmetro do probe (mm)" value={probeDiameter} onChange={setProbeDiameter} step={0.1} />
              <NumField label="Altura segura Z (mm)" value={safeZ} onChange={setSafeZ} step={0.5} />

              {mode === "corner" && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Quina</Label>
                  <Select value={cornerQuadrant} onValueChange={(v) => setCornerQuadrant(v as any)}>
                    <SelectTrigger className="h-11 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="front-left">Frontal esquerda</SelectItem>
                      <SelectItem value="front-right">Frontal direita</SelectItem>
                      <SelectItem value="back-left">Traseira esquerda</SelectItem>
                      <SelectItem value="back-right">Traseira direita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(mode === "rect-center") && (
                <>
                  <NumField label="Tamanho X (mm)" value={approxSizeX} onChange={setApproxSizeX} step={5} />
                  <NumField label="Tamanho Y (mm)" value={approxSizeY} onChange={setApproxSizeY} step={5} />
                </>
              )}
              {(mode === "circle-center" || mode === "hole-center") && (
                <NumField label="Diâmetro (mm)" value={approxDiameter} onChange={setApproxDiameter} step={5} />
              )}

              <Separator />

              {/* Toggles */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-chart-2" />
                  <Label className="text-xs font-medium">Conferência</Label>
                </div>
                <Switch checked={refinementEnabled} onCheckedChange={setRefinementEnabled} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Probe Z</Label>
                <Select value={zProbeMode} onValueChange={(v) => setZProbeMode(v as ZProbeMode)}>
                  <SelectTrigger className="h-11 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não fazer</SelectItem>
                    <SelectItem value="auto">Automático</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Controlador</Label>
                <Select value={controller} onValueChange={(v) => setController(v as any)}>
                  <SelectTrigger className="h-11 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mach3">Mach3</SelectItem>
                    <SelectItem value="grbl">GRBL</SelectItem>
                    <SelectItem value="linuxcnc">LinuxCNC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />
              <Button className="w-full h-11 gap-2 font-semibold" onClick={handleGenerate}>
                <Play className="h-4 w-4" /> Gerar G-code
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* ═══ WIZARD MODE ═══ */
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* ── Illustration area ── */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden min-h-0">
            {/* Step instruction */}
            <div className="mb-4 text-center animate-fade-in">
              <h2 className="text-lg font-bold text-foreground mb-1">
                {steps[wizardStep]?.label}
              </h2>
              <p className="text-sm text-muted-foreground max-w-md">
                {stepDescriptions[currentStepKey]}
              </p>
            </div>

            {/* SVG Illustration */}
            <div className="flex-1 w-full max-w-2xl min-h-0 rounded-xl border border-border/40 bg-gradient-to-br from-muted/10 to-muted/5 overflow-hidden shadow-sm">
              <InteractiveProbeDiagram {...diagramProps} />
            </div>
          </div>

          {/* ── Step parameters panel ── */}
          <div className="w-full lg:w-[360px] shrink-0 border-t lg:border-t-0 lg:border-l border-border bg-card/60 overflow-auto">
            <div className="p-5 space-y-4">
              {/* Step header */}
              <div className="flex items-center gap-2.5 pb-3 border-b border-border/50">
                {(() => { const Icon = STEP_ICONS[currentStepKey] || Settings2; return <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center"><Icon className="h-4 w-4 text-primary" /></div>; })()}
                <div>
                  <h3 className="text-sm font-bold">{steps[wizardStep]?.label}</h3>
                  <p className="text-[10px] text-muted-foreground">Etapa {wizardStep + 1} de {steps.length}</p>
                </div>
              </div>

              {/* STEP 0 — Mode */}
              {currentStepKey === "mode" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">O que localizar?</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.entries(MODE_INFO) as [LocationMode, typeof MODE_INFO["corner"]][]).map(([key, info]) => {
                        const Icon = info.icon;
                        return (
                          <button key={key} onClick={() => { setMode(key); setResult(null); }}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-xs transition-all ${
                              mode === key
                                ? "border-primary bg-primary/5 text-primary font-semibold ring-2 ring-primary/20 shadow-sm"
                                : "border-border hover:bg-muted/50 text-muted-foreground"
                            }`}>
                            <Icon className="h-6 w-6" />
                            <span>{info.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground/80 leading-relaxed">{MODE_INFO[mode].desc}</p>
                  </div>
                  {mode === "corner" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Quina a localizar</Label>
                      <Select value={cornerQuadrant} onValueChange={(v) => setCornerQuadrant(v as any)}>
                        <SelectTrigger className="h-11 text-sm"><SelectValue /></SelectTrigger>
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
                    <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Controlador</Label>
                    <Select value={controller} onValueChange={(v) => setController(v as any)}>
                      <SelectTrigger className="h-11 text-sm"><SelectValue /></SelectTrigger>
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
              {currentStepKey === "touchX" && (
                <>
                  <NumField label="Distância do toque X" value={probeDepth} onChange={setProbeDepth} step={0.5}
                    hint="Distância que o probe percorre até tocar na lateral da peça." />
                  <NumField label="Offset Y do probe lateral" value={lateralOffsetY} onChange={setLateralOffsetY} step={0.1}
                    hint="Distância entre o centro do spindle e o probe na direção Y." />
                  <NumField label="Velocidade do toque" value={probeFeed} onChange={setProbeFeed} step={10}
                    hint="Velocidade usada durante o primeiro toque." />
                  <NumField label="Diâmetro do probe" value={probeDiameter} onChange={setProbeDiameter} step={0.1}
                    hint="Diâmetro da ponta de medição." />
                  {(mode === "rect-center") && (
                    <NumField label="Tamanho aprox. X" value={approxSizeX} onChange={setApproxSizeX} step={5}
                      hint="Largura aproximada da peça no eixo X." />
                  )}
                  {(mode === "circle-center" || mode === "hole-center") && (
                    <NumField label="Diâmetro aproximado" value={approxDiameter} onChange={setApproxDiameter} step={5}
                      hint="Diâmetro aproximado da peça ou furo." />
                  )}
                </>
              )}

              {/* STEP 2 — Touch Y */}
              {currentStepKey === "touchY" && (
                <>
                  <NumField label="Distância do toque Y" value={probeDepth} onChange={setProbeDepth} step={0.5}
                    hint="Distância que o probe percorre até tocar na frente da peça." />
                  <NumField label="Offset X do probe" value={lateralOffsetX} onChange={setLateralOffsetX} step={0.1}
                    hint="Distância entre o centro do spindle e o probe na direção X." />
                  <NumField label="Velocidade do toque" value={probeFeed} onChange={setProbeFeed} step={10} />
                  {(mode === "rect-center") && (
                    <NumField label="Tamanho aprox. Y" value={approxSizeY} onChange={setApproxSizeY} step={5} />
                  )}
                  {mode === "circle-center" && (
                    <NumField label="Pontos de medição" value={circlePoints} onChange={(v) => setCirclePoints(Math.max(3, Math.round(v)))} step={1}
                      hint="Mais pontos = mais precisão." />
                  )}
                </>
              )}

              {/* STEP 3 — Safe Z */}
              {currentStepKey === "safeZ" && (
                <>
                  <NumField label="Altura segura Z" value={safeZ} onChange={setSafeZ} step={0.5}
                    hint="Altura usada para movimentações seguras acima da peça." />
                  <div className="rounded-lg bg-chart-5/10 border border-chart-5/20 p-3">
                    <p className="text-xs text-chart-5 leading-relaxed">
                      💡 Valor muito baixo pode causar colisão. Valor muito alto torna o processo lento.
                    </p>
                  </div>
                </>
              )}

              {/* STEP 4 — Refinement */}
              {currentStepKey === "refine" && (
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
                      <NumField label="Distância de refinamento" value={refinementDistance} onChange={setRefinementDistance} step={0.5}
                        hint="Curso menor para o toque de conferência." />
                      <NumField label="Velocidade do 2º toque" value={refinementFeed} onChange={setRefinementFeed} step={5}
                        hint="Mais lento = mais precisão." />
                      <NumField label="Ciclos de conferência" value={refinementCycles} onChange={(v) => setRefinementCycles(Math.max(1, Math.round(v)))} step={1} />
                    </>
                  )}
                </>
              )}

              {/* STEP 5 — Probe Z */}
              {currentStepKey === "probeZ" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Probe em Z</Label>
                    <Select value={zProbeMode} onValueChange={(v) => setZProbeMode(v as ZProbeMode)}>
                      <SelectTrigger className="h-11 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não fazer</SelectItem>
                        <SelectItem value="auto">Automático</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground/70 leading-relaxed">
                    Após localizar, a máquina também pode medir a altura da peça.
                  </p>
                  {zProbeActive && mode === "hole-center" && (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-xs text-destructive leading-relaxed">
                        Em furos, o toque em Z será feito em região segura.
                      </p>
                    </div>
                  )}
                  {zProbeActive && mode === "hole-center" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Estratégia Z</Label>
                      <Select value={holeZStrategy} onValueChange={(v) => setHoleZStrategy(v as HoleZStrategy)}>
                        <SelectTrigger className="h-11 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto-safe">Borda segura</SelectItem>
                          <SelectItem value="manual-offset">Ponto manual</SelectItem>
                          <SelectItem value="none">Não fazer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {zProbeActive && (
                    <>
                      <NumField label="Velocidade Z" value={zProbeFeed} onChange={setZProbeFeed} step={5} />
                      <NumField label="Curso Z" value={zProbeTravel} onChange={setZProbeTravel} step={1} />
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Definir Z=0</Label>
                        <Switch checked={zSetOrigin} onCheckedChange={setZSetOrigin} />
                      </div>
                      {mode === "corner" && zProbeMode === "auto" && (
                        <NumField label="Recuo da aresta" value={zCornerInset} onChange={setZCornerInset} step={0.5} />
                      )}
                      {zProbeMode === "manual" && (
                        <>
                          <NumField label="Posição X" value={holeZManualOffsetX} onChange={setHoleZManualOffsetX} step={1} />
                          <NumField label="Posição Y" value={holeZManualOffsetY} onChange={setHoleZManualOffsetY} step={1} />
                        </>
                      )}
                      {mode === "hole-center" && zProbeMode === "auto" && (
                        <NumField label="Margem de segurança" value={holeZSafetyMargin} onChange={setHoleZSafetyMargin} step={1} />
                      )}
                    </>
                  )}
                </>
              )}

              {/* STEP 6 — Custom probe */}
              {currentStepKey === "custom" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Tipo de probe</Label>
                    <Select value={probeType} onValueChange={(v) => setProbeType(v as ProbeType)}>
                      <SelectTrigger className="h-11 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Padrão</SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {probeType === "custom" && (
                    <>
                      <p className="text-xs text-muted-foreground/70">
                        Para probe lateral, pneumático ou outro sistema deslocado.
                      </p>
                      <Separator />
                      <NumField label="Offset X" value={customProbe.offsetX} onChange={(v) => updateCustomProbe({ offsetX: v })} step={0.1} />
                      <NumField label="Offset Y" value={customProbe.offsetY} onChange={(v) => updateCustomProbe({ offsetY: v })} step={0.1} />
                      <NumField label="Offset Z" value={customProbe.offsetZ} onChange={(v) => updateCustomProbe({ offsetZ: v })} step={0.1} />
                      <Separator />
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Comando inicial</Label>
                        <Input value={customProbe.startCommand} onChange={(e) => updateCustomProbe({ startCommand: e.target.value })}
                          className="h-11 text-sm font-mono" placeholder="M10" />
                      </div>
                      <NumField label="Espera (s)" value={customProbe.startDwell} onChange={(v) => updateCustomProbe({ startDwell: v })} step={0.5} />
                      <NumField label="Altura segura antes" value={customProbe.startSafeZ} onChange={(v) => updateCustomProbe({ startSafeZ: v })} step={1} />
                      <Separator />
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Comando final</Label>
                        <Input value={customProbe.endCommand} onChange={(e) => updateCustomProbe({ endCommand: e.target.value })}
                          className="h-11 text-sm font-mono" placeholder="M11" />
                      </div>
                      <NumField label="Espera (s)" value={customProbe.endDwell} onChange={(v) => updateCustomProbe({ endDwell: v })} step={0.5} />
                      <NumField label="Altura segura final" value={customProbe.endSafeZ} onChange={(v) => updateCustomProbe({ endSafeZ: v })} step={1} />
                    </>
                  )}
                </>
              )}

              {/* STEP 7 — Apply */}
              {currentStepKey === "apply" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Após localização</Label>
                    <Select value={postAction} onValueChange={(v) => setPostAction(v as PostLocationAction)}>
                      <SelectTrigger className="h-11 text-sm"><SelectValue /></SelectTrigger>
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
                      <Button variant="outline" size="sm" className="w-full text-xs h-11 gap-2" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-4 w-4" />
                        {workFileName || "Carregar G-code do trabalho"}
                      </Button>
                      {workFileName && (
                        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                          <p className="text-xs text-primary font-medium">{workFileName}</p>
                          <p className="text-[10px] text-muted-foreground">{workGcode.split("\n").length} linhas</p>
                        </div>
                      )}
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between p-2">
                    <Label className="text-xs text-muted-foreground">Definir origem X/Y</Label>
                    <Switch checked={setOrigin} onCheckedChange={setSetOrigin} />
                  </div>
                  <div className="flex items-center justify-between p-2">
                    <Label className="text-xs text-muted-foreground">Mover para ponto</Label>
                    <Switch checked={moveToCenter} onCheckedChange={setMoveToCenter} />
                  </div>

                  <Separator />

                  {/* Summary */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Resumo da Configuração</p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">Modo</span><span className="font-semibold">{MODE_INFO[mode].label}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Controlador</span><span className="font-mono">{controller.toUpperCase()}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Altura Z</span><span className="font-mono">{safeZ} mm</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Vel. toque</span><span className="font-mono">{probeFeed} mm/min</span></div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Conferência</span>
                        <Badge variant={refinementEnabled ? "default" : "secondary"} className="text-[9px] h-4">
                          {refinementEnabled ? "Ativa" : "Off"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Probe Z</span>
                        <Badge variant={zProbeActive ? "default" : "secondary"} className="text-[9px] h-4">
                          {zProbeActive ? "Ativo" : "Off"}
                        </Badge>
                      </div>
                      {probeType === "custom" && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Probe</span>
                          <Badge variant="outline" className="text-[9px] h-4 border-chart-3 text-chart-3">Custom</Badge>
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
      <div className="h-14 border-t border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 shrink-0">
        {viewMode === "wizard" ? (
          <>
            <Button variant="outline" size="sm" className="gap-1.5 h-9"
              disabled={wizardStep <= 0}
              onClick={() => { setWizardStep(s => s - 1); setShowGcode(false); }}>
              <ChevronLeft className="h-4 w-4" /> Voltar
            </Button>
            <div className="flex items-center gap-2">
              {isLastStep ? (
                <Button size="sm" className="gap-1.5 h-9 font-semibold shadow-sm" onClick={handleGenerate}>
                  <Play className="h-4 w-4" /> Gerar G-code
                </Button>
              ) : (
                <Button size="sm" className="gap-1.5 h-9"
                  onClick={() => { setWizardStep(s => s + 1); setShowGcode(false); }}>
                  Próximo <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-muted-foreground">
              Use o painel lateral para configurar e gerar o G-code.
            </p>
          </div>
        )}
      </div>

      {/* ── Save Profile Dialog ── */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Save className="h-4 w-4" /> Salvar Perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nome do perfil</Label>
              <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Ex: Quina rápida" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Descrição (opcional)</Label>
              <Input value={profileDesc} onChange={(e) => setProfileDesc(e.target.value)} placeholder="Breve descrição..." className="h-10" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSaveProfile} disabled={!profileName.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Load Profiles Dialog ── */}
      <Dialog open={showProfiles} onOpenChange={setShowProfiles}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FolderOpen className="h-4 w-4" /> Perfis Salvos</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-[400px] overflow-auto">
            {profiles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum perfil salvo ainda.</p>
            ) : (
              profiles.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    {p.description && <p className="text-[11px] text-muted-foreground truncate">{p.description}</p>}
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{MODE_INFO[p.config.mode]?.label} • {p.config.controller.toUpperCase()}</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleLoadProfile(p)}>
                    <FolderOpen className="h-3 w-3" /> Usar
                  </Button>
                  {!p.id.startsWith("preset-") && (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDeleteProfile(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
