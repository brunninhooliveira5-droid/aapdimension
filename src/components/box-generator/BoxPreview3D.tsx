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

// ── Simple slab builder ──
// Creates a 6-face box from 4 outer-face corners + inward extrusion
function buildSlab(
  corners: Vec3[], // 4 corners of outer face, CCW from outside
  normal: Vec3,    // outward normal
  thickness: number,
  outerColor: string,
  innerColor: string,
  edgeColor: string,
  label: string,
  opacity: number = 0.92,
): Face3D[] {
  const faces: Face3D[] = [];
  const inward = v3scale(normal, -1);
  const inner = corners.map(c => v3add(c, v3scale(inward, thickness)));

  // Outer face
  faces.push({ pts: [...corners], fill: outerColor, opacity, label });
  // Inner face (reversed winding)
  faces.push({ pts: [inner[3], inner[2], inner[1], inner[0]], fill: innerColor, opacity: opacity * 0.9, label: "" });
  // 4 edge strips
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    faces.push({ pts: [corners[i], corners[j], inner[j], inner[i]], fill: edgeColor, opacity: opacity * 0.95, label: "" });
  }
  return faces;
}

// ── Joint indicator bands on an edge strip ──
// Draws alternating colored bands on the edge face to show finger positions
function buildJointIndicators(
  c0: Vec3, c1: Vec3, // outer edge start/end
  i0: Vec3, i1: Vec3, // inner edge start/end  
  fingerCount: number,
  isTabs: boolean,
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

    faces.push({
      pts: [a, b, bi, ai],
      fill: isTab ? tabColor : slotColor,
      opacity: 0.92,
      label: "",
      isJoint: true,
    });
  }
  return faces;
}

// ── Exploded view: protruding tab blocks ──
// When walls are separated, draw actual 3D tab blocks on tab edges
function buildExplodedTabs(
  edgeStart: Vec3, edgeEnd: Vec3,
  innerStart: Vec3, innerEnd: Vec3,
  tabDir: Vec3, // direction tabs protrude (toward neighbor)
  thickness: number,
  fingerCount: number,
  isTabs: boolean,
): Face3D[] {
  if (!isTabs) return [];
  const faces: Face3D[] = [];
  const tabColor = "#c48a2a";
  const tabSide = "#a87420";
  const tabTop = "#d49a35";

  for (let fi = 0; fi < fingerCount; fi++) {
    const isTab = (fi % 2 === 0);
    if (!isTab) continue;

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

    // 6 faces of tab block
    faces.push({ pts: [ae, be, bie, aie], fill: tabColor, opacity: 0.95, label: "", isJoint: true });
    faces.push({ pts: [b, a, ai, bi], fill: tabSide, opacity: 0.85, label: "", isJoint: true });
    faces.push({ pts: [a, ae, aie, ai], fill: tabTop, opacity: 0.90, label: "", isJoint: true });
    faces.push({ pts: [be, b, bi, bie], fill: tabTop, opacity: 0.90, label: "", isJoint: true });
    faces.push({ pts: [a, b, be, ae], fill: tabSide, opacity: 0.88, label: "", isJoint: true });
    faces.push({ pts: [aie, bie, bi, ai], fill: tabSide, opacity: 0.85, label: "", isJoint: true });
  }
  return faces;
}

