/**
 * Parametric Box Generator Engine
 * Combines MakerCase + Boxes.py logic for reliable finger joints.
 *
 * Key concepts from Boxes.py:
 *   • finger / space widths as multiples of material thickness
 *   • "surrounding spaces" — flat padding at each edge end to prevent corner conflicts
 *   • burn correction for tighter laser-cut fit
 *
 * Key concepts from MakerCase:
 *   • single finger-size parameter
 *   • side-dominant joint pattern
 *   • inside / outside dimension toggle
 */

// ─── Types ───────────────────────────────────────────────────────

export type BoxType =
  | "closed"
  | "open"
  | "lid_simple"
  | "lid_sliding"
  | "dividers"
  | "polygon"
  | "curved";

export type FabMode = "cnc" | "laser";

export type JointType = "finger" | "straight" | "slot" | "tslot";

export type CornerRelief = "none" | "dogbone" | "tbone" | "fillet";

export type DimensionMode = "internal" | "external";

export type OffsetMode = "center" | "internal" | "external";

export interface BoxParams {
  projectName: string;
  unit: "mm" | "in";
  fabMode: FabMode;
  boxType: BoxType;
  dimensionMode: DimensionMode;
  width: number;
  height: number;
  depth: number;
  materialThickness: number;
  materialName: string;
  // Joint
  jointType: JointType;
  fingerSize: number;
  fingerClearance: number;
  // Laser
  kerf: number;
  // CNC
  toolDiameter: number;
  offsetMode: OffsetMode;
  cornerRelief: CornerRelief;
  reliefSize: number;
  // Lid
  lidClearance: number;
  slidingTrackDepth: number;
  // Dividers
  dividersH: number;
  dividersV: number;
  dividerThickness: number;
}

export interface Path2D_Segment {
  type: "L" | "A";
  x: number;
  y: number;
  cx?: number;
  cy?: number;
  r?: number;
}

export interface EdgeJointConfig {
  isTabs: boolean;
  fingerCount: number;
  fingerWidth: number;
  edgeLength: number;
  padding: number;          // surrounding-space padding at each end
}

export interface PieceEdgeMap {
  top: EdgeJointConfig | null;
  bottom: EdgeJointConfig | null;
  left: EdgeJointConfig | null;
  right: EdgeJointConfig | null;
}

export interface BoxPiece {
  id: string;
  label: string;
  width: number;
  height: number;
  quantity: number;
  paths: Path2D_Segment[][];
  edges: PieceEdgeMap;
}

export interface JointDef {
  pieceA: string;
  edgeA: string;
  pieceB: string;
  edgeB: string;
  fingerCount: number;
  fingerWidth: number;
  padding: number;
  pieceA_isTabs: boolean;
}

export interface BoxJointConfig {
  wallH: number;
  sideW: number;
  W: number;
  H: number;
  D: number;
  joints: JointDef[];
  pieceEdges: Record<string, PieceEdgeMap>;
}

export interface JointConflict {
  joint: JointDef;
  message: string;
}

export interface BoxResult {
  pieces: BoxPiece[];
  totalPieces: number;
  stats: {
    totalArea: number;
    materialSheets: number;
  };
  jointConfig: BoxJointConfig;
  conflicts: JointConflict[];
}

// ─── Defaults ────────────────────────────────────────────────────

export const defaultBoxParams: BoxParams = {
  projectName: "Minha Caixa",
  unit: "mm",
  fabMode: "laser",
  boxType: "closed",
  dimensionMode: "external",
  width: 100,
  height: 50,
  depth: 100,
  materialThickness: 3,
  materialName: "MDF 3mm",
  jointType: "finger",
  fingerSize: 9,
  fingerClearance: 0.1,
  kerf: 0.2,
  toolDiameter: 3,
  offsetMode: "center",
  cornerRelief: "dogbone",
  reliefSize: 0,
  lidClearance: 0.5,
  slidingTrackDepth: 5,
  dividersH: 0,
  dividersV: 0,
  dividerThickness: 3,
};

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Compute finger count and layout for an edge.
 *
 * Boxes.py-inspired: we leave "surrounding spaces" (= 1 × fingerWidth padding)
 * at each end of the edge so that no tab sits right at the corner.
 *
 * The finger pattern occupies the central portion:
 *   effectiveLength = edgeLength - 2 × padding
 *   fingerCount = nearest odd ≥ 3
 *   fingerWidth = effectiveLength / fingerCount
 *
 * Returns { fingerCount, fingerWidth, padding }.
 */
