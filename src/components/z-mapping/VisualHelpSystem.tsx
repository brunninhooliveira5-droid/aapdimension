import { useState, useRef, useCallback, useEffect } from "react";
import { HelpCircle, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/* ══════════════════════════════════════════════════════════
   ASSISTENTE VISUAL — Visual Help System for Z-Mapping
   ══════════════════════════════════════════════════════════ */

/* ── SVG Technical Illustrations ──────────────────────── */

function IllustrationSafeHeight() {
  return (
    <svg viewBox="0 0 160 100" className="w-full">
      {/* Workpiece */}
      <rect x="20" y="60" width="120" height="20" rx="2" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="80" y="73" textAnchor="middle" className="fill-muted-foreground" fontSize="7">Peça</text>
      {/* Tool */}
      <rect x="72" y="12" width="16" height="28" rx="1" fill="hsl(var(--primary))" opacity="0.7" />
      <polygon points="76,40 84,40 80,48" fill="hsl(var(--primary))" />
      {/* Safe height arrow */}
      <line x1="100" y1="12" x2="100" y2="60" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="3,2" />
      <line x1="96" y1="12" x2="104" y2="12" stroke="hsl(var(--primary))" strokeWidth="1" />
      <line x1="96" y1="60" x2="104" y2="60" stroke="hsl(var(--primary))" strokeWidth="1" />
      <text x="118" y="38" className="fill-primary" fontSize="7" fontWeight="bold">Altura</text>
      <text x="118" y="47" className="fill-primary" fontSize="7" fontWeight="bold">segura</text>
    </svg>
  );
}

function IllustrationSpacingX() {
  return (
    <svg viewBox="0 0 160 100" className="w-full">
      {/* Grid lines */}
      {[30, 60, 90, 120].map((x) => (
        <line key={x} x1={x} y1="15" x2={x} y2="85" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="2,2" />
      ))}
      {[25, 50, 75].map((y) => (
        <line key={y} x1="20" y1={y} x2="130" y2={y} stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="2,2" />
      ))}
      {/* Points */}
      {[30, 60, 90, 120].map((x) =>
        [25, 50, 75].map((y) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="hsl(var(--primary))" opacity="0.6" />
        ))
      )}
      {/* Spacing arrow */}
      <line x1="30" y1="90" x2="60" y2="90" stroke="hsl(var(--primary))" strokeWidth="1.5" markerEnd="url(#arrowX)" />
      <line x1="60" y1="90" x2="30" y2="90" stroke="hsl(var(--primary))" strokeWidth="1.5" markerEnd="url(#arrowX)" />
      <defs>
        <marker id="arrowX" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill="hsl(var(--primary))" />
        </marker>
      </defs>
      <text x="45" y="99" textAnchor="middle" className="fill-primary" fontSize="7" fontWeight="bold">Dist. X</text>
    </svg>
  );
}

function IllustrationSpacingY() {
  return (
    <svg viewBox="0 0 160 100" className="w-full">
      {[30, 60, 90, 120].map((x) => (
        <line key={x} x1={x} y1="10" x2={x} y2="80" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="2,2" />
      ))}
      {[20, 45, 70].map((y) => (
        <line key={y} x1="20" y1={y} x2="130" y2={y} stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="2,2" />
      ))}
      {[30, 60, 90, 120].map((x) =>
        [20, 45, 70].map((y) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="hsl(var(--primary))" opacity="0.6" />
        ))
      )}
      {/* Spacing arrow vertical */}
      <line x1="140" y1="20" x2="140" y2="45" stroke="hsl(var(--primary))" strokeWidth="1.5" />
      <line x1="136" y1="20" x2="144" y2="20" stroke="hsl(var(--primary))" strokeWidth="1" />
      <line x1="136" y1="45" x2="144" y2="45" stroke="hsl(var(--primary))" strokeWidth="1" />
      <text x="148" y="35" className="fill-primary" fontSize="7" fontWeight="bold" writingMode="tb">Dist. Y</text>
    </svg>
  );
}

