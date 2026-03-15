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
const VW = 560;
const VH = 380;
const PIECE_STROKE = "hsl(var(--muted-foreground))";
const PIECE_FILL = "hsl(var(--muted))";
const PROBE_X = "hsl(var(--primary))";
const PROBE_Y = "hsl(var(--chart-4))";
const REFINE_CLR = "hsl(var(--chart-2))";
const Z_CLR = "hsl(var(--chart-5))";
const CUSTOM_CLR = "hsl(var(--chart-3))";
const DIM_CLR = "hsl(var(--muted-foreground))";
const BG = "hsl(var(--background))";
const SHADOW = "hsl(var(--muted-foreground))";

/* ══════════════════════════════════════════════════ */
/* ── SVG Helper Components ── */

function AnimProbe({ x1, y1, x2, y2, color, delay = 0 }: {
  x1: number; y1: number; x2: number; y2: number; color: string; delay?: number;
}) {
  const id = `ap${Math.round(x1)}${Math.round(y1)}${Math.round(x2)}${Math.round(y2)}`.replace(/[.-]/g, "_");
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2" opacity="0.2" strokeDasharray="4 3" />
      <circle r="5" fill={color} opacity="0.85">
        <animateMotion dur="2s" repeatCount="indefinite" begin={`${delay}s`}>
          <mpath xlinkHref={`#${id}`} />
        </animateMotion>
      </circle>
      <circle r="10" fill={color} opacity="0.15">
        <animateMotion dur="2s" repeatCount="indefinite" begin={`${delay}s`}>
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
  const tickLen = 5;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1" strokeDasharray="3 2" opacity="0.4" />
      {isV ? (
        <>
          <line x1={x1 - tickLen} y1={y1} x2={x1 + tickLen} y2={y1} stroke={color} strokeWidth="1" opacity="0.4" />
          <line x1={x2 - tickLen} y1={y2} x2={x2 + tickLen} y2={y2} stroke={color} strokeWidth="1" opacity="0.4" />
        </>
      ) : (
        <>
          <line x1={x1} y1={y1 - tickLen} x2={x1} y2={y1 + tickLen} stroke={color} strokeWidth="1" opacity="0.4" />
          <line x1={x2} y1={y2 - tickLen} x2={x2} y2={y2 + tickLen} stroke={color} strokeWidth="1" opacity="0.4" />
        </>
      )}
      {label && (
        <text x={isV ? mx + 14 : mx} y={isV ? my : my - 6}
          textAnchor="middle" fontSize="10" fill={color} fontWeight="600">{label}</text>
      )}
    </g>
  );
}

/* ── Solid piece with 3D isometric effect ── */
function SolidPiece({ x, y, w, h, label }: { x: number; y: number; w: number; h: number; label?: string }) {
  const d = 14;
  return (
    <g>
      {/* drop shadow */}
      <rect x={x + 5} y={y + 5} width={w} height={h} rx={5} fill={SHADOW} opacity="0.06" />
      {/* right face (3D) */}
      <path d={`M${x + w},${y + 5} l${d},${-d} l0,${h} l${-d},${d} Z`}
        fill={PIECE_FILL} opacity="0.15" stroke={PIECE_STROKE} strokeWidth="0.8" />
      {/* top face (3D) */}
      <path d={`M${x + 5},${y} l${d},${-d} l${w},0 l${-d},${d} Z`}
        fill={PIECE_FILL} opacity="0.22" stroke={PIECE_STROKE} strokeWidth="0.8" />
      {/* front face */}
      <rect x={x} y={y} width={w} height={h} rx={5}
        fill={PIECE_FILL} opacity="0.2" stroke={PIECE_STROKE} strokeWidth="1.8" />
      {/* subtle surface lines */}
      <line x1={x + 15} y1={y + 8} x2={x + w - 15} y2={y + 8} stroke={PIECE_STROKE} strokeWidth="0.3" opacity="0.15" />
      <line x1={x + 15} y1={y + h - 8} x2={x + w - 15} y2={y + h - 8} stroke={PIECE_STROKE} strokeWidth="0.3" opacity="0.15" />
      {label && (
        <text x={x + w / 2} y={y + h / 2 + 5} textAnchor="middle" fontSize="15" fill={DIM_CLR} opacity="0.2" fontWeight="800" letterSpacing="2">{label}</text>
      )}
    </g>
  );
}

