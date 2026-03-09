// Toolpath 3D Engine V5 - Full 3D Machining Support

import * as THREE from "three";

// ======================== TYPES ========================

export interface Model3D {
  id: string;
  name: string;
  geometry: THREE.BufferGeometry;
  boundingBox: THREE.Box3;
  dimensions: { width: number; depth: number; height: number };
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  vertices: Float32Array;
  faces: number;
  fileType: "stl" | "obj";
}

export interface MaterialBlock3D {
  width: number;
  depth: number;
  height: number;
  modelPosition: { x: number; y: number; z: number };
  workOrigin: "top" | "center" | "bottom";
}

export type Tool3DType = "ball-nose" | "flat-end" | "bull-nose" | "tapered" | "v-bit";

export interface Tool3D {
  id: string;
  name: string;
  type: Tool3DType;
  diameter: number;
  tipRadius?: number;
  taperAngle?: number;
  fluteLength: number;
  shankDiameter: number;
  feedRate: number;
  plungeRate: number;
  spindleSpeed: number;
  stepOver: number;
  stepDown: number;
}

export type Roughing3DStrategy = "raster" | "offset" | "adaptive" | "z-level";
export type Finishing3DStrategy = "raster" | "parallel" | "waterline" | "spiral" | "pencil";

export interface Roughing3DOperation {
  id: string;
  name: string;
  type: "roughing-3d";
  strategy: Roughing3DStrategy;
  toolId: string;
  stepDown: number;
  stepOver: number;
  stockToLeave: number;
  feedRate: number;
  plungeRate: number;
  spindleSpeed: number;
  rasterAngle?: number;
  enabled: boolean;
}

export interface Finishing3DOperation {
  id: string;
  name: string;
  type: "finishing-3d";
  strategy: Finishing3DStrategy;
  toolId: string;
  stepOver: number;
  feedRate: number;
  plungeRate: number;
  spindleSpeed: number;
  tolerance: number;
  rasterAngle?: number;
  waterlineStepDown?: number;
  enabled: boolean;
}

export type Operation3D = Roughing3DOperation | Finishing3DOperation;

export interface ToolpathPoint3D {
  x: number;
  y: number;
  z: number;
  type: "rapid" | "linear" | "arc-cw" | "arc-ccw";
  feedRate?: number;
}

export interface Toolpath3D {
  operationId: string;
  points: ToolpathPoint3D[];
  estimatedTime: number;
  pathLength: number;
}

export interface SurfaceAnalysis {
  flatAreas: number;
  steepAreas: number;
  verticalWalls: number;
  innerCorners: number;
  avgSlopeAngle: number;
  suggestedStrategies: {
    roughing: Roughing3DStrategy;
    finishing: Finishing3DStrategy[];
  };
}

export interface Project3D {
  id: string;
  name: string;
  model: Model3D | null;
  materialBlock: MaterialBlock3D;
  tools: Tool3D[];
  operations: Operation3D[];
  toolpaths: Toolpath3D[];
  createdAt: string;
  updatedAt: string;
}

export interface TimeEstimate3D {
  roughingTime: number;
  finishingTime: number;
  totalTime: number;
  rapidTime: number;
  cuttingTime: number;
}

// ======================== DEFAULT VALUES ========================

