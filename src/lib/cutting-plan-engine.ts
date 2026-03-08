// === Types ===

export interface SheetPiece {
  id: string;
  width: number;
  height: number;
  quantity: number;
  allowRotation?: boolean;
}

export interface TubePiece {
  id: string;
  length: number;
  quantity: number;
}

export interface PlacedPiece {
  pieceId: string;
  pieceIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
}

export interface SheetLayout {
  pieces: PlacedPiece[];
  utilization: number;
  wasteArea: number;
  scrapWidth?: number;
  scrapHeight?: number;
}

export interface SheetCuttingResult {
  layouts: SheetLayout[];
  totalSheets: number;
  totalUtilization: number;
  totalWaste: number;
  estimatedCost: number;
  errors: string[];
  invalidPieceIds: string[];
  scraps: { width: number; height: number; sheetIndex: number }[];
}

export interface BarSegment {
  pieceId: string;
  pieceIndex: number;
  length: number;
  position: number;
}

export interface BarLayout {
  segments: BarSegment[];
  usedLength: number;
  wasteLength: number;
  utilization: number;
}

export interface TubeCuttingResult {
  bars: BarLayout[];
  totalBars: number;
  totalUtilization: number;
  totalWaste: number;
  estimatedCost: number;
  errors: string[];
  invalidPieceIds: string[];
  scraps: { length: number; barIndex: number }[];
}

export type OptimizationMode = "best_utilization" | "fewer_units" | "simple";

// === Piece colors for visualization ===

const PIECE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#f43f5e', '#22c55e', '#eab308',
];

export function getPieceColor(index: number): string {
  return PIECE_COLORS[index % PIECE_COLORS.length];
}

// === Sheet cutting (Maximal Rectangles with tight packing) ===

interface FreeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function findBestFit(
  freeRects: FreeRect[],
  pw: number,
  ph: number
): { rectIndex: number; x: number; y: number } | null {
  let bestIdx = -1;
  let bestShortSide = Infinity;
  let bestLongSide = Infinity;
  let bestX = 0;
  let bestY = 0;

  for (let i = 0; i < freeRects.length; i++) {
    const r = freeRects[i];
    if (pw <= r.w && ph <= r.h) {
      const leftoverW = r.w - pw;
      const leftoverH = r.h - ph;
      const shortSide = Math.min(leftoverW, leftoverH);
      const longSide = Math.max(leftoverW, leftoverH);
      // Best Short Side Fit: prefer position with least leftover, tie-break by y then x (top-left)
      if (shortSide < bestShortSide || (shortSide === bestShortSide && longSide < bestLongSide)) {
        bestIdx = i;
        bestShortSide = shortSide;
        bestLongSide = longSide;
        bestX = r.x;
        bestY = r.y;
      }
    }
  }

  return bestIdx >= 0 ? { rectIndex: bestIdx, x: bestX, y: bestY } : null;
}

function splitFreeRects(freeRects: FreeRect[], px: number, py: number, pw: number, ph: number): FreeRect[] {
  const newRects: FreeRect[] = [];

  for (const r of freeRects) {
    // Check if placed piece overlaps this free rect
    if (px >= r.x + r.w || px + pw <= r.x || py >= r.y + r.h || py + ph <= r.y) {
      // No overlap, keep it
      newRects.push(r);
      continue;
    }

    // Generate new free rects from the remaining space
    // Right side
    if (px + pw < r.x + r.w) {
      newRects.push({ x: px + pw, y: r.y, w: r.x + r.w - (px + pw), h: r.h });
    }
    // Left side
    if (px > r.x) {
      newRects.push({ x: r.x, y: r.y, w: px - r.x, h: r.h });
    }
    // Bottom
    if (py + ph < r.y + r.h) {
      newRects.push({ x: r.x, y: py + ph, w: r.w, h: r.y + r.h - (py + ph) });
    }
    // Top
    if (py > r.y) {
      newRects.push({ x: r.x, y: r.y, w: r.w, h: py - r.y });
    }
  }

  // Remove rects fully contained by another
  const filtered: FreeRect[] = [];
  for (let i = 0; i < newRects.length; i++) {
    let contained = false;
    for (let j = 0; j < newRects.length; j++) {
      if (i === j) continue;
      const a = newRects[i];
      const b = newRects[j];
      if (a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h) {
        contained = true;
        break;
      }
    }
    if (!contained) filtered.push(newRects[i]);
  }

  return filtered;
}