function IllustrationProbeFeed() {
  return (
    <svg viewBox="0 0 160 100" className="w-full">
      {/* Workpiece */}
      <rect x="10" y="65" width="60" height="15" rx="2" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />
      <rect x="90" y="65" width="60" height="15" rx="2" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />
      {/* Slow probe */}
      <rect x="32" y="20" width="12" height="20" rx="1" fill="hsl(var(--primary))" opacity="0.5" />
      <polygon points="35,40 41,40 38,48" fill="hsl(var(--primary))" opacity="0.5" />
      <line x1="38" y1="48" x2="38" y2="65" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="2,1" />
      <text x="38" y="14" textAnchor="middle" className="fill-muted-foreground" fontSize="6">Lento</text>
      <text x="38" y="94" textAnchor="middle" className="fill-emerald-500" fontSize="6">+ Preciso</text>
      {/* Fast probe */}
      <rect x="112" y="20" width="12" height="20" rx="1" fill="hsl(var(--primary))" opacity="0.8" />
      <polygon points="115,40 121,40 118,48" fill="hsl(var(--primary))" opacity="0.8" />
      <line x1="118" y1="48" x2="118" y2="65" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="4,1" />
      <text x="118" y="14" textAnchor="middle" className="fill-muted-foreground" fontSize="6">Rápido</text>
      <text x="118" y="94" textAnchor="middle" className="fill-amber-500" fontSize="6">+ Rápido</text>
    </svg>
  );
}

function IllustrationMappingUniform() {
  return (
    <svg viewBox="0 0 160 80" className="w-full">
      {[20, 45, 70, 95, 120, 145].map((x) =>
        [15, 35, 55, 75].map((y) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" fill="hsl(var(--primary))" opacity="0.5" />
        ))
      )}
      {/* connecting horizontal lines */}
      {[15, 35, 55, 75].map((y) => (
        <line key={y} x1="20" y1={y} x2="145" y2={y} stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.3" />
      ))}
    </svg>
  );
}

function IllustrationMappingSmart() {
  return (
    <svg viewBox="0 0 160 80" className="w-full">
      {/* Sparse area */}
      {[20, 55, 90].map((x) =>
        [15, 45, 75].map((y) => (
          <circle key={`s-${x}-${y}`} cx={x} cy={y} r="2" fill="hsl(var(--primary))" opacity="0.3" />
        ))
      )}
      {/* Dense area (detail zone) */}
      {[105, 115, 125, 135, 145].map((x) =>
        [10, 22, 34, 46, 58, 70].map((y) => (
          <circle key={`d-${x}-${y}`} cx={x} cy={y} r="2" fill="hsl(var(--primary))" opacity="0.7" />
        ))
      )}
      <rect x="100" y="5" width="50" height="70" rx="3" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="3,2" />
      <text x="125" y="-1" textAnchor="middle" className="fill-primary" fontSize="6">+ detalhes</text>
    </svg>
  );
}

function IllustrationTouchPrecision() {
  return (
    <svg viewBox="0 0 160 80" className="w-full">
      {/* Workpiece */}
      <rect x="5" y="55" width="150" height="12" rx="2" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.5" />
      {/* 1 touch */}
      <circle cx="30" cy="50" r="3" fill="hsl(var(--primary))" opacity="0.4" />
      <line x1="30" y1="35" x2="30" y2="47" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.4" />
      <text x="30" y="26" textAnchor="middle" className="fill-muted-foreground" fontSize="6">1x</text>
      <text x="30" y="76" textAnchor="middle" className="fill-muted-foreground" fontSize="5">Rápido</text>
      {/* 2 touches */}
      <circle cx="80" cy="50" r="3" fill="hsl(var(--primary))" opacity="0.6" />
      <circle cx="80" cy="44" r="2" fill="hsl(var(--primary))" opacity="0.3" />
      <line x1="80" y1="30" x2="80" y2="47" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.5" />
      <text x="80" y="22" textAnchor="middle" className="fill-muted-foreground" fontSize="6">2x</text>
      <text x="80" y="76" textAnchor="middle" className="fill-muted-foreground" fontSize="5">Normal</text>
      {/* 3 touches */}
      <circle cx="130" cy="50" r="3" fill="hsl(var(--primary))" opacity="0.8" />
      <circle cx="130" cy="44" r="2" fill="hsl(var(--primary))" opacity="0.4" />
      <circle cx="130" cy="38" r="2" fill="hsl(var(--primary))" opacity="0.2" />
      <line x1="130" y1="24" x2="130" y2="47" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.7" />
      <text x="130" y="16" textAnchor="middle" className="fill-muted-foreground" fontSize="6">3x</text>
      <text x="130" y="76" textAnchor="middle" className="fill-emerald-500" fontSize="5">Preciso</text>
    </svg>
  );
}

