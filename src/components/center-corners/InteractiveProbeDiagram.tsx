import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import type { LocationMode, HoleZStrategy } from "@/lib/center-corners-engine";

/* ── Types ── */
interface DiagramProps {
  mode: LocationMode;
  cornerQuadrant: string;
  approxSizeX: number;
  approxSizeY: number;
  approxDiameter: number;
  circlePoints: number;
  probeFeed: number;
  probeDepth: number;
  safeZ: number;
  refinementEnabled: boolean;
  refinementDistance: number;
  zProbeActive: boolean;
  zCornerInset: number;
  holeZStrategy: HoleZStrategy;
  holeZSafetyMargin: number;
  onApproxSizeXChange: (v: number) => void;
  onApproxSizeYChange: (v: number) => void;
  onApproxDiameterChange: (v: number) => void;
  onSafeZChange: (v: number) => void;
  onZCornerInsetChange: (v: number) => void;
  onHoleZSafetyMarginChange: (v: number) => void;
  onProbeDepthChange: (v: number) => void;
}

/* ── Constants ── */
const VW = 500;
const VH = 400;
const PIECE_COLOR = "hsl(var(--muted-foreground))";
const PIECE_FILL = "hsl(var(--muted))";
const PROBE_X = "hsl(var(--primary))";
const PROBE_Y = "hsl(var(--chart-4))";
const REFINE_COLOR = "hsl(var(--chart-2))";
const Z_COLOR = "hsl(var(--chart-5))";
const LABEL_COLOR = "hsl(var(--foreground))";
const DIM_COLOR = "hsl(var(--muted-foreground))";

/* ── Inline editable label ── */
function InlineValue({
  x, y, value, unit, color, onChange, fontSize = 11, anchor = "middle", label,
}: {
  x: number; y: number; value: number; unit: string; color: string;
  onChange?: (v: number) => void; fontSize?: number; anchor?: string; label?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setText(String(value)); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const labelY = label ? y - fontSize - 2 : undefined;

  if (!editing) {
    return (
      <g
        className={onChange ? "cursor-pointer" : ""}
        onClick={() => onChange && setEditing(true)}
      >
        {label && (
          <text x={x} y={labelY!} textAnchor={anchor} fontSize={fontSize - 2}
            fill={color} opacity="0.6">{label}</text>
        )}
        <rect x={x - 28} y={y - fontSize + 1} width={56} height={fontSize + 6} rx={3}
          fill="hsl(var(--background))" opacity="0.85" stroke={color} strokeWidth="0.8" />
        <text x={x} y={y + 2} textAnchor={anchor} fontSize={fontSize}
          fill={color} fontWeight="600" fontFamily="monospace">
          {value}{unit}
        </text>
      </g>
    );
  }

  return (
    <foreignObject x={x - 30} y={y - fontSize} width={60} height={fontSize + 8}>
      <input
        ref={inputRef}
        type="number"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const v = parseFloat(text);
          if (!isNaN(v) && onChange) onChange(Math.max(0, v));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") { setText(String(value)); setEditing(false); }
        }}
        className="w-full h-full text-center border rounded px-1"
        style={{ fontSize: fontSize - 1, fontFamily: "monospace", background: "hsl(var(--background))", color }}
      />
    </foreignObject>
  );
}

/* ── Animated probe arrow ── */
function AnimatedProbeArrow({
  x1, y1, x2, y2, color, delay = 0,
}: {
  x1: number; y1: number; x2: number; y2: number; color: string; delay?: number;
}) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2" opacity="0.3" />
      <circle r="3" fill={color}>
        <animateMotion dur="2s" repeatCount="indefinite" begin={`${delay}s`}>
          <mpath xlinkHref={`#path-${x1}-${y1}-${x2}-${y2}`} />
        </animateMotion>
      </circle>
      <path id={`path-${x1}-${y1}-${x2}-${y2}`} d={`M${x1},${y1} L${x2},${y2}`} fill="none" />
    </g>
  );
}

