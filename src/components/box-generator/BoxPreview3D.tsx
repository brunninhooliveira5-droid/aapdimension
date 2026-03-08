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

function computeFingerCount(edgeLen: number, minSize: number, maxSize: number): number {
  let best = 3;
  for (let n = 3; n < 60; n += 2) {
    const sz = edgeLen / n;
    if (sz >= minSize && sz <= maxSize) { best = n; break; }
    if (sz < minSize) { best = Math.max(3, n - 2); break; }
  }
  return best;
}

function fingerTabsAlongEdge(
  p0: number[], p1: number[], outDir: number[],
  thickness: number, fingerCount: number, isTabs: boolean,
): number[][][] {
  const quads: number[][][] = [];
  for (let i = 0; i < fingerCount; i++) {
    const isTab = (i % 2 === 0) === isTabs;
    if (!isTab) continue;
    const t0 = i / fingerCount;
    const t1 = (i + 1) / fingerCount;
    const a = [p0[0] + (p1[0] - p0[0]) * t0, p0[1] + (p1[1] - p0[1]) * t0, p0[2] + (p1[2] - p0[2]) * t0];
    const b = [p0[0] + (p1[0] - p0[0]) * t1, p0[1] + (p1[1] - p0[1]) * t1, p0[2] + (p1[2] - p0[2]) * t1];
    const c = [b[0] + outDir[0] * thickness, b[1] + outDir[1] * thickness, b[2] + outDir[2] * thickness];
    const d = [a[0] + outDir[0] * thickness, a[1] + outDir[1] * thickness, a[2] + outDir[2] * thickness];
    quads.push([a, b, c, d]);
  }
  return quads;
}

function slotCutsAlongEdge(
  p0: number[], p1: number[], inwardDir: number[],
  thickness: number, fingerCount: number,
): number[][][] {
  const quads: number[][][] = [];
  const slotDepth = thickness * 0.6;
  for (let i = 0; i < fingerCount; i++) {
    if (i % 2 !== 0) continue;
    const t0 = i / fingerCount;
    const t1 = (i + 1) / fingerCount;
    const a = [p0[0] + (p1[0] - p0[0]) * t0, p0[1] + (p1[1] - p0[1]) * t0, p0[2] + (p1[2] - p0[2]) * t0];
    const b = [p0[0] + (p1[0] - p0[0]) * t1, p0[1] + (p1[1] - p0[1]) * t1, p0[2] + (p1[2] - p0[2]) * t1];
    const c = [b[0] + inwardDir[0] * slotDepth, b[1] + inwardDir[1] * slotDepth, b[2] + inwardDir[2] * slotDepth];
    const d = [a[0] + inwardDir[0] * slotDepth, a[1] + inwardDir[1] * slotDepth, a[2] + inwardDir[2] * slotDepth];
    quads.push([a, b, c, d]);
  }
  return quads;
}

