// ── Toolpath Generator Engine ──
// SVG parsing, toolpath computation, G-code generation

export type Unit = "mm" | "in";
export type ZeroOrigin = "bottom-left" | "center" | "top-left";
export type ZZero = "top" | "bed";
export type CutDirection = "climb" | "conventional";
export type CutSide = "inside" | "outside" | "on-line";

export type ToolType = "flat-end" | "v-bit" | "ball-nose" | "finishing" | "straight";

export interface CncTool {
  id: string;
  name: string;
  type: ToolType;
  diameter: number;
  angle?: number; // v-bit
  feedXY: number;
  feedZ: number;
  spindleRpm: number;
  depthPerPass: number;
  stepOver: number; // percentage 0-100
  fluteLength: number;
  notes: string;
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
  | "finishing";

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
};

export interface TabSettings {
  enabled: boolean;
  count: number;
  width: number;
  height: number;
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
  leadIn: number;
  leadOut: number;
  tabs: TabSettings;
  rampEntry: boolean;
  order: number;
  enabled: boolean;
}

export interface MaterialConfig {
  width: number;
  height: number;
  thickness: number;
  unit: Unit;
  zeroOrigin: ZeroOrigin;
  zZero: ZZero;
}

export interface SvgVector {
  id: string;
  label: string;
  pathData: string; // d attribute
  layer: string;
  selected: boolean;
  color: string;
  boundingBox: { x: number; y: number; w: number; h: number };
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

export type PostProcessor = "mach3" | "grbl" | "ddcs";

// ── SVG Parsing ──

export function parseSvgContent(svgString: string): { vectors: SvgVector[]; viewBox: string } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const svgEl = doc.querySelector("svg");
  const viewBox = svgEl?.getAttribute("viewBox") || "0 0 500 500";

  const vectors: SvgVector[] = [];
  let idx = 0;

  const COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

