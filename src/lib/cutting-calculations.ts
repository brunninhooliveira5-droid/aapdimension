/**
 * ══════════════════════════════════════════════════════
 * MÓDULO DE CÁLCULO — ORÇAMENTO DE CORTE CNC
 * ══════════════════════════════════════════════════════
 *
 * FLUXO COMPLETO:
 *   Extração → Velocidade → Tempo → Custo → Preço → Total
 *
 * PRINCÍPIOS:
 *   - Nenhum valor hardcoded: tudo vem do Simulador ou Gestão de Materiais
 *   - Toda fórmula é exposta e documentada
 *   - Lógica independente da UI e do PDF
 *
 * ══════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────
// ORIGENS DO FATOR DE VELOCIDADE
// ─────────────────────────────────────────────────────
export type SpeedFactorOrigin =
  | "Preset Dimension"
  | "Personalizado pelo Admin"
  | "Fallback padrão 1.0";

/**
 * Determina a origem do fator de velocidade com base nos metadados.
 * - Se is_dimension_preset=true e speed_factor === dimension_default_factor → "Preset Dimension"
 * - Se is_dimension_preset=true mas speed_factor !== dimension_default_factor → "Personalizado pelo Admin"
 * - Se speed_factor veio do banco (>0) → "Personalizado pelo Admin"
 * - Se não existe fator cadastrado → "Fallback padrão 1.0"
 */
export function determineSpeedFactorOrigin(
  speedFactor: number,
  isDimensionPreset: boolean,
  dimensionDefaultFactor: number | null,
  hasDbFactor: boolean
): SpeedFactorOrigin {
  if (!hasDbFactor || speedFactor <= 0) return "Fallback padrão 1.0";
  if (isDimensionPreset && dimensionDefaultFactor !== null && speedFactor === dimensionDefaultFactor) {
    return "Preset Dimension";
  }
  if (isDimensionPreset) return "Personalizado pelo Admin";
  return "Personalizado pelo Admin";
}

// ─────────────────────────────────────────────────────
// PRESETS DIMENSION (para seeding e restauração)
// ─────────────────────────────────────────────────────
export const DIMENSION_PRESETS: Record<string, { thicknesses: { value: string; label: string; speedFactor: number }[] }> = {
  "MDF": {
    thicknesses: [
      { value: "3", label: "3 mm", speedFactor: 0.70 },
      { value: "6", label: "6 mm", speedFactor: 0.55 },
      { value: "10", label: "10 mm", speedFactor: 0.35 },
      { value: "15", label: "15 mm", speedFactor: 0.22 },
    ],
  },
  "PVC": {
    thicknesses: [
      { value: "3", label: "3 mm", speedFactor: 0.65 },
      { value: "6", label: "6 mm", speedFactor: 0.50 },
      { value: "10", label: "10 mm", speedFactor: 0.40 },
      { value: "15", label: "15 mm", speedFactor: 0.28 },
    ],
  },
  "Acrílico": {
    thicknesses: [
      { value: "3", label: "3 mm", speedFactor: 0.60 },
      { value: "6", label: "6 mm", speedFactor: 0.45 },
      { value: "10", label: "10 mm", speedFactor: 0.25 },
      { value: "15", label: "15 mm", speedFactor: 0.18 },
    ],
  },
};

// ─────────────────────────────────────────────────────
// ETAPA 2 — VELOCIDADE EFETIVA DE CORTE
// ─────────────────────────────────────────────────────
// Fórmula:
//   effectiveSpeedMMmin = baseSpeedMMmin × speedFactor
//   effectiveSpeedMmin  = effectiveSpeedMMmin / 1000
//
// baseSpeedMMmin: configurado no Simulador de Precificação
// speedFactor:    configurado pelo admin na espessura do material
export function calculateEffectiveSpeed(
  baseSpeedMMmin: number,
  speedFactor: number
): { effectiveSpeedMMmin: number; effectiveSpeedMmin: number; speedFactor: number } {
  const effectiveSpeedMMmin = baseSpeedMMmin * speedFactor;
  const effectiveSpeedMmin = effectiveSpeedMMmin / 1000;
  return { effectiveSpeedMMmin, effectiveSpeedMmin, speedFactor };
}