// ── 2D flattened piece drawing ──
function draw2DPieces(
  ctx: CanvasRenderingContext2D, 
  cw: number, ch: number,
  params: BoxParams,
  W: number, H: number, D: number
) {
  const t = params.materialThickness;
  const isOpen = params.boxType === "open";
  const hasLid = params.boxType === "lid_simple" || params.boxType === "lid_sliding";
  const wallH = isOpen || hasLid ? H - t : H;
  const sideD = D - 2 * t;

  const pieces = [
    { label: "Frente", w: W, h: wallH },
    { label: "Traseira", w: W, h: wallH },
    { label: "Esquerda", w: sideD, h: wallH },
    { label: "Direita", w: sideD, h: wallH },
    { label: "Fundo", w: W, h: sideD },
  ];
  if (!isOpen && !hasLid) pieces.push({ label: "Topo", w: W, h: sideD });
  if (hasLid) pieces.push({ label: "Tampa", w: W, h: sideD });

  // Find scale to fit all pieces
  const totalArea = pieces.reduce((s, p) => s + p.w * p.h, 0);
  const maxPieceW = Math.max(...pieces.map(p => p.w));
  const maxPieceH = Math.max(...pieces.map(p => p.h));
  const sc = Math.min((cw - 60) / (maxPieceW * 2.5), (ch - 60) / (maxPieceH * 2.5), 1.5);

  const gap = 15;
  let x = gap, y = gap + 20;
  let maxRowH = 0;

  // Background
  ctx.fillStyle = "#f5f0e8";
  ctx.fillRect(0, 0, cw, ch);

  ctx.fillStyle = "#3d2a10";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Peças Planificadas (2D)", 10, 14);

  const colors = ["#d4a553", "#c49340", "#b88a3a", "#c49340", "#a07830", "#e2b96a", "#e8c06a"];

  pieces.forEach((piece, idx) => {
    const pw = piece.w * sc;
    const ph = piece.h * sc;

    if (x + pw + gap > cw) {
      x = gap;
      y += maxRowH + gap + 20;
      maxRowH = 0;
    }

    // Piece rectangle
    ctx.fillStyle = colors[idx % colors.length];
    ctx.fillRect(x, y, pw, ph);
    ctx.strokeStyle = "#5a3d12";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, pw, ph);

    // Draw finger indicators on edges
    if (params.jointType === "finger" || params.jointType === "tslot") {
      const fcW2 = computeFingerCount(piece.w, params.fingerMinSize, params.fingerMaxSize);
      const fcH2 = computeFingerCount(piece.h, params.fingerMinSize, params.fingerMaxSize);
      ctx.fillStyle = "#3d2a10";
      // Top/bottom fingers
      const fSizeW = pw / fcW2;
      for (let fi = 0; fi < fcW2; fi++) {
        if (fi % 2 === 0) {
          ctx.fillRect(x + fi * fSizeW, y - 3, fSizeW, 3);
          ctx.fillRect(x + fi * fSizeW, y + ph, fSizeW, 3);
        }
      }
      // Left/right fingers
      const fSizeH = ph / fcH2;
      for (let fi = 0; fi < fcH2; fi++) {
        if (fi % 2 === 0) {
          ctx.fillRect(x - 3, y + fi * fSizeH, 3, fSizeH);
          ctx.fillRect(x + pw, y + fi * fSizeH, 3, fSizeH);
        }
      }
    }

    // Label
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

type ViewMode = "assembled" | "exploded" | "flat2d";

export function BoxPreview3D({ params, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ rx: 0.5, ry: -0.7 });
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("assembled");
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
    setRotation((r) => ({
      rx: r.rx + dy * 0.008,
      ry: r.ry + dx * 0.008,
    }));
  }, []);

  const handleMouseUp = useCallback(() => { dragging.current = false; }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.3, Math.min(3, z - e.deltaY * 0.002)));
  }, []);

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
    let W = params.width;
    let H = params.height;
    let D = params.depth;

    if (params.dimensionMode === "internal") {
      W += 2 * t;
      H += 2 * t;
      D += 2 * t;
    }

    // ── 2D flat mode ──
    if (viewMode === "flat2d") {
      draw2DPieces(ctx, cw, ch, params, W, H, D);
      return;
    }

    // ── 3D rendering ──
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

    // Grid floor
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 0.5;
    const gridSize = maxDim * 1.5;
    const gridStep = maxDim / 5;
    for (let g = -gridSize; g <= gridSize; g += gridStep) {
      const p1 = project(g, -H / 2, -gridSize);
      const p2 = project(g, -H / 2, gridSize);
      ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
      const p3 = project(-gridSize, -H / 2, g);
      const p4 = project(gridSize, -H / 2, g);
      ctx.beginPath(); ctx.moveTo(p3[0], p3[1]); ctx.lineTo(p4[0], p4[1]); ctx.stroke();
    }

    const isOpen = params.boxType === "open";
    const hasLid = params.boxType === "lid_simple" || params.boxType === "lid_sliding";
    const hw = W / 2, hh = H / 2, hd = D / 2;
    const isExploded = viewMode === "exploded";
    const explodeDist = isExploded ? maxDim * 0.2 : 0;

    const useFinger = params.jointType === "finger" || params.jointType === "tslot";
    const wallH = isOpen || hasLid ? H - t : H;
    const sideD = D - 2 * t;

    // Wood palette
    const woodFront = "#d4a553";
    const woodSide = "#c49340";
    const woodEdge = "#b07e30";
    const woodLight = "#e2b96a";
    const woodDark = "#a06e28";

    const faces: Face3D[] = [];

    // Finger counts
    const fcW = computeFingerCount(W, params.fingerMinSize, params.fingerMaxSize);
    const fcWallH = computeFingerCount(wallH, params.fingerMinSize, params.fingerMaxSize);
    const fcSideD = computeFingerCount(sideD, params.fingerMinSize, params.fingerMaxSize);

    // ════════════════════════════════════════════════════════
    // WALL DEFINITIONS — each wall as a simple slab
    // In assembled mode: flush slabs + joint indicators on edges
    // In exploded mode: slabs separated + protruding tab blocks
    // ════════════════════════════════════════════════════════

    const yBot = -hh;
    const yTop = -hh + wallH;

    // ── FRONT (Z = +hd, normal +Z) ──
    {
      const off: Vec3 = [0, 0, explodeDist];
      const c: Vec3[] = [
        v3add([-hw, yBot, hd], off),
        v3add([hw, yBot, hd], off),
        v3add([hw, yTop, hd], off),
        v3add([-hw, yTop, hd], off),
      ];
      const n: Vec3 = [0, 0, 1];
      faces.push(...buildSlab(c, n, t, woodFront, woodSide, woodEdge, "Frente"));

      if (useFinger) {
        const inner = c.map(p => v3add(p, v3scale(n, -t)));
        // Edge 0 (bottom): tabs → into bottom
        faces.push(...buildJointIndicators(c[0], c[1], inner[0], inner[1], fcW, true));
        // Edge 1 (right vertical): slots ← receive right wall tabs
        faces.push(...buildJointIndicators(c[1], c[2], inner[1], inner[2], fcWallH, false));
        // Edge 2 (top): tabs → into top (if closed)
        if (!isOpen && !hasLid) {
          faces.push(...buildJointIndicators(c[2], c[3], inner[2], inner[3], fcW, true));
        }
        // Edge 3 (left vertical): slots ← receive left wall tabs
        faces.push(...buildJointIndicators(c[3], c[0], inner[3], inner[0], fcWallH, false));

        if (isExploded) {
          // Bottom tabs protrude downward (-Y)
          faces.push(...buildExplodedTabs(c[0], c[1], inner[0], inner[1], [0, -1, 0], t, fcW, true));
          // Top tabs protrude upward (+Y)
          if (!isOpen && !hasLid) {
            faces.push(...buildExplodedTabs(c[2], c[3], inner[2], inner[3], [0, 1, 0], t, fcW, true));
          }
        }
      }
    }

    // ── BACK (Z = -hd, normal -Z) ──
    {
      const off: Vec3 = [0, 0, -explodeDist];
      const c: Vec3[] = [
        v3add([hw, yBot, -hd], off),
        v3add([-hw, yBot, -hd], off),
        v3add([-hw, yTop, -hd], off),
        v3add([hw, yTop, -hd], off),
      ];
      const n: Vec3 = [0, 0, -1];
      faces.push(...buildSlab(c, n, t, woodSide, woodFront, woodEdge, "Traseira"));

      if (useFinger) {
        const inner = c.map(p => v3add(p, v3scale(n, -t)));
        faces.push(...buildJointIndicators(c[0], c[1], inner[0], inner[1], fcW, true));
        faces.push(...buildJointIndicators(c[1], c[2], inner[1], inner[2], fcWallH, false));
        if (!isOpen && !hasLid) {
          faces.push(...buildJointIndicators(c[2], c[3], inner[2], inner[3], fcW, true));
        }
        faces.push(...buildJointIndicators(c[3], c[0], inner[3], inner[0], fcWallH, false));

        if (isExploded) {
          faces.push(...buildExplodedTabs(c[0], c[1], inner[0], inner[1], [0, -1, 0], t, fcW, true));
          if (!isOpen && !hasLid) {
            faces.push(...buildExplodedTabs(c[2], c[3], inner[2], inner[3], [0, 1, 0], t, fcW, true));
          }
        }
      }
    }

    // ── LEFT (X = -hw, normal -X) ──
    // Side walls fit between front/back: Z from (hd-t) to (-hd+t)
    {
      const off: Vec3 = [-explodeDist, 0, 0];
      const zF = hd - t;
      const zB = -hd + t;
      const c: Vec3[] = [
        v3add([-hw, yBot, zF], off),
        v3add([-hw, yBot, zB], off),
        v3add([-hw, yTop, zB], off),
        v3add([-hw, yTop, zF], off),
      ];
      const n: Vec3 = [-1, 0, 0];
      faces.push(...buildSlab(c, n, t, woodEdge, woodSide, woodDark, "Esquerda"));

      if (useFinger) {
        const inner = c.map(p => v3add(p, v3scale(n, -t)));
        // Edge 0 (bottom): tabs → into bottom
        faces.push(...buildJointIndicators(c[0], c[1], inner[0], inner[1], fcSideD, true));
        // Edge 1 (back vertical): tabs → into back wall slots
        faces.push(...buildJointIndicators(c[1], c[2], inner[1], inner[2], fcWallH, true));
        // Edge 2 (top): tabs → into top
        if (!isOpen && !hasLid) {
          faces.push(...buildJointIndicators(c[2], c[3], inner[2], inner[3], fcSideD, true));
        }
        // Edge 3 (front vertical): tabs → into front wall slots
        faces.push(...buildJointIndicators(c[3], c[0], inner[3], inner[0], fcWallH, true));

        if (isExploded) {
          // Bottom tabs
          faces.push(...buildExplodedTabs(c[0], c[1], inner[0], inner[1], [0, -1, 0], t, fcSideD, true));
          // Back-side tabs protrude toward back (-Z direction relative to edge)
          faces.push(...buildExplodedTabs(c[1], c[2], inner[1], inner[2], [0, 0, -1], t, fcWallH, true));
          // Top tabs
          if (!isOpen && !hasLid) {
            faces.push(...buildExplodedTabs(c[2], c[3], inner[2], inner[3], [0, 1, 0], t, fcSideD, true));
          }
          // Front-side tabs protrude toward front (+Z)
          faces.push(...buildExplodedTabs(c[3], c[0], inner[3], inner[0], [0, 0, 1], t, fcWallH, true));
        }
      }
    }

    // ── RIGHT (X = +hw, normal +X) ──
    {
      const off: Vec3 = [explodeDist, 0, 0];
      const zF = hd - t;
      const zB = -hd + t;
      const c: Vec3[] = [
        v3add([hw, yBot, zB], off),
        v3add([hw, yBot, zF], off),
        v3add([hw, yTop, zF], off),
        v3add([hw, yTop, zB], off),
      ];
      const n: Vec3 = [1, 0, 0];
      faces.push(...buildSlab(c, n, t, woodSide, woodEdge, woodDark, "Direita"));

      if (useFinger) {
        const inner = c.map(p => v3add(p, v3scale(n, -t)));
        faces.push(...buildJointIndicators(c[0], c[1], inner[0], inner[1], fcSideD, true));
        faces.push(...buildJointIndicators(c[1], c[2], inner[1], inner[2], fcWallH, true));
        if (!isOpen && !hasLid) {
          faces.push(...buildJointIndicators(c[2], c[3], inner[2], inner[3], fcSideD, true));
        }
        faces.push(...buildJointIndicators(c[3], c[0], inner[3], inner[0], fcWallH, true));

        if (isExploded) {
          faces.push(...buildExplodedTabs(c[0], c[1], inner[0], inner[1], [0, -1, 0], t, fcSideD, true));
          faces.push(...buildExplodedTabs(c[1], c[2], inner[1], inner[2], [0, 0, 1], t, fcWallH, true));
          if (!isOpen && !hasLid) {
            faces.push(...buildExplodedTabs(c[2], c[3], inner[2], inner[3], [0, 1, 0], t, fcSideD, true));
          }
          faces.push(...buildExplodedTabs(c[3], c[0], inner[3], inner[0], [0, 0, -1], t, fcWallH, true));
        }
      }
    }

    // ── BOTTOM (Y = -hh, normal -Y) ──
    {
      const off: Vec3 = [0, -explodeDist, 0];
      const zF = hd - t;
      const zB = -hd + t;
      const c: Vec3[] = [
        v3add([-hw, -hh, zF], off),
        v3add([hw, -hh, zF], off),
        v3add([hw, -hh, zB], off),
        v3add([-hw, -hh, zB], off),
      ];
      const n: Vec3 = [0, -1, 0];
      faces.push(...buildSlab(c, n, t, woodDark, woodEdge, woodEdge, "Fundo"));

      if (useFinger) {
        const inner = c.map(p => v3add(p, v3scale(n, -t)));
        // All edges are slots (receive tabs from walls)
        faces.push(...buildJointIndicators(c[0], c[1], inner[0], inner[1], fcW, false));
        faces.push(...buildJointIndicators(c[1], c[2], inner[1], inner[2], fcSideD, false));
        faces.push(...buildJointIndicators(c[2], c[3], inner[2], inner[3], fcW, false));
        faces.push(...buildJointIndicators(c[3], c[0], inner[3], inner[0], fcSideD, false));
      }
    }

    // ── TOP (Y = +hh, normal +Y) ──
    if (!isOpen && !hasLid) {
      const topY = -hh + wallH;
      const off: Vec3 = [0, explodeDist, 0];
      const zF = hd - t;
      const zB = -hd + t;
      const c: Vec3[] = [
        v3add([-hw, topY, zB], off),
        v3add([hw, topY, zB], off),
        v3add([hw, topY, zF], off),
        v3add([-hw, topY, zF], off),
      ];
      const n: Vec3 = [0, 1, 0];
      faces.push(...buildSlab(c, n, t, woodLight, woodSide, woodEdge, "Topo"));

      if (useFinger) {
        const inner = c.map(p => v3add(p, v3scale(n, -t)));
        faces.push(...buildJointIndicators(c[0], c[1], inner[0], inner[1], fcW, false));
        faces.push(...buildJointIndicators(c[1], c[2], inner[1], inner[2], fcSideD, false));
        faces.push(...buildJointIndicators(c[2], c[3], inner[2], inner[3], fcW, false));
        faces.push(...buildJointIndicators(c[3], c[0], inner[3], inner[0], fcSideD, false));
      }
    }

    // ── LID ──
    if (hasLid) {
      const lidY = yTop;
      const off: Vec3 = [0, explodeDist, 0];
      const overhang = 3;
      const c: Vec3[] = [
        v3add([-hw - overhang, lidY + t * 0.5, -hd - overhang], off),
        v3add([hw + overhang, lidY + t * 0.5, -hd - overhang], off),
        v3add([hw + overhang, lidY + t * 0.5, hd + overhang], off),
        v3add([-hw - overhang, lidY + t * 0.5, hd + overhang], off),
      ];
      faces.push(...buildSlab(c, [0, 1, 0], t, "#e8c06a", woodSide, woodEdge, "Tampa"));
    }

    // ── Project & sort (painter's algorithm) ──
    const projectedFaces = faces.map((face) => {
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

      const ax = pts[1][0] - pts[0][0], ay = pts[1][1] - pts[0][1];
      const bx = pts[2][0] - pts[0][0], by = pts[2][1] - pts[0][1];
      const nz = ax * by - ay * bx;
      const lightFactor = 0.4 + 0.6 * Math.abs(nz) / (Math.sqrt(ax*ax+ay*ay) * Math.sqrt(bx*bx+by*by) + 0.001);

      ctx.globalAlpha = face.opacity * Math.min(lightFactor + 0.2, 1);
      ctx.fillStyle = face.fill;
      ctx.fill();

      if (face.isJoint) {
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = "#2a1800";
        ctx.lineWidth = 0.6;
        ctx.stroke();
      } else {
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = "#6b4c1e";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Wood grain + label
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
          ctx.globalAlpha = 0.6;
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
    const jointLabels: Record<string, string> = {
      finger: "Finger Joint", straight: "Junta Reta", slot: "Slot", tslot: "T-Slot",
    };
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(6, 4, 130, 34);
    ctx.fillStyle = "#2c5e8a";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Encaixe: ${jointLabels[params.jointType] || params.jointType}`, 10, 16);
    ctx.fillText(`Espessura: ${t}${params.unit}`, 10, 30);

    ctx.fillStyle = "#2c5e8a";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    const bPt = project(0, -hh - maxDim * 0.18, hd);
    ctx.fillText(`${W.toFixed(0)} × ${D.toFixed(0)} × ${H.toFixed(0)} ${params.unit}`, bPt[0], bPt[1]);

    ctx.fillStyle = "rgba(44,94,138,0.4)";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Clique e arraste para rotacionar · Scroll para zoom", cw / 2, ch - 10);
  }, [params, rotation, zoom, viewMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", cursor: viewMode === "flat2d" ? "default" : (dragging.current ? "grabbing" : "grab"), touchAction: "none" }}
        onMouseDown={viewMode !== "flat2d" ? handleMouseDown : undefined}
        onMouseMove={viewMode !== "flat2d" ? handleMouseMove : undefined}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      {/* View mode buttons */}
      <div style={{
        position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 4, background: "rgba(255,255,255,0.85)", borderRadius: 6, padding: "3px 4px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}>
        {([
          { key: "assembled" as ViewMode, label: "Montada" },
          { key: "exploded" as ViewMode, label: "Explodida" },
          { key: "flat2d" as ViewMode, label: "2D" },
        ]).map(btn => (
          <button
            key={btn.key}
            onClick={() => setViewMode(btn.key)}
            style={{
              padding: "4px 10px", fontSize: 11, fontWeight: viewMode === btn.key ? 700 : 400,
              border: "none", borderRadius: 4, cursor: "pointer",
              background: viewMode === btn.key ? "#2c5e8a" : "transparent",
              color: viewMode === btn.key ? "#fff" : "#2c5e8a",
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
