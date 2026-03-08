import { useRef, useEffect, useState, useCallback } from "react";
import type { BoxParams } from "@/lib/box-generator-engine";

interface Props {
  params: BoxParams;
  className?: string;
}

type Face3D = {
  pts: number[][];
  fill: string;
  opacity: number;
  label: string;
  isJoint?: boolean;
};

/**
 * Compute how many fingers fit an edge, must be odd
 */
function computeFingerCount(edgeLen: number, minSize: number, maxSize: number): number {
  let best = 3;
  for (let n = 3; n < 60; n += 2) {
    const sz = edgeLen / n;
    if (sz >= minSize && sz <= maxSize) { best = n; break; }
    if (sz < minSize) { best = Math.max(3, n - 2); break; }
  }
  return best;
}

/**
 * Generate finger-joint tab quads along an edge in 3D space.
 * edge goes from p0 to p1, tabs extrude in direction `outDir` by `thickness`.
 * Returns array of quad vertices (4 points each).
 */
function fingerTabsAlongEdge(
  p0: number[],
  p1: number[],
  outDir: number[],
  thickness: number,
  fingerCount: number,
  isTabs: boolean, // true = protrusions on even indices
): number[][][] {
  const quads: number[][][] = [];
  for (let i = 0; i < fingerCount; i++) {
    const isTab = (i % 2 === 0) === isTabs;
    if (!isTab) continue;
    const t0 = i / fingerCount;
    const t1 = (i + 1) / fingerCount;
    const a = [
      p0[0] + (p1[0] - p0[0]) * t0,
      p0[1] + (p1[1] - p0[1]) * t0,
      p0[2] + (p1[2] - p0[2]) * t0,
    ];
    const b = [
      p0[0] + (p1[0] - p0[0]) * t1,
      p0[1] + (p1[1] - p0[1]) * t1,
      p0[2] + (p1[2] - p0[2]) * t1,
    ];
    const c = [b[0] + outDir[0] * thickness, b[1] + outDir[1] * thickness, b[2] + outDir[2] * thickness];
    const d = [a[0] + outDir[0] * thickness, a[1] + outDir[1] * thickness, a[2] + outDir[2] * thickness];
    quads.push([a, b, c, d]);
  }
  return quads;
}

/**
 * Generate slot cuts (rectangular holes) along a face edge.
 * Returns quads representing slot openings on the face.
 */
function slotCutsAlongEdge(
  p0: number[],
  p1: number[],
  inwardDir: number[],
  thickness: number,
  fingerCount: number,
): number[][][] {
  const quads: number[][][] = [];
  const slotDepth = thickness * 0.6;
  for (let i = 0; i < fingerCount; i++) {
    if (i % 2 !== 0) continue; // slots on even indices
    const t0 = i / fingerCount;
    const t1 = (i + 1) / fingerCount;
    const a = [
      p0[0] + (p1[0] - p0[0]) * t0,
      p0[1] + (p1[1] - p0[1]) * t0,
      p0[2] + (p1[2] - p0[2]) * t0,
    ];
    const b = [
      p0[0] + (p1[0] - p0[0]) * t1,
      p0[1] + (p1[1] - p0[1]) * t1,
      p0[2] + (p1[2] - p0[2]) * t1,
    ];
    const c = [b[0] + inwardDir[0] * slotDepth, b[1] + inwardDir[1] * slotDepth, b[2] + inwardDir[2] * slotDepth];
    const d = [a[0] + inwardDir[0] * slotDepth, a[1] + inwardDir[1] * slotDepth, a[2] + inwardDir[2] * slotDepth];
    quads.push([a, b, c, d]);
  }
  return quads;
}

