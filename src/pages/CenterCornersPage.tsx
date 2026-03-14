import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Crosshair, Download, Play, Target, Square, Circle, Disc,
  Settings2, ChevronDown, Eye, Copy, ShieldCheck,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  generateCenterCornersGcode, defaultCenterCornersConfig,
  type LocationMode, type CenterCornersConfig, type CenterCornersResult,
} from "@/lib/center-corners-engine";

/* ── Illustration SVGs ────────────────────────── */
function IllustrationCorner({ quadrant, refinement }: { quadrant: string; refinement: boolean }) {
  const flipX = quadrant.includes("right") ? -1 : 1;
  const flipY = quadrant.includes("back") ? -1 : 1;
  const cornerX = flipX > 0 ? 30 : 170;
  const cornerY = flipY > 0 ? 20 : 140;
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <rect x="30" y="20" width="140" height="120" rx="2" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" opacity="0.3" />
      <rect x={flipX > 0 ? 30 : 100} y={flipY > 0 ? 20 : 72} width="70" height="68" rx="1"
        fill="hsl(var(--primary))" opacity="0.08" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="3 2" />
      {/* First touch X – long */}
      <line x1={flipX > 0 ? 10 : 190} y1="90" x2={flipX > 0 ? 30 : 170} y2="90"
        stroke="hsl(var(--primary))" strokeWidth="2" markerEnd="url(#arrowCC)" opacity={refinement ? 0.35 : 1} />
      {/* First touch Y – long */}
      <line x1="65" y1={flipY > 0 ? 2 : 158} x2="65" y2={flipY > 0 ? 20 : 140}
        stroke="hsl(var(--chart-4))" strokeWidth="2" markerEnd="url(#arrowCC2)" opacity={refinement ? 0.35 : 1} />
      {refinement && (
        <>
          {/* Refinement X – short, closer */}
          <line x1={flipX > 0 ? 22 : 178} y1="80" x2={flipX > 0 ? 30 : 170} y2="80"
            stroke="hsl(var(--chart-2))" strokeWidth="2.5" markerEnd="url(#arrowRef)" />
          {/* Refinement Y – short, closer */}
          <line x1="55" y1={flipY > 0 ? 14 : 146} x2="55" y2={flipY > 0 ? 20 : 140}
            stroke="hsl(var(--chart-2))" strokeWidth="2.5" markerEnd="url(#arrowRef)" />
          <text x="100" y="155" textAnchor="middle" fontSize="7" fill="hsl(var(--chart-2))" fontWeight="600">refinamento</text>
        </>
      )}
      <circle cx={cornerX} cy={cornerY} r="4" fill="hsl(var(--primary))" />
      <defs>
        <marker id="arrowCC" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="hsl(var(--primary))" />
        </marker>
        <marker id="arrowCC2" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="hsl(var(--chart-4))" />
        </marker>
        <marker id="arrowRef" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="hsl(var(--chart-2))" />
        </marker>
      </defs>
    </svg>
  );
}

function IllustrationRectCenter({ refinement }: { refinement: boolean }) {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <rect x="40" y="30" width="120" height="100" rx="2"
        fill="hsl(var(--muted))" opacity="0.3" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" />
      {/* First touches – long */}
      <line x1="15" y1="80" x2="40" y2="80" stroke="hsl(var(--primary))" strokeWidth="2" markerEnd="url(#arrowR)" opacity={refinement ? 0.3 : 1} />
      <line x1="185" y1="80" x2="160" y2="80" stroke="hsl(var(--primary))" strokeWidth="2" markerEnd="url(#arrowR)" opacity={refinement ? 0.3 : 1} />
      <line x1="100" y1="8" x2="100" y2="30" stroke="hsl(var(--chart-4))" strokeWidth="2" markerEnd="url(#arrowR2)" opacity={refinement ? 0.3 : 1} />
      <line x1="100" y1="152" x2="100" y2="130" stroke="hsl(var(--chart-4))" strokeWidth="2" markerEnd="url(#arrowR2)" opacity={refinement ? 0.3 : 1} />
      {refinement && (
        <>
          {/* Refinement touches – short, closer */}
          <line x1="32" y1="72" x2="40" y2="72" stroke="hsl(var(--chart-2))" strokeWidth="2.5" markerEnd="url(#arrowRef2)" />
          <line x1="168" y1="72" x2="160" y2="72" stroke="hsl(var(--chart-2))" strokeWidth="2.5" markerEnd="url(#arrowRef2)" />
          <line x1="108" y1="22" x2="108" y2="30" stroke="hsl(var(--chart-2))" strokeWidth="2.5" markerEnd="url(#arrowRef2)" />
          <line x1="108" y1="138" x2="108" y2="130" stroke="hsl(var(--chart-2))" strokeWidth="2.5" markerEnd="url(#arrowRef2)" />
          <text x="100" y="155" textAnchor="middle" fontSize="7" fill="hsl(var(--chart-2))" fontWeight="600">refinamento</text>
        </>
      )}
      <circle cx="100" cy="80" r="5" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" />
      <line x1="95" y1="80" x2="105" y2="80" stroke="hsl(var(--primary))" strokeWidth="1" />
      <line x1="100" y1="75" x2="100" y2="85" stroke="hsl(var(--primary))" strokeWidth="1" />
      <defs>
        <marker id="arrowR" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="hsl(var(--primary))" />
        </marker>
        <marker id="arrowR2" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="hsl(var(--chart-4))" />
        </marker>
        <marker id="arrowRef2" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="hsl(var(--chart-2))" />
        </marker>
      </defs>
    </svg>
  );
}