export function calculateSheetCutting(
  matW: number,
  matH: number,
  unitPrice: number,
  pieces: SheetPiece[],
  kerfWidth: number,
  options?: {
    safetyMargin?: number;
    allowRotation?: boolean;
    mode?: OptimizationMode;
    minScrapSize?: number;
  }
): SheetCuttingResult {
  const errors: string[] = [];
  const invalidPieceIds: string[] = [];
  const safetyMargin = options?.safetyMargin || 0;
  const globalRotation = options?.allowRotation ?? true;
  const minScrap = options?.minScrapSize ?? 150;

  // Effective material dimensions (minus safety margin on each side)
  const effW = matW - safetyMargin * 2;
  const effH = matH - safetyMargin * 2;

  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    const canRotate = globalRotation && (p.allowRotation !== false);
    const fitsN = p.width <= effW && p.height <= effH;
    const fitsR = canRotate && p.height <= effW && p.width <= effH;
    if (!fitsN && !fitsR) {
      errors.push(
        `Peça ${i + 1} (${p.width} x ${p.height} mm) é maior que o material selecionado (${matW} x ${matH} mm).`
      );
      invalidPieceIds.push(p.id);
    }
  }

  if (errors.length > 0) {
    return { layouts: [], totalSheets: 0, totalUtilization: 0, totalWaste: 0, estimatedCost: 0, errors, invalidPieceIds, scraps: [] };
  }

  // Expand pieces by quantity
  const expanded: { idx: number; id: string; w: number; h: number; canRotate: boolean }[] = [];
  pieces.forEach((p, i) => {
    const canRotate = globalRotation && (p.allowRotation !== false);
    for (let q = 0; q < p.quantity; q++) {
      expanded.push({ idx: i, id: p.id, w: p.width, h: p.height, canRotate });
    }
  });

  // Sort by area descending for best packing
  const mode = options?.mode || "best_utilization";
  if (mode === "best_utilization" || mode === "fewer_units") {
    expanded.sort((a, b) => (b.w * b.h) - (a.w * a.h));
  }

  const layouts: SheetLayout[] = [];
  const scraps: { width: number; height: number; sheetIndex: number }[] = [];

  let remaining = [...expanded];

  while (remaining.length > 0) {
    // Start a new sheet using Maximal Rectangles algorithm
    let freeRects: FreeRect[] = [{ x: 0, y: 0, w: effW, h: effH }];
    const curPieces: PlacedPiece[] = [];
    const notPlaced: typeof remaining = [];

    for (const piece of remaining) {
      // Build orientations to try (include kerf in dimensions for spacing)
      const orients: [number, number, boolean][] = [];
      
      // Normal orientation
      if (piece.w <= effW && piece.h <= effH) {
        orients.push([piece.w, piece.h, false]);
      }
      // Rotated orientation (only if rotation allowed AND dimensions differ)
      if (piece.canRotate && piece.h <= effW && piece.w <= effH && piece.w !== piece.h) {
        orients.push([piece.h, piece.w, true]);
      }
      if (orients.length === 0) { notPlaced.push(piece); continue; }

      let bestPlacement: { x: number; y: number; pw: number; ph: number; rot: boolean } | null = null;
      let bestScore = Infinity;

      for (const [pw, ph, rot] of orients) {
        // Account for kerf: we need pw + kerf width to fit, but piece itself is pw
        const fit = findBestFit(freeRects, pw, ph);
        if (fit) {
          const leftoverW = freeRects[fit.rectIndex].w - pw;
          const leftoverH = freeRects[fit.rectIndex].h - ph;
          const score = Math.min(leftoverW, leftoverH);
          if (score < bestScore) {
            bestScore = score;
            bestPlacement = { x: fit.x, y: fit.y, pw, ph, rot };
          }
        }
      }

      if (bestPlacement) {
        const { x, y, pw, ph, rot } = bestPlacement;
        curPieces.push({
          pieceId: piece.id,
          pieceIndex: piece.idx,
          x: x + safetyMargin,
          y: y + safetyMargin,
          width: pw,
          height: ph,
          rotated: rot,
        });
        // Split free rects accounting for kerf (piece occupies pw+kerf x ph+kerf)
        const kerfPw = Math.min(pw + kerfWidth, effW - x);
        const kerfPh = Math.min(ph + kerfWidth, effH - y);
        freeRects = splitFreeRects(freeRects, x, y, kerfPw, kerfPh);
      } else {
        notPlaced.push(piece);
      }
    }

    if (curPieces.length > 0) {
      const used = curPieces.reduce((s, p) => s + p.width * p.height, 0);
      const total = effW * effH;
      const wasteArea = total - used;

      const maxUsedY = Math.max(...curPieces.map(p => (p.y - safetyMargin) + p.height));
      const scrapH = effH - maxUsedY;

      const layout: SheetLayout = {
        pieces: curPieces,
        utilization: (used / total) * 100,
        wasteArea,
      };

      if (scrapH >= minScrap && effW >= minScrap) {
        layout.scrapWidth = effW;
        layout.scrapHeight = scrapH;
        scraps.push({ width: effW, height: scrapH, sheetIndex: layouts.length });
      }

      layouts.push(layout);
    }

    remaining = notPlaced;

    // Safety: prevent infinite loop
    if (curPieces.length === 0 && remaining.length > 0) {
      break;
    }
  }

  const sheetArea = matW * matH;
  const totalUsed = layouts.reduce((s, l) => s + l.pieces.reduce((s2, p) => s2 + p.width * p.height, 0), 0);
  const totalArea = sheetArea * layouts.length;

  return {
    layouts,
    totalSheets: layouts.length,
    totalUtilization: totalArea > 0 ? (totalUsed / totalArea) * 100 : 0,
    totalWaste: totalArea - totalUsed,
    estimatedCost: layouts.length * unitPrice,
    errors: [],
    invalidPieceIds: [],
    scraps,
  };
}

