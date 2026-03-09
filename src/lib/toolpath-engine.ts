// ── Toolpath Generator Engine V4.2 ──
// Material-intelligent CAM with helical entry, adaptive roughing, trochoidal milling

export type Unit = "mm" | "in";
export type ZeroOrigin = "bottom-left" | "center" | "top-left";
export type ZZero = "top" | "bed";
export type CutDirection = "climb" | "conventional";
export type CutSide = "inside" | "outside" | "on-line";

export type ToolType = "flat-end" | "v-bit" | "ball-nose" | "finishing" | "straight" | "compression" | "downcut" | "upcut";

export type EntryMode = "plunge" | "ramp-linear" | "ramp-helicoidal";
export type LeadType = "none" | "line" | "arc";

export type GeometryClass = "hole" | "pocket" | "island" | "contour-inner" | "contour-outer" | "groove" | "open-path";

export type MaterialCategory = "wood" | "composite" | "plastic" | "soft-metal" | "hard-metal";

export type PocketStrategy = "standard" | "spiral" | "helical" | "adaptive" | "trochoidal";

export interface CncTool {
  id: string;
  name: string;
  type: ToolType;
  diameter: number;
  angle?: number;
  feedXY: number;
  feedZ: number;
  spindleRpm: number;
  depthPerPass: number;
  stepOver: number;
  fluteLength: number;
  notes: string;
  flutes?: number;
  coating?: string;
}

export type OperationType =
  | "profile-outside"
  | "profile-inside"
  | "on-line"
  | "pocket"
  | "drill"
  | "groove"
  | "v-carve"
  | "roughing"
  | "finishing"
  | "adaptive"
  | "trochoidal"
  | "spiral-pocket";

export const OPERATION_LABELS: Record<OperationType, string> = {
  "profile-outside": "Perfil Externo",
  "profile-inside": "Perfil Interno",
  "on-line": "Sobre a Linha",
  pocket: "Bolso (Pocket)",
  drill: "Furação",
  groove: "Rasgo / Canal",
  "v-carve": "V-Carve",
  roughing: "Desbaste",
  finishing: "Acabamento",
  adaptive: "Adaptive Roughing",
  trochoidal: "Fresamento Trocoidal",
  "spiral-pocket": "Pocket Espiral",
};

export interface TabSettings {
  enabled: boolean;
  count: number;
  width: number;
  height: number;
  minDistance: number;
}

export interface EntrySettings {
  mode: EntryMode;
  rampLength: number;
  rampAngle: number;
  helixDiameter: number;
  helixPitchPerRev: number;
}

export interface LeadSettings {
  type: LeadType;
  radius: number;
  length: number;
}

export interface RoughFinishSettings {
  stockToLeaveSide: number;
  stockToLeaveBottom: number;
  finishPassSide: boolean;
  finishPassBottom: boolean;
  finishFeedRate: number;
}

export interface TrochoidalSettings {
  enabled: boolean;
  radius: number;
  stepDistance: number;
  feedRate: number;
}

export interface AdaptiveSettings {
  enabled: boolean;
  maxStepOver: number;
  maxEngagementAngle: number;
  minWallDistance: number;
  stockToLeaveSide: number;
}

export interface ToolpathOperation {
  id: string;
  name: string;
  type: OperationType;
  vectorIds: string[];
  toolId: string;
  startDepth: number;
  finalDepth: number;
  depthPerPass: number;
  cutSide: CutSide;
  cutDirection: CutDirection;
  leadIn: LeadSettings;
  leadOut: LeadSettings;
  entry: EntrySettings;
  tabs: TabSettings;
  rampEntry: boolean;
  order: number;
  enabled: boolean;
  pocketStrategy: PocketStrategy;
  roughFinish: RoughFinishSettings;
  trochoidal: TrochoidalSettings;
  adaptive: AdaptiveSettings;
  snapToolSlot?: number;
}

export interface MaterialConfig {
  width: number;
  height: number;
  thickness: number;
  unit: Unit;
  zeroOrigin: ZeroOrigin;
  zZero: ZZero;
  presetId: string;
}

// ── Material Presets ──

export interface MaterialPreset {
  id: string;
  name: string;
  category: MaterialCategory;
  hardness: string;
  feedXY: number;
  feedZ: number;
  spindleRpm: number;
  stepDown: number;
  stepOver: number;
  entryMode: EntryMode;
  pocketStrategy: PocketStrategy;
  notes: string;
  coolantRequired?: boolean;
  maxRpm?: number;
  chipload?: number;
}

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  wood: "Madeira",
  composite: "Compósito",
  plastic: "Plástico",
  "soft-metal": "Metal Macio",
  "hard-metal": "Metal Duro",
};

export const DEFAULT_MATERIAL_PRESETS: MaterialPreset[] = [
  { id: "mdf", name: "MDF", category: "wood", hardness: "média", feedXY: 2500, feedZ: 800, spindleRpm: 18000, stepDown: 4, stepOver: 50, entryMode: "plunge", pocketStrategy: "standard", notes: "Avanço alto, step-down maior. Entrada plunge ou rampa curta.", chipload: 0.1 },
  { id: "compensado", name: "Compensado", category: "wood", hardness: "média", feedXY: 2200, feedZ: 700, spindleRpm: 18000, stepDown: 3.5, stepOver: 50, entryMode: "ramp-linear", pocketStrategy: "standard", notes: "Similar ao MDF, porém camadas podem exigir mais cuidado.", chipload: 0.08 },
  { id: "acm", name: "ACM", category: "composite", hardness: "baixa-média", feedXY: 2000, feedZ: 500, spindleRpm: 16000, stepDown: 1.5, stepOver: 45, entryMode: "ramp-linear", pocketStrategy: "standard", notes: "Perfil e pocket leve. Acabamento simples. Evitar aquecimento.", chipload: 0.06 },
  { id: "acrilico", name: "Acrílico", category: "plastic", hardness: "média", feedXY: 1500, feedZ: 400, spindleRpm: 14000, stepDown: 1.5, stepOver: 40, entryMode: "ramp-linear", pocketStrategy: "standard", notes: "Plunge leve, rampa curta. Fresa de fio único recomendada.", chipload: 0.05 },
  { id: "pvc", name: "PVC Expandido", category: "plastic", hardness: "baixa", feedXY: 2000, feedZ: 600, spindleRpm: 15000, stepDown: 2, stepOver: 50, entryMode: "plunge", pocketStrategy: "standard", notes: "Material macio, aceita avanços moderados.", chipload: 0.07 },
  { id: "nylon", name: "Nylon", category: "plastic", hardness: "média", feedXY: 1800, feedZ: 400, spindleRpm: 10000, stepDown: 1, stepOver: 35, entryMode: "ramp-linear", pocketStrategy: "standard", notes: "Material flexível, fixação crítica. Fresa afiada.", chipload: 0.04 },
  { id: "aluminio", name: "Alumínio", category: "soft-metal", hardness: "média-alta", feedXY: 800, feedZ: 200, spindleRpm: 12000, stepDown: 0.5, stepOver: 30, entryMode: "ramp-helicoidal", pocketStrategy: "helical", notes: "Entrada helicoidal obrigatória. Desbaste adaptativo recomendado.", coolantRequired: true, chipload: 0.02 },
  { id: "latao", name: "Latão", category: "soft-metal", hardness: "média-alta", feedXY: 600, feedZ: 150, spindleRpm: 10000, stepDown: 0.4, stepOver: 25, entryMode: "ramp-helicoidal", pocketStrategy: "helical", notes: "Entrada helicoidal. Boa usinabilidade.", chipload: 0.015 },
  { id: "cobre", name: "Cobre", category: "soft-metal", hardness: "média", feedXY: 700, feedZ: 180, spindleRpm: 11000, stepDown: 0.4, stepOver: 28, entryMode: "ramp-helicoidal", pocketStrategy: "helical", notes: "Entrada helicoidal. Material grudento, use lubrificação.", coolantRequired: true, chipload: 0.012 },
  { id: "aco-carbono", name: "Aço Carbono Leve", category: "hard-metal", hardness: "alta", feedXY: 400, feedZ: 100, spindleRpm: 8000, stepDown: 0.2, stepOver: 20, entryMode: "ramp-helicoidal", pocketStrategy: "trochoidal", notes: "Helicoidal obrigatória. Trocoidal recomendado. Ferramenta coated.", coolantRequired: true, chipload: 0.008 },
  { id: "inox", name: "Inox Leve (304)", category: "hard-metal", hardness: "muito alta", feedXY: 300, feedZ: 80, spindleRpm: 6000, stepDown: 0.15, stepOver: 15, entryMode: "ramp-helicoidal", pocketStrategy: "trochoidal", notes: "Helicoidal obrigatório. Trocoidal. Refrigeração necessária.", coolantRequired: true, chipload: 0.005 },
];

