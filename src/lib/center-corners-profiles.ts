// ── Profile Manager for Centro e Quinas ──
// Save / Load / Delete probe configuration profiles from localStorage

import type { CenterCornersConfig } from "./center-corners-engine";
import { defaultCenterCornersConfig } from "./center-corners-engine";

const STORAGE_KEY = "cc-profiles";

export interface CCProfile {
  id: string;
  name: string;
  description: string;
  config: CenterCornersConfig;
  createdAt: string;
  updatedAt: string;
}

function generateId(): string {
  return `cc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function loadProfiles(): CCProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveProfile(name: string, description: string, config: CenterCornersConfig): CCProfile {
  const profiles = loadProfiles();
  const profile: CCProfile = {
    id: generateId(),
    name,
    description,
    config: { ...config },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  profiles.push(profile);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  return profile;
}

export function updateProfile(id: string, patch: Partial<Pick<CCProfile, "name" | "description" | "config">>): CCProfile | null {
  const profiles = loadProfiles();
  const idx = profiles.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  if (patch.name) profiles[idx].name = patch.name;
  if (patch.description) profiles[idx].description = patch.description;
  if (patch.config) profiles[idx].config = { ...patch.config };
  profiles[idx].updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  return profiles[idx];
}

export function deleteProfile(id: string): boolean {
  const profiles = loadProfiles();
  const filtered = profiles.filter((p) => p.id !== id);
  if (filtered.length === profiles.length) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

export function getDefaultProfiles(): CCProfile[] {
  return [
    {
      id: "preset-corner-basic",
      name: "Quina — Básico",
      description: "Configuração simples para localizar uma quina.",
      config: { ...defaultCenterCornersConfig, mode: "corner" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "preset-center-rect",
      name: "Centro Retangular",
      description: "Localizar o centro de uma peça retangular.",
      config: { ...defaultCenterCornersConfig, mode: "rect-center" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "preset-hole",
      name: "Centro de Furo",
      description: "Localizar o centro de um furo existente.",
      config: { ...defaultCenterCornersConfig, mode: "hole-center" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}
