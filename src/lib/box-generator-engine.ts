/**
 * Parametric Box Generator Engine
 * Generates 2D cut pieces for CNC Router / Laser box fabrication
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
  width: number;   // X
  height: number;  // Y (vertical)
  depth: number;   // Z
  materialThickness: number;
  materialName: string;
  // Joint
  jointType: JointType;
  fingerMinSize: number;
  fingerMaxSize: number;
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
  edgeLength: number;
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
  pieceA_isTabs: boolean;
}

export interface BoxJointConfig {
  fcW: number;
  fcWallH: number;
  fcSideW: number;
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
  width: 200,
  height: 100,
  depth: 150,
  materialThickness: 3,
  materialName: "MDF 3mm",
  jointType: "finger",
  fingerMinSize: 10,
  fingerMaxSize: 20,
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

function computeFingerCount(edgeLength: number, minSize: number, maxSize: number): number {
  // Must be odd count so edges start and end with a tab
  let bestCount = 3;
  for (let n = 3; n < 100; n += 2) {
    const size = edgeLength / n;
    if (size >= minSize && size <= maxSize) {
      bestCount = n;
      break;
    }
    if (size < minSize) {
      bestCount = Math.max(3, n - 2);
      break;
    }
  }
  return bestCount;
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
 * Generate a finger-joint edge contour along one side of a piece.
 * Returns an array of {x,y} points tracing the edge with finger tabs/slots.
 *
 * @param edge - which edge: 'top','bottom','left','right'
 * @param pieceW - piece total width
 * @param pieceH - piece total height
 * @param length - length of the edge
 * @param thickness - material thickness (depth of tabs)
 * @param fingerCount - number of fingers
 * @param isTabs - true → starts with protruding tab; false → starts with slot
 */
function fingerEdgePoints(
  edge: "top" | "bottom" | "left" | "right",
  pieceW: number,
  pieceH: number,
  length: number,
  thickness: number,
  fingerCount: number,
  isTabs: boolean,
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const fSize = length / fingerCount;

  for (let i = 0; i < fingerCount; i++) {
    const isTab = (i % 2 === 0) === isTabs;
    const p0 = i * fSize;
    const p1 = (i + 1) * fSize;

    if (edge === "bottom") {
      const baseY = pieceH;
      if (isTab) {
        // Tab protrudes outward (downward)
        pts.push({ x: p0, y: baseY });
        pts.push({ x: p0, y: baseY + thickness });
        pts.push({ x: p1, y: baseY + thickness });
        pts.push({ x: p1, y: baseY });
      } else {
        // Slot recesses inward (upward)
        pts.push({ x: p0, y: baseY });
        pts.push({ x: p0, y: baseY - thickness });
        pts.push({ x: p1, y: baseY - thickness });
        pts.push({ x: p1, y: baseY });
      }
    } else if (edge === "top") {
      const baseY = 0;
      if (isTab) {
        // Tab protrudes outward (upward)
        pts.push({ x: p0, y: baseY });
        pts.push({ x: p0, y: baseY - thickness });
        pts.push({ x: p1, y: baseY - thickness });
        pts.push({ x: p1, y: baseY });
      } else {
        // Slot recesses inward (downward)
        pts.push({ x: p0, y: baseY });
        pts.push({ x: p0, y: baseY + thickness });
        pts.push({ x: p1, y: baseY + thickness });
        pts.push({ x: p1, y: baseY });
      }
    } else if (edge === "right") {
      const baseX = pieceW;
      if (isTab) {
        // Tab protrudes outward (rightward)
        pts.push({ x: baseX, y: p0 });
        pts.push({ x: baseX + thickness, y: p0 });
        pts.push({ x: baseX + thickness, y: p1 });
        pts.push({ x: baseX, y: p1 });
      } else {
        // Slot recesses inward (leftward)
        pts.push({ x: baseX, y: p0 });
        pts.push({ x: baseX - thickness, y: p0 });
        pts.push({ x: baseX - thickness, y: p1 });
        pts.push({ x: baseX, y: p1 });
      }
    } else if (edge === "left") {
      const baseX = 0;
      if (isTab) {
        // Tab protrudes outward (leftward)
        pts.push({ x: baseX, y: p0 });
        pts.push({ x: baseX - thickness, y: p0 });
        pts.push({ x: baseX - thickness, y: p1 });
        pts.push({ x: baseX, y: p1 });
      } else {
        // Slot recesses inward (rightward)
        pts.push({ x: baseX, y: p0 });
        pts.push({ x: baseX + thickness, y: p0 });
        pts.push({ x: baseX + thickness, y: p1 });
        pts.push({ x: baseX, y: p1 });
      }
    }
  }
  return pts;
}