function IllustrationProbeOffset() {
  return (
    <svg viewBox="0 0 160 100" className="w-full">
      {/* Spindle */}
      <rect x="50" y="10" width="20" height="40" rx="2" fill="hsl(var(--muted-foreground))" opacity="0.4" />
      <text x="60" y="58" textAnchor="middle" className="fill-muted-foreground" fontSize="6">Spindle</text>
      {/* Probe (offset to the side) */}
      <rect x="90" y="15" width="10" height="30" rx="1" fill="hsl(var(--primary))" opacity="0.6" />
      <circle cx="95" cy="48" r="3" fill="hsl(var(--primary))" />
      <text x="95" y="62" textAnchor="middle" className="fill-primary" fontSize="6">Probe</text>
      {/* Offset arrow */}
      <line x1="60" y1="70" x2="95" y2="70" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="3,2" />
      <line x1="60" y1="67" x2="60" y2="73" stroke="hsl(var(--primary))" strokeWidth="1" />
      <line x1="95" y1="67" x2="95" y2="73" stroke="hsl(var(--primary))" strokeWidth="1" />
      <text x="78" y="80" textAnchor="middle" className="fill-primary" fontSize="7" fontWeight="bold">Offset X</text>
      {/* Workpiece */}
      <rect x="20" y="85" width="120" height="10" rx="2" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.5" />
    </svg>
  );
}

function IllustrationVbitCompensation() {
  return (
    <svg viewBox="0 0 160 100" className="w-full">
      {/* Curved surface */}
      <path d="M10,70 Q40,40 80,55 Q120,70 150,50" fill="none" stroke="hsl(var(--border))" strokeWidth="2" />
      {/* Without compensation */}
      <polygon points="40,30 46,30 43,42" fill="hsl(var(--destructive))" opacity="0.5" />
      <line x1="43" y1="42" x2="43" y2="52" stroke="hsl(var(--destructive))" strokeWidth="0.5" strokeDasharray="1,1" />
      <text x="43" y="24" textAnchor="middle" className="fill-destructive" fontSize="5">Sem comp.</text>
      {/* With compensation */}
      <polygon points="110,26 116,26 113,38" fill="hsl(var(--primary))" opacity="0.7" />
      <line x1="113" y1="38" x2="113" y2="56" stroke="hsl(var(--primary))" strokeWidth="0.5" strokeDasharray="1,1" />
      <text x="113" y="20" textAnchor="middle" className="fill-primary" fontSize="5">Com comp.</text>
      {/* Labels */}
      <text x="43" y="94" textAnchor="middle" className="fill-destructive" fontSize="6">Profundidade</text>
      <text x="43" y="100" textAnchor="middle" className="fill-destructive" fontSize="6">variável ✗</text>
      <text x="113" y="94" textAnchor="middle" className="fill-primary" fontSize="6">Profundidade</text>
      <text x="113" y="100" textAnchor="middle" className="fill-primary" fontSize="6">constante ✓</text>
    </svg>
  );
}

function IllustrationRetraction() {
  return (
    <svg viewBox="0 0 160 80" className="w-full">
      {/* Curved surface */}
      <path d="M10,60 Q50,30 80,50 Q110,70 150,40" fill="none" stroke="hsl(var(--border))" strokeWidth="1.5" />
      {/* Standard (fixed height) */}
      <line x1="30" y1="15" x2="130" y2="15" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" strokeDasharray="3,2" />
      <text x="80" y="12" textAnchor="middle" className="fill-muted-foreground" fontSize="5">Padrão (fixo)</text>
      {/* Adaptive path */}
      <path d="M30,45 L30,25 L60,25 L60,38 L90,38 L90,22 L120,22 L120,35" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="2,1" />
      <text x="80" y="78" textAnchor="middle" className="fill-primary" fontSize="6" fontWeight="bold">Adaptativo</text>
      {/* Points */}
      {[30, 60, 90, 120].map((x, i) => (
        <circle key={x} cx={x} cy={[48, 38, 52, 42][i]} r="2.5" fill="hsl(var(--primary))" />
      ))}
    </svg>
  );
}

