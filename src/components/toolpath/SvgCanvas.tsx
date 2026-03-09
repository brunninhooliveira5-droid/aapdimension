import { useRef, useState, useCallback } from "react";
import type { SvgVector, MaterialConfig, ToolpathOperation, CncTool } from "@/lib/toolpath-engine";
import { extractPointsFromPath, GEOMETRY_CLASS_COLORS, type ValidationIssue, type GeometryClass } from "@/lib/toolpath-engine";
import type { DrawingTool } from "@/components/toolpath/DrawingToolbar";

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
  issues?: ValidationIssue[];
  activePassLayer?: number | null;
  // Drawing & editing
  drawingTool?: DrawingTool;
  isDrawingMode?: boolean;
  snapGrid?: boolean;
  onAddVector?: (vector: SvgVector) => void;
  onMoveVectors?: (ids: string[], dx: number, dy: number) => void;
  onDeleteVectors?: (ids: string[]) => void;
}

function generateId() {
  return `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function snapToGrid(val: number, spacing: number, enabled: boolean) {
  if (!enabled) return val;
  return Math.round(val / spacing) * spacing;
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
  issues = [],
  activePassLayer = null,
  drawingTool = "select",
  isDrawingMode = false,
  snapGrid: snapGridProp = true,
  onAddVector,
  onMoveVectors,
  onDeleteVectors,
}: SvgCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [showDirectionArrows, setShowDirectionArrows] = useState(true);
  const [showGeoColors, setShowGeoColors] = useState(true);
  const [colorProfile, setColorProfile] = useState<"default" | "white" | "blueprint" | "highContrast" | "warmShop" | "cnc">("default");

  // Drawing state
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Move/drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const COLOR_PROFILES = {
    default: { bg: "hsl(var(--card))", grid: "hsl(var(--foreground))", border: "hsl(var(--border))", vector: "#3b82f6", selected: "hsl(var(--primary))", toolpath: "#f59e0b", toolpathInactive: "#64748b", label: "Padrão" },
    white: { bg: "#ffffff", grid: "#d1d5db", border: "#e5e7eb", vector: "#2563eb", selected: "#7c3aed", toolpath: "#d97706", toolpathInactive: "#9ca3af", label: "Branco" },
    blueprint: { bg: "#0a1628", grid: "#1e3a5f", border: "#1e3a5f", vector: "#38bdf8", selected: "#22d3ee", toolpath: "#facc15", toolpathInactive: "#3b82f6", label: "Blueprint" },
    highContrast: { bg: "#000000", grid: "#333333", border: "#444444", vector: "#00ff00", selected: "#ff00ff", toolpath: "#ffff00", toolpathInactive: "#888888", label: "Alto Contraste" },
    warmShop: { bg: "#1c1410", grid: "#3d2e1f", border: "#4a3728", vector: "#f97316", selected: "#fb923c", toolpath: "#eab308", toolpathInactive: "#78716c", label: "Oficina" },
    cnc: { bg: "#0f172a", grid: "#1e293b", border: "#334155", vector: "#22c55e", selected: "#4ade80", toolpath: "#f59e0b", toolpathInactive: "#475569", label: "CNC" },
  };
  const cp = COLOR_PROFILES[colorProfile];

  const errorVectorIds = new Set(issues.filter((i) => i.severity === "error" && i.vectorId).map((i) => i.vectorId));

  const vbParts = viewBox.split(/\s+/).map(Number);
  const vbW = vbParts[2] || material.width;
  const vbH = vbParts[3] || material.height;
  const gridSpacing = material.unit === "mm" ? 10 : 25.4;

  // Convert screen coords to SVG coords
  const screenToSvg = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((clientX - rect.left) / rect.width) * (vbW / zoom) + (-pan.x / zoom);
    const svgY = ((clientY - rect.top) / rect.height) * (vbH / zoom) + (-pan.y / zoom);
    return { x: svgX, y: svgY };
  }, [vbW, vbH, zoom, pan]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.1, Math.min(10, z * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const svgPt = screenToSvg(e.clientX, e.clientY);
    const snappedX = snapToGrid(svgPt.x, gridSpacing, snapGridProp && isDrawingMode);
    const snappedY = snapToGrid(svgPt.y, gridSpacing, snapGridProp && isDrawingMode);

    // Pan with middle button or alt+click
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (!isDrawingMode || e.button !== 0) return;

    // Move tool - start drag
    if (drawingTool === "move" && selectedVectorIds.length > 0) {
      setIsDragging(true);
      setDragStart({ x: snappedX, y: snappedY });
      setDragOffset({ x: 0, y: 0 });
      return;
    }

    // Erase tool
    if (drawingTool === "erase") return; // handled by click on vector

    // Drawing tools
    if (["line", "rectangle", "circle"].includes(drawingTool)) {
      setIsDrawing(true);
      setDrawStart({ x: snappedX, y: snappedY });
      setDrawCurrent({ x: snappedX, y: snappedY });
    }
  }, [screenToSvg, gridSpacing, snapGridProp, isDrawingMode, drawingTool, selectedVectorIds, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    const svgPt = screenToSvg(e.clientX, e.clientY);
    const snappedX = snapToGrid(svgPt.x, gridSpacing, snapGridProp && isDrawingMode);
    const snappedY = snapToGrid(svgPt.y, gridSpacing, snapGridProp && isDrawingMode);

    if (isDragging && dragStart) {
      setDragOffset({ x: snappedX - dragStart.x, y: snappedY - dragStart.y });
      return;
    }

    if (isDrawing && drawStart) {
      setDrawCurrent({ x: snappedX, y: snappedY });
    }
  }, [isPanning, panStart, screenToSvg, gridSpacing, snapGridProp, isDrawingMode, isDragging, dragStart, isDrawing, drawStart]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    // Finish drag/move
    if (isDragging && dragStart && onMoveVectors) {
      const svgPt = screenToSvg(e.clientX, e.clientY);
      const snappedX = snapToGrid(svgPt.x, gridSpacing, snapGridProp && isDrawingMode);
      const snappedY = snapToGrid(svgPt.y, gridSpacing, snapGridProp && isDrawingMode);
      const dx = snappedX - dragStart.x;
      const dy = snappedY - dragStart.y;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        onMoveVectors(selectedVectorIds, dx, dy);
      }
      setIsDragging(false);
      setDragStart(null);
      setDragOffset({ x: 0, y: 0 });
      return;
    }

    // Finish drawing
    if (isDrawing && drawStart && drawCurrent && onAddVector) {
      const dx = drawCurrent.x - drawStart.x;
      const dy = drawCurrent.y - drawStart.y;
      const minSize = 2;

      if (Math.abs(dx) > minSize || Math.abs(dy) > minSize) {
        let pathData = "";
        let label = "";
        let closed = false;
        let geoClass: GeometryClass = "open-path";
        const x1 = drawStart.x, y1 = drawStart.y;
        const x2 = drawCurrent.x, y2 = drawCurrent.y;

        if (drawingTool === "line") {
          pathData = `M ${x1} ${y1} L ${x2} ${y2}`;
          label = `Linha ${Math.sqrt(dx * dx + dy * dy).toFixed(0)}`;
          geoClass = "open-path";
        } else if (drawingTool === "rectangle") {
          pathData = `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2} L ${x1} ${y2} Z`;
          label = `Retângulo ${Math.abs(dx).toFixed(0)}×${Math.abs(dy).toFixed(0)}`;
          closed = true;
          geoClass = "contour-outer";
        } else if (drawingTool === "circle") {
          const cx = (x1 + x2) / 2;
          const cy = (y1 + y2) / 2;
          const rx = Math.abs(dx) / 2;
          const ry = Math.abs(dy) / 2;
          pathData = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
          label = `Círculo ⌀${(Math.max(rx, ry) * 2).toFixed(0)}`;
          closed = true;
          geoClass = Math.max(rx, ry) < 5 ? "hole" : "contour-outer";
        }

        if (pathData) {
          const bx = Math.min(x1, x2), by = Math.min(y1, y2);
          const bw = Math.abs(dx), bh = Math.abs(dy);
          const newVector: SvgVector = {
            id: generateId(),
            pathData,
            label,
            color: "#3b82f6",
            layer: "Desenho",
            closed,
            geometryClass: geoClass,
            area: bw * bh,
            perimeter: 2 * (bw + bh),
            boundingBox: { x: bx, y: by, w: bw, h: bh },
            parentId: null,
            groupId: "",
            selected: false,
            isCircular: drawingTool === "circle",
          };
          onAddVector(newVector);
        }
      }
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
  }, [isPanning, isDragging, dragStart, onMoveVectors, selectedVectorIds, isDrawing, drawStart, drawCurrent, drawingTool, onAddVector, screenToSvg, gridSpacing, snapGridProp, isDrawingMode]);

  const handleClickVector = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (isDrawingMode && drawingTool === "erase" && onDeleteVectors) {
      onDeleteVectors([id]);
      return;
    }
    onSelectVector(id, e.ctrlKey || e.metaKey);
  }, [onSelectVector, isDrawingMode, drawingTool, onDeleteVectors]);

  const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  const getArrowPoints = (pathData: string, offset: number) => {
    const points = extractPointsFromPath(pathData);
    if (points.length < 2) return [];
    const arrows: { x: number; y: number; angle: number }[] = [];
    const step = Math.max(1, Math.floor(points.length / 6));
    for (let i = step; i < points.length - 1; i += step) {
      const dx = points[i + 1 < points.length ? i + 1 : i][0] - points[i - 1][0];
      const dy = points[i + 1 < points.length ? i + 1 : i][1] - points[i - 1][1];
      arrows.push({ x: points[i][0] + offset, y: points[i][1], angle: Math.atan2(dy, dx) * (180 / Math.PI) });
    }
    return arrows;
  };

  // Cursor based on tool
  const getCursor = () => {
    if (!isDrawingMode) return "crosshair";
    switch (drawingTool) {
      case "move": return "move";
      case "erase": return "pointer";
      case "select": return "default";
      default: return "crosshair";
    }
  };

  return (
    <div className="relative h-full w-full bg-muted/30 overflow-hidden select-none rounded-md border border-border">
      {/* Toolbar */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-background/90 backdrop-blur rounded-md px-2 py-1 border border-border text-xs">
        <button onClick={() => setZoom((z) => Math.min(10, z * 1.2))} className="px-1.5 py-0.5 hover:bg-accent rounded">+</button>
        <span className="min-w-[3rem] text-center">{(zoom * 100).toFixed(0)}%</span>
        <button onClick={() => setZoom((z) => Math.max(0.1, z * 0.8))} className="px-1.5 py-0.5 hover:bg-accent rounded">−</button>
        <button onClick={resetView} className="px-1.5 py-0.5 hover:bg-accent rounded ml-1">⟳</button>
        <label className="flex items-center gap-1 ml-2 cursor-pointer">
          <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} className="w-3 h-3" />Grid
        </label>
        <label className="flex items-center gap-1 ml-1 cursor-pointer">
          <input type="checkbox" checked={showDirectionArrows} onChange={(e) => setShowDirectionArrows(e.target.checked)} className="w-3 h-3" />Setas
        </label>
        <label className="flex items-center gap-1 ml-1 cursor-pointer">
          <input type="checkbox" checked={showGeoColors} onChange={(e) => setShowGeoColors(e.target.checked)} className="w-3 h-3" />Tipo
        </label>
        <span className="ml-2 text-muted-foreground">|</span>
        <span className="ml-1 text-muted-foreground">🎨</span>
        <select
          value={colorProfile}
          onChange={(e) => setColorProfile(e.target.value as typeof colorProfile)}
          className="ml-0.5 bg-accent/50 border border-border rounded px-2 py-0.5 text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {Object.entries(COLOR_PROFILES).map(([key, profile]) => (
            <option key={key} value={key}>{profile.label}</option>
          ))}
        </select>
      </div>

      {/* Pass layer indicator */}
      {activePassLayer !== null && (
        <div className="absolute top-2 right-2 z-10 bg-background/90 backdrop-blur rounded-md px-2 py-1 border border-border text-xs text-muted-foreground">
          Camada: {activePassLayer + 1}
        </div>
      )}

      {/* Drawing mode indicator */}
      {isDrawingMode && drawingTool !== "select" && (
        <div className="absolute bottom-2 left-2 z-10 bg-primary/90 text-primary-foreground backdrop-blur rounded-md px-3 py-1 text-xs font-medium">
          {drawingTool === "move" ? "🔄 Mover — arraste vetores selecionados" :
           drawingTool === "erase" ? "🗑️ Apagar — clique no vetor" :
           `✏️ Desenhando: ${drawingTool} — clique e arraste`}
        </div>
      )}

      {/* Rulers */}
      <div className="absolute top-0 left-8 right-0 h-5 bg-muted/80 border-b border-border flex items-end overflow-hidden z-[5]">
        {Array.from({ length: Math.ceil(vbW / gridSpacing) + 1 }).map((_, i) => (
          <span key={i} className="absolute text-[8px] text-muted-foreground" style={{ left: `${(i * gridSpacing / vbW) * 100}%` }}>{i * gridSpacing}</span>
        ))}
      </div>
      <div className="absolute top-5 left-0 bottom-0 w-5 bg-muted/80 border-r border-border overflow-hidden z-[5]">
        {Array.from({ length: Math.ceil(vbH / gridSpacing) + 1 }).map((_, i) => (
          <span key={i} className="absolute text-[8px] text-muted-foreground origin-top-left" style={{ top: `${(i * gridSpacing / vbH) * 100}%`, left: 2 }}>{i * gridSpacing}</span>
        ))}
      </div>

      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ cursor: getCursor() }}
        viewBox={`${-pan.x / zoom} ${-pan.y / zoom} ${vbW / zoom} ${vbH / zoom}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setIsPanning(false); setIsDrawing(false); setIsDragging(false); }}
        onClick={() => {
          if (!isDrawing && !isDragging) onSelectVector("", false);
        }}
      >
        {/* Material boundary */}
        <rect x={0} y={0} width={material.width} height={material.height}
          fill={cp.bg} stroke={cp.border} strokeWidth={1 / zoom} strokeDasharray={`${4 / zoom}`} />

        {/* Grid */}
        {showGrid && (
          <g opacity={0.15}>
            {Array.from({ length: Math.ceil(material.width / gridSpacing) }).map((_, i) => (
              <line key={`gx-${i}`} x1={(i + 1) * gridSpacing} y1={0} x2={(i + 1) * gridSpacing} y2={material.height} stroke={cp.grid} strokeWidth={0.5 / zoom} />
            ))}
            {Array.from({ length: Math.ceil(material.height / gridSpacing) }).map((_, i) => (
              <line key={`gy-${i}`} x1={0} y1={(i + 1) * gridSpacing} x2={material.width} y2={(i + 1) * gridSpacing} stroke={cp.grid} strokeWidth={0.5 / zoom} />
            ))}
          </g>
        )}

        {/* Zero origin */}
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
          {material.zeroOrigin === "top-left" && (
            <>
              <line x1={0} y1={0} x2={15 / zoom} y2={0} stroke="#ef4444" strokeWidth={2 / zoom} />
              <line x1={0} y1={0} x2={0} y2={15 / zoom} stroke="#22c55e" strokeWidth={2 / zoom} />
              <circle cx={0} cy={0} r={3 / zoom} fill="#f59e0b" />
            </>
          )}
        </g>

        {/* Vectors */}
        {vectors.map((v) => {
          const isSelected = selectedVectorIds.includes(v.id);
          const hasError = errorVectorIds.has(v.id);
          const geoColor = showGeoColors ? GEOMETRY_CLASS_COLORS[v.geometryClass] : (colorProfile === "default" ? v.color : cp.vector);
          const strokeColor = hasError ? "#ef4444" : isSelected ? cp.selected : geoColor;
          // Apply drag offset for selected vectors being moved
          const tx = isDragging && isSelected ? dragOffset.x : 0;
          const ty = isDragging && isSelected ? dragOffset.y : 0;

          return (
            <g key={v.id} transform={tx || ty ? `translate(${tx},${ty})` : undefined}>
              {hasError && (
                <path d={v.pathData} fill="none" stroke="#ef4444" strokeWidth={6 / zoom} opacity={0.3} />
              )}
              <path
                d={v.pathData}
                fill="none"
                stroke={strokeColor}
                strokeWidth={(isSelected ? 2.5 : hasError ? 2 : 1.5) / zoom}
                strokeDasharray={!v.closed ? `${4 / zoom}` : undefined}
                className="cursor-pointer hover:opacity-80"
                onClick={(e) => handleClickVector(e, v.id)}
              />
              {isSelected && (() => {
                const pts = extractPointsFromPath(v.pathData);
                if (pts.length === 0) return null;
                return <circle cx={pts[0][0]} cy={pts[0][1]} r={4 / zoom} fill="#22c55e" stroke="white" strokeWidth={1 / zoom} />;
              })()}
              {/* Bounding box for selected */}
              {isSelected && (
                <rect
                  x={v.boundingBox.x} y={v.boundingBox.y}
                  width={v.boundingBox.w} height={v.boundingBox.h}
                  fill="none" stroke={cp.selected} strokeWidth={0.5 / zoom}
                  strokeDasharray={`${3 / zoom}`} opacity={0.5}
                />
              )}
            </g>
          );
        })}

        {/* Drawing preview */}
        {isDrawing && drawStart && drawCurrent && (
          <g opacity={0.7}>
            {drawingTool === "line" && (
              <line x1={drawStart.x} y1={drawStart.y} x2={drawCurrent.x} y2={drawCurrent.y}
                stroke="#3b82f6" strokeWidth={1.5 / zoom} strokeDasharray={`${4 / zoom}`} />
            )}
            {drawingTool === "rectangle" && (
              <rect
                x={Math.min(drawStart.x, drawCurrent.x)} y={Math.min(drawStart.y, drawCurrent.y)}
                width={Math.abs(drawCurrent.x - drawStart.x)} height={Math.abs(drawCurrent.y - drawStart.y)}
                fill="none" stroke="#3b82f6" strokeWidth={1.5 / zoom} strokeDasharray={`${4 / zoom}`}
              />
            )}
            {drawingTool === "circle" && (() => {
              const cx = (drawStart.x + drawCurrent.x) / 2;
              const cy = (drawStart.y + drawCurrent.y) / 2;
              const rx = Math.abs(drawCurrent.x - drawStart.x) / 2;
              const ry = Math.abs(drawCurrent.y - drawStart.y) / 2;
              return <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
                fill="none" stroke="#3b82f6" strokeWidth={1.5 / zoom} strokeDasharray={`${4 / zoom}`} />;
            })()}
            {/* Dimensions label */}
            <text
              x={drawCurrent.x + 5 / zoom} y={drawCurrent.y - 5 / zoom}
              fontSize={10 / zoom} fill="#3b82f6" fontFamily="monospace"
            >
              {Math.abs(drawCurrent.x - drawStart.x).toFixed(1)} × {Math.abs(drawCurrent.y - drawStart.y).toFixed(1)}
            </text>
          </g>
        )}

        {/* Toolpath previews */}
        {operations.filter((op) => op.enabled && showToolpath[op.id] !== false).map((op) => {
          const tool = tools.find((t) => t.id === op.toolId);
          const isActive = op.id === activeOperationId;
          if (!tool) return null;
          const offset = op.cutSide === "outside" ? tool.diameter / 2 : op.cutSide === "inside" ? -tool.diameter / 2 : 0;

          const totalDepth = Math.abs(op.finalDepth - op.startDepth);
          const passes = Math.ceil(totalDepth / (op.depthPerPass || tool.depthPerPass || 1));
          if (activePassLayer !== null && activePassLayer >= passes) return null;

          const layerOpacity = activePassLayer !== null ? (isActive ? 1 : 0.15) : (isActive ? 1 : 0.4);

          return (
            <g key={`tp-${op.id}`} opacity={layerOpacity}>
              {op.vectorIds.map((vid) => {
                const v = vectors.find((vv) => vv.id === vid);
                if (!v) return null;
                return (
                  <g key={`tp-${op.id}-${vid}`}>
                    <path d={v.pathData} fill="none" stroke={isActive ? cp.toolpath : cp.toolpathInactive}
                      strokeWidth={(tool.diameter * 0.8) / zoom} strokeLinecap="round" strokeLinejoin="round" opacity={0.3}
                      transform={`translate(${offset}, 0)`} />
                    <path d={v.pathData} fill="none" stroke={isActive ? cp.toolpath : cp.toolpathInactive}
                      strokeWidth={1 / zoom} strokeDasharray={`${3 / zoom}`} transform={`translate(${offset}, 0)`} />
                    {showDirectionArrows && isActive && getArrowPoints(v.pathData, offset).map((arrow, ai) => (
                      <g key={`arrow-${ai}`} transform={`translate(${arrow.x},${arrow.y}) rotate(${arrow.angle})`}>
                        <polygon points={`0,${-3 / zoom} ${6 / zoom},0 0,${3 / zoom}`} fill={cp.toolpath} />
                      </g>
                    ))}
                    {isActive && (() => {
                      const pts = extractPointsFromPath(v.pathData);
                      if (pts.length === 0) return null;
                      return (
                        <g>
                          <circle cx={pts[0][0] + offset} cy={pts[0][1]} r={5 / zoom} fill="none" stroke="#22c55e" strokeWidth={2 / zoom} />
                          <circle cx={pts[0][0] + offset} cy={pts[0][1]} r={2 / zoom} fill="#22c55e" />
                        </g>
                      );
                    })()}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
