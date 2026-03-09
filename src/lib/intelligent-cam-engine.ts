// ── Intelligent CAM Engine V6 ──
// Smart automatic CAM with machine analysis, history learning, and intelligent suggestions

import {
  type SvgVector,
  type CncTool,
  type MaterialConfig,
  type ToolpathOperation,
  type MaterialPreset,
  type ValidationIssue,
  type GeometryClass,
  type EntryMode,
  type PocketStrategy,
  type OperationType,
  getPresetById,
  isMetal,
  createDefaultOperation,
  extractPointsFromPath,
  DEFAULT_MATERIAL_PRESETS,
} from "./toolpath-engine";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type QualityLevel = "fast" | "balanced" | "high-quality";
export type WorkType = "cutting" | "pocket" | "engraving" | "mixed" | "auto-detect";
export type MachineRigidity = "light" | "medium" | "heavy";

export interface UserMachine {
  id: string;
  name: string;
  type: "router" | "laser" | "plasma" | "mill";
  spindlePower: number; // Watts
  maxRpm: number;
  rigidity: MachineRigidity;
  workAreaX: number;
  workAreaY: number;
  workAreaZ: number;
  hasAtc: boolean; // Automatic Tool Changer
  hasSnapTool: boolean;
  defaultMaterial?: string;
  notes: string;
}

export interface IntelligentCamInput {
  vectors: SvgVector[];
  material: MaterialConfig;
  tools: CncTool[];
  machine?: UserMachine;
  quality: QualityLevel;
  workType: WorkType;
  customPresets?: MaterialPreset[];
}

export interface GeometryAnalysis {
  totalVectors: number;
  closedVectors: number;
  openVectors: number;
  holes: SvgVector[];
  pockets: SvgVector[];
  islands: SvgVector[];
  innerContours: SvgVector[];
  outerContours: SvgVector[];
  openPaths: SvgVector[];
  smallestRadius: number;
  largestDimension: number;
  hasComplexGeometry: boolean;
  recommendedToolDiameter: number;
  detectedWorkType: WorkType;
}

export interface SmartAlert {
  type: "error" | "warning" | "suggestion" | "info";
  title: string;
  message: string;
  action?: string;
  vectorId?: string;
  operationId?: string;
}

export interface SmartTab {
  vectorId: string;
  positions: { x: number; y: number; angle: number }[];
  count: number;
  width: number;
  height: number;
}

export interface TimeEstimate {
  drilling: number;
  pockets: number;
  innerProfiles: number;
  outerProfiles: number;
  engravings: number;
  total: number;
  breakdown: { operation: string; time: number }[];
}

export interface IntelligentCamResult {
  operations: ToolpathOperation[];
  alerts: SmartAlert[];
  geometryAnalysis: GeometryAnalysis;
  timeEstimate: TimeEstimate;
  smartTabs: SmartTab[];
  recommendedSequence: string[];
  suggestedTool: CncTool | null;
  strategyNotes: string[];
}

export interface CamHistoryEntry {
  id: string;
  timestamp: string;
  materialPreset: string;
  toolId: string;
  toolName: string;
  toolDiameter: number;
  feedXY: number;
  feedZ: number;
  spindleRpm: number;
  workType: WorkType;
  quality: QualityLevel;
  machineId?: string;
  successful: boolean;
}