/**
 * Build a full piece contour with finger joints on specified edges.
 * edges: { top, bottom, left, right } each can be:
 *   null → straight edge
 *   { fingerCount, thickness, isTabs } → finger joint
 */
interface FingerEdgeConfig {
  fingerCount: number;
  thickness: number;
  isTabs: boolean;
}

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
  const segments: Path2D_Segment[] = [];

  // Top edge: left to right (y=0)
  if (edges.top) {
    const pts = fingerEdgePoints("top", pieceW, pieceH, pieceW, edges.top.thickness, edges.top.fingerCount, edges.top.isTabs);
    for (const p of pts) segments.push({ type: "L", x: p.x, y: p.y });
  } else {
    segments.push({ type: "L", x: pieceW, y: 0 });
  }

  // Right edge: top to bottom (x=pieceW)
  if (edges.right) {
    const pts = fingerEdgePoints("right", pieceW, pieceH, pieceH, edges.right.thickness, edges.right.fingerCount, edges.right.isTabs);
    for (const p of pts) segments.push({ type: "L", x: p.x, y: p.y });
  } else {
    segments.push({ type: "L", x: pieceW, y: pieceH });
  }

  // Bottom edge: right to left (y=pieceH)
  if (edges.bottom) {
    const pts = fingerEdgePoints("bottom", pieceW, pieceH, pieceW, edges.bottom.thickness, edges.bottom.fingerCount, edges.bottom.isTabs);
    // Reverse so we go right→left
    const reversed = [...pts].reverse();
    for (const p of reversed) segments.push({ type: "L", x: p.x, y: p.y });
  } else {
    segments.push({ type: "L", x: 0, y: pieceH });
  }

  // Left edge: bottom to top (x=0)
  if (edges.left) {
    const pts = fingerEdgePoints("left", pieceW, pieceH, pieceH, edges.left.thickness, edges.left.fingerCount, edges.left.isTabs);
    // Reverse so we go bottom→top
    const reversed = [...pts].reverse();
    for (const p of reversed) segments.push({ type: "L", x: p.x, y: p.y });
  } else {
    segments.push({ type: "L", x: 0, y: 0 });
  }

  return segments;
}

// ─── Main Generator ──────────────────────────────────────────────

