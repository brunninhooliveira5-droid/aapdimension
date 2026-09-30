import type {
  Acm3DFace,
  AcmFlatPiece,
  AcmLine,
  AcmPanel,
  AcmResult,
  AcmParams,
} from "./acm-engine";

export type TrayCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface TrayParams {
  width: number;
  height: number;
  depth: number;
  thickness: number;
  bracketWidth: number;
  bracketHeight: number;
  bracketHoleDiameter: number;
  bracketHoleOffset: number;
  selectedCorners: TrayCorner[];
  simulationProgress: number;
  color: string;
  finish: string;
}

export interface TrayOperation {
  type: "CUT_OUTER" | "CUT_INNER" | "BEND";
  geometry: "line" | "circle";
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  cx?: number;
  cy?: number;
  radius?: number;
}

export interface TrayPiece extends AcmFlatPiece {
  component: "tray" | "corner-bracket";
  corner?: TrayCorner;
  operations: TrayOperation[];
  trayBounds: { x: number; y: number; width: number; height: number };
  documentBounds: { x: number; y: number; width: number; height: number };
}

export interface TrayResult extends AcmResult {
  pieces: TrayPiece[];
  trayBounds: { x: number; y: number; width: number; height: number };
  documentBounds: { x: number; y: number; width: number; height: number };
  metadata: {
    schema: "acm-tray-classic-v1";
    units: "mm";
    componentCount: number;
    corners: TrayCorner[];
    thickness: number;
    color: string;
    finish: string;
  };
  validationErrors: string[];
}

const CORNERS: TrayCorner[] = ["top-left", "top-right", "bottom-left", "bottom-right"];

function line(type: "CUT_OUTER" | "BEND", x1: number, y1: number, x2: number, y2: number): TrayOperation {
  return { type, geometry: "line", x1, y1, x2, y2 };
}

function circle(cx: number, cy: number, radius: number): TrayOperation {
  return { type: "CUT_INNER", geometry: "circle", cx, cy, radius };
}

function operationToLine(operation: TrayOperation): AcmLine | null {
  if (operation.geometry !== "line" || operation.x1 === undefined || operation.y1 === undefined || operation.x2 === undefined || operation.y2 === undefined) return null;
  return {
    type: operation.type === "BEND" ? "bend" : "cut",
    x1: operation.x1,
    y1: operation.y1,
    x2: operation.x2,
    y2: operation.y2,
  };
}

function bracketPosition(corner: TrayCorner, tray: TrayParams, gap: number) {
  const x = corner.includes("left") ? gap : tray.width - gap - tray.bracketWidth;
  const y = corner.includes("top") ? gap : tray.depth - gap - tray.bracketHeight;
  return { x, y };
}

function makeBracket(corner: TrayCorner, tray: TrayParams, index: number): TrayPiece {
  const width = Math.max(tray.bracketWidth, tray.thickness * 2);
  const height = Math.max(tray.bracketHeight, tray.thickness * 2);
  const gap = tray.thickness;
  const x = index * (width + 30);
  const y = tray.depth + 20;
  const holeRadius = tray.bracketHoleDiameter / 2;
  const holeX = x + width / 2;
  const holeY = y + Math.min(height / 2, Math.max(holeRadius + 1, tray.bracketHoleOffset));
  const operations: TrayOperation[] = [
    line("CUT_OUTER", x, y, x + width, y),
    line("CUT_OUTER", x + width, y, x + width, y + height),
    line("CUT_OUTER", x + width, y + height, x, y + height),
    line("CUT_OUTER", x, y + height, x, y),
    circle(holeX, holeY, holeRadius),
    line("BEND", x + width / 2, y, x + width / 2, y + height),
  ];
  const panels: AcmPanel[] = [{ label: `Cantoneira ${corner}`, x, y, width, height }];
  const cutLines = operations.map(operationToLine).filter((item): item is AcmLine => Boolean(item && item.type === "cut"));
  const bendLines = operations.map(operationToLine).filter((item): item is AcmLine => Boolean(item && item.type === "bend"));
  const documentBounds = { x, y, width, height };
  return {
    id: `corner-bracket-${corner}`,
    label: `Cantoneira ${corner}`,
    totalWidth: width,
    totalHeight: height,
    panels,
    cutLines,
    machiningLines: [],
    bendLines,
    component: "corner-bracket",
    corner,
    operations,
    trayBounds: { x: 0, y: 0, width: tray.width, height: tray.depth },
    documentBounds,
  };
}

function bracketFaces(tray: TrayParams): Acm3DFace[] {
  if (tray.simulationProgress < 100) return [];
  const t = tray.thickness;
  const x0 = -tray.width / 2;
  const x1 = tray.width / 2;
  const z0 = -tray.depth / 2;
  const z1 = tray.depth / 2;
  return tray.selectedCorners.map((corner) => {
    const left = corner.includes("left");
    const top = corner.includes("top");
    const x = left ? x0 + t : x1 - t;
    const z = top ? z0 + t : z1 - t;
    return {
      label: `Cantoneira ${corner}`,
      vertices: [[x, 0, z], [x + (left ? t : -t), 0, z], [x + (left ? t : -t), tray.bracketHeight, z], [x, tray.bracketHeight, z]],
      color: tray.color,
    };
  });
}

