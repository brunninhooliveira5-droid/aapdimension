import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const STEPS = [
  {
    title: "Superfície irregular",
    text: "A peça ou mesa de trabalho nunca é perfeitamente plana. Pequenas variações de altura afetam a precisão do corte.",
  },
  {
    title: "Medição dos pontos",
    text: "Uma ferramenta de medição toca vários pontos da superfície, registrando a altura real de cada um.",
  },
  {
    title: "Grade de mapeamento",
    text: "Os pontos medidos formam uma grade que representa o relevo da superfície.",
  },
  {
    title: "Cálculo da correção",
    text: "O software calcula a diferença de altura em cada ponto e gera as correções necessárias.",
  },
  {
    title: "Usinagem corrigida",
    text: "O G-code final já inclui as correções. A ferramenta acompanha o relevo real da peça, garantindo profundidade uniforme.",
  },
];

// ── SVG scenes ──────────────────────────────────────────
function Scene({ step, tick }: { step: number; tick: number }) {
  const w = 400, h = 180;
  // Irregular surface points
  const surfaceY = [130, 122, 118, 125, 115, 120, 128, 124, 116, 121, 126];
  const sx = (i: number) => 30 + i * ((w - 60) / (surfaceY.length - 1));

  const surfacePath = surfaceY.map((y, i) => `${i === 0 ? "M" : "L"}${sx(i)},${y}`).join(" ");
  const surfaceFill = surfacePath + ` L${sx(surfaceY.length - 1)},${h} L${sx(0)},${h} Z`;

  // Grid points
  const gridCols = 6, gridRows = 3;
  const gridPts: { x: number; y: number; sy: number }[] = [];
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      const x = 50 + c * ((w - 100) / (gridCols - 1));
      const frac = (x - sx(0)) / (sx(surfaceY.length - 1) - sx(0));
      const idx = frac * (surfaceY.length - 1);
      const lo = Math.floor(idx), hi = Math.min(lo + 1, surfaceY.length - 1);
      const t = idx - lo;
      const sy = surfaceY[lo] * (1 - t) + surfaceY[hi] * t;
      gridPts.push({ x, y: 60 + r * 25, sy });
    }
  }

  // Probe position (animated)
  const probeIdx = Math.floor((tick / 8) % gridPts.length);
  const probeTarget = gridPts[probeIdx];

  // Corrected path (flat at constant depth)
  const correctedPath = surfaceY.map((y, i) => {
    const cy = y - 8; // follows surface at constant depth
    return `${i === 0 ? "M" : "L"}${sx(i)},${cy}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 200 }}>
      {/* Step 0: Irregular surface only */}
      {step >= 0 && (
        <>
          <path d={surfaceFill} fill="hsl(var(--muted))" opacity={0.5} />
          <path d={surfacePath} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
          {/* Flat reference line */}
          <line x1={30} y1={120} x2={w - 30} y2={120} stroke="hsl(var(--primary))" strokeWidth={0.5} strokeDasharray="4 3" opacity={0.3} />
        </>
      )}

      {/* Step 1: Probe touching points */}
      {step === 1 && probeTarget && (
        <>
          {/* Probe tool */}
          <line x1={probeTarget.x} y1={20} x2={probeTarget.x} y2={probeTarget.sy - 4}
            stroke="hsl(var(--primary))" strokeWidth={2} className="transition-all duration-300" />
          <circle cx={probeTarget.x} cy={probeTarget.sy - 4} r={3} fill="hsl(var(--primary))" className="transition-all duration-300" />
          {/* Contact spark */}
          <circle cx={probeTarget.x} cy={probeTarget.sy} r={5} fill="hsl(var(--primary))" opacity={0.3}>
            <animate attributeName="r" values="3;7;3" dur="0.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0.1;0.4" dur="0.6s" repeatCount="indefinite" />
          </circle>
          {/* Already measured points */}
          {gridPts.slice(0, probeIdx).map((pt, i) => (
            <circle key={i} cx={pt.x} cy={pt.sy} r={2} fill="hsl(var(--primary))" opacity={0.5} />
          ))}
        </>
      )}

      {/* Step 2: Grid of points */}
      {step === 2 && (
        <>
          {gridPts.map((pt, i) => {
            const delay = i * 0.06;
            return (
              <g key={i}>
                <circle cx={pt.x} cy={pt.sy} r={3.5} fill="hsl(var(--primary))" opacity={0}>
                  <animate attributeName="opacity" from="0" to="0.8" dur="0.3s" begin={`${delay}s`} fill="freeze" />
                </circle>
                {/* Vertical lines connecting to surface */}
                <line x1={pt.x} y1={pt.sy} x2={pt.x} y2={pt.sy + 2} stroke="hsl(var(--primary))" strokeWidth={0.5} opacity={0}>
                  <animate attributeName="opacity" from="0" to="0.3" dur="0.3s" begin={`${delay}s`} fill="freeze" />
                </line>
              </g>
            );
          })}
          {/* Grid lines */}
          {Array.from({ length: gridRows }).map((_, r) => {
            const rowPts = gridPts.slice(r * gridCols, (r + 1) * gridCols);
            const d = rowPts.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x},${pt.sy}`).join(" ");
            return <path key={r} d={d} fill="none" stroke="hsl(var(--primary))" strokeWidth={0.7} opacity={0.25} strokeDasharray="2 2" />;
          })}
        </>
      )}

      {/* Step 3: Calculation */}
      {step === 3 && (
        <>
          {gridPts.map((pt, i) => (
            <g key={i}>
              <circle cx={pt.x} cy={pt.sy} r={3} fill="hsl(var(--primary))" opacity={0.6} />
              {/* Correction arrows */}
              <line x1={pt.x} y1={pt.sy} x2={pt.x} y2={120} stroke="hsl(var(--primary))" strokeWidth={0.8} opacity={0.3} strokeDasharray="2 1" />
              {/* Delta label */}
              <text x={pt.x + 4} y={(pt.sy + 120) / 2} fontSize={7} fill="hsl(var(--primary))" opacity={0}>
                <animate attributeName="opacity" from="0" to="0.7" dur="0.4s" begin={`${i * 0.05}s`} fill="freeze" />
                Δ
              </text>
            </g>
          ))}
        </>
      )}

      {/* Step 4: Corrected toolpath */}
      {step === 4 && (
        <>
          {gridPts.map((pt, i) => (
            <circle key={i} cx={pt.x} cy={pt.sy} r={2} fill="hsl(var(--primary))" opacity={0.2} />
          ))}
          {/* Corrected path following surface */}
          <path d={correctedPath} fill="none" stroke="hsl(var(--primary))" strokeWidth={2.5} opacity={0}>
            <animate attributeName="opacity" from="0" to="1" dur="0.6s" fill="freeze" />
          </path>
          {/* Tool moving along corrected path */}
          <circle r={4} fill="hsl(var(--primary))">
            <animateMotion dur="3s" repeatCount="indefinite" path={correctedPath} />
          </circle>
          {/* Success indicator */}
          <text x={w / 2} y={45} textAnchor="middle" fontSize={11} fill="hsl(var(--primary))" fontWeight="600" opacity={0}>
            <animate attributeName="opacity" from="0" to="1" dur="0.5s" begin="0.5s" fill="freeze" />
            ✓ Profundidade uniforme
          </text>
        </>
      )}
    </svg>
  );
}

