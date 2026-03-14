import { useRef } from "react";
import type { LocationMode, HoleZStrategy } from "@/lib/center-corners-engine";

/* ── Types ── */
export interface WizardDiagramProps {
  wizardStep: number;
  mode: LocationMode;
  cornerQuadrant: string;
  approxSizeX: number;
  approxSizeY: number;
  approxDiameter: number;
  circlePoints: number;
  probeDepth: number;
  probeFeed: number;
  safeZ: number;
  refinementEnabled: boolean;
  refinementDistance: number;
  refinementFeed: number;
  zProbeActive: boolean;
  zCornerInset: number;
  holeZStrategy: HoleZStrategy;
  holeZSafetyMargin: number;
  customProbeOffsetX: number;
  customProbeOffsetY: number;
  customProbeOffsetZ: number;
}

/* ── Constants ── */
const VW = 520;
const VH = 360;
const PIECE_STROKE = "hsl(var(--muted-foreground))";
const PIECE_FILL_LIGHT = "hsl(var(--muted))";
const PROBE_X = "hsl(var(--primary))";
const PROBE_Y = "hsl(var(--chart-4))";
const REFINE_CLR = "hsl(var(--chart-2))";
const Z_CLR = "hsl(var(--chart-5))";
const CUSTOM_CLR = "hsl(var(--chart-3))";
const DIM_CLR = "hsl(var(--muted-foreground))";
const BG = "hsl(var(--background))";
const SHADOW = "hsl(var(--muted-foreground))";

/* ── Helpers ── */
function AnimProbe({ x1, y1, x2, y2, color, delay = 0 }: {
  x1: number; y1: number; x2: number; y2: number; color: string; delay?: number;
}) {
  const id = `ap${x1}${y1}${x2}${y2}`.replace(/[.-]/g, "_");
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2" opacity="0.25" />
      <circle r="4" fill={color} opacity="0.9">
        <animateMotion dur="2.5s" repeatCount="indefinite" begin={`${delay}s`}>
          <mpath xlinkHref={`#${id}`} />
        </animateMotion>
      </circle>
      <path id={id} d={`M${x1},${y1} L${x2},${y2}`} fill="none" />
    </g>
  );
}

function DimLine({ x1, y1, x2, y2, label, color = DIM_CLR }: {
  x1: number; y1: number; x2: number; y2: number; label: string; color?: string;
}) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const isV = Math.abs(x2 - x1) < 2;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="0.8" strokeDasharray="4 2" opacity="0.5" />
      {isV ? (
        <>
          <line x1={x1 - 4} y1={y1} x2={x1 + 4} y2={y1} stroke={color} strokeWidth="0.8" opacity="0.5" />
          <line x1={x2 - 4} y1={y2} x2={x2 + 4} y2={y2} stroke={color} strokeWidth="0.8" opacity="0.5" />
        </>
      ) : (
        <>
          <line x1={x1} y1={y1 - 4} x2={x1} y2={y1 + 4} stroke={color} strokeWidth="0.8" opacity="0.5" />
          <line x1={x2} y1={y2 - 4} x2={x2} y2={y2 + 4} stroke={color} strokeWidth="0.8" opacity="0.5" />
        </>
      )}
      {label && (
        <text x={isV ? mx + 10 : mx} y={isV ? my : my - 5}
          textAnchor="middle" fontSize="10" fill={color} fontWeight="600">{label}</text>
      )}
    </g>
  );
}

/* ── Solid piece block (iso look) ── */
function SolidPiece({ x, y, w, h, label }: { x: number; y: number; w: number; h: number; label?: string }) {
  const d = 12; // depth offset
  return (
    <g>
      {/* shadow */}
      <rect x={x + 4} y={y + 4} width={w} height={h} rx={4} fill={SHADOW} opacity="0.08" />
      {/* top face */}
      <rect x={x} y={y} width={w} height={h} rx={4} fill={PIECE_FILL_LIGHT} opacity="0.25" stroke={PIECE_STROKE} strokeWidth="1.5" />
      {/* right edge (3D feel) */}
      <path d={`M${x + w},${y + 4} l${d},${-d} l0,${h} l${-d},${d} Z`} fill={PIECE_FILL_LIGHT} opacity="0.12" stroke={PIECE_STROKE} strokeWidth="0.8" />
      {/* top edge (3D feel) */}
      <path d={`M${x + 4},${y} l${d},${-d} l${w},0 l${-d},${d} Z`} fill={PIECE_FILL_LIGHT} opacity="0.18" stroke={PIECE_STROKE} strokeWidth="0.8" />
      {label && (
        <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize="14" fill={DIM_CLR} opacity="0.3" fontWeight="700">{label}</text>
      )}
    </g>
  );
}

