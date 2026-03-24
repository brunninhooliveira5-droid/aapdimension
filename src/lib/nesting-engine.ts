/**
 * Nesting Engine – SVG parsing + real-geometry nesting with polygon collision
 */
import {
  pathToPolygon, normalizePolygon, scalePolygon, translatePolygon,
  rotatePolygon90, polygonBBox, polygonArea, polygonsOverlap,
  inflatePolygon, polygonFitsInMaterial, findPlacement,
  type Point,
} from "./nesting-geometry";

// ── Types ──────────────────────────────────────────────────────

export interface NestingPiece {
  id: string;
  label: string;
  pathData: string;
  width: number;
  height: number;
  bboxX: number;
  bboxY: number;
  bboxW: number;
  bboxH: number;
  rotation: number;
  x: number;
  y: number;
  color: string;
  excluded: boolean;
  polygonPoints?: Point[];    // normalized polygon in mm (origin 0,0)
  realArea?: number;          // actual polygon area in mm²
}

export interface NestingSheet {
  pieces: NestingPiece[];
  utilization: number;
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
  bboxX: number;
  bboxY: number;
  bboxW: number;
  bboxH: number;
  viewBoxScale: number;
  polygonPoints: Point[];
  realArea: number;
}

export function parseSvgContent(svgContent: string): { pieces: ParsedSvgPiece[]; viewBox: string; svgWidth: number; svgHeight: number } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return { pieces: [], viewBox: "0 0 100 100", svgWidth: 100, svgHeight: 100 };

  const vb = svg.getAttribute("viewBox")?.split(/[\s,]+/).map(Number) || [0, 0, 100, 100];
  const svgW = vb[2] || 100;
  const svgH = vb[3] || 100;

  let scale = 1;
  const widthAttr = svg.getAttribute("width");
  if (widthAttr) {
    const numW = parseFloat(widthAttr);
    if (widthAttr.includes("mm")) scale = numW / svgW;
    else if (widthAttr.includes("cm")) scale = (numW * 10) / svgW;
    else if (widthAttr.includes("in")) scale = (numW * 25.4) / svgW;
    else scale = numW / svgW;
  }

  const pieces: ParsedSvgPiece[] = [];
  let idx = 0;

  const shapeSelectors = "path, rect, circle, ellipse, polygon, polyline, line";
  const shapes = svg.querySelectorAll(shapeSelectors);

  shapes.forEach((el) => {
    const bbox = getElementBBox(el);
    if (!bbox || (bbox.w < 0.1 && bbox.h < 0.1)) return;

    const pathData = elementToPathData(el) || `M${bbox.x},${bbox.y} h${bbox.w} v${bbox.h} h${-bbox.w} Z`;
    idx++;

    // Convert path to polygon
    const rawPolygon = pathToPolygon(pathData);
    const { polygon: normalized } = normalizePolygon(rawPolygon);
    // Scale polygon to mm
    const mmPolygon = scalePolygon(normalized, scale, scale);
    const area = polygonArea(mmPolygon);

    pieces.push({
      id: `nest-${idx}`,
      label: el.getAttribute("id") || el.getAttribute("data-name") || `Peça ${idx}`,
      pathData,
      width: bbox.w * scale,
      height: bbox.h * scale,
      bboxX: bbox.x,
      bboxY: bbox.y,
      bboxW: bbox.w,
      bboxH: bbox.h,
      viewBoxScale: scale,
      polygonPoints: mmPolygon,
      realArea: area,
    });
  });

  if (pieces.length === 0) {
    const pathData = `M0,0 h${svgW} v${svgH} h${-svgW} Z`;
    const poly = [{ x: 0, y: 0 }, { x: svgW * scale, y: 0 }, { x: svgW * scale, y: svgH * scale }, { x: 0, y: svgH * scale }];
    pieces.push({
      id: "nest-1",
      label: "Peça importada",
      pathData,
      width: svgW * scale,
      height: svgH * scale,
      bboxX: 0,
      bboxY: 0,
      bboxW: svgW,
      bboxH: svgH,
      viewBoxScale: scale,
      polygonPoints: poly,
      realArea: svgW * scale * svgH * scale,
    });
  }

  return { pieces, viewBox: `${vb[0]} ${vb[1]} ${svgW} ${svgH}`, svgWidth: svgW, svgHeight: svgH };
}

