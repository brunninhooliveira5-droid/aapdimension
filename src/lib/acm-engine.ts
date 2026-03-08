/**
 * ACM Parametric Planner Engine
 * Generates 3D objects and 2D flat patterns for ACM (Aluminum Composite Material) fabrication
 */

// ─── Types ───────────────────────────────────────────────────────

export type AcmObjectType =
  | "box"
  | "niche"
  | "totem"
  | "column"
  | "panel_return"
  | "panel_chamfer"
  | "prism"
  | "truncated_pyramid"
  | "letter_box"
  | "faceted";

export type AcmMaterial = "acm_3mm" | "acm_4mm";
export type AcmMode = "quick" | "advanced";
export type BendType = "v_groove" | "channel" | "score";

export interface AcmParams {
  projectName: string;
  objectType: AcmObjectType;
  mode: AcmMode;
  material: AcmMaterial;
  // Dimensions (applicable per object type)
  width: number;
  height: number;
  depth: number;
  // Panel / chamfer specifics
  returnDepth: number;
  chamferAngle: number;
  // Letter box
  letterChar: string;
  letterFont: string;
  // Prism / pyramid
  sides: number;
  topWidth: number; // for truncated pyramid
  // Glue tabs
  glueTabs: boolean;
  glueTabWidth: number;
  // Advanced bend parameters
  bendType: BendType;
  channelWidth: number;   // width of the V-groove channel
  machiningDepth: number; // how deep to machine (leaving skin)
  bendAllowance: number;  // compensation for bend radius
  closingGap: number;     // gap left when closing
}

export interface AcmFlatPiece {
  id: string;
  label: string;
  totalWidth: number;
  totalHeight: number;
  /** Flat pattern segments: regions separated by bend lines */
  panels: AcmPanel[];
  /** Lines for export */
  cutLines: AcmLine[];
  machiningLines: AcmLine[];
  bendLines: AcmLine[];
}