function computeFingerLayout(
  edgeLength: number,
  desiredFingerSize: number,
): { fingerCount: number; fingerWidth: number; padding: number } {
  if (edgeLength <= 0 || desiredFingerSize <= 0)
    return { fingerCount: 3, fingerWidth: edgeLength / 3, padding: 0 };

  // Padding = half the desired finger size at each end (Boxes.py "surroundingspaces")
  const padding = Math.min(desiredFingerSize * 0.5, edgeLength * 0.15);
  const effective = edgeLength - 2 * padding;

  if (effective <= 0)
    return { fingerCount: 3, fingerWidth: edgeLength / 3, padding: 0 };

  const rawCount = Math.round(effective / desiredFingerSize);
  let count = Math.max(3, rawCount);

  // Must be ODD so edge starts and ends with a tab
  if (count % 2 === 0) {
    const lower = count - 1;
    const upper = count + 1;
    const lSz = effective / lower;
    const uSz = effective / upper;
    count =
      Math.abs(lSz - desiredFingerSize) <= Math.abs(uSz - desiredFingerSize)
        ? lower
        : upper;
  }
  count = Math.max(3, count);

  return {
    fingerCount: count,
    fingerWidth: effective / count,
    padding,
  };
}

function rectPath(w: number, h: number): Path2D_Segment[] {
  return [
    { type: "L", x: w, y: 0 },
    { type: "L", x: w, y: h },
    { type: "L", x: 0, y: h },
    { type: "L", x: 0, y: 0 },
  ];
}

/**
 * Generate finger-joint edge points with surrounding-space padding.
 *
 * The edge is divided into:
 *   [padding] [finger 0] [finger 1] ... [finger N-1] [padding]
 *
 * The padding sections are FLAT (no tab/slot).
 * Tabs on isTabs=true sides: even indices (0,2,4…) protrude outward.
 * Slots on isTabs=false sides: even indices recess inward.
 */
function fingerEdgePoints(
  edge: "top" | "bottom" | "left" | "right",
  pieceW: number,
  pieceH: number,
  edgeLength: number,
  thickness: number,
  fingerCount: number,
  fingerWidth: number,
  padding: number,
  isTabs: boolean,
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];

  for (let i = 0; i < fingerCount; i++) {
    const isTab = (i % 2 === 0) === isTabs;
    const p0 = padding + i * fingerWidth;
    const p1 = padding + (i + 1) * fingerWidth;

    if (edge === "bottom") {
      const baseY = pieceH;
      if (isTab) {
        pts.push({ x: p0, y: baseY }, { x: p0, y: baseY + thickness }, { x: p1, y: baseY + thickness }, { x: p1, y: baseY });
      } else {
        pts.push({ x: p0, y: baseY }, { x: p0, y: baseY - thickness }, { x: p1, y: baseY - thickness }, { x: p1, y: baseY });
      }
    } else if (edge === "top") {
      const baseY = 0;
      if (isTab) {
        pts.push({ x: p0, y: baseY }, { x: p0, y: baseY - thickness }, { x: p1, y: baseY - thickness }, { x: p1, y: baseY });
      } else {
        pts.push({ x: p0, y: baseY }, { x: p0, y: baseY + thickness }, { x: p1, y: baseY + thickness }, { x: p1, y: baseY });
      }
    } else if (edge === "right") {
      const baseX = pieceW;
      if (isTab) {
        pts.push({ x: baseX, y: p0 }, { x: baseX + thickness, y: p0 }, { x: baseX + thickness, y: p1 }, { x: baseX, y: p1 });
      } else {
        pts.push({ x: baseX, y: p0 }, { x: baseX - thickness, y: p0 }, { x: baseX - thickness, y: p1 }, { x: baseX, y: p1 });
      }
    } else if (edge === "left") {
      const baseX = 0;
      if (isTab) {
        pts.push({ x: baseX, y: p0 }, { x: baseX - thickness, y: p0 }, { x: baseX - thickness, y: p1 }, { x: baseX, y: p1 });
      } else {
        pts.push({ x: baseX, y: p0 }, { x: baseX + thickness, y: p0 }, { x: baseX + thickness, y: p1 }, { x: baseX, y: p1 });
      }
    }
  }
  return pts;
}