function SpindleIcon({ x, y, color, label }: { x: number; y: number; color: string; label?: string }) {
  return (
    <g>
      <rect x={x - 8} y={y - 40} width={16} height={30} rx={3} fill={color} opacity="0.15" stroke={color} strokeWidth="1.5" />
      <line x1={x} y1={y - 10} x2={x} y2={y} stroke={color} strokeWidth="2.5" />
      <circle cx={x} cy={y} r={3} fill={color} />
      {label && <text x={x} y={y - 46} textAnchor="middle" fontSize="9" fill={color} fontWeight="700">{label}</text>}
    </g>
  );
}

function Badge({ x, y, text, color }: { x: number; y: number; text: string; color: string }) {
  const w = Math.max(50, text.length * 7 + 16);
  return (
    <g>
      <rect x={x - w / 2} y={y - 10} width={w} height={20} rx={6} fill={BG} opacity="0.92" stroke={color} strokeWidth="1.5" />
      <text x={x} y={y + 4} textAnchor="middle" fontSize="10" fill={color} fontWeight="700" fontFamily="monospace">{text}</text>
    </g>
  );
}

function Arrow({ x1, y1, x2, y2, color, width = 2.5 }: {
  x1: number; y1: number; x2: number; y2: number; color: string; width?: number;
}) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const hl = 8;
  const ha = 0.5;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <line x1={x2} y1={y2}
        x2={x2 - hl * Math.cos(angle - ha)} y2={y2 - hl * Math.sin(angle - ha)}
        stroke={color} strokeWidth={width} strokeLinecap="round" />
      <line x1={x2} y1={y2}
        x2={x2 - hl * Math.cos(angle + ha)} y2={y2 - hl * Math.sin(angle + ha)}
        stroke={color} strokeWidth={width} strokeLinecap="round" />
    </g>
  );
}

/* ════════════════════════════════════════════════ */
/* ── MAIN COMPONENT ── */
export default function InteractiveProbeDiagram(props: WizardDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} className="w-full h-full max-h-[420px] select-none">
        <defs>
          <pattern id="wizGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke={DIM_CLR} strokeWidth="0.2" opacity="0.2" />
          </pattern>
        </defs>
        <rect width={VW} height={VH} fill="url(#wizGrid)" rx="8" />

        {props.wizardStep === 0 && <StepModeSelect {...props} />}
        {props.wizardStep === 1 && <StepTouchX {...props} />}
        {props.wizardStep === 2 && <StepTouchY {...props} />}
        {props.wizardStep === 3 && <StepSafeZ {...props} />}
        {props.wizardStep === 4 && <StepRefinement {...props} />}
        {props.wizardStep === 5 && <StepProbeZ {...props} />}
        {props.wizardStep === 6 && <StepCustomProbe {...props} />}
        {props.wizardStep === 7 && <StepApply {...props} />}
      </svg>
    </div>
  );
}

/* ════════════════════════════════════════════════ */
/* STEP 0 — Mode selection illustration */
function StepModeSelect({ mode }: WizardDiagramProps) {
  const cx = VW / 2, cy = VH / 2;
  return (
    <g>
      {mode === "corner" && (
        <>
          <SolidPiece x={cx - 100} y={cy - 60} w={200} h={120} label="PEÇA" />
          <circle cx={cx - 100} cy={cy + 60} r={8} fill={PROBE_X} stroke={BG} strokeWidth="2" />
          <text x={cx - 100} y={cy + 80} textAnchor="middle" fontSize="10" fill={PROBE_X} fontWeight="600">Quina</text>
        </>
      )}
      {mode === "rect-center" && (
        <>
          <SolidPiece x={cx - 100} y={cy - 60} w={200} h={120} label="PEÇA" />
          <circle cx={cx} cy={cy} r={6} fill="none" stroke={PROBE_X} strokeWidth="2" />
          <line x1={cx - 14} y1={cy} x2={cx + 14} y2={cy} stroke={PROBE_X} strokeWidth="1.5" />
          <line x1={cx} y1={cy - 14} x2={cx} y2={cy + 14} stroke={PROBE_X} strokeWidth="1.5" />
          <text x={cx} y={cy + 80} textAnchor="middle" fontSize="10" fill={PROBE_X} fontWeight="600">Centro Retangular</text>
        </>
      )}
      {mode === "circle-center" && (
        <>
          <circle cx={cx} cy={cy - 10} r={70} fill={PIECE_FILL_LIGHT} opacity="0.25" stroke={PIECE_STROKE} strokeWidth="1.5" />
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="14" fill={DIM_CLR} opacity="0.3" fontWeight="700">PEÇA</text>
          <circle cx={cx} cy={cy - 10} r={6} fill="none" stroke={PROBE_X} strokeWidth="2" />
          <text x={cx} y={cy + 80} textAnchor="middle" fontSize="10" fill={PROBE_X} fontWeight="600">Centro Circular</text>
        </>
      )}
      {mode === "hole-center" && (
        <>
          <SolidPiece x={cx - 120} y={cy - 80} w={240} h={150} label="" />
          <circle cx={cx} cy={cy - 10} r={50} fill={BG} stroke={PIECE_STROKE} strokeWidth="2" />
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="11" fill={DIM_CLR} opacity="0.5">FURO</text>
          <text x={cx} y={cy + 90} textAnchor="middle" fontSize="10" fill={PROBE_X} fontWeight="600">Centro de Furo</text>
        </>
      )}
    </g>
  );
}

