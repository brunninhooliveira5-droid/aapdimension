// ── Z-Mapping Engine ──────────────────────────────────────────
// Modules: G-code parser, unit detector, work area detector,
// mesh generator, point importer, bilinear interpolation,
// segment splitter, probe G-code generator, compensated G-code generator,
// numeric formatter.

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
  decimalPlaces: 5,
  outOfMeshRule: "warn",
  tolerance: 0.0001,
};

// ── Numeric formatter ─────────────────────────────────────────
export function fmt(v: number, dp = 5): string {
  const s = v.toFixed(dp);
  // strip trailing zeros but keep at least one decimal
  return s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

// ── G-code parser & analyzer ──────────────────────────────────
interface ParsedMove {
  x?: number;
  y?: number;
  z?: number;
  g?: number;
  f?: number;
  raw: string;
}

function parseGcodeLine(line: string): ParsedMove {
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

  for (const line of lines) {
    const p = parseGcodeLine(line);
    if (p.g === 21) unit = "mm";
    if (p.g === 20) unit = "inch";
    if (p.x !== undefined) curX = p.x;
    if (p.y !== undefined) curY = p.y;
    if (p.z !== undefined) curZ = p.z;
    // Only consider moves where Z < 0 (cutting)
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
    unit,
    xMin,
    yMin,
    xMax,
    yMax,
    width: xMax - xMin,
    height: yMax - yMin,
    lineCount: lines.length,
  };
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

  // Estimate: ~2s per point (move + probe + retract)
  const estimatedTimeSec = points.length * 2;

  return { pointsPerRow, rows, totalPoints: points.length, actualSpacingX, actualSpacingY, points, estimatedTimeSec };
}

// ── Probe G-code generators ────────────────────────────────────
export type ControllerType = "mach3" | "generic";

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

  // Initial position
  const firstPt = mesh.points[0];
  lines.push(`G0 Z${d(cfg.safeHeight)}`);
  lines.push(`G0 X${d(firstPt.x)} Y${d(firstPt.y)}`);

  if (controller === "mach3") {
    // Initial probe to zero
    lines.push(`G31 Z${d(cfg.probeDepth)} F${d(cfg.probeFeed)}`);
    lines.push(`G92 Z0`);
    lines.push(`G0 Z${d(cfg.clearance)}`);
    lines.push("");
  }

  // Serpentine scan
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
  // Accept CSV, whitespace-separated, one per line
  const tokens = text.replace(/,/g, " ").split(/\s+/);
  for (const t of tokens) {
    const n = parseFloat(t);
    if (!isNaN(n)) values.push(n);
  }

  const points = [...mesh.points];

  if (values.length >= mesh.totalPoints * 3) {
    // X,Y,Z triplets
    for (let i = 0; i < mesh.totalPoints; i++) {
      points[i] = { x: values[i * 3], y: values[i * 3 + 1], z: values[i * 3 + 2] };
    }
  } else if (values.length >= mesh.totalPoints) {
    // Z-only values in serpentine order
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

  // Clamp within mesh
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
interface CncPos { x: number; y: number; z: number; f?: number }

function segmentMove(from: CncPos, to: CncPos, maxLen: number): CncPos[] {
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
      // Pass through but update state
      if (p.x !== undefined || p.y !== undefined || p.z !== undefined) {
        // For non-cut moves with Z, still apply compensation if Z < 0
        if (newZ < 0 && curG === 1) {
          // handled below
        } else {
          curX = newX;
          curY = newY;
          curZ = newZ;
          output.push(line);
          continue;
        }
      } else {
        output.push(line);
        continue;
      }
    }

    // Segment the move
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

    curX = newX;
    curY = newY;
    curZ = newZ;
  }

  const ext = controller === "mach3" ? "tap" : "nc";
  const baseName = originalName.replace(/\.[^.]+$/, "");

  return {
    code: output.join("\n"),
    fileName: `MZ_${baseName}.${ext}`,
    linesProcessed,
    segmentsCreated,
    meshValid: allHaveZ,
  };
}

// ── Unified G-code generator (probe + pause + compensated cut) ──
export interface UnifiedResult {
  code: string;
  fileName: string;
  totalPoints: number;
  estimatedProbeSec: number;
}