  function processElement(el: Element, layerName: string) {
    const tag = el.tagName.toLowerCase();

    if (tag === "g") {
      const gLabel = el.getAttribute("inkscape:label") || el.getAttribute("id") || layerName;
      Array.from(el.children).forEach((child) => processElement(child, gLabel));
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
      d = `M${x},${y} L${x + w},${y} L${x + w},${y + h} L${x},${y + h} Z`;
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
      const x1 = el.getAttribute("x1") || "0";
      const y1 = el.getAttribute("y1") || "0";
      const x2 = el.getAttribute("x2") || "0";
      const y2 = el.getAttribute("y2") || "0";
      d = `M${x1},${y1} L${x2},${y2}`;
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

    // Compute bounding box from path data (simplified)
    const nums = d.match(/-?\d+\.?\d*/g)?.map(Number) || [];
    const xs = nums.filter((_, i) => i % 2 === 0);
    const ys = nums.filter((_, i) => i % 2 === 1);
    const minX = Math.min(...(xs.length ? xs : [0]));
    const minY = Math.min(...(ys.length ? ys : [0]));
    const maxX = Math.max(...(xs.length ? xs : [0]));
    const maxY = Math.max(...(ys.length ? ys : [0]));

    vectors.push({
      id: `v-${idx}`,
      label: el.getAttribute("id") || `${tag}-${idx}`,
      pathData: d,
      layer: layerName,
      selected: false,
      color: COLORS[idx % COLORS.length],
      boundingBox: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
    });
    idx++;
  }

  if (svgEl) {
    Array.from(svgEl.children).forEach((child) => processElement(child, "Default"));
  }

  return { vectors, viewBox };
}

// ── Path Length Estimation ──

function estimatePathLength(d: string): number {
  // Simple estimation from path data coordinates
  const nums = d.match(/-?\d+\.?\d*/g)?.map(Number) || [];
  let length = 0;
  for (let i = 2; i < nums.length - 1; i += 2) {
    const dx = (nums[i] || 0) - (nums[i - 2] || 0);
    const dy = (nums[i + 1] || 0) - (nums[i - 1] || 0);
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return length;
}

// ── Operation Calculations ──

export function calculateOperation(op: ToolpathOperation, tool: CncTool | undefined, vectors: SvgVector[]) {
  if (!tool) return { passes: 0, pathLength: 0, estimatedTime: 0 };

  const totalDepth = Math.abs(op.finalDepth - op.startDepth);
  const passes = Math.ceil(totalDepth / (op.depthPerPass || tool.depthPerPass || 1));

  let pathLength = 0;
  for (const vid of op.vectorIds) {
    const v = vectors.find((vv) => vv.id === vid);
    if (v) pathLength += estimatePathLength(v.pathData);
  }

  // offset for profile operations
  if (op.type === "pocket") {
    const stepOverMm = tool.diameter * (tool.stepOver / 100);
    if (stepOverMm > 0) {
      // rough estimate: area / stepover * passes
      const avgWidth = pathLength > 0 ? pathLength / 4 : 50; // rough
      pathLength = pathLength * (avgWidth / stepOverMm) * 0.6;
    }
  }

  const totalPath = pathLength * passes;
  const feedRate = tool.feedXY || 1000;
  const estimatedTime = totalPath / feedRate; // minutes

  return { passes, pathLength: Math.round(pathLength), estimatedTime: Math.round(estimatedTime * 100) / 100 };
}

// ── G-code Generation ──

const HEADERS: Record<PostProcessor, string[]> = {
  mach3: ["%", "O0001", "G90 G94 G21", "G17"],
  grbl: ["$H", "G90 G21 G17"],
  ddcs: ["%", "G90 G21 G17"],
};

const FOOTERS: Record<PostProcessor, string[]> = {
  mach3: ["M05", "G28 G91 Z0", "G28 X0 Y0", "M30", "%"],
  grbl: ["M05", "G0 Z10", "G0 X0 Y0", "M2"],
  ddcs: ["M05", "G0 Z10", "G0 X0 Y0", "M30", "%"],
};

export function generateGcode(
  project: ToolpathProject,
  postProcessor: PostProcessor
): string {
  const lines: string[] = [...HEADERS[postProcessor]];
  lines.push(`(Project: ${project.name})`);
  lines.push(`(Material: ${project.material.width}x${project.material.height}x${project.material.thickness} ${project.material.unit})`);
  lines.push("");

  const sortedOps = [...project.operations]
    .filter((o) => o.enabled)
    .sort((a, b) => a.order - b.order);

  for (const op of sortedOps) {
    const tool = project.tools.find((t) => t.id === op.toolId);
    if (!tool) continue;

    lines.push(`(Operation: ${op.name} - ${OPERATION_LABELS[op.type]})`);
    lines.push(`(Tool: ${tool.name} D${tool.diameter})`);
    lines.push(`M03 S${tool.spindleRpm}`);
    lines.push("G04 P2 (spindle warmup)");

    const totalDepth = Math.abs(op.finalDepth - op.startDepth);
    const passes = Math.ceil(totalDepth / (op.depthPerPass || tool.depthPerPass || 1));

    // Get path points from vectors
    for (const vid of op.vectorIds) {
      const v = project.vectors.find((vv) => vv.id === vid);
      if (!v) continue;

      const points = extractPointsFromPath(v.pathData);
      if (points.length < 2) continue;

      // Offset for cut side
      const offset = op.cutSide === "outside" ? tool.diameter / 2 : op.cutSide === "inside" ? -tool.diameter / 2 : 0;

      for (let pass = 0; pass < passes; pass++) {
        const z = -(op.startDepth + (pass + 1) * (op.depthPerPass || tool.depthPerPass));
        const zClamped = Math.max(z, -Math.abs(op.finalDepth));

        // Safe height
        lines.push(`G0 Z5`);

        // Move to first point
        const [fx, fy] = applyOffset(points[0], offset);
        lines.push(`G0 X${fx.toFixed(3)} Y${fy.toFixed(3)}`);

        // Plunge
        if (op.rampEntry && points.length > 2) {
          lines.push(`G1 Z${zClamped.toFixed(3)} F${tool.feedZ}`);
        } else {
          lines.push(`G1 Z${zClamped.toFixed(3)} F${tool.feedZ}`);
        }

        // Cut path
        for (let i = 1; i < points.length; i++) {
          const [px, py] = applyOffset(points[i], offset);

          // Handle tabs
          if (op.tabs.enabled && op.type.startsWith("profile")) {
            const tabZ = zClamped + op.tabs.height;
            const segmentFraction = i / points.length;
            const tabInterval = 1 / (op.tabs.count + 1);
            const isTabZone = op.tabs.count > 0 && Math.abs(segmentFraction % tabInterval - tabInterval / 2) < 0.02;
            if (isTabZone && pass === passes - 1) {
              lines.push(`G1 Z${Math.min(tabZ, -0.1).toFixed(3)} F${tool.feedZ}`);
              lines.push(`G1 X${px.toFixed(3)} Y${py.toFixed(3)} F${tool.feedXY}`);
              lines.push(`G1 Z${zClamped.toFixed(3)} F${tool.feedZ}`);
              continue;
            }
          }

          lines.push(`G1 X${px.toFixed(3)} Y${py.toFixed(3)} F${tool.feedXY}`);
        }
      }
    }

    lines.push(`G0 Z5`);
    lines.push("");
  }

  lines.push(...FOOTERS[postProcessor]);
  return lines.join("\n");
}

function extractPointsFromPath(d: string): [number, number][] {
  const points: [number, number][] = [];
  // Simple parser for M, L, Z commands (handles most SVG paths)
  const regex = /([MLHVCSQTAZmlhvcsqtaz])\s*([^MLHVCSQTAZmlhvcsqtaz]*)/g;
  let match;
  let cx = 0, cy = 0;

  while ((match = regex.exec(d)) !== null) {
    const cmd = match[1];
    const args = match[2].trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));

    switch (cmd) {
      case "M":
        for (let i = 0; i < args.length - 1; i += 2) {
          cx = args[i]; cy = args[i + 1];
          points.push([cx, cy]);
        }
        break;
      case "m":
        for (let i = 0; i < args.length - 1; i += 2) {
          cx += args[i]; cy += args[i + 1];
          points.push([cx, cy]);
        }
        break;
      case "L":
        for (let i = 0; i < args.length - 1; i += 2) {
          cx = args[i]; cy = args[i + 1];
          points.push([cx, cy]);
        }
        break;
      case "l":
        for (let i = 0; i < args.length - 1; i += 2) {
          cx += args[i]; cy += args[i + 1];
          points.push([cx, cy]);
        }
        break;
      case "H":
        cx = args[0]; points.push([cx, cy]);
        break;
      case "h":
        cx += args[0]; points.push([cx, cy]);
        break;
      case "V":
        cy = args[0]; points.push([cx, cy]);
        break;
      case "v":
        cy += args[0]; points.push([cx, cy]);
        break;
      case "Z":
      case "z":
        if (points.length > 0) points.push([...points[0]]);
        break;
      case "A":
      case "a": {
        // Approximate arc with endpoint
        const abs = cmd === "A";
        for (let i = 0; i + 6 < args.length; i += 7) {
          if (abs) {
            cx = args[i + 5]; cy = args[i + 6];
          } else {
            cx += args[i + 5]; cy += args[i + 6];
          }
          points.push([cx, cy]);
        }
        break;
      }
      case "C":
        for (let i = 0; i + 5 < args.length; i += 6) {
          cx = args[i + 4]; cy = args[i + 5];
          points.push([cx, cy]);
        }
        break;
      case "c":
        for (let i = 0; i + 5 < args.length; i += 6) {
          cx += args[i + 4]; cy += args[i + 5];
          points.push([cx, cy]);
        }
        break;
      case "Q":
        for (let i = 0; i + 3 < args.length; i += 4) {
          cx = args[i + 2]; cy = args[i + 3];
          points.push([cx, cy]);
        }
        break;
      case "q":
        for (let i = 0; i + 3 < args.length; i += 4) {
          cx += args[i + 2]; cy += args[i + 3];
          points.push([cx, cy]);
        }
        break;
      default:
        break;
    }
  }
  return points;
}

