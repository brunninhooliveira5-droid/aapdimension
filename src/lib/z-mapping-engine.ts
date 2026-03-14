// ── Z-Mapping Engine ──────────────────────────────────────────
// Modules: G-code parser, unit detector, work area detector,
// mesh generator, point importer, bilinear interpolation,
// segment splitter, arc linearizer, probe G-code generator,
// compensated G-code generator, numeric formatter.

export type ZUnit = "mm" | "inch";

export interface GcodeAnalysis {
  unit: ZUnit | null;
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  width: number;
  height: number;
  lineCount: number;
  arcCount: number;
}

export interface MeshConfig {
  unit: ZUnit;
  xStart: number;
  yStart: number;
  width: number;
  height: number;
  spacing: number;
  probeFeed: number;
  probeDepth: number;
  clearance: number;
  safeHeight: number;
  maxSegmentLen: number;
  arcSegmentLen: number;
  decimalPlaces: number;
  outOfMeshRule: "block" | "warn" | "nearest";
  tolerance: number;
}

export interface MeshPoint {
  x: number;
  y: number;
  z: number | null;
}

export interface MeshInfo {
  pointsPerRow: number;
  rows: number;
  totalPoints: number;
  actualSpacingX: number;
  actualSpacingY: number;
  points: MeshPoint[];
  estimatedTimeSec: number;
}

export const defaultConfigMM: Omit<MeshConfig, "xStart" | "yStart" | "width" | "height"> = {
  unit: "mm",
  spacing: 10,
  probeFeed: 100,
  probeDepth: -1,
  clearance: 2,
  safeHeight: 20,
  maxSegmentLen: 5,
  arcSegmentLen: 1,
  decimalPlaces: 5,
  outOfMeshRule: "warn",
  tolerance: 0.001,
};

export const defaultConfigInch: Omit<MeshConfig, "xStart" | "yStart" | "width" | "height"> = {
  unit: "inch",
  spacing: 0.375,
  probeFeed: 5,
  probeDepth: -0.0625,
  clearance: 0.125,
  safeHeight: 1,
  maxSegmentLen: 0.187,
  arcSegmentLen: 0.04,
  decimalPlaces: 5,
  outOfMeshRule: "warn",
  tolerance: 0.0001,
};

// ── Numeric formatter ─────────────────────────────────────────
export function fmt(v: number, dp = 5): string {
  const s = v.toFixed(dp);
  return s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

// ── G-code parser & analyzer ──────────────────────────────────
export interface ParsedMove {
  x?: number;
  y?: number;
  z?: number;
  i?: number;
  j?: number;
  r?: number;
  g?: number;
  f?: number;
  raw: string;
}

export function parseGcodeLine(line: string): ParsedMove {
  const raw = line.trim();
  const upper = raw.toUpperCase();
  const res: ParsedMove = { raw };
  const gm = upper.match(/G(\d+)/);
  if (gm) res.g = parseInt(gm[1], 10);
  const xm = upper.match(/X([+-]?\d*\.?\d+)/);
  if (xm) res.x = parseFloat(xm[1]);
  const ym = upper.match(/Y([+-]?\d*\.?\d+)/);
  if (ym) res.y = parseFloat(ym[1]);
  const zm = upper.match(/Z([+-]?\d*\.?\d+)/);
  if (zm) res.z = parseFloat(zm[1]);
  const im = upper.match(/I([+-]?\d*\.?\d+)/);
  if (im) res.i = parseFloat(im[1]);
  const jm = upper.match(/J([+-]?\d*\.?\d+)/);
  if (jm) res.j = parseFloat(jm[1]);
  const rm = upper.match(/R([+-]?\d*\.?\d+)/);
  if (rm) res.r = parseFloat(rm[1]);
  const fm = upper.match(/F([+-]?\d*\.?\d+)/);
  if (fm) res.f = parseFloat(fm[1]);
  return res;
}

export function analyzeGcode(text: string): GcodeAnalysis {
  const lines = text.split("\n");
  let unit: ZUnit | null = null;
  let curX = 0, curY = 0, curZ = 0;
  let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
  let found = false;
  let arcCount = 0;
  let curG = 0;

  for (const line of lines) {
    const p = parseGcodeLine(line);
    if (p.g === 21) unit = "mm";
    if (p.g === 20) unit = "inch";
    if (p.g !== undefined) curG = p.g;
    if (p.g === 2 || p.g === 3) arcCount++;
    if (p.x !== undefined) curX = p.x;
    if (p.y !== undefined) curY = p.y;
    if (p.z !== undefined) curZ = p.z;
    if (curZ < 0 && (p.x !== undefined || p.y !== undefined)) {
      xMin = Math.min(xMin, curX);
      yMin = Math.min(yMin, curY);
      xMax = Math.max(xMax, curX);
      yMax = Math.max(yMax, curY);
      found = true;
    }
  }

  if (!found) {
    xMin = yMin = xMax = yMax = 0;
  }

  return {
    unit, xMin, yMin, xMax, yMax,
    width: xMax - xMin, height: yMax - yMin,
    lineCount: lines.length, arcCount,
  };
}

// ── Arc linearizer ────────────────────────────────────────────
export interface CncPos { x: number; y: number; z: number; f?: number }

export function linearizeArc(
  from: CncPos,
  to: CncPos,
  i: number,
  j: number,
  clockwise: boolean,
  segLen: number,
): CncPos[] {
  const cx = from.x + i;
  const cy = from.y + j;
  const r = Math.sqrt(i * i + j * j);

  let startAngle = Math.atan2(from.y - cy, from.x - cx);
  let endAngle = Math.atan2(to.y - cy, to.x - cx);

  // Compute sweep
  let sweep: number;
  if (clockwise) {
    sweep = startAngle - endAngle;
    if (sweep <= 0) sweep += 2 * Math.PI;
  } else {
    sweep = endAngle - startAngle;
    if (sweep <= 0) sweep += 2 * Math.PI;
  }

  const arcLength = r * sweep;
  const numSegs = Math.max(2, Math.ceil(arcLength / segLen));
  const result: CncPos[] = [];
  const dz = to.z - from.z;

  for (let s = 1; s <= numSegs; s++) {
    const t = s / numSegs;
    const angle = clockwise
      ? startAngle - sweep * t
      : startAngle + sweep * t;
    result.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      z: from.z + dz * t,
      f: to.f,
    });
  }

  // Ensure last point matches exactly
  if (result.length > 0) {
    const last = result[result.length - 1];
    last.x = to.x;
    last.y = to.y;
    last.z = to.z;
  }

  return result;
}