export const DEFAULT_TOOLS_3D: Tool3D[] = [
  {
    id: "ball-6mm",
    name: "Fresa Esférica 6mm",
    type: "ball-nose",
    diameter: 6,
    tipRadius: 3,
    fluteLength: 22,
    shankDiameter: 6,
    feedRate: 2000,
    plungeRate: 800,
    spindleSpeed: 18000,
    stepOver: 15,
    stepDown: 2,
  },
  {
    id: "ball-3mm",
    name: "Fresa Esférica 3mm",
    type: "ball-nose",
    diameter: 3,
    tipRadius: 1.5,
    fluteLength: 12,
    shankDiameter: 3,
    feedRate: 1500,
    plungeRate: 600,
    spindleSpeed: 24000,
    stepOver: 10,
    stepDown: 1,
  },
  {
    id: "flat-6mm",
    name: "Fresa Topo Plano 6mm",
    type: "flat-end",
    diameter: 6,
    fluteLength: 22,
    shankDiameter: 6,
    feedRate: 2500,
    plungeRate: 1000,
    spindleSpeed: 18000,
    stepOver: 40,
    stepDown: 3,
  },
  {
    id: "tapered-3mm",
    name: "Fresa Cônica 3mm",
    type: "tapered",
    diameter: 3,
    taperAngle: 7,
    fluteLength: 15,
    shankDiameter: 6,
    feedRate: 1200,
    plungeRate: 500,
    spindleSpeed: 20000,
    stepOver: 10,
    stepDown: 1.5,
  },
  {
    id: "vbit-90deg",
    name: "V-Bit 90° 6mm",
    type: "v-bit",
    diameter: 6,
    taperAngle: 45,
    fluteLength: 10,
    shankDiameter: 6,
    feedRate: 1000,
    plungeRate: 400,
    spindleSpeed: 15000,
    stepOver: 20,
    stepDown: 1,
  },
];

export const DEFAULT_MATERIAL_BLOCK: MaterialBlock3D = {
  width: 200,
  depth: 200,
  height: 50,
  modelPosition: { x: 0, y: 0, z: 0 },
  workOrigin: "top",
};

// ======================== STL PARSER ========================

export function parseSTL(buffer: ArrayBuffer): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const dataView = new DataView(buffer);
  
  // Check if binary or ASCII
  const isASCII = isASCIISTL(buffer);
  
  if (isASCII) {
    return parseASCIISTL(buffer);
  } else {
    return parseBinarySTL(dataView, geometry);
  }
}

function isASCIISTL(buffer: ArrayBuffer): boolean {
  const decoder = new TextDecoder("utf-8");
  const header = decoder.decode(new Uint8Array(buffer, 0, 80));
  return header.toLowerCase().startsWith("solid");
}

