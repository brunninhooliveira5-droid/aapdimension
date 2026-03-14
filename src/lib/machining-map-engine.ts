// ── Machining Map Engine ──────────────────────────────────────
// Reconstructs a virtual surface from a previous machining G-code
// and applies Z compensation to a new flat G-code file.
// Completely independent from the Z-Mapping (probe) engine.

import { parseGcodeLine, linearizeArc, fmt, type CncPos, type GcodeAnalysis } from "./z-mapping-engine";

// ── Types ─────────────────────────────────────────────────────

export interface SurfacePoint {
  x: number;
  y: number;
  z: number;
}

export interface ReconstructedSurface {
  points: SurfacePoint[];
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  zMin: number;
  zMax: number;
  gridCols: number;
  gridRows: number;
  spacingX: number;
  spacingY: number;
  /** Height grid [row][col] for fast bilinear lookup */
  grid: (number | null)[][];
}

export interface MachiningMapConfig {
  gridResolution: number; // spacing in work units
  arcSegmentLen: number;
  maxSegmentLen: number;
  decimalPlaces: number;
}

export const defaultMachiningMapConfig: MachiningMapConfig = {
  gridResolution: 5,
  arcSegmentLen: 1,
  maxSegmentLen: 5,
  decimalPlaces: 4,
};

// ── Surface Reconstruction ────────────────────────────────────

/**
 * Parses a machining G-code and extracts the Z heights at every
 * X,Y position the tool visited. Then rasterizes them onto a
 * regular grid for bilinear interpolation.
 */
export function reconstructSurface(
  gcode: string,
  config: MachiningMapConfig
): ReconstructedSurface {
  const lines = gcode.split("\n");
  const rawPoints: SurfacePoint[] = [];

  let curX = 0, curY = 0, curZ = 0, curG = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("(") || trimmed.startsWith(";") || trimmed.startsWith("%")) continue;

    const p = parseGcodeLine(trimmed);
    if (p.g !== undefined) curG = p.g;

    const newX = p.x ?? curX;
    const newY = p.y ?? curY;
    const newZ = p.z ?? curZ;

    // Handle arcs: linearize and collect all intermediate points
    if ((p.g === 2 || p.g === 3) && (p.x !== undefined || p.y !== undefined || p.z !== undefined)) {
      const from: CncPos = { x: curX, y: curY, z: curZ };
      const to: CncPos = { x: newX, y: newY, z: newZ };
      const arcPts = linearizeArc(from, to, p.i ?? 0, p.j ?? 0, p.g === 2, config.arcSegmentLen);
      for (const ap of arcPts) {
        rawPoints.push({ x: ap.x, y: ap.y, z: ap.z });
      }
    } else if ((curG === 0 || curG === 1) && (p.x !== undefined || p.y !== undefined || p.z !== undefined)) {
      // For linear moves, if it's a cutting move (G1) sample intermediate points
      if (curG === 1) {
        const dx = newX - curX;
        const dy = newY - curY;
        const dz = newZ - curZ;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > config.maxSegmentLen) {
          const segs = Math.ceil(dist / config.maxSegmentLen);
          for (let s = 1; s <= segs; s++) {
            const t = s / segs;
            rawPoints.push({ x: curX + dx * t, y: curY + dy * t, z: curZ + dz * t });
          }
        } else {
          rawPoints.push({ x: newX, y: newY, z: newZ });
        }
      } else {
        // G0 rapid – still record position
        rawPoints.push({ x: newX, y: newY, z: newZ });
      }
    }

    curX = newX;
    curY = newY;
    curZ = newZ;
  }

  if (rawPoints.length === 0) {
    return {
      points: [], xMin: 0, yMin: 0, xMax: 0, yMax: 0, zMin: 0, zMax: 0,
      gridCols: 0, gridRows: 0, spacingX: 0, spacingY: 0, grid: [],
    };
  }

  // Find bounds
  let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
  let zMin = Infinity, zMax = -Infinity;
  for (const pt of rawPoints) {
    if (pt.x < xMin) xMin = pt.x;
    if (pt.y < yMin) yMin = pt.y;
    if (pt.x > xMax) xMax = pt.x;
    if (pt.y > yMax) yMax = pt.y;
    if (pt.z < zMin) zMin = pt.z;
    if (pt.z > zMax) zMax = pt.z;
  }

  const width = xMax - xMin || 1;
  const height = yMax - yMin || 1;

  // Build grid
  const gridCols = Math.max(2, Math.round(width / config.gridResolution) + 1);
  const gridRows = Math.max(2, Math.round(height / config.gridResolution) + 1);
  const spacingX = width / (gridCols - 1);
  const spacingY = height / (gridRows - 1);

  // Accumulate Z values per cell
  const accum: { sum: number; count: number }[][] = [];
  for (let r = 0; r < gridRows; r++) {
    accum[r] = [];
    for (let c = 0; c < gridCols; c++) {
      accum[r][c] = { sum: 0, count: 0 };
    }
  }

  for (const pt of rawPoints) {
    const col = Math.round((pt.x - xMin) / spacingX);
    const row = Math.round((pt.y - yMin) / spacingY);
    const c = Math.max(0, Math.min(gridCols - 1, col));
    const r = Math.max(0, Math.min(gridRows - 1, row));
    accum[r][c].sum += pt.z;
    accum[r][c].count++;
  }

  const grid: (number | null)[][] = [];
  for (let r = 0; r < gridRows; r++) {
    grid[r] = [];
    for (let c = 0; c < gridCols; c++) {
      grid[r][c] = accum[r][c].count > 0 ? accum[r][c].sum / accum[r][c].count : null;
    }
  }

  // Fill gaps with nearest neighbor interpolation
  fillGridGaps(grid, gridRows, gridCols);

  return {
    points: rawPoints, xMin, yMin, xMax, yMax, zMin, zMax,
    gridCols, gridRows, spacingX, spacingY, grid,
  };
}

