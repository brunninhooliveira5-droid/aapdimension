/**
 * Nesting Geometry Engine – Path-to-polygon conversion, polygon collision, and real-geometry nesting
 */

// ── Types ──────────────────────────────────────────────────────

export interface Point { x: number; y: number; }

export interface PolygonPiece {
  id: string;
  polygon: Point[];       // closed polygon approximation (in mm, origin at 0,0)
  area: number;           // actual polygon area (mm²)
}

// ── Path to Polygon ────────────────────────────────────────────

const CURVE_SEGMENTS = 8; // segments per curve/arc

/** Convert SVG path data string to polygon points (absolute coords in SVG units) */
export function pathToPolygon(d: string): Point[] {
  const points: Point[] = [];
  let cx = 0, cy = 0;
  let startX = 0, startY = 0;

  const tokens = d.match(/[a-zA-Z]|[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g);
  if (!tokens) return [];

  let cmd = '';
  const nums: number[] = [];

  const addPt = (x: number, y: number) => {
    if (points.length === 0 || Math.abs(points[points.length - 1].x - x) > 0.01 || Math.abs(points[points.length - 1].y - y) > 0.01) {
      points.push({ x, y });
    }
  };

  const flush = () => {
    if (!cmd) return;
    const isRel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const n = nums;

    switch (C) {
      case 'M': {
        for (let i = 0; i < n.length - 1; i += 2) {
          cx = isRel && i > 0 ? cx + n[i] : (isRel ? cx + n[i] : n[i]);
          cy = isRel && i > 0 ? cy + n[i + 1] : (isRel ? cy + n[i + 1] : n[i + 1]);
          if (i === 0) { startX = cx; startY = cy; }
          addPt(cx, cy);
        }
        break;
      }
      case 'L': case 'T': {
        for (let i = 0; i < n.length - 1; i += 2) {
          cx = isRel ? cx + n[i] : n[i];
          cy = isRel ? cy + n[i + 1] : n[i + 1];
          addPt(cx, cy);
        }
        break;
      }
      case 'H': {
        for (const v of n) { cx = isRel ? cx + v : v; addPt(cx, cy); }
        break;
      }
      case 'V': {
        for (const v of n) { cy = isRel ? cy + v : v; addPt(cx, cy); }
        break;
      }
      case 'C': { // cubic bezier
        for (let i = 0; i < n.length - 5; i += 6) {
          const x0 = cx, y0 = cy;
          const bx = isRel ? cx : 0, by = isRel ? cy : 0;
          const x1 = bx + n[i], y1 = by + n[i + 1];
          const x2 = bx + n[i + 2], y2 = by + n[i + 3];
          const x3 = bx + n[i + 4], y3 = by + n[i + 5];
          for (let t = 1; t <= CURVE_SEGMENTS; t++) {
            const u = t / CURVE_SEGMENTS;
            const v = 1 - u;
            addPt(
              v * v * v * x0 + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x3,
              v * v * v * y0 + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y3
            );
          }
          cx = x3; cy = y3;
        }
        break;
      }
      case 'S': { // smooth cubic
        for (let i = 0; i < n.length - 3; i += 4) {
          const x0 = cx, y0 = cy;
          const bx = isRel ? cx : 0, by = isRel ? cy : 0;
          const x2 = bx + n[i], y2 = by + n[i + 1];
          const x3 = bx + n[i + 2], y3 = by + n[i + 3];
          // Approximate: treat control1 = current pos
          for (let t = 1; t <= CURVE_SEGMENTS; t++) {
            const u = t / CURVE_SEGMENTS;
            const v = 1 - u;
            addPt(
              v * v * v * x0 + 3 * v * v * u * x0 + 3 * v * u * u * x2 + u * u * u * x3,
              v * v * v * y0 + 3 * v * v * u * y0 + 3 * v * u * u * y2 + u * u * u * y3
            );
          }
          cx = x3; cy = y3;
        }
        break;
      }
      case 'Q': { // quadratic bezier
        for (let i = 0; i < n.length - 3; i += 4) {
          const x0 = cx, y0 = cy;
          const bx = isRel ? cx : 0, by = isRel ? cy : 0;
          const x1 = bx + n[i], y1 = by + n[i + 1];
          const x2 = bx + n[i + 2], y2 = by + n[i + 3];
          for (let t = 1; t <= CURVE_SEGMENTS; t++) {
            const u = t / CURVE_SEGMENTS;
            const v = 1 - u;
            addPt(v * v * x0 + 2 * v * u * x1 + u * u * x2, v * v * y0 + 2 * v * u * y1 + u * u * y2);
          }
          cx = x2; cy = y2;
        }
        break;
      }
      case 'A': { // arc – proper endpoint parameterization
        for (let i = 0; i < n.length - 6; i += 7) {
          const rx0 = Math.abs(n[i]) || 0.01;
          const ry0 = Math.abs(n[i + 1]) || 0.01;
          const phi = (n[i + 2] || 0) * Math.PI / 180;
          const fA = n[i + 3] ? 1 : 0; // large-arc
          const fS = n[i + 4] ? 1 : 0; // sweep
          const ex = isRel ? cx + n[i + 5] : n[i + 5];
          const ey = isRel ? cy + n[i + 6] : n[i + 6];

          // Endpoint to center parameterization (SVG spec F.6.5)
          const cosPhi = Math.cos(phi), sinPhi = Math.sin(phi);
          const dx2 = (cx - ex) / 2, dy2 = (cy - ey) / 2;
          const x1p = cosPhi * dx2 + sinPhi * dy2;
          const y1p = -sinPhi * dx2 + cosPhi * dy2;

          let rxSq = rx0 * rx0, rySq = ry0 * ry0;
          const x1pSq = x1p * x1p, y1pSq = y1p * y1p;

          // Correct radii if too small
          let rx = rx0, ry = ry0;
          const lambda = x1pSq / rxSq + y1pSq / rySq;
          if (lambda > 1) {
            const sqrtL = Math.sqrt(lambda);
            rx *= sqrtL; ry *= sqrtL;
            rxSq = rx * rx; rySq = ry * ry;
          }

          let sq = (rxSq * rySq - rxSq * y1pSq - rySq * x1pSq) / (rxSq * y1pSq + rySq * x1pSq);
          if (sq < 0) sq = 0;
          const sign = (fA === fS) ? -1 : 1;
          const coef = sign * Math.sqrt(sq);
          const cxp = coef * (rx * y1p / ry);
          const cyp = coef * (-(ry * x1p / rx));

          const ccx = cosPhi * cxp - sinPhi * cyp + (cx + ex) / 2;
          const ccy = sinPhi * cxp + cosPhi * cyp + (cy + ey) / 2;

          const angleOf = (ux: number, uy: number, vx: number, vy: number) => {
            const dot = ux * vx + uy * vy;
            const len = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy) || 1;
            let a = Math.acos(Math.max(-1, Math.min(1, dot / len)));
            if (ux * vy - uy * vx < 0) a = -a;
            return a;
          };

          let theta1 = angleOf(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
          let dTheta = angleOf((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);

          if (fS === 0 && dTheta > 0) dTheta -= Math.PI * 2;
          if (fS === 1 && dTheta < 0) dTheta += Math.PI * 2;

          const segs = Math.max(CURVE_SEGMENTS, Math.ceil(Math.abs(dTheta) / (Math.PI / 4)) * 2);
          for (let t = 1; t <= segs; t++) {
            const angle = theta1 + dTheta * (t / segs);
            const xr = rx * Math.cos(angle);
            const yr = ry * Math.sin(angle);
            addPt(cosPhi * xr - sinPhi * yr + ccx, sinPhi * xr + cosPhi * yr + ccy);
          }
          cx = ex; cy = ey;
        }
        break;
      }
      case 'Z': {
        addPt(startX, startY);
        cx = startX; cy = startY;
        break;
      }
    }
    nums.length = 0;
  };

  for (const tok of tokens) {
    if (/^[a-zA-Z]$/.test(tok)) { flush(); cmd = tok; }
    else { nums.push(parseFloat(tok)); }
  }
  flush();

  return points;
}

/** Normalize polygon: translate so bbox origin is at (0,0) */
export function normalizePolygon(pts: Point[]): { polygon: Point[]; offsetX: number; offsetY: number } {
  if (pts.length === 0) return { polygon: [], offsetX: 0, offsetY: 0 };
  let minX = Infinity, minY = Infinity;
  for (const p of pts) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); }
  return {
    polygon: pts.map(p => ({ x: p.x - minX, y: p.y - minY })),
    offsetX: minX,
    offsetY: minY,
  };
}

