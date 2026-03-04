import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Check, X } from "lucide-react";

interface SelectWithAddProps {
  value: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
  options: { id: string; label: string }[];
  onAdd: (value: string, extra?: string) => Promise<string | null>;
  /** If true, shows a second input for abbreviation (used for units) */
  withAbbreviation?: boolean;
}

export function SelectWithAdd({ value, onValueChange, placeholder = "Selecionar", options, onAdd, withAbbreviation }: SelectWithAddProps) {
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState("");
  const [newAbbr, setNewAbbr] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newVal.trim()) return;
    setSaving(true);
    try {
      const newId = await onAdd(newVal.trim(), withAbbreviation ? newAbbr.trim() : undefined);
      if (newId) onValueChange(newId);
      setAdding(false);
      setNewVal("");
      setNewAbbr("");
    } finally {
      setSaving(false);
    }
  };

  if (adding) {
    return (
      <div className="flex gap-1.5 items-center">
        <Input
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
          placeholder="Nome..."
          className="h-9 text-sm"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        {withAbbreviation && (
          <Input
            value={newAbbr}
            onChange={(e) => setNewAbbr(e.target.value)}
            placeholder="Abrev."
            className="h-9 text-sm w-16"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        )}
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleAdd} disabled={saving}>
          <Check className="h-3.5 w-3.5 text-emerald-600" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => { setAdding(false); setNewVal(""); setNewAbbr(""); }}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-1.5 items-center">
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => setAdding(true)} title="Cadastrar novo">
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