export function ZMappingAnimation({ onClose }: { onClose?: () => void }) {
  const [step, setStep] = useState(0);
  const [tick, setTick] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 400);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!autoPlay) return;
    const id = setInterval(() => {
      setStep(s => {
        if (s >= 4) { setAutoPlay(false); return 4; }
        return s + 1;
      });
    }, 4000);
    return () => clearInterval(id);
  }, [autoPlay]);

  const prev = useCallback(() => { setAutoPlay(false); setStep(s => Math.max(0, s - 1)); }, []);
  const next = useCallback(() => { setAutoPlay(false); setStep(s => Math.min(4, s + 1)); }, []);

  return (
    <div className="rounded-xl border bg-card overflow-hidden animate-fade-in">
      {/* Scene */}
      <div className="bg-muted/30 p-4 relative">
        {onClose && (
          <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
        <Scene step={step} tick={tick} />
      </div>

      {/* Controls */}
      <div className="p-4 space-y-3">
        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => { setAutoPlay(false); setStep(i); }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>

        {/* Text */}
        <div className="text-center min-h-[60px] flex flex-col justify-center">
          <p className="text-sm font-semibold">{STEPS[step].title}</p>
          <p className="text-xs text-muted-foreground mt-1">{STEPS[step].text}</p>
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={prev} disabled={step === 0} className="gap-1 text-xs">
            <ChevronLeft className="h-3.5 w-3.5" /> Anterior
          </Button>
          <span className="text-[10px] text-muted-foreground">{step + 1} / {STEPS.length}</span>
          <Button variant="ghost" size="sm" onClick={next} disabled={step === 4} className="gap-1 text-xs">
            Próximo <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
