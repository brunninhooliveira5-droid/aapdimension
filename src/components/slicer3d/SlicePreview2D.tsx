import { useRef, useEffect } from "react";
import type { SliceContour } from "@/lib/slicer3d-engine";

interface SlicePreview2DProps {
  contours: SliceContour[];
  className?: string;
}

export function SlicePreview2D({ contours, className = "" }: SlicePreview2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || contours.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue("--background") ? "#1a1a2e" : "#f8f9fa";
    ctx.fillRect(0, 0, w, h);

    const padding = 20;
    const gap = 10;
    const cols = Math.ceil(Math.sqrt(contours.length));
    const cellW = (w - padding * 2 - gap * (cols - 1)) / cols;
    const rows = Math.ceil(contours.length / cols);
    const cellH = (h - padding * 2 - gap * (rows - 1)) / rows;

    const colors = [
      "#6b9bd2", "#e07b53", "#6bc46b", "#c47bc4",
      "#c4c44a", "#4ac4c4", "#c4704a", "#7070c4",
    ];

    contours.forEach((contour, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cx = padding + col * (cellW + gap);
      const cy = padding + row * (cellH + gap);

      const pts = contour.points;
      if (pts.length < 2) return;

      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const pw = maxX - minX || 1;
      const ph = maxY - minY || 1;

      const innerPad = 8;
      const scale = Math.min((cellW - innerPad * 2) / pw, (cellH - innerPad * 2 - 14) / ph);
      const ox = cx + innerPad + ((cellW - innerPad * 2) - pw * scale) / 2;
      const oy = cy + innerPad + ((cellH - innerPad * 2 - 14) - ph * scale) / 2;

      // Cell background
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(cx, cy, cellW, cellH, 4);
      ctx.fill();
      ctx.stroke();

      // Draw contour
      ctx.beginPath();
      pts.forEach(([px, py], pi) => {
        const sx = ox + (px - minX) * scale;
        const sy = oy + (py - minY) * scale;
        if (pi === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.closePath();
      ctx.fillStyle = colors[idx % colors.length] + "30";
      ctx.fill();
      ctx.strokeStyle = colors[idx % colors.length];
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = "#ccc";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(contour.label, cx + cellW / 2, cy + cellH - 4);
    });
  }, [contours]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full rounded-lg border border-border ${className}`}
      style={{ height: "100%", minHeight: 250 }}
    />
  );
}
