import { useState, useRef, useCallback, useEffect } from "react";
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
  x, y, value, unit, color, onChange, fontSize = 11, anchor = "middle",
}: {
  x: number; y: number; value: number; unit: string; color: string;
  onChange?: (v: number) => void; fontSize?: number; anchor?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setText(String(value)); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  if (!editing) {
    return (
      <g
        className={onChange ? "cursor-pointer" : ""}
        onClick={() => onChange && setEditing(true)}
      >
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
          if (!isNaN(v) && onChange) onChange(Math.max(1, v));
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

/* ── Draggable probe dot ── */
function DraggableProbe({
  cx, cy, color, label, constraint, onDrag, svgRef,
}: {
  cx: number; cy: number; color: string; label: string;
  constraint: "x" | "y" | "both"; onDrag: (dx: number, dy: number) => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
}) {
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const toSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM()?.inverse();
    if (!ctm) return { x: 0, y: 0 };
    const svgPt = pt.matrixTransform(ctm);
    return { x: svgPt.x, y: svgPt.y };
  }, [svgRef]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    lastPos.current = toSvg(e.clientX, e.clientY);
    (e.target as SVGElement).setPointerCapture(e.pointerId);
  }, [toSvg]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const cur = toSvg(e.clientX, e.clientY);
    const dx = constraint === "y" ? 0 : cur.x - lastPos.current.x;
    const dy = constraint === "x" ? 0 : cur.y - lastPos.current.y;
    lastPos.current = cur;
    onDrag(dx, dy);
  }, [toSvg, constraint, onDrag]);

  const onPointerUp = useCallback(() => { dragging.current = false; }, []);

  return (
    <g className="cursor-grab active:cursor-grabbing" style={{ touchAction: "none" }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      <circle cx={cx} cy={cy} r={10} fill={color} opacity="0.15" />
      <circle cx={cx} cy={cy} r={5} fill={color} stroke="hsl(var(--background))" strokeWidth="1.5" />
      <text x={cx} y={cy - 14} textAnchor="middle" fontSize="9" fill={color} fontWeight="600">{label}</text>
    </g>
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
  x1, y1, x2, y2, label, color = DIM_COLOR, offset = 0,
}: {
  x1: number; y1: number; x2: number; y2: number; label: string; color?: string; offset?: number;
}) {
  const mx = (x1 + x2) / 2 + offset;
  const my = (y1 + y2) / 2 + offset;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="0.7" strokeDasharray="4 2" opacity="0.5" />
      <line x1={x1} y1={y1 - 3} x2={x1} y2={y1 + 3} stroke={color} strokeWidth="0.7" opacity="0.5" />
      <line x1={x2} y1={y2 - 3} x2={x2} y2={y2 + 3} stroke={color} strokeWidth="0.7" opacity="0.5" />
      <text x={mx} y={my - 4} textAnchor="middle" fontSize="8" fill={color} opacity="0.7">{label}</text>
    </g>
  );
}

/* ──── MAIN COMPONENT ──── */
export default function InteractiveProbeDiagram(props: DiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  switch (props.mode) {
    case "corner": return <CornerDiagram {...props} svgRef={svgRef} />;
    case "rect-center": return <RectCenterDiagram {...props} svgRef={svgRef} />;
    case "circle-center": return <CircleCenterDiagram {...props} svgRef={svgRef} />;
    case "hole-center": return <HoleCenterDiagram {...props} svgRef={svgRef} />;
  }
}