export function BoxPreview3D({ params, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ rx: 0.45, ry: 0.6 });
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
      rx: r.rx - dy * 0.008,
      ry: r.ry + dx * 0.008,
    }));
  }, []);

  const handleMouseUp = useCallback(() => {
    dragging.current = false;
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

    const maxDim = Math.max(W, H, D);
    const sc = Math.min(cw, ch) * 0.28 / maxDim;

    const cosRx = Math.cos(rotation.rx), sinRx = Math.sin(rotation.rx);
    const cosRy = Math.cos(rotation.ry), sinRy = Math.sin(rotation.ry);

    const project = (x: number, y: number, z: number): [number, number, number] => {
      const nx = x * cosRy + z * sinRy;
      const nz = -x * sinRy + z * cosRy;
      const ny = y * cosRx - nz * sinRx;
      const fz = y * sinRx + nz * cosRx;
      return [cw / 2 + nx * sc, ch / 2 - ny * sc, fz];
    };

    ctx.clearRect(0, 0, cw, ch);

    // Grid
    ctx.strokeStyle = "hsl(var(--foreground) / 0.06)";
    ctx.lineWidth = 0.5;
    const gridSize = maxDim * 1.2;
    const gridStep = maxDim / 4;
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

    const faceColors = {
      bottom: { fill: "#3b82f6", opacity: 0.55 },
      back:   { fill: "#6366f1", opacity: 0.45 },
      left:   { fill: "#8b5cf6", opacity: 0.50 },
      right:  { fill: "#0ea5e9", opacity: 0.55 },
      front:  { fill: "#06b6d4", opacity: 0.60 },
      top:    { fill: "#10b981", opacity: 0.55 },
      lid:    { fill: "#f59e0b", opacity: 0.55 },
      joint:  { fill: "#f97316", opacity: 0.70 },
      slot:   { fill: "#1e1e2e", opacity: 0.80 },
    };

    const faces: Face3D[] = [
      { pts: [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd]], ...faceColors.bottom, label: "Fundo" },
      { pts: [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, hh, -hd], [-hw, hh, -hd]], ...faceColors.back, label: "Traseira" },
      { pts: [[-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd]], ...faceColors.left, label: "Esquerda" },
      { pts: [[hw, -hh, -hd], [hw, -hh, hd], [hw, hh, hd], [hw, hh, -hd]], ...faceColors.right, label: "Direita" },
      { pts: [[-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]], ...faceColors.front, label: "Frente" },
    ];

    if (!isOpen && !hasLid) {
      faces.push({ pts: [[-hw, hh, -hd], [hw, hh, -hd], [hw, hh, hd], [-hw, hh, hd]], ...faceColors.top, label: "Topo" });
    }
    if (hasLid) {
      faces.push({ pts: [[-hw, hh, -hd], [hw, hh, -hd], [hw, hh + t, -hd - 5], [-hw, hh + t, -hd - 5]], ...faceColors.lid, label: "Tampa" });
    }

    // ─── Generate joint geometry ───────────────────────
    const jt = params.jointType;
    const fcW = computeFingerCount(W, params.fingerMinSize, params.fingerMaxSize);
    const fcH = computeFingerCount(H, params.fingerMinSize, params.fingerMaxSize);
    const fcD = computeFingerCount(D, params.fingerMinSize, params.fingerMaxSize);

    if (jt === "finger" || jt === "tslot") {
      // ── Front face: bottom edge (along X at y=-hh, z=+hd) → tabs go outward (+z)
      const tabQuads = [
        // Front bottom edge → tabs go +z
        ...fingerTabsAlongEdge([-hw, -hh, hd], [hw, -hh, hd], [0, 0, 1], t, fcW, true),
        // Front top edge → tabs go +z (if not open)
        ...(!isOpen && !hasLid ? fingerTabsAlongEdge([-hw, hh, hd], [hw, hh, hd], [0, 0, 1], t, fcW, true) : []),
        // Front left edge → tabs go -x
        ...fingerTabsAlongEdge([-hw, -hh, hd], [-hw, hh, hd], [-1, 0, 0], t, fcH, false),
        // Front right edge → tabs go +x
        ...fingerTabsAlongEdge([hw, -hh, hd], [hw, hh, hd], [1, 0, 0], t, fcH, false),

        // Back bottom edge → tabs go -z
        ...fingerTabsAlongEdge([-hw, -hh, -hd], [hw, -hh, -hd], [0, 0, -1], t, fcW, true),
        // Back top edge
        ...(!isOpen && !hasLid ? fingerTabsAlongEdge([-hw, hh, -hd], [hw, hh, -hd], [0, 0, -1], t, fcW, true) : []),

        // Left bottom edge → tabs go -y
        ...fingerTabsAlongEdge([-hw, -hh, -hd], [-hw, -hh, hd], [0, -1, 0], t, fcD, true),
        // Right bottom edge → tabs go -y
        ...fingerTabsAlongEdge([hw, -hh, -hd], [hw, -hh, hd], [0, -1, 0], t, fcD, true),

        // Left top edge → tabs go +y
        ...(!isOpen && !hasLid ? fingerTabsAlongEdge([-hw, hh, -hd], [-hw, hh, hd], [0, 1, 0], t, fcD, true) : []),
        // Right top edge → tabs go +y
        ...(!isOpen && !hasLid ? fingerTabsAlongEdge([hw, hh, -hd], [hw, hh, hd], [0, 1, 0], t, fcD, true) : []),

        // Back left edge
        ...fingerTabsAlongEdge([-hw, -hh, -hd], [-hw, hh, -hd], [-1, 0, 0], t, fcH, false),
        // Back right edge
        ...fingerTabsAlongEdge([hw, -hh, -hd], [hw, hh, -hd], [1, 0, 0], t, fcH, false),
      ];

      for (const quad of tabQuads) {
        faces.push({
          pts: quad,
          fill: jt === "tslot" ? "#ef4444" : "#f97316",
          opacity: 0.75,
          label: "",
          isJoint: true,
        });
      }
    } else if (jt === "slot") {
      // Slot joints: show rectangular slot cuts on the face surfaces near edges
      const slotQuads = [
        // Front face: slots on left/right vertical edges (inward = +x / -x)
        ...slotCutsAlongEdge([-hw, -hh, hd], [-hw, hh, hd], [1, 0, 0], t, fcH),
        ...slotCutsAlongEdge([hw, -hh, hd], [hw, hh, hd], [-1, 0, 0], t, fcH),
        // Back face
        ...slotCutsAlongEdge([-hw, -hh, -hd], [-hw, hh, -hd], [1, 0, 0], t, fcH),
        ...slotCutsAlongEdge([hw, -hh, -hd], [hw, hh, -hd], [-1, 0, 0], t, fcH),
        // Left face: slots on front/back edges
        ...slotCutsAlongEdge([-hw, -hh, hd], [-hw, hh, hd], [0, 0, -1], t, fcH),
        ...slotCutsAlongEdge([-hw, -hh, -hd], [-hw, hh, -hd], [0, 0, 1], t, fcH),
      ];
      for (const quad of slotQuads) {
        faces.push({
          pts: quad,
          ...faceColors.slot,
          label: "",
          isJoint: true,
        });
      }
    }
    // "straight" = no visible joint features (butt joint)

    // ─── Project & sort by depth (painter's algorithm) ─
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
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i][0], pts[i][1]);
      }
      ctx.closePath();

      if (face.isJoint) {
        ctx.globalAlpha = face.opacity;
        ctx.fillStyle = face.fill;
        ctx.fill();
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = face.fill === faceColors.slot.fill ? "#555" : "#fff";
        ctx.lineWidth = 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        // Lighting
        const ax = pts[1][0] - pts[0][0], ay = pts[1][1] - pts[0][1];
        const bx = pts[2][0] - pts[0][0], by = pts[2][1] - pts[0][1];
        const nz = ax * by - ay * bx;
        const lightFactor = 0.5 + 0.5 * Math.abs(nz) / (Math.sqrt(ax * ax + ay * ay) * Math.sqrt(bx * bx + by * by) + 0.001);

        ctx.globalAlpha = face.opacity * Math.min(lightFactor + 0.3, 1);
        ctx.fillStyle = face.fill;
        ctx.fill();

        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Face label
        if (face.label) {
          const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
          const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(face.label, cx, cy);
        }
      }
    }

    // Joint type label
    const jointLabels: Record<string, string> = {
      finger: "Finger Joint",
      straight: "Junta Reta",
      slot: "Slot",
      tslot: "T-Slot",
    };
    ctx.fillStyle = "hsl(var(--foreground) / 0.5)";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Encaixe: ${jointLabels[params.jointType] || params.jointType}`, 10, 16);

    // Dimensions text
    ctx.fillStyle = "hsl(var(--foreground) / 0.8)";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    const bPt = project(0, -hh - maxDim * 0.15, hd);
    ctx.fillText(`${W.toFixed(0)} × ${D.toFixed(0)} × ${H.toFixed(0)} ${params.unit}`, bPt[0], bPt[1]);

    // Hint
    ctx.fillStyle = "hsl(var(--foreground) / 0.3)";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Clique e arraste para rotacionar", cw / 2, ch - 12);
  }, [params, rotation]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", cursor: dragging.current ? "grabbing" : "grab" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}