// === Tube cutting (FFD) ===

export function calculateTubeCutting(
  barLength: number,
  unitPrice: number,
  pieces: TubePiece[],
  kerfWidth: number,
  options?: {
    safetyMargin?: number;
    mode?: OptimizationMode;
    minScrapSize?: number;
  }
): TubeCuttingResult {
  const errors: string[] = [];
  const invalidPieceIds: string[] = [];
  const safetyMargin = options?.safetyMargin || 0;
  const effLength = barLength - safetyMargin * 2;
  const minScrap = options?.minScrapSize ?? 150;

  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    if (p.length > effLength) {
      errors.push(`Peça ${i + 1} (${p.length} mm) é maior que o comprimento do material (${barLength} mm).`);
      invalidPieceIds.push(p.id);
    }
  }

  if (errors.length > 0) {
    return { bars: [], totalBars: 0, totalUtilization: 0, totalWaste: 0, estimatedCost: 0, errors, invalidPieceIds, scraps: [] };
  }

  const expanded: { idx: number; id: string; len: number }[] = [];
  pieces.forEach((p, i) => {
    for (let q = 0; q < p.quantity; q++) {
      expanded.push({ idx: i, id: p.id, len: p.length });
    }
  });

  expanded.sort((a, b) => b.len - a.len);

  type Bar = { segments: BarSegment[]; remaining: number };
  const bars: Bar[] = [];

  for (const piece of expanded) {
    let placed = false;
    for (const bar of bars) {
      const gap = bar.segments.length > 0 ? kerfWidth : 0;
      if (bar.remaining >= piece.len + gap) {
        const pos = barLength - bar.remaining + gap;
        bar.segments.push({ pieceId: piece.id, pieceIndex: piece.idx, length: piece.len, position: pos });
        bar.remaining -= (piece.len + gap);
        placed = true;
        break;
      }
    }
    if (!placed) {
      bars.push({
        segments: [{ pieceId: piece.id, pieceIndex: piece.idx, length: piece.len, position: safetyMargin }],
        remaining: effLength - piece.len,
      });
    }
  }

  const scraps: { length: number; barIndex: number }[] = [];

  const barLayouts: BarLayout[] = bars.map((bar, i) => {
    const usedLen = bar.segments.reduce((s, seg) => s + seg.length, 0);
    const waste = bar.remaining;
    if (waste >= minScrap) {
      scraps.push({ length: waste, barIndex: i });
    }
    return {
      segments: bar.segments,
      usedLength: usedLen,
      wasteLength: waste,
      utilization: (usedLen / barLength) * 100,
    };
  });

  const totalUsed = barLayouts.reduce((s, b) => s + b.usedLength, 0);
  const totalLen = barLength * bars.length;

  return {
    bars: barLayouts,
    totalBars: bars.length,
    totalUtilization: totalLen > 0 ? (totalUsed / totalLen) * 100 : 0,
    totalWaste: totalLen - totalUsed,
    estimatedCost: bars.length * unitPrice,
    errors: [],
    invalidPieceIds: [],
    scraps,
  };
}