export function getDefaultPresets(): MaterialPreset[] {
  return DEFAULT_MATERIAL_PRESETS;
}

export function isMetal(category: MaterialCategory): boolean {
  return category === "soft-metal" || category === "hard-metal";
}

export function getPresetById(id: string, customPresets: MaterialPreset[] = []): MaterialPreset | undefined {
  return [...DEFAULT_MATERIAL_PRESETS, ...customPresets].find((p) => p.id === id);
}

export function suggestToolParamsFromPreset(preset: MaterialPreset, tool: CncTool): Partial<CncTool> {
  return {
    feedXY: preset.feedXY,
    feedZ: preset.feedZ,
    spindleRpm: preset.spindleRpm,
    depthPerPass: preset.stepDown,
    stepOver: preset.stepOver,
  };
}

export interface SvgVector {
  id: string;
  label: string;
  pathData: string;
  layer: string;
  groupId: string;
  selected: boolean;
  color: string;
  closed: boolean;
  geometryClass: GeometryClass;
  parentId: string | null;
  boundingBox: { x: number; y: number; w: number; h: number };
  area: number;
  perimeter: number;
  isCircular: boolean;
}

export interface ToolpathProject {
  id: string;
  name: string;
  svgContent: string;
  material: MaterialConfig;
  tools: CncTool[];
  operations: ToolpathOperation[];
  vectors: SvgVector[];
  createdAt: string;
  updatedAt: string;
}

export type PostProcessor = "mach3" | "grbl" | "ddcs" | "linuxcnc";

export interface CustomGcodeConfig {
  useCustomStartEnd: boolean;
  startGcode: string;
  endGcode: string;
}

// ── SnapTool Types ──

export interface SnapToolSlot {
  slotNumber: number;
  name: string;
  toolType: string;
  diameter: number;
  posX: number;
  posY: number;
  active: boolean;
}

export interface SnapToolConfig {
  enabled: boolean;
  totalSlots: number;
  probeX: number;
  probeY: number;
  probeZeroValue: number;
  probeFeedRate: number;
  safeZ: number;
  changeX?: number;
  changeY?: number;
  autoProbe: boolean;
  useManualT0: boolean;
  slots: SnapToolSlot[];
}

export const DEFAULT_SNAPTOOL_CONFIG: SnapToolConfig = {
  enabled: false,
  totalSlots: 4,
  probeX: 0,
  probeY: 0,
  probeZeroValue: 0,
  probeFeedRate: 100,
  safeZ: 25,
  autoProbe: true,
  useManualT0: false,
  slots: [],
};

export const DEFAULT_START_GCODE: Record<PostProcessor, string> = {
  grbl: "$H\nG90 G21 G17\nM03 S12000\nG4 P2",
  mach3: "%\nO0001\nG90 G94 G21\nG17\nM03 S12000\nG4 P2",
  ddcs: "%\nG90 G21 G17\nM03 S12000\nG4 P2",
  linuxcnc: "%\nG90 G94 G21 G17\nG40 G49 G80\nM03 S12000\nG4 P2",
};

export const DEFAULT_END_GCODE: Record<PostProcessor, string> = {
  grbl: "M05\nG0 Z10\nG0 X0 Y0\nM2",
  mach3: "M05\nG28 G91 Z0\nG28 X0 Y0\nM30\n%",
  ddcs: "M05\nG0 Z10\nG0 X0 Y0\nM30\n%",
  linuxcnc: "M05\nG53 G0 Z0\nG53 G0 X0 Y0\nM2\n%",
};

export interface MachiningTemplate {
  id: string;
  name: string;
  materialName: string;
  material: MaterialConfig;
  tools: CncTool[];
  defaultOperations: Partial<ToolpathOperation>[];
  customGcode?: CustomGcodeConfig;
  createdAt: string;
}

export interface ValidationIssue {
  severity: "error" | "warning";
  message: string;
  vectorId?: string;
  operationId?: string;
}

// ── Default material & tools ──

export const DEFAULT_MATERIAL: MaterialConfig = {
  width: 500, height: 500, thickness: 15, unit: "mm",
  zeroOrigin: "bottom-left", zZero: "top", presetId: "mdf",
};

export const DEFAULT_TOOLS: CncTool[] = [
  { id: "t1", name: "Fresa Reta 3mm", type: "straight", diameter: 3, feedXY: 1200, feedZ: 300, spindleRpm: 18000, depthPerPass: 1, stepOver: 40, fluteLength: 15, notes: "", flutes: 2 },
  { id: "t2", name: "Fresa Reta 6mm", type: "flat-end", diameter: 6, feedXY: 1500, feedZ: 400, spindleRpm: 16000, depthPerPass: 2, stepOver: 45, fluteLength: 20, notes: "", flutes: 2 },
  { id: "t3", name: "V-Bit 90° 6mm", type: "v-bit", diameter: 6, angle: 90, feedXY: 800, feedZ: 200, spindleRpm: 18000, depthPerPass: 0.5, stepOver: 30, fluteLength: 10, notes: "" },
  { id: "t4", name: "Fresa Esférica 3mm", type: "ball-nose", diameter: 3, feedXY: 1000, feedZ: 250, spindleRpm: 18000, depthPerPass: 0.5, stepOver: 15, fluteLength: 12, notes: "", flutes: 2 },
  { id: "t5", name: "Fresa Acabamento 3mm", type: "finishing", diameter: 3, feedXY: 800, feedZ: 200, spindleRpm: 22000, depthPerPass: 0.3, stepOver: 10, fluteLength: 15, notes: "Acabamento fino", flutes: 4 },
  { id: "t6", name: "Fresa Compressão 6mm", type: "compression", diameter: 6, feedXY: 2200, feedZ: 400, spindleRpm: 14000, depthPerPass: 2.5, stepOver: 50, fluteLength: 25, notes: "Ideal MDF/compensado", flutes: 2, coating: "TiN" },
  { id: "t7", name: "Fresa Alumínio 3mm", type: "flat-end", diameter: 3, feedXY: 800, feedZ: 200, spindleRpm: 8000, depthPerPass: 0.5, stepOver: 20, fluteLength: 20, notes: "Revestida TiAlN para metais", flutes: 3, coating: "TiAlN" },
];

// ── Default operation factory ──

export function createDefaultOperation(order: number): ToolpathOperation {
  return {
    id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: `Operação ${order}`,
    type: "profile-outside",
    vectorIds: [],
    toolId: "",
    startDepth: 0,
    finalDepth: 5,
    depthPerPass: 1,
    cutSide: "outside",
    cutDirection: "climb",
    leadIn: { type: "none", radius: 3, length: 3 },
    leadOut: { type: "none", radius: 3, length: 3 },
    entry: { mode: "plunge", rampLength: 10, rampAngle: 5, helixDiameter: 5, helixPitchPerRev: 0.5 },
    tabs: { enabled: false, count: 4, width: 5, height: 2, minDistance: 30 },
    rampEntry: false,
    order,
    enabled: true,
    pocketStrategy: "standard",
    roughFinish: { stockToLeaveSide: 0, stockToLeaveBottom: 0, finishPassSide: false, finishPassBottom: false, finishFeedRate: 800 },
    trochoidal: { enabled: false, radius: 1, stepDistance: 2, feedRate: 800 },
    adaptive: { enabled: false, maxStepOver: 40, maxEngagementAngle: 90, minWallDistance: 0.5, stockToLeaveSide: 0.1 },
  };
}

// ── SVG Parsing ──

