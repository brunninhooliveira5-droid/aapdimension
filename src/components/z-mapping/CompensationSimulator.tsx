import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ZoomIn, ZoomOut, RotateCcw, Layers } from "lucide-react";
import {
  parseGcodeLine, linearizeArc, segmentMove,
  type MeshConfig, type MeshInfo, type MeshPoint, type CncPos,
  fmt,
} from "@/lib/z-mapping-engine";

interface Props {
  originalGcode: string;
  mesh: MeshInfo;
  config: MeshConfig;
  onClose: () => void;
}

/* ── Generate synthetic surface data for simulation ── */
function generateSyntheticSurface(mesh: MeshInfo): MeshPoint[] {
  return mesh.points.map((p) => {
    // Create a gentle wave-like surface for demonstration
    const nx = (p.x - mesh.points[0].x) / (mesh.actualSpacingX * (mesh.pointsPerRow - 1) || 1);
    const ny = (p.y - mesh.points[0].y) / (mesh.actualSpacingY * (mesh.rows - 1) || 1);
    const z = 0.05 * Math.sin(nx * Math.PI * 2) * Math.cos(ny * Math.PI * 1.5)
      + 0.03 * Math.sin(nx * 3 + ny * 2)
      + 0.02 * (nx - 0.5);
    return { ...p, z };
  });
}

/* ── Bilinear interpolation (duplicated locally for perf) ── */
function bilinearZ(x: number, y: number, mesh: MeshInfo, data: MeshPoint[], cfg: MeshConfig): number {
  const xEnd = cfg.xStart + cfg.width;
  const yEnd = cfg.yStart + cfg.height;
  const px = Math.max(cfg.xStart, Math.min(xEnd, x));
  const py = Math.max(cfg.yStart, Math.min(yEnd, y));

  const colF = (px - cfg.xStart) / mesh.actualSpacingX;
  const rowF = (py - cfg.yStart) / mesh.actualSpacingY;
  const col0 = Math.min(Math.floor(colF), mesh.pointsPerRow - 2);
  const row0 = Math.min(Math.floor(rowF), mesh.rows - 2);

  const bl = data[row0 * mesh.pointsPerRow + col0];
  const br = data[row0 * mesh.pointsPerRow + col0 + 1];
  const tl = data[(row0 + 1) * mesh.pointsPerRow + col0];
  const tr = data[(row0 + 1) * mesh.pointsPerRow + col0 + 1];

  if (bl.z == null || br.z == null || tl.z == null || tr.z == null) return 0;

  const xFrac = colF - col0;
  const yFrac = rowF - row0;
  const left = bl.z + (tl.z - bl.z) * yFrac;
  const right = br.z + (tr.z - br.z) * yFrac;
  return left + (right - left) * xFrac;
}

/* ── Extract toolpath from G-code ── */
interface PathPoint { x: number; y: number; z: number; zComp: number }