export interface AcmPanel {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AcmLine {
  type: "cut" | "machining" | "bend";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Acm3DFace {
  label: string;
  vertices: [number, number, number][];
  color: string;
}

export interface AcmResult {
  pieces: AcmFlatPiece[];
  faces3d: Acm3DFace[];
  totalPieces: number;
  materialArea: number;
}

// ─── Defaults ────────────────────────────────────────────────────

export const defaultAcmParams: AcmParams = {
  projectName: "Meu Projeto ACM",
  objectType: "box",
  mode: "quick",
  material: "acm_3mm",
  width: 500,
  height: 300,
  depth: 100,
  returnDepth: 30,
  chamferAngle: 45,
  letterChar: "A",
  letterFont: "Arial",
  sides: 6,
  topWidth: 300,
  glueTabs: true,
  glueTabWidth: 15,
  bendType: "v_groove",
  channelWidth: 2.5,
  machiningDepth: 2.5,
  bendAllowance: 1.5,
  closingGap: 0.5,
};

export const ACM_OBJECT_OPTIONS: { value: AcmObjectType; label: string }[] = [
  { value: "box", label: "Caixa Retangular" },
  { value: "niche", label: "Nicho" },
  { value: "totem", label: "Totem" },
  { value: "column", label: "Coluna" },
  { value: "panel_return", label: "Painel com Retorno" },
  { value: "panel_chamfer", label: "Painel Chanfrado" },
  { value: "prism", label: "Prisma" },
  { value: "truncated_pyramid", label: "Pirâmide Truncada" },
  { value: "letter_box", label: "Letra Caixa" },
  { value: "faceted", label: "Forma Facetada Simples" },
];

// ─── Helpers ─────────────────────────────────────────────────────

function getThickness(mat: AcmMaterial): number {
  return mat === "acm_3mm" ? 3 : 4;
}

function getBendDeduction(params: AcmParams): number {
  if (params.mode === "quick") {
    // Simple deduction: channel width for V-groove
    return params.channelWidth;
  }
  return params.channelWidth - params.bendAllowance + params.closingGap;
}

// ─── Generators ──────────────────────────────────────────────────

function generateBox(p: AcmParams): AcmResult {
  const t = getThickness(p.material);
  const bd = getBendDeduction(p);
  const W = p.width;
  const H = p.height;
  const D = p.depth;
  const tab = p.glueTabs ? p.glueTabWidth : 0;

  // Flat pattern: Front panel unfolded with top, bottom, sides bending
  // Layout: [glue tab] [left side] [front] [right side] [glue tab]
  // With top and bottom flaps on front

  const flatW = (p.glueTabs ? tab : 0) + D + W + D + (p.glueTabs ? tab : 0);
  const flatH = D + H + D;

  const panels: AcmPanel[] = [];
  const bendLines: AcmLine[] = [];
  const cutLines: AcmLine[] = [];
  const machiningLines: AcmLine[] = [];

  let x = 0;

  // Glue tab left
  if (p.glueTabs) {
    panels.push({ label: "Aba", x, y: D, width: tab, height: H });
    x += tab;
    bendLines.push({ type: "bend", x1: x, y1: D, x2: x, y2: D + H });
    machiningLines.push({ type: "machining", x1: x, y1: D, x2: x, y2: D + H });
  }

  // Left side
  panels.push({ label: "Lateral Esq.", x, y: D, width: D, height: H });
  x += D;
  bendLines.push({ type: "bend", x1: x, y1: 0, x2: x, y2: flatH });
  machiningLines.push({ type: "machining", x1: x, y1: 0, x2: x, y2: flatH });

  // Top flap
  panels.push({ label: "Topo", x, y: 0, width: W, height: D });

  // Front
  panels.push({ label: "Frente", x, y: D, width: W, height: H });

  // Bottom flap
  panels.push({ label: "Fundo", x, y: D + H, width: W, height: D });

  // Bend lines for top/bottom
  bendLines.push({ type: "bend", x1: x, y1: D, x2: x + W, y2: D });
  machiningLines.push({ type: "machining", x1: x, y1: D, x2: x + W, y2: D });
  bendLines.push({ type: "bend", x1: x, y1: D + H, x2: x + W, y2: D + H });
  machiningLines.push({ type: "machining", x1: x, y1: D + H, x2: x + W, y2: D + H });

  x += W;
  bendLines.push({ type: "bend", x1: x, y1: 0, x2: x, y2: flatH });
  machiningLines.push({ type: "machining", x1: x, y1: 0, x2: x, y2: flatH });

  // Right side
  panels.push({ label: "Lateral Dir.", x, y: D, width: D, height: H });
  x += D;

  // Glue tab right
  if (p.glueTabs) {
    bendLines.push({ type: "bend", x1: x, y1: D, x2: x, y2: D + H });
    machiningLines.push({ type: "machining", x1: x, y1: D, x2: x, y2: D + H });
    panels.push({ label: "Aba", x, y: D, width: tab, height: H });
    x += tab;
  }

  // Outer cut lines (rectangle)
  cutLines.push(
    { type: "cut", x1: 0, y1: 0, x2: flatW, y2: 0 },
    { type: "cut", x1: flatW, y1: 0, x2: flatW, y2: flatH },
    { type: "cut", x1: flatW, y1: flatH, x2: 0, y2: flatH },
    { type: "cut", x1: 0, y1: flatH, x2: 0, y2: 0 },
  );

  // Cut notches for tabs (corners where top/bottom flaps meet side panels)
  if (p.glueTabs) {
    // Left tab top/bottom cuts
    cutLines.push(
      { type: "cut", x1: 0, y1: D, x2: tab, y2: D },
      { type: "cut", x1: 0, y1: D + H, x2: tab, y2: D + H },
    );
  }
  // Side-to-flap transition cuts
  const sideStart = p.glueTabs ? tab : 0;
  cutLines.push(
    { type: "cut", x1: sideStart, y1: D, x2: sideStart, y2: 0 },
    { type: "cut", x1: sideStart, y1: D + H, x2: sideStart, y2: flatH },
  );
  const sideEnd = sideStart + D + W + D;
  cutLines.push(
    { type: "cut", x1: sideEnd, y1: D, x2: sideEnd, y2: 0 },
    { type: "cut", x1: sideEnd, y1: D + H, x2: sideEnd, y2: flatH },
  );
  if (p.glueTabs) {
    cutLines.push(
      { type: "cut", x1: sideEnd, y1: D, x2: flatW, y2: D },
      { type: "cut", x1: sideEnd, y1: D + H, x2: flatW, y2: D + H },
    );
  }

  const piece: AcmFlatPiece = {
    id: "box_flat",
    label: "Caixa Planificada",
    totalWidth: flatW,
    totalHeight: flatH,
    panels,
    cutLines,
    machiningLines,
    bendLines,
  };

  // 3D faces
  const hw = W / 2, hh = H / 2, hd = D / 2;
  const faces3d: Acm3DFace[] = [
    { label: "Frente", vertices: [[-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]], color: "hsl(var(--primary) / 0.35)" },
    { label: "Traseira", vertices: [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, hh, -hd], [-hw, hh, -hd]], color: "hsl(var(--primary) / 0.15)" },
    { label: "Esquerda", vertices: [[-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd]], color: "hsl(var(--primary) / 0.2)" },
    { label: "Direita", vertices: [[hw, -hh, -hd], [hw, -hh, hd], [hw, hh, hd], [hw, hh, -hd]], color: "hsl(var(--primary) / 0.25)" },
    { label: "Topo", vertices: [[-hw, hh, -hd], [hw, hh, -hd], [hw, hh, hd], [-hw, hh, hd]], color: "hsl(var(--primary) / 0.4)" },
    { label: "Fundo", vertices: [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd]], color: "hsl(var(--primary) / 0.3)" },
  ];

