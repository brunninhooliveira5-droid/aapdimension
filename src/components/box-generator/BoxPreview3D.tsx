import { useRef, useEffect, useState, useCallback } from "react";
import type { BoxParams } from "@/lib/box-generator-engine";

interface Props {
  params: BoxParams;
  className?: string;
}

type Vec3 = [number, number, number];

type Face3D = {
  pts: Vec3[];
  fill: string;
  opacity: number;
  label: string;
  isJoint?: boolean;
  wallId?: string;
};

function computeFingerCount(edgeLen: number, minSize: number, maxSize: number): number {
  let best = 3;
  for (let n = 3; n < 60; n += 2) {
    const sz = edgeLen / n;
    if (sz >= minSize && sz <= maxSize) { best = n; break; }
    if (sz < minSize) { best = Math.max(3, n - 2); break; }
  }
  return best;
}

const v3add = (a: Vec3, b: Vec3): Vec3 => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
const v3scale = (a: Vec3, s: number): Vec3 => [a[0]*s, a[1]*s, a[2]*s];
const v3lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t
];

function buildSlab(
  corners: Vec3[], normal: Vec3, thickness: number,
  outerColor: string, innerColor: string, edgeColor: string,
  label: string, wallId: string, opacity: number = 0.92,
): Face3D[] {
  const faces: Face3D[] = [];
  const inward = v3scale(normal, -1);
  const inner = corners.map(c => v3add(c, v3scale(inward, thickness)));
  faces.push({ pts: [...corners], fill: outerColor, opacity, label, wallId });
  faces.push({ pts: [inner[3], inner[2], inner[1], inner[0]], fill: innerColor, opacity: opacity * 0.9, label: "", wallId });
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    faces.push({ pts: [corners[i], corners[j], inner[j], inner[i]], fill: edgeColor, opacity: opacity * 0.95, label: "", wallId });
  }
  return faces;
}

function buildJointIndicators(
  c0: Vec3, c1: Vec3, i0: Vec3, i1: Vec3,
  fingerCount: number, isTabs: boolean, wallId: string,
): Face3D[] {
  const faces: Face3D[] = [];
  const tabColor = "#c48a2a";
  const slotColor = "#3d2a10";
  for (let fi = 0; fi < fingerCount; fi++) {
    const isTab = (fi % 2 === 0) === isTabs;
    const t0 = fi / fingerCount;
    const t1 = (fi + 1) / fingerCount;
    const a = v3lerp(c0, c1, t0);
    const b = v3lerp(c0, c1, t1);
    const ai = v3lerp(i0, i1, t0);
    const bi = v3lerp(i0, i1, t1);
    faces.push({ pts: [a, b, bi, ai], fill: isTab ? tabColor : slotColor, opacity: 0.92, label: "", isJoint: true, wallId });
  }
  return faces;
}

function buildExplodedTabs(
  edgeStart: Vec3, edgeEnd: Vec3, innerStart: Vec3, innerEnd: Vec3,
  tabDir: Vec3, thickness: number, fingerCount: number, wallId: string,
): Face3D[] {
  const faces: Face3D[] = [];
  const tabColor = "#c48a2a";
  const tabSide = "#a87420";
  const tabTop = "#d49a35";
  for (let fi = 0; fi < fingerCount; fi++) {
    if (fi % 2 !== 0) continue;
    const t0 = fi / fingerCount;
    const t1 = (fi + 1) / fingerCount;
    const a = v3lerp(edgeStart, edgeEnd, t0);
    const b = v3lerp(edgeStart, edgeEnd, t1);
    const ai = v3lerp(innerStart, innerEnd, t0);
    const bi = v3lerp(innerStart, innerEnd, t1);
    const ae = v3add(a, v3scale(tabDir, thickness));
    const be = v3add(b, v3scale(tabDir, thickness));
    const aie = v3add(ai, v3scale(tabDir, thickness));
    const bie = v3add(bi, v3scale(tabDir, thickness));
    faces.push({ pts: [ae, be, bie, aie], fill: tabColor, opacity: 0.95, label: "", isJoint: true, wallId });
    faces.push({ pts: [b, a, ai, bi], fill: tabSide, opacity: 0.85, label: "", isJoint: true, wallId });
    faces.push({ pts: [a, ae, aie, ai], fill: tabTop, opacity: 0.90, label: "", isJoint: true, wallId });
    faces.push({ pts: [be, b, bi, bie], fill: tabTop, opacity: 0.90, label: "", isJoint: true, wallId });
    faces.push({ pts: [a, b, be, ae], fill: tabSide, opacity: 0.88, label: "", isJoint: true, wallId });
    faces.push({ pts: [aie, bie, bi, ai], fill: tabSide, opacity: 0.85, label: "", isJoint: true, wallId });
  }
  return faces;
}

