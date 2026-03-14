import { useMemo, useState, useRef, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Upload, Layers, RotateCcw, Eye } from "lucide-react";
import {
  parseGcodeLine, linearizeArc, segmentMove,
  type MeshConfig, type MeshInfo, type MeshPoint, type CncPos,
  fmt,
} from "@/lib/z-mapping-engine";

/* ── Types ── */
type ViewMode = "surface" | "compensated" | "surface+path" | "original+compensated";
type GcodeSource = "original" | "custom";

interface Props {
  originalGcode: string;
  mesh: MeshInfo;
  config: MeshConfig;
  onClose: () => void;
}

/* ── Synthetic surface ── */
function generateSyntheticSurface(mesh: MeshInfo): MeshPoint[] {
  return mesh.points.map((p) => {
    const nx = (p.x - mesh.points[0].x) / (mesh.actualSpacingX * (mesh.pointsPerRow - 1) || 1);
    const ny = (p.y - mesh.points[0].y) / (mesh.actualSpacingY * (mesh.rows - 1) || 1);
    const z = 0.05 * Math.sin(nx * Math.PI * 2) * Math.cos(ny * Math.PI * 1.5)
      + 0.03 * Math.sin(nx * 3 + ny * 2)
      + 0.02 * (nx - 0.5);
    return { ...p, z };
  });
}

/* ── Bilinear interpolation ── */
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
  if (!bl || !br || !tl || !tr || bl.z == null || br.z == null || tl.z == null || tr.z == null) return 0;
  const xFrac = colF - col0;
  const yFrac = rowF - row0;
  const left = bl.z + (tl.z - bl.z) * yFrac;
  const right = br.z + (tr.z - br.z) * yFrac;
  return left + (right - left) * xFrac;
}

/* ── Extract toolpath ── */
interface PathPt { x: number; y: number; z: number; zComp: number }

function extractToolpath(gcode: string, mesh: MeshInfo, probeData: MeshPoint[], cfg: MeshConfig): {
  path: PathPt[]; surfMin: number; surfMax: number;
} {
  const lines = gcode.split("\n");
  const path: PathPt[] = [];
  let curX = 0, curY = 0, curZ = 0, curG = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("(") || trimmed.startsWith(";") || trimmed.startsWith("%")) continue;
    const p = parseGcodeLine(trimmed);
    if (p.g !== undefined) curG = p.g;
    const newX = p.x ?? curX;
    const newY = p.y ?? curY;
    const newZ = p.z ?? curZ;

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

  let surfMin = Infinity, surfMax = -Infinity;
  for (const pt of probeData) {
    if (pt.z != null) {
      surfMin = Math.min(surfMin, pt.z);
      surfMax = Math.max(surfMax, pt.z);
    }
  }
  if (!isFinite(surfMin)) surfMin = 0;
  if (!isFinite(surfMax)) surfMax = 0;
  return { path, surfMin, surfMax };
}

/* ── Heatmap color ── */
function heatColor(t: number): THREE.Color {
  const r = t < 0.5 ? 0 : (t - 0.5) * 2;
  const g = t < 0.5 ? t * 2 : (1 - t) * 2;
  const b = t < 0.5 ? (1 - t * 2) : 0;
  return new THREE.Color(r, g, b);
}

/* ── 3D Surface mesh ── */
function SurfaceMesh({ mesh, probeData, config, surfMin, surfMax }: {
  mesh: MeshInfo; probeData: MeshPoint[]; config: MeshConfig; surfMin: number; surfMax: number;
}) {
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const cols = mesh.pointsPerRow;
    const rows = mesh.rows;
    const verts: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const range = surfMax - surfMin || 0.001;
    const zScale = Math.max(config.width, config.height) * 0.3;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const pt = probeData[idx];
        if (!pt) continue;
        const z = pt.z ?? 0;
        verts.push(pt.x - config.xStart, pt.y - config.yStart, z * zScale);
        const t = (z - surfMin) / range;
        const col = heatColor(Math.max(0, Math.min(1, t)));
        colors.push(col.r, col.g, col.b);
      }
    }

    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const i = r * cols + c;
        indices.push(i, i + 1, i + cols);
        indices.push(i + 1, i + cols + 1, i + cols);
      }
    }

    geom.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }, [mesh, probeData, config, surfMin, surfMax]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors transparent opacity={0.85} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ── Toolpath line ── */