  return {
    pieces: [piece],
    faces3d,
    totalPieces: 1,
    materialArea: flatW * flatH,
  };
}

function generateNiche(p: AcmParams): AcmResult {
  // Niche = open-front box
  const W = p.width, H = p.height, D = p.depth;
  const tab = p.glueTabs ? p.glueTabWidth : 0;

  const flatW = tab + D + W + D + tab;
  const flatH = D + H + D;

  const panels: AcmPanel[] = [];
  const bendLines: AcmLine[] = [];
  const cutLines: AcmLine[] = [];
  const machiningLines: AcmLine[] = [];

  let x = 0;
  if (p.glueTabs) {
    panels.push({ label: "Aba", x, y: D, width: tab, height: H });
    x += tab;
    bendLines.push({ type: "bend", x1: x, y1: D, x2: x, y2: D + H });
    machiningLines.push({ type: "machining", x1: x, y1: D, x2: x, y2: D + H });
  }

  panels.push({ label: "Lateral Esq.", x, y: D, width: D, height: H });
  x += D;
  bendLines.push({ type: "bend", x1: x, y1: 0, x2: x, y2: flatH });
  machiningLines.push({ type: "machining", x1: x, y1: 0, x2: x, y2: flatH });

  panels.push({ label: "Topo", x, y: 0, width: W, height: D });
  panels.push({ label: "Fundo (traseira)", x, y: D, width: W, height: H });
  panels.push({ label: "Base", x, y: D + H, width: W, height: D });

  bendLines.push({ type: "bend", x1: x, y1: D, x2: x + W, y2: D });
  machiningLines.push({ type: "machining", x1: x, y1: D, x2: x + W, y2: D });
  bendLines.push({ type: "bend", x1: x, y1: D + H, x2: x + W, y2: D + H });
  machiningLines.push({ type: "machining", x1: x, y1: D + H, x2: x + W, y2: D + H });

  x += W;
  bendLines.push({ type: "bend", x1: x, y1: 0, x2: x, y2: flatH });
  machiningLines.push({ type: "machining", x1: x, y1: 0, x2: x, y2: flatH });

  panels.push({ label: "Lateral Dir.", x, y: D, width: D, height: H });
  x += D;

  if (p.glueTabs) {
    bendLines.push({ type: "bend", x1: x, y1: D, x2: x, y2: D + H });
    machiningLines.push({ type: "machining", x1: x, y1: D, x2: x, y2: D + H });
    panels.push({ label: "Aba", x, y: D, width: tab, height: H });
  }

  cutLines.push(
    { type: "cut", x1: 0, y1: 0, x2: flatW, y2: 0 },
    { type: "cut", x1: flatW, y1: 0, x2: flatW, y2: flatH },
    { type: "cut", x1: flatW, y1: flatH, x2: 0, y2: flatH },
    { type: "cut", x1: 0, y1: flatH, x2: 0, y2: 0 },
  );

  const hw = W / 2, hh = H / 2, hd = D / 2;
  const faces3d: Acm3DFace[] = [
    { label: "Traseira", vertices: [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, hh, -hd], [-hw, hh, -hd]], color: "hsl(var(--primary) / 0.3)" },
    { label: "Esquerda", vertices: [[-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd]], color: "hsl(var(--primary) / 0.2)" },
    { label: "Direita", vertices: [[hw, -hh, -hd], [hw, -hh, hd], [hw, hh, hd], [hw, hh, -hd]], color: "hsl(var(--primary) / 0.25)" },
    { label: "Topo", vertices: [[-hw, hh, -hd], [hw, hh, -hd], [hw, hh, hd], [-hw, hh, hd]], color: "hsl(var(--primary) / 0.4)" },
    { label: "Fundo", vertices: [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd]], color: "hsl(var(--primary) / 0.3)" },
  ];

  return {
    pieces: [{ id: "niche_flat", label: "Nicho Planificado", totalWidth: flatW, totalHeight: flatH, panels, cutLines, machiningLines, bendLines }],
    faces3d,
    totalPieces: 1,
    materialArea: flatW * flatH,
  };
}

