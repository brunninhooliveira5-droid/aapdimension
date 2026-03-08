import { useRef, useState, useCallback, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, Clock, FastForward } from "lucide-react";
import * as THREE from "three";
import type { ToolpathOperation, CncTool, SvgVector, MaterialConfig } from "@/lib/toolpath-engine";
import { extractPointsFromPath, calculateOperation } from "@/lib/toolpath-engine";

interface Simulation3DProps {
  material: MaterialConfig;
  operations: ToolpathOperation[];
  tools: CncTool[];
  vectors: SvgVector[];
}

function MaterialBlock({ material }: { material: MaterialConfig }) {
  return (
    <mesh position={[material.width / 2, material.height / 2, -material.thickness / 2]}>
      <boxGeometry args={[material.width, material.height, material.thickness]} />
      <meshStandardMaterial color="#d4a574" transparent opacity={0.4} side={THREE.DoubleSide} />
    </mesh>
  );
}

function CutGroovesAdvanced({
  operations, tools, vectors, progress,
}: {
  operations: ToolpathOperation[]; tools: CncTool[]; vectors: SvgVector[]; progress: number;
}) {
  const grooves = useMemo(() => {
    const result: { points: THREE.Vector3[]; width: number; color: string }[] = [];
    const sortedOps = operations.filter((o) => o.enabled).sort((a, b) => a.order - b.order);

    for (const op of sortedOps) {
      const tool = tools.find((t) => t.id === op.toolId);
      if (!tool) continue;
      const offset = op.cutSide === "outside" ? tool.diameter / 2 : op.cutSide === "inside" ? -tool.diameter / 2 : 0;
      const totalDepth = Math.abs(op.finalDepth - op.startDepth);
      const passes = Math.ceil(totalDepth / (op.depthPerPass || tool.depthPerPass || 1));

      for (let pass = 0; pass < passes; pass++) {
        const z = -(op.startDepth + (pass + 1) * (op.depthPerPass || tool.depthPerPass));
        const zClamped = Math.max(z, -Math.abs(op.finalDepth));

        for (const vid of op.vectorIds) {
          const v = vectors.find((vv) => vv.id === vid);
          if (!v) continue;
          const pts = extractPointsFromPath(v.pathData);
          const pts3d = pts.map(([x, y]) => new THREE.Vector3(x + offset, y, zClamped));
          const passColor = pass === passes - 1 ? "#f59e0b" : "#94a3b8";
          result.push({ points: pts3d, width: tool.diameter, color: passColor });
        }
      }
    }
    return result;
  }, [operations, tools, vectors]);

  const totalPoints = grooves.reduce((s, g) => s + g.points.length, 0);
  let accumulated = 0;

  return (
    <>
      {grooves.map((groove, gi) => {
        const startFrac = accumulated / totalPoints;
        accumulated += groove.points.length;
        const endFrac = accumulated / totalPoints;

        if (progress < startFrac) return null;
        const localP = Math.min(1, (progress - startFrac) / (endFrac - startFrac));
        const visibleCount = Math.max(2, Math.floor(groove.points.length * localP));

        const geom = new THREE.BufferGeometry().setFromPoints(groove.points.slice(0, visibleCount));
        return (
          <group key={gi}>
            <line>
              <primitive object={geom} attach="geometry" />
              <lineBasicMaterial color={groove.color} linewidth={2} />
            </line>
            {/* Cut width visualization */}
            {groove.points.slice(0, visibleCount).map((pt, pi) => (
              pi % 3 === 0 ? (
                <mesh key={pi} position={pt}>
                  <cylinderGeometry args={[groove.width / 2, groove.width / 2, 0.3, 8]} />
                  <meshStandardMaterial color={groove.color} transparent opacity={0.15} />
                </mesh>
              ) : null
            ))}
          </group>
        );
      })}
    </>
  );
}