function SpindleIcon({ x, y, color, label }: { x: number; y: number; color: string; label?: string }) {
  return (
    <g>
      {/* housing */}
      <rect x={x - 10} y={y - 45} width={20} height={34} rx={4} fill={color} opacity="0.12" stroke={color} strokeWidth="1.5" />
      {/* collet */}
      <path d={`M${x - 5},${y - 11} L${x - 2},${y} L${x + 2},${y} L${x + 5},${y - 11}`} fill={color} opacity="0.2" stroke={color} strokeWidth="1.2" />
      {/* tip */}
      <circle cx={x} cy={y + 2} r={3.5} fill={color} opacity="0.7" />
      {/* pulse ring */}
      <circle cx={x} cy={y + 2} r={8} fill="none" stroke={color} strokeWidth="1" opacity="0.3">
        <animate attributeName="r" values="6;12;6" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
      </circle>
      {label && <text x={x} y={y - 52} textAnchor="middle" fontSize="9" fill={color} fontWeight="700" letterSpacing="0.5">{label}</text>}
    </g>
  );
}

function InfoBadge({ x, y, text, color }: { x: number; y: number; text: string; color: string }) {
  const w = Math.max(56, text.length * 7 + 20);
  return (
    <g>
      <rect x={x - w / 2} y={y - 12} width={w} height={24} rx={8} fill={BG} opacity="0.95" stroke={color} strokeWidth="1.8" />
      <text x={x} y={y + 4} textAnchor="middle" fontSize="10" fill={color} fontWeight="700" fontFamily="monospace">{text}</text>
    </g>
  );
}

function Arrow({ x1, y1, x2, y2, color, width = 2.5 }: {
  x1: number; y1: number; x2: number; y2: number; color: string; width?: number;
}) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const hl = 10;
  const ha = 0.45;
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

function StepLabel({ text, color = DIM_CLR }: { text: string; color?: string }) {
  return (
    <text x={VW / 2} y={VH - 18} textAnchor="middle" fontSize="11" fill={color} fontWeight="600">
      {text}
    </text>
  );
}