/* ════════════════════════════════════════════════ */
/* ── CORNER DIAGRAM ── */
function CornerDiagram({
  cornerQuadrant, safeZ, refinementEnabled, refinementDistance, zProbeActive, zCornerInset,
  onSafeZChange, onZCornerInsetChange, svgRef,
}: DiagramProps & { svgRef: React.RefObject<SVGSVGElement | null> }) {
  const isLeft = cornerQuadrant.includes("left");
  const isFront = cornerQuadrant.includes("front");

  // Piece occupies center area
  const px = 100, py = 60, pw = 300, ph = 240;
  const cornerX = isLeft ? px : px + pw;
  const cornerY = isFront ? py + ph : py;

  // Probe approach positions
  const probeXStart = isLeft ? px - 60 : px + pw + 60;
  const probeXEnd = cornerX;
  const probeYStart = isFront ? py + ph + 60 : py - 60;
  const probeYEnd = cornerY;

  // Z probe inset
  const zpX = cornerX + (isLeft ? 1 : -1) * zCornerInset * 2;
  const zpY = cornerY + (isFront ? -1 : 1) * zCornerInset * 2;

  return (
    <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} className="w-full h-full select-none" style={{ touchAction: "none" }}>
      {/* Grid */}
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

      {/* Probe X arrow with animation */}
      <AnimatedProbeArrow x1={probeXStart} y1={cornerY - 20} x2={probeXEnd} y2={cornerY - 20} color={PROBE_X} delay={0} />
      <line x1={probeXStart} y1={cornerY - 20} x2={probeXEnd} y2={cornerY - 20}
        stroke={PROBE_X} strokeWidth="2.5" opacity={refinementEnabled ? 0.3 : 0.8}
        markerEnd="url(#arrowInt1)" />

      {/* Probe Y arrow with animation */}
      <AnimatedProbeArrow x1={cornerX + (isLeft ? 20 : -20)} y1={probeYStart} x2={cornerX + (isLeft ? 20 : -20)} y2={probeYEnd} color={PROBE_Y} delay={0.5} />
      <line x1={cornerX + (isLeft ? 20 : -20)} y1={probeYStart} x2={cornerX + (isLeft ? 20 : -20)} y2={probeYEnd}
        stroke={PROBE_Y} strokeWidth="2.5" opacity={refinementEnabled ? 0.3 : 0.8}
        markerEnd="url(#arrowInt2)" />

      {/* Refinement arrows */}
      {refinementEnabled && (
        <>
          <line x1={cornerX + (isLeft ? -(refinementDistance * 2 + 8) : (refinementDistance * 2 + 8))} y1={cornerY - 10}
            x2={cornerX} y2={cornerY - 10}
            stroke={REFINE_COLOR} strokeWidth="3" markerEnd="url(#arrowInt3)" />
          <line x1={cornerX + (isLeft ? 10 : -10)} y1={cornerY + (isFront ? -(refinementDistance * 2 + 8) : (refinementDistance * 2 + 8))}
            x2={cornerX + (isLeft ? 10 : -10)} y2={cornerY}
            stroke={REFINE_COLOR} strokeWidth="3" markerEnd="url(#arrowInt3)" />
        </>
      )}

      {/* Corner point */}
      <circle cx={cornerX} cy={cornerY} r={7} fill={PROBE_X} stroke="hsl(var(--background))" strokeWidth="2" />

      {/* Safe Z inline */}
      <InlineValue x={px + pw / 2} y={py - 12} value={safeZ} unit="mm" color={Z_COLOR}
        onChange={onSafeZChange} fontSize={10} />
      <text x={px + pw / 2} y={py - 24} textAnchor="middle" fontSize="8" fill={Z_COLOR} opacity="0.6">Altura segura Z</text>

      {/* Labels on probe arrows */}
      <text x={(probeXStart + probeXEnd) / 2} y={cornerY - 28} textAnchor="middle" fontSize="9"
        fill={PROBE_X} fontWeight="600">Toque X</text>
      <text x={cornerX + (isLeft ? 30 : -30)} y={(probeYStart + probeYEnd) / 2} textAnchor="middle" fontSize="9"
        fill={PROBE_Y} fontWeight="600" transform={`rotate(-90, ${cornerX + (isLeft ? 30 : -30)}, ${(probeYStart + probeYEnd) / 2})`}>
        Toque Y</text>

      {refinementEnabled && (
        <>
          <text x={cornerX + (isLeft ? -30 : 30)} y={cornerY - 16} textAnchor="middle" fontSize="8"
            fill={REFINE_COLOR} fontWeight="600">Conferência</text>
        </>
      )}

      {/* Z probe point */}
      {zProbeActive && (
        <g>
          <line x1={zpX} y1={zpY - 30} x2={zpX} y2={zpY} stroke={Z_COLOR} strokeWidth="3" markerEnd="url(#arrowIntZ)" />
          <circle cx={zpX} cy={zpY} r={5} fill="none" stroke={Z_COLOR} strokeWidth="2" strokeDasharray="3 2" />
          <InlineValue x={zpX + (isLeft ? 40 : -40)} y={zpY} value={zCornerInset} unit="mm" color={Z_COLOR}
            onChange={onZCornerInsetChange} fontSize={10} />
          <text x={zpX} y={zpY - 36} textAnchor="middle" fontSize="8" fill={Z_COLOR} fontWeight="600">Probe Z</text>
          <AnimatedProbeArrow x1={zpX} y1={zpY - 30} x2={zpX} y2={zpY} color={Z_COLOR} delay={1} />
        </g>
      )}

      {/* Legend */}
      <g transform="translate(10, 370)">
        <rect width={VW - 20} height={26} rx={4} fill="hsl(var(--background))" opacity="0.8" stroke={DIM_COLOR} strokeWidth="0.5" />
        <circle cx={14} cy={13} r={4} fill={PROBE_X} />
        <text x={24} y={16} fontSize="9" fill={LABEL_COLOR}>1º toque</text>
        {refinementEnabled && (
          <>
            <circle cx={90} cy={13} r={4} fill={REFINE_COLOR} />
            <text x={100} y={16} fontSize="9" fill={LABEL_COLOR}>Conferência</text>
          </>
        )}
        {zProbeActive && (
          <>
            <circle cx={refinementEnabled ? 185 : 90} cy={13} r={4} fill={Z_COLOR} />
            <text x={refinementEnabled ? 195 : 100} y={16} fontSize="9" fill={LABEL_COLOR}>Probe Z</text>
          </>
        )}
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
  approxSizeX, approxSizeY, safeZ, refinementEnabled, zProbeActive,
  onApproxSizeXChange, onApproxSizeYChange, onSafeZChange, svgRef,
}: DiagramProps & { svgRef: React.RefObject<SVGSVGElement | null> }) {
  const cx = VW / 2, cy = VH / 2 - 10;
  const scaleX = Math.min(1, 260 / approxSizeX);
  const scaleY = Math.min(1, 200 / approxSizeY);
  const scale = Math.min(scaleX, scaleY);
  const w = approxSizeX * scale;
  const h = approxSizeY * scale;
  const px = cx - w / 2, py = cy - h / 2;

  const probeGap = 40;

  return (
    <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} className="w-full h-full select-none" style={{ touchAction: "none" }}>
      <defs>
        <pattern id="grid2" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={DIM_COLOR} strokeWidth="0.3" opacity="0.3" />
        </pattern>
      </defs>
      <rect width={VW} height={VH} fill="url(#grid2)" />

      {/* Piece */}
      <rect x={px} y={py} width={w} height={h} rx={3}
        fill={PIECE_FILL} opacity="0.15" stroke={PIECE_COLOR} strokeWidth="1.5" />
      <text x={cx} y={cy} textAnchor="middle" fontSize="12" fill={DIM_COLOR} opacity="0.4" dominantBaseline="middle">PEÇA</text>

      {/* Dimension lines */}
      <DimLine x1={px} y1={py + h + 20} x2={px + w} y2={py + h + 20} label="" />
      <InlineValue x={cx} y={py + h + 24} value={approxSizeX} unit="mm" color={PROBE_X} onChange={onApproxSizeXChange} fontSize={10} />
      <DimLine x1={px - 20} y1={py} x2={px - 20} y2={py + h} label="" />
      <InlineValue x={px - 20} y={cy} value={approxSizeY} unit="mm" color={PROBE_Y} onChange={onApproxSizeYChange} fontSize={10} />

      {/* 4 probe arrows */}
      {[
        { x1: px - probeGap, y1: cy, x2: px, y2: cy, color: PROBE_X, label: "X-", delay: 0 },
        { x1: px + w + probeGap, y1: cy, x2: px + w, y2: cy, color: PROBE_X, label: "X+", delay: 0.5 },
        { x1: cx, y1: py - probeGap, x2: cx, y2: py, color: PROBE_Y, label: "Y-", delay: 1 },
        { x1: cx, y1: py + h + probeGap - 8, x2: cx, y2: py + h, color: PROBE_Y, label: "Y+", delay: 1.5 },
      ].map((p, i) => (
        <g key={i}>
          <AnimatedProbeArrow x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} color={p.color} delay={p.delay} />
          <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={p.color} strokeWidth="2.5"
            opacity={refinementEnabled ? 0.3 : 0.8} markerEnd={`url(#arrowR${i})`} />
          {/* Refinement */}
          {refinementEnabled && (
            <line x1={(p.x1 + p.x2) / 2 + (p.x2 - p.x1) * 0.3} y1={(p.y1 + p.y2) / 2 + (p.y2 - p.y1) * 0.3}
              x2={p.x2} y2={p.y2} stroke={REFINE_COLOR} strokeWidth="3" markerEnd={`url(#arrowRRef)`} />
          )}
          <text x={p.x1 + (p.label.includes("X") ? 0 : (i === 2 ? 12 : 12))} y={p.y1 + (p.label.includes("Y") ? 0 : -8)}
            textAnchor="middle" fontSize="9" fill={p.color} fontWeight="600">{`Toque ${p.label}`}</text>
        </g>
      ))}

      {/* Center crosshair */}
      <circle cx={cx} cy={cy} r={8} fill="none" stroke={PROBE_X} strokeWidth="1.5" />
      <line x1={cx - 12} y1={cy} x2={cx + 12} y2={cy} stroke={PROBE_X} strokeWidth="1" />
      <line x1={cx} y1={cy - 12} x2={cx} y2={cy + 12} stroke={PROBE_X} strokeWidth="1" />

      {/* Safe Z */}
      <InlineValue x={cx} y={py - 50} value={safeZ} unit="mm" color={Z_COLOR} onChange={onSafeZChange} fontSize={10} />
      <text x={cx} y={py - 62} textAnchor="middle" fontSize="8" fill={Z_COLOR} opacity="0.6">Altura segura Z</text>

      {/* Z probe at center */}
      {zProbeActive && (
        <g>
          <line x1={cx + 20} y1={cy - 30} x2={cx + 20} y2={cy} stroke={Z_COLOR} strokeWidth="3" markerEnd="url(#arrowRZ)" />
          <text x={cx + 36} y={cy - 14} fontSize="9" fill={Z_COLOR} fontWeight="600">Z</text>
          <AnimatedProbeArrow x1={cx + 20} y1={cy - 30} x2={cx + 20} y2={cy} color={Z_COLOR} delay={2} />
        </g>
      )}

      {/* Legend */}
      <g transform="translate(10, 370)">
        <rect width={VW - 20} height={26} rx={4} fill="hsl(var(--background))" opacity="0.8" stroke={DIM_COLOR} strokeWidth="0.5" />
        <circle cx={14} cy={13} r={4} fill={PROBE_X} />
        <text x={24} y={16} fontSize="9" fill={LABEL_COLOR}>Toque X</text>
        <circle cx={80} cy={13} r={4} fill={PROBE_Y} />
        <text x={90} y={16} fontSize="9" fill={LABEL_COLOR}>Toque Y</text>
        {refinementEnabled && (<><circle cx={150} cy={13} r={4} fill={REFINE_COLOR} /><text x={160} y={16} fontSize="9" fill={LABEL_COLOR}>Conferência</text></>)}
        {zProbeActive && (<><circle cx={refinementEnabled ? 240 : 150} cy={13} r={4} fill={Z_COLOR} /><text x={refinementEnabled ? 250 : 160} y={16} fontSize="9" fill={LABEL_COLOR}>Probe Z</text></>)}
        <text x={VW - 30} y={16} textAnchor="end" fontSize="8" fill={DIM_COLOR}>Clique nos valores para editar</text>
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
  approxDiameter, circlePoints, safeZ, refinementEnabled, zProbeActive,
  onApproxDiameterChange, onSafeZChange, svgRef,
}: DiagramProps & { svgRef: React.RefObject<SVGSVGElement | null> }) {
  const cx = VW / 2, cy = VH / 2 - 10;
  const r = Math.min(120, approxDiameter * 0.8);
  const rClose = r * 0.82;
  const pts = Array.from({ length: circlePoints }, (_, i) => {
    const a = (i / circlePoints) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, a };
  });

  return (
    <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} className="w-full h-full select-none" style={{ touchAction: "none" }}>
      <defs>
        <pattern id="grid3" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={DIM_COLOR} strokeWidth="0.3" opacity="0.3" />
        </pattern>
      </defs>
      <rect width={VW} height={VH} fill="url(#grid3)" />

      {/* Piece circle */}
      <circle cx={cx} cy={cy} r={r} fill={PIECE_FILL} opacity="0.15" stroke={PIECE_COLOR} strokeWidth="1.5" />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="12" fill={DIM_COLOR} opacity="0.4">PEÇA</text>

      {/* Diameter dimension */}
      <DimLine x1={cx - r} y1={cy + r + 24} x2={cx + r} y2={cy + r + 24} label="" />
      <InlineValue x={cx} y={cy + r + 28} value={approxDiameter} unit="mm" color={PROBE_X} onChange={onApproxDiameterChange} fontSize={10} />
      <text x={cx} y={cy + r + 42} textAnchor="middle" fontSize="8" fill={DIM_COLOR} opacity="0.6">Ø Diâmetro</text>

      {/* Probe points */}
      {pts.map((p, i) => {
        const a = (i / circlePoints) * Math.PI * 2 - Math.PI / 2;
        const startX = cx + Math.cos(a) * (r + 40);
        const startY = cy + Math.sin(a) * (r + 40);
        return (
          <g key={i}>
            <AnimatedProbeArrow x1={startX} y1={startY} x2={p.x} y2={p.y} color={PROBE_X} delay={i * 0.4} />
            <line x1={startX} y1={startY} x2={p.x} y2={p.y} stroke={PROBE_X} strokeWidth="2"
              opacity={refinementEnabled ? 0.3 : 0.7} />
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

      {/* Center */}
      <circle cx={cx} cy={cy} r={6} fill="none" stroke={PROBE_X} strokeWidth="1.5" />
      <line x1={cx - 10} y1={cy} x2={cx + 10} y2={cy} stroke={PROBE_X} strokeWidth="1" />
      <line x1={cx} y1={cy - 10} x2={cx} y2={cy + 10} stroke={PROBE_X} strokeWidth="1" />

      {/* Safe Z */}
      <InlineValue x={cx} y={cy - r - 30} value={safeZ} unit="mm" color={Z_COLOR} onChange={onSafeZChange} fontSize={10} />
      <text x={cx} y={cy - r - 42} textAnchor="middle" fontSize="8" fill={Z_COLOR} opacity="0.6">Altura segura Z</text>

      {/* Z probe */}
      {zProbeActive && (
        <g>
          <line x1={cx + 18} y1={cy - 26} x2={cx + 18} y2={cy} stroke={Z_COLOR} strokeWidth="3" markerEnd="url(#arrowCZ)" />
          <text x={cx + 32} y={cy - 12} fontSize="9" fill={Z_COLOR} fontWeight="600">Z</text>
        </g>
      )}

      {/* Legend */}
      <g transform="translate(10, 370)">
        <rect width={VW - 20} height={26} rx={4} fill="hsl(var(--background))" opacity="0.8" stroke={DIM_COLOR} strokeWidth="0.5" />
        <circle cx={14} cy={13} r={4} fill={PROBE_X} />
        <text x={24} y={16} fontSize="9" fill={LABEL_COLOR}>{circlePoints} pontos</text>
        {refinementEnabled && (<><circle cx={100} cy={13} r={4} fill={REFINE_COLOR} /><text x={110} y={16} fontSize="9" fill={LABEL_COLOR}>Conferência</text></>)}
        {zProbeActive && (<><circle cx={refinementEnabled ? 200 : 100} cy={13} r={4} fill={Z_COLOR} /><text x={refinementEnabled ? 210 : 110} y={16} fontSize="9" fill={LABEL_COLOR}>Probe Z</text></>)}
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
  approxDiameter, safeZ, refinementEnabled, zProbeActive, holeZStrategy, holeZSafetyMargin,
  onApproxDiameterChange, onSafeZChange, onHoleZSafetyMarginChange, svgRef,
}: DiagramProps & { svgRef: React.RefObject<SVGSVGElement | null> }) {
  const cx = VW / 2, cy = VH / 2 - 10;
  const r = Math.min(100, approxDiameter * 0.7);
  const rClose = r * 0.8;

  // Safe Z point
  const zpX = cx + r + 30;

  return (
    <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} className="w-full h-full select-none" style={{ touchAction: "none" }}>
      <defs>
        <pattern id="grid4" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={DIM_COLOR} strokeWidth="0.3" opacity="0.3" />
        </pattern>
      </defs>
      <rect width={VW} height={VH} fill="url(#grid4)" />

      {/* Material around hole */}
      <rect x={cx - r - 60} y={cy - r - 40} width={(r + 60) * 2} height={(r + 40) * 2} rx={3}
        fill={PIECE_FILL} opacity="0.1" stroke={PIECE_COLOR} strokeWidth="1.5" />
      <text x={cx - r - 40} y={cy - r - 20} fontSize="9" fill={DIM_COLOR} opacity="0.4">MATERIAL</text>

      {/* Hole */}
      <circle cx={cx} cy={cy} r={r} fill="hsl(var(--background))" stroke={PIECE_COLOR} strokeWidth="2" />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fill={DIM_COLOR} opacity="0.5">FURO</text>

      {/* Diameter */}
      <DimLine x1={cx - r} y1={cy + r + 20} x2={cx + r} y2={cy + r + 20} label="" />
      <InlineValue x={cx} y={cy + r + 24} value={approxDiameter} unit="mm" color={PROBE_X} onChange={onApproxDiameterChange} fontSize={10} />

      {/* 4 internal probes */}
      {[
        { x2: cx + r - 4, y2: cy, label: "X+", delay: 0 },
        { x2: cx - r + 4, y2: cy, label: "X-", delay: 0.5 },
        { x2: cx, y2: cy + r - 4, label: "Y+", delay: 1 },
        { x2: cx, y2: cy - r + 4, label: "Y-", delay: 1.5 },
      ].map((p, i) => (
        <g key={i}>
          <AnimatedProbeArrow x1={cx} y1={cy} x2={p.x2} y2={p.y2} color={i < 2 ? PROBE_X : PROBE_Y} delay={p.delay} />
          <line x1={cx} y1={cy} x2={p.x2} y2={p.y2} stroke={i < 2 ? PROBE_X : PROBE_Y}
            strokeWidth="2" opacity={refinementEnabled ? 0.3 : 0.7} markerEnd={`url(#arrowH${i})`} />
          {refinementEnabled && (
            <line x1={cx} y1={cy}
              x2={cx + (p.x2 - cx) * (rClose / r)} y2={cy + (p.y2 - cy) * (rClose / r)}
              stroke={REFINE_COLOR} strokeWidth="2.5" />
          )}
          <text x={p.x2 + (p.x2 > cx ? 12 : p.x2 < cx ? -12 : 0)} y={p.y2 + (p.y2 > cy ? 14 : p.y2 < cy ? -8 : 0)}
            textAnchor="middle" fontSize="8" fill={i < 2 ? PROBE_X : PROBE_Y} fontWeight="600">{p.label}</text>
        </g>
      ))}

      {/* Center */}
      <circle cx={cx} cy={cy} r={5} fill={PROBE_X} stroke="hsl(var(--background))" strokeWidth="1.5" />

      {/* Z probe — safe point outside hole */}
      {zProbeActive && holeZStrategy !== "none" && (
        <g>
          <line x1={cx + r} y1={cy} x2={zpX} y2={cy} stroke={Z_COLOR} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
          <line x1={zpX} y1={cy - 30} x2={zpX} y2={cy} stroke={Z_COLOR} strokeWidth="3" markerEnd="url(#arrowHZI)" />
          <circle cx={zpX} cy={cy} r={6} fill="none" stroke={Z_COLOR} strokeWidth="2" strokeDasharray="3 2" />
          <text x={zpX} y={cy - 36} textAnchor="middle" fontSize="9" fill={Z_COLOR} fontWeight="600">Z seguro</text>
          <AnimatedProbeArrow x1={zpX} y1={cy - 30} x2={zpX} y2={cy} color={Z_COLOR} delay={2} />

          {/* X on center to show "no Z here" */}
          <line x1={cx - 6} y1={cy - 14} x2={cx + 6} y2={cy - 8} stroke="hsl(var(--destructive))" strokeWidth="2" opacity="0.6" />
          <line x1={cx + 6} y1={cy - 14} x2={cx - 6} y2={cy - 8} stroke="hsl(var(--destructive))" strokeWidth="2" opacity="0.6" />
          <text x={cx} y={cy - 18} textAnchor="middle" fontSize="7" fill="hsl(var(--destructive))" opacity="0.6">Sem Z aqui</text>

          {holeZStrategy === "auto-safe" && (
            <InlineValue x={zpX} y={cy + 20} value={holeZSafetyMargin} unit="mm" color={Z_COLOR}
              onChange={onHoleZSafetyMarginChange} fontSize={9} />
          )}
        </g>
      )}

      {/* Safe Z */}
      <InlineValue x={cx} y={cy - r - 50} value={safeZ} unit="mm" color={Z_COLOR} onChange={onSafeZChange} fontSize={10} />
      <text x={cx} y={cy - r - 62} textAnchor="middle" fontSize="8" fill={Z_COLOR} opacity="0.6">Altura segura Z</text>

      {/* Legend */}
      <g transform="translate(10, 370)">
        <rect width={VW - 20} height={26} rx={4} fill="hsl(var(--background))" opacity="0.8" stroke={DIM_COLOR} strokeWidth="0.5" />
        <circle cx={14} cy={13} r={4} fill={PROBE_X} />
        <text x={24} y={16} fontSize="9" fill={LABEL_COLOR}>Toque interno</text>
        {refinementEnabled && (<><circle cx={120} cy={13} r={4} fill={REFINE_COLOR} /><text x={130} y={16} fontSize="9" fill={LABEL_COLOR}>Conferência</text></>)}
        {zProbeActive && (<><circle cx={refinementEnabled ? 220 : 120} cy={13} r={4} fill={Z_COLOR} /><text x={refinementEnabled ? 230 : 130} y={16} fontSize="9" fill={LABEL_COLOR}>Z seguro</text></>)}
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
