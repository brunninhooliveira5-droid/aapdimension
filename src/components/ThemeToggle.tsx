import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

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

export function applyCustomBg() {
  const pairs: [string, string][] = [
    ["--background", "custom-bg-color"],
    ["--sidebar-background", "custom-sidebar-color"],
    ["--card", "custom-card-color"],
    ["--foreground", "custom-fg-color"],
    ["--card-foreground", "custom-fg-color"],
    ["--popover-foreground", "custom-fg-color"],
    ["--accent-foreground", "custom-fg-color"],
    ["--sidebar-accent-foreground", "custom-fg-color"],
    ["--card-fx-color", "custom-card-fx-color"],
  ];
  pairs.forEach(([prop, key]) => {
    const val = localStorage.getItem(key);
    if (val) {
      document.documentElement.style.setProperty(prop, hexToHsl(val));
    } else {
      document.documentElement.style.removeProperty(prop);
    }
  });
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
    // Re-apply custom bg after theme switch
    applyCustomBg();
  }, [theme]);

  // Apply custom bg on mount
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
