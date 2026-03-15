// ── Wizard Engine for Centro e Quinas ──
// Manages step flow, validation, and mode-specific step generation

import type { LocationMode, ZProbeMode, ProbeType, CenterCornersConfig } from "./center-corners-engine";

export interface WizardStep {
  key: string;
  label: string;
  description: string;
  icon: string; // lucide icon name
  isOptional?: boolean;
  isVisible: (cfg: Partial<CenterCornersConfig>) => boolean;
}

const COMMON_STEPS: WizardStep[] = [
  {
    key: "mode",
    label: "Tipo",
    description: "Escolha o tipo de localização que deseja realizar.",
    icon: "crosshair",
    isVisible: () => true,
  },
  {
    key: "touchX",
    label: "Toque X",
    description: "Agora escolha a distância do primeiro toque lateral.",
    icon: "move-horizontal",
    isVisible: () => true,
  },
  {
    key: "touchY",
    label: "Toque Y",
    description: "Agora defina o toque no eixo Y (frontal).",
    icon: "move-vertical",
    isVisible: () => true,
  },
  {
    key: "safeZ",
    label: "Altura Z",
    description: "Agora defina a altura segura acima da peça.",
    icon: "arrow-up",
    isVisible: () => true,
  },
  {
    key: "refine",
    label: "Conferência",
    description: "Agora configure a conferência para mais precisão.",
    icon: "shield-check",
    isOptional: true,
    isVisible: () => true,
  },
  {
    key: "probeZ",
    label: "Probe Z",
    description: "Configure o toque vertical para medir a altura.",
    icon: "arrow-down",
    isOptional: true,
    isVisible: () => true,
  },
  {
    key: "custom",
    label: "Probe Custom",
    description: "Configure o probe personalizado, se necessário.",
    icon: "wrench",
    isOptional: true,
    isVisible: () => true,
  },
  {
    key: "apply",
    label: "Aplicar",
    description: "Revise e aplique a configuração ao trabalho.",
    icon: "play",
    isVisible: () => true,
  },
];

export function getWizardSteps(_cfg: Partial<CenterCornersConfig>): WizardStep[] {
  return COMMON_STEPS.filter((s) => s.isVisible(_cfg));
}

export function getStepProgress(currentStep: number, totalSteps: number): number {
  return Math.round(((currentStep + 1) / totalSteps) * 100);
}

export function canProceed(stepKey: string, cfg: Partial<CenterCornersConfig>): { ok: boolean; message?: string } {
  switch (stepKey) {
    case "mode":
      return { ok: !!cfg.mode };
    case "touchX":
      return cfg.probeDepth !== undefined && cfg.probeFeed !== undefined
        ? { ok: true }
        : { ok: false, message: "Defina a distância e velocidade do toque." };
    default:
      return { ok: true };
  }
}