export function generateClassicTray(input: TrayParams): TrayResult {
  const tray: TrayParams = {
    ...input,
    selectedCorners: CORNERS.filter((corner) => input.selectedCorners.includes(corner)),
  };
  const errors: string[] = [];
  if (tray.width <= 0 || tray.height <= 0 || tray.depth <= 0) errors.push("As dimensões da bandeja devem ser maiores que zero.");
  if (tray.thickness <= 0) errors.push("A espessura deve ser maior que zero.");
  if (tray.bracketHoleDiameter <= 0 || tray.bracketHoleDiameter >= Math.min(tray.bracketWidth, tray.bracketHeight)) errors.push("O diâmetro do furo deve caber na cantoneira.");
  if (tray.bracketWidth > tray.width / 2 || tray.bracketHeight > tray.depth / 2) errors.push("As cantoneiras não podem ultrapassar a bandeja.");
  if (tray.simulationProgress < 0 || tray.simulationProgress > 100) errors.push("A simulação deve estar entre 0% e 100%.");

  const outer: TrayOperation[] = [
    line("CUT_OUTER", 0, 0, tray.width, 0),
    line("CUT_OUTER", tray.width, 0, tray.width, tray.depth),
    line("CUT_OUTER", tray.width, tray.depth, 0, tray.depth),
    line("CUT_OUTER", 0, tray.depth, 0, 0),
    line("BEND", 0, 0, tray.width, 0),
    line("BEND", 0, tray.depth, tray.width, tray.depth),
  ];
  const trayPiece: TrayPiece = {
    id: "classic-tray",
    label: "Bandeja Clássica",
    totalWidth: tray.width,
    totalHeight: tray.depth,
    panels: [{ label: "Fundo da bandeja", x: 0, y: 0, width: tray.width, height: tray.depth }],
    cutLines: outer.map(operationToLine).filter((item): item is AcmLine => Boolean(item && item.type === "cut")),
    machiningLines: [],
    bendLines: outer.map(operationToLine).filter((item): item is AcmLine => Boolean(item && item.type === "bend")),
    component: "tray",
    operations: outer,
    trayBounds: { x: 0, y: 0, width: tray.width, height: tray.depth },
    documentBounds: { x: 0, y: 0, width: tray.width, height: tray.depth },
  };
  const brackets = tray.selectedCorners.map((corner, index) => makeBracket(corner, tray, index));
  const pieces = [trayPiece, ...brackets];
  const maxRight = Math.max(tray.width, ...brackets.map((piece) => piece.documentBounds.x + piece.documentBounds.width));
  const maxBottom = Math.max(tray.depth, ...brackets.map((piece) => piece.documentBounds.y + piece.documentBounds.height));
  const documentBounds = { x: 0, y: 0, width: maxRight, height: maxBottom };
  const faces3d: Acm3DFace[] = [
    { label: "Fundo", vertices: [[-tray.width / 2, 0, -tray.depth / 2], [tray.width / 2, 0, -tray.depth / 2], [tray.width / 2, 0, tray.depth / 2], [-tray.width / 2, 0, tray.depth / 2]], color: tray.color },
    { label: "Lateral frontal", vertices: [[-tray.width / 2, 0, tray.depth / 2], [tray.width / 2, 0, tray.depth / 2], [tray.width / 2, tray.height, tray.depth / 2], [-tray.width / 2, tray.height, tray.depth / 2]], color: tray.color },
    { label: "Lateral traseira", vertices: [[tray.width / 2, 0, -tray.depth / 2], [-tray.width / 2, 0, -tray.depth / 2], [-tray.width / 2, tray.height, -tray.depth / 2], [tray.width / 2, tray.height, -tray.depth / 2]], color: tray.color },
    { label: "Lateral esquerda", vertices: [[-tray.width / 2, 0, -tray.depth / 2], [-tray.width / 2, 0, tray.depth / 2], [-tray.width / 2, tray.height, tray.depth / 2], [-tray.width / 2, tray.height, -tray.depth / 2]], color: tray.color },
    { label: "Lateral direita", vertices: [[tray.width / 2, 0, tray.depth / 2], [tray.width / 2, 0, -tray.depth / 2], [tray.width / 2, tray.height, -tray.depth / 2], [tray.width / 2, tray.height, tray.depth / 2]], color: tray.color },
    ...bracketFaces(tray),
  ];
  return {
    pieces,
    faces3d,
    totalPieces: pieces.length,
    materialArea: pieces.reduce((sum, piece) => sum + piece.totalWidth * piece.totalHeight, 0),
    trayBounds: trayPiece.trayBounds,
    documentBounds,
    metadata: { schema: "acm-tray-classic-v1", units: "mm", componentCount: pieces.length, corners: tray.selectedCorners, thickness: tray.thickness, color: tray.color, finish: tray.finish },
    validationErrors: errors,
  };
}

export function trayParamsFromAcm(params: AcmParams): TrayParams {
  return {
    width: params.width,
    height: params.height,
    depth: params.depth,
    thickness: params.material === "acm_4mm" ? 4 : 3,
    bracketWidth: params.bracketWidth ?? 35,
    bracketHeight: params.bracketHeight ?? 35,
    bracketHoleDiameter: params.bracketHoleDiameter ?? 6,
    bracketHoleOffset: params.bracketHoleOffset ?? 12,
    selectedCorners: params.selectedCorners ?? [],
    simulationProgress: params.simulationProgress ?? 100,
    color: params.trayColor ?? "hsl(var(--primary) / 0.35)",
    finish: params.trayFinish ?? "natural",
  };
}