function parseASCIISTL(buffer: ArrayBuffer): THREE.BufferGeometry {
  const decoder = new TextDecoder("utf-8");
  const text = decoder.decode(buffer);
  const geometry = new THREE.BufferGeometry();
  
  const vertices: number[] = [];
  const normals: number[] = [];
  
  const vertexPattern = /vertex\s+([\d.e+-]+)\s+([\d.e+-]+)\s+([\d.e+-]+)/gi;
  const normalPattern = /facet\s+normal\s+([\d.e+-]+)\s+([\d.e+-]+)\s+([\d.e+-]+)/gi;
  
  let match;
  while ((match = vertexPattern.exec(text)) !== null) {
    vertices.push(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
  }
  
  while ((match = normalPattern.exec(text)) !== null) {
    const nx = parseFloat(match[1]);
    const ny = parseFloat(match[2]);
    const nz = parseFloat(match[3]);
    normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  }
  
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  if (normals.length > 0) {
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  } else {
    geometry.computeVertexNormals();
  }
  
  return geometry;
}

function parseBinarySTL(dataView: DataView, geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const numTriangles = dataView.getUint32(80, true);
  const vertices: number[] = [];
  const normals: number[] = [];
  
  let offset = 84;
  
  for (let i = 0; i < numTriangles; i++) {
    const nx = dataView.getFloat32(offset, true);
    const ny = dataView.getFloat32(offset + 4, true);
    const nz = dataView.getFloat32(offset + 8, true);
    offset += 12;
    
    for (let j = 0; j < 3; j++) {
      const x = dataView.getFloat32(offset, true);
      const y = dataView.getFloat32(offset + 4, true);
      const z = dataView.getFloat32(offset + 8, true);
      offset += 12;
      
      vertices.push(x, y, z);
      normals.push(nx, ny, nz);
    }
    
    offset += 2; // attribute byte count
  }
  
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  
  return geometry;
}

// ======================== OBJ PARSER ========================

export function parseOBJ(text: string): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const normals: number[] = [];
  const positions: number[][] = [];
  const normalsList: number[][] = [];
  
  const lines = text.split("\n");
  
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    
    if (parts[0] === "v") {
      positions.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (parts[0] === "vn") {
      normalsList.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (parts[0] === "f") {
      for (let i = 1; i <= 3; i++) {
        const vertexData = parts[i].split("/");
        const posIdx = parseInt(vertexData[0]) - 1;
        vertices.push(...positions[posIdx]);
        
        if (vertexData[2] && normalsList.length > 0) {
          const normIdx = parseInt(vertexData[2]) - 1;
          normals.push(...normalsList[normIdx]);
        }
      }
    }
  }
  
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  if (normals.length > 0) {
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  } else {
    geometry.computeVertexNormals();
  }
  
  return geometry;
}

// ======================== MODEL FUNCTIONS ========================

export function createModel3D(
  geometry: THREE.BufferGeometry,
  fileName: string,
  fileType: "stl" | "obj"
): Model3D {
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;
  
  const dimensions = {
    width: bbox.max.x - bbox.min.x,
    depth: bbox.max.y - bbox.min.y,
    height: bbox.max.z - bbox.min.z,
  };
  
  // Center the model
  const center = new THREE.Vector3();
  bbox.getCenter(center);
  geometry.translate(-center.x, -center.y, -bbox.min.z);
  geometry.computeBoundingBox();
  
  const positionAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
  
  return {
    id: `model-${Date.now()}`,
    name: fileName,
    geometry,
    boundingBox: geometry.boundingBox!,
    dimensions,
    position: new THREE.Vector3(0, 0, 0),
    rotation: new THREE.Euler(0, 0, 0),
    scale: new THREE.Vector3(1, 1, 1),
    vertices: positionAttr.array as Float32Array,
    faces: positionAttr.count / 3,
    fileType,
  };
}

// ======================== SURFACE ANALYSIS ========================

export function analyzeSurface(model: Model3D): SurfaceAnalysis {
  const normalAttr = model.geometry.getAttribute("normal") as THREE.BufferAttribute;
  
  let flatAreas = 0;
  let steepAreas = 0;
  let verticalWalls = 0;
  let innerCorners = 0;
  let totalAngle = 0;
  
  const faceCount = normalAttr.count / 3;
  
  for (let i = 0; i < normalAttr.count; i += 3) {
    const nx = normalAttr.getX(i);
    const ny = normalAttr.getY(i);
    const nz = normalAttr.getZ(i);
    
    const slopeAngle = Math.acos(Math.abs(nz)) * (180 / Math.PI);
    totalAngle += slopeAngle;
    
    if (slopeAngle < 15) flatAreas++;
    else if (slopeAngle < 45) steepAreas++;
    else if (slopeAngle < 80) steepAreas++;
    else verticalWalls++;
  }
  
  const avgSlopeAngle = totalAngle / (normalAttr.count / 3);
  
  // Simple corner detection based on vertex density
  innerCorners = Math.floor(verticalWalls * 0.1);
  
  // Suggest strategies based on analysis
  const suggestedStrategies: SurfaceAnalysis["suggestedStrategies"] = {
    roughing: "adaptive",
    finishing: [],
  };
  
  if (flatAreas > faceCount * 0.5) {
    suggestedStrategies.roughing = "raster";
    suggestedStrategies.finishing.push("parallel");
  }
  
  if (verticalWalls > faceCount * 0.2) {
    suggestedStrategies.finishing.push("waterline");
  }
  
  if (innerCorners > 5) {
    suggestedStrategies.finishing.push("pencil");
  }
  
  suggestedStrategies.finishing.push("raster");
  
  return {
    flatAreas,
    steepAreas,
    verticalWalls,
    innerCorners,
    avgSlopeAngle,
    suggestedStrategies,
  };
}

// ======================== TOOLPATH GENERATION ========================

export function generateRoughingToolpath(
  model: Model3D,
  block: MaterialBlock3D,
  operation: Roughing3DOperation,
  tool: Tool3D
): Toolpath3D {
  const points: ToolpathPoint3D[] = [];
  const safeZ = block.height + 5;
  
  const { stepDown, stepOver, stockToLeave } = operation;
  const effectiveStepOver = (tool.diameter * stepOver) / 100;
  const effectiveStepDown = stepDown;
  
  const minX = -block.width / 2 + tool.diameter / 2;
  const maxX = block.width / 2 - tool.diameter / 2;
  const minY = -block.depth / 2 + tool.diameter / 2;
  const maxY = block.depth / 2 - tool.diameter / 2;
  
  // Generate based on strategy
  if (operation.strategy === "raster" || operation.strategy === "z-level") {
    for (let z = block.height; z >= stockToLeave; z -= effectiveStepDown) {
      let direction = 1;
      
      for (let y = minY; y <= maxY; y += effectiveStepOver) {
        const startX = direction === 1 ? minX : maxX;
        const endX = direction === 1 ? maxX : minX;
        
        // Rapid to start
        points.push({ x: startX, y, z: safeZ, type: "rapid" });
        points.push({ x: startX, y, z, type: "rapid" });
        
        // Cut across
        points.push({ x: endX, y, z, type: "linear", feedRate: operation.feedRate });
        
        // Retract
        points.push({ x: endX, y, z: safeZ, type: "rapid" });
        
        direction *= -1;
      }
    }
  } else if (operation.strategy === "offset") {
    for (let z = block.height; z >= stockToLeave; z -= effectiveStepDown) {
      let offset = 0;
      
      while (offset < Math.min(block.width, block.depth) / 2) {
        const x1 = minX + offset;
        const x2 = maxX - offset;
        const y1 = minY + offset;
        const y2 = maxY - offset;
        
        if (x1 >= x2 || y1 >= y2) break;
        
        points.push({ x: x1, y: y1, z: safeZ, type: "rapid" });
        points.push({ x: x1, y: y1, z, type: "rapid" });
        points.push({ x: x2, y: y1, z, type: "linear", feedRate: operation.feedRate });
        points.push({ x: x2, y: y2, z, type: "linear", feedRate: operation.feedRate });
        points.push({ x: x1, y: y2, z, type: "linear", feedRate: operation.feedRate });
        points.push({ x: x1, y: y1, z, type: "linear", feedRate: operation.feedRate });
        
        offset += effectiveStepOver;
      }
    }
  } else if (operation.strategy === "adaptive") {
    // Simplified adaptive - uses trochoidal-like pattern
    for (let z = block.height; z >= stockToLeave; z -= effectiveStepDown) {
      const spiralSteps = Math.floor((maxX - minX) / effectiveStepOver);
      
      for (let i = 0; i < spiralSteps; i++) {
        const x = minX + i * effectiveStepOver;
        const radius = effectiveStepOver / 2;
        
        points.push({ x, y: minY, z: safeZ, type: "rapid" });
        points.push({ x, y: minY, z, type: "rapid" });
        
        for (let y = minY; y <= maxY; y += effectiveStepOver) {
          // Small circular motion for adaptive clearing
          for (let angle = 0; angle <= 360; angle += 45) {
            const rad = (angle * Math.PI) / 180;
            points.push({
              x: x + Math.cos(rad) * radius,
              y: y + Math.sin(rad) * radius,
              z,
              type: "linear",
              feedRate: operation.feedRate,
            });
          }
        }
      }
    }
  }
  
  // Calculate path length and time
  let pathLength = 0;
  let cuttingTime = 0;
  let rapidTime = 0;
  
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const dz = points[i].z - points[i - 1].z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    pathLength += dist;
    
    if (points[i].type === "rapid") {
      rapidTime += dist / 5000; // Assume 5000mm/min rapid
    } else {
      cuttingTime += dist / (points[i].feedRate || operation.feedRate);
    }
  }
  
  return {
    operationId: operation.id,
    points,
    estimatedTime: rapidTime + cuttingTime,
    pathLength,
  };
}

