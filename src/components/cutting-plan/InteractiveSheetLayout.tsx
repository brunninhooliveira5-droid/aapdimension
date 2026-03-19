import { useState, useRef, useCallback, useMemo } from "react";
import { getPieceColor, type PlacedPiece } from "@/lib/cutting-plan-engine";
import { type PdfNomenclatureConfig, formatPieceLabel } from "./CuttingPlanPdfConfig";
import { RotateCw, RotateCcw, X, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PieceDescription {
  [pieceId: string]: string;
}

interface Props {
  layout: { pieces: PlacedPiece[]; utilization: number; scrapWidth?: number; scrapHeight?: number };
  matW: number;
  matH: number;
  sheetIndex: number;
  totalSheets: number;
  singleCut: boolean;
  kerfWidth: number;
  descriptions: PieceDescription;
  nomenclatureConfig: PdfNomenclatureConfig;
  onLayoutChange: (sheetIndex: number, pieces: PlacedPiece[]) => void;
  onMovePiece?: (fromSheet: number, pieceIdx: number, toSheet: number) => void;
}

export function InteractiveSheetLayout({
  layout,
  matW,
  matH,
  sheetIndex,
  totalSheets,
  singleCut,
  kerfWidth,
  descriptions,
  nomenclatureConfig,
  onLayoutChange,
  onMovePiece,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Store the original layout for reset
  const [originalPieces] = useState<PlacedPiece[]>(() => layout.pieces.map(p => ({ ...p })));

  const pieces = layout.pieces;

  const scrapX = pieces.length > 0 ? Math.max(...pieces.map(p => p.x + p.width)) : 0;
  const scrapY = pieces.length > 0 ? Math.max(...pieces.map(p => p.y + p.height)) : 0;
  const hasScrapRight = matW - scrapX > 10;
  const hasScrapBottom = matH - scrapY > 10;

  // Enforce kerf distance: after dragging, snap position so it doesn't overlap other pieces (respecting kerf)
  const enforceKerf = useCallback((newX: number, newY: number, pieceIdx: number, pw: number, ph: number): { x: number; y: number } => {
    let x = newX;
    let y = newY;
    const kerf = kerfWidth;

    for (let i = 0; i < pieces.length; i++) {
      if (i === pieceIdx) continue;
      const other = pieces[i];

      // Check if there's vertical overlap (Y axis overlap)
      const yOverlap = y < other.y + other.height + kerf && y + ph > other.y - kerf;
      // Check if there's horizontal overlap (X axis overlap)
      const xOverlap = x < other.x + other.width + kerf && x + pw > other.x - kerf;

      if (xOverlap && yOverlap) {
        // There's an overlap — push piece out by the smallest correction
        const pushRight = other.x + other.width + kerf - x;
        const pushLeft = x + pw + kerf - other.x;
        const pushDown = other.y + other.height + kerf - y;
        const pushUp = y + ph + kerf - other.y;

        // Find smallest positive push
        const corrections = [
          { dx: pushRight, dy: 0 },
          { dx: -pushLeft, dy: 0 },
          { dx: 0, dy: pushDown },
          { dx: 0, dy: -pushUp },
        ].filter(c => {
          const nx = x + c.dx;
          const ny = y + c.dy;
          return nx >= 0 && ny >= 0 && nx + pw <= matW && ny + ph <= matH;
        });

        if (corrections.length > 0) {
          const best = corrections.reduce((a, b) =>
            Math.abs(a.dx) + Math.abs(a.dy) < Math.abs(b.dx) + Math.abs(b.dy) ? a : b
          );
          x += best.dx;
          y += best.dy;
        }
      }
    }

    return { x, y };
  }, [pieces, kerfWidth, matW, matH]);

  const handleMouseDown = useCallback((e: React.MouseEvent, pieceIdx: number) => {
    if (!containerRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    const piece = pieces[pieceIdx];
    const mouseX = ((e.clientX - rect.left) / rect.width) * matW;
    const mouseY = ((e.clientY - rect.top) / rect.height) * matH;
    setDraggingIdx(pieceIdx);
    setDragOffset({ x: mouseX - piece.x, y: mouseY - piece.y });
  }, [pieces, matW, matH]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingIdx === null || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * matW;
    const mouseY = ((e.clientY - rect.top) / rect.height) * matH;

    const piece = pieces[draggingIdx];
    let newX = Math.round(mouseX - dragOffset.x);
    let newY = Math.round(mouseY - dragOffset.y);

    // Clamp within material bounds
    newX = Math.max(0, Math.min(matW - piece.width, newX));
    newY = Math.max(0, Math.min(matH - piece.height, newY));

    // Enforce kerf distance from other pieces
    const corrected = enforceKerf(newX, newY, draggingIdx, piece.width, piece.height);

    const newPieces = pieces.map((p, i) =>
      i === draggingIdx ? { ...p, x: corrected.x, y: corrected.y } : p
    );
    onLayoutChange(sheetIndex, newPieces);
  }, [draggingIdx, dragOffset, pieces, matW, matH, sheetIndex, onLayoutChange, enforceKerf]);

  const handleMouseUp = useCallback(() => {
    setDraggingIdx(null);
  }, []);

  const handleRotatePiece = useCallback((pieceIdx: number) => {
    const piece = pieces[pieceIdx];
    const newW = piece.height;
    const newH = piece.width;

    // Check if rotated piece fits in material
    if (piece.x + newW > matW || piece.y + newH > matH) {
      let newX = Math.min(piece.x, matW - newW);
      let newY = Math.min(piece.y, matH - newH);
      if (newX < 0 || newY < 0) {
        toast.error("Peça não cabe no material ao girar.");
        return;
      }
      const newPieces = pieces.map((p, i) =>
        i === pieceIdx ? { ...p, width: newW, height: newH, x: newX, y: newY, rotated: !p.rotated } : p
      );
      onLayoutChange(sheetIndex, newPieces);
    } else {
      const newPieces = pieces.map((p, i) =>
        i === pieceIdx ? { ...p, width: newW, height: newH, rotated: !p.rotated } : p
      );
      onLayoutChange(sheetIndex, newPieces);
    }
  }, [pieces, matW, matH, sheetIndex, onLayoutChange]);

  const handleDeletePiece = useCallback((pieceIdx: number) => {
    const newPieces = pieces.filter((_, i) => i !== pieceIdx);
    onLayoutChange(sheetIndex, newPieces);
    toast.success("Peça removida do plano.");
  }, [pieces, sheetIndex, onLayoutChange]);

  const handleReset = useCallback(() => {
    onLayoutChange(sheetIndex, originalPieces.map(p => ({ ...p })));
    toast.success("Posições restauradas para o layout original.");
  }, [sheetIndex, originalPieces, onLayoutChange]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          Chapa {sheetIndex + 1} — {pieces.length} peça(s) — Aproveitamento: {layout.utilization.toFixed(1)}%
          {layout.scrapWidth && layout.scrapHeight && (
            <span className="text-muted-foreground ml-2">
              (Retalho: {layout.scrapWidth.toFixed(0)} x {layout.scrapHeight.toFixed(0)} mm)
            </span>
          )}
        </p>
        <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
          <RotateCcw className="h-3.5 w-3.5" /> Restaurar
        </Button>
      </div>

      <div className="text-xs text-muted-foreground font-medium mb-1">
        Material: {matW} x {matH} mm — <span className="text-primary">Arraste as peças para reposicionar, clique no ↻ para girar</span>
        {kerfWidth > 0 && <span className="ml-2 text-destructive">(serra: {kerfWidth} mm)</span>}
      </div>

      <div className="relative">
        {/* Top dimension */}
        <div className="flex items-center justify-center mb-1">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
            <div className="h-px w-6 bg-muted-foreground/50" />
            {matW} mm
            <div className="h-px w-6 bg-muted-foreground/50" />
          </div>
        </div>

        <div className="flex items-stretch">
          <div
            ref={containerRef}
            className="relative border-2 border-primary/60 rounded bg-muted/30 overflow-hidden flex-1 select-none"
            style={{ paddingBottom: `${Math.min((matH / matW) * 100, 60)}%`, maxHeight: 320, cursor: draggingIdx !== null ? "grabbing" : "default" }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Pieces */}
            {pieces.map((p, j) => {
              const desc = descriptions[p.pieceId] || "";
              const { mainLabel, subLabel } = formatPieceLabel(nomenclatureConfig, p.pieceIndex, p.width, p.height, desc);

              return (
                <div
                  key={j}
                  className="absolute flex flex-col items-center justify-center text-[9px] font-bold text-white border border-white/40 rounded-sm shadow-sm group"
                  title={`${mainLabel} ${subLabel}${p.rotated ? " (girada)" : ""}\nArraste para mover`}
                  style={{
                    left: `${(p.x / matW) * 100}%`,
                    top: `${(p.y / matH) * 100}%`,
                    width: `${(p.width / matW) * 100}%`,
                    height: `${(p.height / matH) * 100}%`,
                    backgroundColor: getPieceColor(p.pieceIndex),
                    cursor: draggingIdx === j ? "grabbing" : "grab",
                    zIndex: draggingIdx === j ? 50 : 10,
                    opacity: draggingIdx === j ? 0.8 : 1,
                    transition: draggingIdx === j ? "none" : "opacity 0.15s",
                  }}
                  onMouseDown={(e) => handleMouseDown(e, j)}
                >
                  <span className="truncate px-0.5 leading-tight">
                    {mainLabel}{p.rotated ? " ↻" : ""}
                  </span>
                  {subLabel && (
                    <span className="truncate px-0.5 text-[8px] opacity-80 leading-tight">
                      {subLabel}
                    </span>
                  )}
                  {/* Delete button */}
                  <button
                    className="absolute top-0.5 left-0.5 bg-red-600/60 hover:bg-red-700/90 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleDeletePiece(j);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Remover peça do plano"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                  {/* Rotate button */}
                  <button
                    className="absolute top-0.5 right-0.5 bg-black/40 hover:bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleRotatePiece(j);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Girar peça 90°"
                  >
                    <RotateCw className="h-3 w-3 text-white" />
                  </button>
                  {/* Move to other sheet */}
                  {totalSheets > 1 && onMovePiece && (
                    <div className="absolute bottom-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                      {Array.from({ length: totalSheets }, (_, si) => si)
                        .filter(si => si !== sheetIndex)
                        .map(si => (
                          <button
                            key={si}
                            className="bg-blue-600/70 hover:bg-blue-700/90 rounded px-1 py-0.5 text-[7px] font-bold text-white leading-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              onMovePiece(sheetIndex, j, si);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            title={`Mover para Chapa ${si + 1}`}
                          >
                            →C{si + 1}
                          </button>
                        ))
                      }
                    </div>
                  )}
                </div>
              );
            })}

            {/* Kerf lines for single cut */}
            {singleCut && (() => {
              const kerf = kerfWidth;
              if (kerf <= 0) return null;
              type Seg = { pos: number; start: number; end: number };
              const hSegs: Seg[] = [];
              const vSegs: Seg[] = [];
              const pcs = pieces;
              for (let a = 0; a < pcs.length; a++) {
                for (let b = a + 1; b < pcs.length; b++) {
                  const pa = pcs[a], pb = pcs[b];
                  const aR = pa.x + pa.width, bR = pb.x + pb.width;
                  const aB = pa.y + pa.height, bB = pb.y + pb.height;
                  if (Math.abs(aR + kerf - pb.x) < 1) {
                    const s = Math.max(pa.y, pb.y), e = Math.min(aB, bB);
                    if (e > s) vSegs.push({ pos: aR + kerf / 2, start: s, end: e });
                  }
                  if (Math.abs(bR + kerf - pa.x) < 1) {
                    const s = Math.max(pa.y, pb.y), e = Math.min(aB, bB);
                    if (e > s) vSegs.push({ pos: bR + kerf / 2, start: s, end: e });
                  }
                  if (Math.abs(aB + kerf - pb.y) < 1) {
                    const s = Math.max(pa.x, pb.x), e = Math.min(aR, bR);
                    if (e > s) hSegs.push({ pos: aB + kerf / 2, start: s, end: e });
                  }
                  if (Math.abs(bB + kerf - pa.y) < 1) {
                    const s = Math.max(pa.x, pb.x), e = Math.min(aR, bR);
                    if (e > s) hSegs.push({ pos: bB + kerf / 2, start: s, end: e });
                  }
                }
              }
              const merge = (segs: Seg[]): Seg[] => {
                const groups = new Map<string, Seg[]>();
                for (const s of segs) {
                  const key = s.pos.toFixed(1);
                  if (!groups.has(key)) groups.set(key, []);
                  groups.get(key)!.push(s);
                }
                const result: Seg[] = [];
                for (const [, g] of groups) {
                  g.sort((a, b) => a.start - b.start);
                  let cur = { ...g[0] };
                  for (let i = 1; i < g.length; i++) {
                    if (g[i].start <= cur.end + kerf + 1) {
                      cur.end = Math.max(cur.end, g[i].end);
                    } else {
                      result.push(cur);
                      cur = { ...g[i] };
                    }
                  }
                  result.push(cur);
                }
                return result;
              };
              const mergedH = merge(hSegs);
              const mergedV = merge(vSegs);
              const lines: { x1: number; y1: number; x2: number; y2: number; vertical: boolean }[] = [];
              for (const s of mergedV) lines.push({ x1: s.pos, y1: s.start, x2: s.pos, y2: s.end, vertical: true });
              for (const s of mergedH) lines.push({ x1: s.start, y1: s.pos, x2: s.end, y2: s.pos, vertical: false });
              return lines.map((line, idx) => (
                <div
                  key={`kerf-${idx}`}
                  className="absolute bg-destructive pointer-events-none"
                  style={line.vertical ? {
                    left: `${(line.x1 / matW) * 100}%`,
                    top: `${(line.y1 / matH) * 100}%`,
                    width: '1.5px',
                    height: `${((line.y2 - line.y1) / matH) * 100}%`,
                  } : {
                    left: `${(line.x1 / matW) * 100}%`,
                    top: `${(line.y1 / matH) * 100}%`,
                    width: `${((line.x2 - line.x1) / matW) * 100}%`,
                    height: '1.5px',
                  }}
                />
              ));
            })()}

            {/* Scrap area - right */}
            {hasScrapRight && (
              <div
                className="absolute border-2 border-dashed border-orange-400/60 bg-orange-500/10 flex items-center justify-center rounded-sm pointer-events-none"
                style={{
                  left: `${(scrapX / matW) * 100}%`,
                  top: "0%",
                  width: `${((matW - scrapX) / matW) * 100}%`,
                  height: `${(scrapY / matH) * 100}%`,
                }}
              >
                <span className="text-[8px] text-orange-600 dark:text-orange-400 font-medium opacity-80 truncate px-0.5">
                  Sobra
                </span>
              </div>
            )}

            {/* Scrap area - bottom */}
            {hasScrapBottom && (
              <div
                className="absolute border-2 border-dashed border-orange-400/60 bg-orange-500/10 flex items-center justify-center rounded-sm pointer-events-none"
                style={{
                  left: "0%",
                  top: `${(scrapY / matH) * 100}%`,
                  width: "100%",
                  height: `${((matH - scrapY) / matH) * 100}%`,
                }}
              >
                <span className="text-[8px] text-orange-600 dark:text-orange-400 font-medium opacity-80 truncate px-0.5">
                  Retalho {matW.toFixed(0)}x{(matH - scrapY).toFixed(0)} mm
                </span>
              </div>
            )}
          </div>

          {/* Right dimension */}
          <div className="flex flex-col items-center justify-center ml-1">
            <div className="w-px flex-1 bg-muted-foreground/50" />
            <span className="text-[10px] text-muted-foreground font-medium py-1 [writing-mode:vertical-rl]">{matH} mm</span>
            <div className="w-px flex-1 bg-muted-foreground/50" />
          </div>
        </div>
      </div>
    </div>
  );
}