function generatePanelReturn(p: AcmParams): AcmResult {
  const W = p.width, H = p.height, R = p.returnDepth;
  const tab = p.glueTabs ? p.glueTabWidth : 0;

  // Flat: [tab] [top return] [face] [bottom return] [tab]
  const flatW = W;
  const flatH = tab + R + H + R + tab;

  const panels: AcmPanel[] = [];
  const bendLines: AcmLine[] = [];
  const machiningLines: AcmLine[] = [];

  let y = 0;
  if (p.glueTabs) {
    panels.push({ label: "Aba Sup.", x: 0, y, width: W, height: tab });
    y += tab;
    bendLines.push({ type: "bend", x1: 0, y1: y, x2: W, y2: y });
    machiningLines.push({ type: "machining", x1: 0, y1: y, x2: W, y2: y });
  }
  panels.push({ label: "Retorno Sup.", x: 0, y, width: W, height: R });
  y += R;
  bendLines.push({ type: "bend", x1: 0, y1: y, x2: W, y2: y });
  machiningLines.push({ type: "machining", x1: 0, y1: y, x2: W, y2: y });
  panels.push({ label: "Face", x: 0, y, width: W, height: H });
  y += H;
  bendLines.push({ type: "bend", x1: 0, y1: y, x2: W, y2: y });
  machiningLines.push({ type: "machining", x1: 0, y1: y, x2: W, y2: y });
  panels.push({ label: "Retorno Inf.", x: 0, y, width: W, height: R });
  y += R;
  if (p.glueTabs) {
    bendLines.push({ type: "bend", x1: 0, y1: y, x2: W, y2: y });
    machiningLines.push({ type: "machining", x1: 0, y1: y, x2: W, y2: y });
    panels.push({ label: "Aba Inf.", x: 0, y, width: W, height: tab });
  }

  const cutLines: AcmLine[] = [
    { type: "cut", x1: 0, y1: 0, x2: flatW, y2: 0 },
    { type: "cut", x1: flatW, y1: 0, x2: flatW, y2: flatH },
    { type: "cut", x1: flatW, y1: flatH, x2: 0, y2: flatH },
    { type: "cut", x1: 0, y1: flatH, x2: 0, y2: 0 },
  ];

  const hw = W / 2, hh = H / 2;
  const faces3d: Acm3DFace[] = [
    { label: "Face", vertices: [[-hw, -hh, 0], [hw, -hh, 0], [hw, hh, 0], [-hw, hh, 0]], color: "hsl(var(--primary) / 0.35)" },
    { label: "Retorno Sup.", vertices: [[-hw, hh, 0], [hw, hh, 0], [hw, hh, -R], [-hw, hh, -R]], color: "hsl(var(--primary) / 0.25)" },
    { label: "Retorno Inf.", vertices: [[-hw, -hh, 0], [hw, -hh, 0], [hw, -hh, -R], [-hw, -hh, -R]], color: "hsl(var(--primary) / 0.2)" },
  ];

  return {
    pieces: [{ id: "panel_flat", label: "Painel Planificado", totalWidth: flatW, totalHeight: flatH, panels, cutLines, machiningLines, bendLines }],
    faces3d,
    totalPieces: 1,
    materialArea: flatW * flatH,
  };
}

