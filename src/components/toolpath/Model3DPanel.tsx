import { useState, useRef, useCallback, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from "@react-three/drei";
import * as THREE from "three";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Upload, Box, RotateCcw, Move, Maximize2, FlipHorizontal, FlipVertical, Layers } from "lucide-react";
import { toast } from "sonner";
import {
  parseSTL,
  parseOBJ,
  createModel3D,
  type Model3D,
  type MaterialBlock3D,
} from "@/lib/toolpath-3d-engine";

interface Model3DPanelProps {
  model: Model3D | null;
  materialBlock: MaterialBlock3D;
  onModelChange: (model: Model3D | null) => void;
  onMaterialBlockChange: (block: MaterialBlock3D) => void;
}

function ModelMesh({ model }: { model: Model3D }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(model.position);
      meshRef.current.rotation.copy(model.rotation);
      meshRef.current.scale.copy(model.scale);
    }
  }, [model]);
  
  return (
    <mesh ref={meshRef} geometry={model.geometry} castShadow receiveShadow>
      <meshStandardMaterial color="hsl(var(--primary))" roughness={0.4} metalness={0.1} />
    </mesh>
  );
}

function MaterialBlockMesh({ block }: { block: MaterialBlock3D }) {
  const zOffset = block.workOrigin === "top" ? -block.height / 2 : 
                  block.workOrigin === "bottom" ? block.height / 2 : 0;
  
  return (
    <mesh position={[0, 0, zOffset]}>
      <boxGeometry args={[block.width, block.depth, block.height]} />
      <meshStandardMaterial color="hsl(var(--muted))" transparent opacity={0.3} wireframe />
    </mesh>
  );
}

function Scene3D({ model, block }: { model: Model3D | null; block: MaterialBlock3D }) {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.position.set(150, 150, 150);
  }, [camera]);
  
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[100, 100, 100]} intensity={1} castShadow />
      <directionalLight position={[-100, -100, 50]} intensity={0.3} />
      
      <MaterialBlockMesh block={block} />
      {model && <ModelMesh model={model} />}
      
      <Grid
        infiniteGrid
        cellSize={10}
        cellThickness={0.5}
        cellColor="hsl(var(--border))"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="hsl(var(--muted-foreground))"
        fadeDistance={500}
        position={[0, 0, -block.height / 2]}
      />
      
      <OrbitControls makeDefault />
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport labelColor="white" axisHeadScale={1} />
      </GizmoHelper>
    </>
  );
}

