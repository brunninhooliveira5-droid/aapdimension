/**
 * Nesting Engine – SVG parsing + bin-packing for irregular shapes (bounding-box approximation)
 */

// ── Types ──────────────────────────────────────────────────────

export interface NestingPiece {
  id: string;
  label: string;
  pathData: string;          // original SVG path / polygon data
  width: number;             // bounding-box width (mm)
  height: number;            // bounding-box height (mm)
  bboxX: number;             // original bbox origin X (for path translation)
  bboxY: number;             // original bbox origin Y (for path translation)
  rotation: number;          // degrees (0 | 90 | 180 | 270)
  x: number;
  y: number;
  color: string;
  excluded: boolean;
}

export interface NestingSheet {
  pieces: NestingPiece[];
  utilization: number;       // 0–100
  usedArea: number;
  freeArea: number;
}

export interface NestingResult {
  sheets: NestingSheet[];
  totalSheets: number;
  totalUtilization: number;
  totalUsedArea: number;
  totalFreeArea: number;
  estimatedCost: number;
  errors: string[];
}

// ── Colors ─────────────────────────────────────────────────────

const NESTING_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#f43f5e', '#22c55e', '#eab308',
];

export function getNestingPieceColor(index: number) {
  return NESTING_COLORS[index % NESTING_COLORS.length];
}

// ── SVG Parsing ────────────────────────────────────────────────

interface ParsedSvgPiece {
  id: string;
  label: string;
  pathData: string;
  width: number;
  height: number;
  viewBoxScale: number;
}

export function parseSvgContent(svgContent: string): { pieces: ParsedSvgPiece[]; viewBox: string; svgWidth: number; svgHeight: number } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return { pieces: [], viewBox: "0 0 100 100", svgWidth: 100, svgHeight: 100 };

  const vb = svg.getAttribute("viewBox")?.split(/[\s,]+/).map(Number) || [0, 0, 100, 100];
  const svgW = vb[2] || 100;
  const svgH = vb[3] || 100;

  // Try to determine real-world scale from width/height attributes
  let scale = 1; // px per unit
  const widthAttr = svg.getAttribute("width");
  if (widthAttr) {
    const numW = parseFloat(widthAttr);
    if (widthAttr.includes("mm")) {
      scale = numW / svgW;
    } else if (widthAttr.includes("cm")) {
      scale = (numW * 10) / svgW;
    } else if (widthAttr.includes("in")) {
      scale = (numW * 25.4) / svgW;
    } else {
      // assume px ≈ mm for CNC context
      scale = numW / svgW;
    }
  }

  const pieces: ParsedSvgPiece[] = [];
  let idx = 0;

  // Extract shapes: paths, rects, circles, ellipses, polygons, polylines
  const shapeSelectors = "path, rect, circle, ellipse, polygon, polyline, line";
  const shapes = svg.querySelectorAll(shapeSelectors);

  shapes.forEach((el) => {
    const bbox = getElementBBox(el, svgW, svgH);
    if (!bbox || bbox.w < 1 || bbox.h < 1) return;

    const pathData = elementToPathData(el) || `M${bbox.x},${bbox.y} h${bbox.w} v${bbox.h} h${-bbox.w} Z`;
    idx++;

    pieces.push({
      id: `nest-${idx}`,
      label: el.getAttribute("id") || el.getAttribute("data-name") || `Peça ${idx}`,
      pathData,
      width: bbox.w * scale,
      height: bbox.h * scale,
      viewBoxScale: scale,
    });
  });

  // If no individual shapes, treat entire SVG as single piece
  if (pieces.length === 0) {
    pieces.push({
      id: "nest-1",
      label: "Peça importada",
      pathData: `M0,0 h${svgW} v${svgH} h${-svgW} Z`,
      width: svgW * scale,
      height: svgH * scale,
      viewBoxScale: scale,
    });
  }

  return { pieces, viewBox: `${vb[0]} ${vb[1]} ${svgW} ${svgH}`, svgWidth: svgW, svgHeight: svgH };
}