/* STEP 1 — Touch X */
function StepTouchX({ mode, cornerQuadrant, probeDepth, approxSizeX, approxSizeY, approxDiameter }: WizardDiagramProps) {
  const cx = VW / 2, cy = VH / 2 - 10;

  if (mode === "corner") {
    const isLeft = cornerQuadrant.includes("left");
    const px = 120, py = 60, pw = 280, ph = 200;
    const cornerX = isLeft ? px : px + pw;
    const probeGap = Math.max(40, Math.min(90, probeDepth * 2.5));
    const probeStart = isLeft ? cornerX - probeGap : cornerX + probeGap;
    const arrowY = py + ph - 40;

    return (
      <g>
        <SolidPiece x={px} y={py} w={pw} h={ph} label="PEÇA" />
        <Arrow x1={probeStart} y1={arrowY} x2={cornerX} y2={arrowY} color={PROBE_X} width={3} />
        <AnimProbe x1={probeStart} y1={arrowY} x2={cornerX} y2={arrowY} color={PROBE_X} />
        <Badge x={(probeStart + cornerX) / 2} y={arrowY - 20} text={`${probeDepth} mm`} color={PROBE_X} />
        <SpindleIcon x={probeStart} y={arrowY - 10} color={PROBE_X} label="PROBE" />
        <circle cx={cornerX} cy={arrowY} r={6} fill={PROBE_X} stroke={BG} strokeWidth="2" />
        <text x={cx} y={VH - 20} textAnchor="middle" fontSize="11" fill={PROBE_X} fontWeight="600">
          Primeiro toque lateral (Eixo X)
        </text>
      </g>
    );
  }

  if (mode === "rect-center" || mode === "hole-center") {
    const r = mode === "hole-center" ? Math.min(80, approxDiameter * 0.6) : 0;
    const pw = mode === "rect-center" ? Math.min(260, approxSizeX * 0.9) : 0;
    const ph = mode === "rect-center" ? Math.min(180, approxSizeY * 0.9) : 0;

    if (mode === "rect-center") {
      const px = cx - pw / 2, py2 = cy - ph / 2;
      return (
        <g>
          <SolidPiece x={px} y={py2} w={pw} h={ph} label="PEÇA" />
          <Arrow x1={px - 50} y1={cy} x2={px} y2={cy} color={PROBE_X} width={3} />
          <AnimProbe x1={px - 50} y1={cy} x2={px} y2={cy} color={PROBE_X} />
          <Arrow x1={px + pw + 50} y1={cy} x2={px + pw} y2={cy} color={PROBE_X} delay={0.8} />
          <AnimProbe x1={px + pw + 50} y1={cy} x2={px + pw} y2={cy} color={PROBE_X} delay={0.8} />
          <text x={px - 50} y={cy - 14} textAnchor="middle" fontSize="9" fill={PROBE_X} fontWeight="600">X−</text>
          <text x={px + pw + 50} y={cy - 14} textAnchor="middle" fontSize="9" fill={PROBE_X} fontWeight="600">X+</text>
          <Badge x={cx} y={cy + ph / 2 + 30} text={`${approxSizeX} mm`} color={PROBE_X} />
          <DimLine x1={px} y1={cy + ph / 2 + 20} x2={px + pw} y2={cy + ph / 2 + 20} label="" color={PROBE_X} />
          <text x={cx} y={VH - 20} textAnchor="middle" fontSize="11" fill={PROBE_X} fontWeight="600">
            Toques laterais no eixo X
          </text>
        </g>
      );
    }

    // hole-center
    return (
      <g>
        <SolidPiece x={cx - r - 50} y={cy - r - 40} w={(r + 50) * 2} h={(r + 40) * 2} label="" />
        <circle cx={cx} cy={cy} r={r} fill={BG} stroke={PIECE_STROKE} strokeWidth="2" />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" fill={DIM_CLR} opacity="0.5">FURO</text>
        <Arrow x1={cx} y1={cy} x2={cx + r - 4} y2={cy} color={PROBE_X} width={2.5} />
        <Arrow x1={cx} y1={cy} x2={cx - r + 4} y2={cy} color={PROBE_X} width={2.5} />
        <AnimProbe x1={cx} y1={cy} x2={cx + r - 4} y2={cy} color={PROBE_X} />
        <AnimProbe x1={cx} y1={cy} x2={cx - r + 4} y2={cy} color={PROBE_X} delay={0.6} />
        <text x={cx + r + 14} y={cy + 4} fontSize="9" fill={PROBE_X} fontWeight="600">X+</text>
        <text x={cx - r - 14} y={cy + 4} fontSize="9" fill={PROBE_X} fontWeight="600" textAnchor="end">X−</text>
        <Badge x={cx} y={cy + r + 28} text={`Ø ${approxDiameter} mm`} color={PROBE_X} />
        <text x={cx} y={VH - 20} textAnchor="middle" fontSize="11" fill={PROBE_X} fontWeight="600">
          Toques no eixo X (furo)
        </text>
      </g>
    );
  }

  // circle-center
  return (
    <g>
      <circle cx={cx} cy={cy} r={Math.min(90, approxDiameter * 0.7)} fill={PIECE_FILL_LIGHT} opacity="0.25" stroke={PIECE_STROKE} strokeWidth="1.5" />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="12" fill={DIM_CLR} opacity="0.3" fontWeight="700">PEÇA</text>
      {(() => {
        const r2 = Math.min(90, approxDiameter * 0.7);
        return (
          <>
            <Arrow x1={cx - r2 - 40} y1={cy} x2={cx - r2} y2={cy} color={PROBE_X} width={2.5} />
            <AnimProbe x1={cx - r2 - 40} y1={cy} x2={cx - r2} y2={cy} color={PROBE_X} />
          <Arrow x1={cx + r2 + 40} y1={cy} x2={cx + r2} y2={cy} color={PROBE_X} width={2.5} />
            <AnimProbe x1={cx + r2 + 40} y1={cy} x2={cx + r2} y2={cy} color={PROBE_X} />
          </>
        );
      })()}
      <Badge x={cx} y={cy + Math.min(90, approxDiameter * 0.7) + 28} text={`Ø ${approxDiameter} mm`} color={PROBE_X} />
      <text x={cx} y={VH - 20} textAnchor="middle" fontSize="11" fill={PROBE_X} fontWeight="600">
        Toques laterais no eixo X
      </text>
    </g>
  );
}