// ── Mesh generator ────────────────────────────────────────────
export function generateMesh(cfg: MeshConfig): MeshInfo {
  const spacesX = Math.max(1, Math.round(cfg.width / cfg.spacing));
  const spacesY = Math.max(1, Math.round(cfg.height / cfg.spacing));
  const actualSpacingX = cfg.width / spacesX;
  const actualSpacingY = cfg.height / spacesY;
  const pointsPerRow = spacesX + 1;
  const rows = spacesY + 1;
  const points: MeshPoint[] = [];

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < pointsPerRow; i++) {
      points.push({
        x: cfg.xStart + i * actualSpacingX,
        y: cfg.yStart + j * actualSpacingY,
        z: null,
      });
    }
  }

  const estimatedTimeSec = points.length * 2;

  return { pointsPerRow, rows, totalPoints: points.length, actualSpacingX, actualSpacingY, points, estimatedTimeSec };
}

// ── Density analysis ──────────────────────────────────────────
export interface DensityCell {
  pathLength: number;
  passages: number;
  dirChanges: number;
  density: "low" | "medium" | "high";
}

export interface DensityMap {
  cellsX: number;
  cellsY: number;
  cellW: number;
  cellH: number;
  cells: DensityCell[][];
  maxPathLen: number;
  avgPathLen: number;
}