function extractToolpath(
  gcode: string, mesh: MeshInfo, probeData: MeshPoint[], cfg: MeshConfig
): { path: PathPoint[]; zMin: number; zMax: number; surfMin: number; surfMax: number } {
  const lines = gcode.split("\n");
  const path: PathPoint[] = [];
  let curX = 0, curY = 0, curZ = 0, curG = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("(") || trimmed.startsWith(";") || trimmed.startsWith("%")) continue;

    const p = parseGcodeLine(trimmed);
    if (p.g !== undefined) curG = p.g;

    const newX = p.x ?? curX;
    const newY = p.y ?? curY;
    const newZ = p.z ?? curZ;

    // Handle arcs
    if ((p.g === 2 || p.g === 3) && newZ < 0) {
      const from: CncPos = { x: curX, y: curY, z: curZ };
      const to: CncPos = { x: newX, y: newY, z: newZ };
      const arcPts = linearizeArc(from, to, p.i ?? 0, p.j ?? 0, p.g === 2, cfg.arcSegmentLen);
      let prev = from;
      for (const ap of arcPts) {
        const segs = segmentMove(prev, ap, 1);
        for (const s of segs) {
          const offset = bilinearZ(s.x, s.y, mesh, probeData, cfg);
          path.push({ x: s.x, y: s.y, z: s.z, zComp: s.z + offset });
        }
        prev = ap;
      }
      curX = newX; curY = newY; curZ = newZ;
      continue;
    }

    // Handle linear moves with Z < 0
    if (curG === 1 && newZ < 0 && (p.x !== undefined || p.y !== undefined || p.z !== undefined)) {
      const from: CncPos = { x: curX, y: curY, z: curZ };
      const to: CncPos = { x: newX, y: newY, z: newZ };
      const segs = segmentMove(from, to, 1);
      for (const s of segs) {
        const offset = bilinearZ(s.x, s.y, mesh, probeData, cfg);
        path.push({ x: s.x, y: s.y, z: s.z, zComp: s.z + offset });
      }
    }

    curX = newX; curY = newY; curZ = newZ;
  }

  let zMin = Infinity, zMax = -Infinity;
  let surfMin = Infinity, surfMax = -Infinity;
  for (const pt of probeData) {
    if (pt.z != null) {
      surfMin = Math.min(surfMin, pt.z);
      surfMax = Math.max(surfMax, pt.z);
    }
  }
  for (const pt of path) {
    zMin = Math.min(zMin, pt.zComp);
    zMax = Math.max(zMax, pt.zComp);
  }
  if (!isFinite(surfMin)) surfMin = 0;
  if (!isFinite(surfMax)) surfMax = 0;
  if (!isFinite(zMin)) zMin = 0;
  if (!isFinite(zMax)) zMax = 0;

  return { path, zMin, zMax, surfMin, surfMax };
}

/* ── Color helpers ── */
function heatColor(t: number): string {
  // blue → green → red
  const r = t < 0.5 ? 0 : Math.round((t - 0.5) * 2 * 255);
  const g = t < 0.5 ? Math.round(t * 2 * 255) : Math.round((1 - t) * 2 * 255);
  const b = t < 0.5 ? Math.round((1 - t * 2) * 255) : 0;
  return `rgb(${r},${g},${b})`;
}

function pathColor(z: number, zMin: number, zMax: number): string {
  const range = zMax - zMin;
  if (range === 0) return "hsl(200, 80%, 60%)";
  const t = (z - zMin) / range;
  return heatColor(t);
}