function getElementBBox(el: Element, _svgW: number, _svgH: number): { x: number; y: number; w: number; h: number } | null {
  const tag = el.tagName.toLowerCase();
  switch (tag) {
    case "rect": {
      const x = parseFloat(el.getAttribute("x") || "0");
      const y = parseFloat(el.getAttribute("y") || "0");
      const w = parseFloat(el.getAttribute("width") || "0");
      const h = parseFloat(el.getAttribute("height") || "0");
      return { x, y, w, h };
    }
    case "circle": {
      const cx = parseFloat(el.getAttribute("cx") || "0");
      const cy = parseFloat(el.getAttribute("cy") || "0");
      const r = parseFloat(el.getAttribute("r") || "0");
      return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
    }
    case "ellipse": {
      const cx2 = parseFloat(el.getAttribute("cx") || "0");
      const cy2 = parseFloat(el.getAttribute("cy") || "0");
      const rx = parseFloat(el.getAttribute("rx") || "0");
      const ry = parseFloat(el.getAttribute("ry") || "0");
      return { x: cx2 - rx, y: cy2 - ry, w: rx * 2, h: ry * 2 };
    }
    case "polygon":
    case "polyline": {
      const pts = (el.getAttribute("points") || "").trim().split(/[\s,]+/).map(Number);
      if (pts.length < 4) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < pts.length; i += 2) {
        minX = Math.min(minX, pts[i]);
        maxX = Math.max(maxX, pts[i]);
        minY = Math.min(minY, pts[i + 1]);
        maxY = Math.max(maxY, pts[i + 1]);
      }
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }
    case "line": {
      const x1 = parseFloat(el.getAttribute("x1") || "0");
      const y1 = parseFloat(el.getAttribute("y1") || "0");
      const x2 = parseFloat(el.getAttribute("x2") || "0");
      const y2 = parseFloat(el.getAttribute("y2") || "0");
      const lx = Math.min(x1, x2), ly = Math.min(y1, y2);
      return { x: lx, y: ly, w: Math.abs(x2 - x1) || 1, h: Math.abs(y2 - y1) || 1 };
    }
    case "path": {
      const d = el.getAttribute("d") || "";
      return pathBBox(d);
    }
    default:
      return null;
  }
}

function pathBBox(d: string): { x: number; y: number; w: number; h: number } | null {
  const nums: number[] = [];
  const matches = d.match(/-?\d+\.?\d*/g);
  if (!matches) return null;
  matches.forEach((m) => nums.push(parseFloat(m)));
  if (nums.length < 2) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < nums.length - 1; i += 2) {
    minX = Math.min(minX, nums[i]);
    maxX = Math.max(maxX, nums[i]);
    minY = Math.min(minY, nums[i + 1]);
    maxY = Math.max(maxY, nums[i + 1]);
  }
  const w = maxX - minX;
  const h = maxY - minY;
  if (w <= 0 || h <= 0) return null;
  return { x: minX, y: minY, w, h };
}

function elementToPathData(el: Element): string | null {
  const tag = el.tagName.toLowerCase();
  if (tag === "path") return el.getAttribute("d");
  if (tag === "rect") {
    const x = parseFloat(el.getAttribute("x") || "0");
    const y = parseFloat(el.getAttribute("y") || "0");
    const w = parseFloat(el.getAttribute("width") || "0");
    const h = parseFloat(el.getAttribute("height") || "0");
    return `M${x},${y} h${w} v${h} h${-w} Z`;
  }
  if (tag === "circle") {
    const cx = parseFloat(el.getAttribute("cx") || "0");
    const cy = parseFloat(el.getAttribute("cy") || "0");
    const r = parseFloat(el.getAttribute("r") || "0");
    return `M${cx - r},${cy} a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 ${-r * 2},0`;
  }
  if (tag === "polygon" || tag === "polyline") {
    const pts = (el.getAttribute("points") || "").trim();
    if (!pts) return null;
    const pairs = pts.split(/[\s,]+/);
    let d = "";
    for (let i = 0; i < pairs.length - 1; i += 2) {
      d += (i === 0 ? "M" : " L") + `${pairs[i]},${pairs[i + 1]}`;
    }
    if (tag === "polygon") d += " Z";
    return d;
  }
  return null;
}

// ── Nesting Algorithm (BBox-based bin-packing) ─────────────────

interface PackInput {
  pieces: NestingPiece[];
  matW: number;
  matH: number;
  kerf: number;
  autoRotation: boolean;
  singleCut: boolean;
  unitPrice: number;
}