export function analyzeDensity(
  gcode: string,
  xStart: number,
  yStart: number,
  width: number,
  height: number,
  cellsX: number,
  cellsY: number,
  arcSegLen: number
): DensityMap {
  const cellW = width / cellsX;
  const cellH = height / cellsY;
  const cells: DensityCell[][] = [];
  for (let r = 0; r < cellsY; r++) {
    cells[r] = [];
    for (let c = 0; c < cellsX; c++) {
      cells[r][c] = { pathLength: 0, passages: 0, dirChanges: 0, density: "low" };
    }
  }

  const lines = gcode.split("\n");
  let curX = 0, curY = 0, curZ = 0, curG = 0;
  let prevDx = 0, prevDy = 0;

  function cellAt(x: number, y: number): [number, number] | null {
    const c = Math.floor((x - xStart) / cellW);
    const r = Math.floor((y - yStart) / cellH);
    if (c < 0 || c >= cellsX || r < 0 || r >= cellsY) return null;
    return [r, c];
  }

  function addSegment(x0: number, y0: number, x1: number, y1: number) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) return;

    // Register in destination cell
    const dest = cellAt(x1, y1);
    if (dest) {
      const [r, c] = dest;
      cells[r][c].pathLength += len;
      cells[r][c].passages++;
      // Direction change detection
      if (prevDx !== 0 || prevDy !== 0) {
        const dot = dx * prevDx + dy * prevDy;
        const cross = dx * prevDy - dy * prevDx;
        if (Math.abs(cross) > len * 0.3 || dot < 0) {
          cells[r][c].dirChanges++;
        }
      }
    }
    prevDx = dx;
    prevDy = dy;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("(") || trimmed.startsWith(";") || trimmed.startsWith("%")) continue;
    const p = parseGcodeLine(trimmed);
    if (p.g !== undefined) curG = p.g;

    const newX = p.x ?? curX;
    const newY = p.y ?? curY;
    const newZ = p.z ?? curZ;

    if ((p.g === 2 || p.g === 3) && newZ < 0) {
      const from: CncPos = { x: curX, y: curY, z: curZ };
      const to: CncPos = { x: newX, y: newY, z: newZ };
      const arcPts = linearizeArc(from, to, p.i ?? 0, p.j ?? 0, p.g === 2, arcSegLen);
      let prev = from;
      for (const ap of arcPts) {
        addSegment(prev.x, prev.y, ap.x, ap.y);
        prev = ap;
      }
    } else if (curG === 1 && newZ < 0 && (p.x !== undefined || p.y !== undefined)) {
      addSegment(curX, curY, newX, newY);
    }

    curX = newX; curY = newY; curZ = newZ;
  }

  // Calculate thresholds
  let maxPathLen = 0;
  let totalLen = 0;
  let cellCount = 0;
  for (let r = 0; r < cellsY; r++) {
    for (let c = 0; c < cellsX; c++) {
      const cell = cells[r][c];
      const score = cell.pathLength + cell.dirChanges * 5;
      if (score > 0) {
        totalLen += score;
        cellCount++;
      }
      if (score > maxPathLen) maxPathLen = score;
    }
  }
  const avgPathLen = cellCount > 0 ? totalLen / cellCount : 0;
  const highThreshold = avgPathLen * 1.5;
  const lowThreshold = avgPathLen * 0.5;

  for (let r = 0; r < cellsY; r++) {
    for (let c = 0; c < cellsX; c++) {
      const cell = cells[r][c];
      const score = cell.pathLength + cell.dirChanges * 5;
      if (score >= highThreshold) cell.density = "high";
      else if (score >= lowThreshold) cell.density = "medium";
      else cell.density = "low";
    }
  }

  return { cellsX, cellsY, cellW, cellH, cells, maxPathLen, avgPathLen };
}

// ── Adaptive mesh generator ───────────────────────────────────
export function generateAdaptiveMesh(
  cfg: MeshConfig,
  densityMap: DensityMap,
  spacingMultiplierLow: number,    // e.g. 2.0
  spacingMultiplierHigh: number,   // e.g. 0.5
): MeshInfo {
  // Strategy: use a fine base grid, then thin points in low-density areas
  // This keeps the grid regular (required for bilinear interpolation)
  // but uses the densest spacing needed anywhere
  
  // Find the densest region to determine fine spacing
  const baseSpacing = cfg.spacing;
  const fineSpacing = baseSpacing * spacingMultiplierHigh;
  const coarseSpacing = baseSpacing * spacingMultiplierLow;
  
  // Build the grid at fine resolution
  const fineSpacesX = Math.max(1, Math.round(cfg.width / fineSpacing));
  const fineSpacesY = Math.max(1, Math.round(cfg.height / fineSpacing));
  const fineActualX = cfg.width / fineSpacesX;
  const fineActualY = cfg.height / fineSpacesY;
  const fineCols = fineSpacesX + 1;
  const fineRows = fineSpacesY + 1;
  
  // For each fine grid point, check if it should be kept
  const keepPoint: boolean[][] = [];
  for (let r = 0; r < fineRows; r++) {
    keepPoint[r] = [];
    for (let c = 0; c < fineCols; c++) {
      // Always keep boundary points
      if (r === 0 || r === fineRows - 1 || c === 0 || c === fineCols - 1) {
        keepPoint[r][c] = true;
        continue;
      }
      
      const px = cfg.xStart + c * fineActualX;
      const py = cfg.yStart + r * fineActualY;
      
      // Find which density cell this point is in
      const dc = Math.min(Math.floor((px - cfg.xStart) / densityMap.cellW), densityMap.cellsX - 1);
      const dr = Math.min(Math.floor((py - cfg.yStart) / densityMap.cellH), densityMap.cellsY - 1);
      const density = (dc >= 0 && dr >= 0) ? densityMap.cells[dr][dc].density : "medium";
      
      // Determine skip interval based on density
      let skipInterval: number;
      if (density === "high") {
        skipInterval = 1; // keep every point
      } else if (density === "medium") {
        skipInterval = Math.max(1, Math.round(baseSpacing / fineActualX));
      } else {
        skipInterval = Math.max(1, Math.round(coarseSpacing / fineActualX));
      }
      
      const skipIntervalY = density === "high" ? 1 
        : density === "medium" ? Math.max(1, Math.round(baseSpacing / fineActualY))
        : Math.max(1, Math.round(coarseSpacing / fineActualY));
      
      keepPoint[r][c] = (r % skipIntervalY === 0) && (c % skipInterval === 0);
    }
  }
  
  // Collect ALL grid points (full rectangular grid required for bilinear macro interpolation)
  // The adaptive analysis informs density display but the probe must visit every grid node
  // because the G-code compensation uses #500+gridIndex addressing.
  const points: MeshPoint[] = [];
  for (let r = 0; r < fineRows; r++) {
    for (let c = 0; c < fineCols; c++) {
      points.push({
        x: cfg.xStart + c * fineActualX,
        y: cfg.yStart + r * fineActualY,
        z: null,
      });
    }
  }
  
  const estimatedTimeSec = points.length * 2;
  
  return {
    pointsPerRow: fineCols,
    rows: fineRows,
    totalPoints: points.length,
    actualSpacingX: fineActualX,
    actualSpacingY: fineActualY,
    points,
    estimatedTimeSec,
  };
}

