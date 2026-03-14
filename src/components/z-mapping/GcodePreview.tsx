import { useRef, useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import {
  parseGcodeLine, linearizeArc, segmentMove,
  type MeshInfo, type MeshConfig, type CncPos,
} from "@/lib/z-mapping-engine";

interface Props {
  originalGcode: string;
  mesh: MeshInfo | null;
  config: MeshConfig;
  /** Bounding box from analysis */
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

interface PathSeg { x: number; y: number; z: number; rapid: boolean }

function extractPaths(gcode: string, arcSegLen: number): PathSeg[] {
  const lines = gcode.split("\n");
  const path: PathSeg[] = [];
  let curX = 0, curY = 0, curZ = 0, curG = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("(") || trimmed.startsWith(";") || trimmed.startsWith("%")) continue;
    const p = parseGcodeLine(trimmed);
    if (p.g !== undefined) curG = p.g;

    const newX = p.x ?? curX;
    const newY = p.y ?? curY;
    const newZ = p.z ?? curZ;

    if ((p.g === 2 || p.g === 3)) {
      const from: CncPos = { x: curX, y: curY, z: curZ };
      const to: CncPos = { x: newX, y: newY, z: newZ };
      const arcPts = linearizeArc(from, to, p.i ?? 0, p.j ?? 0, p.g === 2, arcSegLen);
      for (const ap of arcPts) {
        path.push({ x: ap.x, y: ap.y, z: ap.z, rapid: false });
      }
      curX = newX; curY = newY; curZ = newZ;
      continue;
    }

    if (p.x !== undefined || p.y !== undefined || p.z !== undefined) {
      const rapid = curG === 0;
      path.push({ x: newX, y: newY, z: newZ, rapid });
    }

    curX = newX; curY = newY; curZ = newZ;
  }
  return path;
}

export function GcodePreview({ originalGcode, mesh, config, xMin, yMin, xMax, yMax }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  const resetView = useCallback(() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }, []);

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

    // Background
    ctx.fillStyle = "#0c0c14";
    ctx.fillRect(0, 0, W, H);

    const pad = 30;
    const areaW = W - pad * 2;
    const areaH = H - pad * 2;

    // Compute bounds - use mesh area if available, else gcode bounds
    const bx0 = mesh ? config.xStart : xMin;
    const by0 = mesh ? config.yStart : yMin;
    const bw = mesh ? config.width : (xMax - xMin || 1);
    const bh = mesh ? config.height : (yMax - yMin || 1);

    const scaleX = areaW / (bw || 1);
    const scaleY = areaH / (bh || 1);
    const scale = Math.min(scaleX, scaleY) * zoom;

    const cx = W / 2 + panOffset.x;
    const cy = H / 2 + panOffset.y;
    const ox = cx - (bw / 2) * scale;
    const oy = cy + (bh / 2) * scale;

    const toSX = (x: number) => ox + (x - bx0) * scale;
    const toSY = (y: number) => oy - (y - by0) * scale;

    // Draw mesh area boundary
    if (mesh) {
      ctx.strokeStyle = "rgba(59,130,246,0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      const mx0 = toSX(config.xStart);
      const my0 = toSY(config.yStart + config.height);
      const mw = config.width * scale;
      const mh = config.height * scale;
      ctx.strokeRect(mx0, my0, mw, mh);
      ctx.setLineDash([]);

      // Draw grid lines
      ctx.strokeStyle = "rgba(59,130,246,0.12)";
      ctx.lineWidth = 0.5;
      for (let r = 0; r < mesh.rows; r++) {
        const y = toSY(config.yStart + r * mesh.actualSpacingY);
        ctx.beginPath(); ctx.moveTo(mx0, y); ctx.lineTo(mx0 + mw, y); ctx.stroke();
      }
      for (let c = 0; c < mesh.pointsPerRow; c++) {
        const x = toSX(config.xStart + c * mesh.actualSpacingX);
        ctx.beginPath(); ctx.moveTo(x, my0); ctx.lineTo(x, my0 + mh); ctx.stroke();
      }

      // Draw grid points
      ctx.fillStyle = "rgba(59,130,246,0.5)";
      for (const pt of mesh.points) {
        ctx.beginPath();
        ctx.arc(toSX(pt.x), toSY(pt.y), 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw toolpath
    const path = extractPaths(originalGcode, config.arcSegmentLen);
    if (path.length > 1) {
      for (let i = 1; i < path.length; i++) {
        const p0 = path[i - 1];
        const p1 = path[i];

        if (p1.rapid) continue; // skip rapids

        // Check if outside mesh
        let outOfMesh = false;
        if (mesh) {
          const ex = config.xStart + config.width;
          const ey = config.yStart + config.height;
          if (p1.x < config.xStart - 0.01 || p1.x > ex + 0.01 ||
              p1.y < config.yStart - 0.01 || p1.y > ey + 0.01) {
            outOfMesh = true;
          }
        }

        if (p1.z < 0) {
          ctx.strokeStyle = outOfMesh ? "rgba(239,68,68,0.8)" : "rgba(16,185,129,0.75)";
          ctx.lineWidth = 1.2;
        } else {
          ctx.strokeStyle = "rgba(255,255,255,0.08)";
          ctx.lineWidth = 0.5;
        }
        ctx.beginPath();
        ctx.moveTo(toSX(p0.x), toSY(p0.y));
        ctx.lineTo(toSX(p1.x), toSY(p1.y));
        ctx.stroke();
      }
    }

    // Draw work area border
    ctx.strokeStyle = "rgba(16,185,129,0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    const wx0 = toSX(xMin);
    const wy0 = toSY(yMax);
    const ww = (xMax - xMin) * scale;
    const wh = (yMax - yMin) * scale;
    ctx.strokeRect(wx0, wy0, ww, wh);
    ctx.setLineDash([]);

  }, [originalGcode, mesh, config, zoom, panOffset, xMin, yMin, xMax, yMax]);

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
    setZoom(z => Math.max(0.3, Math.min(8, z - e.deltaY * 0.001)));
  }, []);

  return (
    <div className="relative rounded-lg overflow-hidden border border-border/50">
      <canvas
        ref={canvasRef}
        className="w-full cursor-grab active:cursor-grabbing"
        style={{ height: 300 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      <div className="absolute top-2 left-2 flex gap-1">
        <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(8, z * 1.3))}>
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.3, z / 1.3))}>
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button variant="secondary" size="icon" className="h-7 w-7" onClick={resetView}>
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="absolute bottom-2 right-2 flex gap-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-emerald-500 inline-block rounded" /> Corte</span>
        {mesh && <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-blue-500 inline-block rounded" /> Grade</span>}
        <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-red-500 inline-block rounded" /> Fora da grade</span>
      </div>
    </div>
  );
}
