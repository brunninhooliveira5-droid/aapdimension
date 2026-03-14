import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  X, Upload, Layers, RotateCcw, Play, Pause, Eye, EyeOff,
  Crosshair, ArrowUp, Box,
} from "lucide-react";
import {
  parseGcodeLine, linearizeArc, segmentMove,
  type MeshConfig, type MeshInfo, type MeshPoint, type CncPos,
  fmt,
} from "@/lib/z-mapping-engine";

/* ── Types ── */
type GcodeSource = "original" | "custom";

interface VbitSettings {
  enabled: boolean;
  angle: number;
  nominalDepth: number;
  compMode: "off" | "basic" | "advanced";
}

interface Props {
  originalGcode: string;
  mesh: MeshInfo;
  config: MeshConfig;
  onClose: () => void;
  vbitSettings?: VbitSettings;
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

/* ── Compute surface slope at a point ── */
function surfaceSlope(x: number, y: number, mesh: MeshInfo, data: MeshPoint[], cfg: MeshConfig): number {
  const dx = mesh.actualSpacingX * 0.1;
  const dy = mesh.actualSpacingY * 0.1;
  const z0 = bilinearZ(x, y, mesh, data, cfg);
  const zx = bilinearZ(x + dx, y, mesh, data, cfg);
  const zy = bilinearZ(x, y + dy, mesh, data, cfg);
  const dzdx = (zx - z0) / dx;
  const dzdy = (zy - z0) / dy;
  return Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)); // radians
}

function extractToolpath(gcode: string, mesh: MeshInfo, probeData: MeshPoint[], cfg: MeshConfig, vbit?: VbitSettings): {
  path: PathPt[]; surfMin: number; surfMax: number; maxSlopeDeg: number;
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
          let zComp = s.z + offset;
          // V-bit depth compensation for cutting moves (Z < 0)
          if (vbit?.enabled && vbit.compMode !== "off" && s.z < 0) {
            if (vbit.compMode === "advanced") {
              const slope = surfaceSlope(s.x, s.y, mesh, probeData, cfg);
              const cosSlope = Math.cos(slope);
              const adjDepth = cosSlope > 0.01 ? vbit.nominalDepth / cosSlope : vbit.nominalDepth;
              zComp = offset - adjDepth;
            } else {
              zComp = offset - vbit.nominalDepth;
            }
          }
          path.push({ x: s.x, y: s.y, z: s.z, zComp });
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
        let zComp = s.z + offset;
        if (vbit?.enabled && vbit.compMode !== "off" && s.z < 0) {
          if (vbit.compMode === "advanced") {
            const slope = surfaceSlope(s.x, s.y, mesh, probeData, cfg);
            const cosSlope = Math.cos(slope);
            const adjDepth = cosSlope > 0.01 ? vbit.nominalDepth / cosSlope : vbit.nominalDepth;
            zComp = offset - adjDepth;
          } else {
            zComp = offset - vbit.nominalDepth;
          }
        }
        path.push({ x: s.x, y: s.y, z: s.z, zComp });
      }
    }
    curX = newX; curY = newY; curZ = newZ;
  }

  let surfMin = Infinity, surfMax = -Infinity;
  let maxSlopeDeg = 0;
  for (const pt of probeData) {
    if (pt.z != null) {
      surfMin = Math.min(surfMin, pt.z);
      surfMax = Math.max(surfMax, pt.z);
    }
  }
  // Compute max slope across surface
  for (let r = 0; r < mesh.rows; r++) {
    for (let c = 0; c < mesh.pointsPerRow; c++) {
      const p2 = probeData[r * mesh.pointsPerRow + c];
      if (p2) {
        const slope = surfaceSlope(p2.x, p2.y, mesh, probeData, cfg);
        maxSlopeDeg = Math.max(maxSlopeDeg, slope * 180 / Math.PI);
      }
    }
  }
  if (!isFinite(surfMin)) surfMin = 0;
  if (!isFinite(surfMax)) surfMax = 0;
  return { path, surfMin, surfMax, maxSlopeDeg };
}

