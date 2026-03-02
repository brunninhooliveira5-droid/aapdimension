import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Settings, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function InventorySettings() {
  const { session } = useAuth();
  const qc = useQueryClient();

  // Settings
  const { data: settings } = useQuery({
    queryKey: ["inventory-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("inventory_settings").select("*").limit(1).single();
      return data;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: any) => {
      if (!settings) return;
      await supabase.from("inventory_settings").update({ ...updates, updated_by: session?.user.id }).eq("id", settings.id);
    },
    onSuccess: () => {
      toast.success("Configurações salvas!");
      qc.invalidateQueries({ queryKey: ["inventory-settings"] });
    },
  });

  // Categories
  const { data: categories = [] } = useQuery({
    queryKey: ["inventory-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("inventory_categories").select("*").order("sort_order");
      return data || [];
    },
  });

  const [newCat, setNewCat] = useState("");
  const addCategory = useMutation({
    mutationFn: async () => {
      if (!newCat.trim()) return;
      await supabase.from("inventory_categories").insert({ name: newCat.trim() });
    },
    onSuccess: () => {
      toast.success("Categoria criada!");
      qc.invalidateQueries({ queryKey: ["inventory-categories"] });
      setNewCat("");
    },
  });

  // Units
  const { data: units = [] } = useQuery({
    queryKey: ["inventory-units"],
    queryFn: async () => {
      const { data } = await supabase.from("inventory_units").select("*").order("name");
      return data || [];
    },
  });

  const [newUnit, setNewUnit] = useState({ name: "", abbreviation: "" });
  const addUnit = useMutation({
    mutationFn: async () => {
      if (!newUnit.name.trim() || !newUnit.abbreviation.trim()) return;
      await supabase.from("inventory_units").insert({ name: newUnit.name.trim(), abbreviation: newUnit.abbreviation.trim() });
    },
    onSuccess: () => {
      toast.success("Unidade criada!");
      qc.invalidateQueries({ queryKey: ["inventory-units"] });
      setNewUnit({ name: "", abbreviation: "" });
    },
  });

  // Locations
  const { data: locations = [] } = useQuery({
    queryKey: ["inventory-locations"],
    queryFn: async () => {
      const { data } = await supabase.from("inventory_locations").select("*").order("name");
      return data || [];
    },
  });

  const [newLoc, setNewLoc] = useState("");
  const addLocation = useMutation({
    mutationFn: async () => {
      if (!newLoc.trim()) return;
      await supabase.from("inventory_locations").insert({ name: newLoc.trim() });
    },
    onSuccess: () => {
      toast.success("Localização criada!");
      qc.invalidateQueries({ queryKey: ["inventory-locations"] });
      setNewLoc("");
    },
  });

  return (
    <div className="space-y-4">
      {/* Global Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" />Configurações Gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Permitir estoque negativo</p>
              <p className="text-xs text-muted-foreground">Permite que saídas gerem saldo negativo</p>
            </div>
            <Switch
              checked={settings?.allow_negative_stock || false}
              onCheckedChange={(v) => updateSettings.mutate({ allow_negative_stock: v })}
            />
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Alerta mínimo global</Label>
              <Input
                type="number"
                defaultValue={settings?.global_min_alert || 5}
                onBlur={(e) => updateSettings.mutate({ global_min_alert: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Período consumo (dias)</Label>
              <Input
                type="number"
                defaultValue={settings?.consumption_period_days || 90}
                onBlur={(e) => updateSettings.mutate({ consumption_period_days: Number(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Categorias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Nome da categoria" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
            <Button size="sm" onClick={() => addCategory.mutate()}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((c: any) => (
              <span key={c.id} className="px-2 py-1 bg-muted rounded text-xs">{c.name}</span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Units */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Unidades de Medida</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Nome" value={newUnit.name} onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })} className="flex-1" />
            <Input placeholder="Abrev." value={newUnit.abbreviation} onChange={(e) => setNewUnit({ ...newUnit, abbreviation: e.target.value })} className="w-20" />
            <Button size="sm" onClick={() => addUnit.mutate()}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {units.map((u: any) => (
              <span key={u.id} className="px-2 py-1 bg-muted rounded text-xs">{u.name} ({u.abbreviation})</span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Locations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Localizações Físicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Nome do local" value={newLoc} onChange={(e) => setNewLoc(e.target.value)} />
            <Button size="sm" onClick={() => addLocation.mutate()}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {locations.map((l: any) => (
              <span key={l.id} className="px-2 py-1 bg-muted rounded text-xs">{l.name}</span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