function applyOffset(pt: [number, number], offset: number): [number, number] {
  // Simplified offset — in real CAM this would follow normal vectors
  return [pt[0] + offset, pt[1]];
}

// ── Default presets ──

export const DEFAULT_TOOLS: CncTool[] = [
  {
    id: "tool-1",
    name: "Fresa Reta 3mm",
    type: "straight",
    diameter: 3,
    feedXY: 1200,
    feedZ: 300,
    spindleRpm: 18000,
    depthPerPass: 1,
    stepOver: 40,
    fluteLength: 15,
    notes: "",
  },
  {
    id: "tool-2",
    name: "Fresa Reta 6mm",
    type: "flat-end",
    diameter: 6,
    feedXY: 2000,
    feedZ: 500,
    spindleRpm: 18000,
    depthPerPass: 2,
    stepOver: 45,
    fluteLength: 20,
    notes: "",
  },
  {
    id: "tool-3",
    name: "V-Bit 60°",
    type: "v-bit",
    diameter: 6,
    angle: 60,
    feedXY: 1000,
    feedZ: 200,
    spindleRpm: 18000,
    depthPerPass: 0.5,
    stepOver: 30,
    fluteLength: 10,
    notes: "",
  },
  {
    id: "tool-4",
    name: "Fresa Esférica 3mm",
    type: "ball-nose",
    diameter: 3,
    feedXY: 1500,
    feedZ: 300,
    spindleRpm: 20000,
    depthPerPass: 0.5,
    stepOver: 15,
    fluteLength: 12,
    notes: "Para acabamento 3D",
  },
];

export const DEFAULT_MATERIAL: MaterialConfig = {
  width: 300,
  height: 200,
  thickness: 18,
  unit: "mm",
  zeroOrigin: "bottom-left",
  zZero: "top",
};

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
    leadIn: 0,
    leadOut: 0,
    tabs: { enabled: false, count: 4, width: 5, height: 2 },
    rampEntry: false,
    order,
    enabled: true,
  };
}
