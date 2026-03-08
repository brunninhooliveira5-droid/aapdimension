import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { Package, Plus, Trash2, AlertTriangle, Check } from "lucide-react";

export interface SlicerMaterial {
  id: string;
  name: string;
  width: number;
  height: number;
  thickness: number;
}

interface Props {
  selectedMaterial: SlicerMaterial | null;
  onSelectMaterial: (m: SlicerMaterial | null) => void;
  modelBounds: { x: number; y: number; z: number } | null;
}

export function SlicerMaterialManager({ selectedMaterial, onSelectMaterial, modelBounds }: Props) {
  const [materials, setMaterials] = useState<SlicerMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", width: "", height: "", thickness: "" });

  const fetchMaterials = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("slicer_materials")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    if (data) setMaterials(data.map(d => ({
      id: d.id,
      name: d.name,
      width: Number(d.width),
      height: Number(d.height),
      thickness: Number(d.thickness),
    })));
  };

  useEffect(() => { fetchMaterials(); }, []);

  const handleAdd = async () => {
    const w = parseFloat(form.width);
    const h = parseFloat(form.height);
    const t = parseFloat(form.thickness);
    if (!form.name || isNaN(w) || isNaN(h) || isNaN(t) || w <= 0 || h <= 0 || t <= 0) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { error } = await supabase.from("slicer_materials").insert({
      user_id: user.id,
      name: form.name,
      width: w,
      height: h,
      thickness: t,
    });
    if (error) {
      toast.error("Erro ao salvar material");
    } else {
      toast.success("Material cadastrado");
      setForm({ name: "", width: "", height: "", thickness: "" });
      setDialogOpen(false);
      await fetchMaterials();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("slicer_materials").delete().eq("id", id);
    if (selectedMaterial?.id === id) onSelectMaterial(null);
    await fetchMaterials();
    toast.success("Material removido");
  };

  const fitsInMaterial = (mat: SlicerMaterial) => {
    if (!modelBounds) return true;
    // Model must fit within the material's width x height (any orientation on the sheet)
    // and thickness must be >= material thickness for slicing
    const { x, y, z } = modelBounds;
    const dims = [x, y, z].sort((a, b) => a - b); // smallest to largest
    // The smallest dim should be manageable with thickness slicing
    // The two largest dims should fit within width x height
    const fitA = dims[1] <= mat.width && dims[2] <= mat.height;
    const fitB = dims[2] <= mat.width && dims[1] <= mat.height;
    return fitA || fitB;
  };

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Package className="h-4 w-4" /> Material
          </span>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Cadastrar Material</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Nome</Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: MDF 15mm, Acrílico 3mm..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Largura (mm)</Label>
                    <Input
                      type="number"
                      value={form.width}
                      onChange={e => setForm(f => ({ ...f, width: e.target.value }))}
                      placeholder="1220"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Altura (mm)</Label>
                    <Input
                      type="number"
                      value={form.height}
                      onChange={e => setForm(f => ({ ...f, height: e.target.value }))}
                      placeholder="2440"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Espessura (mm)</Label>
                    <Input
                      type="number"
                      value={form.thickness}
                      onChange={e => setForm(f => ({ ...f, thickness: e.target.value }))}
                      placeholder="3"
                    />
                  </div>
                </div>
                <Button className="w-full" onClick={handleAdd} disabled={loading}>
                  <Plus className="h-4 w-4 mr-2" />
                  {loading ? "Salvando..." : "Cadastrar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {materials.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            Nenhum material cadastrado. Clique em + para adicionar.
          </p>
        ) : (
          <>
            <Select
              value={selectedMaterial?.id || ""}
              onValueChange={(val) => {
                const mat = materials.find(m => m.id === val) || null;
                onSelectMaterial(mat);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um material..." />
              </SelectTrigger>
              <SelectContent>
                {materials.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} — {m.width}×{m.height}mm, {m.thickness}mm
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedMaterial && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Dimensões</span>
                  <span className="font-medium">
                    {selectedMaterial.width} × {selectedMaterial.height} mm
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Espessura</span>
                  <span className="font-medium">{selectedMaterial.thickness} mm</span>
                </div>
                {modelBounds && (
                  <div className="flex items-center gap-1.5 text-xs mt-1">
                    {fitsInMaterial(selectedMaterial) ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <Check className="h-3.5 w-3.5" /> Modelo cabe no material
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5" /> Modelo não cabe no material
                      </span>
                    )}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => handleDelete(selectedMaterial.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover Material
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