/* ══════════════════════════════════════════════════════════ */
/* ── MAIN COMPONENT ── */
export default function InteractiveProbeDiagram(props: WizardDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  return (
    <div className="w-full h-full flex items-center justify-center p-2">
      <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} className="w-full h-full max-h-[460px] select-none">
        <defs>
          <pattern id="wizGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke={DIM_CLR} strokeWidth="0.15" opacity="0.15" />
          </pattern>
          <linearGradient id="pieceFillGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={PIECE_FILL} stopOpacity="0.3" />
            <stop offset="100%" stopColor={PIECE_FILL} stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <rect width={VW} height={VH} fill="url(#wizGrid)" rx="12" />

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

/* ══════════════════════════════════════════════════════════ */
/* STEP 0 — Mode selection */
function StepModeSelect({ mode }: WizardDiagramProps) {
  const cx = VW / 2, cy = VH / 2 - 10;
  return (
    <g>
      {mode === "corner" && (
        <>
          <SolidPiece x={cx - 110} y={cy - 65} w={220} h={130} label="PEÇA" />
          <circle cx={cx - 110} cy={cy + 65} r={9} fill={PROBE_X} stroke={BG} strokeWidth="2.5" />
          <circle cx={cx - 110} cy={cy + 65} r={16} fill="none" stroke={PROBE_X} strokeWidth="1" opacity="0.3">
            <animate attributeName="r" values="12;20;12" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
          </circle>
          <text x={cx - 110} y={cy + 88} textAnchor="middle" fontSize="10" fill={PROBE_X} fontWeight="700">Quina</text>
        </>
      )}
      {mode === "rect-center" && (
        <>
          <SolidPiece x={cx - 110} y={cy - 65} w={220} h={130} label="PEÇA" />
          <circle cx={cx} cy={cy} r={7} fill="none" stroke={PROBE_X} strokeWidth="2" />
          <line x1={cx - 16} y1={cy} x2={cx + 16} y2={cy} stroke={PROBE_X} strokeWidth="1.5" />
          <line x1={cx} y1={cy - 16} x2={cx} y2={cy + 16} stroke={PROBE_X} strokeWidth="1.5" />
          <text x={cx} y={cy + 88} textAnchor="middle" fontSize="10" fill={PROBE_X} fontWeight="700">Centro Retangular</text>
        </>
      )}
      {mode === "circle-center" && (
        <>
          <circle cx={cx} cy={cy} r={75} fill={PIECE_FILL} opacity="0.2" stroke={PIECE_STROKE} strokeWidth="1.8" />
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="15" fill={DIM_CLR} opacity="0.2" fontWeight="800">PEÇA</text>
          <circle cx={cx} cy={cy} r={7} fill="none" stroke={PROBE_X} strokeWidth="2" />
          <text x={cx} y={cy + 100} textAnchor="middle" fontSize="10" fill={PROBE_X} fontWeight="700">Centro Circular</text>
        </>
      )}
      {mode === "hole-center" && (
        <>
          <SolidPiece x={cx - 130} y={cy - 80} w={260} h={160} label="" />
          <circle cx={cx} cy={cy} r={55} fill={BG} stroke={PIECE_STROKE} strokeWidth="2.5" />
          <text x={cx} y={cy + 4} textAnchor="middle" fontSize="12" fill={DIM_CLR} opacity="0.4">FURO</text>
          <text x={cx} y={cy + 100} textAnchor="middle" fontSize="10" fill={PROBE_X} fontWeight="700">Centro de Furo</text>
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
    const px = 130, py = 60, pw = 290, ph = 210;
    const cornerX = isLeft ? px : px + pw;
    const probeGap = Math.max(45, Math.min(100, probeDepth * 2.5));
    const probeStart = isLeft ? cornerX - probeGap : cornerX + probeGap;
    const arrowY = py + ph - 45;

    return (
      <g>
        <SolidPiece x={px} y={py} w={pw} h={ph} label="PEÇA" />
        <Arrow x1={probeStart} y1={arrowY} x2={cornerX} y2={arrowY} color={PROBE_X} width={3} />
        <AnimProbe x1={probeStart} y1={arrowY} x2={cornerX} y2={arrowY} color={PROBE_X} />
        <InfoBadge x={(probeStart + cornerX) / 2} y={arrowY - 22} text={`${probeDepth} mm`} color={PROBE_X} />
        <SpindleIcon x={probeStart} y={arrowY - 12} color={PROBE_X} label="PROBE" />
        <circle cx={cornerX} cy={arrowY} r={7} fill={PROBE_X} stroke={BG} strokeWidth="2.5" />
        <StepLabel text="Primeiro toque lateral (Eixo X)" color={PROBE_X} />
      </g>
    );
  }

  if (mode === "rect-center") {
    const pw = Math.min(280, approxSizeX * 0.9);
    const ph = Math.min(190, approxSizeY * 0.9);
    const px = cx - pw / 2, py2 = cy - ph / 2;
    return (
      <g>
        <SolidPiece x={px} y={py2} w={pw} h={ph} label="PEÇA" />
        <Arrow x1={px - 55} y1={cy} x2={px} y2={cy} color={PROBE_X} width={3} />
        <AnimProbe x1={px - 55} y1={cy} x2={px} y2={cy} color={PROBE_X} />
        <Arrow x1={px + pw + 55} y1={cy} x2={px + pw} y2={cy} color={PROBE_X} width={3} />
        <AnimProbe x1={px + pw + 55} y1={cy} x2={px + pw} y2={cy} color={PROBE_X} delay={0.8} />
        <text x={px - 55} y={cy - 16} textAnchor="middle" fontSize="9" fill={PROBE_X} fontWeight="700">X−</text>
        <text x={px + pw + 55} y={cy - 16} textAnchor="middle" fontSize="9" fill={PROBE_X} fontWeight="700">X+</text>
        <InfoBadge x={cx} y={cy + ph / 2 + 32} text={`${approxSizeX} mm`} color={PROBE_X} />
        <DimLine x1={px} y1={cy + ph / 2 + 22} x2={px + pw} y2={cy + ph / 2 + 22} label="" color={PROBE_X} />
        <StepLabel text="Toques laterais no eixo X" color={PROBE_X} />
      </g>
    );
  }

  if (mode === "hole-center") {
    const r = Math.min(80, approxDiameter * 0.6);
    return (
      <g>
        <SolidPiece x={cx - r - 55} y={cy - r - 45} w={(r + 55) * 2} h={(r + 45) * 2} label="" />
        <circle cx={cx} cy={cy} r={r} fill={BG} stroke={PIECE_STROKE} strokeWidth="2.5" />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="10" fill={DIM_CLR} opacity="0.4">FURO</text>
        <Arrow x1={cx} y1={cy} x2={cx + r - 4} y2={cy} color={PROBE_X} width={2.5} />
        <Arrow x1={cx} y1={cy} x2={cx - r + 4} y2={cy} color={PROBE_X} width={2.5} />
        <AnimProbe x1={cx} y1={cy} x2={cx + r - 4} y2={cy} color={PROBE_X} />
        <AnimProbe x1={cx} y1={cy} x2={cx - r + 4} y2={cy} color={PROBE_X} delay={0.6} />
        <InfoBadge x={cx} y={cy + r + 30} text={`Ø ${approxDiameter} mm`} color={PROBE_X} />
        <StepLabel text="Toques no eixo X (furo)" color={PROBE_X} />
      </g>
    );
  }

  // circle-center
  const r2 = Math.min(90, approxDiameter * 0.7);
  return (
    <g>
      <circle cx={cx} cy={cy} r={r2} fill={PIECE_FILL} opacity="0.2" stroke={PIECE_STROKE} strokeWidth="1.8" />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="13" fill={DIM_CLR} opacity="0.2" fontWeight="700">PEÇA</text>
      <Arrow x1={cx - r2 - 45} y1={cy} x2={cx - r2} y2={cy} color={PROBE_X} width={2.5} />
      <AnimProbe x1={cx - r2 - 45} y1={cy} x2={cx - r2} y2={cy} color={PROBE_X} />
      <Arrow x1={cx + r2 + 45} y1={cy} x2={cx + r2} y2={cy} color={PROBE_X} width={2.5} />
      <AnimProbe x1={cx + r2 + 45} y1={cy} x2={cx + r2} y2={cy} color={PROBE_X} delay={0.5} />
      <InfoBadge x={cx} y={cy + r2 + 30} text={`Ø ${approxDiameter} mm`} color={PROBE_X} />
      <StepLabel text="Toques laterais no eixo X" color={PROBE_X} />
    </g>
  );
}

/* STEP 2 — Touch Y */
function StepTouchY({ mode, cornerQuadrant, probeDepth, approxSizeX, approxSizeY, approxDiameter }: WizardDiagramProps) {
  const cx = VW / 2, cy = VH / 2 - 10;

  if (mode === "corner") {
    const isFront = cornerQuadrant.includes("front");
    const isLeft = cornerQuadrant.includes("left");
    const px = 130, py = 60, pw = 290, ph = 210;
    const cornerX = isLeft ? px : px + pw;
    const cornerY = isFront ? py + ph : py;
    const probeGap = Math.max(45, Math.min(100, probeDepth * 2.5));
    const probeStart = isFront ? cornerY + probeGap : cornerY - probeGap;
    const arrowX = cornerX + (isLeft ? 35 : -35);

    return (
      <g>
        <SolidPiece x={px} y={py} w={pw} h={ph} label="PEÇA" />
        <Arrow x1={arrowX} y1={probeStart} x2={arrowX} y2={cornerY} color={PROBE_Y} width={3} />
        <AnimProbe x1={arrowX} y1={probeStart} x2={arrowX} y2={cornerY} color={PROBE_Y} />
        <InfoBadge x={arrowX + (isLeft ? 65 : -65)} y={(probeStart + cornerY) / 2} text={`${probeDepth} mm`} color={PROBE_Y} />
        <SpindleIcon x={arrowX} y={probeStart - 12} color={PROBE_Y} label="PROBE" />
        <circle cx={cornerX} cy={cornerY} r={7} fill={PROBE_Y} stroke={BG} strokeWidth="2.5" />
        <StepLabel text="Segundo toque frontal (Eixo Y)" color={PROBE_Y} />
      </g>
    );
  }

  if (mode === "rect-center") {
    const pw = Math.min(280, approxSizeX * 0.9);
    const ph = Math.min(190, approxSizeY * 0.9);
    const px = cx - pw / 2, py2 = cy - ph / 2;
    return (
      <g>
        <SolidPiece x={px} y={py2} w={pw} h={ph} label="PEÇA" />
        <Arrow x1={cx} y1={py2 - 55} x2={cx} y2={py2} color={PROBE_Y} width={3} />
        <AnimProbe x1={cx} y1={py2 - 55} x2={cx} y2={py2} color={PROBE_Y} />
        <Arrow x1={cx} y1={py2 + ph + 55} x2={cx} y2={py2 + ph} color={PROBE_Y} width={3} />
        <AnimProbe x1={cx} y1={py2 + ph + 55} x2={cx} y2={py2 + ph} color={PROBE_Y} delay={0.8} />
        <text x={cx + 16} y={py2 - 50} fontSize="9" fill={PROBE_Y} fontWeight="700">Y−</text>
        <text x={cx + 16} y={py2 + ph + 56} fontSize="9" fill={PROBE_Y} fontWeight="700">Y+</text>
        <DimLine x1={px - 25} y1={py2} x2={px - 25} y2={py2 + ph} label={`${approxSizeY}`} color={PROBE_Y} />
        <StepLabel text="Toques no eixo Y" color={PROBE_Y} />
      </g>
    );
  }

  if (mode === "hole-center") {
    const r = Math.min(80, approxDiameter * 0.6);
    return (
      <g>
        <SolidPiece x={cx - r - 55} y={cy - r - 45} w={(r + 55) * 2} h={(r + 45) * 2} label="" />
        <circle cx={cx} cy={cy} r={r} fill={BG} stroke={PIECE_STROKE} strokeWidth="2.5" />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="10" fill={DIM_CLR} opacity="0.4">FURO</text>
        <Arrow x1={cx} y1={cy} x2={cx} y2={cy + r - 4} color={PROBE_Y} width={2.5} />
        <Arrow x1={cx} y1={cy} x2={cx} y2={cy - r + 4} color={PROBE_Y} width={2.5} />
        <AnimProbe x1={cx} y1={cy} x2={cx} y2={cy + r - 4} color={PROBE_Y} />
        <AnimProbe x1={cx} y1={cy} x2={cx} y2={cy - r + 4} color={PROBE_Y} delay={0.6} />
        <StepLabel text="Toques no eixo Y (furo)" color={PROBE_Y} />
      </g>
    );
  }

  // circle-center
  const r2 = Math.min(90, approxDiameter * 0.7);
  return (
    <g>
      <circle cx={cx} cy={cy} r={r2} fill={PIECE_FILL} opacity="0.2" stroke={PIECE_STROKE} strokeWidth="1.8" />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="13" fill={DIM_CLR} opacity="0.2" fontWeight="700">PEÇA</text>
      <Arrow x1={cx} y1={cy - r2 - 45} x2={cx} y2={cy - r2} color={PROBE_Y} width={2.5} />
      <AnimProbe x1={cx} y1={cy - r2 - 45} x2={cx} y2={cy - r2} color={PROBE_Y} />
      <Arrow x1={cx} y1={cy + r2 + 45} x2={cx} y2={cy + r2} color={PROBE_Y} width={2.5} />
      <AnimProbe x1={cx} y1={cy + r2 + 45} x2={cx} y2={cy + r2} color={PROBE_Y} delay={0.6} />
      <StepLabel text="Toques no eixo Y" color={PROBE_Y} />
    </g>
  );
}

/* STEP 3 — Safe Z */
function StepSafeZ({ safeZ }: WizardDiagramProps) {
  const cx = VW / 2, cy = VH / 2 + 25;
  const pw = 260, ph = 45;
  const px = cx - pw / 2, py = cy;

  return (
    <g>
      {/* piece side view */}
      <rect x={px} y={py} width={pw} height={ph} rx={4} fill={PIECE_FILL} opacity="0.25" stroke={PIECE_STROKE} strokeWidth="1.8" />
      <text x={cx} y={py + ph / 2 + 5} textAnchor="middle" fontSize="12" fill={DIM_CLR} opacity="0.3" fontWeight="700">PEÇA (vista lateral)</text>

      {/* table */}
      <line x1={px - 35} y1={py + ph} x2={px + pw + 35} y2={py + ph} stroke={DIM_CLR} strokeWidth="2.5" opacity="0.2" />
      <text x={px + pw + 45} y={py + ph + 5} fontSize="8" fill={DIM_CLR} opacity="0.35">MESA</text>

      {/* spindle */}
      <SpindleIcon x={cx} y={py - 35} color={Z_CLR} label="SPINDLE" />

      {/* Z height dimension */}
      <DimLine x1={cx + 70} y1={py - 35} x2={cx + 70} y2={py} label="" color={Z_CLR} />
      <InfoBadge x={cx + 120} y={(py - 35 + py) / 2} text={`Z ${safeZ} mm`} color={Z_CLR} />

      {/* Arrow */}
      <Arrow x1={cx - 70} y1={py - 55} x2={cx - 70} y2={py - 2} color={Z_CLR} width={2.5} />
      <text x={cx - 70} y={py - 62} textAnchor="middle" fontSize="9" fill={Z_CLR} fontWeight="700">Altura segura</text>

      <StepLabel text="Defina a altura de movimentação segura acima da peça" color={Z_CLR} />
    </g>
  );
}

/* STEP 4 — Refinement */
function StepRefinement({ mode, cornerQuadrant, refinementEnabled, refinementDistance }: WizardDiagramProps) {
  const cx = VW / 2, cy = VH / 2 - 10;

  if (!refinementEnabled) {
    return (
      <g>
        <text x={cx} y={cy - 5} textAnchor="middle" fontSize="15" fill={DIM_CLR} opacity="0.4" fontWeight="700">
          Conferência desabilitada
        </text>
        <text x={cx} y={cy + 20} textAnchor="middle" fontSize="11" fill={DIM_CLR} opacity="0.3">
          Ative no painel lateral para segundo toque preciso
        </text>
      </g>
    );
  }

  if (mode === "corner") {
    const isLeft = cornerQuadrant.includes("left");
    const isFront = cornerQuadrant.includes("front");
    const px = 130, py = 60, pw = 290, ph = 210;
    const cornerX = isLeft ? px : px + pw;
    const cornerY = isFront ? py + ph : py;
    const refDist = Math.max(25, refinementDistance * 3);

    return (
      <g>
        <SolidPiece x={px} y={py} w={pw} h={ph} label="PEÇA" />
        {/* First touch (faded) */}
        <Arrow x1={cornerX + (isLeft ? -85 : 85)} y1={cornerY - 22} x2={cornerX} y2={cornerY - 22} color={PROBE_X} width={1.5} />
        <g opacity="0.25">
          <text x={cornerX + (isLeft ? -85 : 85)} y={cornerY - 34} textAnchor="middle" fontSize="8" fill={PROBE_X}>1º toque</text>
        </g>
        {/* Refinement X */}
        <Arrow x1={cornerX + (isLeft ? -refDist : refDist)} y1={cornerY - 8} x2={cornerX} y2={cornerY - 8} color={REFINE_CLR} width={3} />
        <AnimProbe x1={cornerX + (isLeft ? -refDist : refDist)} y1={cornerY - 8} x2={cornerX} y2={cornerY - 8} color={REFINE_CLR} />
        <InfoBadge x={cornerX + (isLeft ? -refDist / 2 : refDist / 2)} y={cornerY - 28} text={`${refinementDistance} mm`} color={REFINE_CLR} />
        <text x={cornerX + (isLeft ? -refDist / 2 : refDist / 2)} y={cornerY - 44} textAnchor="middle" fontSize="9" fill={REFINE_CLR} fontWeight="700">Conferência X</text>
        {/* Refinement Y */}
        <Arrow x1={cornerX + (isLeft ? 14 : -14)} y1={cornerY + (isFront ? -refDist : refDist)} x2={cornerX + (isLeft ? 14 : -14)} y2={cornerY} color={REFINE_CLR} width={3} />
        <AnimProbe x1={cornerX + (isLeft ? 14 : -14)} y1={cornerY + (isFront ? -refDist : refDist)} x2={cornerX + (isLeft ? 14 : -14)} y2={cornerY} color={REFINE_CLR} delay={0.5} />
        <text x={cornerX + (isLeft ? 45 : -45)} y={cornerY + (isFront ? -refDist / 2 : refDist / 2)} textAnchor="middle" fontSize="9" fill={REFINE_CLR} fontWeight="700">Conferência Y</text>
        <circle cx={cornerX} cy={cornerY} r={7} fill={REFINE_CLR} stroke={BG} strokeWidth="2.5" />
        <StepLabel text="Segundo toque mais perto — maior precisão" color={REFINE_CLR} />
      </g>
    );
  }

  return (
    <g>
      <SolidPiece x={cx - 110} y={cy - 65} w={220} h={130} label="PEÇA" />
      <Arrow x1={cx - 110 - 35} y1={cy} x2={cx - 110} y2={cy} color={REFINE_CLR} width={3} />
      <AnimProbe x1={cx - 110 - 35} y1={cy} x2={cx - 110} y2={cy} color={REFINE_CLR} />
      <InfoBadge x={cx - 110 - 35} y={cy - 20} text={`${refinementDistance} mm`} color={REFINE_CLR} />
      <StepLabel text="Conferência de precisão ativa" color={REFINE_CLR} />
    </g>
  );
}

/* STEP 5 — Probe Z */
function StepProbeZ({ mode, zProbeActive, zCornerInset, holeZStrategy, approxDiameter }: WizardDiagramProps) {
  const cx = VW / 2, cy = VH / 2 + 12;

  if (!zProbeActive) {
    return (
      <g>
        <text x={cx} y={cy - 5} textAnchor="middle" fontSize="15" fill={DIM_CLR} opacity="0.4" fontWeight="700">
          Probe Z desabilitado
        </text>
        <text x={cx} y={cy + 20} textAnchor="middle" fontSize="11" fill={DIM_CLR} opacity="0.3">
          Ative para medir a altura automaticamente
        </text>
      </g>
    );
  }

  const pw = 270, ph = 50;
  const px = cx - pw / 2, py = cy;

  if (mode === "hole-center" && holeZStrategy !== "none") {
    const r = Math.min(70, approxDiameter * 0.5);
    return (
      <g>
        <rect x={cx - r - 45} y={py} width={(r + 45) * 2} height={ph} rx={4} fill={PIECE_FILL} opacity="0.25" stroke={PIECE_STROKE} strokeWidth="1.8" />
        <rect x={cx - r} y={py} width={r * 2} height={ph} fill={BG} stroke={PIECE_STROKE} strokeWidth="1.2" />
        <text x={cx} y={py + ph / 2 + 4} textAnchor="middle" fontSize="9" fill={DIM_CLR} opacity="0.4">FURO</text>
        <SpindleIcon x={cx + r + 28} y={py - 22} color={Z_CLR} />
        <Arrow x1={cx + r + 28} y1={py - 12} x2={cx + r + 28} y2={py} color={Z_CLR} width={3} />
        <AnimProbe x1={cx + r + 28} y1={py - 35} x2={cx + r + 28} y2={py} color={Z_CLR} />
        <text x={cx + r + 28} y={py - 65} textAnchor="middle" fontSize="9" fill={Z_CLR} fontWeight="700">Z seguro</text>
        {/* X over center */}
        <line x1={cx - 7} y1={py - 7} x2={cx + 7} y2={py + 7} stroke="hsl(var(--destructive))" strokeWidth="2" opacity="0.5" />
        <line x1={cx + 7} y1={py - 7} x2={cx - 7} y2={py + 7} stroke="hsl(var(--destructive))" strokeWidth="2" opacity="0.5" />
        <text x={cx} y={py - 14} textAnchor="middle" fontSize="8" fill="hsl(var(--destructive))" opacity="0.6">Sem Z aqui</text>
        <StepLabel text="Probe Z na borda segura do furo" color={Z_CLR} />
      </g>
    );
  }

  return (
    <g>
      <rect x={px} y={py} width={pw} height={ph} rx={4} fill={PIECE_FILL} opacity="0.25" stroke={PIECE_STROKE} strokeWidth="1.8" />
      <text x={cx} y={py + ph / 2 + 4} textAnchor="middle" fontSize="12" fill={DIM_CLR} opacity="0.25" fontWeight="700">PEÇA</text>
      <line x1={px - 25} y1={py + ph} x2={px + pw + 25} y2={py + ph} stroke={DIM_CLR} strokeWidth="2.5" opacity="0.2" />
      {mode === "corner" ? (
        <>
          <SpindleIcon x={px + zCornerInset * 3 + 25} y={py - 22} color={Z_CLR} label="Probe Z" />
          <Arrow x1={px + zCornerInset * 3 + 25} y1={py - 12} x2={px + zCornerInset * 3 + 25} y2={py} color={Z_CLR} width={3} />
          <AnimProbe x1={px + zCornerInset * 3 + 25} y1={py - 35} x2={px + zCornerInset * 3 + 25} y2={py} color={Z_CLR} />
          <InfoBadge x={px + zCornerInset * 3 + 90} y={py - 35} text={`Recuo ${zCornerInset} mm`} color={Z_CLR} />
        </>
      ) : (
        <>
          <SpindleIcon x={cx} y={py - 22} color={Z_CLR} label="Probe Z" />
          <Arrow x1={cx} y1={py - 12} x2={cx} y2={py} color={Z_CLR} width={3} />
          <AnimProbe x1={cx} y1={py - 35} x2={cx} y2={py} color={Z_CLR} />
        </>
      )}
      <StepLabel text="Toque vertical para medir a altura da peça" color={Z_CLR} />
    </g>
  );
}

/* STEP 6 — Custom probe */
function StepCustomProbe({ customProbeOffsetX, customProbeOffsetY, customProbeOffsetZ }: WizardDiagramProps) {
  const cx = VW / 2;

  return (
    <g>
      {/* Spindle body */}
      <rect x={cx - 22} y={40} width={44} height={85} rx={7} fill={DIM_CLR} opacity="0.08" stroke={DIM_CLR} strokeWidth="1.5" />
      <text x={cx} y={72} textAnchor="middle" fontSize="9" fill={DIM_CLR} opacity="0.4" fontWeight="700">SPINDLE</text>
      <line x1={cx} y1={125} x2={cx} y2={150} stroke={DIM_CLR} strokeWidth="2.5" />
      <circle cx={cx} cy={153} r={4.5} fill={DIM_CLR} opacity="0.35" />
      <text x={cx} y={170} textAnchor="middle" fontSize="8" fill={DIM_CLR} opacity="0.45">Ferramenta</text>

      {/* Probe arm */}
      <line x1={cx + 22} y1={105} x2={cx + 75} y2={105} stroke={CUSTOM_CLR} strokeWidth="2.5" />
      <line x1={cx + 75} y1={105} x2={cx + 75} y2={150} stroke={CUSTOM_CLR} strokeWidth="2.5" />
      <circle cx={cx + 75} cy={153} r={4.5} fill={CUSTOM_CLR} />
      <text x={cx + 75} y={170} textAnchor="middle" fontSize="8" fill={CUSTOM_CLR} fontWeight="700">Probe</text>

      {/* Offset X */}
      <DimLine x1={cx} y1={190} x2={cx + 75} y2={190} label="" color={CUSTOM_CLR} />
      <InfoBadge x={cx + 37} y={205} text={`ΔX ${customProbeOffsetX}`} color={CUSTOM_CLR} />

      {/* Offset Y */}
      <DimLine x1={cx + 95} y1={153} x2={cx + 95} y2={153 + customProbeOffsetY * 2} label="" color={CUSTOM_CLR} />
      <InfoBadge x={cx + 140} y={153 + customProbeOffsetY} text={`ΔY ${customProbeOffsetY}`} color={CUSTOM_CLR} />

      {/* Offset Z */}
      <DimLine x1={cx - 35} y1={153} x2={cx - 35} y2={153 + customProbeOffsetZ * 2} label="" color={CUSTOM_CLR} />
      <InfoBadge x={cx - 80} y={153 + customProbeOffsetZ} text={`ΔZ ${customProbeOffsetZ}`} color={CUSTOM_CLR} />

      <StepLabel text="Offsets entre ferramenta e probe personalizado" color={CUSTOM_CLR} />
    </g>
  );
}

/* STEP 7 — Apply / workflow */
function StepApply(_props: WizardDiagramProps) {
  const cx = VW / 2;
  const bw = 180, bh = 44, gap = 20, startY = 45;

  const boxes = [
    { label: "1. Localizar peça", color: PROBE_X, y: startY },
    { label: "2. Definir origem", color: Z_CLR, y: startY + bh + gap },
    { label: "3. Probe Z (opcional)", color: REFINE_CLR, y: startY + (bh + gap) * 2 },
    { label: "4. Iniciar trabalho", color: CUSTOM_CLR, y: startY + (bh + gap) * 3 },
  ];

  return (
    <g>
      {boxes.map((b, i) => (
        <g key={b.label}>
          <rect x={cx - bw / 2} y={b.y} width={bw} height={bh} rx={10}
            fill={b.color} opacity="0.1" stroke={b.color} strokeWidth="1.8" />
          <text x={cx} y={b.y + bh / 2 + 5} textAnchor="middle" fontSize="11" fill={b.color} fontWeight="700">
            {b.label}
          </text>
          {i < boxes.length - 1 && (
            <Arrow x1={cx} y1={b.y + bh + 2} x2={cx} y2={b.y + bh + gap - 2} color={DIM_CLR} width={1.5} />
          )}
        </g>
      ))}
      <StepLabel text="Fluxo: localização → origem → usinagem" />
    </g>
  );
}