export function generateUnifiedGcode(
  originalGcode: string,
  mesh: MeshInfo,
  cfg: MeshConfig,
  originalName: string,
  controller: ControllerType
): UnifiedResult {
  const d = (v: number) => fmt(v, cfg.decimalPlaces);
  const unitCmd = cfg.unit === "mm" ? "G21" : "G20";
  const lines: string[] = [];
  const probeVar = controller === "mach3" ? "#2002" : "#5063";
  const probeCmd = controller === "mach3" ? "G31" : "G38.2";

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

  const firstPt = mesh.points[0];
  lines.push(`G0 Z${d(cfg.safeHeight)}`);
  lines.push(`G0 X${d(firstPt.x)} Y${d(firstPt.y)}`);

  if (controller === "mach3") {
    lines.push(`${probeCmd} Z${d(cfg.probeDepth)} F${d(cfg.probeFeed)}`);
    lines.push("G92 Z0");
    lines.push(`G0 Z${d(cfg.clearance)}`);
    lines.push("");
  }

  // Serpentine scan — store in variables using GRID index (#500 + gridIdx)
  // so bilinear lookup by [row][col] maps directly to #500 + row*cols + col
  let scanCount = 0;
  for (let row = 0; row < mesh.rows; row++) {
    const ltr = row % 2 === 0;
    for (let col = 0; col < mesh.pointsPerRow; col++) {
      const actualCol = ltr ? col : (mesh.pointsPerRow - 1 - col);
      const gridIdx = row * mesh.pointsPerRow + actualCol;
      const pt = mesh.points[gridIdx];

      lines.push(`(Ponto ${scanCount} -> #${500 + gridIdx})`);
      lines.push(`G0 Z${d(cfg.clearance)}`);
      lines.push(`G0 X${d(pt.x)} Y${d(pt.y)}`);
      lines.push(`${probeCmd} Z${d(cfg.probeDepth)} F${d(cfg.probeFeed)}`);
      lines.push(`#${500 + gridIdx} = ${probeVar}`);
      scanCount++;
    }
  }

  lines.push("");
  lines.push(`G0 Z${d(cfg.safeHeight)}`);
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

  // Build a helper: for each XY during cutting, compute bilinear using variable references
  // Since we can't do real bilinear in pure G-code macros on all controllers,
  // we generate the compensated G-code with variable references for each point.
  // We create a lookup approach: for each segment point, compute the 4 surrounding
  // probe variable indices and the interpolation fractions, then emit macro math.

  const origLines = originalGcode.split("\n");
  let curX = 0, curY = 0, curZ = 0;
  let curG = 0;

  for (const line of origLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("(") || trimmed.startsWith(";") || trimmed.startsWith("%")) {
      lines.push(line);
      continue;
    }

    const p = parseGcodeLine(trimmed);
    if (p.g !== undefined) curG = p.g;

    const newX = p.x ?? curX;
    const newY = p.y ?? curY;
    const newZ = p.z ?? curZ;

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

    // Segment the move and emit macro-based compensation
    const from: CncPos = { x: curX, y: curY, z: curZ };
    const to: CncPos = { x: newX, y: newY, z: newZ, f: p.f };
    const segments = segmentMove(from, to, cfg.maxSegmentLen);

    for (const seg of segments) {
      // Compute bilinear indices and fractions at compile time
      const { xStart, yStart, width: w, height: h } = cfg;
      const xEnd = xStart + w;
      const yEnd = yStart + h;
      let px = Math.max(xStart, Math.min(xEnd, seg.x));
      let py = Math.max(yStart, Math.min(yEnd, seg.y));

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

      // Bilinear: left = bl + (tl-bl)*yFrac, right = br + (tr-br)*yFrac, result = left + (right-left)*xFrac
      // Use temp variables #100-#104
      lines.push(`#100 = [#${500 + blIdx} + [#${500 + tlIdx} - #${500 + blIdx}] * ${d(yFrac)}]`);
      lines.push(`#101 = [#${500 + brIdx} + [#${500 + trIdx} - #${500 + brIdx}] * ${d(yFrac)}]`);
      lines.push(`#102 = [#100 + [#101 - #100] * ${d(xFrac)}]`);
      lines.push(`#103 = [${d(seg.z)} + #102]`);

      let cmd = `G1 X${d(seg.x)} Y${d(seg.y)} Z#103`;
      if (seg.f !== undefined) cmd += ` F${d(seg.f)}`;
      lines.push(cmd);
    }

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
  };
}
