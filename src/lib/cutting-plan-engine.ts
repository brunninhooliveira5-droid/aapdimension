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

// === Sheet cutting (FFDH with rotation) ===

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

  // Sort by area descending for best utilization
  const mode = options?.mode || "best_utilization";
  if (mode === "best_utilization" || mode === "fewer_units") {
    expanded.sort((a, b) => (b.w * b.h) - (a.w * a.h));
  }

  const layouts: SheetLayout[] = [];
  const scraps: { width: number; height: number; sheetIndex: number }[] = [];

  type Shelf = { y: number; h: number; usedW: number; count: number };
  let shelves: Shelf[] = [];
  let curPieces: PlacedPiece[] = [];

  function flush() {
    if (curPieces.length > 0) {
      const used = curPieces.reduce((s, p) => s + p.width * p.height, 0);
      const total = effW * effH;
      const wasteArea = total - used;

      // Calculate scrap rectangles
      const maxUsedY = shelves.length > 0 ? Math.max(...shelves.map(s => s.y + s.h)) : 0;
      const scrapH = effH - maxUsedY;

      const layout: SheetLayout = {
        pieces: [...curPieces],
        utilization: (used / total) * 100,
        wasteArea,
      };

      // Add significant scraps
      if (scrapH >= minScrap && effW >= minScrap) {
        layout.scrapWidth = effW;
        layout.scrapHeight = scrapH;
        scraps.push({ width: effW, height: scrapH, sheetIndex: layouts.length });
      }

      layouts.push(layout);
    }
    shelves = [];
    curPieces = [];
  }

  for (const piece of expanded) {
    let placed = false;

    // Valid orientations
    const orients: [number, number, boolean][] = [];
    if (piece.w <= effW && piece.h <= effH) orients.push([piece.w, piece.h, false]);
    if (piece.canRotate && piece.h <= effW && piece.w <= effH && piece.w !== piece.h) orients.push([piece.h, piece.w, true]);
    if (orients.length === 0) continue;

    // Sort orientations: prefer the one that wastes less height
    if (orients.length > 1) {
      orients.sort((a, b) => a[1] - b[1]);
    }

    // Try existing shelves
    for (const shelf of shelves) {
      for (const [pw, ph, rot] of orients) {
        const gap = shelf.count > 0 ? kerfWidth : 0;
        if (shelf.usedW + gap + pw <= effW && ph <= shelf.h) {
          const x = shelf.usedW + gap;
          curPieces.push({ pieceId: piece.id, pieceIndex: piece.idx, x: x + safetyMargin, y: shelf.y + safetyMargin, width: pw, height: ph, rotated: rot });
          shelf.usedW = x + pw;
          shelf.count++;
          placed = true;
          break;
        }
      }
      if (placed) break;
    }

    if (!placed) {
      // New shelf on current sheet
      for (const [pw, ph, rot] of orients) {
        const last = shelves[shelves.length - 1];
        const newY = last ? last.y + last.h + kerfWidth : 0;
        if (newY + ph <= effH && pw <= effW) {
          shelves.push({ y: newY, h: ph, usedW: pw, count: 1 });
          curPieces.push({ pieceId: piece.id, pieceIndex: piece.idx, x: safetyMargin, y: newY + safetyMargin, width: pw, height: ph, rotated: rot });
          placed = true;
          break;
        }
      }
    }

    if (!placed) {
      flush();
      const [pw, ph, rot] = orients[0];
      shelves.push({ y: 0, h: ph, usedW: pw, count: 1 });
      curPieces.push({ pieceId: piece.id, pieceIndex: piece.idx, x: safetyMargin, y: safetyMargin, width: pw, height: ph, rotated: rot });
    }
  }

  flush();

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