export function BoxPreview3D({ params, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ rx: 0.5, ry: -0.7 });
  const [zoom, setZoom] = useState(1);
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
      rx: r.rx + dy * 0.008, // inverted: drag down → look from above
      ry: r.ry + dx * 0.008,
    }));
  }, []);

  const handleMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.3, Math.min(3, z - e.deltaY * 0.001)));
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

    const materialT = params.materialThickness;
    let W = params.width;
    let H = params.height;
    let D = params.depth;

    if (params.dimensionMode === "internal") {
      W += 2 * materialT;
      H += 2 * materialT;
      D += 2 * materialT;
    }

    const maxDim = Math.max(W, H, D);
    const sc = Math.min(cw, ch) * 0.28 / maxDim * zoom;

    const cosRx = Math.cos(rotation.rx), sinRx = Math.sin(rotation.rx);
    const cosRy = Math.cos(rotation.ry), sinRy = Math.sin(rotation.ry);

    const project = (x: number, y: number, z: number): [number, number, number] => {
      const nx = x * cosRy + z * sinRy;
      const nz = -x * sinRy + z * cosRy;
      const ny = y * cosRx - nz * sinRx;
      const fz = y * sinRx + nz * cosRx;
      return [cw / 2 + nx * sc, ch / 2 - ny * sc, fz];
    };

    // ── Background gradient ──
    const bgGrad = ctx.createLinearGradient(0, 0, 0, ch);
    bgGrad.addColorStop(0, "#7cb8e8");
    bgGrad.addColorStop(1, "#a8d4f0");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, cw, ch);

    // Grid on floor
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

    // Wood/MDF-like colors with warm tones
    const woodMain = "#d4a553";
    const woodSide = "#c49340";
    const woodDark = "#b07e30";
    const woodLight = "#e2b96a";
    const woodTop = "#dbb05c";

    const faces: Face3D[] = [
      { pts: [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd]], fill: woodDark, opacity: 0.95, label: "Fundo" },
      { pts: [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, hh, -hd], [-hw, hh, -hd]], fill: woodSide, opacity: 0.90, label: "Traseira" },
      { pts: [[-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd]], fill: woodDark, opacity: 0.85, label: "Esquerda" },
      { pts: [[hw, -hh, -hd], [hw, -hh, hd], [hw, hh, hd], [hw, hh, -hd]], fill: woodSide, opacity: 0.90, label: "Direita" },
      { pts: [[-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]], fill: woodMain, opacity: 0.95, label: "Frente" },
    ];

    if (!isOpen && !hasLid) {
      faces.push({ pts: [[-hw, hh, -hd], [hw, hh, -hd], [hw, hh, hd], [-hw, hh, hd]], fill: woodTop, opacity: 0.95, label: "Topo" });
    }
    if (hasLid) {
      faces.push({ pts: [[-hw, hh, -hd], [hw, hh, -hd], [hw, hh + materialT, -hd - 5], [-hw, hh + materialT, -hd - 5]], fill: "#e8c06a", opacity: 0.90, label: "Tampa" });
    }

    // ── Joint geometry ──
    const jt = params.jointType;
    const fcW = computeFingerCount(W, params.fingerMinSize, params.fingerMaxSize);
    const fcH = computeFingerCount(H, params.fingerMinSize, params.fingerMaxSize);
    const fcD = computeFingerCount(D, params.fingerMinSize, params.fingerMaxSize);

    if (jt === "finger" || jt === "tslot") {
      const tabColor = woodLight;
      const tabQuads = [
        ...fingerTabsAlongEdge([-hw, -hh, hd], [hw, -hh, hd], [0, 0, 1], materialT, fcW, true),
        ...(!isOpen && !hasLid ? fingerTabsAlongEdge([-hw, hh, hd], [hw, hh, hd], [0, 0, 1], materialT, fcW, true) : []),
        ...fingerTabsAlongEdge([-hw, -hh, hd], [-hw, hh, hd], [-1, 0, 0], materialT, fcH, false),
        ...fingerTabsAlongEdge([hw, -hh, hd], [hw, hh, hd], [1, 0, 0], materialT, fcH, false),
        ...fingerTabsAlongEdge([-hw, -hh, -hd], [hw, -hh, -hd], [0, 0, -1], materialT, fcW, true),
        ...(!isOpen && !hasLid ? fingerTabsAlongEdge([-hw, hh, -hd], [hw, hh, -hd], [0, 0, -1], materialT, fcW, true) : []),
        ...fingerTabsAlongEdge([-hw, -hh, -hd], [-hw, -hh, hd], [0, -1, 0], materialT, fcD, true),
        ...fingerTabsAlongEdge([hw, -hh, -hd], [hw, -hh, hd], [0, -1, 0], materialT, fcD, true),
        ...(!isOpen && !hasLid ? fingerTabsAlongEdge([-hw, hh, -hd], [-hw, hh, hd], [0, 1, 0], materialT, fcD, true) : []),
        ...(!isOpen && !hasLid ? fingerTabsAlongEdge([hw, hh, -hd], [hw, hh, hd], [0, 1, 0], materialT, fcD, true) : []),
        ...fingerTabsAlongEdge([-hw, -hh, -hd], [-hw, hh, -hd], [-1, 0, 0], materialT, fcH, false),
        ...fingerTabsAlongEdge([hw, -hh, -hd], [hw, hh, -hd], [1, 0, 0], materialT, fcH, false),
      ];
      for (const quad of tabQuads) {
        faces.push({ pts: quad, fill: tabColor, opacity: 0.85, label: "", isJoint: true });
      }
    } else if (jt === "slot") {
      const slotQuads = [
        ...slotCutsAlongEdge([-hw, -hh, hd], [-hw, hh, hd], [1, 0, 0], materialT, fcH),
        ...slotCutsAlongEdge([hw, -hh, hd], [hw, hh, hd], [-1, 0, 0], materialT, fcH),
        ...slotCutsAlongEdge([-hw, -hh, -hd], [-hw, hh, -hd], [1, 0, 0], materialT, fcH),
        ...slotCutsAlongEdge([hw, -hh, -hd], [hw, hh, -hd], [-1, 0, 0], materialT, fcH),
        ...slotCutsAlongEdge([-hw, -hh, hd], [-hw, hh, hd], [0, 0, -1], materialT, fcH),
        ...slotCutsAlongEdge([-hw, -hh, -hd], [-hw, hh, -hd], [0, 0, 1], materialT, fcH),
      ];
      for (const quad of slotQuads) {
        faces.push({ pts: quad, fill: "#3d2a10", opacity: 0.90, label: "", isJoint: true });
      }
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

      // Lighting
      const ax = pts[1][0] - pts[0][0], ay = pts[1][1] - pts[0][1];
      const bx = pts[2][0] - pts[0][0], by = pts[2][1] - pts[0][1];
      const nz = ax * by - ay * bx;
      const lightFactor = 0.4 + 0.6 * Math.abs(nz) / (Math.sqrt(ax * ax + ay * ay) * Math.sqrt(bx * bx + by * by) + 0.001);

      ctx.globalAlpha = face.opacity * Math.min(lightFactor + 0.2, 1);
      ctx.fillStyle = face.fill;
      ctx.fill();

      if (face.isJoint) {
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = "#8b6914";
        ctx.lineWidth = 0.6;
        ctx.stroke();
      } else {
        // Edge lines — dark wood tone
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = "#6b4c1e";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Wood grain lines (subtle horizontal lines on larger faces)
        if (face.label && !face.isJoint) {
          const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
          const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;

          // Only draw grain on faces large enough
          const faceW = Math.sqrt((pts[1][0] - pts[0][0]) ** 2 + (pts[1][1] - pts[0][1]) ** 2);
          const faceH = Math.sqrt((pts[2][0] - pts[1][0]) ** 2 + (pts[2][1] - pts[1][1]) ** 2);
          if (faceW > 30 && faceH > 20) {
            ctx.globalAlpha = 0.08;
            ctx.strokeStyle = "#5a3d12";
            ctx.lineWidth = 0.5;
            const grainCount = Math.min(8, Math.floor(faceH / 8));
            for (let g = 1; g <= grainCount; g++) {
              const frac = g / (grainCount + 1);
              const gx1 = pts[0][0] + (pts[3][0] - pts[0][0]) * frac;
              const gy1 = pts[0][1] + (pts[3][1] - pts[0][1]) * frac;
              const gx2 = pts[1][0] + (pts[2][0] - pts[1][0]) * frac;
              const gy2 = pts[1][1] + (pts[2][1] - pts[1][1]) * frac;
              ctx.beginPath();
              ctx.moveTo(gx1, gy1);
              ctx.lineTo(gx2, gy2);
              ctx.stroke();
            }
          }

          // Face label (dark text on wood)
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

    // ── Thickness indication lines on visible edges ──
    // Show material thickness on top-front edge
    if (isOpen || hasLid) {
      const edgeThickness = materialT * sc * 0.5;
      // Top-front left edge: show thickness
      const tfl = project(-hw, hh, hd);
      const tfr = project(hw, hh, hd);
      ctx.strokeStyle = "#6b4c1e";
      ctx.lineWidth = Math.max(1, edgeThickness);
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(tfl[0], tfl[1]);
      ctx.lineTo(tfr[0], tfr[1]);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // ── Joint type label ──
    const jointLabels: Record<string, string> = {
      finger: "Finger Joint", straight: "Junta Reta", slot: "Slot", tslot: "T-Slot",
    };
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(6, 4, 120, 18);
    ctx.fillStyle = "#2c5e8a";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Encaixe: ${jointLabels[params.jointType] || params.jointType}`, 10, 16);

    // Dimensions text
    ctx.fillStyle = "#2c5e8a";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    const bPt = project(0, -hh - maxDim * 0.18, hd);
    ctx.fillText(`${W.toFixed(0)} × ${D.toFixed(0)} × ${H.toFixed(0)} ${params.unit}`, bPt[0], bPt[1]);

    // Hint
    ctx.fillStyle = "rgba(44,94,138,0.4)";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Clique e arraste para rotacionar · Scroll para zoom", cw / 2, ch - 10);
  }, [params, rotation, zoom]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", cursor: dragging.current ? "grabbing" : "grab" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    />
  );
}
