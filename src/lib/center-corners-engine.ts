// ── Center & Corners Engine ─────────────────────────────
// Generates G-code routines for finding corners, rectangular
// centers, circular centers, and hole centers via touch probe.

export type LocationMode = "corner" | "rect-center" | "circle-center" | "hole-center";
export type ApproachDirection = "X+" | "X-" | "Y+" | "Y-";

export interface CenterCornersConfig {
  mode: LocationMode;
  safeZ: number;
  probeFeed: number;
  probeDepth: number;
  probeDiameter: number;
  /** For corner: which corner to find */
  cornerQuadrant: "front-left" | "front-right" | "back-left" | "back-right";
  /** For rect/circle: approximate dimension to travel */
  approxSizeX: number;
  approxSizeY: number;
  /** For circle/hole: approximate diameter */
  approxDiameter: number;
  /** Number of touch points for circular mode */
  circlePoints: number;
  /** Set origin after finding */
  setOrigin: boolean;
  /** Move to found point */
  moveToCenter: boolean;
  decimalPlaces: number;
  /** Controller */
  controller: "mach3" | "grbl" | "linuxcnc";
}

export const defaultCenterCornersConfig: CenterCornersConfig = {
  mode: "corner",
  safeZ: 5,
  probeFeed: 50,
  probeDepth: -5,
  probeDiameter: 3,
  cornerQuadrant: "front-left",
  approxSizeX: 100,
  approxSizeY: 100,
  approxDiameter: 50,
  circlePoints: 4,
  setOrigin: true,
  moveToCenter: true,
  decimalPlaces: 3,
  controller: "mach3",
};

export interface CenterCornersResult {
  code: string;
  fileName: string;
  description: string;
}

function fmt(v: number, dp: number): string {
  return v.toFixed(dp);
}

function probeCmd(controller: string): string {
  if (controller === "grbl") return "G38.2";
  return "G31";
}

function setOriginCmd(controller: string, axis: string, value: string): string {
  if (controller === "grbl") return `G10 L20 P1 ${axis}${value}`;
  if (controller === "linuxcnc") return `G10 L20 P1 ${axis}${value}`;
  // Mach3 uses G92
  return `G92 ${axis}${value}`;
}

export function generateCenterCornersGcode(cfg: CenterCornersConfig): CenterCornersResult {
  const d = (v: number) => fmt(v, cfg.decimalPlaces);
  const probe = probeCmd(cfg.controller);
  const r = cfg.probeDiameter / 2;
  const out: string[] = [];

  out.push("(==============================================)");
  out.push("(  Centro e Quinas - Dimension CNC             )");

  switch (cfg.mode) {
    case "corner":
      return generateCorner(cfg, out, d, probe, r);
    case "rect-center":
      return generateRectCenter(cfg, out, d, probe, r);
    case "circle-center":
      return generateCircleCenter(cfg, out, d, probe, r);
    case "hole-center":
      return generateHoleCenter(cfg, out, d, probe, r);
  }
}

function generateCorner(
  cfg: CenterCornersConfig, out: string[], d: (v: number) => string,
  probe: string, r: number
): CenterCornersResult {
  const dirX = cfg.cornerQuadrant.includes("left") ? 1 : -1;
  const dirY = cfg.cornerQuadrant.includes("front") ? 1 : -1;
  const approachDist = 10;

  out.push(`(  Modo: Encontrar Quina - ${cfg.cornerQuadrant})`);
  out.push("(==============================================)");
  out.push("");
  out.push("G90 G21");
  out.push(`G0 Z${d(cfg.safeZ)}`);
  out.push("");

  // Touch X side
  out.push("( --- Toque no eixo X --- )");
  out.push(`G0 X${d(dirX * -approachDist)} Y0`);
  out.push(`G0 Z${d(cfg.probeDepth)}`);
  out.push(`${probe} X${d(dirX * (approachDist + 5))} F${d(cfg.probeFeed)}`);
  out.push(`G0 Z${d(cfg.safeZ)}`);
  out.push("");

  // Store X position (Mach3 uses #2000)
  if (cfg.controller === "mach3") {
    out.push("#2010 = #2000");
    out.push(`#2010 = #2010 + ${d(dirX * r)}`);
  }

  // Touch Y side
  out.push("( --- Toque no eixo Y --- )");
  out.push(`G0 X0 Y${d(dirY * -approachDist)}`);
  out.push(`G0 Z${d(cfg.probeDepth)}`);
  out.push(`${probe} Y${d(dirY * (approachDist + 5))} F${d(cfg.probeFeed)}`);
  out.push(`G0 Z${d(cfg.safeZ)}`);
  out.push("");

  if (cfg.controller === "mach3") {
    out.push("#2011 = #2001");
    out.push(`#2011 = #2011 + ${d(dirY * r)}`);
  }

  if (cfg.setOrigin) {
    out.push("( --- Definir origem --- )");
    if (cfg.controller === "mach3") {
      out.push("G0 X#2010 Y#2011");
      out.push(setOriginCmd(cfg.controller, "X", "0") + " " + setOriginCmd(cfg.controller, "Y", "0").replace("G92 ", ""));
    } else {
      out.push(setOriginCmd(cfg.controller, "X", "0"));
      out.push(setOriginCmd(cfg.controller, "Y", "0"));
    }
  }

  if (cfg.moveToCenter) {
    out.push("");
    out.push("( --- Mover para quina --- )");
    out.push("G0 X0 Y0");
  }

  out.push("");
  out.push("M30");

  return { code: out.join("\n"), fileName: "CC_Quina.tap", description: `Localizar quina ${cfg.cornerQuadrant}` };
}