/* STEP 2 — Touch Y */
function StepTouchY({ mode, cornerQuadrant, probeDepth, approxSizeX, approxSizeY, approxDiameter }: WizardDiagramProps) {
  const cx = VW / 2, cy = VH / 2 - 10;

  if (mode === "corner") {
    const isFront = cornerQuadrant.includes("front");
    const isLeft = cornerQuadrant.includes("left");
    const px = 120, py = 60, pw = 280, ph = 200;
    const cornerX = isLeft ? px : px + pw;
    const cornerY = isFront ? py + ph : py;
    const probeGap = Math.max(40, Math.min(90, probeDepth * 2.5));
    const probeStart = isFront ? cornerY + probeGap : cornerY - probeGap;
    const arrowX = cornerX + (isLeft ? 30 : -30);

    return (
      <g>
        <SolidPiece x={px} y={py} w={pw} h={ph} label="PEÇA" />
        <Arrow x1={arrowX} y1={probeStart} x2={arrowX} y2={cornerY} color={PROBE_Y} width={3} />
        <AnimProbe x1={arrowX} y1={probeStart} x2={arrowX} y2={cornerY} color={PROBE_Y} />
        <Badge x={arrowX + (isLeft ? 60 : -60)} y={(probeStart + cornerY) / 2} text={`${probeDepth} mm`} color={PROBE_Y} />
        <SpindleIcon x={arrowX} y={probeStart - 10} color={PROBE_Y} label="PROBE" />
        <circle cx={cornerX} cy={cornerY} r={6} fill={PROBE_Y} stroke={BG} strokeWidth="2" />
        <text x={cx} y={VH - 20} textAnchor="middle" fontSize="11" fill={PROBE_Y} fontWeight="600">
          Segundo toque frontal (Eixo Y)
        </text>
      </g>
    );
  }

  if (mode === "rect-center") {
    const pw = Math.min(260, approxSizeX * 0.9);
    const ph = Math.min(180, approxSizeY * 0.9);
    const px = cx - pw / 2, py2 = cy - ph / 2;
    return (
      <g>
        <SolidPiece x={px} y={py2} w={pw} h={ph} label="PEÇA" />
        <Arrow x1={cx} y1={py2 - 50} x2={cx} y2={py2} color={PROBE_Y} width={3} />
        <AnimProbe x1={cx} y1={py2 - 50} x2={cx} y2={py2} color={PROBE_Y} />
        <Arrow x1={cx} y1={py2 + ph + 50} x2={cx} y2={py2 + ph} color={PROBE_Y} width={3} />
        <AnimProbe x1={cx} y1={py2 + ph + 50} x2={cx} y2={py2 + ph} color={PROBE_Y} delay={0.8} />
        <text x={cx + 14} y={py2 - 50} fontSize="9" fill={PROBE_Y} fontWeight="600">Y−</text>
        <text x={cx + 14} y={py2 + ph + 54} fontSize="9" fill={PROBE_Y} fontWeight="600">Y+</text>
        <DimLine x1={px - 22} y1={py2} x2={px - 22} y2={py2 + ph} label={`${approxSizeY}`} color={PROBE_Y} />
        <text x={cx} y={VH - 20} textAnchor="middle" fontSize="11" fill={PROBE_Y} fontWeight="600">
          Toques no eixo Y
        </text>
      </g>
    );
  }

  if (mode === "hole-center") {
    const r = Math.min(80, approxDiameter * 0.6);
    return (
      <g>
        <SolidPiece x={cx - r - 50} y={cy - r - 40} w={(r + 50) * 2} h={(r + 40) * 2} label="" />
        <circle cx={cx} cy={cy} r={r} fill={BG} stroke={PIECE_STROKE} strokeWidth="2" />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" fill={DIM_CLR} opacity="0.5">FURO</text>
        <Arrow x1={cx} y1={cy} x2={cx} y2={cy + r - 4} color={PROBE_Y} width={2.5} />
        <Arrow x1={cx} y1={cy} x2={cx} y2={cy - r + 4} color={PROBE_Y} width={2.5} />
        <AnimProbe x1={cx} y1={cy} x2={cx} y2={cy + r - 4} color={PROBE_Y} />
        <AnimProbe x1={cx} y1={cy} x2={cx} y2={cy - r + 4} color={PROBE_Y} delay={0.6} />
        <text x={cx + 14} y={cy + r + 14} fontSize="9" fill={PROBE_Y} fontWeight="600">Y+</text>
        <text x={cx + 14} y={cy - r - 6} fontSize="9" fill={PROBE_Y} fontWeight="600">Y−</text>
        <text x={cx} y={VH - 20} textAnchor="middle" fontSize="11" fill={PROBE_Y} fontWeight="600">
          Toques no eixo Y (furo)
        </text>
      </g>
    );
  }

  // circle-center
  const r2 = Math.min(90, approxDiameter * 0.7);
  return (
    <g>
      <circle cx={cx} cy={cy} r={r2} fill={PIECE_FILL_LIGHT} opacity="0.25" stroke={PIECE_STROKE} strokeWidth="1.5" />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="12" fill={DIM_CLR} opacity="0.3" fontWeight="700">PEÇA</text>
      <Arrow x1={cx} y1={cy - r2 - 40} x2={cx} y2={cy - r2} color={PROBE_Y} width={2.5} />
      <AnimProbe x1={cx} y1={cy - r2 - 40} x2={cx} y2={cy - r2} color={PROBE_Y} />
      <Arrow x1={cx} y1={cy + r2 + 40} x2={cx} y2={cy + r2} color={PROBE_Y} width={2.5} />
      <AnimProbe x1={cx} y1={cy + r2 + 40} x2={cx} y2={cy + r2} color={PROBE_Y} delay={0.6} />
      <text x={cx} y={VH - 20} textAnchor="middle" fontSize="11" fill={PROBE_Y} fontWeight="600">
        Toques no eixo Y
      </text>
    </g>
  );
}