function generateTotem(p: AcmParams): AcmResult {
  // Totem: tall rectangular column, open back
  const W = p.width, H = p.height, D = p.depth;
  const tab = p.glueTabs ? p.glueTabWidth : 0;

  const flatW = tab + D + W + D + tab;
  const flatH = H;

  const panels: AcmPanel[] = [];
  const bendLines: AcmLine[] = [];
  const machiningLines: AcmLine[] = [];
  let x = 0;

  if (p.glueTabs) {
    panels.push({ label: "Aba", x, y: 0, width: tab, height: H });
    x += tab;
    bendLines.push({ type: "bend", x1: x, y1: 0, x2: x, y2: H });
    machiningLines.push({ type: "machining", x1: x, y1: 0, x2: x, y2: H });
  }
  panels.push({ label: "Lateral Esq.", x, y: 0, width: D, height: H });
  x += D;
  bendLines.push({ type: "bend", x1: x, y1: 0, x2: x, y2: H });
  machiningLines.push({ type: "machining", x1: x, y1: 0, x2: x, y2: H });
  panels.push({ label: "Frente", x, y: 0, width: W, height: H });
  x += W;
  bendLines.push({ type: "bend", x1: x, y1: 0, x2: x, y2: H });
  machiningLines.push({ type: "machining", x1: x, y1: 0, x2: x, y2: H });
  panels.push({ label: "Lateral Dir.", x, y: 0, width: D, height: H });
  x += D;
  if (p.glueTabs) {
    bendLines.push({ type: "bend", x1: x, y1: 0, x2: x, y2: H });
    machiningLines.push({ type: "machining", x1: x, y1: 0, x2: x, y2: H });
    panels.push({ label: "Aba", x, y: 0, width: tab, height: H });
  }

  const cutLines: AcmLine[] = [
    { type: "cut", x1: 0, y1: 0, x2: flatW, y2: 0 },
    { type: "cut", x1: flatW, y1: 0, x2: flatW, y2: flatH },
    { type: "cut", x1: flatW, y1: flatH, x2: 0, y2: flatH },
    { type: "cut", x1: 0, y1: flatH, x2: 0, y2: 0 },
  ];

  const hw = W / 2, hh = H / 2, hd = D / 2;
  const faces3d: Acm3DFace[] = [
    { label: "Frente", vertices: [[-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]], color: "hsl(var(--primary) / 0.35)" },
    { label: "Esquerda", vertices: [[-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd]], color: "hsl(var(--primary) / 0.2)" },
    { label: "Direita", vertices: [[hw, -hh, -hd], [hw, -hh, hd], [hw, hh, hd], [hw, hh, -hd]], color: "hsl(var(--primary) / 0.25)" },
  ];

  return {
    pieces: [{ id: "totem_flat", label: "Totem Planificado", totalWidth: flatW, totalHeight: flatH, panels, cutLines, machiningLines, bendLines }],
    faces3d,
    totalPieces: 1,
    materialArea: flatW * flatH,
  };
}

