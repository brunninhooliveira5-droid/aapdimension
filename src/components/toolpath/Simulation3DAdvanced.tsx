import { useState, useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Line, GizmoHelper, GizmoViewport } from "@react-three/drei";
import * as THREE from "three";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Play, Pause, RotateCcw, FastForward, Eye, EyeOff, Layers } from "lucide-react";
import {
  type Model3D,
  type MaterialBlock3D,
  type Operation3D,
  type Tool3D,
  type Toolpath3D,
} from "@/lib/toolpath-3d-engine";

interface Simulation3DAdvancedProps {
  model: Model3D | null;
  materialBlock: MaterialBlock3D;
  operations: Operation3D[];
  tools: Tool3D[];
  toolpaths: Toolpath3D[];
}

function MaterialBlockMesh({ block, opacity }: { block: MaterialBlock3D; opacity: number }) {
  const zOffset = block.workOrigin === "top" ? -block.height / 2 :
                  block.workOrigin === "bottom" ? block.height / 2 : 0;
  
  return (
    <mesh position={[0, 0, zOffset]}>
      <boxGeometry args={[block.width, block.depth, block.height]} />
      <meshStandardMaterial 
        color="hsl(var(--muted))" 
        transparent 
        opacity={opacity} 
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function ModelMesh({ model, visible }: { model: Model3D; visible: boolean }) {
  if (!visible) return null;
  
  return (
    <mesh 
      geometry={model.geometry} 
      position={model.position} 
      rotation={model.rotation} 
      scale={model.scale}
    >
      <meshStandardMaterial color="hsl(var(--primary))" roughness={0.4} metalness={0.1} />
    </mesh>
  );
}

function ToolpathVisualization({ 
  toolpath, 
  color, 
  visible,
  animationProgress 
}: { 
  toolpath: Toolpath3D; 
  color: string;
  visible: boolean;
  animationProgress: number;
}) {
  const points = useMemo(() => {
    if (!visible) return [];
    
    const endIndex = Math.floor(toolpath.points.length * animationProgress);
    return toolpath.points.slice(0, endIndex).map(p => new THREE.Vector3(p.x, p.y, p.z));
  }, [toolpath.points, visible, animationProgress]);
  
  if (points.length < 2) return null;
  
  return (
    <Line
      points={points}
      color={color}
      lineWidth={1}
      opacity={0.8}
      transparent
    />
  );
}

function ToolMarker({ 
  position, 
  tool 
}: { 
  position: THREE.Vector3; 
  tool: Tool3D | null;
}) {
  if (!tool) return null;
  
  const radius = tool.diameter / 2;
  const height = tool.fluteLength;
  
  return (
    <group position={position}>
      {/* Tool body */}
      <mesh position={[0, 0, height / 2]}>
        <cylinderGeometry args={[tool.shankDiameter / 2, radius, height, 16]} />
        <meshStandardMaterial color="hsl(var(--primary))" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Ball nose tip */}
      {tool.type === "ball-nose" && tool.tipRadius && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[tool.tipRadius, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="hsl(var(--primary))" metalness={0.8} roughness={0.2} />
        </mesh>
      )}
    </group>
  );
}

function AnimatedTool({
  toolpaths,
  tools,
  operations,
  isPlaying,
  progress,
  onProgressChange,
  speed,
}: {
  toolpaths: Toolpath3D[];
  tools: Tool3D[];
  operations: Operation3D[];
  isPlaying: boolean;
  progress: number;
  onProgressChange: (p: number) => void;
  speed: number;
}) {
  const positionRef = useRef(new THREE.Vector3(0, 0, 50));
  
  // Find current position based on progress
  useEffect(() => {
    if (toolpaths.length === 0) return;
    
    // Calculate which toolpath and point we're at
    const totalPoints = toolpaths.reduce((sum, tp) => sum + tp.points.length, 0);
    const targetPoint = Math.floor(totalPoints * progress);
    
    let accumulated = 0;
    for (const tp of toolpaths) {
      if (accumulated + tp.points.length > targetPoint) {
        const localIndex = targetPoint - accumulated;
        if (localIndex >= 0 && localIndex < tp.points.length) {
          const pt = tp.points[localIndex];
          positionRef.current.set(pt.x, pt.y, pt.z);
        }
        break;
      }
      accumulated += tp.points.length;
    }
  }, [progress, toolpaths]);
  
  useFrame((_, delta) => {
    if (isPlaying && toolpaths.length > 0) {
      const increment = delta * speed * 0.1;
      const newProgress = Math.min(1, progress + increment);
      onProgressChange(newProgress);
    }
  });
  
  const currentTool = useMemo(() => {
    if (toolpaths.length === 0 || operations.length === 0) return null;
    
    // Get tool from first operation for now
    const op = operations[0];
    return tools.find(t => t.id === op.toolId) || null;
  }, [toolpaths, operations, tools]);
  
  return <ToolMarker position={positionRef.current} tool={currentTool} />;
}

function Scene({
  model,
  block,
  toolpaths,
  tools,
  operations,
  showModel,
  showBlock,
  blockOpacity,
  isPlaying,
  progress,
  onProgressChange,
  speed,
  visibleToolpaths,
}: {
  model: Model3D | null;
  block: MaterialBlock3D;
  toolpaths: Toolpath3D[];
  tools: Tool3D[];
  operations: Operation3D[];
  showModel: boolean;
  showBlock: boolean;
  blockOpacity: number;
  isPlaying: boolean;
  progress: number;
  onProgressChange: (p: number) => void;
  speed: number;
  visibleToolpaths: Set<string>;
}) {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.position.set(200, 200, 200);
  }, [camera]);
  
  const toolpathColors = useMemo(() => {
    const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
    const map: Record<string, string> = {};
    toolpaths.forEach((tp, i) => {
      map[tp.operationId] = colors[i % colors.length];
    });
    return map;
  }, [toolpaths]);
  
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[100, 100, 100]} intensity={1} castShadow />
      <directionalLight position={[-100, -100, 50]} intensity={0.3} />
      
      {showBlock && <MaterialBlockMesh block={block} opacity={blockOpacity} />}
      {model && <ModelMesh model={model} visible={showModel} />}
      
      {toolpaths.map((tp) => (
        <ToolpathVisualization
          key={tp.operationId}
          toolpath={tp}
          color={toolpathColors[tp.operationId]}
          visible={visibleToolpaths.has(tp.operationId)}
          animationProgress={progress}
        />
      ))}
      
      <AnimatedTool
        toolpaths={toolpaths}
        tools={tools}
        operations={operations}
        isPlaying={isPlaying}
        progress={progress}
        onProgressChange={onProgressChange}
        speed={speed}
      />
      
      <gridHelper args={[500, 50]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -block.height / 2]} />
      
      <OrbitControls makeDefault />
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport labelColor="white" axisHeadScale={1} />
      </GizmoHelper>
    </>
  );
}