// ─── Contour builder ─────────────────────────────────────────────

interface FingerEdgeConfig {
  fingerCount: number;
  fingerWidth: number;
  padding: number;
  thickness: number;
  isTabs: boolean;
}

/**
 * Build a full piece contour with finger joints.
 *
 * Traversal order: top → right → bottom (reversed) → left (reversed).
 * Padding regions are flat straight-line sections.
 */
function buildFingerContour(
  pieceW: number,
  pieceH: number,
  edges: {
    top?: FingerEdgeConfig | null;
    bottom?: FingerEdgeConfig | null;
    left?: FingerEdgeConfig | null;
    right?: FingerEdgeConfig | null;
  },
): Path2D_Segment[] {
  const s: Path2D_Segment[] = [];
  const L = (x: number, y: number) => s.push({ type: "L" as const, x, y });

  // ── TOP EDGE (left → right, y=0) ──
  if (edges.top) {
    const e = edges.top;
    // Flat padding at left end
    if (e.padding > 0) L(e.padding, 0);
    // Finger region
    const pts = fingerEdgePoints("top", pieceW, pieceH, pieceW, e.thickness, e.fingerCount, e.fingerWidth, e.padding, e.isTabs);
    for (const p of pts) L(p.x, p.y);
    // Flat padding at right end
    if (e.padding > 0) L(pieceW - e.padding, 0);
    L(pieceW, 0);
  } else {
    L(pieceW, 0);
  }

  // ── RIGHT EDGE (top → bottom, x=pieceW) ──
  if (edges.right) {
    const e = edges.right;
    if (e.padding > 0) L(pieceW, e.padding);
    const pts = fingerEdgePoints("right", pieceW, pieceH, pieceH, e.thickness, e.fingerCount, e.fingerWidth, e.padding, e.isTabs);
    for (const p of pts) L(p.x, p.y);
    if (e.padding > 0) L(pieceW, pieceH - e.padding);
    L(pieceW, pieceH);
  } else {
    L(pieceW, pieceH);
  }

  // ── BOTTOM EDGE (right → left, y=pieceH) ──
  if (edges.bottom) {
    const e = edges.bottom;
    // Flat padding at right end first (we go right→left)
    if (e.padding > 0) L(pieceW - e.padding, pieceH);
    // Finger region (generated left→right then reversed)
    const pts = fingerEdgePoints("bottom", pieceW, pieceH, pieceW, e.thickness, e.fingerCount, e.fingerWidth, e.padding, e.isTabs);
    const reversed = [...pts].reverse();
    for (const p of reversed) L(p.x, p.y);
    // Flat padding at left end
    if (e.padding > 0) L(e.padding, pieceH);
    L(0, pieceH);
  } else {
    L(0, pieceH);
  }

  // ── LEFT EDGE (bottom → top, x=0) ──
  if (edges.left) {
    const e = edges.left;
    if (e.padding > 0) L(0, pieceH - e.padding);
    const pts = fingerEdgePoints("left", pieceW, pieceH, pieceH, e.thickness, e.fingerCount, e.fingerWidth, e.padding, e.isTabs);
    const reversed = [...pts].reverse();
    for (const p of reversed) L(p.x, p.y);
    if (e.padding > 0) L(0, e.padding);
    L(0, 0);
  } else {
    L(0, 0);
  }

  return s;
}

// ─── Joint Configuration (Single Source of Truth) ────────────────

