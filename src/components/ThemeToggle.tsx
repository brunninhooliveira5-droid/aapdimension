import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback } from "react";

export function hexToHsl(hex: string): string {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Calculate relative luminance from hex color (0 = black, 1 = white) */
export function hexLuminance(hex: string): number {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** Auto-contrast: if card bg is light → dark text, if dark → light text */
function applyAutoContrast() {
  const autoContrast = localStorage.getItem("auto-contrast") === "true";
  if (!autoContrast) return;

  const cardHex = localStorage.getItem("custom-card-color");
  if (!cardHex) return;

  const lum = hexLuminance(cardHex);
  // WCAG: luminance > 0.179 is considered "light"
  const contrastFg = lum > 0.179 ? "220 20% 10%" : "0 0% 98%";
  document.documentElement.style.setProperty("--card-foreground", contrastFg);

  // Also auto-contrast the background if customized
  const bgHex = localStorage.getItem("custom-bg-color");
  if (bgHex) {
    const bgLum = hexLuminance(bgHex);
    const fgVal = bgLum > 0.179 ? "220 20% 10%" : "210 20% 90%";
    document.documentElement.style.setProperty("--foreground", fgVal);
  }
}

export function applyCustomBg() {
  const pairs: [string, string][] = [
    ["--background", "custom-bg-color"],
    ["--sidebar-background", "custom-sidebar-color"],
    ["--card", "custom-card-color"],
    ["--card-foreground", "custom-fg-color"],
    ["--sidebar-accent-foreground", "custom-fg-color"],
    ["--card-fx-color", "custom-card-fx-color"],
    ["--text-fx-shadow-color", "custom-text-shadow-color"],
  ];
  pairs.forEach(([prop, key]) => {
    const val = localStorage.getItem(key);
    if (val) {
      document.documentElement.style.setProperty(prop, hexToHsl(val));
    } else {
      document.documentElement.style.removeProperty(prop);
    }
  });

  // Apply auto-contrast after setting colors (overrides --card-foreground if needed)
  applyAutoContrast();
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as "dark" | "light") || "dark";
    }
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
    localStorage.setItem("theme", theme);
    applyCustomBg();
  }, [theme]);

  useEffect(() => { applyCustomBg(); }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="shrink-0"
      title={theme === "dark" ? "Modo claro" : "Modo escuro"}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-muted-foreground" />
      ) : (
        <Moon className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  );
}