/* STEP 3 — Safe Z height */
function StepSafeZ({ mode, safeZ, approxSizeX, approxSizeY, approxDiameter }: WizardDiagramProps) {
  const cx = VW / 2, cy = VH / 2 + 20;
  const pw = 240, ph = 40; // side view piece
  const px = cx - pw / 2, py = cy;

  return (
    <g>
      {/* Side view of piece */}
      <rect x={px} y={py} width={pw} height={ph} rx={3} fill={PIECE_FILL_LIGHT} opacity="0.3" stroke={PIECE_STROKE} strokeWidth="1.5" />
      <text x={cx} y={py + ph / 2 + 4} textAnchor="middle" fontSize="12" fill={DIM_CLR} opacity="0.4" fontWeight="600">PEÇA (vista lateral)</text>

      {/* Table surface */}
      <line x1={px - 30} y1={py + ph} x2={px + pw + 30} y2={py + ph} stroke={DIM_CLR} strokeWidth="2" opacity="0.3" />
      <text x={px + pw + 40} y={py + ph + 4} fontSize="8" fill={DIM_CLR} opacity="0.4">MESA</text>

      {/* Spindle above */}
      <SpindleIcon x={cx} y={py - 30} color={Z_CLR} label="SPINDLE" />

      {/* Safe Z arrow */}
      <DimLine x1={cx + 60} y1={py - 30} x2={cx + 60} y2={py} label="" color={Z_CLR} />
      <Badge x={cx + 110} y={(py - 30 + py) / 2} text={`Z ${safeZ} mm`} color={Z_CLR} />

      {/* Arrow showing safe height */}
      <Arrow x1={cx - 60} y1={py - 50} x2={cx - 60} y2={py - 2} color={Z_CLR} width={2} />
      <text x={cx - 60} y={py - 56} textAnchor="middle" fontSize="9" fill={Z_CLR} fontWeight="600">Altura segura</text>

      <text x={cx} y={VH - 20} textAnchor="middle" fontSize="11" fill={Z_CLR} fontWeight="600">
        Defina a altura de movimentação segura acima da peça
      </text>
    </g>
  );
}

