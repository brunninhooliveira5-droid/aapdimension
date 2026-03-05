import { useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hexToHsl, hexLuminance } from "@/components/ThemeToggle";

/** All localStorage keys used for appearance */
const APPEARANCE_KEYS = [
  "custom-bg-color",
  "custom-sidebar-color",
  "custom-card-color",
  "custom-fg-color",
  "custom-card-fx-color",
  "custom-text-shadow-color",
  "card-fx",
  "card-3d",
  "text-fx",
  "text-wt",
  "text-sz",
  "text-sp",
  "theme",
  "auto-contrast",
] as const;

/** Global flag: once settings are loaded from DB for this session, don't reload */
let globalLoadedUserId: string | null = null;

function getAppearanceFromLocalStorage(): Record<string, string> {
  const settings: Record<string, string> = {};
  APPEARANCE_KEYS.forEach(key => {
    const val = localStorage.getItem(key);
    if (val) settings[key] = val;
  });
  return settings;
}

function setAppearanceToLocalStorage(settings: Record<string, string>) {
  // Clear all appearance keys first
  APPEARANCE_KEYS.forEach(key => localStorage.removeItem(key));
  // Set saved values
  Object.entries(settings).forEach(([key, val]) => {
    if (val) localStorage.setItem(key, val);
  });
}

/** Apply all visual effects from localStorage to the DOM */
export function applyAllAppearanceEffects() {
  const root = document.documentElement;

  // Theme
  const theme = localStorage.getItem("theme") || "dark";
  if (theme === "light") root.classList.add("light");
  else root.classList.remove("light");

  // CSS custom properties via HSL
  const cssPairs: [string, string][] = [
    ["--background", "custom-bg-color"],
    ["--sidebar-background", "custom-sidebar-color"],
    ["--card", "custom-card-color"],
    ["--card-foreground", "custom-fg-color"],
    ["--sidebar-accent-foreground", "custom-fg-color"],
    ["--card-fx-color", "custom-card-fx-color"],
    ["--text-fx-shadow-color", "custom-text-shadow-color"],
  ];
  cssPairs.forEach(([prop, key]) => {
    const val = localStorage.getItem(key);
    if (val) root.style.setProperty(prop, hexToHsl(val));
    else root.style.removeProperty(prop);
  });

  // Auto-contrast: override --card-foreground based on card luminance
  const autoContrast = localStorage.getItem("auto-contrast") === "true";
  if (autoContrast) {
    const cardHex = localStorage.getItem("custom-card-color");
    if (cardHex) {
      const lum = hexLuminance(cardHex);
      root.style.setProperty("--card-foreground", lum > 0.179 ? "220 20% 10%" : "0 0% 98%");
    }
    const bgHex = localStorage.getItem("custom-bg-color");
    if (bgHex) {
      const bgLum = hexLuminance(bgHex);
      root.style.setProperty("--foreground", bgLum > 0.179 ? "220 20% 10%" : "210 20% 90%");
    }
  }

  // Class-based effects
  const classKeys = ["card-fx", "text-fx", "text-wt", "text-sz", "text-sp"];
  const allClassValues = [
    "card-fx-subtle", "card-fx-medium", "card-fx-strong", "card-fx-glow",
    "text-fx-shadow-subtle", "text-fx-shadow-medium", "text-fx-shadow-strong", "text-fx-neon",
    "text-wt-light", "text-wt-normal", "text-wt-medium", "text-wt-bold", "text-wt-extrabold",
    "text-sz-smaller", "text-sz-larger",
    "text-sp-tight", "text-sp-normal", "text-sp-wide",
    "card-fx-3d",
  ];
  // Remove all first
  allClassValues.forEach(c => root.classList.remove(c));
  // Add saved
  classKeys.forEach(key => {
    const v = localStorage.getItem(key);
    if (v) root.classList.add(v);
  });
  if (localStorage.getItem("card-3d") === "true") root.classList.add("card-fx-3d");
}

/**
 * Hook that loads and persists appearance settings per user in the database.
 * On login: loads user settings from DB → applies to localStorage + DOM (only once per session).
 * On change: debounced save of current localStorage appearance to DB.
 */
export function useUserAppearance(userId: string | null) {
  const savingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from DB when user changes
  useEffect(() => {
    if (!userId) {
      APPEARANCE_KEYS.forEach(key => localStorage.removeItem(key));
      applyAllAppearanceEffects();
      globalLoadedUserId = null;
      return;
    }
    if (globalLoadedUserId === userId) return;

    const load = async () => {
      const { data } = await supabase
        .from("user_appearance_settings" as any)
        .select("settings")
        .eq("user_id", userId)
        .single();

      if (data && (data as any).settings) {
        setAppearanceToLocalStorage((data as any).settings as Record<string, string>);
      } else {
        APPEARANCE_KEYS.forEach(key => localStorage.removeItem(key));
      }
      applyAllAppearanceEffects();
      globalLoadedUserId = userId;
    };
    load();
  }, [userId]);

  // Save current appearance to DB
  const saveAppearance = useCallback(async () => {
    if (!userId || savingRef.current) return;

    savingRef.current = true;
    try {
      const settings = getAppearanceFromLocalStorage();

      const { data: existing } = await supabase
        .from("user_appearance_settings" as any)
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("user_appearance_settings" as any)
          .update({ settings } as any)
          .eq("user_id", userId);
      } else {
        await supabase
          .from("user_appearance_settings" as any)
          .insert({ user_id: userId, settings } as any);
      }
    } finally {
      savingRef.current = false;
    }
  }, [userId]);

  // Debounced auto-save: listens to localStorage changes from same window
  const debouncedSave = useCallback(() => {
    if (!userId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveAppearance();
    }, 1500);
  }, [userId, saveAppearance]);

  // Expose globally so ThemeToggle and other components can trigger auto-save
  useEffect(() => {
    (window as any).__saveAppearance = debouncedSave;
    return () => { delete (window as any).__saveAppearance; };
  }, [debouncedSave]);

  return { saveAppearance };
}