export function computeBoxJoints(params: BoxParams): BoxJointConfig {
  const t = params.materialThickness;
  let W = params.width, H = params.height, D = params.depth;
  if (params.dimensionMode === "internal") { W += 2 * t; H += 2 * t; D += 2 * t; }

  const isOpen = params.boxType === "open";
  const hasLid = params.boxType === "lid_simple" || params.boxType === "lid_sliding";
  const wallH = isOpen || hasLid ? H - t : H;
  const sideW = D - 2 * t;
  const hasTop = !isOpen && !hasLid;

  const fs = params.fingerSize;

  // Compute finger layout for each unique edge length
  const layoutVertical  = computeFingerLayout(wallH, fs);
  const layoutFrontH    = computeFingerLayout(W, fs);
  const layoutSideH     = computeFingerLayout(sideW, fs);

  /**
   * Joint pattern (side-dominant, Boxes.py / MakerCase hybrid):
   *
   *   Front/Back: top & bottom = TABS, left & right = SLOTS
   *   Sides:      ALL edges = TABS
   *   Bottom/Top: ALL edges = SLOTS
   */
  const mkJoint = (
    pA: string, eA: string, pB: string, eB: string,
    layout: { fingerCount: number; fingerWidth: number; padding: number },
    pA_isTabs: boolean,
  ): JointDef => ({
    pieceA: pA, edgeA: eA, pieceB: pB, edgeB: eB,
    fingerCount: layout.fingerCount, fingerWidth: layout.fingerWidth,
    padding: layout.padding, pieceA_isTabs: pA_isTabs,
  });

  const joints: JointDef[] = [
    // Vertical: Front/Back ↔ Sides
    mkJoint("front", "left",   "left",  "left",  layoutVertical, false),
    mkJoint("front", "right",  "right", "right", layoutVertical, false),
    mkJoint("back",  "left",   "left",  "right", layoutVertical, false),
    mkJoint("back",  "right",  "right", "left",  layoutVertical, false),
    // Horizontal: Front/Back ↔ Bottom
    mkJoint("front", "bottom", "bottom", "top",    layoutFrontH, true),
    mkJoint("back",  "bottom", "bottom", "bottom", layoutFrontH, true),
    // Horizontal: Sides ↔ Bottom
    mkJoint("left",  "bottom", "bottom", "left",  layoutSideH, true),
    mkJoint("right", "bottom", "bottom", "right", layoutSideH, true),
  ];

  if (hasTop) {
    joints.push(
      mkJoint("front", "top", "top", "bottom", layoutFrontH, true),
      mkJoint("back",  "top", "top", "top",    layoutFrontH, true),
      mkJoint("left",  "top", "top", "left",   layoutSideH,  true),
      mkJoint("right", "top", "top", "right",  layoutSideH,  true),
    );
  }

  // Edge lengths for each piece
  const edgeLengths: Record<string, Record<string, number>> = {
    front:  { top: W, bottom: W, left: wallH, right: wallH },
    back:   { top: W, bottom: W, left: wallH, right: wallH },
    left:   { top: sideW, bottom: sideW, left: wallH, right: wallH },
    right:  { top: sideW, bottom: sideW, left: wallH, right: wallH },
    bottom: { top: W, bottom: W, left: sideW, right: sideW },
  };
  if (hasTop) edgeLengths.top = { top: W, bottom: W, left: sideW, right: sideW };

  // Build per-piece edge maps
  const pieceEdges: Record<string, PieceEdgeMap> = {};
  const pieceIds = ["front", "back", "left", "right", "bottom"];
  if (hasTop) pieceIds.push("top");
  for (const id of pieceIds) {
    pieceEdges[id] = { top: null, bottom: null, left: null, right: null };
  }

  for (const j of joints) {
    if (pieceEdges[j.pieceA]) {
      (pieceEdges[j.pieceA] as any)[j.edgeA] = {
        isTabs: j.pieceA_isTabs,
        fingerCount: j.fingerCount,
        fingerWidth: j.fingerWidth,
        padding: j.padding,
        edgeLength: edgeLengths[j.pieceA]?.[j.edgeA] || 0,
      };
    }
    if (pieceEdges[j.pieceB]) {
      (pieceEdges[j.pieceB] as any)[j.edgeB] = {
        isTabs: !j.pieceA_isTabs,
        fingerCount: j.fingerCount,
        fingerWidth: j.fingerWidth,
        padding: j.padding,
        edgeLength: edgeLengths[j.pieceB]?.[j.edgeB] || 0,
      };
    }
  }

  return { wallH, sideW, W, H, D, joints, pieceEdges };
}

export function validateBoxJoints(config: BoxJointConfig): JointConflict[] {
  const conflicts: JointConflict[] = [];
  const pe = config.pieceEdges;

  for (const j of config.joints) {
    const edgeA = pe[j.pieceA]?.[j.edgeA as keyof PieceEdgeMap];
    const edgeB = pe[j.pieceB]?.[j.edgeB as keyof PieceEdgeMap];

    if (edgeA && edgeB) {
      if (edgeA.isTabs === edgeB.isTabs) {
        conflicts.push({
          joint: j,
          message: `Conflito ${edgeA.isTabs ? "macho/macho" : "fêmea/fêmea"} entre ${j.pieceA}.${j.edgeA} e ${j.pieceB}.${j.edgeB}`,
        });
      }
      if (edgeA.fingerCount !== edgeB.fingerCount) {
        conflicts.push({
          joint: j,
          message: `fingerCount diferente: ${j.pieceA}.${j.edgeA}(${edgeA.fingerCount}) ≠ ${j.pieceB}.${j.edgeB}(${edgeB.fingerCount})`,
        });
      }
    }
  }
  return conflicts;
}