/* STEP 4 — Refinement */
function StepRefinement({ mode, cornerQuadrant, refinementEnabled, refinementDistance, approxSizeX, approxSizeY }: WizardDiagramProps) {
  const cx = VW / 2, cy = VH / 2 - 10;

  if (!refinementEnabled) {
    return (
      <g>
        <text x={cx} y={cy} textAnchor="middle" fontSize="14" fill={DIM_CLR} opacity="0.5" fontWeight="600">
          Conferência desabilitada
        </text>
        <text x={cx} y={cy + 22} textAnchor="middle" fontSize="10" fill={DIM_CLR} opacity="0.4">
          Ative para fazer um segundo toque mais preciso
        </text>
      </g>
    );
  }

  if (mode === "corner") {
    const isLeft = cornerQuadrant.includes("left");
    const isFront = cornerQuadrant.includes("front");
    const px = 120, py = 60, pw = 280, ph = 200;
    const cornerX = isLeft ? px : px + pw;
    const cornerY = isFront ? py + ph : py;
    const refDist = Math.max(20, refinementDistance * 3);

    return (
      <g>
        <SolidPiece x={px} y={py} w={pw} h={ph} label="PEÇA" />
        {/* First touch (faded) */}
        <Arrow x1={cornerX + (isLeft ? -80 : 80)} y1={cornerY - 20} x2={cornerX} y2={cornerY - 20} color={PROBE_X} width={1.5} />
        <g opacity="0.3">
          <text x={cornerX + (isLeft ? -80 : 80)} y={cornerY - 30} textAnchor="middle" fontSize="8" fill={PROBE_X}>1º toque</text>
        </g>
        {/* Refinement touch (bold, closer) */}
        <Arrow x1={cornerX + (isLeft ? -refDist : refDist)} y1={cornerY - 8} x2={cornerX} y2={cornerY - 8} color={REFINE_CLR} width={3} />
        <AnimProbe x1={cornerX + (isLeft ? -refDist : refDist)} y1={cornerY - 8} x2={cornerX} y2={cornerY - 8} color={REFINE_CLR} />
        <Badge x={cornerX + (isLeft ? -refDist / 2 : refDist / 2)} y={cornerY - 24} text={`${refinementDistance} mm`} color={REFINE_CLR} />
        <text x={cornerX + (isLeft ? -refDist / 2 : refDist / 2)} y={cornerY - 38} textAnchor="middle" fontSize="9" fill={REFINE_CLR} fontWeight="700">Conferência X</text>

        {/* Y refinement */}
        <Arrow x1={cornerX + (isLeft ? 12 : -12)} y1={cornerY + (isFront ? -refDist : refDist)} x2={cornerX + (isLeft ? 12 : -12)} y2={cornerY} color={REFINE_CLR} width={3} />
        <AnimProbe x1={cornerX + (isLeft ? 12 : -12)} y1={cornerY + (isFront ? -refDist : refDist)} x2={cornerX + (isLeft ? 12 : -12)} y2={cornerY} color={REFINE_CLR} delay={0.5} />
        <text x={cornerX + (isLeft ? 40 : -40)} y={cornerY + (isFront ? -refDist / 2 : refDist / 2)} textAnchor="middle" fontSize="9" fill={REFINE_CLR} fontWeight="700">Conferência Y</text>

        <circle cx={cornerX} cy={cornerY} r={6} fill={REFINE_CLR} stroke={BG} strokeWidth="2" />
        <text x={cx} y={VH - 20} textAnchor="middle" fontSize="11" fill={REFINE_CLR} fontWeight="600">
          Segundo toque mais perto da borda — maior precisão
        </text>
      </g>
    );
  }

  // Generic for other modes
  return (
    <g>
      <SolidPiece x={cx - 100} y={cy - 60} w={200} h={120} label="PEÇA" />
      <Arrow x1={cx - 100 - 30} y1={cy} x2={cx - 100} y2={cy} color={REFINE_CLR} width={3} />
      <AnimProbe x1={cx - 100 - 30} y1={cy} x2={cx - 100} y2={cy} color={REFINE_CLR} />
      <Badge x={cx - 100 - 30} y={cy - 18} text={`${refinementDistance} mm`} color={REFINE_CLR} />
      <text x={cx} y={VH - 20} textAnchor="middle" fontSize="11" fill={REFINE_CLR} fontWeight="600">
        Conferência de precisão ativa
      </text>
    </g>
  );
}