export function Simulation3DAdvanced({
  model,
  materialBlock,
  operations,
  tools,
  toolpaths,
}: Simulation3DAdvancedProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showModel, setShowModel] = useState(true);
  const [showBlock, setShowBlock] = useState(true);
  const [blockOpacity, setBlockOpacity] = useState(0.3);
  const [visibleToolpaths, setVisibleToolpaths] = useState<Set<string>>(() => 
    new Set(toolpaths.map(tp => tp.operationId))
  );
  
  // Update visible toolpaths when toolpaths change
  useEffect(() => {
    setVisibleToolpaths(new Set(toolpaths.map(tp => tp.operationId)));
  }, [toolpaths]);
  
  const handleReset = () => {
    setIsPlaying(false);
    setProgress(0);
  };
  
  const toggleToolpath = (opId: string) => {
    setVisibleToolpaths(prev => {
      const next = new Set(prev);
      if (next.has(opId)) next.delete(opId);
      else next.add(opId);
      return next;
    });
  };
  
  const totalTime = useMemo(() => 
    toolpaths.reduce((sum, tp) => sum + tp.estimatedTime, 0),
    [toolpaths]
  );
  
  const currentTime = totalTime * progress;
  
  return (
    <div className="h-full flex flex-col gap-2 p-2">
      {/* 3D Canvas */}
      <div className="flex-1 min-h-0 rounded-lg overflow-hidden border border-border bg-background">
        <Canvas shadows camera={{ position: [200, 200, 200], fov: 45 }}>
          <Scene
            model={model}
            block={materialBlock}
            toolpaths={toolpaths}
            tools={tools}
            operations={operations}
            showModel={showModel}
            showBlock={showBlock}
            blockOpacity={blockOpacity}
            isPlaying={isPlaying}
            progress={progress}
            onProgressChange={setProgress}
            speed={speed}
            visibleToolpaths={visibleToolpaths}
          />
        </Canvas>
      </div>
      
      {/* Controls */}
      <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/30 rounded-lg border border-border">
        {/* Playback controls */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={isPlaying ? "default" : "outline"}
            className="h-7 w-7 p-0"
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={toolpaths.length === 0}
          >
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0"
            onClick={handleReset}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
        
        {/* Progress slider */}
        <div className="flex-1 flex items-center gap-2">
          <Slider
            value={[progress * 100]}
            onValueChange={([v]) => setProgress(v / 100)}
            max={100}
            step={0.1}
            className="flex-1"
          />
          <span className="text-[9px] text-muted-foreground w-16 text-right">
            {(currentTime).toFixed(1)} / {totalTime.toFixed(1)} min
          </span>
        </div>
        
        {/* Speed control */}
        <Select value={speed.toString()} onValueChange={(v) => setSpeed(parseFloat(v))}>
          <SelectTrigger className="w-16 h-7 text-[10px]">
            <FastForward className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0.5">0.5x</SelectItem>
            <SelectItem value="1">1x</SelectItem>
            <SelectItem value="2">2x</SelectItem>
            <SelectItem value="5">5x</SelectItem>
            <SelectItem value="10">10x</SelectItem>
          </SelectContent>
        </Select>
        
        {/* View toggles */}
        <div className="flex items-center gap-2 border-l border-border pl-2">
          <div className="flex items-center gap-1">
            <Switch checked={showModel} onCheckedChange={setShowModel} className="scale-75" />
            <Label className="text-[9px]">Modelo</Label>
          </div>
          <div className="flex items-center gap-1">
            <Switch checked={showBlock} onCheckedChange={setShowBlock} className="scale-75" />
            <Label className="text-[9px]">Bloco</Label>
          </div>
        </div>
      </div>
      
      {/* Toolpath visibility */}
      {toolpaths.length > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/20 rounded border border-border overflow-x-auto">
          <Layers className="h-3 w-3 text-muted-foreground shrink-0" />
          {operations.filter(op => op.enabled).map((op) => {
            const tp = toolpaths.find(t => t.operationId === op.id);
            if (!tp) return null;
            
            return (
              <Badge
                key={op.id}
                variant={visibleToolpaths.has(op.id) ? "default" : "outline"}
                className="text-[8px] h-5 cursor-pointer shrink-0"
                onClick={() => toggleToolpath(op.id)}
              >
                {visibleToolpaths.has(op.id) ? <Eye className="h-2.5 w-2.5 mr-1" /> : <EyeOff className="h-2.5 w-2.5 mr-1" />}
                {op.name}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