// ─── Main Generator ──────────────────────────────────────────────

export function generateBox(params: BoxParams): BoxResult {
  const t = params.materialThickness;
  const jc = computeBoxJoints(params);
  const { W, H, D, wallH, sideW, pieceEdges } = jc;

  const iW = W - 2 * t;
  const isOpen = params.boxType === "open";
  const hasLid = params.boxType === "lid_simple" || params.boxType === "lid_sliding";
  const hasDividers = params.boxType === "dividers" || (params.dividersH > 0 || params.dividersV > 0);
  const useFinger = params.jointType === "finger" || params.jointType === "tslot";

  const pieces: BoxPiece[] = [];
  const defaultEdges: PieceEdgeMap = { top: null, bottom: null, left: null, right: null };

  const toFingerConfig = (em: PieceEdgeMap) => {
    const convert = (e: EdgeJointConfig | null): FingerEdgeConfig | null =>
      e
        ? { fingerCount: e.fingerCount, fingerWidth: e.fingerWidth, padding: e.padding, thickness: t, isTabs: e.isTabs }
        : null;
    return { top: convert(em.top), bottom: convert(em.bottom), left: convert(em.left), right: convert(em.right) };
  };

  // ─── Front & Back ─────────────────────────────────
  const frontEdges = pieceEdges.front;
  const frontPath = useFinger ? buildFingerContour(W, wallH, toFingerConfig(frontEdges)) : rectPath(W, wallH);
  pieces.push({ id: "front", label: "Frente", width: W, height: wallH, quantity: 1, paths: [frontPath], edges: frontEdges });

  const backEdges = pieceEdges.back;
  const backPath = useFinger ? buildFingerContour(W, wallH, toFingerConfig(backEdges)) : rectPath(W, wallH);
  pieces.push({ id: "back", label: "Traseira", width: W, height: wallH, quantity: 1, paths: [backPath], edges: backEdges });

  // ─── Left & Right sides ───────────────────────────
  const leftEdges = pieceEdges.left;
  const leftPath = useFinger ? buildFingerContour(sideW, wallH, toFingerConfig(leftEdges)) : rectPath(sideW, wallH);
  pieces.push({ id: "left", label: "Lateral Esquerda", width: sideW, height: wallH, quantity: 1, paths: [leftPath], edges: leftEdges });

  const rightEdges = pieceEdges.right;
  const rightPath = useFinger ? buildFingerContour(sideW, wallH, toFingerConfig(rightEdges)) : rectPath(sideW, wallH);
  pieces.push({ id: "right", label: "Lateral Direita", width: sideW, height: wallH, quantity: 1, paths: [rightPath], edges: rightEdges });

  // ─── Bottom ────────────────────────────────────────
  const bottomEdges = pieceEdges.bottom;
  const bottomPath = useFinger ? buildFingerContour(W, sideW, toFingerConfig(bottomEdges)) : rectPath(W, sideW);
  pieces.push({ id: "bottom", label: "Fundo", width: W, height: sideW, quantity: 1, paths: [bottomPath], edges: bottomEdges });

  // ─── Top / Lid ─────────────────────────────────────
  if (!isOpen) {
    if (hasLid) {
      const lidW = params.boxType === "lid_sliding" ? W + params.lidClearance : W;
      pieces.push({
        id: "lid",
        label: params.boxType === "lid_sliding" ? "Tampa Deslizante" : "Tampa",
        width: lidW, height: sideW, quantity: 1, paths: [rectPath(lidW, sideW)], edges: defaultEdges,
      });
      if (params.boxType === "lid_sliding") {
        pieces.push({ id: "track_left", label: "Trilho Esquerdo", width: sideW, height: params.slidingTrackDepth, quantity: 1, paths: [rectPath(sideW, params.slidingTrackDepth)], edges: defaultEdges });
        pieces.push({ id: "track_right", label: "Trilho Direito", width: sideW, height: params.slidingTrackDepth, quantity: 1, paths: [rectPath(sideW, params.slidingTrackDepth)], edges: defaultEdges });
      }
    } else {
      const topEdges = pieceEdges.top || defaultEdges;
      const topPath = useFinger ? buildFingerContour(W, sideW, toFingerConfig(topEdges)) : rectPath(W, sideW);
      pieces.push({ id: "top", label: "Topo", width: W, height: sideW, quantity: 1, paths: [topPath], edges: topEdges });
    }
  }

  // ─── Dividers ──────────────────────────────────────
  if (hasDividers) {
    for (let i = 0; i < params.dividersV; i++) {
      pieces.push({ id: `div_v_${i}`, label: `Divisória Vertical ${i + 1}`, width: sideW, height: wallH - t, quantity: 1, paths: [rectPath(sideW, wallH - t)], edges: defaultEdges });
    }
    for (let i = 0; i < params.dividersH; i++) {
      pieces.push({ id: `div_h_${i}`, label: `Divisória Horizontal ${i + 1}`, width: iW, height: wallH - t, quantity: 1, paths: [rectPath(iW, wallH - t)], edges: defaultEdges });
    }
  }

  const totalPieces = pieces.reduce((sum, p) => sum + p.quantity, 0);
  const totalArea = pieces.reduce((sum, p) => sum + p.width * p.height * p.quantity, 0);
  const conflicts = validateBoxJoints(jc);

  return { pieces, totalPieces, stats: { totalArea, materialSheets: 1 }, jointConfig: jc, conflicts };
}