function computeArea(points: [number, number][]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i][0] * points[j][1];
    area -= points[j][0] * points[i][1];
  }
  return Math.abs(area / 2);
}

function computePerimeter(points: [number, number][]): number {
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1][0] - points[i][0];
    const dy = points[i + 1][1] - points[i][1];
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

function isCircularPath(points: [number, number][], bb: { w: number; h: number }): boolean {
  if (points.length < 4) return false;
  const aspect = bb.w / (bb.h || 1);
  if (aspect < 0.8 || aspect > 1.25) return false;
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
  const cy = points.reduce((s, p) => s + p[1], 0) / points.length;
  const avgR = points.reduce((s, p) => s + Math.sqrt((p[0] - cx) ** 2 + (p[1] - cy) ** 2), 0) / points.length;
  if (avgR < 0.5) return false;
  const variance = points.reduce((s, p) => {
    const r = Math.sqrt((p[0] - cx) ** 2 + (p[1] - cy) ** 2);
    return s + ((r - avgR) / avgR) ** 2;
  }, 0) / points.length;
  return variance < 0.05;
}

function bbContains(outer: { x: number; y: number; w: number; h: number }, inner: { x: number; y: number; w: number; h: number }): boolean {
  return (
    inner.x >= outer.x - 0.5 &&
    inner.y >= outer.y - 0.5 &&
    inner.x + inner.w <= outer.x + outer.w + 0.5 &&
    inner.y + inner.h <= outer.y + outer.h + 0.5
  );
}

export function parseSvgContent(svgString: string): { vectors: SvgVector[]; viewBox: string } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const svgEl = doc.querySelector("svg");
  const viewBox = svgEl?.getAttribute("viewBox") || "0 0 500 500";

  const rawVectors: Omit<SvgVector, "geometryClass" | "parentId" | "area" | "perimeter" | "isCircular">[] = [];
  let idx = 0;

  const COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

  function processElement(el: Element, layerName: string, groupId: string) {
    const tag = el.tagName.toLowerCase();

    if (tag === "g") {
      const gLabel = el.getAttribute("inkscape:label") || el.getAttribute("id") || layerName;
      const gId = el.getAttribute("id") || groupId;
      Array.from(el.children).forEach((child) => processElement(child, gLabel, gId));
      return;
    }

    let d = "";
    if (tag === "path") {
      d = el.getAttribute("d") || "";
    } else if (tag === "rect") {
      const x = parseFloat(el.getAttribute("x") || "0");
      const y = parseFloat(el.getAttribute("y") || "0");
      const w = parseFloat(el.getAttribute("width") || "0");
      const h = parseFloat(el.getAttribute("height") || "0");
      const rx = parseFloat(el.getAttribute("rx") || "0");
      const ry = parseFloat(el.getAttribute("ry") || rx.toString());
      if (rx > 0 || ry > 0) {
        const r = Math.min(rx, w / 2);
        const rr = Math.min(ry, h / 2);
        d = `M${x + r},${y} L${x + w - r},${y} A${r},${rr} 0 0,1 ${x + w},${y + rr} L${x + w},${y + h - rr} A${r},${rr} 0 0,1 ${x + w - r},${y + h} L${x + r},${y + h} A${r},${rr} 0 0,1 ${x},${y + h - rr} L${x},${y + rr} A${r},${rr} 0 0,1 ${x + r},${y} Z`;
      } else {
        d = `M${x},${y} L${x + w},${y} L${x + w},${y + h} L${x},${y + h} Z`;
      }
    } else if (tag === "circle") {
      const cx = parseFloat(el.getAttribute("cx") || "0");
      const cy = parseFloat(el.getAttribute("cy") || "0");
      const r = parseFloat(el.getAttribute("r") || "0");
      d = `M${cx - r},${cy} A${r},${r} 0 1,0 ${cx + r},${cy} A${r},${r} 0 1,0 ${cx - r},${cy} Z`;
    } else if (tag === "ellipse") {
      const cx = parseFloat(el.getAttribute("cx") || "0");
      const cy = parseFloat(el.getAttribute("cy") || "0");
      const rx = parseFloat(el.getAttribute("rx") || "0");
      const ry = parseFloat(el.getAttribute("ry") || "0");
      d = `M${cx - rx},${cy} A${rx},${ry} 0 1,0 ${cx + rx},${cy} A${rx},${ry} 0 1,0 ${cx - rx},${cy} Z`;
    } else if (tag === "line") {
      d = `M${el.getAttribute("x1") || "0"},${el.getAttribute("y1") || "0"} L${el.getAttribute("x2") || "0"},${el.getAttribute("y2") || "0"}`;
    } else if (tag === "polygon" || tag === "polyline") {
      const pts = el.getAttribute("points") || "";
      const pairs = pts.trim().split(/[\s,]+/);
      const coords: string[] = [];
      for (let i = 0; i < pairs.length - 1; i += 2) {
        coords.push(`${pairs[i]},${pairs[i + 1]}`);
      }
      if (coords.length > 0) {
        d = `M${coords[0]} L${coords.slice(1).join(" L")}`;
        if (tag === "polygon") d += " Z";
      }
    }

    if (!d) return;

    const closed = /[Zz]\s*$/.test(d.trim());
    const nums = d.match(/-?\d+\.?\d*/g)?.map(Number) || [];
    const xs = nums.filter((_, i) => i % 2 === 0);
    const ys = nums.filter((_, i) => i % 2 === 1);
    const minX = Math.min(...(xs.length ? xs : [0]));
    const minY = Math.min(...(ys.length ? ys : [0]));
    const maxX = Math.max(...(xs.length ? xs : [0]));
    const maxY = Math.max(...(ys.length ? ys : [0]));

    rawVectors.push({
      id: `v-${idx}`,
      label: el.getAttribute("id") || `${tag}-${idx}`,
      pathData: d,
      layer: layerName,
      groupId,
      selected: false,
      closed,
      color: COLORS[idx % COLORS.length],
      boundingBox: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
    });
    idx++;
  }

  if (svgEl) {
    Array.from(svgEl.children).forEach((child) => processElement(child, "Default", "root"));
  }

  // Classify geometry
  const vectors: SvgVector[] = rawVectors.map((rv) => {
    const pts = extractPointsFromPath(rv.pathData);
    const area = rv.closed ? computeArea(pts) : 0;
    const perimeter = computePerimeter(pts);
    const circular = rv.closed ? isCircularPath(pts, rv.boundingBox) : false;
    return {
      ...rv,
      area,
      perimeter,
      isCircular: circular,
      geometryClass: "contour-outer" as GeometryClass,
      parentId: null,
    };
  });

  // Classify: containment analysis
  for (let i = 0; i < vectors.length; i++) {
    const vi = vectors[i];
    if (!vi.closed) {
      vi.geometryClass = "open-path";
      continue;
    }

    let smallestParent: SvgVector | null = null;
    let smallestArea = Infinity;
    for (let j = 0; j < vectors.length; j++) {
      if (i === j) continue;
      const vj = vectors[j];
      if (!vj.closed) continue;
      if (bbContains(vj.boundingBox, vi.boundingBox) && vj.area > vi.area) {
        if (vj.area < smallestArea) {
          smallestArea = vj.area;
          smallestParent = vj;
        }
      }
    }

    if (smallestParent) {
      vi.parentId = smallestParent.id;
      if (smallestParent.parentId) {
        vi.geometryClass = "island";
      } else {
        if (vi.isCircular && Math.max(vi.boundingBox.w, vi.boundingBox.h) < 15) {
          vi.geometryClass = "hole";
        } else {
          vi.geometryClass = "contour-inner";
        }
      }
    } else {
      if (vi.isCircular && Math.max(vi.boundingBox.w, vi.boundingBox.h) < 15) {
        vi.geometryClass = "hole";
      } else {
        vi.geometryClass = "contour-outer";
      }
    }
  }

  for (const v of vectors) {
    if (v.parentId && v.geometryClass === "contour-inner") {
      const parent = vectors.find((p) => p.id === v.parentId);
      if (parent && v.area < parent.area * 0.7) {
        v.geometryClass = "pocket";
      }
    }
  }

  return { vectors, viewBox };
}