// ── Assembly order & definitions ──
interface WallConfig {
  id: string;
  label: string;
  explodeDir: Vec3; // direction to explode away
  order: number;    // assembly order (0 = first)
}

const ASSEMBLY_ORDER: WallConfig[] = [
  { id: "bottom", label: "Base", explodeDir: [0, -1, 0], order: 0 },
  { id: "left", label: "Lateral Esquerda", explodeDir: [-1, 0, 0], order: 1 },
  { id: "right", label: "Lateral Direita", explodeDir: [1, 0, 0], order: 2 },
  { id: "front", label: "Frente", explodeDir: [0, 0, 1], order: 3 },
  { id: "back", label: "Traseira", explodeDir: [0, 0, -1], order: 4 },
  { id: "top", label: "Topo", explodeDir: [0, 1, 0], order: 5 },
  { id: "lid", label: "Tampa", explodeDir: [0, 1, 0], order: 5 },
];

type SimMode = "assembled" | "exploded" | "flat2d" | "animating" | "stepbystep";

// Easing function (ease-out cubic)
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ── 2D flat drawing ──
function draw2DPieces(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  params: BoxParams, W: number, H: number, D: number,
) {
  const t = params.materialThickness;
  const isOpen = params.boxType === "open";
  const hasLid = params.boxType === "lid_simple" || params.boxType === "lid_sliding";
  const wallH = isOpen || hasLid ? H - t : H;
  const sideD = D - 2 * t;
  const pieces = [
    { label: "Fundo", w: W, h: sideD },
    { label: "Esquerda", w: sideD, h: wallH },
    { label: "Direita", w: sideD, h: wallH },
    { label: "Frente", w: W, h: wallH },
    { label: "Traseira", w: W, h: wallH },
  ];
  if (!isOpen && !hasLid) pieces.push({ label: "Topo", w: W, h: sideD });
  if (hasLid) pieces.push({ label: "Tampa", w: W, h: sideD });

  const maxPW = Math.max(...pieces.map(p => p.w));
  const maxPH = Math.max(...pieces.map(p => p.h));
  const sc = Math.min((cw - 60) / (maxPW * 2.5), (ch - 60) / (maxPH * 2.5), 1.5);
  const gap = 15;
  let x = gap, y = gap + 20, maxRowH = 0;

  ctx.fillStyle = "#f5f0e8";
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = "#3d2a10";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Peças Planificadas (2D)", 10, 14);

  const colors = ["#a07830", "#b88a3a", "#c49340", "#d4a553", "#c49340", "#e2b96a", "#e8c06a"];
  pieces.forEach((piece, idx) => {
    const pw = piece.w * sc;
    const ph = piece.h * sc;
    if (x + pw + gap > cw) { x = gap; y += maxRowH + gap + 20; maxRowH = 0; }
    ctx.fillStyle = colors[idx % colors.length];
    ctx.fillRect(x, y, pw, ph);
    ctx.strokeStyle = "#5a3d12";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, pw, ph);

    if (params.jointType === "finger" || params.jointType === "tslot") {
      const fcW2 = computeFingerCount(piece.w, params.fingerMinSize, params.fingerMaxSize);
      const fcH2 = computeFingerCount(piece.h, params.fingerMinSize, params.fingerMaxSize);
      ctx.fillStyle = "#3d2a10";
      const fSW = pw / fcW2;
      for (let fi = 0; fi < fcW2; fi++) { if (fi % 2 === 0) { ctx.fillRect(x + fi * fSW, y - 3, fSW, 3); ctx.fillRect(x + fi * fSW, y + ph, fSW, 3); } }
      const fSH = ph / fcH2;
      for (let fi = 0; fi < fcH2; fi++) { if (fi % 2 === 0) { ctx.fillRect(x - 3, y + fi * fSH, 3, fSH); ctx.fillRect(x + pw, y + fi * fSH, 3, fSH); } }
    }

    ctx.fillStyle = "#3d2a10";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(piece.label, x + pw / 2, y + ph / 2);
    ctx.font = "8px sans-serif";
    ctx.fillText(`${piece.w.toFixed(0)}×${piece.h.toFixed(0)}`, x + pw / 2, y + ph / 2 + 11);
    maxRowH = Math.max(maxRowH, ph);
    x += pw + gap;
  });
}

