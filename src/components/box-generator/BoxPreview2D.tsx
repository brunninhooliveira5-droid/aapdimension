import { useRef, useEffect } from "react";
import type { BoxPiece } from "@/lib/box-generator-engine";

interface Props {
  pieces: BoxPiece[];
  className?: string;
}

export function BoxPreview2D({ pieces, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || pieces.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cw, ch);

    // Layout pieces in rows
    const gap = 8;
    let x = gap;
    let y = gap;
    let maxRowH = 0;
    const maxW = cw - gap * 2;

    // Calculate scale
    let totalW = 0;
    let totalH = 0;
    {
      let lx = gap, ly = gap, lmrh = 0;
      for (const p of pieces) {
        for (let q = 0; q < p.quantity; q++) {
          if (lx + p.width + gap > 2000) { lx = gap; ly += lmrh + gap; lmrh = 0; }
          totalW = Math.max(totalW, lx + p.width + gap);
          lmrh = Math.max(lmrh, p.height);
          lx += p.width + gap;
        }
        totalH = ly + lmrh + gap;
      }
    }
    const scale = Math.min((cw - gap * 2) / totalW, (ch - gap * 2) / totalH, 1);
    ctx.save();
    ctx.translate(gap, gap);
    ctx.scale(scale, scale);

    const colors = [
      "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4",
    ];

    let ci = 0;
    x = 0; y = 0; maxRowH = 0;
    for (const piece of pieces) {
      const color = colors[ci++ % colors.length];
      for (let q = 0; q < piece.quantity; q++) {
        if (x + piece.width > maxW / scale) {
          x = 0;
          y += maxRowH + gap;
          maxRowH = 0;
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5 / scale;
        ctx.strokeRect(x, y, piece.width, piece.height);

        ctx.fillStyle = color + "18";
        ctx.fillRect(x, y, piece.width, piece.height);

        // Label
        const fontSize = Math.max(8, Math.min(14, piece.width / 10));
        ctx.fillStyle = color;
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(piece.label, x + piece.width / 2, y + piece.height / 2 - fontSize * 0.6);
        ctx.font = `${fontSize * 0.7}px sans-serif`;
        ctx.fillStyle = "#888";
        ctx.fillText(
          `${piece.width.toFixed(1)} × ${piece.height.toFixed(1)}`,
          x + piece.width / 2,
          y + piece.height / 2 + fontSize * 0.5
        );

        maxRowH = Math.max(maxRowH, piece.height);
        x += piece.width + gap;
      }
    }

    ctx.restore();
  }, [pieces]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