function IllustrationCircleCenter({ points, refinement }: { points: number; refinement: boolean }) {
  const cx = 100, cy = 80, r = 50;
  const rClose = 42;
  const pts = Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, a };
  });
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <circle cx={cx} cy={cy} r={r} fill="hsl(var(--muted))" opacity="0.2"
        stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" />
      {pts.map((p, i) => {
        const a = (i / points) * Math.PI * 2 - Math.PI / 2;
        return (
          <g key={i}>
            <line x1={cx + Math.cos(a) * (r + 18)} y1={cy + Math.sin(a) * (r + 18)}
              x2={p.x} y2={p.y}
              stroke="hsl(var(--primary))" strokeWidth="1.5" opacity={refinement ? 0.3 : 0.6} />
            {refinement && (
              <line x1={cx + Math.cos(a) * (rClose + 8)} y1={cy + Math.sin(a) * (rClose + 8)}
                x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r}
                stroke="hsl(var(--chart-2))" strokeWidth="2" opacity="0.8" />
            )}
            <circle cx={p.x} cy={p.y} r="3.5" fill="hsl(var(--primary))" />
          </g>
        );
      })}
      {refinement && (
        <text x={cx} y="155" textAnchor="middle" fontSize="7" fill="hsl(var(--chart-2))" fontWeight="600">refinamento</text>
      )}
      <circle cx={cx} cy={cy} r="4" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" />
      <line x1={cx - 5} y1={cy} x2={cx + 5} y2={cy} stroke="hsl(var(--primary))" strokeWidth="1" />
      <line x1={cx} y1={cy - 5} x2={cx} y2={cy + 5} stroke="hsl(var(--primary))" strokeWidth="1" />
    </svg>
  );
}

function IllustrationHoleCenter({ refinement }: { refinement: boolean }) {
  const cx = 100, cy = 80, r = 40;
  const rClose = 32;
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <rect x="35" y="25" width="130" height="110" rx="2" fill="hsl(var(--muted))" opacity="0.15"
        stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={r} fill="hsl(var(--background))"
        stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" />
      {/* First touches – long */}
      <line x1={cx} y1={cy} x2={cx + r - 4} y2={cy} stroke="hsl(var(--primary))" strokeWidth="1.5" markerEnd="url(#arrowH)" opacity={refinement ? 0.3 : 1} />
      <line x1={cx} y1={cy} x2={cx - r + 4} y2={cy} stroke="hsl(var(--primary))" strokeWidth="1.5" markerEnd="url(#arrowH)" opacity={refinement ? 0.3 : 1} />
      <line x1={cx} y1={cy} x2={cx} y2={cy + r - 4} stroke="hsl(var(--chart-4))" strokeWidth="1.5" markerEnd="url(#arrowH2)" opacity={refinement ? 0.3 : 1} />
      <line x1={cx} y1={cy} x2={cx} y2={cy - r + 4} stroke="hsl(var(--chart-4))" strokeWidth="1.5" markerEnd="url(#arrowH2)" opacity={refinement ? 0.3 : 1} />
      {refinement && (
        <>
          <line x1={cx} y1={cy} x2={cx + rClose - 2} y2={cy} stroke="hsl(var(--chart-2))" strokeWidth="2" markerEnd="url(#arrowHR)" />
          <line x1={cx} y1={cy} x2={cx - rClose + 2} y2={cy} stroke="hsl(var(--chart-2))" strokeWidth="2" markerEnd="url(#arrowHR)" />
          <line x1={cx} y1={cy} x2={cx} y2={cy + rClose - 2} stroke="hsl(var(--chart-2))" strokeWidth="2" markerEnd="url(#arrowHR)" />
          <line x1={cx} y1={cy} x2={cx} y2={cy - rClose + 2} stroke="hsl(var(--chart-2))" strokeWidth="2" markerEnd="url(#arrowHR)" />
          <text x={cx} y="155" textAnchor="middle" fontSize="7" fill="hsl(var(--chart-2))" fontWeight="600">refinamento</text>
        </>
      )}
      <circle cx={cx} cy={cy} r="3" fill="hsl(var(--primary))" />
      <defs>
        <marker id="arrowH" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5" fill="hsl(var(--primary))" />
        </marker>
        <marker id="arrowH2" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5" fill="hsl(var(--chart-4))" />
        </marker>
        <marker id="arrowHR" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5" fill="hsl(var(--chart-2))" />
        </marker>
      </defs>
    </svg>
  );
}

