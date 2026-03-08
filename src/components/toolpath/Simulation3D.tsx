import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Clock } from "lucide-react";
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
      <meshStandardMaterial color="#d4a574" transparent opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
}

function ToolpathLine({
  points,
  color,
  offset,
  depth,
}: {
  points: [number, number][];
  color: string;
  offset: number;
  depth: number;
}) {
  const geometry = useMemo(() => {
    const pts = points.map(
      ([x, y]) => new THREE.Vector3(x + offset, y, depth)
    );
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [points, offset, depth]);

  return (
    <line>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial color={color} linewidth={2} />
    </line>
  );
}

function ToolMarker({
  position,
  diameter,
  isPlaying,
}: {
  position: THREE.Vector3;
  diameter: number;
  isPlaying: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current && isPlaying) {
      meshRef.current.rotation.y += 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <cylinderGeometry args={[diameter / 2, diameter / 2, 15, 16]} />
      <meshStandardMaterial color="#ef4444" transparent opacity={0.7} />
    </mesh>
  );
}

function CutGrooves({
  operations,
  tools,
  vectors,
  progress,
}: {
  operations: ToolpathOperation[];
  tools: CncTool[];
  vectors: SvgVector[];
  progress: number;
}) {
  const grooves = useMemo(() => {
    const result: { points: THREE.Vector3[]; width: number }[] = [];
    const sortedOps = operations
      .filter((o) => o.enabled)
      .sort((a, b) => a.order - b.order);

    for (const op of sortedOps) {
      const tool = tools.find((t) => t.id === op.toolId);
      if (!tool) continue;
      const offset =
        op.cutSide === "outside"
          ? tool.diameter / 2
          : op.cutSide === "inside"
          ? -tool.diameter / 2
          : 0;

      for (const vid of op.vectorIds) {
        const v = vectors.find((vv) => vv.id === vid);
        if (!v) continue;
        const pts = extractPointsFromPath(v.pathData);
        const pts3d = pts.map(
          ([x, y]) => new THREE.Vector3(x + offset, y, -op.finalDepth)
        );
        result.push({ points: pts3d, width: tool.diameter });
      }
    }
    return result;
  }, [operations, tools, vectors]);

  return (
    <>
      {grooves.map((groove, gi) => {
        const visibleCount = Math.floor(groove.points.length * progress);
        if (visibleCount < 2) return null;
        const geom = new THREE.BufferGeometry().setFromPoints(
          groove.points.slice(0, visibleCount)
        );
        return (
          <line key={gi}>
            <primitive object={geom} attach="geometry" />
            <lineBasicMaterial color="#f59e0b" linewidth={3} />
          </line>
        );
      })}
    </>
  );
}

function SimulationScene({
  material,
  operations,
  tools,
  vectors,
  isPlaying,
  progress,
  onProgressUpdate,
}: {
  material: MaterialConfig;
  operations: ToolpathOperation[];
  tools: CncTool[];
  vectors: SvgVector[];
  isPlaying: boolean;
  progress: number;
  onProgressUpdate: (p: number) => void;
}) {
  const toolPos = useRef(new THREE.Vector3(0, 0, 10));

  // Compute all path points for animation
  const allPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const sortedOps = operations
      .filter((o) => o.enabled)
      .sort((a, b) => a.order - b.order);

    for (const op of sortedOps) {
      const tool = tools.find((t) => t.id === op.toolId);
      if (!tool) continue;
      const offset =
        op.cutSide === "outside"
          ? tool.diameter / 2
          : op.cutSide === "inside"
          ? -tool.diameter / 2
          : 0;

      for (const vid of op.vectorIds) {
        const v = vectors.find((vv) => vv.id === vid);
        if (!v) continue;
        const pathPts = extractPointsFromPath(v.pathData);
        for (const [x, y] of pathPts) {
          pts.push(new THREE.Vector3(x + offset, y, -op.finalDepth));
        }
      }
      // Add retract
      if (pts.length > 0) {
        const last = pts[pts.length - 1];
        pts.push(new THREE.Vector3(last.x, last.y, 5));
      }
    }
    return pts;
  }, [operations, tools, vectors]);

  useFrame((_, delta) => {
    if (isPlaying && allPoints.length > 0) {
      const newP = Math.min(1, progress + delta * 0.05);
      onProgressUpdate(newP);
      const idx = Math.floor(newP * (allPoints.length - 1));
      if (allPoints[idx]) {
        toolPos.current.copy(allPoints[idx]);
      }
    }
  });

  const activeTool = operations.find((o) => o.enabled)
    ? tools.find((t) => t.id === operations.find((o) => o.enabled)?.toolId)
    : null;

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[100, 100, 100]} intensity={0.8} />
      <MaterialBlock material={material} />
      <CutGrooves
        operations={operations}
        tools={tools}
        vectors={vectors}
        progress={progress}
      />
      {activeTool && (
        <ToolMarker
          position={toolPos.current}
          diameter={activeTool.diameter}
          isPlaying={isPlaying}
        />
      )}
      <OrbitControls makeDefault />
      {/* Grid helper */}
      <gridHelper
        args={[Math.max(material.width, material.height) * 1.5, 20]}
        rotation={[Math.PI / 2, 0, 0]}
        position={[material.width / 2, material.height / 2, -material.thickness]}
      />
    </>
  );
}

export function Simulation3D({
  material,
  operations,
  tools,
  vectors,
}: Simulation3DProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // Estimate total time
  let totalTime = 0;
  operations
    .filter((o) => o.enabled)
    .forEach((op) => {
      const tool = tools.find((t) => t.id === op.toolId);
      const calc = calculateOperation(op, tool, vectors);
      totalTime += calc.estimatedTime;
    });

  const handleReset = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const handleProgressUpdate = useCallback((p: number) => {
    setProgress(p);
    if (p >= 1) setIsPlaying(false);
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border bg-background/80">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleReset}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        {/* Progress bar */}
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {totalTime.toFixed(1)} min
        </span>
        <span className="text-[10px] text-muted-foreground">
          {(progress * 100).toFixed(0)}%
        </span>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 min-h-0">
        {operations.filter((o) => o.enabled).length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            Crie operações para simular o percurso 3D.
          </div>
        ) : (
          <Canvas
            camera={{
              position: [material.width / 2, -material.height, material.height],
              fov: 50,
              near: 0.1,
              far: 5000,
            }}
          >
            <SimulationScene
              material={material}
              operations={operations}
              tools={tools}
              vectors={vectors}
              isPlaying={isPlaying}
              progress={progress}
              onProgressUpdate={handleProgressUpdate}
            />
          </Canvas>
        )}
      </div>
    </div>
  );
}