function getElementBBox(el: Element): { x: number; y: number; w: number; h: number } | null {
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
        minX = Math.min(minX, pts[i]); maxX = Math.max(maxX, pts[i]);
        minY = Math.min(minY, pts[i + 1]); maxY = Math.max(maxY, pts[i + 1]);
      }
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }
    case "line": {
      const x1 = parseFloat(el.getAttribute("x1") || "0");
      const y1 = parseFloat(el.getAttribute("y1") || "0");
      const x2 = parseFloat(el.getAttribute("x2") || "0");
      const y2 = parseFloat(el.getAttribute("y2") || "0");
      return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 1, h: Math.abs(y2 - y1) || 1 };
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
  const pts = pathToPolygon(d);
  if (pts.length === 0) return null;
  const bb = polygonBBox(pts);
  if (bb.w <= 0 && bb.h <= 0) return null;
  return { x: bb.x, y: bb.y, w: Math.max(bb.w, 0.1), h: Math.max(bb.h, 0.1) };
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
  if (tag === "ellipse") {
    const ecx = parseFloat(el.getAttribute("cx") || "0");
    const ecy = parseFloat(el.getAttribute("cy") || "0");
    const rx = parseFloat(el.getAttribute("rx") || "0");
    const ry = parseFloat(el.getAttribute("ry") || "0");
    return `M${ecx - rx},${ecy} a${rx},${ry} 0 1,0 ${rx * 2},0 a${rx},${ry} 0 1,0 ${-rx * 2},0`;
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

// ── Nesting Algorithm (Real Geometry) ──────────────────────────

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

  const effectiveKerf = singleCut ? 0 : kerf;

  // Validate pieces fit in material
  for (const p of activePieces) {
    const fits = (p.width <= matW && p.height <= matH) ||
      (autoRotation && p.height <= matW && p.width <= matH);
    if (!fits) {
      errors.push(`Peça "${p.label}" (${p.width.toFixed(0)}×${p.height.toFixed(0)}) não cabe no material.`);
    }
  }
  if (errors.length > 0) {
    return { sheets: [], totalSheets: 0, totalUtilization: 0, totalUsedArea: 0, totalFreeArea: 0, estimatedCost: 0, errors };
  }

  // Sort by area descending
  const sorted = [...activePieces].sort((a, b) => (b.width * b.height) - (a.width * a.height));
  const matArea = matW * matH;
  const sheets: NestingSheet[] = [];
  const remaining = [...sorted];

  // Determine scan step based on material size and piece count
  const avgPieceSize = sorted.reduce((s, p) => s + Math.min(p.width, p.height), 0) / sorted.length;
  const scanStep = Math.max(1, Math.min(avgPieceSize * 0.15, matW * 0.01, matH * 0.01));

  while (remaining.length > 0) {
    const placed: NestingPiece[] = [];
    const placedPolygons: Point[][] = [];
    const toRemove: number[] = [];

    for (let i = 0; i < remaining.length; i++) {
      const piece = remaining[i];
      const poly = piece.polygonPoints;

      if (!poly || poly.length < 3) {
        // Fallback: create rectangle polygon
        const rectPoly = [
          { x: 0, y: 0 }, { x: piece.width, y: 0 },
          { x: piece.width, y: piece.height }, { x: 0, y: piece.height },
        ];
        piece.polygonPoints = rectPoly;
      }

      // Try normal orientation
      let placement = findPlacement(piece.polygonPoints!, placedPolygons, matW, matH, effectiveKerf, scanStep);
      let rotated = false;

      if (!placement && autoRotation) {
        // Try rotated 90°
        const rotPoly = rotatePolygon90(piece.polygonPoints!);
        placement = findPlacement(rotPoly, placedPolygons, matW, matH, effectiveKerf, scanStep);
        if (placement) {
          rotated = true;
          piece.polygonPoints = rotPoly;
        }
      }

      if (placement) {
        const pw = rotated ? piece.height : piece.width;
        const ph = rotated ? piece.width : piece.height;
        const placedPiece: NestingPiece = {
          ...piece,
          x: placement.x,
          y: placement.y,
          width: pw,
          height: ph,
          rotation: rotated ? (piece.rotation + 90) % 360 : piece.rotation,
          polygonPoints: piece.polygonPoints,
        };
        placed.push(placedPiece);

        // Add inflated polygon to placed list for collision checking
        const absPolygon = translatePolygon(piece.polygonPoints!, placement.x, placement.y);
        const inflated = effectiveKerf > 0 ? inflatePolygon(absPolygon, effectiveKerf / 2) : absPolygon;
        placedPolygons.push(inflated);
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      remaining.splice(toRemove[i], 1);
    }

    if (placed.length === 0 && remaining.length > 0) {
      errors.push(`${remaining.length} peça(s) não couberam em nenhuma chapa.`);
      break;
    }

    const usedArea = placed.reduce((s, p) => s + (p.realArea || p.width * p.height), 0);
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

// ── Polygon collision for manual moves ─────────────────────────

export function checkCollision(
  piece: NestingPiece,
  others: NestingPiece[],
  matW: number,
  matH: number,
  kerf: number
): string | null {
  const poly = piece.polygonPoints;
  if (!poly || poly.length < 3) {
    // Fallback to bbox check
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

  const absPoly = translatePolygon(poly, piece.x, piece.y);
  if (!polygonFitsInMaterial(absPoly, matW, matH)) {
    return "Peça fora dos limites do material.";
  }

  const inflatedPiece = kerf > 0 ? inflatePolygon(absPoly, kerf / 2) : absPoly;

  for (const other of others) {
    if (other.id === piece.id || other.excluded) continue;
    const otherPoly = other.polygonPoints;
    if (otherPoly && otherPoly.length >= 3) {
      const absOther = translatePolygon(otherPoly, other.x, other.y);
      const inflatedOther = kerf > 0 ? inflatePolygon(absOther, kerf / 2) : absOther;
      if (polygonsOverlap(inflatedPiece, inflatedOther)) {
        return `Colisão com peça "${other.label}".`;
      }
    }
  }

  return null;
}

// ── Piece grouping ────────────────────────────────────────────

export interface PieceGroup {
  label: string;
  count: number;
  width: number;
  height: number;
  realArea: number;
  ids: string[];
}

export function groupSimilarPieces(pieces: NestingPiece[]): PieceGroup[] {
  const groups: PieceGroup[] = [];
  const tolerance = 0.5; // mm

  for (const p of pieces) {
    if (p.excluded) continue;
    const existing = groups.find(g =>
      Math.abs(g.width - p.width) < tolerance &&
      Math.abs(g.height - p.height) < tolerance
    );
    if (existing) {
      existing.count++;
      existing.ids.push(p.id);
    } else {
      groups.push({
        label: p.label,
        count: 1,
        width: p.width,
        height: p.height,
        realArea: p.realArea || p.width * p.height,
        ids: [p.id],
      });
    }
  }
  return groups;
}

// Re-export geometry types
export type { Point };
