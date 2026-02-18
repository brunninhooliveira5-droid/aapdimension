import { useCallback, useEffect, useRef, useState } from "react";
import { useCalculator } from "@/contexts/CalculatorContext";
import { X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const BUTTONS = [
  ["C", "⌫", "÷", "×"],
  ["7", "8", "9", "-"],
  ["4", "5", "6", "+"],
  ["1", "2", "3", "="],
  ["0", ".", "", ""],
];

const STORAGE_KEY = "calc-widget-pos";
const W = 340;
const H = 420;

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function getDefaultPos() {
  return { x: window.innerWidth - W - 24, y: window.innerHeight - H - 24 };
}

function loadPos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p.x === "number" && typeof p.y === "number") return p;
    }
  } catch {}
  return null;
}

export function CalculatorWidget() {
  const { isOpen, closeCalculator } = useCalculator();
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState("0");
  const [copied, setCopied] = useState(false);

  // Drag state
  const [pos, setPos] = useState(() => loadPos() || getDefaultPos());
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  // Save position
  useEffect(() => {
    if (isOpen) localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  }, [pos, isOpen]);

  // Reset position if saved pos is off-screen
  useEffect(() => {
    if (!isOpen) return;
    setPos((prev) => ({
      x: clamp(prev.x, 0, window.innerWidth - W),
      y: clamp(prev.y, 0, window.innerHeight - H),
    }));
  }, [isOpen]);

  // Drag handlers
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos]);

  useEffect(() => {
    if (!isOpen) return;
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      setPos({
        x: clamp(e.clientX - offset.current.x, 0, window.innerWidth - W),
        y: clamp(e.clientY - offset.current.y, 0, window.innerHeight - H),
      });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [isOpen]);

  const evaluate = useCallback((expr: string) => {
    try {
      const sanitized = expr.replace(/×/g, "*").replace(/÷/g, "/");
      if (!sanitized) return "0";
      const res = Function(`"use strict"; return (${sanitized})`)();
      if (typeof res === "number" && isFinite(res)) {
        return String(Math.round(res * 1e10) / 1e10);
      }
      return "Erro";
    } catch {
      return "Erro";
    }
  }, []);

  const handleInput = useCallback(
    (key: string) => {
      if (key === "C") {
        setExpression("");
        setResult("0");
      } else if (key === "⌫") {
        setExpression((e) => e.slice(0, -1));
      } else if (key === "=") {
        const res = evaluate(expression);
        setResult(res);
        if (res !== "Erro") setExpression(res);
      } else {
        setExpression((e) => e + key);
      }
    },
    [expression, evaluate]
  );

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }, [result]);

  // Keyboard support
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { closeCalculator(); return; }
      const map: Record<string, string> = {
        Enter: "=", Backspace: "⌫", Delete: "C",
        "*": "×", "/": "÷", "+": "+", "-": "-", ".": ".",
      };
      if (map[e.key]) { e.preventDefault(); handleInput(map[e.key]); }
      else if (/^[0-9]$/.test(e.key)) handleInput(e.key);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, handleInput, closeCalculator]);

  // Live preview
  useEffect(() => {
    if (expression) {
      const res = evaluate(expression);
      if (res !== "Erro") setResult(res);
    } else {
      setResult("0");
    }
  }, [expression, evaluate]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed z-50 rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
      style={{ left: pos.x, top: pos.y, width: W }}
    >
      {/* Draggable Header */}
      <div
        onPointerDown={onPointerDown}
        className="flex items-center justify-between px-4 py-3 border-b border-border cursor-grab active:cursor-grabbing select-none"
      >
        <span className="text-sm font-semibold text-foreground">Calculadora</span>
        <button
          onClick={closeCalculator}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Display */}
      <div className="px-4 pt-4 pb-2">
        <div className="text-right text-xs text-muted-foreground min-h-[1.25rem] truncate">
          {expression || "\u00A0"}
        </div>
        <div className="flex items-end justify-between gap-2">
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Copiar resultado"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <div className="text-right text-3xl font-bold text-foreground truncate">{result}</div>
        </div>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-4 gap-1.5 p-3">
        {BUTTONS.flat().map((label, i) => {
          if (!label) return <div key={i} />;
          const isOperator = ["÷", "×", "-", "+"].includes(label);
          const isEquals = label === "=";
          const isClear = label === "C" || label === "⌫";

          return (
            <Button
              key={i}
              variant="ghost"
              onClick={() => handleInput(label)}
              className={`
                h-14 text-lg font-medium rounded-lg transition-colors
                ${isEquals ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : ""}
                ${isOperator ? "text-primary hover:bg-primary/10 hover:text-primary" : ""}
                ${isClear ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : ""}
                ${!isOperator && !isEquals && !isClear ? "text-foreground hover:bg-muted" : ""}
              `}
            >
              {label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
