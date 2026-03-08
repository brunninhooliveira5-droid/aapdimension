// === Types ===

export interface SheetPiece {
  id: string;
  width: number;
  height: number;
  quantity: number;
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
}

export interface SheetCuttingResult {
  layouts: SheetLayout[];
  totalSheets: number;
  totalUtilization: number;
  totalWaste: number;
  estimatedCost: number;
  errors: string[];
  invalidPieceIds: string[];
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
}

// === Piece colors for visualization ===

const PIECE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
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
  kerfWidth: number
): SheetCuttingResult {
  const errors: string[] = [];
  const invalidPieceIds: string[] = [];

  for (const p of pieces) {
    const fitsN = p.width <= matW && p.height <= matH;
    const fitsR = p.height <= matW && p.width <= matH;
    if (!fitsN && !fitsR) {
      errors.push(
        `A peça "${p.id}" (${p.width} x ${p.height} mm) é maior que o material selecionado (${matW} x ${matH} mm).`
      );
      invalidPieceIds.push(p.id);
    }
  }

  if (errors.length > 0) {
    return { layouts: [], totalSheets: 0, totalUtilization: 0, totalWaste: 0, estimatedCost: 0, errors, invalidPieceIds };
  }

  // Expand pieces by quantity
  const expanded: { idx: number; id: string; w: number; h: number }[] = [];
  pieces.forEach((p, i) => {
    for (let q = 0; q < p.quantity; q++) {
      expanded.push({ idx: i, id: p.id, w: p.width, h: p.height });
    }
  });

  // Sort by max dimension descending
  expanded.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));

  const layouts: SheetLayout[] = [];

  type Shelf = { y: number; h: number; usedW: number; count: number };
  let shelves: Shelf[] = [];
  let curPieces: PlacedPiece[] = [];

  function flush() {
    if (curPieces.length > 0) {
      const used = curPieces.reduce((s, p) => s + p.width * p.height, 0);
      const total = matW * matH;
      layouts.push({
        pieces: [...curPieces],
        utilization: (used / total) * 100,
        wasteArea: total - used,
      });
    }
    shelves = [];
    curPieces = [];
  }

  for (const piece of expanded) {
    let placed = false;

    // Valid orientations
    const orients: [number, number, boolean][] = [];
    if (piece.w <= matW && piece.h <= matH) orients.push([piece.w, piece.h, false]);
    if (piece.h <= matW && piece.w <= matH && piece.w !== piece.h) orients.push([piece.h, piece.w, true]);
    if (orients.length === 0) continue;

    // Try existing shelves
    for (const shelf of shelves) {
      for (const [pw, ph, rot] of orients) {
        const gap = shelf.count > 0 ? kerfWidth : 0;
        if (shelf.usedW + gap + pw <= matW && ph <= shelf.h) {
          const x = shelf.usedW + gap;
          curPieces.push({ pieceId: piece.id, pieceIndex: piece.idx, x, y: shelf.y, width: pw, height: ph, rotated: rot });
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
        if (newY + ph <= matH && pw <= matW) {
          shelves.push({ y: newY, h: ph, usedW: pw, count: 1 });
          curPieces.push({ pieceId: piece.id, pieceIndex: piece.idx, x: 0, y: newY, width: pw, height: ph, rotated: rot });
          placed = true;
          break;
        }
      }
    }

    if (!placed) {
      flush();
      const [pw, ph, rot] = orients[0];
      shelves.push({ y: 0, h: ph, usedW: pw, count: 1 });
      curPieces.push({ pieceId: piece.id, pieceIndex: piece.idx, x: 0, y: 0, width: pw, height: ph, rotated: rot });
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
  };
}

// === Tube cutting (FFD) ===

export function calculateTubeCutting(
  barLength: number,
  unitPrice: number,
  pieces: TubePiece[],
  kerfWidth: number
): TubeCuttingResult {
  const errors: string[] = [];
  const invalidPieceIds: string[] = [];

  for (const p of pieces) {
    if (p.length > barLength) {
      errors.push(`A peça "${p.id}" (${p.length} mm) é maior que o comprimento do material (${barLength} mm).`);
      invalidPieceIds.push(p.id);
    }
  }

  if (errors.length > 0) {
    return { bars: [], totalBars: 0, totalUtilization: 0, totalWaste: 0, estimatedCost: 0, errors, invalidPieceIds };
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
        segments: [{ pieceId: piece.id, pieceIndex: piece.idx, length: piece.len, position: 0 }],
        remaining: barLength - piece.len,
      });
    }
  }

  const barLayouts: BarLayout[] = bars.map((bar) => {
    const usedLen = bar.segments.reduce((s, seg) => s + seg.length, 0);
    return {
      segments: bar.segments,
      usedLength: usedLen,
      wasteLength: bar.remaining,
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
  };
}
