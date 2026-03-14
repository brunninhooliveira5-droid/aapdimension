// ── Center & Corners Engine ─────────────────────────────
// Generates G-code routines for finding corners, rectangular
// centers, circular centers, and hole centers via touch probe.

export type LocationMode = "corner" | "rect-center" | "circle-center" | "hole-center";
export type ApproachDirection = "X+" | "X-" | "Y+" | "Y-";
export type ZProbeMode = "none" | "auto" | "manual";
export type HoleZStrategy = "auto-safe" | "manual-offset" | "none";
export type ProbeType = "standard" | "custom";
export type PostLocationAction = "locate-only" | "locate-origin" | "locate-machining";

export interface CustomProbeConfig {
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  startCommand: string;
  startDwell: number;
  startSafeZ: number;
  endCommand: string;
  endDwell: number;
  endSafeZ: number;
}

export const defaultCustomProbeConfig: CustomProbeConfig = {
  offsetX: 0,
  offsetY: 0,
  offsetZ: 0,
  startCommand: "M10",
  startDwell: 1,
  startSafeZ: 10,
  endCommand: "M11",
  endDwell: 1,
  endSafeZ: 10,
};

export interface CenterCornersConfig {
  mode: LocationMode;
  safeZ: number;
  probeFeed: number;
  probeDepth: number;
  probeDiameter: number;
  cornerQuadrant: "front-left" | "front-right" | "back-left" | "back-right";
  approxSizeX: number;
  approxSizeY: number;
  approxDiameter: number;
  circlePoints: number;
  setOrigin: boolean;
  moveToCenter: boolean;
  decimalPlaces: number;
  controller: "mach3" | "grbl" | "linuxcnc";
  /** Refinement */
  refinementEnabled: boolean;
  refinementDistance: number;
  refinementFeed: number;
  refinementCycles: number;
  /** Z Probe after XY location */
  zProbeMode: ZProbeMode;
  zProbeFeed: number;
  zProbeTravel: number;
  zSetOrigin: boolean;
  /** Corner: internal offset to avoid probing on the edge */
  zCornerInset: number;
  /** Hole: strategy for safe Z probe */
  holeZStrategy: HoleZStrategy;
  /** Hole: safety margin beyond hole radius */
  holeZSafetyMargin: number;
  /** Manual: X offset for Z probe */
  holeZManualOffsetX: number;
  /** Manual: Y offset for Z probe */
  holeZManualOffsetY: number;
  /** Custom probe */
  probeType: ProbeType;
  customProbe: CustomProbeConfig;
  /** Post-location action */
  postAction: PostLocationAction;
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
  refinementEnabled: false,
  refinementDistance: 3,
  refinementFeed: 25,
  refinementCycles: 1,
  zProbeMode: "none",
  zProbeFeed: 30,
  zProbeTravel: -20,
  zSetOrigin: true,
  zCornerInset: 5,
  holeZStrategy: "auto-safe",
  holeZSafetyMargin: 5,
  holeZManualOffsetX: 0,
  holeZManualOffsetY: 0,
  probeType: "standard",
  customProbe: { ...defaultCustomProbeConfig },
  postAction: "locate-origin",
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

/* ── Z Probe helper ────────────────────────────────────── */
function emitZProbe(
  cfg: CenterCornersConfig, out: string[], d: (v: number) => string,
  probe: string, posX: string, posY: string, comment: string
) {
  out.push("");
  out.push(`( ===== PROBE EM Z ===== )`);
  out.push(`( ${comment} )`);
  out.push(`G0 Z${d(cfg.safeZ)}`);
  out.push(`G0 X${posX} Y${posY}`);
  out.push(`${probe} Z${d(cfg.zProbeTravel)} F${d(cfg.zProbeFeed)}`);
  if (cfg.zSetOrigin) {
    out.push("( --- Definir Z=0 --- )");
    out.push(setOriginCmd(cfg.controller, "Z", "0"));
  }
  out.push(`G0 Z${d(cfg.safeZ)}`);
}

/** Decide if we should emit Z probe for this config */
function shouldDoZProbe(cfg: CenterCornersConfig): boolean {
  return cfg.zProbeMode !== "none";
}

/* ── Corner ────────────────────────────────────────────── */
function generateCorner(
  cfg: CenterCornersConfig, out: string[], d: (v: number) => string,
  probe: string, r: number
): CenterCornersResult {
  const dirX = cfg.cornerQuadrant.includes("left") ? 1 : -1;
  const dirY = cfg.cornerQuadrant.includes("front") ? 1 : -1;
  const approachDist = 10;

  out.push(`(  Modo: Encontrar Quina - ${cfg.cornerQuadrant})`);
  if (cfg.refinementEnabled) out.push("(  Conferência de precisão: LIGADA )");
  if (shouldDoZProbe(cfg)) out.push("(  Probe em Z: LIGADO )");
  out.push("(==============================================)");
  out.push("");
  out.push("G90 G21");
  out.push(`G0 Z${d(cfg.safeZ)}`);
  out.push("");

  out.push("( ===== PRIMEIRO TOQUE ===== )");
  out.push("");
  out.push("( --- Toque no eixo X --- )");
  out.push(`G0 X${d(dirX * -approachDist)} Y0`);
  out.push(`G0 Z${d(cfg.probeDepth)}`);
  out.push(`${probe} X${d(dirX * (approachDist + 5))} F${d(cfg.probeFeed)}`);
  out.push(`G0 Z${d(cfg.safeZ)}`);
  out.push("");

  if (cfg.controller === "mach3") {
    out.push("#2010 = #2000");
    out.push(`#2010 = #2010 + ${d(dirX * r)}`);
  }

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

  // Refinement
  if (cfg.refinementEnabled) {
    const refDist = cfg.refinementDistance;
    const refFeed = cfg.refinementFeed;
    for (let cycle = 0; cycle < cfg.refinementCycles; cycle++) {
      out.push("");
      out.push(`( ===== TOQUE DE CONFERÊNCIA ${cfg.refinementCycles > 1 ? cycle + 1 : ""} ===== )`);
      out.push("( Refinamento: medição mais perto da borda )");
      out.push("");

      out.push("( --- Refinamento eixo X --- )");
      if (cfg.controller === "mach3") {
        out.push(`G0 X[#2010 + ${d(dirX * -refDist)}] Y#2011`);
      } else {
        out.push(`G0 X${d(dirX * -refDist)} Y0`);
      }
      out.push(`G0 Z${d(cfg.probeDepth)}`);
      out.push(`${probe} X${d(dirX * (refDist + 3))} F${d(refFeed)}`);
      out.push(`G0 Z${d(cfg.safeZ)}`);
      if (cfg.controller === "mach3") {
        out.push("#2010 = #2000");
        out.push(`#2010 = #2010 + ${d(dirX * r)}`);
      }
      out.push("");

      out.push("( --- Refinamento eixo Y --- )");
      if (cfg.controller === "mach3") {
        out.push(`G0 X#2010 Y[#2011 + ${d(dirY * -refDist)}]`);
      } else {
        out.push(`G0 X0 Y${d(dirY * -refDist)}`);
      }
      out.push(`G0 Z${d(cfg.probeDepth)}`);
      out.push(`${probe} Y${d(dirY * (refDist + 3))} F${d(refFeed)}`);
      out.push(`G0 Z${d(cfg.safeZ)}`);
      if (cfg.controller === "mach3") {
        out.push("#2011 = #2001");
        out.push(`#2011 = #2011 + ${d(dirY * r)}`);
      }
    }
    out.push("");
    out.push("( --- Quina final refinada --- )");
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

  // Z Probe — offset inward to avoid edge
  if (shouldDoZProbe(cfg)) {
    if (cfg.zProbeMode === "manual") {
      // Manual: user-specified position
      if (cfg.controller === "mach3") {
        emitZProbe(cfg, out, d, probe,
          `[#2010 + ${d(cfg.holeZManualOffsetX)}]`, `[#2011 + ${d(cfg.holeZManualOffsetY)}]`,
          "Probe Z em posição manual"
        );
      } else {
        emitZProbe(cfg, out, d, probe, d(cfg.holeZManualOffsetX), d(cfg.holeZManualOffsetY),
          "Probe Z em posição manual"
        );
      }
    } else {
      // Auto: inset inward from corner onto the piece
      const insetX = dirX * -cfg.zCornerInset; // move inward from corner
      const insetY = dirY * -cfg.zCornerInset;
      if (cfg.controller === "mach3") {
        emitZProbe(cfg, out, d, probe,
          `[#2010 + ${d(insetX)}]`, `[#2011 + ${d(insetY)}]`,
          "Probe Z com recuo da aresta"
        );
      } else {
        emitZProbe(cfg, out, d, probe, d(insetX), d(insetY),
          "Probe Z com recuo da aresta"
        );
      }
    }
  }

  out.push("");
  out.push("M30");

  let desc = cfg.refinementEnabled
    ? `Localizar quina ${cfg.cornerQuadrant} (com conferência)`
    : `Localizar quina ${cfg.cornerQuadrant}`;
  if (shouldDoZProbe(cfg)) desc += " + Z";
  return { code: out.join("\n"), fileName: "CC_Quina.tap", description: desc };
}

/* ── Rect Center ───────────────────────────────────────── */
function generateRectCenter(
  cfg: CenterCornersConfig, out: string[], d: (v: number) => string,
  probe: string, r: number
): CenterCornersResult {
  const halfX = cfg.approxSizeX / 2 + 10;
  const halfY = cfg.approxSizeY / 2 + 10;

  out.push("(  Modo: Centro Retangular                     )");
  if (cfg.refinementEnabled) out.push("(  Conferência de precisão: LIGADA )");
  if (shouldDoZProbe(cfg)) out.push("(  Probe em Z: LIGADO )");
  out.push("(==============================================)");
  out.push("");
  out.push("G90 G21");
  out.push(`G0 Z${d(cfg.safeZ)}`);
  out.push("");

  out.push("( ===== PRIMEIRO TOQUE ===== )");
  out.push("");
  emitRectTouches(cfg, out, d, probe, halfX, halfY, cfg.probeFeed, "#201");

  if (cfg.controller === "mach3") {
    out.push("( --- Centro provisório --- )");
    out.push("#2020 = [#2010 + #2011] / 2");
    out.push("#2021 = [#2012 + #2013] / 2");
  }

  if (cfg.refinementEnabled) {
    const refDist = cfg.refinementDistance;
    const refFeed = cfg.refinementFeed;
    const closeHalfX = cfg.approxSizeX / 2 + refDist;
    const closeHalfY = cfg.approxSizeY / 2 + refDist;

    for (let cycle = 0; cycle < cfg.refinementCycles; cycle++) {
      out.push("");
      out.push(`( ===== TOQUE DE CONFERÊNCIA ${cfg.refinementCycles > 1 ? cycle + 1 : ""} ===== )`);
      out.push("( Refinamento: medição mais perto das bordas )");
      out.push("");

      if (cfg.controller === "mach3") {
        out.push("G0 X#2020 Y#2021");
      }

      emitRectTouches(cfg, out, d, probe, closeHalfX, closeHalfY, refFeed, "#203");

      if (cfg.controller === "mach3") {
        out.push("( --- Centro final refinado --- )");
        out.push("#2020 = [#2030 + #2031] / 2");
        out.push("#2021 = [#2032 + #2033] / 2");
      }
    }
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

  // Z Probe at center
  if (shouldDoZProbe(cfg)) {
    if (cfg.zProbeMode === "manual") {
      emitZProbe(cfg, out, d, probe, d(cfg.holeZManualOffsetX), d(cfg.holeZManualOffsetY), "Probe Z em posição manual");
    } else if (cfg.controller === "mach3") {
      emitZProbe(cfg, out, d, probe, "#2020", "#2021", "Probe Z no centro da peça");
    } else {
      emitZProbe(cfg, out, d, probe, "0", "0", "Probe Z no centro da peça");
    }
  }

  out.push("");
  out.push("M30");

  let desc = cfg.refinementEnabled
    ? "Localizar centro retangular (com conferência)"
    : "Localizar centro de peça retangular";
  if (shouldDoZProbe(cfg)) desc += " + Z";
  return { code: out.join("\n"), fileName: "CC_CentroRetangular.tap", description: desc };
}

/** Helper: emit the 4-side rectangular touches */
function emitRectTouches(
  cfg: CenterCornersConfig, out: string[], d: (v: number) => string,
  probe: string, halfX: number, halfY: number, feed: number, varPrefix: string
) {
  const sides: { label: string; axis: string; startVal: number; targetVal: number; varSuffix: string }[] = [
    { label: "Toque lado esquerdo (X-)", axis: "X", startVal: -halfX, targetVal: halfX, varSuffix: "0" },
    { label: "Toque lado direito (X+)", axis: "X", startVal: halfX, targetVal: -halfX, varSuffix: "1" },
    { label: "Toque lado frontal (Y-)", axis: "Y", startVal: -halfY, targetVal: halfY, varSuffix: "2" },
    { label: "Toque lado traseiro (Y+)", axis: "Y", startVal: halfY, targetVal: -halfY, varSuffix: "3" },
  ];

  for (const s of sides) {
    out.push(`( --- ${s.label} --- )`);
    if (s.axis === "X") {
      out.push(`G0 X${d(s.startVal)} Y0`);
    } else {
      out.push(`G0 X0 Y${d(s.startVal)}`);
    }
    out.push(`G0 Z${d(cfg.probeDepth)}`);
    out.push(`${probe} ${s.axis}${d(s.targetVal)} F${d(feed)}`);
    if (cfg.controller === "mach3") {
      const srcVar = s.axis === "X" ? "#2000" : "#2001";
      out.push(`${varPrefix}${s.varSuffix} = ${srcVar}`);
    }
    out.push(`G0 Z${d(cfg.safeZ)}`);
    out.push("");
  }
}

/* ── Circle Center ─────────────────────────────────────── */
function generateCircleCenter(
  cfg: CenterCornersConfig, out: string[], d: (v: number) => string,
  probe: string, r: number
): CenterCornersResult {
  const radius = cfg.approxDiameter / 2 + 10;
  const pts = Math.max(3, cfg.circlePoints);

  out.push("(  Modo: Centro Circular                       )");
  out.push(`(  Pontos de medição: ${pts}                   )`);
  if (cfg.refinementEnabled) out.push("(  Conferência de precisão: LIGADA )");
  if (shouldDoZProbe(cfg)) out.push("(  Probe em Z: LIGADO )");
  out.push("(==============================================)");
  out.push("");
  out.push("G90 G21");
  out.push(`G0 Z${d(cfg.safeZ)}`);
  out.push("");

  out.push("( ===== PRIMEIRO TOQUE ===== )");
  out.push("");
  emitCircleTouches(cfg, out, d, probe, radius, pts, cfg.probeFeed, 2010);

  out.push("( --- Calcular centro provisório --- )");
  if (cfg.controller === "mach3" && pts >= 3) {
    const xVars = Array.from({ length: pts }, (_, i) => `#${2010 + i * 2}`).join(" + ");
    const yVars = Array.from({ length: pts }, (_, i) => `#${2011 + i * 2}`).join(" + ");
    out.push(`#2050 = [${xVars}] / ${pts}`);
    out.push(`#2051 = [${yVars}] / ${pts}`);
  }

  if (cfg.refinementEnabled) {
    const closeRadius = cfg.approxDiameter / 2 + cfg.refinementDistance;
    const refFeed = cfg.refinementFeed;

    for (let cycle = 0; cycle < cfg.refinementCycles; cycle++) {
      out.push("");
      out.push(`( ===== TOQUE DE CONFERÊNCIA ${cfg.refinementCycles > 1 ? cycle + 1 : ""} ===== )`);
      out.push("( Refinamento: medição mais perto da superfície )");
      out.push("");

      if (cfg.controller === "mach3") {
        out.push("G0 X#2050 Y#2051");
      }

      emitCircleTouches(cfg, out, d, probe, closeRadius, pts, refFeed, 2060);

      if (cfg.controller === "mach3" && pts >= 3) {
        out.push("( --- Centro final refinado --- )");
        const xVars2 = Array.from({ length: pts }, (_, i) => `#${2060 + i * 2}`).join(" + ");
        const yVars2 = Array.from({ length: pts }, (_, i) => `#${2061 + i * 2}`).join(" + ");
        out.push(`#2050 = [${xVars2}] / ${pts}`);
        out.push(`#2051 = [${yVars2}] / ${pts}`);
      }
    }
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

  // Z Probe at center
  if (shouldDoZProbe(cfg)) {
    if (cfg.zProbeMode === "manual") {
      emitZProbe(cfg, out, d, probe, d(cfg.holeZManualOffsetX), d(cfg.holeZManualOffsetY), "Probe Z em posição manual");
    } else if (cfg.controller === "mach3") {
      emitZProbe(cfg, out, d, probe, "#2050", "#2051", "Probe Z no centro da peça circular");
    } else {
      emitZProbe(cfg, out, d, probe, "0", "0", "Probe Z no centro da peça circular");
    }
  }

  out.push("");
  out.push("M30");

  let desc = cfg.refinementEnabled
    ? "Localizar centro circular (com conferência)"
    : "Localizar centro de peça circular";
  if (shouldDoZProbe(cfg)) desc += " + Z";
  return { code: out.join("\n"), fileName: "CC_CentroCircular.tap", description: desc };
}

/** Helper: emit circle probe touches */
function emitCircleTouches(
  cfg: CenterCornersConfig, out: string[], d: (v: number) => string,
  probe: string, radius: number, pts: number, feed: number, varStart: number
) {
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
    out.push(`${probe} X${d(targetX)} Y${d(targetY)} F${d(feed)}`);
    if (cfg.controller === "mach3") {
      out.push(`#${varStart + i * 2} = #2000`);
      out.push(`#${varStart + 1 + i * 2} = #2001`);
    }
    out.push(`G0 Z${d(cfg.safeZ)}`);
    out.push("");
  }
}

/* ── Hole Center ───────────────────────────────────────── */
function generateHoleCenter(
  cfg: CenterCornersConfig, out: string[], d: (v: number) => string,
  probe: string, r: number
): CenterCornersResult {
  const approachDist = cfg.approxDiameter / 2 - 2;

  out.push("(  Modo: Centro de Furo                        )");
  if (cfg.refinementEnabled) out.push("(  Conferência de precisão: LIGADA )");
  if (shouldDoZProbe(cfg)) {
    out.push("(  Probe em Z: LIGADO - posição segura )");
    out.push("(  AVISO: Z NÃO será tocado no centro vazio )");
  }
  out.push("(==============================================)");
  out.push("");
  out.push("G90 G21");
  out.push("( Posicione a ferramenta dentro do furo )");
  out.push(`G0 Z${d(cfg.probeDepth)}`);
  out.push("");

  out.push("( ===== PRIMEIRO TOQUE ===== )");
  out.push("");
  emitHoleTouches(cfg, out, d, probe, approachDist, cfg.probeFeed, 2010);

  if (cfg.controller === "mach3") {
    out.push("( --- Centro provisório --- )");
    out.push("#2020 = [#2010 + #2011] / 2");
    out.push("#2021 = [#2012 + #2013] / 2");
  }

  if (cfg.refinementEnabled) {
    const closeDist = cfg.approxDiameter / 2 - cfg.refinementDistance;
    const refFeed = cfg.refinementFeed;

    for (let cycle = 0; cycle < cfg.refinementCycles; cycle++) {
      out.push("");
      out.push(`( ===== TOQUE DE CONFERÊNCIA ${cfg.refinementCycles > 1 ? cycle + 1 : ""} ===== )`);
      out.push("( Refinamento: medição mais perto do centro provisório )");
      out.push("");

      if (cfg.controller === "mach3") {
        out.push("G0 X#2020 Y#2021");
      } else {
        out.push("G0 X0 Y0");
      }

      emitHoleTouches(cfg, out, d, probe, closeDist, refFeed, 2030);

      if (cfg.controller === "mach3") {
        out.push("( --- Centro final refinado --- )");
        out.push("#2020 = [#2030 + #2031] / 2");
        out.push("#2021 = [#2032 + #2033] / 2");
      }
    }
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

  // Z Probe — SAFE position, never at center of hole
  if (shouldDoZProbe(cfg) && cfg.holeZStrategy !== "none") {
    out.push("");
    out.push("( ===== PROBE EM Z - POSIÇÃO SEGURA ===== )");
    out.push("( ATENÇÃO: Probe Z deslocado para fora do furo )");

    if (cfg.holeZStrategy === "auto-safe") {
      const safeOffset = cfg.approxDiameter / 2 + cfg.holeZSafetyMargin;
      if (cfg.controller === "mach3") {
        emitZProbe(cfg, out, d, probe,
          `[#2020 + ${d(safeOffset)}]`, "#2021",
          `Probe Z em ponto seguro (centro + ${d(safeOffset)} mm em X)`
        );
      } else {
        emitZProbe(cfg, out, d, probe, d(safeOffset), "0",
          `Probe Z em ponto seguro (${d(safeOffset)} mm em X)`
        );
      }
    } else if (cfg.holeZStrategy === "manual-offset") {
      if (cfg.controller === "mach3") {
        emitZProbe(cfg, out, d, probe,
          `[#2020 + ${d(cfg.holeZManualOffsetX)}]`,
          `[#2021 + ${d(cfg.holeZManualOffsetY)}]`,
          "Probe Z em posição manual deslocada"
        );
      } else {
        emitZProbe(cfg, out, d, probe,
          d(cfg.holeZManualOffsetX), d(cfg.holeZManualOffsetY),
          "Probe Z em posição manual deslocada"
        );
      }
    }
  }

  out.push("");
  out.push("M30");

  let desc = cfg.refinementEnabled
    ? "Localizar centro de furo (com conferência)"
    : "Localizar centro de furo";
  if (shouldDoZProbe(cfg) && cfg.holeZStrategy !== "none") desc += " + Z seguro";
  return { code: out.join("\n"), fileName: "CC_CentroFuro.tap", description: desc };
}

/** Helper: emit hole internal touches */
function emitHoleTouches(
  cfg: CenterCornersConfig, out: string[], d: (v: number) => string,
  probe: string, approachDist: number, feed: number, varStart: number
) {
  const dirs = [
    { label: "X+", axis: "X", val: approachDist },
    { label: "X-", axis: "X", val: -approachDist },
    { label: "Y+", axis: "Y", val: approachDist },
    { label: "Y-", axis: "Y", val: -approachDist },
  ];

  dirs.forEach((dir, i) => {
    out.push(`( --- Toque interno ${dir.label} --- )`);
    out.push(`${probe} ${dir.axis}${d(dir.val)} F${d(feed)}`);
    if (cfg.controller === "mach3") {
      const srcVar = dir.axis === "X" ? "#2000" : "#2001";
      out.push(`#${varStart + i} = ${srcVar}`);
    }
    out.push("G0 X0 Y0");
    out.push("");
  });
}