function generateRectCenter(
  cfg: CenterCornersConfig, out: string[], d: (v: number) => string,
  probe: string, r: number
): CenterCornersResult {
  const halfX = cfg.approxSizeX / 2 + 10;
  const halfY = cfg.approxSizeY / 2 + 10;

  out.push("(  Modo: Centro Retangular                     )");
  out.push("(==============================================)");
  out.push("");
  out.push("G90 G21");
  out.push(`G0 Z${d(cfg.safeZ)}`);
  out.push("");

  // Touch left X
  out.push("( --- Toque lado esquerdo (X-) --- )");
  out.push(`G0 X${d(-halfX)} Y0`);
  out.push(`G0 Z${d(cfg.probeDepth)}`);
  out.push(`${probe} X${d(halfX)} F${d(cfg.probeFeed)}`);
  if (cfg.controller === "mach3") out.push("#2010 = #2000");
  out.push(`G0 Z${d(cfg.safeZ)}`);
  out.push("");

  // Touch right X
  out.push("( --- Toque lado direito (X+) --- )");
  out.push(`G0 X${d(halfX)} Y0`);
  out.push(`G0 Z${d(cfg.probeDepth)}`);
  out.push(`${probe} X${d(-halfX)} F${d(cfg.probeFeed)}`);
  if (cfg.controller === "mach3") out.push("#2011 = #2000");
  out.push(`G0 Z${d(cfg.safeZ)}`);
  out.push("");

  // Calculate center X
  if (cfg.controller === "mach3") {
    out.push("( --- Centro X --- )");
    out.push("#2020 = [#2010 + #2011] / 2");
  }

  // Touch front Y
  out.push("( --- Toque lado frontal (Y-) --- )");
  out.push(`G0 X0 Y${d(-halfY)}`);
  out.push(`G0 Z${d(cfg.probeDepth)}`);
  out.push(`${probe} Y${d(halfY)} F${d(cfg.probeFeed)}`);
  if (cfg.controller === "mach3") out.push("#2012 = #2001");
  out.push(`G0 Z${d(cfg.safeZ)}`);
  out.push("");

  // Touch back Y
  out.push("( --- Toque lado traseiro (Y+) --- )");
  out.push(`G0 X0 Y${d(halfY)}`);
  out.push(`G0 Z${d(cfg.probeDepth)}`);
  out.push(`${probe} Y${d(-halfY)} F${d(cfg.probeFeed)}`);
  if (cfg.controller === "mach3") out.push("#2013 = #2001");
  out.push(`G0 Z${d(cfg.safeZ)}`);
  out.push("");

  // Calculate center Y
  if (cfg.controller === "mach3") {
    out.push("( --- Centro Y --- )");
    out.push("#2021 = [#2012 + #2013] / 2");
  }

  if (cfg.moveToCenter) {
    out.push("");
    out.push("( --- Mover para centro --- )");
    if (cfg.controller === "mach3") {
      out.push("G0 X#2020 Y#2021");
    } else {
      out.push("G0 X0 Y0");
    }
  }

  if (cfg.setOrigin) {
    out.push("");
    out.push("( --- Definir origem no centro --- )");
    out.push(setOriginCmd(cfg.controller, "X", "0"));
    out.push(setOriginCmd(cfg.controller, "Y", "0"));
  }

  out.push("");
  out.push("M30");

  return { code: out.join("\n"), fileName: "CC_CentroRetangular.tap", description: "Localizar centro de peça retangular" };
}