function fillGridGaps(grid: (number | null)[][], rows: number, cols: number) {
  let changed = true;
  let passes = 0;
  while (changed && passes < 50) {
    changed = false;
    passes++;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] !== null) continue;
        let sum = 0, cnt = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] !== null) {
              sum += grid[nr][nc]!;
              cnt++;
            }
          }
        }
        if (cnt > 0) {
          grid[r][c] = sum / cnt;
          changed = true;
        }
      }
    }
  }
}

// ── Bilinear interpolation on reconstructed surface ───────────

export function surfaceInterp(
  x: number,
  y: number,
  surface: ReconstructedSurface
): number {
  const { xMin, yMin, spacingX, spacingY, gridCols, gridRows, grid } = surface;

  const px = Math.max(xMin, Math.min(surface.xMax, x));
  const py = Math.max(yMin, Math.min(surface.yMax, y));

  const colF = (px - xMin) / spacingX;
  const rowF = (py - yMin) / spacingY;

  const col0 = Math.min(Math.floor(colF), gridCols - 2);
  const row0 = Math.min(Math.floor(rowF), gridRows - 2);

  const bl = grid[row0]?.[col0] ?? 0;
  const br = grid[row0]?.[col0 + 1] ?? 0;
  const tl = grid[row0 + 1]?.[col0] ?? 0;
  const tr = grid[row0 + 1]?.[col0 + 1] ?? 0;

  const xFrac = colF - col0;
  const yFrac = rowF - row0;

  const left = bl + (tl - bl) * yFrac;
  const right = br + (tr - br) * yFrac;
  return left + (right - left) * xFrac;
}

// ── Compensated G-code generation ─────────────────────────────

export interface MachiningMapResult {
  code: string;
  fileName: string;
  linesProcessed: number;
  segmentsCreated: number;
  surfacePoints: number;
}

export function generateMachiningMapGcode(
  flatGcode: string,
  surface: ReconstructedSurface,
  config: MachiningMapConfig,
  originalName: string
): MachiningMapResult {
  const lines = flatGcode.split("\n");
  const output: string[] = [];
  const d = (v: number) => fmt(v, config.decimalPlaces);

  let curX = 0, curY = 0, curZ = 0, curG = 0;
  let segmentsCreated = 0;
  let linesProcessed = 0;

  output.push("(==============================================)");
  output.push("(  Mapa por Usinagem - Dimension CNC          )");
  output.push("(  Compensacao via superficie reconstruida     )");
  output.push(`(  Grid: ${surface.gridCols}x${surface.gridRows}  |  Pontos: ${surface.points.length})`);
  output.push("(==============================================)");
  output.push("");

  for (const line of lines) {
    linesProcessed++;
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("(") || trimmed.startsWith(";") || trimmed.startsWith("%")) {
      output.push(line);
      continue;
    }

    const p = parseGcodeLine(trimmed);
    if (p.g !== undefined) curG = p.g;

    const newX = p.x ?? curX;
    const newY = p.y ?? curY;
    const newZ = p.z ?? curZ;

    // Handle arcs: linearize first
    if ((p.g === 2 || p.g === 3)) {
      const from: CncPos = { x: curX, y: curY, z: curZ };
      const to: CncPos = { x: newX, y: newY, z: newZ, f: p.f };
      const arcPts = linearizeArc(from, to, p.i ?? 0, p.j ?? 0, p.g === 2, config.arcSegmentLen);
      for (const seg of arcPts) {
        const offset = surfaceInterp(seg.x, seg.y, surface);
        const cz = seg.z + offset;
        let cmd = `G1 X${d(seg.x)} Y${d(seg.y)} Z${d(cz)}`;
        if (seg.f !== undefined) cmd += ` F${d(seg.f)}`;
        output.push(cmd);
        segmentsCreated++;
      }
      curX = newX; curY = newY; curZ = newZ;
      continue;
    }

    // Only compensate G1 cutting moves
    const isCutMove = curG === 1 && (p.x !== undefined || p.y !== undefined || p.z !== undefined);

    if (!isCutMove) {
      curX = newX; curY = newY; curZ = newZ;
      output.push(line);
      continue;
    }

    // Segment long moves
    const from: CncPos = { x: curX, y: curY, z: curZ };
    const to: CncPos = { x: newX, y: newY, z: newZ, f: p.f };
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const segs = dist > config.maxSegmentLen ? Math.ceil(dist / config.maxSegmentLen) : 1;

    for (let s = 1; s <= segs; s++) {
      const t = s / segs;
      const sx = from.x + dx * t;
      const sy = from.y + dy * t;
      const sz = from.z + dz * t;
      const offset = surfaceInterp(sx, sy, surface);
      const cz = sz + offset;
      let cmd = `G1 X${d(sx)} Y${d(sy)} Z${d(cz)}`;
      if (to.f !== undefined && s === 1) cmd += ` F${d(to.f)}`;
      output.push(cmd);
      segmentsCreated++;
    }

    curX = newX; curY = newY; curZ = newZ;
  }

  const baseName = originalName.replace(/\.[^.]+$/, "");

  return {
    code: output.join("\n"),
    fileName: `MM_${baseName}.tap`,
    linesProcessed,
    segmentsCreated,
    surfacePoints: surface.points.length,
  };
}
