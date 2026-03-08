import { useRef, useEffect, useState, useCallback } from "react";
import type { BoxPiece } from "@/lib/box-generator-engine";

interface Props {
  pieces: BoxPiece[];
  className?: string;
}

export function BoxPreview2D({ pieces, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
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
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const handleMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setZoom((z) => Math.max(0.2, Math.min(5, z - e.deltaY * 0.002)));
  }, []);

  // Register native wheel listener
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

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

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cw, ch);

    const gap = 20;

    // Pre-calculate bounding boxes
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

    // Layout: arrange pieces in a 2-column grid-like layout for better space usage
    interface LayoutItem { pi: number; q: number; x: number; y: number }
    const layoutItems: LayoutItem[] = [];
    let lx = 0, ly = 0, maxRowH = 0;
    const layoutMaxW = 1200;

    for (let pi = 0; pi < pieces.length; pi++) {
      const b = pieceBounds[pi];
      for (let q = 0; q < pieces[pi].quantity; q++) {
        if (lx + b.drawW > layoutMaxW && lx > 0) {
          lx = 0;
          ly += maxRowH + gap;
          maxRowH = 0;
        }
        layoutItems.push({ pi, q, x: lx, y: ly });
        maxRowH = Math.max(maxRowH, b.drawH);
        lx += b.drawW + gap;
      }
    }
    const totalLayoutW = layoutItems.reduce((max, item) => {
      const b = pieceBounds[item.pi];
      return Math.max(max, item.x + b.drawW);
    }, 0);
    const totalLayoutH = ly + maxRowH;

    // Auto-fit scale
    const baseScale = Math.min(
      (cw - 40) / (totalLayoutW || 1),
      (ch - 40) / (totalLayoutH || 1),
    ) * 0.92;

    const finalScale = baseScale * zoom;
    const centerX = cw / 2 + pan.x;
    const centerY = ch / 2 + pan.y;

    ctx.save();
    ctx.translate(centerX - (totalLayoutW * finalScale) / 2, centerY - (totalLayoutH * finalScale) / 2);
    ctx.scale(finalScale, finalScale);

    // Draw each piece
    for (const item of layoutItems) {
      const piece = pieces[item.pi];
      const b = pieceBounds[item.pi];
      const ox = item.x - b.minX;
      const oy = item.y - b.minY;

      if (piece.paths && piece.paths.length > 0) {
        for (const contour of piece.paths) {
          if (contour.length === 0) continue;

          // Draw contour
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          for (const seg of contour) {
            ctx.lineTo(ox + seg.x, oy + seg.y);
          }
          ctx.closePath();

          // Very light fill
          ctx.fillStyle = "rgba(240, 240, 240, 0.5)";
          ctx.fill();

          // Black stroke — technical drawing style
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 1.2 / finalScale;
          ctx.lineJoin = "miter";
          ctx.stroke();
        }
      }

      // Label — small, subtle, centered
      const labelX = item.x + b.drawW / 2;
      const labelY = item.y + b.drawH / 2;
      const fontSize = Math.max(5, Math.min(10, Math.min(b.drawW, b.drawH) / 15));
      ctx.fillStyle = "#999";
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(piece.label, labelX, labelY - fontSize * 0.7);
      ctx.font = `${fontSize * 0.8}px sans-serif`;
      ctx.fillStyle = "#bbb";
      ctx.fillText(
        `${piece.width.toFixed(1)} × ${piece.height.toFixed(1)}`,
        labelX, labelY + fontSize * 0.5,
      );
    }

    ctx.restore();

    // Zoom indicator
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(zoom * 100)}%`, cw - 8, ch - 8);

    // Hint
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Arraste para mover · Scroll para zoom", cw / 2, ch - 8);
  }, [pieces, pan, zoom]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", cursor: dragging.current ? "grabbing" : "grab", background: "#fff" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}