export function calculateNesting(input: PackInput): NestingResult {
  const { matW, matH, kerf, autoRotation, singleCut, unitPrice } = input;
  const errors: string[] = [];
  const activePieces = input.pieces.filter(p => !p.excluded);

  if (activePieces.length === 0) {
    errors.push("Nenhuma peça para encaixar.");
    return { sheets: [], totalSheets: 0, totalUtilization: 0, totalUsedArea: 0, totalFreeArea: 0, estimatedCost: 0, errors };
  }

  // Validate pieces fit in material
  for (const p of activePieces) {
    const fits = (p.width <= matW && p.height <= matH) ||
      (autoRotation && p.height <= matW && p.width <= matH);
    if (!fits) {
      errors.push(`Peça "${p.label}" (${p.width.toFixed(0)}x${p.height.toFixed(0)}) não cabe no material.`);
    }
  }

  if (errors.length > 0) {
    return { sheets: [], totalSheets: 0, totalUtilization: 0, totalUsedArea: 0, totalFreeArea: 0, estimatedCost: 0, errors };
  }

  // Sort by area descending (largest first)
  const sorted = [...activePieces].sort((a, b) => (b.width * b.height) - (a.width * a.height));
  const matArea = matW * matH;
  const effectiveKerf = singleCut ? 0 : kerf;

  const sheets: NestingSheet[] = [];
  const remaining = [...sorted];

  while (remaining.length > 0) {
    const placed: NestingPiece[] = [];
    const shelf: { x: number; y: number; rowHeight: number } = { x: effectiveKerf, y: effectiveKerf, rowHeight: 0 };
    const toRemove: number[] = [];

    for (let i = 0; i < remaining.length; i++) {
      const piece = remaining[i];
      let pw = piece.width;
      let ph = piece.height;
      let rotated = false;

      // Try to fit in current row
      if (!tryPlace(pw, ph)) {
        // Try rotated
        if (autoRotation && !tryPlace(ph, pw)) {
          // Doesn't fit current row, try next row
          continue;
        } else if (autoRotation) {
          rotated = true;
          [pw, ph] = [ph, pw];
        } else {
          continue;
        }
      }

      function tryPlace(w: number, h: number): boolean {
        if (shelf.x + w + effectiveKerf <= matW && shelf.y + h + effectiveKerf <= matH) return true;
        // New row
        if (effectiveKerf + w + effectiveKerf <= matW && shelf.y + shelf.rowHeight + effectiveKerf + h + effectiveKerf <= matH) return true;
        return false;
      }

      // Place piece
      if (shelf.x + pw + effectiveKerf > matW) {
        // New row
        shelf.y += shelf.rowHeight + effectiveKerf;
        shelf.x = effectiveKerf;
        shelf.rowHeight = 0;
      }

      if (shelf.y + ph + effectiveKerf > matH) {
        continue; // doesn't fit this sheet at all anymore
      }

      placed.push({
        ...piece,
        x: shelf.x,
        y: shelf.y,
        width: pw,
        height: ph,
        rotation: rotated ? (piece.rotation + 90) % 360 : piece.rotation,
      });

      shelf.x += pw + effectiveKerf;
      shelf.rowHeight = Math.max(shelf.rowHeight, ph);
      toRemove.push(i);
    }

    // Remove placed pieces
    for (let i = toRemove.length - 1; i >= 0; i--) {
      remaining.splice(toRemove[i], 1);
    }

    if (placed.length === 0 && remaining.length > 0) {
      errors.push(`${remaining.length} peça(s) não couberam em nenhuma chapa.`);
      break;
    }

    const usedArea = placed.reduce((s, p) => s + p.width * p.height, 0);
    const freeArea = matArea - usedArea;
    sheets.push({
      pieces: placed,
      utilization: (usedArea / matArea) * 100,
      usedArea,
      freeArea,
    });
  }

  const totalUsed = sheets.reduce((s, sh) => s + sh.usedArea, 0);
  const totalFree = sheets.reduce((s, sh) => s + sh.freeArea, 0);
  const totalUtil = sheets.length > 0 ? (totalUsed / (sheets.length * matArea)) * 100 : 0;

  return {
    sheets,
    totalSheets: sheets.length,
    totalUtilization: totalUtil,
    totalUsedArea: totalUsed,
    totalFreeArea: totalFree,
    estimatedCost: sheets.length * unitPrice,
    errors,
  };
}

// ── Collision detection for manual moves ───────────────────────

export function checkCollision(
  piece: NestingPiece,
  others: NestingPiece[],
  matW: number,
  matH: number,
  kerf: number
): string | null {
  if (piece.x < 0 || piece.y < 0) return "Peça fora dos limites do material.";
  if (piece.x + piece.width > matW) return "Peça ultrapassa a largura do material.";
  if (piece.y + piece.height > matH) return "Peça ultrapassa a altura do material.";

  for (const other of others) {
    if (other.id === piece.id || other.excluded) continue;
    const overlap =
      piece.x < other.x + other.width + kerf &&
      piece.x + piece.width + kerf > other.x &&
      piece.y < other.y + other.height + kerf &&
      piece.y + piece.height + kerf > other.y;
    if (overlap) return `Colisão com peça "${other.label}".`;
  }
  return null;
}
