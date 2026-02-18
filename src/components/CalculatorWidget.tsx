import { useCallback, useEffect, useState } from "react";
import { useCalculator } from "@/contexts/CalculatorContext";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const BUTTONS = [
  ["C", "⌫", "÷", "×"],
  ["7", "8", "9", "-"],
  ["4", "5", "6", "+"],
  ["1", "2", "3", "="],
  ["0", ".", "", ""],
];

export function CalculatorWidget() {
  const { isOpen, closeCalculator } = useCalculator();
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState("0");

  const evaluate = useCallback((expr: string) => {
    try {
      const sanitized = expr.replace(/×/g, "*").replace(/÷/g, "/");
      if (!sanitized) return "0";
      // eslint-disable-next-line no-eval
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

  // Keyboard support
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeCalculator();
        return;
      }
      const map: Record<string, string> = {
        Enter: "=",
        Backspace: "⌫",
        Delete: "C",
        "*": "×",
        "/": "÷",
        "+": "+",
        "-": "-",
        ".": ".",
      };
      if (map[e.key]) {
        e.preventDefault();
        handleInput(map[e.key]);
      } else if (/^[0-9]$/.test(e.key)) {
        handleInput(e.key);
      }
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
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40" onClick={closeCalculator} />

      {/* Calculator */}
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
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
          <div className="text-right text-3xl font-bold text-foreground truncate">
            {result}
          </div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-4 gap-1.5 p-3">
          {BUTTONS.flat().map((label, i) => {
            if (!label) return <div key={i} />;

            const isOperator = ["÷", "×", "-", "+"].includes(label);
            const isEquals = label === "=";
            const isClear = label === "C" || label === "⌫";
            const isZero = label === "0";

            return (
              <Button
                key={i}
                variant="ghost"
                onClick={() => handleInput(label)}
                className={`
                  h-14 text-lg font-medium rounded-lg transition-colors
                  ${isZero ? "col-span-1" : ""}
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
    </>
  );
}
