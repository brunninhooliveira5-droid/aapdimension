import { useRef, useEffect } from "react";
import type { Acm3DFace } from "@/lib/acm-engine";

interface Props {
  faces: Acm3DFace[];
  dimensions: { width: number; height: number; depth: number };
  unit?: string;
  className?: string;
}

export function AcmPreview3D({ faces, dimensions, unit = "mm", className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || faces.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cw, ch);

    const maxDim = Math.max(dimensions.width, dimensions.height, dimensions.depth);
    const scale = Math.min(cw, ch) * 0.32 / maxDim;

    const isoX = (x: number, _y: number, z: number) =>
      cw / 2 + (x - z) * Math.cos(Math.PI / 6) * scale;
    const isoY = (x: number, y: number, z: number) =>
      ch / 2 - y * scale + (x + z) * Math.sin(Math.PI / 6) * scale;

    const project = (x: number, y: number, z: number): [number, number] => [isoX(x, y, z), isoY(x, y, z)];

    for (const face of faces) {
      const projected = face.vertices.map(([x, y, z]) => project(x, y, z));
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
    const bPt = project(0, -(dimensions.height / 2) - 15, dimensions.depth / 2);
    ctx.fillText(
      `${dimensions.width} × ${dimensions.height} × ${dimensions.depth} ${unit}`,
      bPt[0],
      bPt[1]
    );
  }, [faces, dimensions, unit]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
