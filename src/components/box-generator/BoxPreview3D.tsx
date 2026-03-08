import { useRef, useEffect } from "react";
import type { BoxParams } from "@/lib/box-generator-engine";

interface Props {
  params: BoxParams;
  className?: string;
}

export function BoxPreview3D({ params, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

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

    // Isometric projection
    const maxDim = Math.max(W, H, D);
    const scale = Math.min(cw, ch) * 0.35 / maxDim;

    const isoX = (x: number, y: number, z: number) => cw / 2 + (x - z) * Math.cos(Math.PI / 6) * scale;
    const isoY = (x: number, y: number, z: number) => ch / 2 - y * scale + (x + z) * Math.sin(Math.PI / 6) * scale;

    const project = (x: number, y: number, z: number): [number, number] => [isoX(x, y, z), isoY(x, y, z)];

    ctx.clearRect(0, 0, cw, ch);

    const isOpen = params.boxType === "open";
    const hasLid = params.boxType === "lid_simple" || params.boxType === "lid_sliding";

    // Vertices centered
    const hw = W / 2, hh = H / 2, hd = D / 2;

    // Draw box faces (back-to-front for painter's algorithm)
    const faces = [
      // Bottom
      { pts: [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd]], color: "hsl(var(--primary) / 0.3)", label: "Fundo" },
      // Back
      { pts: [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, hh, -hd], [-hw, hh, -hd]], color: "hsl(var(--primary) / 0.15)", label: "Traseira" },
      // Left
      { pts: [[-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd]], color: "hsl(var(--primary) / 0.2)", label: "Esquerda" },
      // Right
      { pts: [[hw, -hh, -hd], [hw, -hh, hd], [hw, hh, hd], [hw, hh, -hd]], color: "hsl(var(--primary) / 0.25)", label: "Direita" },
      // Front
      { pts: [[-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]], color: "hsl(var(--primary) / 0.35)", label: "Frente" },
    ];

    // Top
    if (!isOpen && !hasLid) {
      faces.push({
        pts: [[-hw, hh, -hd], [hw, hh, -hd], [hw, hh, hd], [-hw, hh, hd]],
        color: "hsl(var(--primary) / 0.4)",
        label: "Topo",
      });
    }
    if (hasLid) {
      faces.push({
        pts: [[-hw, hh, -hd], [hw, hh, -hd], [hw, hh + t, -hd - 5], [-hw, hh + t, -hd - 5]],
        color: "hsl(var(--accent) / 0.4)",
        label: "Tampa",
      });
    }

    for (const face of faces) {
      const projected = face.pts.map(([x, y, z]) => project(x, y, z));
      ctx.beginPath();
      ctx.moveTo(projected[0][0], projected[0][1]);
      for (let i = 1; i < projected.length; i++) {
        ctx.lineTo(projected[i][0], projected[i][1]);
      }
      ctx.closePath();
      ctx.fillStyle = face.color;
      ctx.fill();
      ctx.strokeStyle = "hsl(var(--foreground) / 0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Dimensions text
    ctx.fillStyle = "hsl(var(--foreground) / 0.7)";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    const bPt = project(0, -hh - 15, hd);
    ctx.fillText(`${W.toFixed(0)} × ${D.toFixed(0)} × ${H.toFixed(0)} ${params.unit}`, bPt[0], bPt[1]);

    return () => cancelAnimationFrame(animRef.current);
  }, [params]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
