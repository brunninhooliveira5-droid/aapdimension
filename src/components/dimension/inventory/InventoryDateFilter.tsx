import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileDown, X } from "lucide-react";

const MONTHS = [
  { value: "0", label: "Janeiro" }, { value: "1", label: "Fevereiro" },
  { value: "2", label: "Março" }, { value: "3", label: "Abril" },
  { value: "4", label: "Maio" }, { value: "5", label: "Junho" },
  { value: "6", label: "Julho" }, { value: "7", label: "Agosto" },
  { value: "8", label: "Setembro" }, { value: "9", label: "Outubro" },
  { value: "10", label: "Novembro" }, { value: "11", label: "Dezembro" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

interface Props {
  month: string;
  year: string;
  onMonthChange: (v: string) => void;
  onYearChange: (v: string) => void;
  onClear: () => void;
  onExportPdf: () => void;
  hasFilter: boolean;
}

export function InventoryDateFilter({ month, year, onMonthChange, onYearChange, onClear, onExportPdf, hasFilter }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={month} onValueChange={onMonthChange}>
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <SelectValue placeholder="Mês" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {MONTHS.map((m) => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={year} onValueChange={onYearChange}>
        <SelectTrigger className="w-[90px] h-8 text-xs">
          <SelectValue placeholder="Ano" />
        </SelectTrigger>
        <SelectContent>
          {YEARS.map((y) => (
            <SelectItem key={y} value={y}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilter && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-8 px-2 text-xs gap-1">
          <X className="h-3 w-3" />Limpar
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={onExportPdf} className="h-8 px-2 text-xs gap-1 ml-auto">
        <FileDown className="h-3 w-3" />PDF
      </Button>
    </div>
  );
}

export function getMonthLabel(month: string) {
  return MONTHS.find((m) => m.value === month)?.label || "";
}

export function filterByMonthYear<T extends { created_at?: string }>(items: T[], month: string, year: string): T[] {
  const effectiveMonth = month === "all" ? "" : month;
  if (!effectiveMonth && !year) return items;
  return items.filter((item) => {
    const d = new Date((item as any).created_at);
    if (effectiveMonth && d.getMonth() !== Number(effectiveMonth)) return false;
    if (year && d.getFullYear() !== Number(year)) return false;
    return true;
  });
}