/** Scale polygon by factor */
export function scalePolygon(pts: Point[], sx: number, sy: number): Point[] {
  return pts.map(p => ({ x: p.x * sx, y: p.y * sy }));
}

/** Translate polygon */
export function translatePolygon(pts: Point[], dx: number, dy: number): Point[] {
  return pts.map(p => ({ x: p.x + dx, y: p.y + dy }));
}

/** Rotate polygon 90 degrees around its center */
export function rotatePolygon90(pts: Point[]): Point[] {
  if (pts.length === 0) return [];
  const bbox = polygonBBox(pts);
  const cx = bbox.x + bbox.w / 2;
  const cy = bbox.y + bbox.h / 2;
  // Rotate 90° CW: (x,y) → (y, -x) centered
  const rotated = pts.map(p => ({
    x: -(p.y - cy) + cx,
    y: (p.x - cx) + cy,
  }));
  // Re-normalize to origin
  const n = normalizePolygon(rotated);
  return n.polygon;
}

/** Calculate polygon bounding box */
export function polygonBBox(pts: Point[]): { x: number; y: number; w: number; h: number } {
  if (pts.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Calculate polygon area using shoelace formula */
export function polygonArea(pts: Point[]): number {
  let area = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    area += (pts[j].x + pts[i].x) * (pts[j].y - pts[i].y);
  }
  return Math.abs(area / 2);
}

// ── Collision Detection ────────────────────────────────────────

/** Check if two line segments intersect */
function segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const d1x = a2.x - a1.x, d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x, d2y = b2.y - b1.y;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-10) return false;
  const dx = b1.x - a1.x, dy = b1.y - a1.y;
  const t = (dx * d2y - dy * d2x) / cross;
  const u = (dx * d1y - dy * d1x) / cross;
  return t > 0 && t < 1 && u > 0 && u < 1;
}