export function generateBox(params: BoxParams): BoxResult {
  const t = params.materialThickness;
  let W = params.width;
  let H = params.height;
  let D = params.depth;

  // Convert internal to external dimensions
  if (params.dimensionMode === "internal") {
    W += 2 * t;
    H += 2 * t;
    D += 2 * t;
  }

  // Internal dimensions for reference
  const iW = W - 2 * t;
  const iH = H - 2 * t;
  const iD = D - 2 * t;

  const pieces: BoxPiece[] = [];
  const fingerCount_W = computeFingerCount(W, params.fingerMinSize, params.fingerMaxSize);
  const fingerCount_H = computeFingerCount(H, params.fingerMinSize, params.fingerMaxSize);
  const fingerCount_D = computeFingerCount(D, params.fingerMinSize, params.fingerMaxSize);

  const isOpen = params.boxType === "open";
  const hasLid = params.boxType === "lid_simple" || params.boxType === "lid_sliding";
  const hasDividers = params.boxType === "dividers" || (params.dividersH > 0 || params.dividersV > 0);

  // Apply kerf compensation
  const kerfOffset = params.fabMode === "laser" ? params.kerf / 2 : 0;

  const useFinger = params.jointType === "finger" || params.jointType === "tslot";

  // ─── Front & Back ─────────────────────────────────
  const frontW = W;
  const frontH = isOpen || hasLid ? H - t : H;
  const frontPath = useFinger
    ? buildFingerContour(frontW, frontH, {
        top: (!isOpen && !hasLid) ? { fingerCount: fingerCount_W, thickness: t, isTabs: true } : null,
        bottom: { fingerCount: fingerCount_W, thickness: t, isTabs: true },
        left: { fingerCount: fingerCount_H, thickness: t, isTabs: false },
        right: { fingerCount: fingerCount_H, thickness: t, isTabs: false },
      })
    : rectPath(frontW, frontH);

  pieces.push({
    id: "front", label: "Frente", width: frontW, height: frontH, quantity: 1,
    paths: [frontPath],
  });
  pieces.push({
    id: "back", label: "Traseira", width: frontW, height: frontH, quantity: 1,
    paths: [frontPath],
  });

  // ─── Left & Right sides ───────────────────────────
  const sideW = D - 2 * t;
  const sideH = frontH;
  const sidePath = useFinger
    ? buildFingerContour(sideW, sideH, {
        top: (!isOpen && !hasLid) ? { fingerCount: fingerCount_D, thickness: t, isTabs: false } : null,
        bottom: { fingerCount: fingerCount_D, thickness: t, isTabs: false },
        left: { fingerCount: fingerCount_H, thickness: t, isTabs: true },
        right: { fingerCount: fingerCount_H, thickness: t, isTabs: true },
      })
    : rectPath(sideW, sideH);

  pieces.push({
    id: "left", label: "Lateral Esquerda", width: sideW, height: sideH, quantity: 1,
    paths: [sidePath],
  });
  pieces.push({
    id: "right", label: "Lateral Direita", width: sideW, height: sideH, quantity: 1,
    paths: [sidePath],
  });

  // ─── Bottom ────────────────────────────────────────
  const bottomW = W;
  const bottomH = D - 2 * t;
  const bottomPath = useFinger
    ? buildFingerContour(bottomW, bottomH, {
        top: { fingerCount: fingerCount_W, thickness: t, isTabs: false },
        bottom: { fingerCount: fingerCount_W, thickness: t, isTabs: false },
        left: { fingerCount: fingerCount_D, thickness: t, isTabs: true },
        right: { fingerCount: fingerCount_D, thickness: t, isTabs: true },
      })
    : rectPath(bottomW, bottomH);

  pieces.push({
    id: "bottom", label: "Fundo", width: bottomW, height: bottomH, quantity: 1,
    paths: [bottomPath],
  });

  // ─── Top / Lid ─────────────────────────────────────
  if (!isOpen) {
    if (hasLid) {
      const lidW = params.boxType === "lid_sliding" ? W + params.lidClearance : W;
      const lidH = D - 2 * t;
      pieces.push({
        id: "lid",
        label: params.boxType === "lid_sliding" ? "Tampa Deslizante" : "Tampa",
        width: lidW, height: lidH, quantity: 1,
        paths: [rectPath(lidW, lidH)],
      });
      if (params.boxType === "lid_sliding") {
        pieces.push({
          id: "track_left", label: "Trilho Esquerdo",
          width: D - 2 * t, height: params.slidingTrackDepth, quantity: 1,
          paths: [rectPath(D - 2 * t, params.slidingTrackDepth)],
        });
        pieces.push({
          id: "track_right", label: "Trilho Direito",
          width: D - 2 * t, height: params.slidingTrackDepth, quantity: 1,
          paths: [rectPath(D - 2 * t, params.slidingTrackDepth)],
        });
      }
    } else {
      const topPath = useFinger
        ? buildFingerContour(bottomW, bottomH, {
            top: { fingerCount: fingerCount_W, thickness: t, isTabs: false },
            bottom: { fingerCount: fingerCount_W, thickness: t, isTabs: false },
            left: { fingerCount: fingerCount_D, thickness: t, isTabs: true },
            right: { fingerCount: fingerCount_D, thickness: t, isTabs: true },
          })
        : rectPath(bottomW, bottomH);
      pieces.push({
        id: "top", label: "Topo", width: bottomW, height: bottomH, quantity: 1,
        paths: [topPath],
      });
    }
  }

  // ─── Dividers ──────────────────────────────────────
  if (hasDividers) {
    const divT = params.dividerThickness || t;
    for (let i = 0; i < params.dividersV; i++) {
      pieces.push({
        id: `div_v_${i}`, label: `Divisória Vertical ${i + 1}`,
        width: D - 2 * t, height: frontH - t, quantity: 1,
        paths: [rectPath(D - 2 * t, frontH - t)],
      });
    }
    for (let i = 0; i < params.dividersH; i++) {
      pieces.push({
        id: `div_h_${i}`, label: `Divisória Horizontal ${i + 1}`,
        width: iW, height: frontH - t, quantity: 1,
        paths: [rectPath(iW, frontH - t)],
      });
    }
  }

  // Calculate totals
  const totalPieces = pieces.reduce((sum, p) => sum + p.quantity, 0);
  const totalArea = pieces.reduce((sum, p) => sum + p.width * p.height * p.quantity, 0);

  return {
    pieces,
    totalPieces,
    stats: {
      totalArea,
      materialSheets: 1, // simplified
    },
  };
}

