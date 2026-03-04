import { Input } from "@/components/ui/input";
import { useCallback } from "react";

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function formatCurrency(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function rawValue(formatted: string): string {
  const digits = formatted.replace(/\D/g, "");
  if (!digits) return "0";
  return (parseInt(digits, 10) / 100).toString();
}

export function CurrencyInput({ value, onChange, placeholder = "0,00", className }: CurrencyInputProps) {
  const displayValue = value && Number(value) > 0
    ? Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "";

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    onChange(rawValue(formatted));
  }, [onChange]);

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
      <Input
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={`pl-9 ${className || ""}`}
        inputMode="numeric"
      />
    </div>
  );
}