export function CompensationSimulator({ originalGcode, mesh, config, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"simple" | "technical">("simple");
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  const probeData = useMemo(() => generateSyntheticSurface(mesh), [mesh]);

  const { path, zMin, zMax, surfMin, surfMax } = useMemo(
    () => extractToolpath(originalGcode, mesh, probeData, config),
    [originalGcode, mesh, probeData, config]
  );

  const surfRange = surfMax - surfMin;

  const resetView = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, W, H);

    const pad = 40;
    const areaW = W - pad * 2;
    const areaH = H - pad * 2;

    const scaleX = areaW / (config.width || 1);
    const scaleY = areaH / (config.height || 1);
    const scale = Math.min(scaleX, scaleY) * zoom;

    const cx = W / 2 + panOffset.x;
    const cy = H / 2 + panOffset.y;
    const ox = cx - (config.width / 2) * scale;
    const oy = cy + (config.height / 2) * scale; // Y inverted

    const toScreenX = (x: number) => ox + (x - config.xStart) * scale;
    const toScreenY = (y: number) => oy - (y - config.yStart) * scale;

    // Draw heatmap cells
    for (let r = 0; r < mesh.rows - 1; r++) {
      for (let c = 0; c < mesh.pointsPerRow - 1; c++) {
        const idx = r * mesh.pointsPerRow + c;
        const pt = probeData[idx];
        if (pt.z == null) continue;
        const t = surfRange > 0 ? (pt.z - surfMin) / surfRange : 0.5;

        const sx = toScreenX(pt.x);
        const sy = toScreenY(pt.y + mesh.actualSpacingY);
        const sw = mesh.actualSpacingX * scale;
        const sh = mesh.actualSpacingY * scale;

        ctx.fillStyle = heatColor(t);
        ctx.globalAlpha = 0.35;
        ctx.fillRect(sx, sy, sw, sh);
      }
    }
    ctx.globalAlpha = 1;

    // Draw grid points
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    for (const pt of mesh.points) {
      const sx = toScreenX(pt.x);
      const sy = toScreenY(pt.y);
      ctx.beginPath();
      ctx.arc(sx, sy, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw toolpath
    if (path.length > 1) {
      if (mode === "simple") {
        // Color-coded lines by compensated Z
        for (let i = 1; i < path.length; i++) {
          const p0 = path[i - 1];
          const p1 = path[i];
          ctx.strokeStyle = pathColor(p1.zComp, zMin, zMax);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(toScreenX(p0.x), toScreenY(p0.y));
          ctx.lineTo(toScreenX(p1.x), toScreenY(p1.y));
          ctx.stroke();
        }
      } else {
        // Technical: simulate 3D by offsetting Y based on Z
        const zScale = Math.min(areaH * 0.3, 80);
        const zRange = zMax - zMin || 1;

        // Draw original path (faded)
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < path.length; i++) {
          const p = path[i];
          const sx = toScreenX(p.x);
          const sy = toScreenY(p.y);
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();

        // Draw compensated path with Z offset
        for (let i = 1; i < path.length; i++) {
          const p0 = path[i - 1];
          const p1 = path[i];
          const yOff0 = ((p0.zComp - zMin) / zRange) * zScale;
          const yOff1 = ((p1.zComp - zMin) / zRange) * zScale;
          ctx.strokeStyle = pathColor(p1.zComp, zMin, zMax);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(toScreenX(p0.x), toScreenY(p0.y) - yOff0);
          ctx.lineTo(toScreenX(p1.x), toScreenY(p1.y) - yOff1);
          ctx.stroke();
        }
      }
    }

    // Color scale legend
    const legendX = W - 30;
    const legendH = H - pad * 2;
    const legendY = pad;
    for (let i = 0; i < legendH; i++) {
      const t = 1 - i / legendH;
      ctx.fillStyle = heatColor(t);
      ctx.fillRect(legendX, legendY + i, 14, 1);
    }
    ctx.fillStyle = "#fff";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(fmt(surfMax, 3), legendX - 32, legendY + 8);
    ctx.fillText(fmt(surfMin, 3), legendX - 32, legendY + legendH);
    ctx.fillText("mm", legendX - 10, legendY + legendH + 14);

  }, [path, mesh, probeData, config, mode, zoom, panOffset, zMin, zMax, surfMin, surfMax, surfRange]);

  // Mouse handlers for pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsPanning(true);
    panStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  }, [panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanOffset({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.3, Math.min(5, z - e.deltaY * 0.001)));
  }, []);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" /> Simulação da compensação
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant={mode === "simple" ? "secondary" : "ghost"} size="sm" className="text-xs h-7"
              onClick={() => setMode("simple")}>Simples</Button>
            <Button variant={mode === "technical" ? "secondary" : "ghost"} size="sm" className="text-xs h-7"
              onClick={() => setMode("technical")}>Técnico</Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Este gráfico mostra como a ferramenta irá subir ou descer para compensar irregularidades da superfície.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative rounded-lg overflow-hidden border border-border/50">
          <canvas
            ref={canvasRef}
            className="w-full cursor-grab active:cursor-grabbing"
            style={{ height: 360 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />
          {/* Controls overlay */}
          <div className="absolute top-2 left-2 flex gap-1">
            <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(5, z * 1.3))}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.3, z / 1.3))}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button variant="secondary" size="icon" className="h-7 w-7" onClick={resetView}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/50 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Mínimo</p>
            <p className="text-sm font-semibold" style={{ color: heatColor(0) }}>{fmt(surfMin, 4)} {config.unit}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Máximo</p>
            <p className="text-sm font-semibold" style={{ color: heatColor(1) }}>{fmt(surfMax, 4)} {config.unit}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Variação</p>
            <p className="text-sm font-semibold text-foreground">{fmt(surfRange, 4)} {config.unit}</p>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center italic">
          * Superfície simulada para demonstração. Os valores reais serão medidos pela CNC durante o nivelamento.
        </p>
      </CardContent>
    </Card>
  );
}
