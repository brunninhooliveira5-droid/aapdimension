import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Factory } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SectorAccessEditorProps {
  accountId: string;
  userId: string;
  /** Called whenever the selection changes */
  onChange: (selectedKeys: string[]) => void;
  /** Initial selected keys (loaded externally) */
  value: string[];
}

interface SectorCard {
  id: string;
  key: string;
  title: string;
}

export function SectorAccessEditor({ accountId, userId, onChange, value }: SectorAccessEditorProps) {
  const [sectors, setSectors] = useState<SectorCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSectors = async () => {
      // Fetch from both dimension and pc tables
      const [dim, pc] = await Promise.all([
        supabase.from("dimension_production_cards").select("id, key, title").order("key"),
        supabase.from("pc_production_cards" as any).select("id, key, title").order("key"),
      ]);

      // Merge unique by key
      const map = new Map<string, SectorCard>();
      for (const s of [...(dim.data ?? []), ...((pc.data as any[]) ?? [])] as SectorCard[]) {
        if (!map.has(s.key)) map.set(s.key, s);
      }
      setSectors(Array.from(map.values()));
      setLoading(false);
    };
    fetchSectors();
  }, []);

  const toggle = (key: string) => {
    const current = new Set(value);
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    onChange(Array.from(current));
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (sectors.length === 0) return null;

  const allSelected = value.length === 0; // No restrictions = all access

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Factory className="h-4 w-4 text-primary" />
        <h4 className="text-xs font-semibold text-foreground">Setores de Produção</h4>
      </div>
      <p className="text-[10px] text-muted-foreground -mt-1">
        {allSelected
          ? "Sem restrições — o usuário vê todos os setores. Ative apenas os setores que deseja liberar."
          : `${value.length} setor(es) liberado(s). O usuário só verá os setores marcados abaixo.`}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sectors.map((sector) => (
          <div
            key={sector.key}
            className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border bg-muted/30"
          >
            <Label htmlFor={`sector-${sector.key}`} className="text-xs cursor-pointer flex-1">
              {sector.title}
            </Label>
            <Switch
              id={`sector-${sector.key}`}
              checked={value.includes(sector.key)}
              onCheckedChange={() => toggle(sector.key)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