export function generateFinishingToolpath(
  model: Model3D,
  block: MaterialBlock3D,
  operation: Finishing3DOperation,
  tool: Tool3D
): Toolpath3D {
  const points: ToolpathPoint3D[] = [];
  const safeZ = block.height + 5;
  
  const effectiveStepOver = (tool.diameter * operation.stepOver) / 100;
  
  const minX = -block.width / 2 + tool.diameter / 2;
  const maxX = block.width / 2 - tool.diameter / 2;
  const minY = -block.depth / 2 + tool.diameter / 2;
  const maxY = block.depth / 2 - tool.diameter / 2;
  
  if (operation.strategy === "raster" || operation.strategy === "parallel") {
    const angle = operation.rasterAngle || 0;
    const radAngle = (angle * Math.PI) / 180;
    
    let direction = 1;
    for (let y = minY; y <= maxY; y += effectiveStepOver) {
      const startX = direction === 1 ? minX : maxX;
      const endX = direction === 1 ? maxX : minX;
      
      // Sample Z from model along the path
      const steps = Math.ceil((maxX - minX) / 1); // 1mm resolution
      
      points.push({ x: startX, y, z: safeZ, type: "rapid" });
      
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = startX + (endX - startX) * t;
        const z = sampleModelZ(model, x, y, tool);
        
        points.push({
          x,
          y,
          z: Math.max(z, 0),
          type: i === 0 ? "rapid" : "linear",
          feedRate: operation.feedRate,
        });
      }
      
      direction *= -1;
    }
  } else if (operation.strategy === "waterline") {
    const stepDown = operation.waterlineStepDown || 1;
    
    for (let z = block.height; z >= 0; z -= stepDown) {
      // Generate contour at this Z level
      const contourPoints = generateWaterlineContour(model, z, tool);
      
      if (contourPoints.length > 0) {
        points.push({ x: contourPoints[0].x, y: contourPoints[0].y, z: safeZ, type: "rapid" });
        points.push({ x: contourPoints[0].x, y: contourPoints[0].y, z, type: "rapid" });
        
        for (const pt of contourPoints) {
          points.push({ x: pt.x, y: pt.y, z, type: "linear", feedRate: operation.feedRate });
        }
      }
    }
  } else if (operation.strategy === "spiral") {
    const centerX = 0;
    const centerY = 0;
    const maxRadius = Math.min(block.width, block.depth) / 2;
    
    for (let r = effectiveStepOver; r <= maxRadius; r += effectiveStepOver) {
      points.push({ x: centerX + r, y: centerY, z: safeZ, type: "rapid" });
      
      for (let angle = 0; angle <= 360; angle += 5) {
        const rad = (angle * Math.PI) / 180;
        const x = centerX + Math.cos(rad) * r;
        const y = centerY + Math.sin(rad) * r;
        const z = sampleModelZ(model, x, y, tool);
        
        points.push({ x, y, z: Math.max(z, 0), type: "linear", feedRate: operation.feedRate });
      }
    }
  } else if (operation.strategy === "pencil") {
    // Pencil traces inner corners - simplified implementation
    const cornerPoints = detectInnerCorners(model);
    
    for (const corner of cornerPoints) {
      points.push({ x: corner.x, y: corner.y, z: safeZ, type: "rapid" });
      points.push({ x: corner.x, y: corner.y, z: corner.z, type: "rapid" });
      
      // Trace around corner
      for (let angle = 0; angle <= 360; angle += 30) {
        const rad = (angle * Math.PI) / 180;
        const x = corner.x + Math.cos(rad) * tool.diameter;
        const y = corner.y + Math.sin(rad) * tool.diameter;
        points.push({ x, y, z: corner.z, type: "linear", feedRate: operation.feedRate * 0.5 });
      }
    }
  }
  
  // Calculate stats
  let pathLength = 0;
  let estimatedTime = 0;
  
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const dz = points[i].z - points[i - 1].z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    pathLength += dist;
    
    if (points[i].type === "rapid") {
      estimatedTime += dist / 5000;
    } else {
      estimatedTime += dist / (points[i].feedRate || operation.feedRate);
    }
  }
  
  return {
    operationId: operation.id,
    points,
    estimatedTime,
    pathLength,
  };
}