/* ── Mode metadata ─────────────────────────────── */
const MODE_INFO: Record<LocationMode, { label: string; icon: typeof Square; desc: string }> = {
  corner: { label: "Achar Quina", icon: Square, desc: "Toque em dois lados para encontrar o vértice da peça." },
  "rect-center": { label: "Centro Retangular", icon: Target, desc: "Toque nos 4 lados para encontrar o centro da peça." },
  "circle-center": { label: "Centro Circular", icon: Circle, desc: "Toque em pontos ao redor do círculo para encontrar o centro." },
  "hole-center": { label: "Centro de Furo", icon: Disc, desc: "Toque as bordas internas para encontrar o centro do furo." },
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

  // Refinement state
  const [refinementEnabled, setRefinementEnabled] = useState(defaultCenterCornersConfig.refinementEnabled);
  const [refinementDistance, setRefinementDistance] = useState(defaultCenterCornersConfig.refinementDistance);
  const [refinementFeed, setRefinementFeed] = useState(defaultCenterCornersConfig.refinementFeed);
  const [refinementCycles, setRefinementCycles] = useState(defaultCenterCornersConfig.refinementCycles);

  const modeInfo = MODE_INFO[mode];

  const handleGenerate = useCallback(() => {
    const cfg: CenterCornersConfig = {
      mode, safeZ, probeFeed, probeDepth, probeDiameter,
      cornerQuadrant: cornerQuadrant as any,
      approxSizeX, approxSizeY, approxDiameter, circlePoints,
      setOrigin, moveToCenter, decimalPlaces: 3, controller: controller as any,
      refinementEnabled, refinementDistance, refinementFeed, refinementCycles,
    };
    try {
      const r = generateCenterCornersGcode(cfg);
      setResult(r);
      toast.success("G-code gerado com sucesso!");
    } catch (err: any) {
      toast.error("Erro: " + (err?.message || "erro desconhecido"));
    }
  }, [mode, safeZ, probeFeed, probeDepth, probeDiameter, cornerQuadrant, approxSizeX, approxSizeY, approxDiameter, circlePoints, setOrigin, moveToCenter, controller, refinementEnabled, refinementDistance, refinementFeed, refinementCycles]);

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
        <div className="w-[260px] shrink-0 border-r border-border bg-card/60 flex flex-col overflow-hidden">
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
                  Refaz a medição mais perto da borda para aumentar a precisão do centro ou da quina.
                </p>
              </div>

              <Separator />

              {/* Options */}
              <div className="flex items-center justify-between">
                <Label className="text-[11px] text-muted-foreground">Definir origem automaticamente</Label>
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

                  {/* Refinement advanced params */}
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
                </CollapsibleContent>
              </Collapsible>
            </div>
          </ScrollArea>
        </div>

        {/* CENTER PANEL */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
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

          <div className="flex-1 overflow-auto p-4">
            {showPreview ? (
              <div className="max-w-md mx-auto">
                <div className="rounded-xl border border-border bg-card/50 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    {(() => { const Icon = modeInfo.icon; return <Icon className="h-5 w-5 text-primary" />; })()}
                    <h2 className="text-sm font-semibold">{modeInfo.label}</h2>
                    {refinementEnabled && (
                      <Badge variant="outline" className="text-[9px] border-chart-2 text-chart-2 gap-1">
                        <ShieldCheck className="h-2.5 w-2.5" /> Conferência
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[9px] ml-auto">
                      {controller.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="aspect-[5/4] bg-muted/20 rounded-lg border border-border/50 mb-4 p-2">
                    {mode === "corner" && <IllustrationCorner quadrant={cornerQuadrant} refinement={refinementEnabled} />}
                    {mode === "rect-center" && <IllustrationRectCenter refinement={refinementEnabled} />}
                    {mode === "circle-center" && <IllustrationCircleCenter points={circlePoints} refinement={refinementEnabled} />}
                    {mode === "hole-center" && <IllustrationHoleCenter refinement={refinementEnabled} />}
                  </div>
                  <p className="text-xs text-muted-foreground text-center">{modeInfo.desc}</p>
                  {refinementEnabled && (
                    <div className="mt-3 flex items-center gap-2 justify-center">
                      <div className="h-0.5 w-5 rounded bg-primary opacity-40" />
                      <span className="text-[9px] text-muted-foreground">primeiro toque</span>
                      <div className="h-0.5 w-5 rounded bg-chart-2" />
                      <span className="text-[9px] text-chart-2 font-medium">toque de conferência</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full">
                {result ? (
                  <div className="rounded-lg border border-border bg-[#0c0c14] p-4 h-full overflow-auto">
                    <pre className="text-[11px] text-green-400 font-mono whitespace-pre leading-relaxed">
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
                      <div className="flex justify-between"><span className="text-muted-foreground">Ciclos</span><span>{refinementCycles}</span></div>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border/50 p-2.5 space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Opções</p>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Definir origem</span>
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
