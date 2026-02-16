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
// ETAPA 2 — FATOR DE VELOCIDADE POR ESPESSURA
// ─────────────────────────────────────────────────────
// O fator é configurado pelo administrador na aba Materiais,
// dentro de cada espessura cadastrada (campo "Fator Velocidade").
//
// Valores sugeridos por padrão ao criar uma espessura:
// | Espessura   | Fator |
// |-------------|-------|
// | ≤ 1mm       | 1.00  |
// | ≤ 3mm       | 0.70  |
// | ≤ 6mm       | 0.45  |
// | ≤ 10mm      | 0.30  |
// | ≤ 15mm      | 0.20  |
// | > 15mm      | 0.12  |
//
// O fator é sempre lido do banco de dados (cutting_material_thicknesses.speed_factor).
// A função abaixo é mantida apenas como fallback para espessuras sem fator configurado.
export function getDefaultSpeedFactor(thicknessMM: number): number {
  if (thicknessMM <= 1) return 1;
  if (thicknessMM <= 3) return 0.7;
  if (thicknessMM <= 6) return 0.45;
  if (thicknessMM <= 10) return 0.3;
  if (thicknessMM <= 15) return 0.2;
  return 0.12;
}

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
//
// pathLengthM:        comprimento total extraído do arquivo (metros)
// effectiveSpeedMmin: velocidade efetiva (metros/min)
// quantity:           número de passadas/peças
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
// Fórmulas:
//   minPricePerMinute       = costPerMinute × 1.15 (sustentável, 15% acima do custo)
//   suggestedPricePerMinute = costPerMinute × (1 + margem_lucro / 100)
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
// Fórmula:
//   cutCost = estimatedTimeMin × suggestedPricePerMinute
//
// NÃO aplica ajuste de material sobre o tempo.
export function calculateCutCost(
  estimatedTimeMin: number,
  suggestedPricePerMinute: number
): number {
  return estimatedTimeMin * suggestedPricePerMinute;
}

// ─────────────────────────────────────────────────────
// ETAPA 7 — CUSTO DO MATERIAL (INSUMO SEPARADO)
// ─────────────────────────────────────────────────────
// Se material do cliente: materialCost = 0
// Se "Meu Material":
//   materialCost   = pricePerM2 × areaM2 × quantity
//   materialMarkup = materialCost × (ajuste_material% / 100)
//   totalMaterial   = materialCost + materialMarkup
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
// Fórmula:
//   totalPrice = cutCost + totalMaterial
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
}

/**
 * Executa TODAS as etapas do cálculo de orçamento.
 * Retorna resultado consolidado com todos os valores intermediários.
 */
export function calculateQuote(input: CalculateQuoteInput): QuoteCalculationResult {
  const pathLengthM = input.pathLengthMM / 1000;
  const fileAreaM2 = (input.bboxWidthMM * input.bboxHeightMM) / 1_000_000;

  // ETAPA 2 — usa speedFactor do banco (admin-editável)
  const speedFactor = input.speedFactor > 0 ? input.speedFactor : getDefaultSpeedFactor(input.thicknessValue);
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