/* STEP 5 — Probe Z */
function StepProbeZ({ mode, zProbeActive, cornerQuadrant, zCornerInset, holeZStrategy, holeZSafetyMargin, approxDiameter }: WizardDiagramProps) {
  const cx = VW / 2, cy = VH / 2 + 10;

  if (!zProbeActive) {
    return (
      <g>
        <text x={cx} y={cy} textAnchor="middle" fontSize="14" fill={DIM_CLR} opacity="0.5" fontWeight="600">
          Probe Z desabilitado
        </text>
        <text x={cx} y={cy + 22} textAnchor="middle" fontSize="10" fill={DIM_CLR} opacity="0.4">
          Ative para medir a altura da peça automaticamente
        </text>
      </g>
    );
  }

  const pw = 260, ph = 50;
  const px = cx - pw / 2, py = cy;

  if (mode === "hole-center" && holeZStrategy !== "none") {
    const r = Math.min(70, approxDiameter * 0.5);
    return (
      <g>
        {/* Side view */}
        <rect x={cx - r - 40} y={py} width={(r + 40) * 2} height={ph} rx={3} fill={PIECE_FILL_LIGHT} opacity="0.3" stroke={PIECE_STROKE} strokeWidth="1.5" />
        {/* Hole cutout */}
        <rect x={cx - r} y={py} width={r * 2} height={ph} fill={BG} stroke={PIECE_STROKE} strokeWidth="1" />
        <text x={cx} y={py + ph / 2 + 4} textAnchor="middle" fontSize="9" fill={DIM_CLR} opacity="0.4">FURO</text>

        {/* Z probe at safe offset */}
        <SpindleIcon x={cx + r + 25} y={py - 20} color={Z_CLR} />
        <Arrow x1={cx + r + 25} y1={py - 10} x2={cx + r + 25} y2={py} color={Z_CLR} width={3} />
        <AnimProbe x1={cx + r + 25} y1={py - 30} x2={cx + r + 25} y2={py} color={Z_CLR} />
        <text x={cx + r + 25} y={py - 60} textAnchor="middle" fontSize="9" fill={Z_CLR} fontWeight="600">Z seguro</text>

        {/* X mark at center */}
        <line x1={cx - 6} y1={py - 6} x2={cx + 6} y2={py + 6} stroke="hsl(var(--destructive))" strokeWidth="2" opacity="0.6" />
        <line x1={cx + 6} y1={py - 6} x2={cx - 6} y2={py + 6} stroke="hsl(var(--destructive))" strokeWidth="2" opacity="0.6" />
        <text x={cx} y={py - 12} textAnchor="middle" fontSize="8" fill="hsl(var(--destructive))" opacity="0.7">Sem Z aqui</text>

        <text x={cx} y={VH - 20} textAnchor="middle" fontSize="11" fill={Z_CLR} fontWeight="600">
          Probe Z na borda segura do furo
        </text>
      </g>
    );
  }

  // Normal Z probe (corner, rect, circle)
  return (
    <g>
      <rect x={px} y={py} width={pw} height={ph} rx={3} fill={PIECE_FILL_LIGHT} opacity="0.3" stroke={PIECE_STROKE} strokeWidth="1.5" />
      <text x={cx} y={py + ph / 2 + 4} textAnchor="middle" fontSize="12" fill={DIM_CLR} opacity="0.3" fontWeight="600">PEÇA (vista lateral)</text>
      <line x1={px - 20} y1={py + ph} x2={px + pw + 20} y2={py + ph} stroke={DIM_CLR} strokeWidth="2" opacity="0.3" />

      {/* Probe descending */}
      {mode === "corner" ? (
        <>
          <SpindleIcon x={px + zCornerInset * 3 + 20} y={py - 20} color={Z_CLR} label="Probe Z" />
          <Arrow x1={px + zCornerInset * 3 + 20} y1={py - 10} x2={px + zCornerInset * 3 + 20} y2={py} color={Z_CLR} width={3} />
          <AnimProbe x1={px + zCornerInset * 3 + 20} y1={py - 30} x2={px + zCornerInset * 3 + 20} y2={py} color={Z_CLR} />
          <Badge x={px + zCornerInset * 3 + 80} y={py - 30} text={`Recuo ${zCornerInset} mm`} color={Z_CLR} />
        </>
      ) : (
        <>
          <SpindleIcon x={cx} y={py - 20} color={Z_CLR} label="Probe Z" />
          <Arrow x1={cx} y1={py - 10} x2={cx} y2={py} color={Z_CLR} width={3} />
          <AnimProbe x1={cx} y1={py - 30} x2={cx} y2={py} color={Z_CLR} />
        </>
      )}

      <text x={cx} y={VH - 20} textAnchor="middle" fontSize="11" fill={Z_CLR} fontWeight="600">
        Toque vertical para medir a altura da peça
      </text>
    </g>
  );
}

