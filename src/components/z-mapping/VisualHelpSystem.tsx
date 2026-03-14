import { useState, useRef, useCallback, useEffect } from "react";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ILLUSTRATIONS, type IllustrationKey } from "./ZMappingIllustrations";

/* ══════════════════════════════════════════════════════════
   ASSISTENTE VISUAL — Visual Help System for Z-Mapping
   ══════════════════════════════════════════════════════════ */

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
export interface EnhancedHelpTipProps {
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
  touchPrecision: {
    text: "Quantas vezes o probe toca cada ponto para confirmar a medição.",
    visual: {
      title: "Precisão do Toque",
      description: "O probe pode tocar cada ponto 1, 2 ou 3 vezes. Mais toques permitem confirmar o valor medido e reduzir erros.",
      impact: "Mais toques = mais preciso, porém mais lento",
      illustration: "touchPrecision",
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
  retraction: {
    text: "Como a ferramenta se desloca entre os pontos de medição.",
    visual: {
      title: "Deslocamento entre Pontos",
      description: "O modo adaptativo ajusta a altura de deslocamento baseado no último ponto medido, evitando colisões em peças curvas.",
      impact: "Adaptativo = mais seguro para superfícies irregulares",
      illustration: "retraction",
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
  probeOffsetX: {
    text: "Distância lateral do probe em relação à ferramenta.",
    visual: {
      title: "Offset X do Probe",
      description: "Distância horizontal entre o centro da fresa e o ponto de toque do probe. O sistema usa esse valor para corrigir as coordenadas de medição.",
      impact: "Valor incorreto = medição deslocada",
      illustration: "probeOffsetX",
    },
  },
  probeOffsetY: {
    text: "Distância frontal do probe em relação à ferramenta.",
    visual: {
      title: "Offset Y do Probe",
      description: "Distância vertical (frente/atrás) entre o centro da fresa e o ponto de toque do probe.",
      impact: "Valor incorreto = medição deslocada em Y",
      illustration: "probeOffsetY",
    },
  },
  probeOffsetZ: {
    text: "Diferença de altura entre probe e ferramenta.",
    visual: {
      title: "Offset Z do Probe",
      description: "Diferença de altura entre o ponto de toque do probe e a ponta da ferramenta de corte. Usado no modo automático.",
      impact: "Crítico para continuidade automática",
      illustration: "probeOffsetZ",
    },
  },
  engravingType: {
    text: "Define como o sistema irá compensar o percurso após o mapeamento.",
    visual: {
      title: "Tipo de Gravação",
      description: "Escolha entre usinagem normal (plana), gravação em superfície curva ou gravação V-bit com compensação de inclinação.",
      impact: "Determina a qualidade da compensação",
      illustration: "engravingType",
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
  curvePrecision: {
    text: "Define a precisão da conversão de arcos em segmentos retos.",
    visual: {
      title: "Precisão das Curvas",
      description: "O sistema converte arcos (G2/G3) em pequenos segmentos retos para aplicar a compensação. Mais segmentos = curvas mais suaves.",
      impact: "Alta precisão = curvas mais fiéis, mais dados",
      illustration: "curvePrecision",
    },
  },
  simulation3D: {
    text: "Visualize como a ferramenta acompanhará a superfície da peça.",
    visual: {
      title: "Simulação 3D",
      description: "Mostra uma prévia visual em 3D de como a ferramenta irá subir e descer para acompanhar a superfície medida. Cores indicam a variação de altura.",
      impact: "Permite verificar a compensação antes de usinar",
      illustration: "simulation3D",
    },
  },
  mappingByMachining: {
    text: "Usa a usinagem anterior como referência de superfície.",
    visual: {
      title: "Mapeamento por Usinagem",
      description: "A superfície já usinada serve como mapa de referência. O novo percurso é aplicado sobre esse mapa com compensação automática.",
      impact: "Ideal para re-usinagem ou acabamento",
      illustration: "mappingByMachining",
    },
  },
  densityMapping: {
    text: "Distribui mais pontos de medição onde o G-code tem mais detalhes.",
    visual: {
      title: "Mapeamento por Densidade",
      description: "Analisa o percurso de usinagem e concentra mais pontos de medição nas áreas com mais movimentos e detalhes.",
      impact: "Mais pontos onde realmente importa",
      illustration: "densityMapping",
    },
  },
  fastSweep: {
    text: "Varre a superfície em linhas paralelas para mapeamento rápido.",
    visual: {
      title: "Varredura Rápida",
      description: "O probe percorre a superfície em linhas contínuas no padrão serpentina, medindo sem retração entre cada ponto.",
      impact: "Mapeia mais rápido, ideal para peças grandes",
      illustration: "fastSweep",
    },
  },
  curvedSurface: {
    text: "A ferramenta segue a superfície medida mantendo profundidade constante.",
    visual: {
      title: "Superfície Curva Inclinada",
      description: "Em peças com rampas ou inclinações, o sistema ajusta a altura da ferramenta em cada ponto do percurso.",
      impact: "Profundidade de corte constante em qualquer inclinação",
      illustration: "curvedSurface",
    },
  },
};