function sampleModelZ(model: Model3D, x: number, y: number, tool: Tool3D): number {
  // Simplified Z sampling - raycasting from top
  const positions = model.vertices;
  let maxZ = 0;
  const toolRadius = tool.diameter / 2;
  
  for (let i = 0; i < positions.length; i += 9) {
    // Check if point is near the sample location
    for (let j = 0; j < 3; j++) {
      const vx = positions[i + j * 3];
      const vy = positions[i + j * 3 + 1];
      const vz = positions[i + j * 3 + 2];
      
      const dx = vx - x;
      const dy = vy - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < toolRadius * 2) {
        // Apply ball-nose compensation
        if (tool.type === "ball-nose" && tool.tipRadius) {
          const offset = Math.sqrt(Math.max(0, tool.tipRadius * tool.tipRadius - dist * dist));
          maxZ = Math.max(maxZ, vz + offset);
        } else {
          maxZ = Math.max(maxZ, vz);
        }
      }
    }
  }
  
  return maxZ;
}

function generateWaterlineContour(
  model: Model3D,
  z: number,
  tool: Tool3D
): { x: number; y: number }[] {
  // Simplified waterline - creates rectangular approximation
  const bbox = model.boundingBox;
  const margin = tool.diameter / 2;
  
  return [
    { x: bbox.min.x - margin, y: bbox.min.y - margin },
    { x: bbox.max.x + margin, y: bbox.min.y - margin },
    { x: bbox.max.x + margin, y: bbox.max.y + margin },
    { x: bbox.min.x - margin, y: bbox.max.y + margin },
    { x: bbox.min.x - margin, y: bbox.min.y - margin },
  ];
}