// ── Regular mesh for "maximum" mode ───────────────────────────
export function generateDenseMesh(cfg: MeshConfig, factor: number): MeshInfo {
  const denseSpacing = cfg.spacing * factor;
  const spacesX = Math.max(1, Math.round(cfg.width / denseSpacing));
  const spacesY = Math.max(1, Math.round(cfg.height / denseSpacing));
  const actualSpacingX = cfg.width / spacesX;
  const actualSpacingY = cfg.height / spacesY;
  const pointsPerRow = spacesX + 1;
  const rows = spacesY + 1;
  const points: MeshPoint[] = [];

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < pointsPerRow; i++) {
      points.push({
        x: cfg.xStart + i * actualSpacingX,
        y: cfg.yStart + j * actualSpacingY,
        z: null,
      });
    }
  }

  const estimatedTimeSec = points.length * 2;
  return { pointsPerRow, rows, totalPoints: points.length, actualSpacingX, actualSpacingY, points, estimatedTimeSec };
}

// ── Probe G-code generators ────────────────────────────────────
export type ControllerType = "mach3" | "generic";

// ── Retraction mode types ─────────────────────────────────────
export type RetractionMode = "standard" | "safe" | "curved";

export interface RetractionConfig {
  mode: RetractionMode;
  minSafeZ: number;
  adaptiveClearance: number;
  reinforcedClearance: number;
}

// ── Custom probe types ────────────────────────────────────────
export type ProbeType = "standard" | "custom";

export interface CustomProbeConfig {
  enabled: boolean;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  startCommand: string;   // e.g. "M11"
  startDwell: number;     // seconds
  startSafeZ: number;
  endCommand: string;     // e.g. "M10"
  endDwell: number;       // seconds
  endSafeZ: number;
}

export function generateProbeGcode(
  mesh: MeshInfo,
  cfg: MeshConfig,
  controller: ControllerType,
  originalName: string
): { code: string; fileName: string } {
  const d = (v: number) => fmt(v, cfg.decimalPlaces);
  const unitCmd = cfg.unit === "mm" ? "G21" : "G20";
  const lines: string[] = [];

  lines.push(`(Z-Mapping Probe Routine)`);
  lines.push(`(Generated by Dimension - Mapeamento Z)`);
  lines.push(`(Controller: ${controller === "mach3" ? "Mach3" : "Generic"})`);
  lines.push(`(Points: ${mesh.totalPoints})`);
  lines.push(`(Grid: ${mesh.pointsPerRow} x ${mesh.rows})`);
  lines.push("");
  lines.push(unitCmd);
  lines.push("G90");
  lines.push("");

  const firstPt = mesh.points[0];
  lines.push(`G0 Z${d(cfg.safeHeight)}`);
  lines.push(`G0 X${d(firstPt.x)} Y${d(firstPt.y)}`);

  if (controller === "mach3") {
    lines.push(`G31 Z${d(cfg.probeDepth)} F${d(cfg.probeFeed)}`);
    lines.push(`G92 Z0`);
    lines.push(`G0 Z${d(cfg.clearance)}`);
    lines.push("");
  }

  let ptIndex = 0;
  for (let row = 0; row < mesh.rows; row++) {
    const leftToRight = row % 2 === 0;
    for (let col = 0; col < mesh.pointsPerRow; col++) {
      const idx = leftToRight
        ? row * mesh.pointsPerRow + col
        : row * mesh.pointsPerRow + (mesh.pointsPerRow - 1 - col);
      const pt = mesh.points[idx];

      lines.push(`(Point ${ptIndex})`);
      lines.push(`G0 X${d(pt.x)} Y${d(pt.y)}`);

      if (controller === "mach3") {
        lines.push(`G31 Z${d(cfg.probeDepth)} F${d(cfg.probeFeed)}`);
        lines.push(`#${500 + ptIndex} = #2002`);
        lines.push(`G0 Z${d(cfg.clearance)}`);
      } else {
        lines.push(`G38.2 Z${d(cfg.probeDepth)} F${d(cfg.probeFeed)}`);
        lines.push(`#${500 + ptIndex} = #5063`);
        lines.push(`G0 Z${d(cfg.clearance)}`);
      }
      lines.push("");
      ptIndex++;
    }
  }

  lines.push(`G0 Z${d(cfg.safeHeight)}`);
  lines.push(`M0 (Remove probe, then cycle start)`);
  lines.push(`M30`);

  const ext = controller === "mach3" ? "tap" : "nc";
  const baseName = originalName.replace(/\.[^.]+$/, "");
  return { code: lines.join("\n"), fileName: `MZ_Probe_${baseName}.${ext}` };
}