function IllustrationProbeDepth() {
  return (
    <svg viewBox="0 0 160 100" className="w-full">
      {/* Workpiece */}
      <rect x="20" y="55" width="120" height="25" rx="2" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="80" y="70" textAnchor="middle" className="fill-muted-foreground" fontSize="7">Peça</text>
      {/* Tool descending */}
      <rect x="72" y="10" width="16" height="20" rx="1" fill="hsl(var(--primary))" opacity="0.6" />
      <polygon points="76,30 84,30 80,38" fill="hsl(var(--primary))" opacity="0.6" />
      {/* Depth arrow */}
      <line x1="55" y1="38" x2="55" y2="55" stroke="hsl(var(--destructive))" strokeWidth="1" strokeDasharray="2,1" />
      <line x1="51" y1="38" x2="59" y2="38" stroke="hsl(var(--destructive))" strokeWidth="1" />
      <line x1="51" y1="55" x2="59" y2="55" stroke="hsl(var(--destructive))" strokeWidth="1" />
      <text x="45" y="50" textAnchor="end" className="fill-destructive" fontSize="6">Prof. máx.</text>
      {/* Surface line */}
      <line x1="20" y1="55" x2="140" y2="55" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.3" />
    </svg>
  );
}

/* ── Illustration registry ────────────────────────────── */
export type IllustrationKey =
  | "safeHeight" | "spacingX" | "spacingY" | "probeFeed"
  | "mappingUniform" | "mappingSmart" | "touchPrecision"
  | "probeOffset" | "vbitCompensation" | "retraction" | "probeDepth";

const ILLUSTRATIONS: Record<IllustrationKey, () => JSX.Element> = {
  safeHeight: IllustrationSafeHeight,
  spacingX: IllustrationSpacingX,
  spacingY: IllustrationSpacingY,
  probeFeed: IllustrationProbeFeed,
  mappingUniform: IllustrationMappingUniform,
  mappingSmart: IllustrationMappingSmart,
  touchPrecision: IllustrationTouchPrecision,
  probeOffset: IllustrationProbeOffset,
  vbitCompensation: IllustrationVbitCompensation,
  retraction: IllustrationRetraction,
  probeDepth: IllustrationProbeDepth,
};

/* ── Visual Help Card (hover-delay card) ──────────────── */
interface VisualHelpCardProps {
  title: string;
  description: string;
  impact: string;
  illustration: IllustrationKey;
}

export function VisualHelpCard({ title, description, impact, illustration }: VisualHelpCardProps) {
  const Illust = ILLUSTRATIONS[illustration];
  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-border/50 bg-background p-1.5 overflow-hidden">
        <Illust />
      </div>
      <div>
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        <p className="text-[10px] text-primary font-medium mt-1">↳ {impact}</p>
      </div>
    </div>
  );
}

/* ── Enhanced HelpTip with hover-delay visual card ────── */
interface EnhancedHelpTipProps {
  text: string;
  visual?: {
    title: string;
    description: string;
    impact: string;
    illustration: IllustrationKey;
  };
}