function detectInnerCorners(model: Model3D): { x: number; y: number; z: number }[] {
  // Simplified corner detection
  const corners: { x: number; y: number; z: number }[] = [];
  const bbox = model.boundingBox;
  
  // Sample corners of bounding box as placeholder
  corners.push(
    { x: bbox.min.x, y: bbox.min.y, z: 0 },
    { x: bbox.max.x, y: bbox.min.y, z: 0 },
    { x: bbox.max.x, y: bbox.max.y, z: 0 },
    { x: bbox.min.x, y: bbox.max.y, z: 0 }
  );
  
  return corners;
}

// ======================== AUTO CAM ========================

export function generateAutoCam3D(
  model: Model3D,
  block: MaterialBlock3D,
  tools: Tool3D[]
): { operations: Operation3D[]; analysis: SurfaceAnalysis } {
  const analysis = analyzeSurface(model);
  const operations: Operation3D[] = [];
  
  // Select tools
  const roughingTool = tools.find((t) => t.type === "flat-end") || tools[0];
  const finishingTool = tools.find((t) => t.type === "ball-nose") || tools[0];
  const detailTool = tools.find((t) => t.diameter <= 3 && t.type === "ball-nose") || finishingTool;
  
  // Create roughing operation
  operations.push({
    id: `rough-${Date.now()}`,
    name: "Desbaste 3D",
    type: "roughing-3d",
    strategy: analysis.suggestedStrategies.roughing,
    toolId: roughingTool.id,
    stepDown: roughingTool.stepDown,
    stepOver: roughingTool.stepOver,
    stockToLeave: 0.5,
    feedRate: roughingTool.feedRate,
    plungeRate: roughingTool.plungeRate,
    spindleSpeed: roughingTool.spindleSpeed,
    enabled: true,
  });
  
  // Create finishing operations based on analysis
  for (const strategy of analysis.suggestedStrategies.finishing) {
    const tool = strategy === "pencil" ? detailTool : finishingTool;
    
    operations.push({
      id: `finish-${strategy}-${Date.now()}`,
      name: `Acabamento ${strategy.charAt(0).toUpperCase() + strategy.slice(1)}`,
      type: "finishing-3d",
      strategy,
      toolId: tool.id,
      stepOver: tool.stepOver,
      feedRate: tool.feedRate,
      plungeRate: tool.plungeRate,
      spindleSpeed: tool.spindleSpeed,
      tolerance: 0.01,
      waterlineStepDown: strategy === "waterline" ? 0.5 : undefined,
      enabled: true,
    });
  }
  
  return { operations, analysis };
}