// ── Point importer ────────────────────────────────────────────
export function importProbeData(text: string, mesh: MeshInfo): MeshPoint[] {
  const values: number[] = [];
  const tokens = text.replace(/,/g, " ").split(/\s+/);
  for (const t of tokens) {
    const n = parseFloat(t);
    if (!isNaN(n)) values.push(n);
  }

  const points = [...mesh.points];

  if (values.length >= mesh.totalPoints * 3) {
    for (let i = 0; i < mesh.totalPoints; i++) {
      points[i] = { x: values[i * 3], y: values[i * 3 + 1], z: values[i * 3 + 2] };
    }
  } else if (values.length >= mesh.totalPoints) {
    for (let row = 0; row < mesh.rows; row++) {
      const leftToRight = row % 2 === 0;
      for (let col = 0; col < mesh.pointsPerRow; col++) {
        const srcIdx = row * mesh.pointsPerRow + col;
        const meshIdx = leftToRight
          ? row * mesh.pointsPerRow + col
          : row * mesh.pointsPerRow + (mesh.pointsPerRow - 1 - col);
        points[meshIdx] = { ...points[meshIdx], z: values[srcIdx] };
      }
    }
  }

  return points;
}

// ── Bilinear interpolation ────────────────────────────────────
function bilinearInterp(
  x: number,
  y: number,
  mesh: MeshInfo,
  probeData: MeshPoint[],
  cfg: MeshConfig
): number | null {
  const { xStart, yStart, width, height } = cfg;
  const xEnd = xStart + width;
  const yEnd = yStart + height;

  let px = x, py = y;

  if (cfg.outOfMeshRule === "nearest") {
    px = Math.max(xStart, Math.min(xEnd, px));
    py = Math.max(yStart, Math.min(yEnd, py));
  } else if (px < xStart - cfg.tolerance || px > xEnd + cfg.tolerance ||
             py < yStart - cfg.tolerance || py > yEnd + cfg.tolerance) {
    return cfg.outOfMeshRule === "block" ? null : 0;
  }

  px = Math.max(xStart, Math.min(xEnd, px));
  py = Math.max(yStart, Math.min(yEnd, py));

  const colF = (px - xStart) / mesh.actualSpacingX;
  const rowF = (py - yStart) / mesh.actualSpacingY;

  const col0 = Math.min(Math.floor(colF), mesh.pointsPerRow - 2);
  const row0 = Math.min(Math.floor(rowF), mesh.rows - 2);
  const col1 = col0 + 1;
  const row1 = row0 + 1;

  const bl = probeData[row0 * mesh.pointsPerRow + col0];
  const br = probeData[row0 * mesh.pointsPerRow + col1];
  const tl = probeData[row1 * mesh.pointsPerRow + col0];
  const tr = probeData[row1 * mesh.pointsPerRow + col1];

  if (bl.z === null || br.z === null || tl.z === null || tr.z === null) return null;

  const xFrac = (colF - col0);
  const yFrac = (rowF - row0);

  const left = bl.z + (tl.z - bl.z) * yFrac;
  const right = br.z + (tr.z - br.z) * yFrac;
  return left + (right - left) * xFrac;
}

// ── Segment splitter ──────────────────────────────────────────
export function segmentMove(from: CncPos, to: CncPos, maxLen: number): CncPos[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist <= maxLen) return [to];

  const segs = Math.ceil(dist / maxLen);
  const result: CncPos[] = [];
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    result.push({
      x: from.x + dx * t,
      y: from.y + dy * t,
      z: from.z + dz * t,
      f: to.f,
    });
  }
  return result;
}

// ── Compensated G-code generator ──────────────────────────────
export interface CompensationResult {
  code: string;
  fileName: string;
  linesProcessed: number;
  segmentsCreated: number;
  meshValid: boolean;
}