/* ── Professional 5-stop heatmap: dark blue → cyan → green → yellow → red ── */
function heatColor(t: number): THREE.Color {
  const stops = [
    { t: 0.0, r: 0.05, g: 0.1, b: 0.6 },   // dark blue
    { t: 0.25, r: 0.1, g: 0.55, b: 0.85 },  // cyan
    { t: 0.5, r: 0.15, g: 0.75, b: 0.3 },   // green
    { t: 0.75, r: 0.95, g: 0.85, b: 0.15 },  // yellow
    { t: 1.0, r: 0.9, g: 0.15, b: 0.1 },    // red
  ];
  const clamped = Math.max(0, Math.min(1, t));
  let i = 0;
  for (; i < stops.length - 2; i++) {
    if (clamped <= stops[i + 1].t) break;
  }
  const s0 = stops[i], s1 = stops[i + 1];
  const f = (clamped - s0.t) / (s1.t - s0.t);
  return new THREE.Color(
    s0.r + (s1.r - s0.r) * f,
    s0.g + (s1.g - s0.g) * f,
    s0.b + (s1.b - s0.b) * f,
  );
}

function heatColorCSS(t: number): string {
  const c = heatColor(t);
  return `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
}

/* ── Subdivided surface for smooth terrain ── */
function SurfaceMesh({ mesh, probeData, config, surfMin, surfMax }: {
  mesh: MeshInfo; probeData: MeshPoint[]; config: MeshConfig; surfMin: number; surfMax: number;
}) {
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const cols = mesh.pointsPerRow;
    const rows = mesh.rows;
    const range = surfMax - surfMin || 0.001;
    const zScale = Math.max(config.width, config.height) * 0.4;

    // Subdivide for smoother surface (2x)
    const subDiv = 2;
    const subCols = (cols - 1) * subDiv + 1;
    const subRows = (rows - 1) * subDiv + 1;
    const verts: number[] = [];
    const colors: number[] = [];

    for (let sr = 0; sr < subRows; sr++) {
      for (let sc = 0; sc < subCols; sc++) {
        const fx = sc / (subCols - 1);
        const fy = sr / (subRows - 1);
        const x = config.xStart + fx * config.width;
        const y = config.yStart + fy * config.height;
        const z = bilinearZ(x, y, mesh, probeData, config);
        verts.push(x - config.xStart, y - config.yStart, z * zScale);
        const t = (z - surfMin) / range;
        const col = heatColor(t);
        colors.push(col.r, col.g, col.b);
      }
    }

    const indices: number[] = [];
    for (let r = 0; r < subRows - 1; r++) {
      for (let c = 0; c < subCols - 1; c++) {
        const i = r * subCols + c;
        indices.push(i, i + 1, i + subCols);
        indices.push(i + 1, i + subCols + 1, i + subCols);
      }
    }

    geom.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }, [mesh, probeData, config, surfMin, surfMax]);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshPhongMaterial
        vertexColors
        side={THREE.DoubleSide}
        shininess={40}
        specular={new THREE.Color(0.15, 0.15, 0.15)}
        transparent
        opacity={0.92}
      />
    </mesh>
  );
}

/* ── Toolpath line — rendered ABOVE surface ── */
function ToolpathLine({ path, config, surfMin, surfMax, compensated, lineColor, lineWidth, mesh, probeData }: {
  path: PathPt[]; config: MeshConfig; surfMin: number; surfMax: number;
  compensated: boolean; lineColor: string; lineWidth?: number;
  mesh: MeshInfo; probeData: MeshPoint[];
}) {
  const { positions, colors: lineColors } = useMemo(() => {
    const pos: number[] = [];
    const cols: number[] = [];
    const zScale = Math.max(config.width, config.height) * 0.4;
    // Small lift above surface so path is always visible on top
    const lift = Math.max(config.width, config.height) * 0.015;

    for (const pt of path) {
      // Get the surface height at this XY point
      const surfZ = bilinearZ(pt.x, pt.y, mesh, probeData, config);
      // Place the path on top of the surface + a small lift
      const displayZ = surfZ * zScale + lift;
      pos.push(pt.x - config.xStart, pt.y - config.yStart, displayZ);
      const c = new THREE.Color(lineColor);
      cols.push(c.r, c.g, c.b);
    }
    return { positions: new Float32Array(pos), colors: new Float32Array(cols) };
  }, [path, config, compensated, lineColor, mesh, probeData]);

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
      <lineBasicMaterial vertexColors linewidth={lineWidth ?? 2} />
    </line>
  );
}

/* ── Animated tool marker ── */
function ToolMarker({ path, config, progress, isPlaying, speed, mesh, probeData }: {
  path: PathPt[]; config: MeshConfig; progress: number;
  isPlaying: boolean; speed: number; mesh: MeshInfo; probeData: MeshPoint[];
}) {
  const ref = useRef<THREE.Group>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const zScale = Math.max(config.width, config.height) * 0.4;
  const lift = Math.max(config.width, config.height) * 0.015;

  useFrame(() => {
    if (!ref.current || path.length < 2) return;
    const idx = Math.floor(progressRef.current * (path.length - 1));
    const pt = path[Math.min(idx, path.length - 1)];
    const surfZ = bilinearZ(pt.x, pt.y, mesh, probeData, config);
    ref.current.position.set(
      pt.x - config.xStart,
      pt.y - config.yStart,
      surfZ * zScale + lift
    );
  });

  if (path.length < 2) return null;
  const toolR = Math.max(config.width, config.height) * 0.012;

  return (
    <group ref={ref}>
      {/* Tool tip - glowing sphere */}
      <mesh>
        <sphereGeometry args={[toolR, 16, 16]} />
        <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.8} />
      </mesh>
      {/* Shank */}
      <mesh position={[0, 0, toolR * 6]}>
        <cylinderGeometry args={[toolR * 0.6, toolR * 0.8, toolR * 10, 12]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Glow point light */}
      <pointLight color="#facc15" intensity={0.5} distance={toolR * 30} />
    </group>
  );
}

/* ── Camera presets ── */
function CameraController({ preset, config }: { preset: string | null; config: MeshConfig }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const handled = useRef<string | null>(null);

  // Get OrbitControls ref via three internals
  useFrame(() => {
    if (!preset || preset === handled.current) return;
    handled.current = preset;
    const cx = config.width / 2;
    const cy = config.height / 2;
    const d = Math.max(config.width, config.height) * 1.2;
    const target = new THREE.Vector3(cx, cy, 0);

    const kind = preset.split("-")[0]; // strip timestamp suffix

    if (kind === "top") {
      camera.position.set(cx, cy, d * 1.5);
    } else if (kind === "side") {
      camera.position.set(cx, -d, d * 0.3);
    } else if (kind === "iso") {
      camera.position.set(cx + d * 0.7, cy - d * 0.5, d * 0.7);
    }
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  });

  return null;
}

/* ── 3D Scene ── */
function SimScene({ mesh, probeData, config, path, surfMin, surfMax,
  showSurface, showOriginal, showCompensated, showAnimation, animProgress, animSpeed, cameraPreset,
}: {
  mesh: MeshInfo; probeData: MeshPoint[]; config: MeshConfig;
  path: PathPt[]; surfMin: number; surfMax: number;
  showSurface: boolean; showOriginal: boolean; showCompensated: boolean;
  showAnimation: boolean; animProgress: number; animSpeed: number;
  cameraPreset: string | null;
}) {
  return (
    <>
      {/* Lighting for depth */}
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[config.width * 1.5, config.height * 0.5, config.width * 2]}
        intensity={0.9}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight
        position={[-config.width * 0.5, config.height * 1.5, config.width]}
        intensity={0.3}
      />
      <hemisphereLight args={["#b8d0ff", "#1a1a2e", 0.4]} />

      {showSurface && (
        <SurfaceMesh mesh={mesh} probeData={probeData} config={config} surfMin={surfMin} surfMax={surfMax} />
      )}
      {showOriginal && (
        <ToolpathLine path={path} config={config} surfMin={surfMin} surfMax={surfMax}
          compensated={false} lineColor="#94a3b8" lineWidth={1} mesh={mesh} probeData={probeData} />
      )}
      {showCompensated && (
        <ToolpathLine path={path} config={config} surfMin={surfMin} surfMax={surfMax}
          compensated lineColor="#facc15" lineWidth={2} mesh={mesh} probeData={probeData} />
      )}
      {showAnimation && path.length > 1 && (
        <ToolMarker path={path} config={config} progress={animProgress}
          isPlaying={showAnimation} speed={animSpeed} mesh={mesh} probeData={probeData} />
      )}

      {/* Reference grid */}
      <gridHelper
        args={[Math.max(config.width, config.height) * 1.4, 24, "#334155", "#1e293b"]}
        rotation={[Math.PI / 2, 0, 0]}
        position={[config.width / 2, config.height / 2, -0.02]}
      />

      <CameraController preset={cameraPreset} config={config} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.12}
        target={[config.width / 2, config.height / 2, 0]}
      />
    </>
  );
}

/* ── Color scale ── */
function ColorScale({ min, max, unit }: { min: number; max: number; unit: string }) {
  const steps = 20;
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <span className="text-[9px] font-mono text-destructive font-semibold">{fmt(max, 4)}</span>
      <div className="w-3 rounded-full overflow-hidden flex flex-col" style={{ height: 160 }}>
        {Array.from({ length: steps }).map((_, i) => {
          const t = 1 - i / (steps - 1);
          return <div key={i} className="flex-1" style={{ backgroundColor: heatColorCSS(t) }} />;
        })}
      </div>
      <span className="text-[9px] font-mono text-blue-400 font-semibold">{fmt(min, 4)}</span>
      <span className="text-[8px] text-muted-foreground mt-0.5">{unit}</span>
    </div>
  );
}

/* ── Main component ── */
export function CompensationSimulator3D({ originalGcode, mesh, config, onClose, vbitSettings }: Props) {
  const [showSurface, setShowSurface] = useState(true);
  const [showCompensated, setShowCompensated] = useState(true);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);
  const [animSpeed, setAnimSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<string | null>(null);

  const [gcodeSource, setGcodeSource] = useState<GcodeSource>("original");
  const [customGcode, setCustomGcode] = useState("");
  const [customFileName, setCustomFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const animRef = useRef<number | null>(null);

  const activeGcode = gcodeSource === "custom" && customGcode ? customGcode : originalGcode;

  const probeData = useMemo(() => generateSyntheticSurface(mesh), [mesh]);
  const { path, surfMin, surfMax, maxSlopeDeg } = useMemo(
    () => extractToolpath(activeGcode, mesh, probeData, config, vbitSettings),
    [activeGcode, mesh, probeData, config, vbitSettings]
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

  // Animation loop
  const startAnimation = useCallback(() => {
    setIsPlaying(true);
    setShowAnimation(true);
    const tick = () => {
      setAnimProgress(prev => {
        const next = prev + 0.002 * animSpeed;
        if (next >= 1) {
          setIsPlaying(false);
          return 1;
        }
        return next;
      });
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
  }, [animSpeed]);

  const stopAnimation = useCallback(() => {
    setIsPlaying(false);
    if (animRef.current) cancelAnimationFrame(animRef.current);
  }, []);

  const resetAnimation = useCallback(() => {
    stopAnimation();
    setAnimProgress(0);
  }, [stopAnimation]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      stopAnimation();
    } else {
      if (animProgress >= 1) setAnimProgress(0);
      startAnimation();
    }
  }, [isPlaying, animProgress, startAnimation, stopAnimation]);

  return (
    <Card className="border-primary/20 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" /> Simulação 3D da Compensação
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="text-xs">
          Visualize em 3D como a ferramenta irá subir e descer para acompanhar a superfície medida.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Visibility toggles */}
          <Button variant={showSurface ? "secondary" : "ghost"} size="sm" className="text-[11px] h-7 px-2 gap-1"
            onClick={() => setShowSurface(s => !s)}>
            {showSurface ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />} Superfície
          </Button>
          <Button variant={showCompensated ? "secondary" : "ghost"} size="sm" className="text-[11px] h-7 px-2 gap-1"
            onClick={() => setShowCompensated(s => !s)}>
            <span className="w-2 h-0.5 rounded-full bg-yellow-400 inline-block" /> Compensado
          </Button>
          <Button variant={showOriginal ? "secondary" : "ghost"} size="sm" className="text-[11px] h-7 px-2 gap-1"
            onClick={() => setShowOriginal(s => !s)}>
            <span className="w-2 h-0.5 rounded-full bg-slate-400 inline-block" /> Original
          </Button>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Camera presets */}
          <Button variant="ghost" size="sm" className="text-[11px] h-7 px-2 gap-1"
            onClick={() => setCameraPreset("top-" + Date.now())}>
            <ArrowUp className="h-3 w-3" /> Topo
          </Button>
          <Button variant="ghost" size="sm" className="text-[11px] h-7 px-2 gap-1"
            onClick={() => setCameraPreset("side-" + Date.now())}>
            <Crosshair className="h-3 w-3" /> Lateral
          </Button>
          <Button variant="ghost" size="sm" className="text-[11px] h-7 px-2 gap-1"
            onClick={() => setCameraPreset("iso-" + Date.now())}>
            <Box className="h-3 w-3" /> Isométrica
          </Button>

          <div className="w-px h-5 bg-border mx-1" />

          {/* G-code source */}
          <Button variant={gcodeSource === "original" ? "secondary" : "ghost"} size="sm" className="text-[11px] h-7 px-2"
            onClick={() => setGcodeSource("original")}>
            Original
          </Button>
          <Button variant={gcodeSource === "custom" ? "secondary" : "ghost"} size="sm" className="text-[11px] h-7 px-2 gap-1"
            onClick={() => fileRef.current?.click()}>
            <Upload className="h-3 w-3" /> Importar
          </Button>
          <input ref={fileRef} type="file" accept=".nc,.tap,.gcode,.txt" className="hidden" onChange={handleFileUpload} />
          {customFileName && gcodeSource === "custom" && (
            <Badge variant="outline" className="text-[10px] h-6">{customFileName}</Badge>
          )}
        </div>

        {/* 3D Canvas */}
        <div className="relative rounded-xl overflow-hidden border border-border/40 bg-[#0d0d1a]">
          <div className="flex">
            <div className="flex-1" style={{ height: 460 }}>
              <Canvas
                shadows
                camera={{
                  position: [config.width * 0.8, -config.height * 0.6, config.width * 0.8],
                  fov: 45, near: 0.01, far: 50000,
                }}
                gl={{ antialias: true, alpha: false }}
              >
                <color attach="background" args={["#0d0d1a"]} />
                <fog attach="fog" args={["#0d0d1a", config.width * 3, config.width * 8]} />
                <SimScene
                  mesh={mesh} probeData={probeData} config={config}
                  path={path} surfMin={surfMin} surfMax={surfMax}
                  showSurface={showSurface} showOriginal={showOriginal} showCompensated={showCompensated}
                  showAnimation={showAnimation} animProgress={animProgress} animSpeed={animSpeed}
                  cameraPreset={cameraPreset?.startsWith("top") ? "top" : cameraPreset?.startsWith("side") ? "side" : cameraPreset?.startsWith("iso") ? "iso" : null}
                />
              </Canvas>
            </div>
            <div className="flex items-center px-2 bg-[#0d0d1a]">
              <ColorScale min={surfMin} max={surfMax} unit={config.unit} />
            </div>
          </div>

          {/* Legend overlay */}
          <div className="absolute bottom-2 left-2 flex gap-3 text-[10px] bg-black/50 backdrop-blur-sm rounded-md px-2.5 py-1.5">
            {showCompensated && (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full bg-yellow-400 inline-block" />
                Compensado
              </span>
            )}
            {showOriginal && (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full bg-slate-400 inline-block" />
                Original
              </span>
            )}
            {showSurface && (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block" style={{
                  background: "linear-gradient(135deg, #0d1a99, #26bf4d, #f5d915, #e6261f)"
                }} />
                Superfície
              </span>
            )}
          </div>
        </div>

        {/* Animation controls */}
        <div className="flex items-center gap-3 px-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePlay}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetAnimation}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-yellow-400 rounded-full transition-all duration-100"
              style={{ width: `${animProgress * 100}%` }} />
          </div>
          <span className="text-[10px] text-muted-foreground w-8 text-right">{(animProgress * 100).toFixed(0)}%</span>
          <div className="flex items-center gap-1.5">
            <Label className="text-[10px] text-muted-foreground">Vel.</Label>
            <Slider value={[animSpeed]} onValueChange={([v]) => setAnimSpeed(v)}
              min={0.25} max={5} step={0.25} className="w-16" />
            <span className="text-[10px] text-muted-foreground w-6">{animSpeed}x</span>
          </div>
        </div>

        {/* Stats panel */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div className="rounded-lg bg-muted/40 p-2.5 text-center border border-border/30">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Mínimo</p>
            <p className="text-sm font-bold font-mono" style={{ color: heatColorCSS(0) }}>
              {fmt(surfMin, 4)} <span className="text-[10px] font-normal">{config.unit}</span>
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 p-2.5 text-center border border-border/30">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Máximo</p>
            <p className="text-sm font-bold font-mono" style={{ color: heatColorCSS(1) }}>
              {fmt(surfMax, 4)} <span className="text-[10px] font-normal">{config.unit}</span>
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 p-2.5 text-center border border-border/30">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Variação</p>
            <p className="text-sm font-bold font-mono text-foreground">
              {fmt(surfRange, 4)} <span className="text-[10px] font-normal">{config.unit}</span>
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 p-2.5 text-center border border-border/30">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Pontos</p>
            <p className="text-sm font-bold font-mono text-foreground">{mesh.totalPoints}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-2.5 text-center border border-border/30">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
              {vbitSettings?.enabled ? "Inclinação máx." : "Segmentos"}
            </p>
            <p className="text-sm font-bold font-mono text-foreground">
              {vbitSettings?.enabled ? `${maxSlopeDeg.toFixed(1)}°` : path.length}
            </p>
          </div>
        </div>

        {/* V-bit info */}
        {vbitSettings?.enabled && vbitSettings.compMode !== "off" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg bg-muted/40 p-2.5 text-center border border-border/30">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Ângulo V-bit</p>
              <p className="text-sm font-bold font-mono text-foreground">{vbitSettings.angle}°</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-2.5 text-center border border-border/30">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Prof. nominal</p>
              <p className="text-sm font-bold font-mono text-foreground">
                {fmt(vbitSettings.nominalDepth, 3)} <span className="text-[10px] font-normal">{config.unit}</span>
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-2.5 text-center border border-border/30">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Largura traço</p>
              <p className="text-sm font-bold font-mono text-foreground">
                {fmt(2 * vbitSettings.nominalDepth * Math.tan((vbitSettings.angle / 2) * Math.PI / 180), 3)} <span className="text-[10px] font-normal">{config.unit}</span>
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-2.5 text-center border border-border/30">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Compensação</p>
              <p className="text-sm font-bold font-mono text-foreground">
                {vbitSettings.compMode === "basic" ? "Básica" : "Avançada"}
              </p>
            </div>
          </div>
        )}

        {/* Slope warning */}
        {vbitSettings?.enabled && maxSlopeDeg > 20 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">⚠</span>
            <p className="text-xs text-muted-foreground">
              Superfície com inclinação elevada ({maxSlopeDeg.toFixed(1)}°). A gravação com V-bit pode sofrer variações.
              {vbitSettings.compMode === "advanced"
                ? " A compensação avançada está ajustando a profundidade automaticamente."
                : " Ative a compensação avançada para melhores resultados."
              }
            </p>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center italic">
          * Superfície simulada para demonstração. Os valores reais serão medidos pela CNC durante o nivelamento.
        </p>
      </CardContent>
    </Card>
  );
}