/* STEP 6 — Custom probe */
function StepCustomProbe({ customProbeOffsetX, customProbeOffsetY, customProbeOffsetZ }: WizardDiagramProps) {
  const cx = VW / 2, cy = VH / 2 - 10;

  return (
    <g>
      {/* Spindle body */}
      <rect x={cx - 20} y={40} width={40} height={80} rx={6} fill={DIM_CLR} opacity="0.1" stroke={DIM_CLR} strokeWidth="1.5" />
      <text x={cx} y={70} textAnchor="middle" fontSize="9" fill={DIM_CLR} opacity="0.5" fontWeight="600">SPINDLE</text>
      <line x1={cx} y1={120} x2={cx} y2={145} stroke={DIM_CLR} strokeWidth="2.5" />
      <circle cx={cx} cy={148} r={4} fill={DIM_CLR} opacity="0.4" />
      <text x={cx} y={165} textAnchor="middle" fontSize="8" fill={DIM_CLR} opacity="0.5">Ferramenta</text>

      {/* Probe arm */}
      <line x1={cx + 20} y1={100} x2={cx + 70} y2={100} stroke={CUSTOM_CLR} strokeWidth="2" />
      <line x1={cx + 70} y1={100} x2={cx + 70} y2={145} stroke={CUSTOM_CLR} strokeWidth="2" />
      <circle cx={cx + 70} cy={148} r={4} fill={CUSTOM_CLR} />
      <text x={cx + 70} y={165} textAnchor="middle" fontSize="8" fill={CUSTOM_CLR} fontWeight="600">Probe</text>

      {/* Offset X */}
      <DimLine x1={cx} y1={185} x2={cx + 70} y2={185} label="" color={CUSTOM_CLR} />
      <Badge x={cx + 35} y={195} text={`ΔX ${customProbeOffsetX}`} color={CUSTOM_CLR} />

      {/* Offset Y */}
      <DimLine x1={cx + 90} y1={148} x2={cx + 90} y2={148 + customProbeOffsetY * 2} label="" color={CUSTOM_CLR} />
      <Badge x={cx + 130} y={148 + customProbeOffsetY} text={`ΔY ${customProbeOffsetY}`} color={CUSTOM_CLR} />

      {/* Offset Z */}
      <DimLine x1={cx - 30} y1={148} x2={cx - 30} y2={148 + customProbeOffsetZ * 2} label="" color={CUSTOM_CLR} />
      <Badge x={cx - 70} y={148 + customProbeOffsetZ} text={`ΔZ ${customProbeOffsetZ}`} color={CUSTOM_CLR} />

      <text x={cx} y={VH - 20} textAnchor="middle" fontSize="11" fill={CUSTOM_CLR} fontWeight="600">
        Offsets entre a ferramenta e o probe personalizado
      </text>
    </g>
  );
}

/* STEP 7 — Apply / workflow */
function StepApply(_props: WizardDiagramProps) {
  const cx = VW / 2;

  return (
    <g>
      {/* Flow diagram */}
      <rect x={cx - 80} y={40} width={160} height={40} rx={8} fill={PROBE_X} opacity="0.15" stroke={PROBE_X} strokeWidth="1.5" />
      <text x={cx} y={64} textAnchor="middle" fontSize="11" fill={PROBE_X} fontWeight="700">1. Localizar peça</text>

      <Arrow x1={cx} y1={82} x2={cx} y2={105} color={DIM_CLR} width={1.5} />

      <rect x={cx - 80} y={108} width={160} height={40} rx={8} fill={Z_CLR} opacity="0.15" stroke={Z_CLR} strokeWidth="1.5" />
      <text x={cx} y={132} textAnchor="middle" fontSize="11" fill={Z_CLR} fontWeight="700">2. Definir origem</text>

      <Arrow x1={cx} y1={150} x2={cx} y2={173} color={DIM_CLR} width={1.5} />

      <rect x={cx - 80} y={176} width={160} height={40} rx={8} fill={REFINE_CLR} opacity="0.15" stroke={REFINE_CLR} strokeWidth="1.5" />
      <text x={cx} y={200} textAnchor="middle" fontSize="11" fill={REFINE_CLR} fontWeight="700">3. Iniciar trabalho</text>

      <text x={cx} y={VH - 20} textAnchor="middle" fontSize="11" fill={DIM_CLR} fontWeight="600">
        Fluxo completo: localização → origem → usinagem
      </text>
    </g>
  );
}