export interface IntelligentTemplate {
  id: string;
  name: string;
  materialPreset: string;
  thickness: number;
  toolId: string;
  toolSettings: Partial<CncTool>;
  operationDefaults: Partial<ToolpathOperation>;
  quality: QualityLevel;
  workType: WorkType;
  machineId?: string;
  notes: string;
  createdAt: string;
  usageCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const QUALITY_MULTIPLIERS: Record<QualityLevel, { stepOver: number; feedRate: number; depthPerPass: number; finishPasses: number }> = {
  "fast": { stepOver: 1.3, feedRate: 1.2, depthPerPass: 1.3, finishPasses: 0 },
  "balanced": { stepOver: 1.0, feedRate: 1.0, depthPerPass: 1.0, finishPasses: 1 },
  "high-quality": { stepOver: 0.6, feedRate: 0.7, depthPerPass: 0.7, finishPasses: 2 },
};

const MACHINE_RIGIDITY_FACTORS: Record<MachineRigidity, { feedFactor: number; depthFactor: number; maxStepOver: number }> = {
  "light": { feedFactor: 0.6, depthFactor: 0.5, maxStepOver: 35 },
  "medium": { feedFactor: 0.85, depthFactor: 0.8, maxStepOver: 50 },
  "heavy": { feedFactor: 1.0, depthFactor: 1.0, maxStepOver: 65 },
};

// Default machines for users who haven't registered one
export const DEFAULT_MACHINES: UserMachine[] = [
  {
    id: "generic-hobby",
    name: "Router CNC Hobby",
    type: "router",
    spindlePower: 800,
    maxRpm: 24000,
    rigidity: "light",
    workAreaX: 300,
    workAreaY: 400,
    workAreaZ: 50,
    hasAtc: false,
    hasSnapTool: false,
    notes: "Máquina genérica de hobby/iniciante",
  },
  {
    id: "generic-semipro",
    name: "Router CNC Semi-Pro",
    type: "router",
    spindlePower: 2200,
    maxRpm: 24000,
    rigidity: "medium",
    workAreaX: 600,
    workAreaY: 900,
    workAreaZ: 100,
    hasAtc: false,
    hasSnapTool: true,
    notes: "Máquina intermediária/semi-profissional",
  },
  {
    id: "generic-industrial",
    name: "Router CNC Industrial",
    type: "router",
    spindlePower: 5500,
    maxRpm: 18000,
    rigidity: "heavy",
    workAreaX: 1200,
    workAreaY: 2400,
    workAreaZ: 200,
    hasAtc: true,
    hasSnapTool: true,
    notes: "Máquina industrial de alta produção",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// GEOMETRY ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

function computeSmallestInnerRadius(vectors: SvgVector[]): number {
  let minRadius = Infinity;
  
  for (const v of vectors) {
    if (!v.closed || v.geometryClass === "open-path") continue;
    
    const pts = extractPointsFromPath(v.pathData);
    if (pts.length < 3) continue;
    
    // Estimate minimum inner radius from consecutive angles
    for (let i = 1; i < pts.length - 1; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      
      const v1x = p1[0] - p0[0];
      const v1y = p1[1] - p0[1];
      const v2x = p2[0] - p1[0];
      const v2y = p2[1] - p1[1];
      
      const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
      const len2 = Math.sqrt(v2x * v2x + v2y * v2y);
      
      if (len1 < 0.1 || len2 < 0.1) continue;
      
      // Cross product to detect sharp corners
      const cross = v1x * v2y - v1y * v2x;
      const angle = Math.abs(Math.atan2(cross, v1x * v2x + v1y * v2y));
      
      // Estimate inner radius based on angle and segment lengths
      if (angle > Math.PI * 0.3) { // Sharp corner
        const estimatedRadius = Math.min(len1, len2) * 0.5 / Math.tan(angle / 2);
        if (estimatedRadius > 0 && estimatedRadius < minRadius) {
          minRadius = estimatedRadius;
        }
      }
    }
  }
  
  return minRadius === Infinity ? 3 : Math.max(0.5, minRadius);
}

export function analyzeGeometry(vectors: SvgVector[]): GeometryAnalysis {
  const holes = vectors.filter((v) => v.geometryClass === "hole");
  const pockets = vectors.filter((v) => v.geometryClass === "pocket");
  const islands = vectors.filter((v) => v.geometryClass === "island");
  const innerContours = vectors.filter((v) => v.geometryClass === "contour-inner");
  const outerContours = vectors.filter((v) => v.geometryClass === "contour-outer");
  const openPaths = vectors.filter((v) => v.geometryClass === "open-path");
  
  const closedVectors = vectors.filter((v) => v.closed);
  const openVectors = vectors.filter((v) => !v.closed);
  
  // Find smallest inner radius
  const smallestRadius = computeSmallestInnerRadius(vectors);
  
  // Find largest dimension
  let largestDimension = 0;
  for (const v of vectors) {
    const maxDim = Math.max(v.boundingBox.w, v.boundingBox.h);
    if (maxDim > largestDimension) largestDimension = maxDim;
  }
  
  // Detect work type based on geometry distribution
  let detectedWorkType: WorkType = "mixed";
  const totalClosed = closedVectors.length;
  
  if (openVectors.length > totalClosed * 0.7) {
    detectedWorkType = "engraving";
  } else if (pockets.length > totalClosed * 0.5) {
    detectedWorkType = "pocket";
  } else if (outerContours.length === totalClosed && pockets.length === 0 && innerContours.length === 0) {
    detectedWorkType = "cutting";
  } else {
    detectedWorkType = "mixed";
  }
  
  // Check for complex geometry (many small details, islands, etc.)
  const hasComplexGeometry = islands.length > 3 || 
    (innerContours.length > 5) || 
    (smallestRadius < 2) ||
    (vectors.length > 50);
  
  // Recommend tool diameter based on smallest radius
  const recommendedToolDiameter = Math.min(smallestRadius * 2 * 0.8, 6);
  
  return {
    totalVectors: vectors.length,
    closedVectors: closedVectors.length,
    openVectors: openVectors.length,
    holes,
    pockets,
    islands,
    innerContours,
    outerContours,
    openPaths,
    smallestRadius,
    largestDimension,
    hasComplexGeometry,
    recommendedToolDiameter: Math.max(1, recommendedToolDiameter),
    detectedWorkType,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SMART TOOL SELECTION
// ═══════════════════════════════════════════════════════════════════════════

export function selectSmartTool(
  analysis: GeometryAnalysis,
  tools: CncTool[],
  preset: MaterialPreset | undefined,
  quality: QualityLevel
): CncTool | null {
  if (tools.length === 0) return null;
  
  const maxDiameter = analysis.recommendedToolDiameter;
  const metalMaterial = preset ? isMetal(preset.category) : false;
  
  // Filter tools that fit the geometry
  let candidates = tools.filter((t) => t.diameter <= maxDiameter + 0.5);
  
  // If no tools fit, use the smallest available
  if (candidates.length === 0) {
    candidates = [...tools].sort((a, b) => a.diameter - b.diameter);
    return candidates[0];
  }
  
  // For metals, prefer coated tools
  if (metalMaterial) {
    const coated = candidates.filter((t) => t.coating);
    if (coated.length > 0) candidates = coated;
  }
  
  // For high quality, prefer finishing or ball-nose tools
  if (quality === "high-quality") {
    const finishing = candidates.filter((t) => t.type === "finishing" || t.type === "ball-nose");
    if (finishing.length > 0) return finishing[0];
  }
  
  // For pockets, prefer flat-end tools
  if (analysis.detectedWorkType === "pocket") {
    const flatEnd = candidates.filter((t) => t.type === "flat-end" || t.type === "straight");
    if (flatEnd.length > 0) candidates = flatEnd;
  }
  
  // For engraving, prefer V-bits or small tools
  if (analysis.detectedWorkType === "engraving") {
    const vbits = candidates.filter((t) => t.type === "v-bit");
    if (vbits.length > 0) return vbits[0];
    candidates = candidates.sort((a, b) => a.diameter - b.diameter);
  }
  
  // Return largest fitting tool for efficiency
  return candidates.sort((a, b) => b.diameter - a.diameter)[0];
}

// ═══════════════════════════════════════════════════════════════════════════
// SMART TAB PLACEMENT
// ═══════════════════════════════════════════════════════════════════════════

function computeSmartTabs(vectors: SvgVector[], material: MaterialConfig, metalMaterial: boolean): SmartTab[] {
  const outerContours = vectors.filter((v) => v.geometryClass === "contour-outer");
  const smartTabs: SmartTab[] = [];
  
  for (const contour of outerContours) {
    const pts = extractPointsFromPath(contour.pathData);
    if (pts.length < 4) continue;
    
    const perimeter = contour.perimeter || computePerimeter(pts);
    
    // Calculate number of tabs based on perimeter and piece size
    const pieceArea = contour.area || (contour.boundingBox.w * contour.boundingBox.h);
    const baseTabCount = Math.max(3, Math.min(8, Math.ceil(perimeter / 80)));
    const tabCount = pieceArea > 10000 ? baseTabCount + 1 : baseTabCount;
    
    // Find good tab positions (avoid corners and holes)
    const positions: { x: number; y: number; angle: number }[] = [];
    const segmentLength = perimeter / tabCount;
    
    let accumulatedLength = segmentLength / 2; // Start halfway
    let currentLength = 0;
    
    for (let i = 0; i < pts.length - 1 && positions.length < tabCount; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      const segLen = Math.sqrt(dx * dx + dy * dy);
      
      // Check if we should place a tab in this segment
      while (currentLength + segLen > accumulatedLength && positions.length < tabCount) {
        const t = (accumulatedLength - currentLength) / segLen;
        const x = p1[0] + dx * t;
        const y = p1[1] + dy * t;
        const angle = Math.atan2(dy, dx);
        
        // Check if this position is not near a corner (sharp angle)
        const isNearCorner = i > 0 && i < pts.length - 2;
        if (!isNearCorner || Math.abs(angle) < Math.PI * 0.3) {
          positions.push({ x, y, angle });
        }
        
        accumulatedLength += segmentLength;
      }
      
      currentLength += segLen;
    }
    
    smartTabs.push({
      vectorId: contour.id,
      positions,
      count: positions.length,
      width: metalMaterial ? 3 : 5,
      height: metalMaterial ? Math.min(1, material.thickness * 0.15) : Math.min(2, material.thickness * 0.2),
    });
  }
  
  return smartTabs;
}

function computePerimeter(points: [number, number][]): number {
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1][0] - points[i][0];
    const dy = points[i + 1][1] - points[i][1];
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

// ═══════════════════════════════════════════════════════════════════════════
// SMART ALERTS
// ═══════════════════════════════════════════════════════════════════════════

function generateSmartAlerts(
  analysis: GeometryAnalysis,
  tool: CncTool | null,
  preset: MaterialPreset | undefined,
  machine: UserMachine | undefined,
  material: MaterialConfig
): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const metalMaterial = preset ? isMetal(preset.category) : false;
  const hardMetal = preset?.category === "hard-metal";
  
  // Tool vs geometry
  if (tool && tool.diameter > analysis.smallestRadius * 2) {
    alerts.push({
      type: "error",
      title: "Ferramenta muito grande",
      message: `A ferramenta de ${tool.diameter}mm não alcança os cantos internos desta geometria (raio mínimo: ${analysis.smallestRadius.toFixed(1)}mm).`,
      action: `Use uma ferramenta de no máximo ${(analysis.smallestRadius * 2 * 0.8).toFixed(1)}mm.`,
    });
  }
  
  // Plunge in metal
  if (metalMaterial && tool) {
    alerts.push({
      type: "warning",
      title: "Material metálico detectado",
      message: "Para este material, é recomendado usar entrada helicoidal ao invés de plunge direto.",
      action: "Entrada helicoidal será aplicada automaticamente.",
    });
  }
  
  // Hard metal specific
  if (hardMetal) {
    alerts.push({
      type: "suggestion",
      title: "Metal duro detectado",
      message: "Fresamento trocoidal e passadas de acabamento serão aplicados para melhor qualidade e vida útil da ferramenta.",
    });
  }
  
  // Depth vs flute length
  if (tool && material.thickness > tool.fluteLength) {
    alerts.push({
      type: "error",
      title: "Profundidade excessiva",
      message: `A profundidade do material (${material.thickness}mm) excede o comprimento de corte da ferramenta (${tool.fluteLength}mm).`,
      action: "Use uma ferramenta com maior comprimento de corte ou reduza a profundidade.",
    });
  }
  
  // Coolant warning
  if (preset?.coolantRequired) {
    alerts.push({
      type: "warning",
      title: "Refrigeração necessária",
      message: `O material ${preset.name} requer refrigeração durante a usinagem.`,
    });
  }
  
  // Outer contours without tabs
  if (analysis.outerContours.length > 0) {
    alerts.push({
      type: "info",
      title: "Peças externas detectadas",
      message: `${analysis.outerContours.length} contorno(s) externo(s) detectados. Tabs serão adicionados automaticamente para segurar as peças.`,
    });
  }
  
  // Machine area check
  if (machine) {
    if (analysis.largestDimension > Math.max(machine.workAreaX, machine.workAreaY)) {
      alerts.push({
        type: "error",
        title: "Peça maior que área útil",
        message: `A maior dimensão da peça (${analysis.largestDimension.toFixed(0)}mm) excede a área útil da máquina (${machine.workAreaX}x${machine.workAreaY}mm).`,
      });
    }
    
    if (material.thickness > machine.workAreaZ) {
      alerts.push({
        type: "error",
        title: "Material mais espesso que curso Z",
        message: `A espessura do material (${material.thickness}mm) excede o curso Z da máquina (${machine.workAreaZ}mm).`,
      });
    }
    
    // RPM check
    if (preset && preset.spindleRpm > machine.maxRpm) {
      alerts.push({
        type: "warning",
        title: "RPM recomendado excede máximo da máquina",
        message: `O RPM recomendado (${preset.spindleRpm}) excede o máximo da máquina (${machine.maxRpm}). Será ajustado automaticamente.`,
      });
    }
  }
  
  // Light machine warning
  if (machine?.rigidity === "light" && metalMaterial) {
    alerts.push({
      type: "warning",
      title: "Máquina leve para metal",
      message: "Sua máquina tem rigidez classificada como leve. Parâmetros mais conservadores serão aplicados para metais.",
    });
  }
  
  // Complex geometry
  if (analysis.hasComplexGeometry) {
    alerts.push({
      type: "info",
      title: "Geometria complexa detectada",
      message: "O arquivo contém geometria complexa. Recomenda-se revisar as operações geradas antes de prosseguir.",
    });
  }
  
  // Open paths that might be cuts
  if (analysis.openPaths.length > 0) {
    alerts.push({
      type: "info",
      title: "Caminhos abertos detectados",
      message: `${analysis.openPaths.length} caminho(s) aberto(s) detectados. Serão tratados como gravação/rasgo.`,
    });
  }
  
  return alerts;
}

// ═══════════════════════════════════════════════════════════════════════════
// TIME ESTIMATION
// ═══════════════════════════════════════════════════════════════════════════

function estimateMachiningTime(
  analysis: GeometryAnalysis,
  operations: ToolpathOperation[],
  tools: CncTool[],
  material: MaterialConfig
): TimeEstimate {
  const breakdown: { operation: string; time: number }[] = [];
  let drilling = 0, pockets = 0, innerProfiles = 0, outerProfiles = 0, engravings = 0;
  
  for (const op of operations) {
    const tool = tools.find((t) => t.id === op.toolId);
    if (!tool) continue;
    
    const feedXY = tool.feedXY || 1000;
    const feedZ = tool.feedZ || 200;
    const depthPerPass = op.depthPerPass || tool.depthPerPass || 1;
    const totalDepth = Math.abs(op.finalDepth - op.startDepth);
    const passes = Math.ceil(totalDepth / depthPerPass);
    
    // Get vectors for this operation
    const opVectors = analysis.totalVectors > 0 
      ? op.vectorIds.map((id) => {
          const allVectors = [...analysis.holes, ...analysis.pockets, ...analysis.innerContours, 
                              ...analysis.outerContours, ...analysis.openPaths, ...analysis.islands];
          return allVectors.find((v) => v.id === id);
        }).filter(Boolean) as SvgVector[]
      : [];
    
    let totalPathLength = 0;
    for (const v of opVectors) {
      totalPathLength += v.perimeter || (v.boundingBox.w * 2 + v.boundingBox.h * 2);
    }
    
    // Calculate time in minutes
    let opTime = 0;
    
    if (op.type === "drill") {
      // Drilling: consider plunge and retract
      const plungeTime = (totalDepth / feedZ) * opVectors.length;
      const rapidTime = opVectors.length * 0.1; // Rapid moves between holes
      opTime = plungeTime + rapidTime;
      drilling += opTime;
    } else if (op.type === "pocket" || op.type === "adaptive" || op.type === "trochoidal" || op.type === "spiral-pocket") {
      // Pocket: area-based estimation
      let totalArea = 0;
      for (const v of opVectors) {
        totalArea += v.area || (v.boundingBox.w * v.boundingBox.h * 0.8);
      }
      const stepOver = tool.stepOver / 100 * tool.diameter;
      const pathsNeeded = totalArea / (stepOver * (totalDepth / passes));
      opTime = (pathsNeeded / feedXY) * passes;
      pockets += opTime;
    } else if (op.type === "profile-inside" || op.type === "finishing") {
      opTime = (totalPathLength * passes / feedXY);
      innerProfiles += opTime;
    } else if (op.type === "profile-outside" || op.type === "roughing") {
      opTime = (totalPathLength * passes / feedXY);
      outerProfiles += opTime;
    } else {
      // Engraving / on-line
      opTime = (totalPathLength / feedXY);
      engravings += opTime;
    }
    
    breakdown.push({ operation: op.name, time: opTime });
  }
  
  const total = drilling + pockets + innerProfiles + outerProfiles + engravings;
  
  return {
    drilling,
    pockets,
    innerProfiles,
    outerProfiles,
    engravings,
    total,
    breakdown,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN INTELLIGENT CAM GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

export function generateIntelligentCam(input: IntelligentCamInput): IntelligentCamResult {
  const { vectors, material, tools, machine, quality, workType, customPresets = [] } = input;
  
  const preset = getPresetById(material.presetId, customPresets);
  const metalMaterial = preset ? isMetal(preset.category) : false;
  const hardMetal = preset?.category === "hard-metal";
  
  // Quality and machine modifiers
  const qualityMod = QUALITY_MULTIPLIERS[quality];
  const machineMod = machine ? MACHINE_RIGIDITY_FACTORS[machine.rigidity] : MACHINE_RIGIDITY_FACTORS["medium"];
  
  // Analyze geometry
  const analysis = analyzeGeometry(vectors);
  
  // Determine effective work type
  const effectiveWorkType = workType === "auto-detect" ? analysis.detectedWorkType : workType;
  
  // Select best tool
  const suggestedTool = selectSmartTool(analysis, tools, preset, quality);
  
  // Generate smart alerts
  const alerts = generateSmartAlerts(analysis, suggestedTool, preset, machine, material);
  
  // Compute smart tabs
  const smartTabs = computeSmartTabs(vectors, material, metalMaterial);
  
  // Generate operations
  const operations: ToolpathOperation[] = [];
  const strategyNotes: string[] = [];
  let order = 1;
  
  // Calculate effective parameters
  const baseDepthPerPass = preset ? preset.stepDown : (suggestedTool?.depthPerPass || 2);
  const baseFeedXY = preset ? preset.feedXY : (suggestedTool?.feedXY || 1200);
  const baseFeedZ = preset ? preset.feedZ : (suggestedTool?.feedZ || 300);
  const baseRpm = preset ? preset.spindleRpm : (suggestedTool?.spindleRpm || 18000);
  
  const effectiveDepthPerPass = baseDepthPerPass * qualityMod.depthPerPass * machineMod.depthFactor;
  const effectiveFeedXY = Math.min(baseFeedXY * qualityMod.feedRate * machineMod.feedFactor, machine?.maxRpm ? baseFeedXY : 10000);
  const effectiveRpm = Math.min(baseRpm, machine?.maxRpm || 24000);
  const effectiveStepOver = Math.min((preset?.stepOver || 45) * qualityMod.stepOver, machineMod.maxStepOver);
  
  // Entry mode based on material
  const entryMode: EntryMode = metalMaterial ? "ramp-helicoidal" : (preset?.entryMode || "ramp-linear");
  const pocketStrategy: PocketStrategy = hardMetal ? "trochoidal" : (metalMaterial ? "helical" : (preset?.pocketStrategy || "standard"));
  
  // Create operation factory
  const makeOp = (
    name: string,
    type: OperationType,
    vectorIds: string[],
    cutSide: "inside" | "outside" | "on-line",
    tool: CncTool | null,
    useTabs: boolean,
    isFinishing = false
  ): ToolpathOperation => {
    const t = tool || suggestedTool;
    const op = createDefaultOperation(order++);
    
    return {
      ...op,
      name,
      type,
      vectorIds,
      toolId: t?.id || "",
      startDepth: 0,
      finalDepth: material.thickness,
      depthPerPass: isFinishing ? Math.min(effectiveDepthPerPass, 0.5) : effectiveDepthPerPass,
      cutSide,
      cutDirection: "climb",
      leadIn: { type: metalMaterial ? "arc" : "none", radius: 3, length: 3 },
      leadOut: { type: metalMaterial ? "arc" : "none", radius: 3, length: 3 },
      entry: {
        mode: type === "drill" ? (metalMaterial ? "ramp-helicoidal" : "plunge") : entryMode,
        rampLength: metalMaterial ? 15 : 10,
        rampAngle: metalMaterial ? 3 : 5,
        helixDiameter: t ? Math.max(t.diameter * 0.8, 2) : 5,
        helixPitchPerRev: effectiveDepthPerPass * 0.5,
      },
      tabs: useTabs ? {
        enabled: true,
        count: smartTabs.find((st) => vectorIds.includes(st.vectorId))?.count || 4,
        width: metalMaterial ? 3 : 5,
        height: metalMaterial ? 1 : 2,
        minDistance: 30,
      } : { enabled: false, count: 4, width: 5, height: 2, minDistance: 30 },
      rampEntry: entryMode !== "plunge",
      pocketStrategy: type === "pocket" || type === "adaptive" || type === "trochoidal" ? pocketStrategy : "standard",
      roughFinish: metalMaterial ? {
        stockToLeaveSide: 0.2,
        stockToLeaveBottom: 0.1,
        finishPassSide: true,
        finishPassBottom: true,
        finishFeedRate: effectiveFeedXY * 0.5,
      } : {
        stockToLeaveSide: 0,
        stockToLeaveBottom: 0,
        finishPassSide: false,
        finishPassBottom: false,
        finishFeedRate: 800,
      },
      trochoidal: hardMetal && (type === "pocket" || type === "trochoidal") ? {
        enabled: true,
        radius: t ? t.diameter * 0.1 : 0.5,
        stepDistance: t ? t.diameter * 0.8 : 2,
        feedRate: effectiveFeedXY,
      } : { enabled: false, radius: 1, stepDistance: 2, feedRate: 800 },
      adaptive: metalMaterial && type === "adaptive" ? {
        enabled: true,
        maxStepOver: effectiveStepOver,
        maxEngagementAngle: 90,
        minWallDistance: 0.5,
        stockToLeaveSide: 0.15,
      } : { enabled: false, maxStepOver: 40, maxEngagementAngle: 90, minWallDistance: 0.5, stockToLeaveSide: 0.1 },
    };
  };
  
  // ══════════════════════════════════════════════════════════
  // OPERATION SEQUENCE (optimized order)
  // ══════════════════════════════════════════════════════════
  
  const recommendedSequence: string[] = [];
  
  // 1. Drilling first
  if (analysis.holes.length > 0) {
    operations.push(makeOp(
      `Furação Inteligente (${analysis.holes.length})`,
      "drill",
      analysis.holes.map((h) => h.id),
      "on-line",
      suggestedTool,
      false
    ));
    recommendedSequence.push("Furação");
    strategyNotes.push(`Furação de ${analysis.holes.length} furos com ${metalMaterial ? "entrada helicoidal" : "plunge direto"}.`);
  }
  
  // 2. Pockets
  if (analysis.pockets.length > 0) {
    if (hardMetal) {
      operations.push(makeOp(
        `Pocket Trocoidal (${analysis.pockets.length})`,
        "trochoidal",
        analysis.pockets.map((p) => p.id),
        "inside",
        suggestedTool,
        false
      ));
      recommendedSequence.push("Pocket Trocoidal");
      strategyNotes.push(`Fresamento trocoidal para metal duro - reduz desgaste da ferramenta.`);
    } else if (metalMaterial) {
      operations.push(makeOp(
        `Adaptive Roughing (${analysis.pockets.length})`,
        "adaptive",
        analysis.pockets.map((p) => p.id),
        "inside",
        suggestedTool,
        false
      ));
      recommendedSequence.push("Desbaste Adaptativo");
      strategyNotes.push(`Desbaste adaptativo para metal - engajamento constante da ferramenta.`);
    } else {
      const pocketType = quality === "fast" ? "pocket" : "spiral-pocket";
      operations.push(makeOp(
        `Pocket ${quality === "fast" ? "Rápido" : "Espiral"} (${analysis.pockets.length})`,
        pocketType,
        analysis.pockets.map((p) => p.id),
        "inside",
        suggestedTool,
        false
      ));
      recommendedSequence.push("Pocket");
      strategyNotes.push(`Pocket ${quality === "fast" ? "padrão" : "espiral"} para ${preset?.name || "material"}.`);
    }
    
    // Add finishing pass for metals or high quality
    if (metalMaterial || quality === "high-quality") {
      const finishTool = tools.find((t) => t.type === "finishing") || suggestedTool;
      operations.push(makeOp(
        `Acabamento Pocket`,
        "finishing",
        analysis.pockets.map((p) => p.id),
        "inside",
        finishTool,
        false,
        true
      ));
      recommendedSequence.push("Acabamento Pocket");
    }
  }
  
  // 3. Inner contours
  if (analysis.innerContours.length > 0) {
    operations.push(makeOp(
      `Perfil Interno (${analysis.innerContours.length})`,
      "profile-inside",
      analysis.innerContours.map((c) => c.id),
      "inside",
      suggestedTool,
      false
    ));
    recommendedSequence.push("Perfil Interno");
    strategyNotes.push(`Contornos internos processados antes dos externos para manter rigidez.`);
    
    // Finishing for metals
    if (metalMaterial) {
      operations.push(makeOp(
        `Acabamento Interno`,
        "finishing",
        analysis.innerContours.map((c) => c.id),
        "inside",
        suggestedTool,
        false,
        true
      ));
      recommendedSequence.push("Acabamento Interno");
    }
  }
  
  // 4. Open paths / engraving
  if (analysis.openPaths.length > 0) {
    const vbitTool = tools.find((t) => t.type === "v-bit") || suggestedTool;
    operations.push(makeOp(
      `Gravação/Rasgo (${analysis.openPaths.length})`,
      "on-line",
      analysis.openPaths.map((o) => o.id),
      "on-line",
      vbitTool,
      false
    ));
    recommendedSequence.push("Gravação/Rasgo");
  }
  
  // 5. Outer contours (last - to maintain workpiece rigidity)
  if (analysis.outerContours.length > 0) {
    // Roughing pass for metals
    if (metalMaterial) {
      operations.push(makeOp(
        `Desbaste Externo (${analysis.outerContours.length})`,
        "roughing",
        analysis.outerContours.map((c) => c.id),
        "outside",
        suggestedTool,
        false
      ));
      recommendedSequence.push("Desbaste Externo");
    }
    
    operations.push(makeOp(
      `Perfil Externo (${analysis.outerContours.length})`,
      "profile-outside",
      analysis.outerContours.map((c) => c.id),
      "outside",
      suggestedTool,
      true // Add tabs
    ));
    recommendedSequence.push("Perfil Externo");
    strategyNotes.push(`Contornos externos com tabs automáticos para segurar peças.`);
    
    // Finishing pass
    if (metalMaterial || quality === "high-quality") {
      operations.push(makeOp(
        `Acabamento Externo`,
        "finishing",
        analysis.outerContours.map((c) => c.id),
        "outside",
        suggestedTool,
        true,
        true
      ));
      recommendedSequence.push("Acabamento Externo");
    }
  }
  
  // Add strategy notes based on settings
  if (machine?.rigidity === "light") {
    strategyNotes.push(`Parâmetros reduzidos para máquina de rigidez leve (avanço ${(machineMod.feedFactor * 100).toFixed(0)}%, profundidade ${(machineMod.depthFactor * 100).toFixed(0)}%).`);
  }
  
  if (quality === "high-quality") {
    strategyNotes.push(`Modo alta qualidade: step-over reduzido (${effectiveStepOver.toFixed(0)}%), avanço conservador.`);
  } else if (quality === "fast") {
    strategyNotes.push(`Modo rápido: parâmetros agressivos para menor tempo de usinagem.`);
  }
  
  // Time estimation
  const timeEstimate = estimateMachiningTime(analysis, operations, tools, material);
  
  return {
    operations,
    alerts,
    geometryAnalysis: analysis,
    timeEstimate,
    smartTabs,
    recommendedSequence,
    suggestedTool,
    strategyNotes,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HISTORY & LEARNING
// ═══════════════════════════════════════════════════════════════════════════

const HISTORY_STORAGE_KEY = "intelligent-cam-history";
const TEMPLATES_STORAGE_KEY = "intelligent-cam-templates";
const MAX_HISTORY_ENTRIES = 50;

export function getCamHistory(): CamHistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addCamHistoryEntry(entry: Omit<CamHistoryEntry, "id" | "timestamp">): void {
  const history = getCamHistory();
  const newEntry: CamHistoryEntry = {
    ...entry,
    id: `hist-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  
  history.unshift(newEntry);
  if (history.length > MAX_HISTORY_ENTRIES) {
    history.pop();
  }
  
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
}

export function getHistorySuggestion(materialPreset: string): Partial<CncTool> | null {
  const history = getCamHistory();
  const relevant = history.filter((h) => h.materialPreset === materialPreset && h.successful);
  
  if (relevant.length === 0) return null;
  
  // Calculate averages from successful history
  const avgFeedXY = relevant.reduce((sum, h) => sum + h.feedXY, 0) / relevant.length;
  const avgFeedZ = relevant.reduce((sum, h) => sum + h.feedZ, 0) / relevant.length;
  const avgRpm = relevant.reduce((sum, h) => sum + h.spindleRpm, 0) / relevant.length;
  
  // Find most common tool
  const toolCounts: Record<string, number> = {};
  for (const h of relevant) {
    toolCounts[h.toolId] = (toolCounts[h.toolId] || 0) + 1;
  }
  const mostUsedToolId = Object.entries(toolCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  
  return {
    feedXY: Math.round(avgFeedXY),
    feedZ: Math.round(avgFeedZ),
    spindleRpm: Math.round(avgRpm),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// INTELLIGENT TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export function getIntelligentTemplates(): IntelligentTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(TEMPLATES_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveIntelligentTemplate(template: Omit<IntelligentTemplate, "id" | "createdAt" | "usageCount">): IntelligentTemplate {
  const templates = getIntelligentTemplates();
  const newTemplate: IntelligentTemplate = {
    ...template,
    id: `tpl-${Date.now()}`,
    createdAt: new Date().toISOString(),
    usageCount: 0,
  };
  
  templates.push(newTemplate);
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  
  return newTemplate;
}

export function useTemplate(templateId: string): IntelligentTemplate | null {
  const templates = getIntelligentTemplates();
  const template = templates.find((t) => t.id === templateId);
  
  if (template) {
    template.usageCount++;
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  }
  
  return template || null;
}

export function deleteIntelligentTemplate(templateId: string): void {
  const templates = getIntelligentTemplates();
  const filtered = templates.filter((t) => t.id !== templateId);
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(filtered));
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_INTELLIGENT_TEMPLATES: Omit<IntelligentTemplate, "id" | "createdAt" | "usageCount">[] = [
  {
    name: "MDF 15mm Corte Padrão",
    materialPreset: "mdf",
    thickness: 15,
    toolId: "t2",
    toolSettings: { feedXY: 2500, feedZ: 800, spindleRpm: 18000 },
    operationDefaults: { depthPerPass: 4 },
    quality: "balanced",
    workType: "cutting",
    notes: "Configuração otimizada para corte de MDF 15mm",
  },
  {
    name: "ACM 3mm",
    materialPreset: "acm",
    thickness: 3,
    toolId: "t1",
    toolSettings: { feedXY: 2000, feedZ: 500, spindleRpm: 16000 },
    operationDefaults: { depthPerPass: 1.5 },
    quality: "balanced",
    workType: "cutting",
    notes: "Corte de ACM com avanço moderado",
  },
  {
    name: "Alumínio Pocket Helicoidal",
    materialPreset: "aluminio",
    thickness: 6,
    toolId: "t7",
    toolSettings: { feedXY: 800, feedZ: 200, spindleRpm: 12000 },
    operationDefaults: { depthPerPass: 0.5 },
    quality: "high-quality",
    workType: "pocket",
    notes: "Pocket em alumínio com entrada helicoidal",
  },
  {
    name: "Acrílico Alta Qualidade",
    materialPreset: "acrilico",
    thickness: 10,
    toolId: "t1",
    toolSettings: { feedXY: 1200, feedZ: 300, spindleRpm: 12000 },
    operationDefaults: { depthPerPass: 1 },
    quality: "high-quality",
    workType: "cutting",
    notes: "Acabamento premium em acrílico",
  },
];