function ToolMarker3D({ position, diameter, isPlaying }: { position: THREE.Vector3; diameter: number; isPlaying: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(() => { if (meshRef.current && isPlaying) meshRef.current.rotation.y += 0.15; });

  return (
    <group position={position}>
      {/* Tool shank */}
      <mesh ref={meshRef} position={[0, 0, 10]}>
        <cylinderGeometry args={[diameter / 2 + 1, diameter / 2 + 1, 20, 16]} />
        <meshStandardMaterial color="#666" transparent opacity={0.6} />
      </mesh>
      {/* Tool tip */}
      <mesh>
        <cylinderGeometry args={[diameter / 2, diameter / 2, 4, 16]} />
        <meshStandardMaterial color="#ef4444" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

function SimulationScene({
  material, operations, tools, vectors, isPlaying, progress, speed, onProgressUpdate,
}: {
  material: MaterialConfig; operations: ToolpathOperation[]; tools: CncTool[]; vectors: SvgVector[];
  isPlaying: boolean; progress: number; speed: number; onProgressUpdate: (p: number) => void;
}) {
  const toolPos = useRef(new THREE.Vector3(0, 0, 10));

  const allPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const sortedOps = operations.filter((o) => o.enabled).sort((a, b) => a.order - b.order);

    for (const op of sortedOps) {
      const tool = tools.find((t) => t.id === op.toolId);
      if (!tool) continue;
      const offset = op.cutSide === "outside" ? tool.diameter / 2 : op.cutSide === "inside" ? -tool.diameter / 2 : 0;
      const totalDepth = Math.abs(op.finalDepth - op.startDepth);
      const passes = Math.ceil(totalDepth / (op.depthPerPass || tool.depthPerPass || 1));

      for (let pass = 0; pass < passes; pass++) {
        const z = -(op.startDepth + (pass + 1) * (op.depthPerPass || tool.depthPerPass));
        const zClamped = Math.max(z, -Math.abs(op.finalDepth));

        // Retract before each pass
        if (pts.length > 0) {
          const last = pts[pts.length - 1];
          pts.push(new THREE.Vector3(last.x, last.y, 5));
        }

        for (const vid of op.vectorIds) {
          const v = vectors.find((vv) => vv.id === vid);
          if (!v) continue;
          const pathPts = extractPointsFromPath(v.pathData);
          for (const [x, y] of pathPts) {
            pts.push(new THREE.Vector3(x + offset, y, zClamped));
          }
        }
      }

      if (pts.length > 0) {
        const last = pts[pts.length - 1];
        pts.push(new THREE.Vector3(last.x, last.y, 5));
      }
    }
    return pts;
  }, [operations, tools, vectors]);

  useFrame((_, delta) => {
    if (isPlaying && allPoints.length > 0) {
      const newP = Math.min(1, progress + delta * 0.03 * speed);
      onProgressUpdate(newP);
      const idx = Math.floor(newP * (allPoints.length - 1));
      if (allPoints[idx]) toolPos.current.copy(allPoints[idx]);
    }
  });

  const activeTool = operations.find((o) => o.enabled) ? tools.find((t) => t.id === operations.find((o) => o.enabled)?.toolId) : null;

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[200, 200, 200]} intensity={0.7} />
      <pointLight position={[material.width / 2, material.height / 2, 50]} intensity={0.3} />
      <MaterialBlock material={material} />
      <CutGroovesAdvanced operations={operations} tools={tools} vectors={vectors} progress={progress} />
      {activeTool && <ToolMarker3D position={toolPos.current} diameter={activeTool.diameter} isPlaying={isPlaying} />}
      <OrbitControls makeDefault />
      <gridHelper
        args={[Math.max(material.width, material.height) * 1.5, 20]}
        rotation={[Math.PI / 2, 0, 0]}
        position={[material.width / 2, material.height / 2, -material.thickness]}
      />
    </>
  );
}

export function Simulation3D({ material, operations, tools, vectors }: Simulation3DProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);

  let totalTime = 0;
  operations.filter((o) => o.enabled).forEach((op) => {
    const tool = tools.find((t) => t.id === op.toolId);
    const calc = calculateOperation(op, tool, vectors);
    totalTime += calc.estimatedTime;
  });

  const handleReset = () => { setIsPlaying(false); setProgress(0); };
  const handleProgressUpdate = useCallback((p: number) => {
    setProgress(p);
    if (p >= 1) setIsPlaying(false);
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border bg-background/80">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        <div className="flex items-center gap-1">
          <FastForward className="h-3 w-3 text-muted-foreground" />
          <Slider value={[speed]} onValueChange={([v]) => setSpeed(v)} min={0.25} max={5} step={0.25} className="w-16" />
          <span className="text-[10px] text-muted-foreground w-8">{speed}x</span>
        </div>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />{totalTime.toFixed(1)} min
        </span>
        <span className="text-[10px] text-muted-foreground">{(progress * 100).toFixed(0)}%</span>
      </div>

      <div className="flex-1 min-h-0">
        {operations.filter((o) => o.enabled).length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            Crie operações para simular o percurso 3D.
          </div>
        ) : (
          <Canvas camera={{ position: [material.width / 2, -material.height, material.height], fov: 50, near: 0.1, far: 5000 }}>
            <SimulationScene material={material} operations={operations} tools={tools} vectors={vectors}
              isPlaying={isPlaying} progress={progress} speed={speed} onProgressUpdate={handleProgressUpdate} />
          </Canvas>
        )}
      </div>
    </div>
  );
}
