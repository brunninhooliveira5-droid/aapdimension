import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, GripVertical, RotateCw } from "lucide-react";
import { getPieceColor, type BarLayout, type BarSegment, type TubeCuttingResult } from "@/lib/cutting-plan-engine";
import { toast } from "sonner";

interface InteractiveTubeLayoutProps {
  result: TubeCuttingResult;
  barLength: number;
  kerfWidth: number;
  onResultChange: (newResult: TubeCuttingResult) => void;
}

export function InteractiveTubeLayout({ result, barLength, kerfWidth, onResultChange }: InteractiveTubeLayoutProps) {
  const [dragSeg, setDragSeg] = useState<{ barIdx: number; segIdx: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  const handleExcludePiece = (barIdx: number, segIdx: number) => {
    const newBars = result.bars.map((bar, bi) => {
      if (bi !== barIdx) return bar;
      const newSegments = bar.segments.filter((_, si) => si !== segIdx);
      return recalcBar(newSegments, barLength, kerfWidth);
    }).filter(bar => bar.segments.length > 0);

    emitResult(newBars);
    toast.success("Peça removida do plano.");
  };

  const handleDragStart = (barIdx: number, segIdx: number) => {
    setDragSeg({ barIdx, segIdx });
  };

  const handleDragOver = (e: React.DragEvent, targetBarIdx: number) => {
    e.preventDefault();
    setDropTarget(targetBarIdx);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent, targetBarIdx: number) => {
    e.preventDefault();
    setDropTarget(null);
    if (!dragSeg) return;
    if (dragSeg.barIdx === targetBarIdx) { setDragSeg(null); return; }

    const seg = result.bars[dragSeg.barIdx].segments[dragSeg.segIdx];
    const targetBar = result.bars[targetBarIdx];

    // Check if piece fits in target bar
    const targetUsed = targetBar.segments.reduce((s, seg) => s + seg.length, 0);
    const totalKerf = targetBar.segments.length * kerfWidth;
    const available = barLength - targetUsed - totalKerf;

    if (seg.length + kerfWidth > available + 0.01) {
      toast.error(`Peça P${seg.pieceIndex + 1} (${seg.length} mm) não cabe na Barra ${targetBarIdx + 1}. Espaço disponível: ${available.toFixed(0)} mm`);
      setDragSeg(null);
      return;
    }

    // Move piece
    const newBars = result.bars.map((bar, bi) => {
      if (bi === dragSeg.barIdx) {
        const newSegments = bar.segments.filter((_, si) => si !== dragSeg.segIdx);
        return recalcBar(newSegments, barLength, kerfWidth);
      }
      if (bi === targetBarIdx) {
        const newSegments = [...bar.segments, seg];
        return recalcBar(newSegments, barLength, kerfWidth);
      }
      return bar;
    }).filter(bar => bar.segments.length > 0);

    emitResult(newBars);
    setDragSeg(null);
    toast.success(`Peça movida para Barra ${targetBarIdx + 1}.`);
  };

  const emitResult = (newBars: BarLayout[]) => {
    const totalUsed = newBars.reduce((s, b) => s + b.usedLength, 0);
    const totalLen = barLength * newBars.length;
    onResultChange({
      ...result,
      bars: newBars,
      totalBars: newBars.length,
      totalUtilization: totalLen > 0 ? (totalUsed / totalLen) * 100 : 0,
      totalWaste: totalLen - totalUsed,
      estimatedCost: newBars.length * (result.estimatedCost / Math.max(result.totalBars, 1)),
      scraps: newBars.flatMap((b, i) => b.wasteLength >= 150 ? [{ length: b.wasteLength, barIndex: i }] : []),
    });
  };

  return (
    <div className="space-y-3">
      {result.bars.map((bar, barIdx) => (
        <div
          key={barIdx}
          className={`space-y-1 p-2 rounded-lg border transition-colors ${dropTarget === barIdx ? "border-primary bg-primary/5" : "border-transparent"}`}
          onDragOver={(e) => handleDragOver(e, barIdx)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, barIdx)}
        >
          <p className="text-sm font-medium text-foreground">
            Barra {barIdx + 1} — {bar.segments.length} peça(s) — {bar.utilization.toFixed(1)}% — Sobra: {bar.wasteLength.toFixed(1)} mm
          </p>
          <div className="relative h-12 border-2 border-border rounded bg-muted/20 overflow-hidden">
            {bar.segments.map((seg, segIdx) => (
              <div
                key={segIdx}
                className="absolute h-full flex items-center justify-between px-1 text-[10px] font-bold text-white border-r border-white/30 cursor-grab active:cursor-grabbing group"
                draggable
                onDragStart={() => handleDragStart(barIdx, segIdx)}
                title={`P${seg.pieceIndex + 1}: ${seg.length} mm — Arraste para mover`}
                style={{
                  left: `${(seg.position / barLength) * 100}%`,
                  width: `${(seg.length / barLength) * 100}%`,
                  backgroundColor: getPieceColor(seg.pieceIndex),
                }}
              >
                <span className="flex items-center gap-0.5 truncate">
                  <GripVertical className="h-3 w-3 opacity-50 shrink-0" />
                  P{seg.pieceIndex + 1}
                  <span className="font-normal text-[9px] opacity-80 hidden sm:inline">({seg.length}mm)</span>
                </span>
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded p-0.5 shrink-0"
                  onClick={(e) => { e.stopPropagation(); handleExcludePiece(barIdx, segIdx); }}
                  title="Excluir peça"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground italic">
        💡 Arraste peças entre barras para reorganizar. Passe o mouse e clique no 🗑️ para excluir.
      </p>
    </div>
  );
}

function recalcBar(segments: BarSegment[], barLength: number, kerfWidth: number): BarLayout {
  // Recalculate positions
  let pos = 0;
  const newSegments = segments.map((seg, i) => {
    const gap = i > 0 ? kerfWidth : 0;
    const newPos = pos + gap;
    pos = newPos + seg.length;
    return { ...seg, position: newPos };
  });
  const usedLen = newSegments.reduce((s, seg) => s + seg.length, 0);
  const totalKerf = Math.max(0, newSegments.length - 1) * kerfWidth;
  const waste = barLength - usedLen - totalKerf;
  return {
    segments: newSegments,
    usedLength: usedLen,
    wasteLength: Math.max(0, waste),
    utilization: (usedLen / barLength) * 100,
  };
}