// ======================== TIME ESTIMATION ========================

export function estimate3DTime(toolpaths: Toolpath3D[]): TimeEstimate3D {
  let roughingTime = 0;
  let finishingTime = 0;
  let rapidTime = 0;
  let cuttingTime = 0;
  
  for (const tp of toolpaths) {
    if (tp.operationId.includes("rough")) {
      roughingTime += tp.estimatedTime;
    } else {
      finishingTime += tp.estimatedTime;
    }
    
    // Estimate rapid vs cutting time
    rapidTime += tp.estimatedTime * 0.2;
    cuttingTime += tp.estimatedTime * 0.8;
  }
  
  return {
    roughingTime,
    finishingTime,
    totalTime: roughingTime + finishingTime,
    rapidTime,
    cuttingTime,
  };
}

// ======================== G-CODE GENERATION ========================

export type PostProcessor = "mach3" | "grbl" | "linuxcnc" | "ddcs";

export function generateGcode3D(
  toolpaths: Toolpath3D[],
  operations: Operation3D[],
  tools: Tool3D[],
  postProcessor: PostProcessor = "grbl"
): string {
  const lines: string[] = [];
  
  // Header
  lines.push("(Generated by Dimension CAM V5)");
  lines.push(`(Post-processor: ${postProcessor.toUpperCase()})`);
  lines.push(`(Date: ${new Date().toISOString()})`);
  lines.push("");
  
  // Initial setup
  if (postProcessor === "grbl") {
    lines.push("G21 ; Metric");
    lines.push("G90 ; Absolute positioning");
    lines.push("G17 ; XY plane");
  } else {
    lines.push("G21");
    lines.push("G90");
    lines.push("G17");
  }
  lines.push("");
  
  // Process each toolpath
  for (const tp of toolpaths) {
    const operation = operations.find((o) => o.id === tp.operationId);
    if (!operation || !operation.enabled) continue;
    
    const tool = tools.find((t) => t.id === operation.toolId);
    
    lines.push(`(Operation: ${operation.name})`);
    if (tool) {
      lines.push(`(Tool: ${tool.name})`);
    }
    lines.push(`M3 S${operation.spindleSpeed}`);
    lines.push("");
    
    for (const point of tp.points) {
      if (point.type === "rapid") {
        lines.push(`G0 X${point.x.toFixed(3)} Y${point.y.toFixed(3)} Z${point.z.toFixed(3)}`);
      } else {
        const feedCmd = point.feedRate ? ` F${point.feedRate}` : "";
        lines.push(`G1 X${point.x.toFixed(3)} Y${point.y.toFixed(3)} Z${point.z.toFixed(3)}${feedCmd}`);
      }
    }
    
    lines.push("");
  }
  
  // Footer
  lines.push("M5 ; Stop spindle");
  lines.push("G0 Z50 ; Safe retract");
  lines.push("G0 X0 Y0 ; Return home");
  lines.push("M30 ; End program");
  
  return lines.join("\n");
}

// ======================== PROJECT FUNCTIONS ========================

export function createProject3D(name: string): Project3D {
  return {
    id: `proj3d-${Date.now()}`,
    name,
    model: null,
    materialBlock: { ...DEFAULT_MATERIAL_BLOCK },
    tools: [...DEFAULT_TOOLS_3D],
    operations: [],
    toolpaths: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function validateProject3D(project: Project3D): string[] {
  const issues: string[] = [];
  
  if (!project.model) {
    issues.push("Nenhum modelo 3D importado");
  }
  
  if (project.operations.length === 0) {
    issues.push("Nenhuma operação definida");
  }
  
  for (const op of project.operations) {
    const tool = project.tools.find((t) => t.id === op.toolId);
    if (!tool) {
      issues.push(`Operação "${op.name}" não tem ferramenta válida`);
    }
  }
  
  if (project.model) {
    const { width, depth, height } = project.model.dimensions;
    const block = project.materialBlock;
    
    if (width > block.width || depth > block.depth || height > block.height) {
      issues.push("Modelo maior que o bloco de material");
    }
  }
  
  return issues;
}
