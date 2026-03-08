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

    const gap = 12;

    // Pre-calculate bounding boxes for each piece (accounting for finger tabs)
    const pieceBounds = pieces.map((p) => {
      let minX = 0, minY = 0, maxX = p.width, maxY = p.height;
      if (p.paths && p.paths.length > 0) {
        for (const contour of p.paths) {
          for (const seg of contour) {
            if (seg.x < minX) minX = seg.x;
            if (seg.y < minY) minY = seg.y;
            if (seg.x > maxX) maxX = seg.x;
            if (seg.y > maxY) maxY = seg.y;
          }
        }
      }
      return { minX, minY, maxX, maxY, drawW: maxX - minX, drawH: maxY - minY };
    });

    // Layout pieces in rows
    let totalW = 0, totalH = 0;
    {
      let lx = 0, ly = 0, lmrh = 0;
      for (let pi = 0; pi < pieces.length; pi++) {
        const b = pieceBounds[pi];
        for (let q = 0; q < pieces[pi].quantity; q++) {
          if (lx + b.drawW + gap > 2000 && lx > 0) { lx = 0; ly += lmrh + gap; lmrh = 0; }
          totalW = Math.max(totalW, lx + b.drawW);
          lmrh = Math.max(lmrh, b.drawH);
          lx += b.drawW + gap;
        }
        totalH = ly + lmrh;
      }
    }

    const scale = Math.min((cw - gap * 4) / (totalW || 1), (ch - gap * 4) / (totalH || 1), 1.5);
    const offsetX = (cw - totalW * scale) / 2;
    const offsetY = (ch - totalH * scale) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const colors = [
      "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4",
    ];

    let ci = 0;
    let x = 0, y = 0, maxRowH = 0;
    const maxW = (cw - gap * 4) / scale;

    for (let pi = 0; pi < pieces.length; pi++) {
      const piece = pieces[pi];
      const b = pieceBounds[pi];
      const color = colors[ci++ % colors.length];

      for (let q = 0; q < piece.quantity; q++) {
        if (x + b.drawW > maxW && x > 0) {
          x = 0;
          y += maxRowH + gap;
          maxRowH = 0;
        }

        // Draw piece contour from paths
        const drawX = x - b.minX;
        const drawY = y - b.minY;

        if (piece.paths && piece.paths.length > 0) {
          for (const contour of piece.paths) {
            if (contour.length === 0) continue;

            // Fill
            ctx.beginPath();
            ctx.moveTo(drawX, drawY);
            for (const seg of contour) {
              ctx.lineTo(drawX + seg.x, drawY + seg.y);
            }
            ctx.closePath();
            ctx.fillStyle = color + "15";
            ctx.fill();

            // Stroke
            ctx.beginPath();
            ctx.moveTo(drawX, drawY);
            for (const seg of contour) {
              ctx.lineTo(drawX + seg.x, drawY + seg.y);
            }
            ctx.closePath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5 / scale;
            ctx.stroke();
          }
        }

        // Label
        const labelX = x + b.drawW / 2;
        const labelY = y + b.drawH / 2;
        const fontSize = Math.max(6, Math.min(12, b.drawW / 12));
        ctx.fillStyle = color;
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(piece.label, labelX, labelY - fontSize * 0.6);
        ctx.font = `${fontSize * 0.75}px sans-serif`;
        ctx.fillStyle = "#666";
        ctx.fillText(
          `${piece.width.toFixed(1)} × ${piece.height.toFixed(1)}`,
          labelX, labelY + fontSize * 0.5,
        );

        maxRowH = Math.max(maxRowH, b.drawH);
        x += b.drawW + gap;
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
