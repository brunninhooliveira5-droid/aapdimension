import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, ChevronLeft, Layers, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function MaterialsManagement() {
  const { session } = useAuth();
  const [customMaterials, setCustomMaterials] = useState<{ id: string; name: string; price_adjustment: number }[]>([]);
  const [newMaterial, setNewMaterial] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState<{ id: string; name: string; price_adjustment: number } | null>(null);
  const [materialAdjustment, setMaterialAdjustment] = useState(0);
  const [materialThicknesses, setMaterialThicknesses] = useState<{ id: string; value: string; label: string }[]>([]);
  const [newThickness, setNewThickness] = useState("");

  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from("cutting_materials")
      .select("id, name, price_adjustment")
      .order("name")
      .then(({ data }) => {
        if (data) setCustomMaterials(data as any);
      });
  }, [session]);

  const addMaterial = async () => {
    if (!newMaterial.trim() || !session?.user) return;
    const { data, error } = await supabase
      .from("cutting_materials")
      .insert({ user_id: session.user.id, name: newMaterial.trim() } as any)
      .select("id, name, price_adjustment")
      .single();
    if (!error && data) {
      setCustomMaterials((prev) => [...prev, data as any].sort((a, b) => a.name.localeCompare(b.name)));
      setNewMaterial("");
      toast.success("Material adicionado!");
    }
  };

  const deleteMaterial = async (id: string) => {
    const { error } = await supabase.from("cutting_materials").delete().eq("id", id);
    if (!error) {
      setCustomMaterials((prev) => prev.filter((m) => m.id !== id));
      toast.success("Material removido.");
    }
  };

  const openMaterialDashboard = async (mat: { id: string; name: string; price_adjustment: number }) => {
    setSelectedMaterial(mat);
    setMaterialAdjustment(mat.price_adjustment || 0);
    const { data } = await supabase
      .from("cutting_material_thicknesses")
      .select("id, value, label")
      .eq("material_id", mat.id)
      .order("value");
    if (data) setMaterialThicknesses(data as any);
  };

  const addThickness = async () => {
    if (!newThickness.trim() || !selectedMaterial) return;
    const val = newThickness.trim();
    const { data, error } = await supabase
      .from("cutting_material_thicknesses")
      .insert({ material_id: selectedMaterial.id, value: val, label: `${val} mm` } as any)
      .select("id, value, label")
      .single();
    if (!error && data) {
      setMaterialThicknesses((prev) => [...prev, data as any].sort((a, b) => parseFloat(a.value) - parseFloat(b.value)));
      setNewThickness("");
      toast.success("Espessura adicionada!");
    }
  };

  const deleteThickness = async (id: string) => {
    const { error } = await supabase.from("cutting_material_thicknesses").delete().eq("id", id);
    if (!error) {
      setMaterialThicknesses((prev) => prev.filter((t) => t.id !== id));
      toast.success("Espessura removida.");
    }
  };

  const saveMaterialAdjustment = async () => {
    if (!selectedMaterial) return;
    const { error } = await supabase
      .from("cutting_materials")
      .update({ price_adjustment: materialAdjustment } as any)
      .eq("id", selectedMaterial.id);
    if (!error) {
      setCustomMaterials((prev) => prev.map((m) => m.id === selectedMaterial.id ? { ...m, price_adjustment: materialAdjustment } : m));
      setSelectedMaterial({ ...selectedMaterial, price_adjustment: materialAdjustment });
      toast.success("Ajuste de preço salvo!");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        {selectedMaterial ? (
          <>
            <CardTitle className="text-base flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedMaterial(null); setMaterialThicknesses([]); }}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Layers className="w-4 h-4 text-primary" />
              {selectedMaterial.name}
            </CardTitle>
            <CardDescription>Gerencie as espessuras e ajuste de preço deste material</CardDescription>
          </>
        ) : (
          <>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Cadastrar Materiais
            </CardTitle>
            <CardDescription>Clique em um material para gerenciar espessuras e ajuste de preço</CardDescription>
          </>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedMaterial ? (
          <>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-xs">Ajuste de Preço sobre Sugerido (%)</Label>
                <Input
                  type="number"
                  value={materialAdjustment || ""}
                  onChange={(e) => setMaterialAdjustment(Number(e.target.value))}
                  placeholder="0"
                  className="mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Ex: 20 = adiciona 20% ao preço sugerido para este material
                </p>
              </div>
              <Button onClick={saveMaterialAdjustment} size="sm" className="shrink-0 gap-1 mb-5">
                <Save className="w-3.5 h-3.5" /> Salvar
              </Button>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Input
                placeholder="Espessura (ex: 2.5)"
                value={newThickness}
                onChange={(e) => setNewThickness(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addThickness()}
                type="number"
                min={0.1}
                step={0.1}
              />
              <Button onClick={addThickness} disabled={!newThickness.trim()} size="sm" className="shrink-0 gap-1">
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </Button>
            </div>
            {materialThicknesses.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {materialThicknesses.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-secondary/50 text-sm">
                    <span>{t.label}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteThickness(t.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">Nenhuma espessura cadastrada para este material.</p>
            )}
          </>
        ) : (
          <>
            <div className="flex gap-2">
              <Input
                placeholder="Nome do material"
                value={newMaterial}
                onChange={(e) => setNewMaterial(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMaterial()}
              />
              <Button onClick={addMaterial} disabled={!newMaterial.trim()} size="sm" className="shrink-0 gap-1">
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </Button>
            </div>
            {customMaterials.length > 0 ? (
              <div className="space-y-1">
                {customMaterials.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-secondary/50 text-sm cursor-pointer hover:bg-secondary transition-colors"
                    onClick={() => openMaterialDashboard(m)}
                  >
                    <span className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                      {m.name}
                      {m.price_adjustment > 0 && (
                        <span className="text-[10px] text-primary">+{m.price_adjustment}%</span>
                      )}
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteMaterial(m.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">Nenhum material personalizado cadastrado.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
