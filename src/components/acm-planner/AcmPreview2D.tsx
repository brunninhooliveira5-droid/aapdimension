import { useRef, useEffect } from "react";
import type { AcmFlatPiece } from "@/lib/acm-engine";

interface Props {
  pieces: AcmFlatPiece[];
  className?: string;
}

export function AcmPreview2D({ pieces, className }: Props) {
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

    const piece = pieces[0];
    if (!piece) return;

    const margin = 30;
    const scaleX = (cw - margin * 2) / piece.totalWidth;
    const scaleY = (ch - margin * 2) / piece.totalHeight;
    const scale = Math.min(scaleX, scaleY, 1);

    const offsetX = (cw - piece.totalWidth * scale) / 2;
    const offsetY = (ch - piece.totalHeight * scale) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Draw panels with light fill
    const panelColors = [
      "#3b82f620", "#10b98120", "#f59e0b20", "#ef444420",
      "#8b5cf620", "#ec489920", "#06b6d420",
    ];
    piece.panels.forEach((panel, i) => {
      ctx.fillStyle = panelColors[i % panelColors.length];
      ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
      ctx.strokeStyle = "#888";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);

      // Label
      const fontSize = Math.max(8, Math.min(14, Math.min(panel.width, panel.height) / 6));
      ctx.fillStyle = "#aaa";
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(panel.label, panel.x + panel.width / 2, panel.y + panel.height / 2 - fontSize * 0.5);
      ctx.font = `${fontSize * 0.7}px sans-serif`;
      ctx.fillStyle = "#666";
      ctx.fillText(
        `${panel.width.toFixed(0)} × ${panel.height.toFixed(0)}`,
        panel.x + panel.width / 2,
        panel.y + panel.height / 2 + fontSize * 0.5
      );
    });

    // Cut lines (red)
    ctx.strokeStyle = "#ff3333";
    ctx.lineWidth = 1.5;
    for (const l of piece.cutLines) {
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
    }

    // Machining lines (blue dashed)
    ctx.strokeStyle = "#3388ff";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 3]);
    for (const l of piece.machiningLines) {
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
    }

    // Bend lines (green dashed)
    ctx.strokeStyle = "#22cc55";
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 4]);
    for (const l of piece.bendLines) {
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.restore();

    // Legend
    const legendY = ch - 20;
    ctx.font = "10px sans-serif";
    ctx.textAlign = "left";

    ctx.strokeStyle = "#ff3333";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(10, legendY); ctx.lineTo(30, legendY); ctx.stroke();
    ctx.fillStyle = "#ff3333";
    ctx.fillText("Corte", 34, legendY + 3);

    ctx.strokeStyle = "#3388ff";
    ctx.setLineDash([4, 2]);
    ctx.beginPath(); ctx.moveTo(80, legendY); ctx.lineTo(100, legendY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#3388ff";
    ctx.fillText("Usinagem", 104, legendY + 3);

    ctx.strokeStyle = "#22cc55";
    ctx.setLineDash([6, 3]);
    ctx.beginPath(); ctx.moveTo(170, legendY); ctx.lineTo(190, legendY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#22cc55";
    ctx.fillText("Dobra", 194, legendY + 3);
  }, [pieces]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