function generateColumn(p: AcmParams): AcmResult {
  // Column: 4-sided closed column
  const W = p.width, H = p.height, D = p.depth;
  const tab = p.glueTabs ? p.glueTabWidth : 0;

  const flatW = tab + W + D + W + D + tab;
  const flatH = H;

  const panels: AcmPanel[] = [];
  const bendLines: AcmLine[] = [];
  const machiningLines: AcmLine[] = [];
  let x = 0;

  if (p.glueTabs) {
    panels.push({ label: "Aba", x, y: 0, width: tab, height: H });
    x += tab;
    bendLines.push({ type: "bend", x1: x, y1: 0, x2: x, y2: H });
    machiningLines.push({ type: "machining", x1: x, y1: 0, x2: x, y2: H });
  }
  const sides = [
    { label: "Face 1", w: W },
    { label: "Face 2", w: D },
    { label: "Face 3", w: W },
    { label: "Face 4", w: D },
  ];
  sides.forEach((s, i) => {
    panels.push({ label: s.label, x, y: 0, width: s.w, height: H });
    x += s.w;
    if (i < sides.length - 1 || p.glueTabs) {
      bendLines.push({ type: "bend", x1: x, y1: 0, x2: x, y2: H });
      machiningLines.push({ type: "machining", x1: x, y1: 0, x2: x, y2: H });
    }
  });
  if (p.glueTabs) {
    panels.push({ label: "Aba", x, y: 0, width: tab, height: H });
  }

  const cutLines: AcmLine[] = [
    { type: "cut", x1: 0, y1: 0, x2: flatW, y2: 0 },
    { type: "cut", x1: flatW, y1: 0, x2: flatW, y2: flatH },
    { type: "cut", x1: flatW, y1: flatH, x2: 0, y2: flatH },
    { type: "cut", x1: 0, y1: flatH, x2: 0, y2: 0 },
  ];

  const hw = W / 2, hh = H / 2, hd = D / 2;
  const faces3d: Acm3DFace[] = [
    { label: "Face 1", vertices: [[-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]], color: "hsl(var(--primary) / 0.35)" },
    { label: "Face 2", vertices: [[hw, -hh, hd], [hw, -hh, -hd], [hw, hh, -hd], [hw, hh, hd]], color: "hsl(var(--primary) / 0.25)" },
    { label: "Face 3", vertices: [[hw, -hh, -hd], [-hw, -hh, -hd], [-hw, hh, -hd], [hw, hh, -hd]], color: "hsl(var(--primary) / 0.15)" },
    { label: "Face 4", vertices: [[-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd]], color: "hsl(var(--primary) / 0.2)" },
  ];

  return {
    pieces: [{ id: "column_flat", label: "Coluna Planificada", totalWidth: flatW, totalHeight: flatH, panels, cutLines, machiningLines, bendLines }],
    faces3d,
    totalPieces: 1,
    materialArea: flatW * flatH,
  };
}

function generateGenericFlat(p: AcmParams, label: string): AcmResult {
  // Fallback for types not yet fully implemented — generates a simple flat panel with returns
  const W = p.width, H = p.height, R = p.returnDepth;
  const flatW = W;
  const flatH = R + H + R;

  const panels: AcmPanel[] = [
    { label: "Retorno Sup.", x: 0, y: 0, width: W, height: R },
    { label: "Face", x: 0, y: R, width: W, height: H },
    { label: "Retorno Inf.", x: 0, y: R + H, width: W, height: R },
  ];

  const bendLines: AcmLine[] = [
    { type: "bend", x1: 0, y1: R, x2: W, y2: R },
    { type: "bend", x1: 0, y1: R + H, x2: W, y2: R + H },
  ];
  const machiningLines: AcmLine[] = [
    { type: "machining", x1: 0, y1: R, x2: W, y2: R },
    { type: "machining", x1: 0, y1: R + H, x2: W, y2: R + H },
  ];

  const cutLines: AcmLine[] = [
    { type: "cut", x1: 0, y1: 0, x2: flatW, y2: 0 },
    { type: "cut", x1: flatW, y1: 0, x2: flatW, y2: flatH },
    { type: "cut", x1: flatW, y1: flatH, x2: 0, y2: flatH },
    { type: "cut", x1: 0, y1: flatH, x2: 0, y2: 0 },
  ];

  const hw = W / 2, hh = H / 2;
  const faces3d: Acm3DFace[] = [
    { label: "Face", vertices: [[-hw, -hh, 0], [hw, -hh, 0], [hw, hh, 0], [-hw, hh, 0]], color: "hsl(var(--primary) / 0.35)" },
    { label: "Retorno Sup.", vertices: [[-hw, hh, 0], [hw, hh, 0], [hw, hh, -R], [-hw, hh, -R]], color: "hsl(var(--primary) / 0.25)" },
    { label: "Retorno Inf.", vertices: [[-hw, -hh, 0], [hw, -hh, 0], [hw, -hh, -R], [-hw, -hh, -R]], color: "hsl(var(--primary) / 0.2)" },
  ];

  return {
    pieces: [{ id: `${p.objectType}_flat`, label: `${label} Planificado`, totalWidth: flatW, totalHeight: flatH, panels, cutLines, machiningLines, bendLines }],
    faces3d,
    totalPieces: 1,
    materialArea: flatW * flatH,
  };
}