// ─── SVG Export ──────────────────────────────────────────────────

export function boxPiecesToSVG(pieces: BoxPiece[], gap: number = 10): string {
  let x = gap;
  let y = gap;
  let maxRowH = 0;
  const maxWidth = 800;
  const elements: string[] = [];

  for (const piece of pieces) {
    for (let q = 0; q < piece.quantity; q++) {
      if (x + piece.width + gap > maxWidth) {
        x = gap;
        y += maxRowH + gap;
        maxRowH = 0;
      }

      if (piece.paths && piece.paths.length > 0) {
        for (const contour of piece.paths) {
          let d = `M ${x} ${y}`;
          for (const seg of contour) {
            d += ` L ${x + seg.x} ${y + seg.y}`;
          }
          d += " Z";
          elements.push(
            `<path d="${d}" fill="none" stroke="#000" stroke-width="0.5"/>`
          );
        }
      }

      elements.push(
        `<text x="${x + piece.width / 2}" y="${y + piece.height / 2}" ` +
        `font-size="8" text-anchor="middle" dominant-baseline="middle" fill="#666">` +
        `${piece.label}</text>`
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
  let offsetX = 0;
  let offsetY = 0;
  let maxRowH = 0;
  const maxWidth = 800;

  for (const piece of pieces) {
    for (let q = 0; q < piece.quantity; q++) {
      if (offsetX + piece.width + gap > maxWidth) {
        offsetX = 0;
        offsetY += maxRowH + gap;
        maxRowH = 0;
      }

      const addLine = (ax: number, ay: number, bx: number, by: number) => {
        lines += `0\nLINE\n8\n0\n10\n${ax}\n20\n${ay}\n30\n0\n11\n${bx}\n21\n${by}\n31\n0\n`;
      };

      if (piece.paths && piece.paths.length > 0) {
        for (const contour of piece.paths) {
          let prevX = offsetX;
          let prevY = offsetY;
          for (const seg of contour) {
            const nx = offsetX + seg.x;
            const ny = offsetY + seg.y;
            addLine(prevX, prevY, nx, ny);
            prevX = nx;
            prevY = ny;
          }
          // Close
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
