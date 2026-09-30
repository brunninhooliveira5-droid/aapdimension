import { useRef, useEffect } from "react";
import { asComponentPiece, componentBounds, type AcmFlatPiece } from "@/lib/acm-engine";

interface Props {
  pieces: AcmFlatPiece[];
  className?: string;
  /** Componente destacado (prévia técnica individual) */
  highlightId?: string;
}

const CORNER_SHORT: Record<string, string> = {
  "top-left": "Sup. Esq.",
  "top-right": "Sup. Dir.",
  "bottom-left": "Inf. Esq.",
  "bottom-right": "Inf. Dir.",
};

export function AcmPreview2D({ pieces, className, highlightId }: Props) {
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

    // Extensão do documento — cada componente mantém sua posição determinística
    let docW = 0;
    let docH = 0;
    for (const piece of pieces) {
      const bounds = componentBounds(piece);
      docW = Math.max(docW, bounds.x + bounds.width);
      docH = Math.max(docH, bounds.y + bounds.height);
    }
    if (docW <= 0 || docH <= 0) return;

    const margin = 30;
    const scale = Math.min((cw - margin * 2) / docW, (ch - margin * 2) / docH, 1.5);
    const offsetX = (cw - docW * scale) / 2;
    const offsetY = (ch - docH * scale) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const panelColors = [
      "#3b82f620", "#10b98120", "#f59e0b20", "#ef444420",
      "#8b5cf620", "#ec489920", "#06b6d420",
    ];

    for (const piece of pieces) {
      const component = asComponentPiece(piece);
      const highlighted = highlightId === piece.id;

      piece.panels.forEach((panel, i) => {
        ctx.setLineDash([]);
        ctx.fillStyle = highlighted ? "#3b82f640" : panelColors[i % panelColors.length];
        ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
        ctx.strokeStyle = highlighted ? "#3b82f6" : "#888888";
        ctx.lineWidth = highlighted ? 1.5 : 0.5;
        ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);

        const fontSize = Math.max(6, Math.min(14, Math.min(panel.width, panel.height) / 6));
        ctx.fillStyle = "#aaaaaa";
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const label =
          component && component.corner
            ? CORNER_SHORT[component.corner] ?? panel.label
            : panel.label;
        ctx.fillText(label, panel.x + panel.width / 2, panel.y + panel.height / 2 - fontSize * 0.5);
        ctx.font = `${fontSize * 0.7}px sans-serif`;
        ctx.fillStyle = "#888888";
        ctx.fillText(
          `${panel.width.toFixed(0)} × ${panel.height.toFixed(0)}`,
          panel.x + panel.width / 2,
          panel.y + panel.height / 2 + fontSize * 0.6
        );
      });

      if (component) {
        // Operações paramétricas: CUT_OUTER, CUT_INNER (furo) e linha de dobra
        for (const op of component.operations ?? []) {
          if (op.geometry === "circle" && op.cx !== undefined && op.cy !== undefined && op.radius !== undefined) {
            ctx.setLineDash([]);
            ctx.strokeStyle = "#ff3333";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(op.cx, op.cy, op.radius, 0, Math.PI * 2);
            ctx.stroke();
            continue;
          }
          if (op.geometry === "line" && op.x1 !== undefined && op.y1 !== undefined && op.x2 !== undefined && op.y2 !== undefined) {
            const isBend = op.type === "BEND";
            ctx.strokeStyle = isBend ? "#22cc55" : "#ff3333";
            ctx.lineWidth = isBend ? 1 : 1.5;
            ctx.setLineDash(isBend ? [8, 4] : []);
            ctx.beginPath();
            ctx.moveTo(op.x1, op.y1);
            ctx.lineTo(op.x2, op.y2);
            ctx.stroke();
          }
        }
        ctx.setLineDash([]);
        continue;
      }

      // Cut lines (red)
      ctx.strokeStyle = "#ff3333";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
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
  }, [pieces, highlightId]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
