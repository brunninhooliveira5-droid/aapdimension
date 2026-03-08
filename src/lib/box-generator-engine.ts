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

export interface BoxPiece {
  id: string;
  label: string;
  width: number;
  height: number;
  quantity: number;
  paths: Path2D_Segment[][];  // array of contours, each contour is array of segments
}

export interface Path2D_Segment {
  type: "L" | "A"; // line or arc
  x: number;
  y: number;
  // arc extras
  cx?: number;
  cy?: number;
  r?: number;
}

export interface BoxResult {
  pieces: BoxPiece[];
  totalPieces: number;
  stats: {
    totalArea: number;
    materialSheets: number;
  };
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
 * Generate a finger-joint edge profile along an axis.
 * Returns path segments for one edge (bottom or top, left or right).
 * 
 * @param length - total edge length
 * @param thickness - material thickness (depth of fingers)
 * @param fingerCount - number of fingers
 * @param isTabs - true if this edge has tabs (protrusions), false if slots
 * @param direction - 'h' horizontal (along x), 'v' vertical (along y)
 * @param startX - starting x coordinate
 * @param startY - starting y coordinate
 * @param clearance - joint clearance
 * @param cornerRelief - type of corner relief for CNC
 * @param reliefR - radius for dogbone/fillet relief
 */
function fingerEdge(
  length: number,
  thickness: number,
  fingerCount: number,
  isTabs: boolean,
  direction: "h" | "v",
  startX: number,
  startY: number,
  clearance: number,
  cornerRelief: CornerRelief = "none",
  reliefR: number = 0,
): Path2D_Segment[] {
  const segments: Path2D_Segment[] = [];
  const fingerSize = length / fingerCount;
  const cl = clearance / 2;

  for (let i = 0; i < fingerCount; i++) {
    const isTab = (i % 2 === 0) === isTabs;
    const pos = i * fingerSize;
    const nextPos = (i + 1) * fingerSize;

    if (direction === "h") {
      if (isTab) {
        // Go out (down) then across then back up
        segments.push({ type: "L", x: startX + pos, y: startY + thickness });
        segments.push({ type: "L", x: startX + nextPos, y: startY + thickness });
        segments.push({ type: "L", x: startX + nextPos, y: startY });
      } else {
        segments.push({ type: "L", x: startX + nextPos, y: startY });
      }
    } else {
      if (isTab) {
        segments.push({ type: "L", x: startX + thickness, y: startY + pos });
        segments.push({ type: "L", x: startX + thickness, y: startY + nextPos });
        segments.push({ type: "L", x: startX, y: startY + nextPos });
      } else {
        segments.push({ type: "L", x: startX, y: startY + nextPos });
      }
    }
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

  // ─── Front & Back ─────────────────────────────────
  // Front/back: Width × Height, with finger joints on all 4 edges
  const frontW = W;
  const frontH = isOpen || hasLid ? H - t : H; // open top = no top fingers
  pieces.push({
    id: "front",
    label: "Frente",
    width: frontW,
    height: frontH,
    quantity: 1,
    paths: [rectPath(frontW, frontH)],
  });
  pieces.push({
    id: "back",
    label: "Traseira",
    width: frontW,
    height: frontH,
    quantity: 1,
    paths: [rectPath(frontW, frontH)],
  });

  // ─── Left & Right sides ───────────────────────────
  // Sides: Depth × Height, fingers interlock with front/back and top/bottom
  const sideW = D - 2 * t; // internal depth (between front and back)
  const sideH = frontH;
  pieces.push({
    id: "left",
    label: "Lateral Esquerda",
    width: sideW,
    height: sideH,
    quantity: 1,
    paths: [rectPath(sideW, sideH)],
  });
  pieces.push({
    id: "right",
    label: "Lateral Direita",
    width: sideW,
    height: sideH,
    quantity: 1,
    paths: [rectPath(sideW, sideH)],
  });

  // ─── Bottom ────────────────────────────────────────
  const bottomW = W;
  const bottomH = D - 2 * t;
  pieces.push({
    id: "bottom",
    label: "Fundo",
    width: bottomW,
    height: bottomH,
    quantity: 1,
    paths: [rectPath(bottomW, bottomH)],
  });

  // ─── Top / Lid ─────────────────────────────────────
  if (!isOpen) {
    if (hasLid) {
      const lidW = params.boxType === "lid_sliding" ? W + params.lidClearance : W;
      const lidH = params.boxType === "lid_sliding" ? D - 2 * t : D - 2 * t;
      pieces.push({
        id: "lid",
        label: params.boxType === "lid_sliding" ? "Tampa Deslizante" : "Tampa",
        width: lidW,
        height: lidH,
        quantity: 1,
        paths: [rectPath(lidW, lidH)],
      });
      // Sliding tracks
      if (params.boxType === "lid_sliding") {
        pieces.push({
          id: "track_left",
          label: "Trilho Esquerdo",
          width: D - 2 * t,
          height: params.slidingTrackDepth,
          quantity: 1,
          paths: [rectPath(D - 2 * t, params.slidingTrackDepth)],
        });
        pieces.push({
          id: "track_right",
          label: "Trilho Direito",
          width: D - 2 * t,
          height: params.slidingTrackDepth,
          quantity: 1,
          paths: [rectPath(D - 2 * t, params.slidingTrackDepth)],
        });
      }
    } else {
      // Closed box - top panel
      pieces.push({
        id: "top",
        label: "Topo",
        width: bottomW,
        height: bottomH,
        quantity: 1,
        paths: [rectPath(bottomW, bottomH)],
      });
    }
  }

  // ─── Dividers ──────────────────────────────────────
  if (hasDividers) {
    const divT = params.dividerThickness || t;
    // Vertical dividers (along depth)
    for (let i = 0; i < params.dividersV; i++) {
      pieces.push({
        id: `div_v_${i}`,
        label: `Divisória Vertical ${i + 1}`,
        width: D - 2 * t,
        height: frontH - t, // slightly shorter than walls
        quantity: 1,
        paths: [rectPath(D - 2 * t, frontH - t)],
      });
    }
    // Horizontal dividers (along width)
    for (let i = 0; i < params.dividersH; i++) {
      pieces.push({
        id: `div_h_${i}`,
        label: `Divisória Horizontal ${i + 1}`,
        width: iW,
        height: frontH - t,
        quantity: 1,
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
  const rects: string[] = [];

  for (const piece of pieces) {
    for (let q = 0; q < piece.quantity; q++) {
      if (x + piece.width + gap > maxWidth) {
        x = gap;
        y += maxRowH + gap;
        maxRowH = 0;
      }

      rects.push(
        `<g transform="translate(${x}, ${y})">` +
        `<rect x="0" y="0" width="${piece.width}" height="${piece.height}" ` +
        `fill="none" stroke="#000" stroke-width="0.5"/>` +
        `<text x="${piece.width / 2}" y="${piece.height / 2}" ` +
        `font-size="8" text-anchor="middle" dominant-baseline="middle" fill="#666">` +
        `${piece.label}` +
        `</text></g>`
      );

      maxRowH = Math.max(maxRowH, piece.height);
      x += piece.width + gap;
    }
  }

  const totalH = y + maxRowH + gap;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${maxWidth}" height="${totalH}" viewBox="0 0 ${maxWidth} ${totalH}">\n${rects.join("\n")}\n</svg>`;
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

      const x1 = offsetX;
      const y1 = offsetY;
      const x2 = offsetX + piece.width;
      const y2 = offsetY + piece.height;

      // Rectangle as 4 lines
      const addLine = (ax: number, ay: number, bx: number, by: number) => {
        lines += `0\nLINE\n8\n0\n10\n${ax}\n20\n${ay}\n30\n0\n11\n${bx}\n21\n${by}\n31\n0\n`;
      };
      addLine(x1, y1, x2, y1);
      addLine(x2, y1, x2, y2);
      addLine(x2, y2, x1, y2);
      addLine(x1, y2, x1, y1);

      maxRowH = Math.max(maxRowH, piece.height);
      offsetX += piece.width + gap;
    }
  }

  lines += "0\nENDSEC\n0\nEOF\n";
  return lines;
}