// ─────────────────────────────────────────────────────
// ETAPA 3 — TEMPO ESTIMADO DE CORTE
// ─────────────────────────────────────────────────────
// Fórmula:
//   estimatedTimeMin = (pathLengthM / effectiveSpeedMmin) × quantidade
export function calculateEstimatedTime(
  pathLengthM: number,
  effectiveSpeedMmin: number,
  quantity: number
): number {
  if (effectiveSpeedMmin <= 0) return 0;
  return (pathLengthM / effectiveSpeedMmin) * quantity;
}

// ─────────────────────────────────────────────────────
// ETAPA 5 — DEFINIÇÃO DE PREÇOS POR MINUTO
// ─────────────────────────────────────────────────────
export function calculatePricePerMinute(
  costPerMinute: number,
  profitMarginPercent: number
): { minPricePerMinute: number; suggestedPricePerMinute: number } {
  const minPricePerMinute = costPerMinute * 1.15;
  const suggestedPricePerMinute = costPerMinute * (1 + profitMarginPercent / 100);
  return { minPricePerMinute, suggestedPricePerMinute };
}

// ─────────────────────────────────────────────────────
// ETAPA 6 — PREÇO DO CORTE (PROCESSO)
// ─────────────────────────────────────────────────────
export function calculateCutCost(
  estimatedTimeMin: number,
  suggestedPricePerMinute: number
): number {
  return estimatedTimeMin * suggestedPricePerMinute;
}

// ─────────────────────────────────────────────────────
// ETAPA 7 — CUSTO DO MATERIAL (INSUMO SEPARADO)
// ─────────────────────────────────────────────────────
export function calculateMaterialCost(
  isUserMaterial: boolean,
  pricePerM2: number,
  areaM2: number,
  quantity: number,
  materialAdjustmentPercent: number
): { baseMaterialCost: number; materialMarkup: number; totalMaterial: number } {
  if (!isUserMaterial) {
    return { baseMaterialCost: 0, materialMarkup: 0, totalMaterial: 0 };
  }
  const baseMaterialCost = pricePerM2 * areaM2 * quantity;
  const materialMarkup = baseMaterialCost * (materialAdjustmentPercent / 100);
  const totalMaterial = baseMaterialCost + materialMarkup;
  return { baseMaterialCost, materialMarkup, totalMaterial };
}

// ─────────────────────────────────────────────────────
// ETAPA 8 — TOTAL FINAL DO ORÇAMENTO
// ─────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────
// VALOR MÍNIMO OPERACIONAL DE CORTE
// ─────────────────────────────────────────────────────
export const MINIMUM_CUT_PRICE = 80;

export function applyMinimumCutPrice(cutCost: number): { finalCutCost: number; minimumApplied: boolean } {
  if (cutCost < MINIMUM_CUT_PRICE) {
    return { finalCutCost: MINIMUM_CUT_PRICE, minimumApplied: true };
  }
  return { finalCutCost: cutCost, minimumApplied: false };
}

export function calculateTotalPrice(cutCost: number, totalMaterial: number): number {
  return cutCost + totalMaterial;
}

// ─────────────────────────────────────────────────────
// RESULTADO CONSOLIDADO DO CÁLCULO
// ─────────────────────────────────────────────────────
export interface QuoteCalculationResult {
  // ETAPA 1 — Extração
  pathLengthMM: number;
  pathLengthM: number;
  bboxWidthMM: number;
  bboxHeightMM: number;
  fileAreaM2: number;

  // ETAPA 2 — Velocidade
  baseSpeedMMmin: number;
  speedFactor: number;
  speedFactorOrigin: SpeedFactorOrigin;
  effectiveSpeedMMmin: number;
  effectiveSpeedMmin: number;

  // ETAPA 3 — Tempo
  estimatedTimeMin: number;

  // ETAPA 4 — Custos
  costPerMinute: number;

  // ETAPA 5 — Preços por minuto
  minPricePerMinute: number;
  suggestedPricePerMinute: number;