function generateCircleCenter(
  cfg: CenterCornersConfig, out: string[], d: (v: number) => string,
  probe: string, r: number
): CenterCornersResult {
  const radius = cfg.approxDiameter / 2 + 10;
  const pts = Math.max(3, cfg.circlePoints);

  out.push("(  Modo: Centro Circular                       )");
  out.push(`(  Pontos de medição: ${pts}                   )`);
  out.push("(==============================================)");
  out.push("");
  out.push("G90 G21");
  out.push(`G0 Z${d(cfg.safeZ)}`);
  out.push("");

  for (let i = 0; i < pts; i++) {
    const angle = (i / pts) * Math.PI * 2;
    const startX = Math.cos(angle) * radius;
    const startY = Math.sin(angle) * radius;
    const targetX = -Math.cos(angle) * radius;
    const targetY = -Math.sin(angle) * radius;
    const angleDeg = Math.round((angle * 180) / Math.PI);

    out.push(`( --- Toque ponto ${i + 1} (${angleDeg}°) --- )`);
    out.push(`G0 X${d(startX)} Y${d(startY)}`);
    out.push(`G0 Z${d(cfg.probeDepth)}`);
    out.push(`${probe} X${d(targetX)} Y${d(targetY)} F${d(cfg.probeFeed)}`);
    if (cfg.controller === "mach3") {
      out.push(`#${2010 + i * 2} = #2000`);
      out.push(`#${2011 + i * 2} = #2001`);
    }
    out.push(`G0 Z${d(cfg.safeZ)}`);
    out.push("");
  }

  out.push("( --- Calcular centro --- )");
  if (cfg.controller === "mach3" && pts >= 3) {
    const xVars = Array.from({ length: pts }, (_, i) => `#${2010 + i * 2}`).join(" + ");
    const yVars = Array.from({ length: pts }, (_, i) => `#${2011 + i * 2}`).join(" + ");
    out.push(`#2050 = [${xVars}] / ${pts}`);
    out.push(`#2051 = [${yVars}] / ${pts}`);
  }

  if (cfg.moveToCenter) {
    out.push("");
    out.push("( --- Mover para centro --- )");
    if (cfg.controller === "mach3") {
      out.push("G0 X#2050 Y#2051");
    } else {
      out.push("G0 X0 Y0");
    }
  }

  if (cfg.setOrigin) {
    out.push("");
    out.push("( --- Definir origem no centro --- )");
    out.push(setOriginCmd(cfg.controller, "X", "0"));
    out.push(setOriginCmd(cfg.controller, "Y", "0"));
  }

  out.push("");
  out.push("M30");

  return { code: out.join("\n"), fileName: "CC_CentroCircular.tap", description: "Localizar centro de peça circular" };
}

function generateHoleCenter(
  cfg: CenterCornersConfig, out: string[], d: (v: number) => string,
  probe: string, r: number
): CenterCornersResult {
  const approachDist = cfg.approxDiameter / 2 - 2;

  out.push("(  Modo: Centro de Furo                        )");
  out.push("(==============================================)");
  out.push("");
  out.push("G90 G21");
  out.push("( Posicione a ferramenta dentro do furo )");
  out.push(`G0 Z${d(cfg.probeDepth)}`);
  out.push("");

  // Touch 4 internal walls
  const dirs = [
    { label: "X+", axis: "X", val: approachDist },
    { label: "X-", axis: "X", val: -approachDist },
    { label: "Y+", axis: "Y", val: approachDist },
    { label: "Y-", axis: "Y", val: -approachDist },
  ];

  dirs.forEach((dir, i) => {
    out.push(`( --- Toque interno ${dir.label} --- )`);
    out.push(`${probe} ${dir.axis}${d(dir.val)} F${d(cfg.probeFeed)}`);
    if (cfg.controller === "mach3") {
      const varIdx = dir.axis === "X" ? 2000 : 2001;
      out.push(`#${2010 + i} = #${varIdx}`);
    }
    out.push("G0 X0 Y0");
    out.push("");
  });

  if (cfg.controller === "mach3") {
    out.push("( --- Calcular centro --- )");
    out.push("#2020 = [#2010 + #2011] / 2");
    out.push("#2021 = [#2012 + #2013] / 2");
  }

  out.push(`G0 Z${d(cfg.safeZ)}`);

  if (cfg.moveToCenter) {
    out.push("");
    out.push("( --- Mover para centro --- )");
    if (cfg.controller === "mach3") {
      out.push("G0 X#2020 Y#2021");
    } else {
      out.push("G0 X0 Y0");
    }
  }

  if (cfg.setOrigin) {
    out.push("");
    out.push("( --- Definir origem no centro --- )");
    out.push(setOriginCmd(cfg.controller, "X", "0"));
    out.push(setOriginCmd(cfg.controller, "Y", "0"));
  }

  out.push("");
  out.push("M30");

  return { code: out.join("\n"), fileName: "CC_CentroFuro.tap", description: "Localizar centro de furo" };
}