export function EnhancedHelpTip({ text, visual }: EnhancedHelpTipProps) {
  const [showVisual, setShowVisual] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (visual) {
      hoverTimerRef.current = setTimeout(() => setShowVisual(true), 1500);
    }
  }, [visual]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setShowVisual(false);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={showVisual ? true : undefined}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary transition-colors"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => { e.preventDefault(); if (visual) setShowVisual(v => !v); }}
          >
            <HelpCircle className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className={visual && showVisual ? "max-w-[260px] p-3" : "max-w-[220px] text-xs"}
          onPointerDownOutside={() => setShowVisual(false)}
        >
          {visual && showVisual ? (
            <VisualHelpCard {...visual} />
          ) : (
            <span className="text-xs">{text}</span>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ── Parameter help data registry ─────────────────────── */
export const PARAM_HELP: Record<string, EnhancedHelpTipProps> = {
  safeHeight: {
    text: "Altura em que a ferramenta se move sem tocar na peça.",
    visual: {
      title: "Altura Segura",
      description: "A ferramenta sobe até essa altura para se deslocar entre pontos de medição sem risco de colisão.",
      impact: "Maior = mais seguro, porém mais lento",
      illustration: "safeHeight",
    },
  },
  spacingX: {
    text: "Distância horizontal entre os pontos de medição da grade.",
    visual: {
      title: "Distância entre pontos em X",
      description: "Define o espaçamento horizontal da grade de medição. Pontos mais próximos geram um mapa mais preciso.",
      impact: "Menor = mais preciso, porém mais pontos e mais tempo",
      illustration: "spacingX",
    },
  },
  spacingY: {
    text: "Distância vertical entre os pontos de medição da grade.",
    visual: {
      title: "Distância entre pontos em Y",
      description: "Define o espaçamento vertical da grade de medição. Pontos mais próximos geram um mapa mais preciso.",
      impact: "Menor = mais preciso, porém mais pontos e mais tempo",
      illustration: "spacingY",
    },
  },
  probeFeed: {
    text: "Velocidade que a máquina usa para tocar a superfície.",
    visual: {
      title: "Velocidade do Toque",
      description: "Controla a velocidade com que o probe desce até tocar a peça. Velocidade baixa dá mais precisão.",
      impact: "Mais lento = mais preciso na medição",
      illustration: "probeFeed",
    },
  },
  probeDepth: {
    text: "Profundidade máxima que o probe irá descer buscando a peça.",
    visual: {
      title: "Profundidade Máxima do Probe",
      description: "Define o limite inferior da descida do probe. Se a peça não for encontrada antes desse ponto, o mapeamento para.",
      impact: "Deve ser maior que a variação esperada da superfície",
      illustration: "probeDepth",
    },
  },
  mappingUniform: {
    text: "Distribui pontos em grade regular por toda a área.",
    visual: {
      title: "Grade Tradicional",
      description: "Pontos distribuídos igualmente em uma grade retangular. Simples e confiável para superfícies regulares.",
      impact: "Mais previsível, bom para a maioria dos casos",
      illustration: "mappingUniform",
    },
  },
  mappingSmart: {
    text: "Concentra mais pontos nas áreas com mais detalhes do percurso.",
    visual: {
      title: "Mapeamento Inteligente",
      description: "Analisa o G-code e coloca mais pontos de medição nas regiões com mais movimentos da ferramenta.",
      impact: "Menos pontos no total, mais precisão onde importa",
      illustration: "mappingSmart",
    },
  },
  touchPrecision: {
    text: "Quantas vezes o probe toca cada ponto para confirmar a medição.",
    visual: {
      title: "Precisão do Toque",
      description: "O probe pode tocar cada ponto 1, 2 ou 3 vezes. Mais toques permitem confirmar o valor medido e reduzir erros.",
      impact: "Mais toques = mais preciso, porém mais lento",
      illustration: "touchPrecision",
    },
  },
  probeOffset: {
    text: "Distância entre o probe e o centro da ferramenta.",
    visual: {
      title: "Offset do Probe",
      description: "Se o probe está montado ao lado do spindle, o sistema corrige automaticamente a posição dos pontos de medição.",
      impact: "Valores incorretos causam erro de posição",
      illustration: "probeOffset",
    },
  },
  vbitComp: {
    text: "Compensação de profundidade para ferramentas V-bit em superfícies curvas.",
    visual: {
      title: "Compensação V-bit",
      description: "Em superfícies inclinadas, a V-bit penetra mais ou menos. A compensação ajusta a profundidade para manter a largura do traço constante.",
      impact: "Gravação uniforme mesmo em superfícies irregulares",
      illustration: "vbitCompensation",
    },
  },
  retraction: {
    text: "Como a ferramenta se desloca entre os pontos de medição.",
    visual: {
      title: "Deslocamento entre Pontos",
      description: "O modo adaptativo ajusta a altura de deslocamento baseado no último ponto medido, evitando colisões em peças curvas.",
      impact: "Adaptativo = mais seguro para superfícies irregulares",
      illustration: "retraction",
    },
  },
};
