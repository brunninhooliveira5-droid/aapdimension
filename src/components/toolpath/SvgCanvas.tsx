import { useRef, useState, useCallback, useEffect } from "react";
import type { SvgVector, MaterialConfig, ToolpathOperation, CncTool } from "@/lib/toolpath-engine";

interface SvgCanvasProps {
  vectors: SvgVector[];
  material: MaterialConfig;
  operations: ToolpathOperation[];
  tools: CncTool[];
  selectedVectorIds: string[];
  activeOperationId: string | null;
  showToolpath: Record<string, boolean>;
  onSelectVector: (id: string, multi: boolean) => void;
  viewBox: string;
}

export function SvgCanvas({
  vectors,
  material,
  operations,
  tools,
  selectedVectorIds,
  activeOperationId,
  showToolpath,
  onSelectVector,
  viewBox,
}: SvgCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.1, Math.min(10, z * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const handleClickVector = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onSelectVector(id, e.ctrlKey || e.metaKey);
  }, [onSelectVector]);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Parse viewBox
  const vbParts = viewBox.split(/\s+/).map(Number);
  const vbW = vbParts[2] || material.width;
  const vbH = vbParts[3] || material.height;

  // Grid spacing
  const gridSpacing = material.unit === "mm" ? 10 : 25.4;

  return (
    <div className="relative h-full w-full bg-muted/30 overflow-hidden select-none rounded-md border border-border">
      {/* Toolbar */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-background/90 backdrop-blur rounded-md px-2 py-1 border border-border text-xs">
        <button onClick={() => setZoom((z) => Math.min(10, z * 1.2))} className="px-1.5 py-0.5 hover:bg-accent rounded">+</button>
        <span className="min-w-[3rem] text-center">{(zoom * 100).toFixed(0)}%</span>
        <button onClick={() => setZoom((z) => Math.max(0.1, z * 0.8))} className="px-1.5 py-0.5 hover:bg-accent rounded">−</button>
        <button onClick={resetView} className="px-1.5 py-0.5 hover:bg-accent rounded ml-1">⟳</button>
        <label className="flex items-center gap-1 ml-2 cursor-pointer">
          <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} className="w-3 h-3" />
          Grid
        </label>
      </div>

      {/* Rulers */}
      <div className="absolute top-0 left-8 right-0 h-5 bg-muted/80 border-b border-border flex items-end overflow-hidden z-[5]">
        {Array.from({ length: Math.ceil(vbW / gridSpacing) + 1 }).map((_, i) => (
          <span key={i} className="absolute text-[8px] text-muted-foreground" style={{ left: `${(i * gridSpacing / vbW) * 100}%` }}>
            {i * gridSpacing}
          </span>
        ))}
      </div>
      <div className="absolute top-5 left-0 bottom-0 w-5 bg-muted/80 border-r border-border overflow-hidden z-[5]">
        {Array.from({ length: Math.ceil(vbH / gridSpacing) + 1 }).map((_, i) => (
          <span key={i} className="absolute text-[8px] text-muted-foreground origin-top-left" style={{ top: `${(i * gridSpacing / vbH) * 100}%`, left: 2 }}>
            {i * gridSpacing}
          </span>
        ))}
      </div>

      <svg
        ref={svgRef}
        className="w-full h-full cursor-crosshair"
        viewBox={`${-pan.x / zoom} ${-pan.y / zoom} ${vbW / zoom} ${vbH / zoom}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => onSelectVector("", false)}
      >
        {/* Material boundary */}
        <rect
          x={0} y={0}
          width={material.width} height={material.height}
          fill="hsl(var(--card))"
          stroke="hsl(var(--border))"
          strokeWidth={1 / zoom}
          strokeDasharray={`${4 / zoom}`}
        />

        {/* Grid */}
        {showGrid && (
          <g opacity={0.15}>
            {Array.from({ length: Math.ceil(material.width / gridSpacing) }).map((_, i) => (
              <line key={`gx-${i}`} x1={(i + 1) * gridSpacing} y1={0} x2={(i + 1) * gridSpacing} y2={material.height} stroke="hsl(var(--foreground))" strokeWidth={0.5 / zoom} />
            ))}
            {Array.from({ length: Math.ceil(material.height / gridSpacing) }).map((_, i) => (
              <line key={`gy-${i}`} x1={0} y1={(i + 1) * gridSpacing} x2={material.width} y2={(i + 1) * gridSpacing} stroke="hsl(var(--foreground))" strokeWidth={0.5 / zoom} />
            ))}
          </g>
        )}

        {/* Zero origin marker */}
        <g>
          {material.zeroOrigin === "bottom-left" && (
            <>
              <line x1={0} y1={material.height} x2={15 / zoom} y2={material.height} stroke="#ef4444" strokeWidth={2 / zoom} />
              <line x1={0} y1={material.height} x2={0} y2={material.height - 15 / zoom} stroke="#22c55e" strokeWidth={2 / zoom} />
              <circle cx={0} cy={material.height} r={3 / zoom} fill="#f59e0b" />
            </>
          )}
          {material.zeroOrigin === "center" && (
            <>
              <line x1={material.width / 2 - 10 / zoom} y1={material.height / 2} x2={material.width / 2 + 10 / zoom} y2={material.height / 2} stroke="#ef4444" strokeWidth={2 / zoom} />
              <line x1={material.width / 2} y1={material.height / 2 - 10 / zoom} x2={material.width / 2} y2={material.height / 2 + 10 / zoom} stroke="#22c55e" strokeWidth={2 / zoom} />
              <circle cx={material.width / 2} cy={material.height / 2} r={3 / zoom} fill="#f59e0b" />
            </>
          )}
        </g>

        {/* Vectors */}
        {vectors.map((v) => {
          const isSelected = selectedVectorIds.includes(v.id);
          return (
            <path
              key={v.id}
              d={v.pathData}
              fill="none"
              stroke={isSelected ? "hsl(var(--primary))" : v.color}
              strokeWidth={(isSelected ? 2.5 : 1.5) / zoom}
              className="cursor-pointer hover:opacity-80"
              onClick={(e) => handleClickVector(e, v.id)}
            />
          );
        })}

        {/* Toolpath previews */}
        {operations.filter((op) => op.enabled && showToolpath[op.id] !== false).map((op) => {
          const tool = tools.find((t) => t.id === op.toolId);
          const isActive = op.id === activeOperationId;
          if (!tool) return null;
          const offset = op.cutSide === "outside" ? tool.diameter / 2 : op.cutSide === "inside" ? -tool.diameter / 2 : 0;
          return (
            <g key={`tp-${op.id}`} opacity={isActive ? 1 : 0.4}>
              {op.vectorIds.map((vid) => {
                const v = vectors.find((vv) => vv.id === vid);
                if (!v) return null;
                return (
                  <path
                    key={`tp-${op.id}-${vid}`}
                    d={v.pathData}
                    fill="none"
                    stroke={isActive ? "#f59e0b" : "#94a3b8"}
                    strokeWidth={(tool.diameter * 0.8) / zoom}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.3}
                    transform={`translate(${offset}, 0)`}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