// ─── Main Generator ──────────────────────────────────────────────

export function generateAcm(params: AcmParams): AcmResult {
  switch (params.objectType) {
    case "box": return generateBox(params);
    case "niche": return generateNiche(params);
    case "totem": return generateTotem(params);
    case "column": return generateColumn(params);
    case "panel_return": return generatePanelReturn(params);
    case "panel_chamfer": return generateGenericFlat(params, "Painel Chanfrado");
    case "prism": return generateGenericFlat(params, "Prisma");
    case "truncated_pyramid": return generateGenericFlat(params, "Pirâmide Truncada");
    case "letter_box": return generateGenericFlat(params, "Letra Caixa");
    case "faceted": return generateGenericFlat(params, "Forma Facetada");
    default: return generateBox(params);
  }
}

// ─── SVG Export ──────────────────────────────────────────────────

export function acmPiecesToSVG(pieces: AcmFlatPiece[]): string {
  const rects: string[] = [];
  let totalW = 0, totalH = 0;

  for (const piece of pieces) {
    totalW = Math.max(totalW, piece.totalWidth);
    totalH = Math.max(totalH, piece.totalHeight);

    // Cut lines (red)
    for (const l of piece.cutLines) {
      rects.push(`<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="#ff0000" stroke-width="0.5"/>`);
    }
    // Machining lines (blue)
    for (const l of piece.machiningLines) {
      rects.push(`<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="#0066ff" stroke-width="0.3" stroke-dasharray="4,2"/>`);
    }
    // Bend lines (green dashed)
    for (const l of piece.bendLines) {
      rects.push(`<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="#00cc44" stroke-width="0.3" stroke-dasharray="6,3"/>`);
    }
    // Panel labels
    for (const panel of piece.panels) {
      rects.push(
        `<text x="${panel.x + panel.width / 2}" y="${panel.y + panel.height / 2}" ` +
        `font-size="8" text-anchor="middle" dominant-baseline="middle" fill="#666">${panel.label}</text>`
      );
    }
  }

  const margin = 10;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW + margin * 2}" height="${totalH + margin * 2}" viewBox="${-margin} ${-margin} ${totalW + margin * 2} ${totalH + margin * 2}">\n${rects.join("\n")}\n</svg>`;
}

// ─── DXF Export ──────────────────────────────────────────────────

export function acmPiecesToDXF(pieces: AcmFlatPiece[]): string {
  let lines = "0\nSECTION\n2\nENTITIES\n";

  const addLine = (x1: number, y1: number, x2: number, y2: number, layer: string) => {
    lines += `0\nLINE\n8\n${layer}\n10\n${x1}\n20\n${y1}\n30\n0\n11\n${x2}\n21\n${y2}\n31\n0\n`;
  };

  for (const piece of pieces) {
    for (const l of piece.cutLines) addLine(l.x1, l.y1, l.x2, l.y2, "CORTE");
    for (const l of piece.machiningLines) addLine(l.x1, l.y1, l.x2, l.y2, "USINAGEM");
    for (const l of piece.bendLines) addLine(l.x1, l.y1, l.x2, l.y2, "DOBRA");
  }

  lines += "0\nENDSEC\n0\nEOF\n";
  return lines;
}