/** Point-in-polygon test using ray casting */
function pointInPolygon(pt: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if (((poly[i].y > pt.y) !== (poly[j].y > pt.y)) &&
      (pt.x < (poly[j].x - poly[i].x) * (pt.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x)) {
      inside = !inside;
    }
  }
  return inside;
}

/** Check if two polygons overlap (including one inside the other) */
export function polygonsOverlap(polyA: Point[], polyB: Point[]): boolean {
  // Quick bbox check first
  const bA = polygonBBox(polyA);
  const bB = polygonBBox(polyB);
  if (bA.x > bB.x + bB.w || bB.x > bA.x + bA.w || bA.y > bB.y + bB.h || bB.y > bA.y + bA.h) {
    return false;
  }

  // Check edge intersections
  for (let i = 0; i < polyA.length; i++) {
    const a1 = polyA[i], a2 = polyA[(i + 1) % polyA.length];
    for (let j = 0; j < polyB.length; j++) {
      if (segmentsIntersect(a1, a2, polyB[j], polyB[(j + 1) % polyB.length])) return true;
    }
  }

  // Check containment
  if (polyA.length > 0 && pointInPolygon(polyA[0], polyB)) return true;
  if (polyB.length > 0 && pointInPolygon(polyB[0], polyA)) return true;

  return false;
}

/** Inflate polygon outward by distance (kerf/2) using simple offset */
export function inflatePolygon(pts: Point[], dist: number): Point[] {
  if (pts.length < 3 || dist <= 0) return pts;
  const result: Point[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const curr = pts[i];
    const next = pts[(i + 1) % n];
    // Compute outward normals of adjacent edges
    const e1x = curr.x - prev.x, e1y = curr.y - prev.y;
    const e2x = next.x - curr.x, e2y = next.y - curr.y;
    const l1 = Math.sqrt(e1x * e1x + e1y * e1y) || 1;
    const l2 = Math.sqrt(e2x * e2x + e2y * e2y) || 1;
    // Outward normals (assuming CW winding)
    let n1x = e1y / l1, n1y = -e1x / l1;
    let n2x = e2y / l2, n2y = -e2x / l2;
    // Average normal
    let nx = n1x + n2x, ny = n1y + n2y;
    const ln = Math.sqrt(nx * nx + ny * ny) || 1;
    nx /= ln; ny /= ln;
    // Check winding: if polygon is CCW, flip
    const crossProduct = e1x * e2y - e1y * e2x;
    const sign = crossProduct >= 0 ? 1 : -1;
    result.push({ x: curr.x + nx * dist * sign, y: curr.y + ny * dist * sign });
  }
  return result;
}

// ── No-Fit Polygon placement helper ────────────────────────────

/** Check if polygon (at position) fits within material bounds */
export function polygonFitsInMaterial(poly: Point[], matW: number, matH: number): boolean {
  for (const p of poly) {
    if (p.x < 0 || p.y < 0 || p.x > matW || p.y > matH) return false;
  }
  return true;
}

/** Try to place a polygon on the sheet without overlapping placed polygons.
 *  Uses a scanning approach with bbox pre-filter + real polygon collision. */
export function findPlacement(
  piecePolygon: Point[],   // normalized polygon (origin 0,0) in mm
  placedPolygons: Point[][], // already-placed polygons in absolute positions
  matW: number,
  matH: number,
  kerf: number,
  step?: number
): { x: number; y: number } | null {
  const bbox = polygonBBox(piecePolygon);
  const pw = bbox.w;
  const ph = bbox.h;
  const halfKerf = kerf / 2;

  // Inflate piece by half-kerf for collision
  const inflated = kerf > 0 ? inflatePolygon(piecePolygon, halfKerf) : piecePolygon;

  const scanStep = step || Math.max(1, Math.min(pw, ph, matW, matH) * 0.02);

  // Scan positions (bottom-left packing)
  for (let y = halfKerf; y + ph + halfKerf <= matH; y += scanStep) {
    for (let x = halfKerf; x + pw + halfKerf <= matW; x += scanStep) {
      const candidate = translatePolygon(inflated, x, y);
      
      // Check material bounds
      if (!polygonFitsInMaterial(candidate, matW, matH)) continue;

      // Check against all placed polygons (inflated by kerf)
      let collides = false;
      for (const placed of placedPolygons) {
        if (polygonsOverlap(candidate, placed)) {
          collides = true;
          break;
        }
      }

      if (!collides) return { x, y };
    }
  }

  return null;
}