// ════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════

export function BoxPreview3D({ params, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ rx: 0.5, ry: -0.7 });
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState<SimMode>("assembled");
  const [animProgress, setAnimProgress] = useState(0); // 0-1 overall
  const [currentStep, setCurrentStep] = useState(-1); // step-by-step: which wall is being placed
  const [isPaused, setIsPaused] = useState(false);
  const [simComplete, setSimComplete] = useState(false);
  const animRef = useRef<number>(0);
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setRotation(r => ({ rx: r.rx + dy * 0.008, ry: r.ry + dx * 0.008 }));
  }, []);
  const handleMouseUp = useCallback(() => { dragging.current = false; }, []);
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.3, Math.min(3, z - e.deltaY * 0.002)));
  }, []);

  // Determine which walls exist
  const getActiveWalls = useCallback(() => {
    const isOpen = params.boxType === "open";
    const hasLid = params.boxType === "lid_simple" || params.boxType === "lid_sliding";
    const walls = ASSEMBLY_ORDER.filter(w => {
      if (w.id === "top" && (isOpen || hasLid)) return false;
      if (w.id === "lid" && !hasLid) return false;
      return true;
    });
    return walls;
  }, [params.boxType]);

  // ── Animation loop ──
  useEffect(() => {
    if (viewMode !== "animating") return;
    if (isPaused) return;
    const wallCount = getActiveWalls().length;
    const duration = wallCount * 800; // ms total
    const startTime = performance.now() - animProgress * duration;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const p = Math.min(1, elapsed / duration);
      setAnimProgress(p);
      if (p >= 1) {
        setSimComplete(true);
        return;
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [viewMode, isPaused, getActiveWalls, animProgress]);

  // Step-by-step animation for individual step
  const [stepAnim, setStepAnim] = useState(0);
  useEffect(() => {
    if (viewMode !== "stepbystep" || currentStep < 0) return;
    const dur = 600;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setStepAnim(easeOutCubic(p));
      if (p < 1) animRef.current = requestAnimationFrame(tick);
    };
    setStepAnim(0);
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [viewMode, currentStep]);

  // ── Render ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    ctx.scale(dpr, dpr);

    const t = params.materialThickness;
    let W = params.width, H = params.height, D = params.depth;
    if (params.dimensionMode === "internal") { W += 2*t; H += 2*t; D += 2*t; }

    if (viewMode === "flat2d") {
      draw2DPieces(ctx, cw, ch, params, W, H, D);
      return;
    }

    // ── 3D setup ──
    const maxDim = Math.max(W, H, D);
    const sc = Math.min(cw, ch) * 0.28 / maxDim * zoom;
    const cosRx = Math.cos(rotation.rx), sinRx = Math.sin(rotation.rx);
    const cosRy = Math.cos(rotation.ry), sinRy = Math.sin(rotation.ry);
    const project = (x: number, y: number, z: number): Vec3 => {
      const nx = x * cosRy + z * sinRy;
      const nz = -x * sinRy + z * cosRy;
      const ny = y * cosRx - nz * sinRx;
      const fz = y * sinRx + nz * cosRx;
      return [cw / 2 + nx * sc, ch / 2 - ny * sc, fz];
    };

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, ch);
    bgGrad.addColorStop(0, "#7cb8e8");
    bgGrad.addColorStop(1, "#a8d4f0");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, cw, ch);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 0.5;
    const gs = maxDim * 1.5, gst = maxDim / 5;
    for (let g = -gs; g <= gs; g += gst) {
      let p1 = project(g, -H/2, -gs), p2 = project(g, -H/2, gs);
      ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
      p1 = project(-gs, -H/2, g); p2 = project(gs, -H/2, g);
      ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
    }

    const isOpen = params.boxType === "open";
    const hasLid = params.boxType === "lid_simple" || params.boxType === "lid_sliding";
    const hw = W/2, hh = H/2, hd = D/2;
    const useFinger = params.jointType === "finger" || params.jointType === "tslot";
    const wallH = isOpen || hasLid ? H - t : H;
    const sideD = D - 2 * t;

    const woodFront = "#d4a553", woodSide = "#c49340", woodEdge = "#b07e30";
    const woodLight = "#e2b96a", woodDark = "#a06e28";

    const fcW = computeFingerCount(W, params.fingerMinSize, params.fingerMaxSize);
    const fcWallH = computeFingerCount(wallH, params.fingerMinSize, params.fingerMaxSize);
    const fcSideD = computeFingerCount(sideD, params.fingerMinSize, params.fingerMaxSize);

    const yBot = -hh, yTop = -hh + wallH;
    const zF = hd - t, zB = -hd + t;

    const activeWalls = getActiveWalls();

    // Compute per-wall offset based on mode
    const getWallOffset = (wallId: string): Vec3 => {
      const wc = ASSEMBLY_ORDER.find(w => w.id === wallId);
      if (!wc) return [0, 0, 0];
      const explodeMag = maxDim * 0.3;

      if (viewMode === "assembled") return [0, 0, 0];

      if (viewMode === "exploded") {
        return v3scale(wc.explodeDir, explodeMag);
      }

      if (viewMode === "animating") {
        const wallIdx = activeWalls.findIndex(w => w.id === wallId);
        const wallCount = activeWalls.length;
        const perWall = 1 / wallCount;
        const wallStart = wallIdx * perWall;
        const wallEnd = wallStart + perWall;

        if (animProgress >= wallEnd) return [0, 0, 0]; // fully assembled
        if (animProgress < wallStart) return v3scale(wc.explodeDir, explodeMag); // still exploded

        const localP = (animProgress - wallStart) / perWall;
        const eased = easeOutCubic(localP);
        return v3scale(wc.explodeDir, explodeMag * (1 - eased));
      }

      if (viewMode === "stepbystep") {
        const wallIdx = activeWalls.findIndex(w => w.id === wallId);
        if (wallIdx < currentStep) return [0, 0, 0]; // already placed
        if (wallIdx === currentStep) {
          // Animating this step
          return v3scale(wc.explodeDir, explodeMag * (1 - stepAnim));
        }
        return v3scale(wc.explodeDir, explodeMag); // not yet
      }

      return [0, 0, 0];
    };

    // Determine active/highlight wall
    const getWallState = (wallId: string): "active" | "placed" | "waiting" => {
      if (viewMode === "assembled" || viewMode === "exploded") return "placed";
      const wallIdx = activeWalls.findIndex(w => w.id === wallId);

      if (viewMode === "animating") {
        const wallCount = activeWalls.length;
        const perWall = 1 / wallCount;
        const wallStart = wallIdx * perWall;
        const wallEnd = wallStart + perWall;
        if (animProgress >= wallEnd) return "placed";
        if (animProgress >= wallStart) return "active";
        return "waiting";
      }

      if (viewMode === "stepbystep") {
        if (wallIdx < currentStep) return "placed";
        if (wallIdx === currentStep) return "active";
        return "waiting";
      }
      return "placed";
    };

    const faces: Face3D[] = [];

    // Helper to build a wall with offset and state
    const addWall = (
      wallId: string, corners: Vec3[], normal: Vec3,
      outerColor: string, innerColor: string, edgeColor: string,
      label: string,
      jointEdges?: { c0i: number; c1i: number; fc: number; isTabs: boolean; tabDir?: Vec3 }[],
    ) => {
      const off = getWallOffset(wallId);
      const state = getWallState(wallId);
      const c = corners.map(p => v3add(p, off));
      const opacity = state === "waiting" ? 0.3 : state === "active" ? 0.98 : 0.92;

      // Glow: if active, brighten colors
      const oColor = state === "active" ? "#f0c868" : outerColor;
      const iColor = state === "active" ? "#e8b850" : innerColor;

      faces.push(...buildSlab(c, normal, t, oColor, iColor, edgeColor, label, wallId, opacity));

      if (useFinger && jointEdges) {
        const inner = c.map(p => v3add(p, v3scale(normal, -t)));
        for (const je of jointEdges) {
          faces.push(...buildJointIndicators(c[je.c0i], c[je.c1i], inner[je.c0i], inner[je.c1i], je.fc, je.isTabs, wallId));

          // Exploded tabs only when wall is not fully assembled
          const isExplodedState = viewMode === "exploded" || (viewMode === "animating" && state !== "placed") || (viewMode === "stepbystep" && state !== "placed");
          if (isExplodedState && je.isTabs && je.tabDir) {
            faces.push(...buildExplodedTabs(c[je.c0i], c[je.c1i], inner[je.c0i], inner[je.c1i], je.tabDir, t, je.fc, wallId));
          }
        }
      }
    };

    // ── FRONT ──
    addWall("front",
      [[-hw, yBot, hd], [hw, yBot, hd], [hw, yTop, hd], [-hw, yTop, hd]],
      [0, 0, 1], woodFront, woodSide, woodEdge, "Frente",
      [
        { c0i: 0, c1i: 1, fc: fcW, isTabs: true, tabDir: [0, -1, 0] as Vec3 },
        { c0i: 1, c1i: 2, fc: fcWallH, isTabs: false },
        ...(!isOpen && !hasLid ? [{ c0i: 2, c1i: 3, fc: fcW, isTabs: true, tabDir: [0, 1, 0] as Vec3 }] : []),
        { c0i: 3, c1i: 0, fc: fcWallH, isTabs: false },
      ],
    );

    // ── BACK ──
    addWall("back",
      [[hw, yBot, -hd], [-hw, yBot, -hd], [-hw, yTop, -hd], [hw, yTop, -hd]],
      [0, 0, -1], woodSide, woodFront, woodEdge, "Traseira",
      [
        { c0i: 0, c1i: 1, fc: fcW, isTabs: true, tabDir: [0, -1, 0] },
        { c0i: 1, c1i: 2, fc: fcWallH, isTabs: false },
        ...(!isOpen && !hasLid ? [{ c0i: 2, c1i: 3, fc: fcW, isTabs: true, tabDir: [0, 1, 0] }] : []),
        { c0i: 3, c1i: 0, fc: fcWallH, isTabs: false },
      ],
    );

    // ── LEFT ──
    addWall("left",
      [[-hw, yBot, zF], [-hw, yBot, zB], [-hw, yTop, zB], [-hw, yTop, zF]],
      [-1, 0, 0], woodEdge, woodSide, woodDark, "Esquerda",
      [
        { c0i: 0, c1i: 1, fc: fcSideD, isTabs: true, tabDir: [0, -1, 0] },
        { c0i: 1, c1i: 2, fc: fcWallH, isTabs: true, tabDir: [0, 0, -1] },
        ...(!isOpen && !hasLid ? [{ c0i: 2, c1i: 3, fc: fcSideD, isTabs: true, tabDir: [0, 1, 0] }] : []),
        { c0i: 3, c1i: 0, fc: fcWallH, isTabs: true, tabDir: [0, 0, 1] },
      ],
    );

    // ── RIGHT ──
    addWall("right",
      [[hw, yBot, zB], [hw, yBot, zF], [hw, yTop, zF], [hw, yTop, zB]],
      [1, 0, 0], woodSide, woodEdge, woodDark, "Direita",
      [
        { c0i: 0, c1i: 1, fc: fcSideD, isTabs: true, tabDir: [0, -1, 0] },
        { c0i: 1, c1i: 2, fc: fcWallH, isTabs: true, tabDir: [0, 0, 1] },
        ...(!isOpen && !hasLid ? [{ c0i: 2, c1i: 3, fc: fcSideD, isTabs: true, tabDir: [0, 1, 0] }] : []),
        { c0i: 3, c1i: 0, fc: fcWallH, isTabs: true, tabDir: [0, 0, -1] },
      ],
    );

    // ── BOTTOM ──
    addWall("bottom",
      [[-hw, -hh, zF], [hw, -hh, zF], [hw, -hh, zB], [-hw, -hh, zB]],
      [0, -1, 0], woodDark, woodEdge, woodEdge, "Fundo",
      [
        { c0i: 0, c1i: 1, fc: fcW, isTabs: false },
        { c0i: 1, c1i: 2, fc: fcSideD, isTabs: false },
        { c0i: 2, c1i: 3, fc: fcW, isTabs: false },
        { c0i: 3, c1i: 0, fc: fcSideD, isTabs: false },
      ],
    );

    // ── TOP ──
    if (!isOpen && !hasLid) {
      addWall("top",
        [[-hw, yTop, zB], [hw, yTop, zB], [hw, yTop, zF], [-hw, yTop, zF]],
        [0, 1, 0], woodLight, woodSide, woodEdge, "Topo",
        [
          { c0i: 0, c1i: 1, fc: fcW, isTabs: false },
          { c0i: 1, c1i: 2, fc: fcSideD, isTabs: false },
          { c0i: 2, c1i: 3, fc: fcW, isTabs: false },
          { c0i: 3, c1i: 0, fc: fcSideD, isTabs: false },
        ],
      );
    }

    // ── LID ──
    if (hasLid) {
      const overhang = 3;
      addWall("lid",
        [[-hw-overhang, yTop+t*0.5, -hd-overhang], [hw+overhang, yTop+t*0.5, -hd-overhang],
         [hw+overhang, yTop+t*0.5, hd+overhang], [-hw-overhang, yTop+t*0.5, hd+overhang]],
        [0, 1, 0], "#e8c06a", woodSide, woodEdge, "Tampa",
      );
    }

    // ── Project & sort ──
    const projectedFaces = faces.map(face => {
      const projected = face.pts.map(([x, y, z]) => project(x, y, z));
      const zAvg = projected.reduce((s, p) => s + p[2], 0) / projected.length;
      return { ...face, projected, zAvg };
    });
    projectedFaces.sort((a, b) => a.zAvg - b.zAvg);

    for (const face of projectedFaces) {
      const pts = face.projected;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();

      const ax = pts[1][0]-pts[0][0], ay = pts[1][1]-pts[0][1];
      const bx = pts[2][0]-pts[0][0], by = pts[2][1]-pts[0][1];
      const nz = ax * by - ay * bx;
      const lightFactor = 0.4 + 0.6 * Math.abs(nz) / (Math.sqrt(ax*ax+ay*ay)*Math.sqrt(bx*bx+by*by) + 0.001);

      ctx.globalAlpha = face.opacity * Math.min(lightFactor + 0.2, 1);
      ctx.fillStyle = face.fill;
      ctx.fill();

      // Glow for active wall
      const wallState = face.wallId ? getWallState(face.wallId) : "placed";
      if (wallState === "active" && !face.isJoint && face.label) {
        ctx.save();
        ctx.shadowColor = "#ffe066";
        ctx.shadowBlur = 18;
        ctx.globalAlpha = 0.5;
        ctx.fill();
        ctx.restore();
      }

      if (face.isJoint) {
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = "#2a1800";
        ctx.lineWidth = 0.6;
        ctx.stroke();
      } else {
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = wallState === "active" ? "#b8860b" : "#6b4c1e";
        ctx.lineWidth = wallState === "active" ? 1.8 : 1.2;
        ctx.stroke();

        if (face.label) {
          const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
          const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
          const fW = Math.sqrt((pts[1][0]-pts[0][0])**2+(pts[1][1]-pts[0][1])**2);
          const fH = Math.sqrt((pts[2][0]-pts[1][0])**2+(pts[2][1]-pts[1][1])**2);
          if (fW > 30 && fH > 20) {
            ctx.globalAlpha = 0.08;
            ctx.strokeStyle = "#5a3d12";
            ctx.lineWidth = 0.5;
            const grainCount = Math.min(8, Math.floor(fH / 8));
            for (let g = 1; g <= grainCount; g++) {
              const frac = g / (grainCount + 1);
              ctx.beginPath();
              ctx.moveTo(pts[0][0]+(pts[3][0]-pts[0][0])*frac, pts[0][1]+(pts[3][1]-pts[0][1])*frac);
              ctx.lineTo(pts[1][0]+(pts[2][0]-pts[1][0])*frac, pts[1][1]+(pts[2][1]-pts[1][1])*frac);
              ctx.stroke();
            }
          }
          ctx.globalAlpha = wallState === "waiting" ? 0.3 : 0.6;
          ctx.fillStyle = "#3d2a10";
          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(face.label, cx, cy);
        }
      }
      ctx.globalAlpha = 1;
    }

    // ── Info overlay ──
    const jl: Record<string, string> = { finger: "Finger Joint", straight: "Junta Reta", slot: "Slot", tslot: "T-Slot" };
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillRect(6, 4, 145, 48);
    ctx.fillStyle = "#2c5e8a";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Encaixe: ${jl[params.jointType] || params.jointType}`, 10, 16);
    ctx.fillText(`Espessura: ${t}${params.unit}`, 10, 30);

    const modeLabels: Record<SimMode, string> = {
      assembled: "Montada", exploded: "Explodida", flat2d: "2D",
      animating: "Simulando...", stepbystep: "Passo a Passo",
    };
    ctx.fillStyle = viewMode === "animating" || viewMode === "stepbystep" ? "#d97706" : "#2c5e8a";
    ctx.fillText(`Modo: ${modeLabels[viewMode]}`, 10, 44);

    // Step info
    if (viewMode === "stepbystep" && currentStep >= 0 && currentStep < activeWalls.length) {
      const stepWall = activeWalls[currentStep];
      ctx.fillStyle = "rgba(217,119,6,0.15)";
      ctx.fillRect(6, 54, 145, 20);
      ctx.fillStyle = "#92400e";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText(`Passo ${currentStep + 1}/${activeWalls.length}: ${stepWall.label}`, 10, 68);
    }

    // Completion message
    if (simComplete && (viewMode === "animating" || viewMode === "stepbystep")) {
      ctx.fillStyle = "rgba(22,101,52,0.85)";
      const msgW = 260, msgH = 30;
      const msgX = (cw - msgW) / 2, msgY = ch - 70;
      ctx.beginPath();
      ctx.roundRect(msgX, msgY, msgW, msgH, 6);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✓ Simulação de montagem concluída", cw / 2, msgY + 19);
    }

    // Dimensions
    ctx.fillStyle = "#2c5e8a";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    const bPt = project(0, -hh - maxDim * 0.18, hd);
    ctx.fillText(`${W.toFixed(0)} × ${D.toFixed(0)} × ${H.toFixed(0)} ${params.unit}`, bPt[0], bPt[1]);

    ctx.fillStyle = "rgba(44,94,138,0.4)";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Arraste para rotacionar · Scroll para zoom", cw / 2, ch - 10);
  }, [params, rotation, zoom, viewMode, animProgress, currentStep, stepAnim, simComplete, isPaused, getActiveWalls]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // ── Actions ──
  const startSimulation = () => {
    setAnimProgress(0);
    setSimComplete(false);
    setIsPaused(false);
    setViewMode("animating");
  };

  const startStepByStep = () => {
    setCurrentStep(0);
    setSimComplete(false);
    setStepAnim(0);
    setViewMode("stepbystep");
  };

  const nextStep = () => {
    const walls = getActiveWalls();
    if (currentStep < walls.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      setSimComplete(true);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  const resetSim = () => {
    cancelAnimationFrame(animRef.current);
    setAnimProgress(0);
    setCurrentStep(-1);
    setSimComplete(false);
    setIsPaused(false);
    setViewMode("assembled");
  };

  const is3D = viewMode !== "flat2d";
  const activeWalls = getActiveWalls();

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", cursor: is3D ? "grab" : "default", touchAction: "none" }}
        onMouseDown={is3D ? handleMouseDown : undefined}
        onMouseMove={is3D ? handleMouseMove : undefined}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* ── Control bar ── */}
      <div style={{
        position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 3, background: "rgba(255,255,255,0.9)", borderRadius: 8, padding: "4px 6px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.18)", flexWrap: "wrap", justifyContent: "center", maxWidth: "90%",
      }}>
        <BtnSim active={viewMode === "assembled"} onClick={() => { resetSim(); setViewMode("assembled"); }}>Montado</BtnSim>
        <BtnSim active={viewMode === "exploded"} onClick={() => { resetSim(); setViewMode("exploded"); }}>Explodir</BtnSim>
        <BtnSim active={viewMode === "flat2d"} onClick={() => setViewMode("flat2d")}>2D</BtnSim>
        <div style={{ width: 1, background: "#ccc", margin: "2px 2px" }} />
        <BtnSim active={viewMode === "animating"} onClick={startSimulation} accent>▶ Simular</BtnSim>
        <BtnSim active={viewMode === "stepbystep"} onClick={startStepByStep} accent>Passo a Passo</BtnSim>

        {viewMode === "animating" && (
          <BtnSim onClick={() => setIsPaused(p => !p)}>{isPaused ? "▶" : "⏸"}</BtnSim>
        )}

        {viewMode === "stepbystep" && (
          <>
            <BtnSim onClick={prevStep} disabled={currentStep <= 0}>◀</BtnSim>
            <BtnSim onClick={nextStep} disabled={simComplete}>▶</BtnSim>
          </>
        )}

        {(viewMode === "animating" || viewMode === "stepbystep") && (
          <BtnSim onClick={resetSim}>↺</BtnSim>
        )}
      </div>

      {/* ── Step-by-step piece list ── */}
      {viewMode === "stepbystep" && (
        <div style={{
          position: "absolute", top: 8, right: 8, background: "rgba(255,255,255,0.9)",
          borderRadius: 8, padding: "8px 12px", boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          fontSize: 11, maxWidth: 160,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: "#2c5e8a" }}>Ordem de montagem</div>
          {activeWalls.map((w, i) => (
            <div key={w.id} style={{
              padding: "2px 0",
              color: i < currentStep ? "#166534" : i === currentStep ? "#d97706" : "#9ca3af",
              fontWeight: i === currentStep ? 700 : 400,
            }}>
              {i < currentStep ? "✓" : i === currentStep ? "→" : "○"} {i + 1}. {w.label}
            </div>
          ))}
        </div>
      )}

      {/* Completion panel */}
      {simComplete && (viewMode === "animating" || viewMode === "stepbystep") && (
        <div style={{
          position: "absolute", top: 8, right: 8, background: "rgba(22,101,52,0.92)",
          borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 11,
          boxShadow: "0 2px 12px rgba(0,0,0,0.2)", maxWidth: 180,
        }}>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>✓ Montagem concluída</div>
          {activeWalls.map((w, i) => (
            <div key={w.id} style={{ padding: "1px 0", opacity: 0.9 }}>
              {i + 1}. {w.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tiny button component ──
function BtnSim({ children, active, onClick, accent, disabled }: {
  children: React.ReactNode; active?: boolean; onClick?: () => void; accent?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "4px 10px", fontSize: 11, fontWeight: active ? 700 : 400,
        border: "none", borderRadius: 4, cursor: disabled ? "not-allowed" : "pointer",
        background: active ? (accent ? "#d97706" : "#2c5e8a") : accent ? "rgba(217,119,6,0.12)" : "transparent",
        color: active ? "#fff" : accent ? "#92400e" : "#2c5e8a",
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}