  // ETAPA 6 — Preço do corte
  cutCost: number;
  minCutCost: number;

  // Metadados
  fileName: string;
  material: string;
  thickness: string;
  machineName: string;
  quantity: number;
  sheetM2: number;
  pricePerM2: number;
  unitPrice: number;
  svgDiagnosis?: string;
  materialAdjustmentPercent: number;
}

export interface CalculateQuoteInput {
  pathLengthMM: number;
  bboxWidthMM: number;
  bboxHeightMM: number;
  svgDiagnosis?: string;
  fileName: string;
  material: string;
  thickness: string;
  thicknessValue: number;
  machineName: string;
  quantity: number;
  // From simulator
  baseSpeedMMmin: number;
  costPerMinute: number;
  profitMarginPercent: number;
  // From material config
  sheetM2: number;
  pricePerM2: number;
  unitPrice: number;
  materialAdjustmentPercent: number;
  // Speed factor from cutting_material_thicknesses (admin-editable)
  speedFactor: number;
  // Preset metadata
  isDimensionPreset: boolean;
  dimensionDefaultFactor: number | null;
  hasDbFactor: boolean;
}

/**
 * Executa TODAS as etapas do cálculo de orçamento.
 * Retorna resultado consolidado com todos os valores intermediários.
 */
export function calculateQuote(input: CalculateQuoteInput): QuoteCalculationResult {
  const pathLengthM = input.pathLengthMM / 1000;
  const fileAreaM2 = (input.bboxWidthMM * input.bboxHeightMM) / 1_000_000;

  // ETAPA 2 — usa speedFactor do banco; fallback = 1.0
  const speedFactor = input.hasDbFactor && input.speedFactor > 0 ? input.speedFactor : 1.0;
  const speedFactorOrigin = determineSpeedFactorOrigin(
    speedFactor,
    input.isDimensionPreset,
    input.dimensionDefaultFactor,
    input.hasDbFactor
  );

  const { effectiveSpeedMMmin, effectiveSpeedMmin } =
    calculateEffectiveSpeed(input.baseSpeedMMmin, speedFactor);

  // ETAPA 3
  const estimatedTimeMin = calculateEstimatedTime(pathLengthM, effectiveSpeedMmin, input.quantity);

  // ETAPA 5
  const { minPricePerMinute, suggestedPricePerMinute } =
    calculatePricePerMinute(input.costPerMinute, input.profitMarginPercent);

  // ETAPA 6
  const cutCost = calculateCutCost(estimatedTimeMin, suggestedPricePerMinute);
  const minCutCost = calculateCutCost(estimatedTimeMin, minPricePerMinute);

  return {
    pathLengthMM: input.pathLengthMM,
    pathLengthM,
    bboxWidthMM: input.bboxWidthMM,
    bboxHeightMM: input.bboxHeightMM,
    fileAreaM2: Math.round(fileAreaM2 * 10000) / 10000,
    baseSpeedMMmin: input.baseSpeedMMmin,
    speedFactor,
    speedFactorOrigin,
    effectiveSpeedMMmin: Math.round(effectiveSpeedMMmin * 100) / 100,
    effectiveSpeedMmin: Math.round(effectiveSpeedMmin * 10000) / 10000,
    estimatedTimeMin: Math.round(estimatedTimeMin * 100) / 100,
    costPerMinute: input.costPerMinute,
    minPricePerMinute: Math.round(minPricePerMinute * 100) / 100,
    suggestedPricePerMinute: Math.round(suggestedPricePerMinute * 100) / 100,
    cutCost: Math.round(cutCost * 100) / 100,
    minCutCost: Math.round(minCutCost * 100) / 100,
    fileName: input.fileName,
    material: input.material,
    thickness: input.thickness,
    machineName: input.machineName,
    quantity: input.quantity,
    sheetM2: Math.round(input.sheetM2 * 10000) / 10000,
    pricePerM2: Math.round(input.pricePerM2 * 100) / 100,
    unitPrice: Math.round(input.unitPrice * 100) / 100,
    svgDiagnosis: input.svgDiagnosis,
    materialAdjustmentPercent: input.materialAdjustmentPercent,
  };
}