function ToolpathLine({ path, config, surfMin, surfMax, compensated, color }: {
  path: PathPt[]; config: MeshConfig; surfMin: number; surfMax: number;
  compensated: boolean; color?: string;
}) {
  const { positions, colors: lineColors } = useMemo(() => {
    const pos: number[] = [];
    const cols: number[] = [];
    const zScale = Math.max(config.width, config.height) * 0.3;
    const range = surfMax - surfMin || 0.001;

    for (const pt of path) {
      const z = compensated ? pt.zComp : pt.z;
      pos.push(pt.x - config.xStart, pt.y - config.yStart, z * zScale);
      if (color) {
        const c = new THREE.Color(color);
        cols.push(c.r, c.g, c.b);
      } else {
        const t = Math.max(0, Math.min(1, ((compensated ? pt.zComp : pt.z) - surfMin) / range));
        const c = heatColor(t);
        cols.push(c.r, c.g, c.b);
      }
    }
    return { positions: new Float32Array(pos), colors: new Float32Array(cols) };
  }, [path, config, surfMin, surfMax, compensated, color]);

  const geom = useMemo(() => {
    if (path.length < 2) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(lineColors, 3));
    return g;
  }, [positions, lineColors, path.length]);

  if (!geom) return null;

  return (
    <line>
      <primitive object={geom} attach="geometry" />
      <lineBasicMaterial vertexColors linewidth={2} />
    </line>
  );
}

/* ── 3D Scene ── */
function SimScene({ mesh, probeData, config, path, surfMin, surfMax, viewMode }: {
  mesh: MeshInfo; probeData: MeshPoint[]; config: MeshConfig;
  path: PathPt[]; surfMin: number; surfMax: number; viewMode: ViewMode;
}) {
  const showSurface = viewMode === "surface" || viewMode === "surface+path";
  const showCompensated = viewMode === "compensated" || viewMode === "surface+path" || viewMode === "original+compensated";
  const showOriginal = viewMode === "original+compensated";

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[config.width, config.height, config.width]} intensity={0.8} />
      <pointLight position={[config.width / 2, config.height / 2, 20]} intensity={0.3} />

      {showSurface && (
        <SurfaceMesh mesh={mesh} probeData={probeData} config={config} surfMin={surfMin} surfMax={surfMax} />
      )}
      {showOriginal && (
        <ToolpathLine path={path} config={config} surfMin={surfMin} surfMax={surfMax} compensated={false} color="rgba(255,255,255,0.4)" />
      )}
      {showCompensated && (
        <ToolpathLine path={path} config={config} surfMin={surfMin} surfMax={surfMax} compensated />
      )}

      <gridHelper
        args={[Math.max(config.width, config.height) * 1.2, 20, "#333", "#222"]}
        rotation={[Math.PI / 2, 0, 0]}
        position={[config.width / 2, config.height / 2, -0.01]}
      />
      <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
    </>
  );
}

/* ── Color scale SVG ── */
function ColorScale({ min, max, unit }: { min: number; max: number; unit: string }) {
  const steps = 10;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[9px] text-muted-foreground">{fmt(max, 4)} {unit}</span>
      <div className="w-4 h-32 rounded-sm overflow-hidden flex flex-col">
        {Array.from({ length: steps }).map((_, i) => {
          const t = 1 - i / (steps - 1);
          const c = heatColor(t);
          return <div key={i} className="flex-1" style={{ backgroundColor: `rgb(${c.r * 255},${c.g * 255},${c.b * 255})` }} />;
        })}
      </div>
      <span className="text-[9px] text-muted-foreground">{fmt(min, 4)} {unit}</span>
    </div>
  );
}