/* ── Dimension line ── */
function DimLine({
  x1, y1, x2, y2, label, color = DIM_COLOR,
}: {
  x1: number; y1: number; x2: number; y2: number; label: string; color?: string;
}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="0.7" strokeDasharray="4 2" opacity="0.5" />
      <line x1={x1} y1={y1 - 3} x2={x1} y2={y1 + 3} stroke={color} strokeWidth="0.7" opacity="0.5" />
      <line x1={x2} y1={y2 - 3} x2={x2} y2={y2 + 3} stroke={color} strokeWidth="0.7" opacity="0.5" />
      {label && <text x={mx} y={my - 4} textAnchor="middle" fontSize="8" fill={color} opacity="0.7">{label}</text>}
    </g>
  );
}

/* ── Step navigation bar ── */
function StepNav({ step, total, labels, onStep }: {
  step: number; total: number; labels: string[]; onStep: (s: number) => void;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-card/80 border-t border-border/50">
      <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 px-2"
        disabled={step <= 0} onClick={() => onStep(step - 1)}>
        <ChevronLeft className="h-3 w-3" /> Anterior
      </Button>
      <div className="flex items-center gap-1.5">
        {labels.map((l, i) => (
          <button key={i} onClick={() => onStep(i)}
            className={`px-2 py-0.5 rounded text-[9px] font-medium transition-colors ${
              i === step ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}>
            {l}
          </button>
        ))}
      </div>
      <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 px-2"
        disabled={step >= total - 1} onClick={() => onStep(step + 1)}>
        Próxima <ChevronRight className="h-3 w-3" />
      </Button>
    </div>
  );
}

/* ──── MAIN COMPONENT ──── */
export default function InteractiveProbeDiagram(props: DiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [step, setStep] = useState(0);

  const getSteps = () => {
    const base = ["Posição"];
    if (props.refinementEnabled) base.push("Conferência");
    if (props.zProbeActive) base.push("Probe Z");
    return base;
  };
  const steps = getSteps();
  const clampedStep = Math.min(step, steps.length - 1);

  const common = { ...props, svgRef, step: clampedStep };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        {props.mode === "corner" && <CornerDiagram {...common} />}
        {props.mode === "rect-center" && <RectCenterDiagram {...common} />}
        {props.mode === "circle-center" && <CircleCenterDiagram {...common} />}
        {props.mode === "hole-center" && <HoleCenterDiagram {...common} />}
      </div>
      {steps.length > 1 && (
        <StepNav step={clampedStep} total={steps.length} labels={steps} onStep={setStep} />
      )}
    </div>
  );
}

type SubDiagramProps = DiagramProps & { svgRef: React.RefObject<SVGSVGElement | null>; step: number };

/* ════════════════════════════════════════════════ */
/* ── CORNER DIAGRAM ── */
function CornerDiagram({
  cornerQuadrant, safeZ, probeDepth, refinementEnabled, refinementDistance, zProbeActive, zCornerInset,
  onSafeZChange, onZCornerInsetChange, onProbeDepthChange, svgRef, step,
}: SubDiagramProps) {
  const isLeft = cornerQuadrant.includes("left");
  const isFront = cornerQuadrant.includes("front");

  const px = 100, py = 60, pw = 300, ph = 240;
  const cornerX = isLeft ? px : px + pw;
  const cornerY = isFront ? py + ph : py;

  // Probe approach — distance from material edge controlled by probeDepth
  const probeGap = Math.max(30, Math.min(80, probeDepth * 2));
  const probeXStart = isLeft ? px - probeGap : px + pw + probeGap;
  const probeXEnd = cornerX;
  const probeYStart = isFront ? py + ph + probeGap : py - probeGap;
  const probeYEnd = cornerY;

  const zpX = cornerX + (isLeft ? 1 : -1) * zCornerInset * 2;
  const zpY = cornerY + (isFront ? -1 : 1) * zCornerInset * 2;

  // Step 0: main touch, Step 1: refinement, Step 2: Z
  const showMain = step === 0;
  const showRefine = step === 1 && refinementEnabled;
  const showZ = (step === 2 && zProbeActive) || (step === 1 && !refinementEnabled && zProbeActive);

  return (
    <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} className="w-full h-full select-none" style={{ touchAction: "none" }}>
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={DIM_COLOR} strokeWidth="0.3" opacity="0.3" />
        </pattern>
      </defs>
      <rect width={VW} height={VH} fill="url(#grid)" />

      {/* Piece */}
      <rect x={px} y={py} width={pw} height={ph} rx={3}
        fill={PIECE_FILL} opacity="0.15" stroke={PIECE_COLOR} strokeWidth="1.5" />
      <text x={px + pw / 2} y={py + ph / 2} textAnchor="middle" fontSize="12" fill={DIM_COLOR} opacity="0.4"
        dominantBaseline="middle">PEÇA</text>

      {/* Corner highlight */}
      <rect x={isLeft ? px : px + pw - 80} y={isFront ? py + ph - 60 : py}
        width={80} height={60} rx={2} fill={PROBE_X} opacity="0.06" stroke={PROBE_X} strokeWidth="1" strokeDasharray="4 3" />

      {/* Safe Z */}
      <InlineValue x={px + pw / 2} y={py - 12} value={safeZ} unit="mm" color={Z_COLOR}
        onChange={onSafeZChange} fontSize={10} label="Altura segura Z" />

      {/* ── STEP 0: Main touch ── */}
      {showMain && (
        <g>
          {/* Probe X arrow */}
          <AnimatedProbeArrow x1={probeXStart} y1={cornerY - 20} x2={probeXEnd} y2={cornerY - 20} color={PROBE_X} delay={0} />
          <line x1={probeXStart} y1={cornerY - 20} x2={probeXEnd} y2={cornerY - 20}
            stroke={PROBE_X} strokeWidth="2.5" opacity="0.8" markerEnd="url(#arrowInt1)" />

          {/* Toque X — distance from arrow start to material edge */}
          <InlineValue x={(probeXStart + probeXEnd) / 2} y={cornerY - 36} value={probeDepth} unit="mm" color={PROBE_X}
            onChange={onProbeDepthChange} fontSize={10} label="Toque X" />

          {/* Dimension line: probe start to corner X */}
          <DimLine x1={probeXStart} y1={cornerY - 50} x2={cornerX} y2={cornerY - 50} label="" color={PROBE_X} />
          <InlineValue x={(probeXStart + cornerX) / 2} y={cornerY - 54} value={Math.abs(probeGap)} unit="mm" color={PROBE_X}
            fontSize={9} label="Dist. X → quina" />

          {/* Probe Y arrow */}
          <AnimatedProbeArrow x1={cornerX + (isLeft ? 20 : -20)} y1={probeYStart} x2={cornerX + (isLeft ? 20 : -20)} y2={probeYEnd} color={PROBE_Y} delay={0.5} />
          <line x1={cornerX + (isLeft ? 20 : -20)} y1={probeYStart} x2={cornerX + (isLeft ? 20 : -20)} y2={probeYEnd}
            stroke={PROBE_Y} strokeWidth="2.5" opacity="0.8" markerEnd="url(#arrowInt2)" />

          {/* Toque Y — distance from arrow start to material edge */}
          <InlineValue x={cornerX + (isLeft ? 50 : -50)} y={(probeYStart + probeYEnd) / 2 - 6} value={probeDepth} unit="mm" color={PROBE_Y}
            onChange={onProbeDepthChange} fontSize={10} label="Toque Y" />

          {/* Dimension line: probe start to corner Y */}
          <DimLine x1={cornerX + (isLeft ? 44 : -44)} y1={probeYStart} x2={cornerX + (isLeft ? 44 : -44)} y2={cornerY} label="" color={PROBE_Y} />
          <InlineValue x={cornerX + (isLeft ? 76 : -76)} y={(probeYStart + cornerY) / 2} value={Math.abs(probeGap)} unit="mm" color={PROBE_Y}
            fontSize={9} label="Dist. Y → quina" />
        </g>
      )}

      {/* ── STEP 1: Refinement ── */}
      {showRefine && (
        <g>
          {/* Refinement X */}
          <line x1={cornerX + (isLeft ? -(refinementDistance * 2 + 8) : (refinementDistance * 2 + 8))} y1={cornerY - 10}
            x2={cornerX} y2={cornerY - 10}
            stroke={REFINE_COLOR} strokeWidth="3" markerEnd="url(#arrowInt3)" />
          <AnimatedProbeArrow
            x1={cornerX + (isLeft ? -(refinementDistance * 2 + 8) : (refinementDistance * 2 + 8))}
            y1={cornerY - 10} x2={cornerX} y2={cornerY - 10} color={REFINE_COLOR} delay={0} />
          <text x={cornerX + (isLeft ? -40 : 40)} y={cornerY - 22} textAnchor="middle"
            fontSize="9" fill={REFINE_COLOR} fontWeight="600">Conferência X</text>

          {/* Refinement Y */}
          <line x1={cornerX + (isLeft ? 10 : -10)} y1={cornerY + (isFront ? -(refinementDistance * 2 + 8) : (refinementDistance * 2 + 8))}
            x2={cornerX + (isLeft ? 10 : -10)} y2={cornerY}
            stroke={REFINE_COLOR} strokeWidth="3" markerEnd="url(#arrowInt3)" />
          <AnimatedProbeArrow
            x1={cornerX + (isLeft ? 10 : -10)}
            y1={cornerY + (isFront ? -(refinementDistance * 2 + 8) : (refinementDistance * 2 + 8))}
            x2={cornerX + (isLeft ? 10 : -10)} y2={cornerY} color={REFINE_COLOR} delay={0.5} />
          <text x={cornerX + (isLeft ? 34 : -34)} y={cornerY + (isFront ? -30 : 30)} textAnchor="middle"
            fontSize="9" fill={REFINE_COLOR} fontWeight="600">Conferência Y</text>
        </g>
      )}

      {/* ── STEP 2: Z probe ── */}
      {showZ && (
        <g>
          <line x1={zpX} y1={zpY - 30} x2={zpX} y2={zpY} stroke={Z_COLOR} strokeWidth="3" markerEnd="url(#arrowIntZ)" />
          <circle cx={zpX} cy={zpY} r={5} fill="none" stroke={Z_COLOR} strokeWidth="2" strokeDasharray="3 2" />
          <InlineValue x={zpX + (isLeft ? 40 : -40)} y={zpY} value={zCornerInset} unit="mm" color={Z_COLOR}
            onChange={onZCornerInsetChange} fontSize={10} label="Recuo" />
          <text x={zpX} y={zpY - 36} textAnchor="middle" fontSize="9" fill={Z_COLOR} fontWeight="600">Probe Z</text>
          <AnimatedProbeArrow x1={zpX} y1={zpY - 30} x2={zpX} y2={zpY} color={Z_COLOR} delay={0} />
        </g>
      )}

      {/* Corner point — always visible */}
      <circle cx={cornerX} cy={cornerY} r={7} fill={PROBE_X} stroke="hsl(var(--background))" strokeWidth="2" />

      {/* Legend */}
      <g transform="translate(10, 370)">
        <rect width={VW - 20} height={26} rx={4} fill="hsl(var(--background))" opacity="0.8" stroke={DIM_COLOR} strokeWidth="0.5" />
        <circle cx={14} cy={13} r={4} fill={showMain ? PROBE_X : showRefine ? REFINE_COLOR : Z_COLOR} />
        <text x={24} y={16} fontSize="9" fill={LABEL_COLOR}>
          {showMain ? "1º toque — clique nos valores para editar" : showRefine ? "Conferência — toque de precisão" : "Probe Z — medição de altura"}
        </text>
        <text x={VW - 30} y={16} textAnchor="end" fontSize="8" fill={DIM_COLOR}>Arraste pontos para ajustar</text>
      </g>

      {/* Arrow defs */}
      <defs>
        <marker id="arrowInt1" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill={PROBE_X} /></marker>
        <marker id="arrowInt2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill={PROBE_Y} /></marker>
        <marker id="arrowInt3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill={REFINE_COLOR} /></marker>
        <marker id="arrowIntZ" markerWidth="8" markerHeight="8" refX="4" refY="7" orient="auto"><path d="M0,0 L4,8 L8,0" fill={Z_COLOR} /></marker>
      </defs>
    </svg>
  );
}

/* ════════════════════════════════════════════════ */
/* ── RECT CENTER DIAGRAM ── */
function RectCenterDiagram({
  approxSizeX, approxSizeY, safeZ, probeDepth, refinementEnabled, zProbeActive,
  onApproxSizeXChange, onApproxSizeYChange, onSafeZChange, onProbeDepthChange, svgRef, step,
}: SubDiagramProps) {
  const cx = VW / 2, cy = VH / 2 - 10;
  const scaleX = Math.min(1, 260 / approxSizeX);
  const scaleY = Math.min(1, 200 / approxSizeY);
  const scale = Math.min(scaleX, scaleY);
  const w = approxSizeX * scale;
  const h = approxSizeY * scale;
  const px = cx - w / 2, py = cy - h / 2;
  const probeGap = Math.max(30, Math.min(60, probeDepth * 2));

  const showMain = step === 0;
  const showZ = (step === 1 && !refinementEnabled && zProbeActive) || (step === 2 && zProbeActive);

  return (
    <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} className="w-full h-full select-none" style={{ touchAction: "none" }}>
      <defs>
        <pattern id="grid2" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={DIM_COLOR} strokeWidth="0.3" opacity="0.3" />
        </pattern>
      </defs>
      <rect width={VW} height={VH} fill="url(#grid2)" />

      <rect x={px} y={py} width={w} height={h} rx={3}
        fill={PIECE_FILL} opacity="0.15" stroke={PIECE_COLOR} strokeWidth="1.5" />
      <text x={cx} y={cy} textAnchor="middle" fontSize="12" fill={DIM_COLOR} opacity="0.4" dominantBaseline="middle">PEÇA</text>

      {/* Dimension lines */}
      <DimLine x1={px} y1={py + h + 20} x2={px + w} y2={py + h + 20} label="" />
      <InlineValue x={cx} y={py + h + 24} value={approxSizeX} unit="mm" color={PROBE_X} onChange={onApproxSizeXChange} fontSize={10} />
      <DimLine x1={px - 20} y1={py} x2={px - 20} y2={py + h} label="" />
      <InlineValue x={px - 20} y={cy} value={approxSizeY} unit="mm" color={PROBE_Y} onChange={onApproxSizeYChange} fontSize={10} />

      {showMain && (
        <g>
          {[
            { x1: px - probeGap, y1: cy, x2: px, y2: cy, color: PROBE_X, label: "Toque X-", delay: 0 },
            { x1: px + w + probeGap, y1: cy, x2: px + w, y2: cy, color: PROBE_X, label: "Toque X+", delay: 0.5 },
            { x1: cx, y1: py - probeGap, x2: cx, y2: py, color: PROBE_Y, label: "Toque Y-", delay: 1 },
            { x1: cx, y1: py + h + probeGap - 8, x2: cx, y2: py + h, color: PROBE_Y, label: "Toque Y+", delay: 1.5 },
          ].map((p, i) => (
            <g key={i}>
              <AnimatedProbeArrow x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} color={p.color} delay={p.delay} />
              <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={p.color} strokeWidth="2.5"
                opacity={0.8} markerEnd={`url(#arrowR${i})`} />
              <text x={p.x1 + (i < 2 ? 0 : (i === 2 ? 14 : 14))} y={p.y1 + (i >= 2 ? 0 : -8)}
                textAnchor="middle" fontSize="9" fill={p.color} fontWeight="600">{p.label}</text>
            </g>
          ))}
          {/* Probe depth input near first arrow */}
          <InlineValue x={px - probeGap - 4} y={cy - 20} value={probeDepth} unit="mm" color={PROBE_X}
            onChange={onProbeDepthChange} fontSize={9} label="Distância" />
        </g>
      )}

      {/* Center crosshair */}
      <circle cx={cx} cy={cy} r={8} fill="none" stroke={PROBE_X} strokeWidth="1.5" />
      <line x1={cx - 12} y1={cy} x2={cx + 12} y2={cy} stroke={PROBE_X} strokeWidth="1" />
      <line x1={cx} y1={cy - 12} x2={cx} y2={cy + 12} stroke={PROBE_X} strokeWidth="1" />

      {/* Safe Z */}
      <InlineValue x={cx} y={py - 50} value={safeZ} unit="mm" color={Z_COLOR} onChange={onSafeZChange} fontSize={10} label="Altura segura Z" />

      {showZ && (
        <g>
          <line x1={cx + 20} y1={cy - 30} x2={cx + 20} y2={cy} stroke={Z_COLOR} strokeWidth="3" markerEnd="url(#arrowRZ)" />
          <text x={cx + 36} y={cy - 14} fontSize="9" fill={Z_COLOR} fontWeight="600">Z</text>
          <AnimatedProbeArrow x1={cx + 20} y1={cy - 30} x2={cx + 20} y2={cy} color={Z_COLOR} delay={0} />
        </g>
      )}

      {/* Legend */}
      <g transform="translate(10, 370)">
        <rect width={VW - 20} height={26} rx={4} fill="hsl(var(--background))" opacity="0.8" stroke={DIM_COLOR} strokeWidth="0.5" />
        <circle cx={14} cy={13} r={4} fill={PROBE_X} />
        <text x={24} y={16} fontSize="9" fill={LABEL_COLOR}>Clique nos valores para editar</text>
        <text x={VW - 30} y={16} textAnchor="end" fontSize="8" fill={DIM_COLOR}>Arraste pontos para ajustar</text>
      </g>

      <defs>
        {[0, 1, 2, 3].map(i => (
          <marker key={i} id={`arrowR${i}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8" fill={i < 2 ? PROBE_X : PROBE_Y} />
          </marker>
        ))}
        <marker id="arrowRRef" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill={REFINE_COLOR} /></marker>
        <marker id="arrowRZ" markerWidth="8" markerHeight="8" refX="4" refY="7" orient="auto"><path d="M0,0 L4,8 L8,0" fill={Z_COLOR} /></marker>
      </defs>
    </svg>
  );
}

/* ════════════════════════════════════════════════ */
/* ── CIRCLE CENTER DIAGRAM ── */
function CircleCenterDiagram({
  approxDiameter, circlePoints, safeZ, probeDepth, refinementEnabled, zProbeActive,
  onApproxDiameterChange, onSafeZChange, onProbeDepthChange, svgRef, step,
}: SubDiagramProps) {
  const cx = VW / 2, cy = VH / 2 - 10;
  const r = Math.min(120, approxDiameter * 0.8);
  const rClose = r * 0.82;
  const pts = Array.from({ length: circlePoints }, (_, i) => {
    const a = (i / circlePoints) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, a };
  });

  const showMain = step === 0;
  const showZ = (step === 1 && !refinementEnabled && zProbeActive) || (step === 2 && zProbeActive);

  return (
    <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} className="w-full h-full select-none" style={{ touchAction: "none" }}>
      <defs>
        <pattern id="grid3" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={DIM_COLOR} strokeWidth="0.3" opacity="0.3" />
        </pattern>
      </defs>
      <rect width={VW} height={VH} fill="url(#grid3)" />

      <circle cx={cx} cy={cy} r={r} fill={PIECE_FILL} opacity="0.15" stroke={PIECE_COLOR} strokeWidth="1.5" />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="12" fill={DIM_COLOR} opacity="0.4">PEÇA</text>

      <DimLine x1={cx - r} y1={cy + r + 24} x2={cx + r} y2={cy + r + 24} label="" />
      <InlineValue x={cx} y={cy + r + 28} value={approxDiameter} unit="mm" color={PROBE_X} onChange={onApproxDiameterChange} fontSize={10} />
      <text x={cx} y={cy + r + 42} textAnchor="middle" fontSize="8" fill={DIM_COLOR} opacity="0.6">Ø Diâmetro</text>

      {showMain && pts.map((p, i) => {
        const a = (i / circlePoints) * Math.PI * 2 - Math.PI / 2;
        const startX = cx + Math.cos(a) * (r + 40);
        const startY = cy + Math.sin(a) * (r + 40);
        return (
          <g key={i}>
            <AnimatedProbeArrow x1={startX} y1={startY} x2={p.x} y2={p.y} color={PROBE_X} delay={i * 0.4} />
            <line x1={startX} y1={startY} x2={p.x} y2={p.y} stroke={PROBE_X} strokeWidth="2" opacity={0.7} />
            {refinementEnabled && (
              <line x1={cx + Math.cos(a) * (rClose + 12)} y1={cy + Math.sin(a) * (rClose + 12)}
                x2={p.x} y2={p.y} stroke={REFINE_COLOR} strokeWidth="2.5" />
            )}
            <circle cx={p.x} cy={p.y} r={5} fill={PROBE_X} stroke="hsl(var(--background))" strokeWidth="1.5" />
            <text x={startX + Math.cos(a) * 12} y={startY + Math.sin(a) * 12}
              textAnchor="middle" fontSize="8" fill={PROBE_X} fontWeight="600">P{i + 1}</text>
          </g>
        );
      })}

      <circle cx={cx} cy={cy} r={6} fill="none" stroke={PROBE_X} strokeWidth="1.5" />
      <line x1={cx - 10} y1={cy} x2={cx + 10} y2={cy} stroke={PROBE_X} strokeWidth="1" />
      <line x1={cx} y1={cy - 10} x2={cx} y2={cy + 10} stroke={PROBE_X} strokeWidth="1" />

      <InlineValue x={cx} y={cy - r - 30} value={safeZ} unit="mm" color={Z_COLOR} onChange={onSafeZChange} fontSize={10} label="Altura segura Z" />

      {showZ && (
        <g>
          <line x1={cx + 18} y1={cy - 26} x2={cx + 18} y2={cy} stroke={Z_COLOR} strokeWidth="3" markerEnd="url(#arrowCZ)" />
          <text x={cx + 32} y={cy - 12} fontSize="9" fill={Z_COLOR} fontWeight="600">Z</text>
        </g>
      )}

      <g transform="translate(10, 370)">
        <rect width={VW - 20} height={26} rx={4} fill="hsl(var(--background))" opacity="0.8" stroke={DIM_COLOR} strokeWidth="0.5" />
        <circle cx={14} cy={13} r={4} fill={PROBE_X} />
        <text x={24} y={16} fontSize="9" fill={LABEL_COLOR}>{circlePoints} pontos</text>
        <text x={VW - 30} y={16} textAnchor="end" fontSize="8" fill={DIM_COLOR}>Clique nos valores para editar</text>
      </g>

      <defs>
        <marker id="arrowCZ" markerWidth="8" markerHeight="8" refX="4" refY="7" orient="auto"><path d="M0,0 L4,8 L8,0" fill={Z_COLOR} /></marker>
      </defs>
    </svg>
  );
}

/* ════════════════════════════════════════════════ */
/* ── HOLE CENTER DIAGRAM ── */
function HoleCenterDiagram({
  approxDiameter, safeZ, probeDepth, refinementEnabled, zProbeActive, holeZStrategy, holeZSafetyMargin,
  onApproxDiameterChange, onSafeZChange, onHoleZSafetyMarginChange, onProbeDepthChange, svgRef, step,
}: SubDiagramProps) {
  const cx = VW / 2, cy = VH / 2 - 10;
  const r = Math.min(100, approxDiameter * 0.7);
  const zpX = cx + r + 30;

  const showMain = step === 0;
  const showZ = (step === 1 && !refinementEnabled && zProbeActive) || (step === 2 && zProbeActive);

  return (
    <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} className="w-full h-full select-none" style={{ touchAction: "none" }}>
      <defs>
        <pattern id="grid4" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={DIM_COLOR} strokeWidth="0.3" opacity="0.3" />
        </pattern>
      </defs>
      <rect width={VW} height={VH} fill="url(#grid4)" />

      <rect x={cx - r - 60} y={cy - r - 40} width={(r + 60) * 2} height={(r + 40) * 2} rx={3}
        fill={PIECE_FILL} opacity="0.1" stroke={PIECE_COLOR} strokeWidth="1.5" />
      <text x={cx - r - 40} y={cy - r - 20} fontSize="9" fill={DIM_COLOR} opacity="0.4">MATERIAL</text>

      <circle cx={cx} cy={cy} r={r} fill="hsl(var(--background))" stroke={PIECE_COLOR} strokeWidth="2" />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fill={DIM_COLOR} opacity="0.5">FURO</text>

      <DimLine x1={cx - r} y1={cy + r + 20} x2={cx + r} y2={cy + r + 20} label="" />
      <InlineValue x={cx} y={cy + r + 24} value={approxDiameter} unit="mm" color={PROBE_X} onChange={onApproxDiameterChange} fontSize={10} />

      {showMain && (
        <g>
          {[
            { x2: cx + r - 4, y2: cy, label: "X+", delay: 0 },
            { x2: cx - r + 4, y2: cy, label: "X-", delay: 0.5 },
            { x2: cx, y2: cy + r - 4, label: "Y+", delay: 1 },
            { x2: cx, y2: cy - r + 4, label: "Y-", delay: 1.5 },
          ].map((p, i) => (
            <g key={i}>
              <AnimatedProbeArrow x1={cx} y1={cy} x2={p.x2} y2={p.y2} color={i < 2 ? PROBE_X : PROBE_Y} delay={p.delay} />
              <line x1={cx} y1={cy} x2={p.x2} y2={p.y2} stroke={i < 2 ? PROBE_X : PROBE_Y}
                strokeWidth="2" opacity={0.7} markerEnd={`url(#arrowH${i})`} />
              <text x={p.x2 + (p.x2 > cx ? 12 : p.x2 < cx ? -12 : 0)} y={p.y2 + (p.y2 > cy ? 14 : p.y2 < cy ? -8 : 0)}
                textAnchor="middle" fontSize="8" fill={i < 2 ? PROBE_X : PROBE_Y} fontWeight="600">{p.label}</text>
            </g>
          ))}
        </g>
      )}

      <circle cx={cx} cy={cy} r={5} fill={PROBE_X} stroke="hsl(var(--background))" strokeWidth="1.5" />

      {showZ && holeZStrategy !== "none" && (
        <g>
          <line x1={cx + r} y1={cy} x2={zpX} y2={cy} stroke={Z_COLOR} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
          <line x1={zpX} y1={cy - 30} x2={zpX} y2={cy} stroke={Z_COLOR} strokeWidth="3" markerEnd="url(#arrowHZI)" />
          <circle cx={zpX} cy={cy} r={6} fill="none" stroke={Z_COLOR} strokeWidth="2" strokeDasharray="3 2" />
          <text x={zpX} y={cy - 36} textAnchor="middle" fontSize="9" fill={Z_COLOR} fontWeight="600">Z seguro</text>
          <AnimatedProbeArrow x1={zpX} y1={cy - 30} x2={zpX} y2={cy} color={Z_COLOR} delay={0} />

          <line x1={cx - 6} y1={cy - 14} x2={cx + 6} y2={cy - 8} stroke="hsl(var(--destructive))" strokeWidth="2" opacity="0.6" />
          <line x1={cx + 6} y1={cy - 14} x2={cx - 6} y2={cy - 8} stroke="hsl(var(--destructive))" strokeWidth="2" opacity="0.6" />
          <text x={cx} y={cy - 18} textAnchor="middle" fontSize="7" fill="hsl(var(--destructive))" opacity="0.6">Sem Z aqui</text>

          {holeZStrategy === "auto-safe" && (
            <InlineValue x={zpX} y={cy + 20} value={holeZSafetyMargin} unit="mm" color={Z_COLOR}
              onChange={onHoleZSafetyMarginChange} fontSize={9} />
          )}
        </g>
      )}

      <InlineValue x={cx} y={cy - r - 50} value={safeZ} unit="mm" color={Z_COLOR} onChange={onSafeZChange} fontSize={10} label="Altura segura Z" />

      <g transform="translate(10, 370)">
        <rect width={VW - 20} height={26} rx={4} fill="hsl(var(--background))" opacity="0.8" stroke={DIM_COLOR} strokeWidth="0.5" />
        <circle cx={14} cy={13} r={4} fill={PROBE_X} />
        <text x={24} y={16} fontSize="9" fill={LABEL_COLOR}>Toque interno</text>
        <text x={VW - 30} y={16} textAnchor="end" fontSize="8" fill={DIM_COLOR}>Clique nos valores para editar</text>
      </g>

      <defs>
        {[0, 1, 2, 3].map(i => (
          <marker key={i} id={`arrowH${i}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7" fill={i < 2 ? PROBE_X : PROBE_Y} />
          </marker>
        ))}
        <marker id="arrowHZI" markerWidth="8" markerHeight="8" refX="4" refY="7" orient="auto"><path d="M0,0 L4,8 L8,0" fill={Z_COLOR} /></marker>
      </defs>
    </svg>
  );
}
