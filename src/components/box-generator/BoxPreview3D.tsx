import { useRef, useEffect, useState, useCallback } from "react";
import type { BoxParams } from "@/lib/box-generator-engine";

interface Props {
  params: BoxParams;
  className?: string;
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

    let t = params.materialThickness;
    let W = params.width;
    let H = params.height;
    let D = params.depth;

    if (params.dimensionMode === "internal") {
      W += 2 * t;
      H += 2 * t;
      D += 2 * t;
    }

    const maxDim = Math.max(W, H, D);
    const scale = Math.min(cw, ch) * 0.3 / maxDim;

    // Rotation matrices
    const cosRx = Math.cos(rotation.rx), sinRx = Math.sin(rotation.rx);
    const cosRy = Math.cos(rotation.ry), sinRy = Math.sin(rotation.ry);

    const project = (x: number, y: number, z: number): [number, number, number] => {
      // Rotate Y
      let nx = x * cosRy + z * sinRy;
      let nz = -x * sinRy + z * cosRy;
      // Rotate X
      let ny = y * cosRx - nz * sinRx;
      let fz = y * sinRx + nz * cosRx;
      return [cw / 2 + nx * scale, ch / 2 - ny * scale, fz];
    };

    ctx.clearRect(0, 0, cw, ch);

    // Grid lines for context
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

    // Define faces with solid colors
    const faceColors = {
      bottom:  { fill: "#3b82f6", opacity: 0.55 },
      back:    { fill: "#6366f1", opacity: 0.45 },
      left:    { fill: "#8b5cf6", opacity: 0.50 },
      right:   { fill: "#0ea5e9", opacity: 0.55 },
      front:   { fill: "#06b6d4", opacity: 0.60 },
      top:     { fill: "#10b981", opacity: 0.55 },
      lid:     { fill: "#f59e0b", opacity: 0.55 },
    };

    type Face3D = {
      pts: number[][];
      fill: string;
      opacity: number;
      label: string;
      zAvg?: number;
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

    // Project and sort by depth (painter's algorithm)
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

      // Compute simple lighting based on face normal z
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
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(face.label, cx, cy);
    }

    // Dimensions text
    ctx.fillStyle = "hsl(var(--foreground) / 0.8)";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    const bPt = project(0, -hh - maxDim * 0.15, hd);
    ctx.fillText(`${W.toFixed(0)} × ${D.toFixed(0)} × ${H.toFixed(0)} ${params.unit}`, bPt[0], bPt[1]);

    // Hint text
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