export function generateCompensatedGcode(
  originalGcode: string,
  mesh: MeshInfo,
  probeData: MeshPoint[],
  cfg: MeshConfig,
  originalName: string,
  controller: ControllerType
): CompensationResult {
  const lines = originalGcode.split("\n");
  const output: string[] = [];
  let curX = 0, curY = 0, curZ = 0;
  let curG = 0;
  let segmentsCreated = 0;
  let linesProcessed = 0;

  const d = (v: number) => fmt(v, cfg.decimalPlaces);
  const allHaveZ = probeData.every((p) => p.z !== null);

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

    // Only compensate G1 with Z < 0
    const isCutMove = (curG === 1) && newZ < 0 && (p.x !== undefined || p.y !== undefined || p.z !== undefined);

    if (!isCutMove) {
      if (p.x !== undefined || p.y !== undefined || p.z !== undefined) {
        if (newZ < 0 && curG === 1) {
          // handled below
        } else {
          curX = newX; curY = newY; curZ = newZ;
          output.push(line);
          continue;
        }
      } else {
        output.push(line);
        continue;
      }
    }

    const from: CncPos = { x: curX, y: curY, z: curZ };
    const to: CncPos = { x: newX, y: newY, z: newZ, f: p.f };
    const segments = segmentMove(from, to, cfg.maxSegmentLen);

    for (const seg of segments) {
      const offset = bilinearInterp(seg.x, seg.y, mesh, probeData, cfg);
      const compensatedZ = offset !== null ? seg.z + offset : seg.z;

      let cmd = `G1 X${d(seg.x)} Y${d(seg.y)} Z${d(compensatedZ)}`;
      if (seg.f !== undefined) cmd += ` F${d(seg.f)}`;
      output.push(cmd);
      segmentsCreated++;
    }

    curX = newX; curY = newY; curZ = newZ;
  }

  const ext = controller === "mach3" ? "tap" : "nc";
  const baseName = originalName.replace(/\.[^.]+$/, "");

  return {
    code: output.join("\n"),
    fileName: `MZ_${baseName}.${ext}`,
    linesProcessed, segmentsCreated, meshValid: allHaveZ,
  };
}

// ── Unified G-code generator (probe + pause + compensated cut) ──
export interface UnifiedResult {
  code: string;
  fileName: string;
  totalPoints: number;
  estimatedProbeSec: number;
  arcsDetected: number;
  arcSegmentsGenerated: number;
}