// ── Extract Points from Path ──

export function extractPointsFromPath(d: string): [number, number][] {
  const points: [number, number][] = [];
  const regex = /([MLHVCSQTAZmlhvcsqtaz])\s*([^MLHVCSQTAZmlhvcsqtaz]*)/g;
  let match;
  let cx = 0, cy = 0;
  let firstX = 0, firstY = 0;

  while ((match = regex.exec(d)) !== null) {
    const cmd = match[1];
    const args = match[2].trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));

    switch (cmd) {
      case "M":
        for (let i = 0; i < args.length - 1; i += 2) {
          cx = args[i]; cy = args[i + 1];
          points.push([cx, cy]);
          if (i === 0) { firstX = cx; firstY = cy; }
        }
        break;
      case "m":
        for (let i = 0; i < args.length - 1; i += 2) {
          cx += args[i]; cy += args[i + 1];
          points.push([cx, cy]);
          if (points.length === 1) { firstX = cx; firstY = cy; }
        }
        break;
      case "L":
        for (let i = 0; i < args.length - 1; i += 2) { cx = args[i]; cy = args[i + 1]; points.push([cx, cy]); }
        break;
      case "l":
        for (let i = 0; i < args.length - 1; i += 2) { cx += args[i]; cy += args[i + 1]; points.push([cx, cy]); }
        break;
      case "H": cx = args[0]; points.push([cx, cy]); break;
      case "h": cx += args[0]; points.push([cx, cy]); break;
      case "V": cy = args[0]; points.push([cx, cy]); break;
      case "v": cy += args[0]; points.push([cx, cy]); break;
      case "Z": case "z":
        if (points.length > 0) points.push([firstX, firstY]);
        break;
      case "A": case "a": {
        const abs = cmd === "A";
        for (let i = 0; i + 6 < args.length; i += 7) {
          if (abs) { cx = args[i + 5]; cy = args[i + 6]; }
          else { cx += args[i + 5]; cy += args[i + 6]; }
          points.push([cx, cy]);
        }
        break;
      }
      case "C":
        for (let i = 0; i + 5 < args.length; i += 6) {
          const cp1x = args[i], cp1y = args[i + 1];
          const cp2x = args[i + 2], cp2y = args[i + 3];
          const ex = args[i + 4], ey = args[i + 5];
          const mx = (cx + 3 * cp1x + 3 * cp2x + ex) / 8;
          const my = (cy + 3 * cp1y + 3 * cp2y + ey) / 8;
          points.push([mx, my]);
          cx = ex; cy = ey; points.push([cx, cy]);
        }
        break;
      case "c":
        for (let i = 0; i + 5 < args.length; i += 6) {
          const cp1x = cx + args[i], cp1y = cy + args[i + 1];
          const cp2x = cx + args[i + 2], cp2y = cy + args[i + 3];
          const ex = cx + args[i + 4], ey = cy + args[i + 5];
          const mx = (cx + 3 * cp1x + 3 * cp2x + ex) / 8;
          const my = (cy + 3 * cp1y + 3 * cp2y + ey) / 8;
          points.push([mx, my]);
          cx = ex; cy = ey; points.push([cx, cy]);
        }
        break;
      case "Q":
        for (let i = 0; i + 3 < args.length; i += 4) { cx = args[i + 2]; cy = args[i + 3]; points.push([cx, cy]); }
        break;
      case "q":
        for (let i = 0; i + 3 < args.length; i += 4) { cx += args[i + 2]; cy += args[i + 3]; points.push([cx, cy]); }
        break;
      case "S":
        for (let i = 0; i + 3 < args.length; i += 4) { cx = args[i + 2]; cy = args[i + 3]; points.push([cx, cy]); }
        break;
      case "s":
        for (let i = 0; i + 3 < args.length; i += 4) { cx += args[i + 2]; cy += args[i + 3]; points.push([cx, cy]); }
        break;
      case "T":
        for (let i = 0; i + 1 < args.length; i += 2) { cx = args[i]; cy = args[i + 1]; points.push([cx, cy]); }
        break;
      case "t":
        for (let i = 0; i + 1 < args.length; i += 2) { cx += args[i]; cy += args[i + 1]; points.push([cx, cy]); }
        break;
    }
  }
  return points;
}

// ── Path Length ──

function estimatePathLength(d: string): number {
  const pts = extractPointsFromPath(d);
  return computePerimeter(pts);
}

// ── Auto-CAM V4.2: Material-Intelligent with Advanced Strategies ──

export interface AutoCamResult {
  operations: ToolpathOperation[];
  issues: ValidationIssue[];
  summary: { holes: number; pockets: number; islands: number; innerContours: number; outerContours: number; openPaths: number };
}

function selectToolForGeometry(
  geoClass: GeometryClass,
  size: number,
  tools: CncTool[]
): CncTool | undefined {
  if (tools.length === 0) return undefined;
  const sorted = [...tools].sort((a, b) => a.diameter - b.diameter);

  if (geoClass === "hole") {
    return sorted.find((t) => t.diameter < size) || sorted[0];
  }
  if (geoClass === "pocket" || geoClass === "contour-inner") {
    const fitting = sorted.filter((t) => t.diameter < size * 0.8);
    return fitting.length > 0 ? fitting[fitting.length - 1] : sorted[0];
  }
  // For metals, prefer coated tools
  const coated = sorted.filter(t => t.coating);
  if (coated.length > 0) {
    const mid = Math.floor(coated.length / 2);
    return coated[mid];
  }
  const mid = Math.floor(sorted.length / 2);
  return sorted[mid] || sorted[0];
}

function selectFinishingTool(tools: CncTool[]): CncTool | undefined {
  return tools.find(t => t.type === "finishing") || tools.find(t => t.diameter <= 3) || tools[0];
}