/* ── Main component ── */
export function CompensationSimulator3D({ originalGcode, mesh, config, onClose }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("surface+path");
  const [gcodeSource, setGcodeSource] = useState<GcodeSource>("original");
  const [customGcode, setCustomGcode] = useState("");
  const [customFileName, setCustomFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const activeGcode = gcodeSource === "custom" && customGcode ? customGcode : originalGcode;

  const probeData = useMemo(() => generateSyntheticSurface(mesh), [mesh]);
  const { path, surfMin, surfMax } = useMemo(
    () => extractToolpath(activeGcode, mesh, probeData, config),
    [activeGcode, mesh, probeData, config]
  );
  const surfRange = surfMax - surfMin;

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCustomGcode(ev.target?.result as string);
      setGcodeSource("custom");
    };
    reader.readAsText(file);
  }, []);

  const viewLabels: Record<ViewMode, string> = {
    surface: "Superfície 3D",
    compensated: "Percurso compensado",
    "surface+path": "Superfície + percurso",
    "original+compensated": "Original + compensado",
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" /> Simulação 3D da Compensação
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Visualize em 3D como a ferramenta irá subir e descer para acompanhar a superfície medida.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* View mode + G-code source */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Modo de visualização</Label>
            <div className="flex gap-1 flex-wrap">
              {(Object.keys(viewLabels) as ViewMode[]).map((m) => (
                <Button key={m} variant={viewMode === m ? "secondary" : "ghost"} size="sm" className="text-[11px] h-7 px-2"
                  onClick={() => setViewMode(m)}>
                  {viewLabels[m]}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">G-code para simulação</Label>
            <div className="flex items-center gap-2">
              <Button variant={gcodeSource === "original" ? "secondary" : "ghost"} size="sm" className="text-[11px] h-7"
                onClick={() => setGcodeSource("original")}>
                Original
              </Button>
              <Button variant={gcodeSource === "custom" ? "secondary" : "ghost"} size="sm" className="text-[11px] h-7 gap-1"
                onClick={() => fileRef.current?.click()}>
                <Upload className="h-3 w-3" /> Importar arquivo
              </Button>
              <input ref={fileRef} type="file" accept=".nc,.tap,.gcode,.txt" className="hidden" onChange={handleFileUpload} />
              {customFileName && gcodeSource === "custom" && (
                <Badge variant="outline" className="text-[10px]">{customFileName}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* 3D Canvas + Color scale */}
        <div className="relative rounded-lg overflow-hidden border border-border/50 bg-[#0a0a14]">
          <div className="flex">
            <div className="flex-1" style={{ height: 420 }}>
              <Canvas camera={{
                position: [config.width * 0.8, -config.height * 0.6, config.width * 0.8],
                fov: 50, near: 0.01, far: 10000,
              }}>
                <SimScene mesh={mesh} probeData={probeData} config={config}
                  path={path} surfMin={surfMin} surfMax={surfMax} viewMode={viewMode} />
              </Canvas>
            </div>
            <div className="flex items-center pr-3">
              <ColorScale min={surfMin} max={surfMax} unit={config.unit} />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-lg bg-muted/50 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Mínimo</p>
            <p className="text-sm font-semibold" style={{ color: "rgb(0,0,255)" }}>{fmt(surfMin, 4)} {config.unit}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Máximo</p>
            <p className="text-sm font-semibold" style={{ color: "rgb(255,0,0)" }}>{fmt(surfMax, 4)} {config.unit}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Variação</p>
            <p className="text-sm font-semibold text-foreground">{fmt(surfRange, 4)} {config.unit}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pontos da malha</p>
            <p className="text-sm font-semibold text-foreground">{mesh.totalPoints}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Segmentos simulados</p>
            <p className="text-sm font-semibold text-foreground">{path.length}</p>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center italic">
          * Superfície simulada para demonstração. Os valores reais serão medidos pela CNC durante o nivelamento.
        </p>
      </CardContent>
    </Card>
  );
}