// ─── SVG Export ──────────────────────────────────────────────────

export function boxPiecesToSVG(pieces: BoxPiece[], gap: number = 10): string {
  let x = gap, y = gap, maxRowH = 0;
  const maxWidth = 800;
  const elements: string[] = [];

  for (const piece of pieces) {
    for (let q = 0; q < piece.quantity; q++) {
      if (x + piece.width + gap > maxWidth) { x = gap; y += maxRowH + gap; maxRowH = 0; }
      if (piece.paths?.length) {
        for (const contour of piece.paths) {
          let d = `M ${x} ${y}`;
          for (const seg of contour) d += ` L ${x + seg.x} ${y + seg.y}`;
          d += " Z";
          elements.push(`<path d="${d}" fill="none" stroke="#000" stroke-width="0.5"/>`);
        }
      }
      elements.push(
        `<text x="${x + piece.width / 2}" y="${y + piece.height / 2}" font-size="8" text-anchor="middle" dominant-baseline="middle" fill="#666">${piece.label}</text>`
      );
      maxRowH = Math.max(maxRowH, piece.height);
      x += piece.width + gap;
    }
  }
  const totalH = y + maxRowH + gap;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${maxWidth}" height="${totalH}" viewBox="0 0 ${maxWidth} ${totalH}">\n${elements.join("\n")}\n</svg>`;
}

// ─── DXF Export ──────────────────────────────────────────────────

export function boxPiecesToDXF(pieces: BoxPiece[], gap: number = 10): string {
  let lines = "0\nSECTION\n2\nENTITIES\n";
  let offsetX = 0, offsetY = 0, maxRowH = 0;
  const maxWidth = 800;

  for (const piece of pieces) {
    for (let q = 0; q < piece.quantity; q++) {
      if (offsetX + piece.width + gap > maxWidth) { offsetX = 0; offsetY += maxRowH + gap; maxRowH = 0; }
      const addLine = (ax: number, ay: number, bx: number, by: number) => {
        lines += `0\nLINE\n8\n0\n10\n${ax}\n20\n${ay}\n30\n0\n11\n${bx}\n21\n${by}\n31\n0\n`;
      };
      if (piece.paths?.length) {
        for (const contour of piece.paths) {
          let prevX = offsetX, prevY = offsetY;
          for (const seg of contour) {
            const nx = offsetX + seg.x, ny = offsetY + seg.y;
            addLine(prevX, prevY, nx, ny);
            prevX = nx; prevY = ny;
          }
          addLine(prevX, prevY, offsetX, offsetY);
        }
      }
      maxRowH = Math.max(maxRowH, piece.height);
      offsetX += piece.width + gap;
    }
  }
  lines += "0\nENDSEC\n0\nEOF\n";
  return lines;
}