export function generateAutoCam(
  vectors: SvgVector[],
  tools: CncTool[],
  material: MaterialConfig,
  materialPresets: MaterialPreset[] = []
): AutoCamResult {
  const operations: ToolpathOperation[] = [];
  const issues: ValidationIssue[] = [];
  let order = 1;

  const preset = getPresetById(material.presetId, materialPresets);
  const metalMaterial = preset ? isMetal(preset.category) : false;
  const hardMetal = preset?.category === "hard-metal";
  const entryMode: EntryMode = preset?.entryMode || "ramp-linear";
  const pocketStrat: PocketStrategy = preset?.pocketStrategy || "standard";

  const holes = vectors.filter((v) => v.geometryClass === "hole");
  const pockets = vectors.filter((v) => v.geometryClass === "pocket");
  const islands = vectors.filter((v) => v.geometryClass === "island");
  const innerContours = vectors.filter((v) => v.geometryClass === "contour-inner");
  const outerContours = vectors.filter((v) => v.geometryClass === "contour-outer");
  const openPaths = vectors.filter((v) => v.geometryClass === "open-path");

  const makeOp = (
    name: string,
    type: OperationType,
    vids: string[],
    cutSide: CutSide,
    tool: CncTool | undefined,
    addTabs: boolean,
    overrideEntry?: EntryMode,
    overridePocketStrat?: PocketStrategy,
    isFinishing?: boolean,
  ): ToolpathOperation => {
    const depthPerPass = preset
      ? (isFinishing ? Math.min(preset.stepDown, 0.3) : preset.stepDown)
      : (tool?.depthPerPass || 2);
    const feedXY = preset
      ? (isFinishing ? preset.feedXY * 0.6 : preset.feedXY)
      : (tool?.feedXY || 1200);

    const effectiveTool = tool ? { ...tool } : undefined;
    if (effectiveTool && preset) {
      effectiveTool.feedXY = feedXY;
      effectiveTool.feedZ = preset.feedZ;
      effectiveTool.spindleRpm = preset.spindleRpm;
    }

    const eMode = overrideEntry || entryMode;
    const useTrochoidal = (type === "trochoidal" || (hardMetal && (type === "pocket" || type === "roughing")));
    const useAdaptive = type === "adaptive";

    return {
      id: `op-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      type,
      vectorIds: vids,
      toolId: tool?.id || "",
      startDepth: 0,
      finalDepth: material.thickness,
      depthPerPass,
      cutSide,
      cutDirection: "climb",
      leadIn: { type: metalMaterial ? "arc" : "none", radius: 3, length: 3 },
      leadOut: { type: metalMaterial ? "arc" : "none", radius: 3, length: 3 },
      entry: {
        mode: type === "drill" ? (metalMaterial ? "ramp-helicoidal" : "plunge") : eMode,
        rampLength: metalMaterial ? 15 : 10,
        rampAngle: metalMaterial ? 3 : 5,
        helixDiameter: tool ? Math.max(tool.diameter * 0.8, 2) : 5,
        helixPitchPerRev: preset ? preset.stepDown * 0.5 : 0.5,
      },
      tabs: addTabs
        ? { enabled: true, count: Math.max(3, 4), width: metalMaterial ? 3 : 5, height: metalMaterial ? 1 : 2, minDistance: 30 }
        : { enabled: false, count: 4, width: 5, height: 2, minDistance: 30 },
      rampEntry: eMode !== "plunge",
      order: order++,
      enabled: true,
      pocketStrategy: overridePocketStrat || pocketStrat,
      roughFinish: metalMaterial
        ? { stockToLeaveSide: 0.2, stockToLeaveBottom: 0.1, finishPassSide: true, finishPassBottom: true, finishFeedRate: preset ? preset.feedXY * 0.5 : 400 }
        : { stockToLeaveSide: 0, stockToLeaveBottom: 0, finishPassSide: false, finishPassBottom: false, finishFeedRate: 800 },
      trochoidal: useTrochoidal
        ? { enabled: true, radius: tool ? tool.diameter * 0.1 : 0.5, stepDistance: tool ? tool.diameter * 0.8 : 2, feedRate: preset?.feedXY || 800 }
        : { enabled: false, radius: 1, stepDistance: 2, feedRate: 800 },
      adaptive: useAdaptive
        ? { enabled: true, maxStepOver: 40, maxEngagementAngle: 90, minWallDistance: 0.5, stockToLeaveSide: 0.15 }
        : { enabled: false, maxStepOver: 40, maxEngagementAngle: 90, minWallDistance: 0.5, stockToLeaveSide: 0.1 },
    };
  };

  // 1. Drilling
  if (holes.length > 0) {
    const minSize = Math.min(...holes.map((h) => Math.max(h.boundingBox.w, h.boundingBox.h)));
    const tool = selectToolForGeometry("hole", minSize, tools);
    operations.push(makeOp(
      `Furação Auto (${holes.length})`, "drill", holes.map((h) => h.id), "on-line", tool, false,
      metalMaterial ? "ramp-helicoidal" : "plunge"
    ));
  }

  // 2. Pockets - use trochoidal for hard metals, adaptive for soft metals
  if (pockets.length > 0) {
    const avgSize = pockets.reduce((s, p) => s + Math.min(p.boundingBox.w, p.boundingBox.h), 0) / pockets.length;
    const tool = selectToolForGeometry("pocket", avgSize, tools);

    if (hardMetal) {
      // Hard metal: trochoidal pocket
      operations.push(makeOp(
        `Pocket Trocoidal (${pockets.length})`, "trochoidal", pockets.map((p) => p.id), "inside", tool, false,
        "ramp-helicoidal", "trochoidal"
      ));
    } else if (metalMaterial) {
      // Soft metal: adaptive roughing + finishing
      operations.push(makeOp(
        `Adaptive Roughing (${pockets.length})`, "adaptive", pockets.map((p) => p.id), "inside", tool, false,
        "ramp-helicoidal", "adaptive"
      ));
    } else {
      operations.push(makeOp(
        `Pocket Auto (${pockets.length})`, "pocket", pockets.map((p) => p.id), "inside", tool, false,
        undefined, pocketStrat
      ));
    }

    // For metals, add finishing pass
    if (metalMaterial) {
      const finishTool = selectFinishingTool(tools);
      operations.push(makeOp(
        `Acabamento Pocket (${pockets.length})`, "finishing", pockets.map((p) => p.id), "inside", finishTool, false,
        entryMode, "standard", true
      ));
    }
  }

  // 3. Internal contours
  if (innerContours.length > 0) {
    const avgSize = innerContours.reduce((s, c) => s + Math.min(c.boundingBox.w, c.boundingBox.h), 0) / innerContours.length;
    const tool = selectToolForGeometry("contour-inner", avgSize, tools);
    operations.push(makeOp(
      `Perfil Interno Auto (${innerContours.length})`, "profile-inside", innerContours.map((c) => c.id), "inside", tool, false
    ));

    // Finishing pass for metals
    if (metalMaterial) {
      const finishTool = selectFinishingTool(tools);
      operations.push(makeOp(
        `Acabamento Interno (${innerContours.length})`, "finishing", innerContours.map((c) => c.id), "inside", finishTool, false,
        entryMode, "standard", true
      ));
    }
  }

  // 4. External contours (last)
  if (outerContours.length > 0) {
    const tool = selectToolForGeometry("contour-outer", 0, tools);

    // For metals, add roughing pass first
    if (metalMaterial) {
      operations.push(makeOp(
        `Desbaste Externo Auto (${outerContours.length})`, "roughing", outerContours.map((c) => c.id), "outside", tool, false
      ));
    }

    operations.push(makeOp(
      `Perfil Externo Auto (${outerContours.length})`, "profile-outside", outerContours.map((c) => c.id), "outside", tool, true
    ));

    // Finishing pass for metals
    if (metalMaterial) {
      const finishTool = selectFinishingTool(tools);
      operations.push(makeOp(
        `Acabamento Externo (${outerContours.length})`, "finishing", outerContours.map((c) => c.id), "outside", finishTool, false,
        entryMode, "standard", true
      ));
    }
  }

  // 5. Open paths
  if (openPaths.length > 0) {
    const tool = selectToolForGeometry("groove", 0, tools);
    operations.push(makeOp(
      `Gravação/Rasgo Auto (${openPaths.length})`, "on-line", openPaths.map((o) => o.id), "on-line", tool, false
    ));
  }

  // Optimize path order
  for (const op of operations) {
    if (op.vectorIds.length > 1) {
      op.vectorIds = optimizeVectorOrder(op.vectorIds, vectors);
    }
  }

  // Validation
  issues.push(...validateProject({
    id: "", name: "", svgContent: "", material, tools, operations, vectors, createdAt: "", updatedAt: ""
  }, materialPresets));

  return {
    operations,
    issues,
    summary: {
      holes: holes.length,
      pockets: pockets.length,
      islands: islands.length,
      innerContours: innerContours.length,
      outerContours: outerContours.length,
      openPaths: openPaths.length,
    },
  };
}

// ── Path Optimization (Nearest Neighbor) ──

function getCentroid(v: SvgVector): [number, number] {
  return [v.boundingBox.x + v.boundingBox.w / 2, v.boundingBox.y + v.boundingBox.h / 2];
}

function optimizeVectorOrder(vectorIds: string[], vectors: SvgVector[]): string[] {
  if (vectorIds.length <= 1) return vectorIds;
  const remaining = [...vectorIds];
  const ordered: string[] = [];
  let currentPos: [number, number] = [0, 0];

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const v = vectors.find((vv) => vv.id === remaining[i]);
      if (!v) continue;
      const c = getCentroid(v);
      const dist = Math.sqrt((c[0] - currentPos[0]) ** 2 + (c[1] - currentPos[1]) ** 2);
      if (dist < nearestDist) { nearestDist = dist; nearestIdx = i; }
    }
    const picked = remaining.splice(nearestIdx, 1)[0];
    ordered.push(picked);
    const pv = vectors.find((vv) => vv.id === picked);
    if (pv) currentPos = getCentroid(pv);
  }
  return ordered;
}

// ── Validation V4.2 ──

export function validateProject(project: ToolpathProject, materialPresets: MaterialPreset[] = []): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const preset = getPresetById(project.material.presetId, materialPresets);
  const metalMat = preset ? isMetal(preset.category) : false;

  for (const op of project.operations) {
    if (!op.enabled) continue;
    const tool = project.tools.find((t) => t.id === op.toolId);

    if (!tool) {
      issues.push({ severity: "error", message: `Operação "${op.name}": ferramenta não encontrada.`, operationId: op.id });
      continue;
    }

    // Depth > material thickness
    if (op.finalDepth > project.material.thickness + 0.5) {
      issues.push({
        severity: "warning",
        message: `"${op.name}": profundidade (${op.finalDepth}mm) > espessura do material (${project.material.thickness}mm).`,
        operationId: op.id,
      });
    }

    // Metal-specific: plunge entry warning
    if (metalMat && op.entry.mode === "plunge" && (op.type === "pocket" || op.type === "roughing" || op.type === "drill" || op.type === "adaptive")) {
      issues.push({
        severity: "warning",
        message: `"${op.name}": para ${preset?.name || "metal"}, entrada helicoidal é mais recomendada que plunge direto.`,
        operationId: op.id,
      });
    }

    // Metal-specific: excessive step-down
    if (metalMat && op.depthPerPass > (preset?.stepDown || 1) * 2) {
      issues.push({
        severity: "warning",
        message: `"${op.name}": profundidade por passada (${op.depthPerPass}mm) alta para ${preset?.name || "metal"}. Recomendado: ${preset?.stepDown || 0.5}mm.`,
        operationId: op.id,
      });
    }

    // Metal-specific: no finishing pass for pockets
    if (metalMat && (op.type === "pocket" || op.type === "adaptive" || op.type === "trochoidal") && !op.roughFinish.finishPassSide && !op.roughFinish.finishPassBottom) {
      issues.push({
        severity: "warning",
        message: `"${op.name}": para ${preset?.name || "metal"}, acabamento é recomendado após desbaste.`,
        operationId: op.id,
      });
    }

    // Hard metal without trochoidal
    if (preset?.category === "hard-metal" && op.type === "pocket" && !op.trochoidal.enabled) {
      issues.push({
        severity: "warning",
        message: `"${op.name}": para ${preset.name}, fresamento trocoidal é altamente recomendado.`,
        operationId: op.id,
      });
    }

    // Coolant warning
    if (preset?.coolantRequired && !op.name.includes("Acabamento")) {
      issues.push({
        severity: "warning",
        message: `"${op.name}": ${preset.name} requer refrigeração/lubrificação.`,
        operationId: op.id,
      });
    }

    // Incompatible feed for metal
    if (metalMat && tool.feedXY > (preset?.feedXY || 1000) * 1.5) {
      issues.push({
        severity: "warning",
        message: `"${op.name}": avanço XY (${tool.feedXY} mm/min) possivelmente alto para ${preset?.name || "metal"}.`,
        operationId: op.id,
      });
    }

    // Open path used in profile/pocket
    for (const vid of op.vectorIds) {
      const v = project.vectors.find((vv) => vv.id === vid);
      if (!v) continue;

      if (!v.closed && (op.type === "profile-inside" || op.type === "profile-outside" || op.type === "pocket" || op.type === "adaptive" || op.type === "trochoidal")) {
        issues.push({
          severity: "error",
          message: `"${op.name}": vetor "${v.label}" é aberto, incompatível com ${OPERATION_LABELS[op.type]}.`,
          vectorId: vid,
          operationId: op.id,
        });
      }

      // Tool larger than hole
      if (v.geometryClass === "hole" && tool.diameter >= Math.max(v.boundingBox.w, v.boundingBox.h)) {
        issues.push({
          severity: "error",
          message: `"${op.name}": ferramenta Ø${tool.diameter}mm > furo "${v.label}" (${Math.max(v.boundingBox.w, v.boundingBox.h).toFixed(1)}mm).`,
          vectorId: vid,
          operationId: op.id,
        });
      }
    }
  }

  return issues;
}

// ── Time Estimation ──

export function calculateOperationAdvanced(
  op: ToolpathOperation,
  tool: CncTool | undefined,
  vectors: SvgVector[],
  _material: MaterialConfig
) {
  if (!tool) return { passes: 0, pathLength: 0, estimatedTime: 0, rapidTime: 0, cutTime: 0 };

  const totalDepth = Math.abs(op.finalDepth - op.startDepth);
  const passes = Math.ceil(totalDepth / (op.depthPerPass || tool.depthPerPass || 1));

  let pathLength = 0;
  for (const vid of op.vectorIds) {
    const v = vectors.find((vv) => vv.id === vid);
    if (v) pathLength += estimatePathLength(v.pathData);
  }

  if (op.type === "pocket" || op.type === "adaptive" || op.type === "trochoidal" || op.type === "spiral-pocket") {
    const stepOverMm = tool.diameter * (tool.stepOver / 100);
    if (stepOverMm > 0) {
      const avgWidth = pathLength > 0 ? pathLength / 4 : 50;
      pathLength = pathLength * (avgWidth / stepOverMm) * 0.6;
    }
  }

  // Trochoidal adds ~40% more path length
  if (op.trochoidal.enabled) {
    pathLength *= 1.4;
  }

  // Adaptive adds ~20% more path length but reduces feed penalties
  if (op.adaptive.enabled) {
    pathLength *= 1.2;
  }

  const totalCutPath = pathLength * passes;
  const feedRate = tool.feedXY || 1000;
  const cutTime = totalCutPath / feedRate;
  const rapidSpeed = 5000;
  const rapidDist = op.vectorIds.length * 50;
  const rapidTime = rapidDist / rapidSpeed;
  const plungeTime = (passes * totalDepth) / (tool.feedZ || 300);

  // Helical entry adds time
  const helicalPenalty = op.entry.mode === "ramp-helicoidal" ? passes * 0.2 : 0;
  const accelPenalty = cutTime * 0.1;
  // Finishing pass time
  const finishPenalty = (op.roughFinish.finishPassSide || op.roughFinish.finishPassBottom) ? pathLength / (op.roughFinish.finishFeedRate || feedRate) : 0;
  // Tool change time
  const toolChangePenalty = 0.5; // 30 seconds per tool change

  const estimatedTime = cutTime + rapidTime + plungeTime + accelPenalty + helicalPenalty + finishPenalty + toolChangePenalty;

  return {
    passes,
    pathLength: Math.round(pathLength),
    estimatedTime: Math.round(estimatedTime * 100) / 100,
    rapidTime: Math.round(rapidTime * 100) / 100,
    cutTime: Math.round(cutTime * 100) / 100,
  };
}

export function calculateOperation(op: ToolpathOperation, tool: CncTool | undefined, vectors: SvgVector[]) {
  const result = calculateOperationAdvanced(op, tool, vectors, DEFAULT_MATERIAL);
  return { passes: result.passes, pathLength: result.pathLength, estimatedTime: result.estimatedTime };
}

// ── G-code Generation V4.2 ──

const HEADERS: Record<PostProcessor, string[]> = {
  mach3: ["%", "O0001", "G90 G94 G21", "G17"],
  grbl: ["$H", "G90 G21 G17"],
  ddcs: ["%", "G90 G21 G17"],
  linuxcnc: ["%", "G90 G94 G21 G17", "G40 G49 G80"],
};

const FOOTERS: Record<PostProcessor, string[]> = {
  mach3: ["M05", "G28 G91 Z0", "G28 X0 Y0", "M30", "%"],
  grbl: ["M05", "G0 Z10", "G0 X0 Y0", "M2"],
  ddcs: ["M05", "G0 Z10", "G0 X0 Y0", "M30", "%"],
  linuxcnc: ["M05", "G53 G0 Z0", "G53 G0 X0 Y0", "M2", "%"],
};

const TOOL_CHANGE: Record<PostProcessor, (toolNum: number, toolName: string) => string[]> = {
  mach3: (n, name) => [`M05`, `G0 Z25`, `M06 T${n}`, `(Tool: ${name})`, `G43 H${n}`],
  grbl: (n, name) => [`M05`, `G0 Z25`, `(Tool change: T${n} - ${name})`, `M00 (Pause for tool change)`],
  ddcs: (n, name) => [`M05`, `G0 Z25`, `M06 T${n}`, `(Tool: ${name})`],
  linuxcnc: (n, name) => [`M05`, `G53 G0 Z0`, `T${n} M06`, `(Tool: ${name})`, `G43 H${n}`],
};

const FILE_EXT: Record<PostProcessor, string> = {
  mach3: ".tap",
  grbl: ".gcode",
  ddcs: ".nc",
  linuxcnc: ".ngc",
};

export { FILE_EXT as FILE_EXTENSIONS };

function applyOffset(pt: [number, number], offset: number): [number, number] {
  return [pt[0] + offset, pt[1]];
}

function generateHelicalEntry(
  entry: EntrySettings, startPt: [number, number], targetZ: number, currentZ: number, feedZ: number, offset: number
): string[] {
  const lines: string[] = [];
  const [fx, fy] = applyOffset(startPt, offset);
  const helixR = (entry.helixDiameter || 5) / 2;
  const pitchPerRev = entry.helixPitchPerRev || 0.5;
  const totalDrop = Math.abs(currentZ - targetZ);
  const revolutions = Math.ceil(totalDrop / pitchPerRev);
  const segments = 8;

  lines.push(`(Helical entry: D${(helixR * 2).toFixed(1)}mm, ${revolutions} rev, pitch=${pitchPerRev}mm)`);

  for (let rev = 0; rev < revolutions; rev++) {
    for (let seg = 0; seg < segments; seg++) {
      const frac = (rev * segments + seg + 1) / (revolutions * segments);
      const angle = ((seg + 1) / segments) * Math.PI * 2;
      const rx = fx + Math.cos(angle) * helixR;
      const ry = fy + Math.sin(angle) * helixR;
      const rz = currentZ - totalDrop * frac;
      const zClamped = Math.max(rz, targetZ);
      lines.push(`G1 X${rx.toFixed(3)} Y${ry.toFixed(3)} Z${zClamped.toFixed(3)} F${feedZ}`);
    }
  }
  lines.push(`G1 X${fx.toFixed(3)} Y${fy.toFixed(3)} Z${targetZ.toFixed(3)} F${feedZ}`);
  return lines;
}

function generateTrochoidalPath(
  points: [number, number][],
  trochoidal: TrochoidalSettings,
  z: number,
  feedXY: number,
  offset: number
): string[] {
  const lines: string[] = [];
  const trochR = trochoidal.radius;
  const stepDist = trochoidal.stepDistance;
  const segments = 12;

  lines.push(`(Trochoidal path: R${trochR.toFixed(1)}mm, step=${stepDist.toFixed(1)}mm)`);

  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = applyOffset(points[i], offset);
    const [x2, y2] = applyOffset(points[i + 1], offset);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    if (segLen < 0.1) continue;

    const nx = -dy / segLen;
    const ny = dx / segLen;
    const steps = Math.ceil(segLen / stepDist);

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const cx = x1 + dx * t;
      const cy = y1 + dy * t;

      // Generate circular trochoidal motion
      for (let seg = 0; seg <= segments; seg++) {
        const angle = (seg / segments) * Math.PI * 2;
        const tx = cx + Math.cos(angle) * trochR;
        const ty = cy + Math.sin(angle) * trochR;
        lines.push(`G1 X${tx.toFixed(3)} Y${ty.toFixed(3)} Z${z.toFixed(3)} F${trochoidal.feedRate || feedXY}`);
      }
    }
  }

  return lines;
}

function generateRampEntry(
  entry: EntrySettings, startPt: [number, number], targetZ: number, currentZ: number, feedZ: number, offset: number
): string[] {
  const lines: string[] = [];
  const [fx, fy] = applyOffset(startPt, offset);

  if (entry.mode === "plunge") {
    lines.push(`G1 Z${targetZ.toFixed(3)} F${feedZ}`);
  } else if (entry.mode === "ramp-linear") {
    const rampLen = entry.rampLength || 10;
    lines.push(`G1 X${(fx + rampLen).toFixed(3)} Y${fy.toFixed(3)} Z${targetZ.toFixed(3)} F${feedZ}`);
    lines.push(`G1 X${fx.toFixed(3)} Y${fy.toFixed(3)} F${feedZ}`);
  } else if (entry.mode === "ramp-helicoidal") {
    lines.push(...generateHelicalEntry(entry, startPt, targetZ, currentZ, feedZ, offset));
  }
  return lines;
}

function generateLeadIn(lead: LeadSettings, pt: [number, number], nextPt: [number, number] | undefined, offset: number): string[] {
  if (lead.type === "none" || !nextPt) return [];
  const [px, py] = applyOffset(pt, offset);
  const lines: string[] = [];
  if (lead.type === "line") {
    const dx = nextPt[0] - pt[0];
    const dy = nextPt[1] - pt[1];
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dx / len;
    const ny = -dy / len;
    lines.push(`G0 X${(px + nx * (lead.length || 3)).toFixed(3)} Y${(py + ny * (lead.length || 3)).toFixed(3)}`);
  } else if (lead.type === "arc") {
    const r = lead.radius || 3;
    lines.push(`G2 X${px.toFixed(3)} Y${py.toFixed(3)} R${r.toFixed(3)}`);
  }
  return lines;
}

function generateSnapToolChange(
  slot: SnapToolSlot,
  config: SnapToolConfig,
  postProcessor: PostProcessor
): string[] {
  const lines: string[] = [];
  lines.push(`(=== TROCA SNAPTOOL: T${slot.slotNumber} - ${slot.name || "Sem nome"} ===)`);
  lines.push(`M05`);
  lines.push(`G0 Z${config.safeZ.toFixed(3)}`);

  // Move to tool change position if defined, otherwise to tool slot position
  if (config.changeX !== undefined && config.changeY !== undefined) {
    lines.push(`G0 X${config.changeX.toFixed(4)} Y${config.changeY.toFixed(4)} (posição de troca)`);
  }

  // Move to tool slot position
  lines.push(`G0 X${slot.posX.toFixed(4)} Y${slot.posY.toFixed(4)} (slot T${slot.slotNumber})`);
  lines.push(`M00 (Troque para T${slot.slotNumber}: ${slot.name} D${slot.diameter}mm)`);

  // Auto probing
  if (config.autoProbe) {
    lines.push(`(Probing automático)`);
    lines.push(`G0 Z${config.safeZ.toFixed(3)}`);
    lines.push(`G0 X${config.probeX.toFixed(4)} Y${config.probeY.toFixed(4)} (posição probe)`);
    lines.push(`G38.2 Z-50 F${config.probeFeedRate} (probe descida)`);
    if (config.probeZeroValue !== 0) {
      lines.push(`G10 L20 P1 Z${config.probeZeroValue.toFixed(4)} (zeramento probe)`);
    } else {
      lines.push(`G10 L20 P1 Z0 (zeramento probe)`);
    }
    lines.push(`G0 Z${config.safeZ.toFixed(3)}`);
  }

  lines.push(`(=== FIM TROCA T${slot.slotNumber} ===)`);
  return lines;
}

export function generateGcode(project: ToolpathProject, postProcessor: PostProcessor, customGcode?: CustomGcodeConfig, snapToolConfig?: SnapToolConfig): string {
  const lines: string[] = [];

  // Start block
  if (customGcode?.useCustomStartEnd && customGcode.startGcode.trim()) {
    lines.push(`(=== INÍCIO DO PROGRAMA ===)`);
    lines.push(...customGcode.startGcode.split("\n").filter(l => l.trim()));
    lines.push(`(=== FIM INÍCIO ===)`);
  } else {
    lines.push(...HEADERS[postProcessor]);
  }

  lines.push("");
  const preset = getPresetById(project.material.presetId);

  lines.push(`(Project: ${project.name})`);
  lines.push(`(Material: ${preset?.name || "Custom"} ${project.material.width}x${project.material.height}x${project.material.thickness} ${project.material.unit})`);
  lines.push(`(Generator: Dimension CNC Toolpath V4.2)`);
  if (preset?.coolantRequired) lines.push(`(*** REFRIGERAÇÃO NECESSÁRIA ***)`);
  lines.push("");

  const sortedOps = [...project.operations].filter((o) => o.enabled).sort((a, b) => a.order - b.order);

  let lastToolId = "";
  let toolNumber = 0;

  for (const op of sortedOps) {
    const tool = project.tools.find((t) => t.id === op.toolId);
    if (!tool) continue;

    if (op.toolId !== lastToolId) {
      toolNumber++;
      if (lastToolId !== "") {
        lines.push(...TOOL_CHANGE[postProcessor](toolNumber, tool.name));
      }
      lastToolId = op.toolId;
    }

    lines.push(`(Operation: ${op.name} - ${OPERATION_LABELS[op.type]})`);
    lines.push(`(Tool: ${tool.name} D${tool.diameter})`);
    if (op.entry.mode === "ramp-helicoidal") {
      lines.push(`(Entry: Helical D${op.entry.helixDiameter}mm pitch=${op.entry.helixPitchPerRev}mm/rev)`);
    }
    if (op.trochoidal.enabled) {
      lines.push(`(Strategy: Trochoidal R${op.trochoidal.radius}mm step=${op.trochoidal.stepDistance}mm)`);
    }
    if (op.adaptive.enabled) {
      lines.push(`(Strategy: Adaptive maxStepOver=${op.adaptive.maxStepOver}% maxAngle=${op.adaptive.maxEngagementAngle}°)`);
    }
    if (op.roughFinish.stockToLeaveSide > 0 || op.roughFinish.stockToLeaveBottom > 0) {
      lines.push(`(Stock to leave: side=${op.roughFinish.stockToLeaveSide}mm bottom=${op.roughFinish.stockToLeaveBottom}mm)`);
    }
    lines.push(`M03 S${tool.spindleRpm}`);
    lines.push("G04 P2 (spindle warmup)");

    const totalDepth = Math.abs(op.finalDepth - op.startDepth);
    const passes = Math.ceil(totalDepth / (op.depthPerPass || tool.depthPerPass || 1));
    const sideStock = op.roughFinish.stockToLeaveSide || 0;
    const baseOffset = op.cutSide === "outside" ? tool.diameter / 2 : op.cutSide === "inside" ? -tool.diameter / 2 : 0;
    const offset = baseOffset + (op.cutSide === "outside" ? sideStock : -sideStock);

    for (const vid of op.vectorIds) {
      const v = project.vectors.find((vv) => vv.id === vid);
      if (!v) continue;
      const points = extractPointsFromPath(v.pathData);
      if (points.length < 2) continue;

      for (let pass = 0; pass < passes; pass++) {
        const z = -(op.startDepth + (pass + 1) * (op.depthPerPass || tool.depthPerPass));
        const bottomStock = op.roughFinish.stockToLeaveBottom || 0;
        const zClamped = Math.max(z + bottomStock, -Math.abs(op.finalDepth) + bottomStock);
        const prevZ = pass === 0 ? 5 : -(op.startDepth + pass * (op.depthPerPass || tool.depthPerPass));

        lines.push(`G0 Z5`);
        const [fx, fy] = applyOffset(points[0], offset);
        lines.push(`G0 X${fx.toFixed(3)} Y${fy.toFixed(3)}`);

        const leadInLines = generateLeadIn(op.leadIn, points[0], points[1], offset);
        lines.push(...leadInLines);
        lines.push(...generateRampEntry(op.entry, points[0], zClamped, prevZ > 0 ? 0 : prevZ, tool.feedZ, offset));

        // Use trochoidal path if enabled
        if (op.trochoidal.enabled) {
          lines.push(...generateTrochoidalPath(points, op.trochoidal, zClamped, tool.feedXY, offset));
        } else {
          for (let i = 1; i < points.length; i++) {
            const [px, py] = applyOffset(points[i], offset);

            if (op.tabs.enabled && op.type.startsWith("profile")) {
              const tabZ = zClamped + op.tabs.height;
              const segFrac = i / points.length;
              const tabInt = 1 / (op.tabs.count + 1);
              const isTab = op.tabs.count > 0 && Math.abs(segFrac % tabInt - tabInt / 2) < 0.02;
              if (isTab && pass === passes - 1) {
                lines.push(`G1 Z${Math.min(tabZ, -0.1).toFixed(3)} F${tool.feedZ}`);
                lines.push(`G1 X${px.toFixed(3)} Y${py.toFixed(3)} F${tool.feedXY}`);
                lines.push(`G1 Z${zClamped.toFixed(3)} F${tool.feedZ}`);
                continue;
              }
            }

            lines.push(`G1 X${px.toFixed(3)} Y${py.toFixed(3)} F${tool.feedXY}`);
          }
        }

        if (op.leadOut.type === "line" && points.length >= 2) {
          const lastPt = points[points.length - 1];
          const prevPt = points[points.length - 2];
          const dx = lastPt[0] - prevPt[0];
          const dy = lastPt[1] - prevPt[1];
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          lines.push(`G1 X${(lastPt[0] + (dx / len) * (op.leadOut.length || 3) + offset).toFixed(3)} Y${(lastPt[1] + (dy / len) * (op.leadOut.length || 3)).toFixed(3)} F${tool.feedXY}`);
        } else if (op.leadOut.type === "arc") {
          const [lx, ly] = applyOffset(points[points.length - 1], offset);
          lines.push(`G2 X${lx.toFixed(3)} Y${(ly + (op.leadOut.radius || 3)).toFixed(3)} R${(op.leadOut.radius || 3).toFixed(3)} F${tool.feedXY}`);
        }
      }

      // Finishing pass (if enabled)
      if (op.roughFinish.finishPassSide || op.roughFinish.finishPassBottom) {
        lines.push(`(Finishing pass)`);
        const finishOffset = baseOffset;
        const finishZ = -Math.abs(op.finalDepth);
        const finishFeed = op.roughFinish.finishFeedRate || tool.feedXY * 0.6;

        lines.push(`G0 Z5`);
        const [ffx, ffy] = applyOffset(points[0], finishOffset);
        lines.push(`G0 X${ffx.toFixed(3)} Y${ffy.toFixed(3)}`);
        lines.push(`G1 Z${finishZ.toFixed(3)} F${tool.feedZ}`);

        for (let i = 1; i < points.length; i++) {
          const [px, py] = applyOffset(points[i], finishOffset);
          lines.push(`G1 X${px.toFixed(3)} Y${py.toFixed(3)} F${finishFeed}`);
        }
      }
    }

    lines.push(`G0 Z5`);
    lines.push("");
  }

  // End block
  if (customGcode?.useCustomStartEnd && customGcode.endGcode.trim()) {
    lines.push(`(=== FIM DO PROGRAMA ===)`);
    lines.push(...customGcode.endGcode.split("\n").filter(l => l.trim()));
    lines.push(`(=== FIM ===)`);
  } else {
    lines.push(...FOOTERS[postProcessor]);
  }

  return lines.join("\n");
}

// ── Templates ──

export function saveTemplate(name: string, materialName: string, material: MaterialConfig, tools: CncTool[], operations: ToolpathOperation[]): MachiningTemplate {
  return {
    id: `tpl-${Date.now()}`,
    name,
    materialName,
    material: { ...material },
    tools: tools.map((t) => ({ ...t })),
    defaultOperations: operations.map((op) => ({
      type: op.type,
      depthPerPass: op.depthPerPass,
      cutSide: op.cutSide,
      cutDirection: op.cutDirection,
      entry: { ...op.entry },
      leadIn: { ...op.leadIn },
      leadOut: { ...op.leadOut },
      tabs: { ...op.tabs },
      pocketStrategy: op.pocketStrategy,
      roughFinish: { ...op.roughFinish },
      trochoidal: { ...op.trochoidal },
      adaptive: { ...op.adaptive },
    })),
    createdAt: new Date().toISOString(),
  };
}

export const GEOMETRY_CLASS_LABELS: Record<GeometryClass, string> = {
  hole: "Furo",
  pocket: "Bolso",
  island: "Ilha",
  "contour-inner": "Contorno Int.",
  "contour-outer": "Contorno Ext.",
  groove: "Rasgo",
  "open-path": "Aberto",
};

export const GEOMETRY_CLASS_COLORS: Record<GeometryClass, string> = {
  hole: "#ef4444",
  pocket: "#8b5cf6",
  island: "#f59e0b",
  "contour-inner": "#06b6d4",
  "contour-outer": "#22c55e",
  groove: "#ec4899",
  "open-path": "#94a3b8",
};