export function generateUnifiedGcode(
  originalGcode: string,
  mesh: MeshInfo,
  cfg: MeshConfig,
  originalName: string,
  controller: ControllerType,
  touchesPerPoint: number = 1,
  touchStrategy: "last" | "average" = "last",
  retractionConfig?: RetractionConfig,
  customProbe?: CustomProbeConfig
): UnifiedResult {
  const d = (v: number) => fmt(v, cfg.decimalPlaces);
  const unitCmd = cfg.unit === "mm" ? "G21" : "G20";
  const lines: string[] = [];
  const probeVar = controller === "mach3" ? "#2002" : "#5063";
  const probeCmd = controller === "mach3" ? "G31" : "G38.2";

  let arcsDetected = 0;
  let arcSegmentsGenerated = 0;

  // ── Header ──
  lines.push("(==============================================)");
  lines.push("(  Nivelamento Automatico - Dimension CNC     )");
  lines.push("(  Mapeamento + Compensacao em arquivo unico  )");
  lines.push(`(  Pontos: ${mesh.totalPoints}  |  Grade: ${mesh.pointsPerRow}x${mesh.rows})`);
  lines.push(`(  Controller: ${controller === "mach3" ? "Mach3" : "Generic"})`);
  lines.push("(==============================================)");
  lines.push("");
  lines.push(unitCmd);
  lines.push("G90");
  lines.push("");

  // ── Part 1: Probe routine ──
  lines.push("(--- INICIO DO MAPEAMENTO DA SUPERFICIE ---)");
  lines.push("");

  // ── Custom probe: start commands ──
  const useCustomProbe = customProbe?.enabled ?? false;
  const probeOffX = customProbe?.offsetX ?? 0;
  const probeOffY = customProbe?.offsetY ?? 0;

  if (useCustomProbe && customProbe) {
    lines.push("(--- ACIONAMENTO DO PROBE PERSONALIZADO ---)");
    lines.push(`G0 Z${d(customProbe.startSafeZ)}`);
    if (customProbe.startCommand.trim()) {
      lines.push(customProbe.startCommand.trim());
    }
    if (customProbe.startDwell > 0) {
      lines.push(`G4 P${customProbe.startDwell}`);
    }
    lines.push("");
  }

  const firstPt = mesh.points[0];
  lines.push(`G0 Z${d(cfg.safeHeight)}`);
  lines.push(`G0 X${d(firstPt.x + probeOffX)} Y${d(firstPt.y + probeOffY)}`);

  if (controller === "mach3") {
    lines.push(`${probeCmd} Z${d(cfg.probeDepth)} F${d(cfg.probeFeed)}`);
    lines.push("G92 Z0");
    lines.push(`G0 Z${d(cfg.clearance)}`);
    lines.push("");
  }

  // Serpentine scan — store in variables using GRID index
  const touches = Math.max(1, Math.min(5, touchesPerPoint));
  const retMode = retractionConfig?.mode ?? "standard";
  const retMinSafeZ = retractionConfig?.minSafeZ ?? cfg.clearance;
  const retAdaptive = retractionConfig?.adaptiveClearance ?? (cfg.unit === "mm" ? 3 : 0.12);
  const retReinforced = retractionConfig?.reinforcedClearance ?? (cfg.unit === "mm" ? 5 : 0.2);

  // Variables used for adaptive retraction:
  // #490 = last measured Z, #491 = previous measured Z
  if (retMode !== "standard") {
    lines.push("(Retracao adaptativa ativada)");
    lines.push(`#490 = 0`);
    lines.push(`#491 = 0`);
    lines.push("");
  }

  let scanCount = 0;
  for (let row = 0; row < mesh.rows; row++) {
    const ltr = row % 2 === 0;
    for (let col = 0; col < mesh.pointsPerRow; col++) {
      const actualCol = ltr ? col : (mesh.pointsPerRow - 1 - col);
      const gridIdx = row * mesh.pointsPerRow + actualCol;
      const pt = mesh.points[gridIdx];

      lines.push(`(Ponto ${scanCount} -> #${500 + gridIdx})`);

      // ── Retraction logic between points ──
      if (retMode === "standard") {
        lines.push(`G0 Z${d(cfg.clearance)}`);
      } else if (retMode === "safe") {
        // Z_desl = max(Z_seguro_min, ultimo_Z + folga_adaptativa)
        if (scanCount === 0) {
          lines.push(`G0 Z${d(cfg.clearance)}`);
        } else {
          lines.push(`#492 = ${d(retMinSafeZ)}`);
          lines.push(`#493 = [#490 + ${d(retAdaptive)}]`);
          lines.push("(Usar o maior entre Z minimo e Z adaptativo)");
          lines.push("IF [#493 GT #492] THEN #492 = #493");
          lines.push("G0 Z#492");
        }
      } else {
        // curved: Z_desl = max(Z_seguro_min, ultimo_Z, Z_anterior) + folga_reforçada
        if (scanCount === 0) {
          lines.push(`G0 Z${d(cfg.clearance)}`);
        } else {
          lines.push(`#492 = ${d(retMinSafeZ)}`);
          lines.push("(Maior entre Z minimo, ultimo Z e Z anterior)");
          lines.push("IF [#490 GT #492] THEN #492 = #490");
          lines.push("IF [#491 GT #492] THEN #492 = #491");
          lines.push(`#492 = [#492 + ${d(retReinforced)}]`);
          lines.push("G0 Z#492");
        }
      }

      lines.push(`G0 X${d(pt.x + probeOffX)} Y${d(pt.y + probeOffY)}`);

      if (touches === 1) {
        lines.push(`${probeCmd} Z${d(cfg.probeDepth)} F${d(cfg.probeFeed)}`);
        lines.push(`#${500 + gridIdx} = ${probeVar}`);
      } else {
        // Multi-touch: first touch faster, subsequent slower for refinement
        for (let t = 0; t < touches; t++) {
          const feed = t === 0 ? cfg.probeFeed : cfg.probeFeed * 0.5;
          lines.push(`${probeCmd} Z${d(cfg.probeDepth)} F${d(feed)}`);
          if (touchStrategy === "average") {
            if (t === 0) {
              lines.push(`#${500 + gridIdx} = ${probeVar}`);
            } else {
              lines.push(`#${500 + gridIdx} = [#${500 + gridIdx} + ${probeVar}] / 2`);
            }
          } else {
            // "last" strategy — always overwrite
            lines.push(`#${500 + gridIdx} = ${probeVar}`);
          }
          if (t < touches - 1) {
            lines.push(`G0 Z${d(cfg.clearance)}`);
          }
        }
      }
      // Update retraction tracking variables after probe
      if (retMode !== "standard") {
        lines.push(`#491 = #490`);
        lines.push(`#490 = #${500 + gridIdx}`);
      }

      scanCount++;
    }
  }

  lines.push("");
  lines.push(`G0 Z${d(cfg.safeHeight)}`);
  lines.push(`G0 X${d(cfg.xStart)} Y${d(cfg.yStart)}`);
  lines.push("");
  lines.push("(--- FIM DO MAPEAMENTO ---)");
  lines.push("");
  lines.push("(============================================)");
  lines.push("( ATENCAO: Remova o sensor de medicao.       )");
  lines.push("( Coloque a fresa de usinagem.               )");
  lines.push("( Zere o eixo Z novamente na superficie.     )");
  lines.push("( Pressione INICIAR para continuar.          )");
  lines.push("(============================================)");
  lines.push("M0");
  lines.push("");

  // ── Part 2: Compensated original G-code using macro variables ──
  lines.push("(--- INICIO DA USINAGEM COMPENSADA ---)");
  lines.push("");

  const origLines = originalGcode.split("\n");
  let curX = 0, curY = 0, curZ = 0;
  let curG = 0;
  let curF: number | undefined;

  // Helper: emit compensated linear segments with macro math
  function emitCompensatedSegments(segments: CncPos[]) {
    for (const seg of segments) {
      const { xStart, yStart, width: w, height: h } = cfg;
      const xEnd = xStart + w;
      const yEnd = yStart + h;
      const px = Math.max(xStart, Math.min(xEnd, seg.x));
      const py = Math.max(yStart, Math.min(yEnd, seg.y));

      const colF = (px - xStart) / mesh.actualSpacingX;
      const rowF = (py - yStart) / mesh.actualSpacingY;
      const col0 = Math.min(Math.floor(colF), mesh.pointsPerRow - 2);
      const row0 = Math.min(Math.floor(rowF), mesh.rows - 2);
      const col1 = col0 + 1;
      const row1 = row0 + 1;

      const blIdx = row0 * mesh.pointsPerRow + col0;
      const brIdx = row0 * mesh.pointsPerRow + col1;
      const tlIdx = row1 * mesh.pointsPerRow + col0;
      const trIdx = row1 * mesh.pointsPerRow + col1;

      const xFrac = colF - col0;
      const yFrac = rowF - row0;

      lines.push(`#100 = [#${500 + blIdx} + [#${500 + tlIdx} - #${500 + blIdx}] * ${d(yFrac)}]`);
      lines.push(`#101 = [#${500 + brIdx} + [#${500 + trIdx} - #${500 + brIdx}] * ${d(yFrac)}]`);
      lines.push(`#102 = [#100 + [#101 - #100] * ${d(xFrac)}]`);
      lines.push(`#103 = [${d(seg.z)} + #102]`);

      let cmd = `G1 X${d(seg.x)} Y${d(seg.y)} Z#103`;
      if (seg.f !== undefined) cmd += ` F${d(seg.f)}`;
      lines.push(cmd);
    }
  }

  for (const line of origLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("(") || trimmed.startsWith(";") || trimmed.startsWith("%")) {
      lines.push(line);
      continue;
    }

    const p = parseGcodeLine(trimmed);
    if (p.g !== undefined) curG = p.g;
    if (p.f !== undefined) curF = p.f;

    const newX = p.x ?? curX;
    const newY = p.y ?? curY;
    const newZ = p.z ?? curZ;

    // ── Handle arcs G2/G3 ──
    if ((curG === 2 || curG === 3) && (p.g === 2 || p.g === 3)) {
      const iVal = p.i ?? 0;
      const jVal = p.j ?? 0;
      const clockwise = (p.g === 2);

      const from: CncPos = { x: curX, y: curY, z: curZ };
      const to: CncPos = { x: newX, y: newY, z: newZ, f: p.f ?? curF };

      arcsDetected++;
      const arcPoints = linearizeArc(from, to, iVal, jVal, clockwise, cfg.arcSegmentLen);
      arcSegmentsGenerated += arcPoints.length;

      if (newZ < 0) {
        // Further segment each arc linear piece and compensate
        let prevPos = from;
        for (const ap of arcPoints) {
          const subSegments = segmentMove(prevPos, ap, cfg.maxSegmentLen);
          emitCompensatedSegments(subSegments);
          prevPos = ap;
        }
      } else {
        // Not cutting, just emit linearized as plain G1
        for (const ap of arcPoints) {
          let cmd = `G1 X${d(ap.x)} Y${d(ap.y)} Z${d(ap.z)}`;
          if (ap.f !== undefined) cmd += ` F${d(ap.f)}`;
          lines.push(cmd);
        }
      }

      curX = newX; curY = newY; curZ = newZ;
      continue;
    }

    // ── Handle linear moves ──
    const isCutMove = curG === 1 && newZ < 0 && (p.x !== undefined || p.y !== undefined || p.z !== undefined);

    if (!isCutMove) {
      if (p.x !== undefined || p.y !== undefined || p.z !== undefined) {
        if (newZ < 0 && curG === 1) {
          // fall through to compensation
        } else {
          curX = newX; curY = newY; curZ = newZ;
          lines.push(line);
          continue;
        }
      } else {
        lines.push(line);
        continue;
      }
    }

    const from: CncPos = { x: curX, y: curY, z: curZ };
    const to: CncPos = { x: newX, y: newY, z: newZ, f: p.f };
    const segments = segmentMove(from, to, cfg.maxSegmentLen);
    emitCompensatedSegments(segments);

    curX = newX; curY = newY; curZ = newZ;
  }

  lines.push("");
  lines.push("(--- FIM DA USINAGEM COMPENSADA ---)");
  lines.push("M30");

  const ext = controller === "mach3" ? "tap" : "nc";
  const baseName = originalName.replace(/\.[^.]+$/, "");

  return {
    code: lines.join("\n"),
    fileName: `MZ_Auto_${baseName}.${ext}`,
    totalPoints: mesh.totalPoints,
    estimatedProbeSec: mesh.estimatedTimeSec,
    arcsDetected,
    arcSegmentsGenerated,
  };
}