export function Model3DPanel({
  model,
  materialBlock,
  onModelChange,
  onMaterialBlockChange,
}: Model3DPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scale, setScale] = useState(100);
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  
  const handleFileImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    const isSTL = fileName.endsWith(".stl");
    const isOBJ = fileName.endsWith(".obj");
    
    if (!isSTL && !isOBJ) {
      toast.error("Formato não suportado. Use STL ou OBJ.");
      return;
    }
    
    try {
      let geometry: THREE.BufferGeometry;
      
      if (isSTL) {
        const buffer = await file.arrayBuffer();
        geometry = parseSTL(buffer);
      } else {
        const text = await file.text();
        geometry = parseOBJ(text);
      }
      
      const newModel = createModel3D(geometry, file.name, isSTL ? "stl" : "obj");
      
      // Auto-fit material block to model
      const padding = 10;
      onMaterialBlockChange({
        ...materialBlock,
        width: Math.ceil(newModel.dimensions.width + padding),
        depth: Math.ceil(newModel.dimensions.depth + padding),
        height: Math.ceil(newModel.dimensions.height + padding),
      });
      
      onModelChange(newModel);
      setScale(100);
      setRotation({ x: 0, y: 0, z: 0 });
      toast.success(`Modelo importado: ${newModel.faces.toLocaleString()} faces`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao importar modelo");
    }
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [materialBlock, onMaterialBlockChange, onModelChange]);
  
  const handleScaleChange = useCallback((value: number[]) => {
    const newScale = value[0];
    setScale(newScale);
    
    if (model) {
      const factor = newScale / 100;
      const newModel = {
        ...model,
        scale: new THREE.Vector3(factor, factor, factor),
        dimensions: {
          width: model.boundingBox.max.x - model.boundingBox.min.x * factor,
          depth: model.boundingBox.max.y - model.boundingBox.min.y * factor,
          height: model.boundingBox.max.z - model.boundingBox.min.z * factor,
        },
      };
      onModelChange(newModel);
    }
  }, [model, onModelChange]);
  
  const handleRotation = useCallback((axis: "x" | "y" | "z", degrees: number) => {
    const newRotation = { ...rotation, [axis]: rotation[axis] + degrees };
    setRotation(newRotation);
    
    if (model) {
      const newModel = {
        ...model,
        rotation: new THREE.Euler(
          (newRotation.x * Math.PI) / 180,
          (newRotation.y * Math.PI) / 180,
          (newRotation.z * Math.PI) / 180
        ),
      };
      onModelChange(newModel);
    }
  }, [model, rotation, onModelChange]);
  
  const handleFlip = useCallback((axis: "x" | "y" | "z") => {
    if (model) {
      const newScale = model.scale.clone();
      if (axis === "x") newScale.x *= -1;
      if (axis === "y") newScale.y *= -1;
      if (axis === "z") newScale.z *= -1;
      
      onModelChange({ ...model, scale: newScale });
      toast.success(`Modelo invertido no eixo ${axis.toUpperCase()}`);
    }
  }, [model, onModelChange]);
  
  const handleReset = useCallback(() => {
    if (model) {
      setScale(100);
      setRotation({ x: 0, y: 0, z: 0 });
      onModelChange({
        ...model,
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(1, 1, 1),
      });
      toast.success("Modelo resetado");
    }
  }, [model, onModelChange]);
  
  return (
    <div className="space-y-3">
      {/* 3D Preview */}
      <Card className="border-border">
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <Box className="h-3 w-3 text-primary" />
            Preview 3D
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="h-[200px] rounded-md overflow-hidden bg-muted/30 border border-border">
            <Canvas shadows camera={{ position: [150, 150, 150], fov: 45 }}>
              <Scene3D model={model} block={materialBlock} />
            </Canvas>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".stl,.obj"
            onChange={handleFileImport}
            className="hidden"
          />
          
          <div className="flex gap-1.5 mt-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-xs gap-1"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3 w-3" />
              Importar STL/OBJ
            </Button>
            {model && (
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleReset}>
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Model Info */}
      {model && (
        <Card className="border-border">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="h-3 w-3 text-primary" />
                Modelo
              </span>
              <Badge variant="outline" className="text-[8px] h-4">
                {model.fileType.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 space-y-2">
            <div className="text-[10px] text-muted-foreground truncate">{model.name}</div>
            
            <div className="grid grid-cols-3 gap-1.5 text-[9px]">
              <div className="bg-muted/50 rounded p-1.5 text-center">
                <div className="font-medium">{model.dimensions.width.toFixed(1)}</div>
                <div className="text-muted-foreground">L (mm)</div>
              </div>
              <div className="bg-muted/50 rounded p-1.5 text-center">
                <div className="font-medium">{model.dimensions.depth.toFixed(1)}</div>
                <div className="text-muted-foreground">P (mm)</div>
              </div>
              <div className="bg-muted/50 rounded p-1.5 text-center">
                <div className="font-medium">{model.dimensions.height.toFixed(1)}</div>
                <div className="text-muted-foreground">A (mm)</div>
              </div>
            </div>
            
            <Separator className="my-2" />
            
            {/* Scale */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[10px]">Escala</Label>
                <span className="text-[10px] text-muted-foreground">{scale}%</span>
              </div>
              <Slider
                value={[scale]}
                onValueChange={handleScaleChange}
                min={10}
                max={500}
                step={5}
                className="h-4"
              />
            </div>
            
            {/* Rotation */}
            <div className="space-y-1">
              <Label className="text-[10px]">Rotação</Label>
              <div className="flex gap-1">
                {(["x", "y", "z"] as const).map((axis) => (
                  <Button
                    key={axis}
                    size="sm"
                    variant="outline"
                    className="flex-1 h-6 text-[9px]"
                    onClick={() => handleRotation(axis, 90)}
                  >
                    {axis.toUpperCase()} +90°
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Flip */}
            <div className="space-y-1">
              <Label className="text-[10px]">Inverter</Label>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="flex-1 h-6 text-[9px] gap-1" onClick={() => handleFlip("x")}>
                  <FlipHorizontal className="h-3 w-3" /> X
                </Button>
                <Button size="sm" variant="outline" className="flex-1 h-6 text-[9px] gap-1" onClick={() => handleFlip("y")}>
                  <FlipVertical className="h-3 w-3" /> Y
                </Button>
                <Button size="sm" variant="outline" className="flex-1 h-6 text-[9px]" onClick={() => handleFlip("z")}>
                  Z
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Material Block */}
      <Card className="border-border">
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <Maximize2 className="h-3 w-3 text-primary" />
            Bloco de Material
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-2 space-y-2">
          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <Label className="text-[9px]">Largura</Label>
              <Input
                type="number"
                value={materialBlock.width}
                onChange={(e) => onMaterialBlockChange({ ...materialBlock, width: parseFloat(e.target.value) || 0 })}
                className="h-7 text-xs"
              />
            </div>
            <div>
              <Label className="text-[9px]">Profund.</Label>
              <Input
                type="number"
                value={materialBlock.depth}
                onChange={(e) => onMaterialBlockChange({ ...materialBlock, depth: parseFloat(e.target.value) || 0 })}
                className="h-7 text-xs"
              />
            </div>
            <div>
              <Label className="text-[9px]">Altura</Label>
              <Input
                type="number"
                value={materialBlock.height}
                onChange={(e) => onMaterialBlockChange({ ...materialBlock, height: parseFloat(e.target.value) || 0 })}
                className="h-7 text-xs"
              />
            </div>
          </div>
          
          <div>
            <Label className="text-[9px]">Origem do Trabalho</Label>
            <Select
              value={materialBlock.workOrigin}
              onValueChange={(v) => onMaterialBlockChange({ ...materialBlock, workOrigin: v as MaterialBlock3D["workOrigin"] })}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Topo do material</SelectItem>
                <SelectItem value="center">Centro do material</SelectItem>
                <SelectItem value="bottom">Base do material</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
