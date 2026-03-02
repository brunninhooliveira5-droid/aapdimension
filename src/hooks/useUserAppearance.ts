import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hexToHsl } from "@/components/ThemeToggle";

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
] as const;

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
    ["--foreground", "custom-fg-color"],
    ["--card-foreground", "custom-fg-color"],
    ["--popover-foreground", "custom-fg-color"],
    ["--accent-foreground", "custom-fg-color"],
    ["--sidebar-accent-foreground", "custom-fg-color"],
    ["--card-fx-color", "custom-card-fx-color"],
    ["--text-fx-shadow-color", "custom-text-shadow-color"],
  ];
  cssPairs.forEach(([prop, key]) => {
    const val = localStorage.getItem(key);
    if (val) root.style.setProperty(prop, hexToHsl(val));
    else root.style.removeProperty(prop);
  });

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
 * On login: loads user settings from DB → applies to localStorage + DOM.
 * On change: saves current localStorage appearance to DB.
 */
export function useUserAppearance(userId: string | null) {
  const loaded = useRef(false);
  const savingRef = useRef(false);

  // Load from DB on mount / user change
  useEffect(() => {
    if (!userId) return;
    loaded.current = false;

    const load = async () => {
      const { data } = await supabase
        .from("user_appearance_settings" as any)
        .select("settings")
        .eq("user_id", userId)
        .single();

      if (data && (data as any).settings) {
        setAppearanceToLocalStorage((data as any).settings as Record<string, string>);
      }
      applyAllAppearanceEffects();
      loaded.current = true;
    };
    load();
  }, [userId]);

  // Save current appearance to DB
  const saveAppearance = useCallback(async () => {
    if (!userId || !loaded.current || savingRef.current) return;
    savingRef.current = true;
    const settings = getAppearanceFromLocalStorage();
    await supabase
      .from("user_appearance_settings" as any)
      .upsert({ user_id: userId, settings } as any);
    savingRef.current = false;
  }, [userId]);

  return { saveAppearance };
}
