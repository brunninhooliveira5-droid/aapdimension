import { useRef, useState, useCallback } from "react";
import type { SvgVector, MaterialConfig, ToolpathOperation, CncTool } from "@/lib/toolpath-engine";
import { extractPointsFromPath, GEOMETRY_CLASS_COLORS, type ValidationIssue } from "@/lib/toolpath-engine";

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
}: SvgCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [showDirectionArrows, setShowDirectionArrows] = useState(true);
  const [showGeoColors, setShowGeoColors] = useState(true);
  const [colorProfile, setColorProfile] = useState<"default" | "dark" | "light" | "blueprint" | "highContrast">("default");

  const COLOR_PROFILES = {
    default: { bg: "hsl(var(--card))", grid: "hsl(var(--foreground))", border: "hsl(var(--border))", vector: "#3b82f6", selected: "hsl(var(--primary))", toolpath: "#f59e0b", toolpathInactive: "#64748b", label: "Padrão" },
    dark: { bg: "#1a1a2e", grid: "#334155", border: "#334155", vector: "#60a5fa", selected: "#818cf8", toolpath: "#fbbf24", toolpathInactive: "#475569", label: "Escuro" },
    light: { bg: "#ffffff", grid: "#e2e8f0", border: "#cbd5e1", vector: "#2563eb", selected: "#7c3aed", toolpath: "#d97706", toolpathInactive: "#94a3b8", label: "Claro" },
    blueprint: { bg: "#0a1628", grid: "#1e3a5f", border: "#1e3a5f", vector: "#38bdf8", selected: "#22d3ee", toolpath: "#facc15", toolpathInactive: "#3b82f6", label: "Blueprint" },
    highContrast: { bg: "#000000", grid: "#333333", border: "#444444", vector: "#00ff00", selected: "#ff00ff", toolpath: "#ffff00", toolpathInactive: "#888888", label: "Alto Contraste" },
  };
  const cp = COLOR_PROFILES[colorProfile];

  const errorVectorIds = new Set(issues.filter((i) => i.severity === "error" && i.vectorId).map((i) => i.vectorId));

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

  const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  const vbParts = viewBox.split(/\s+/).map(Number);
  const vbW = vbParts[2] || material.width;
  const vbH = vbParts[3] || material.height;
  const gridSpacing = material.unit === "mm" ? 10 : 25.4;

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
        <select
          value={colorProfile}
          onChange={(e) => setColorProfile(e.target.value as typeof colorProfile)}
          className="ml-1 bg-transparent border border-border rounded px-1.5 py-0.5 text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
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
        <rect x={0} y={0} width={material.width} height={material.height}
          fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth={1 / zoom} strokeDasharray={`${4 / zoom}`} />

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
          const geoColor = showGeoColors ? GEOMETRY_CLASS_COLORS[v.geometryClass] : v.color;
          const strokeColor = hasError ? "#ef4444" : isSelected ? "hsl(var(--primary))" : geoColor;

          return (
            <g key={v.id}>
              {/* Error highlight glow */}
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
              {/* Start point */}
              {isSelected && (() => {
                const pts = extractPointsFromPath(v.pathData);
                if (pts.length === 0) return null;
                return <circle cx={pts[0][0]} cy={pts[0][1]} r={4 / zoom} fill="#22c55e" stroke="white" strokeWidth={1 / zoom} />;
              })()}
            </g>
          );
        })}

        {/* Toolpath previews */}
        {operations.filter((op) => op.enabled && showToolpath[op.id] !== false).map((op) => {
          const tool = tools.find((t) => t.id === op.toolId);
          const isActive = op.id === activeOperationId;
          if (!tool) return null;
          const offset = op.cutSide === "outside" ? tool.diameter / 2 : op.cutSide === "inside" ? -tool.diameter / 2 : 0;

          // If layer filter active, compute passes and only show relevant
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
                    <path d={v.pathData} fill="none" stroke={isActive ? "#f59e0b" : "#94a3b8"}
                      strokeWidth={(tool.diameter * 0.8) / zoom} strokeLinecap="round" strokeLinejoin="round" opacity={0.3}
                      transform={`translate(${offset}, 0)`} />
                    <path d={v.pathData} fill="none" stroke={isActive ? "#f59e0b" : "#64748b"}
                      strokeWidth={1 / zoom} strokeDasharray={`${3 / zoom}`} transform={`translate(${offset}, 0)`} />
                    {showDirectionArrows && isActive && getArrowPoints(v.pathData, offset).map((arrow, ai) => (
                      <g key={`arrow-${ai}`} transform={`translate(${arrow.x},${arrow.y}) rotate(${arrow.angle})`}>
                        <polygon points={`0,${-3 / zoom} ${6 / zoom},0 0,${3 / zoom}`} fill="#f59e0b" />
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
