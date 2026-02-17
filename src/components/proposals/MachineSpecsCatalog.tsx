import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, Cpu, Package, X } from "lucide-react";

interface MachineModel {
  id: string;
  name: string;
  category: string;
  description: string;
  tech_specs: string;
  area_x: number | null;
  area_y: number | null;
  area_z: number | null;
  base_price: number | null;
  delivery_days: number | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

interface IncludedItem { id: string; name: string; sort_order: number; }
interface OptionalItem { id: string; name: string; price: number | null; sort_order: number; }

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function MachineSpecsCatalog() {
  const { session } = useAuth();
  const [models, setModels] = useState<MachineModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; model?: MachineModel }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });

  const fetchModels = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("proposal_machine_models")
      .select("*")
      .order("name");
    setModels((data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchModels(); }, []);

  const filtered = models.filter(m => {
    const q = search.toLowerCase();
    return !q || m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
  });

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("proposal_machine_models").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir modelo"); return; }
    toast.success("Modelo excluído");
    setDeleteConfirm({ open: false, id: "", name: "" });
    fetchModels();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar modelo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Button size="sm" onClick={() => setDialog({ open: true })}>
          <Plus className="w-4 h-4 mr-1" /> Novo Modelo
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <Cpu className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">Nenhum modelo cadastrado</p>
          <p className="text-xs text-muted-foreground">Cadastre modelos de máquinas para usar nas propostas</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(model => (
            <div key={model.id} className={`gradient-card rounded-lg border border-border p-4 space-y-3 ${!model.is_active ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{model.name}</h3>
                  {model.category && <p className="text-xs text-muted-foreground">{model.category}</p>}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Badge variant={model.is_active ? "default" : "secondary"}>
                    {model.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>

              {model.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{model.description}</p>
              )}

              <div className="flex flex-wrap gap-2 text-xs">
                {(model.area_x || model.area_y || model.area_z) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                    <Package className="w-3 h-3" />
                    {[model.area_x, model.area_y, model.area_z].filter(Boolean).join(" × ")} mm
                  </span>
                )}
                {model.base_price != null && model.base_price > 0 && (
                  <span className="text-primary font-medium">{fmt(model.base_price)}</span>
                )}
                {model.delivery_days != null && (
                  <span className="text-muted-foreground">{model.delivery_days} dias</span>
                )}
              </div>

              <div className="flex gap-1 pt-1 border-t border-border">
                <Button size="sm" variant="ghost" className="flex-1 h-8 text-xs" onClick={() => setDialog({ open: true, model })}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteConfirm({ open: true, id: model.id, name: model.name })}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ModelDialog
        open={dialog.open}
        model={dialog.model}
        onClose={() => setDialog({ open: false })}
        onSaved={fetchModels}
      />

      <AlertDialog open={deleteConfirm.open} onOpenChange={o => !o && setDeleteConfirm({ open: false, id: "", name: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              O modelo "{deleteConfirm.name}" e todos os seus itens serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(deleteConfirm.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ========== MODEL DIALOG ==========
function ModelDialog({ open, model, onClose, onSaved }: {
  open: boolean; model?: MachineModel; onClose: () => void; onSaved: () => void;
}) {
  const { session } = useAuth();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [techSpecs, setTechSpecs] = useState("");
  const [areaX, setAreaX] = useState("");
  const [areaY, setAreaY] = useState("");
  const [areaZ, setAreaZ] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Included items
  const [includedItems, setIncludedItems] = useState<{ id?: string; name: string }[]>([]);
  const [newIncluded, setNewIncluded] = useState("");

  // Optional items
  const [optionalItems, setOptionalItems] = useState<{ id?: string; name: string; price: string }[]>([]);
  const [newOptName, setNewOptName] = useState("");
  const [newOptPrice, setNewOptPrice] = useState("");

  useEffect(() => {
    if (!open) return;
    if (model) {
      setName(model.name);
      setCategory(model.category);
      setDescription(model.description);
      setTechSpecs(model.tech_specs);
      setAreaX(model.area_x?.toString() ?? "");
      setAreaY(model.area_y?.toString() ?? "");
      setAreaZ(model.area_z?.toString() ?? "");
      setBasePrice(model.base_price?.toString() ?? "");
      setDeliveryDays(model.delivery_days?.toString() ?? "");
      setIsActive(model.is_active);
      loadItems(model.id);
    } else {
      setName(""); setCategory(""); setDescription(""); setTechSpecs("");
      setAreaX(""); setAreaY(""); setAreaZ("");
      setBasePrice(""); setDeliveryDays(""); setIsActive(true);
      setIncludedItems([]); setOptionalItems([]);
    }
  }, [open, model]);

  const loadItems = async (modelId: string) => {
    const [{ data: inc }, { data: opt }] = await Promise.all([
      supabase.from("proposal_machine_included_items").select("*").eq("model_id", modelId).order("sort_order"),
      supabase.from("proposal_machine_optional_items").select("*").eq("model_id", modelId).order("sort_order"),
    ]);
    setIncludedItems((inc as any[])?.map(i => ({ id: i.id, name: i.name })) ?? []);
    setOptionalItems((opt as any[])?.map(i => ({ id: i.id, name: i.name, price: i.price?.toString() ?? "" })) ?? []);
  };

  const addIncluded = () => {
    if (!newIncluded.trim()) return;
    setIncludedItems(prev => [...prev, { name: newIncluded.trim() }]);
    setNewIncluded("");
  };

  const removeIncluded = (idx: number) => {
    setIncludedItems(prev => prev.filter((_, i) => i !== idx));
  };

  const addOptional = () => {
    if (!newOptName.trim()) return;
    setOptionalItems(prev => [...prev, { name: newOptName.trim(), price: newOptPrice }]);
    setNewOptName(""); setNewOptPrice("");
  };

  const removeOptional = (idx: number) => {
    setOptionalItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Informe o nome do modelo"); return; }
    if (!session?.user?.id) return;
    setSaving(true);

    try {
      let modelId = model?.id;

      const payload = {
        name: name.trim(),
        category: category.trim(),
        description: description.trim(),
        tech_specs: techSpecs.trim(),
        area_x: areaX ? parseFloat(areaX) : null,
        area_y: areaY ? parseFloat(areaY) : null,
        area_z: areaZ ? parseFloat(areaZ) : null,
        base_price: basePrice ? parseFloat(basePrice) : null,
        delivery_days: deliveryDays ? parseInt(deliveryDays) : null,
        is_active: isActive,
      };

      if (modelId) {
        const { error } = await supabase.from("proposal_machine_models").update(payload).eq("id", modelId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("proposal_machine_models")
          .insert({ ...payload, created_by: session.user.id } as any)
          .select("id")
          .single();
        if (error) throw error;
        modelId = (data as any).id;
      }

      // Sync included items: delete all, re-insert
      await supabase.from("proposal_machine_included_items").delete().eq("model_id", modelId!);
      if (includedItems.length > 0) {
        await supabase.from("proposal_machine_included_items").insert(
          includedItems.map((item, idx) => ({
            model_id: modelId!,
            name: item.name,
            sort_order: idx,
          })) as any
        );
      }

      // Sync optional items
      await supabase.from("proposal_machine_optional_items").delete().eq("model_id", modelId!);
      if (optionalItems.length > 0) {
        await supabase.from("proposal_machine_optional_items").insert(
          optionalItems.map((item, idx) => ({
            model_id: modelId!,
            name: item.name,
            price: item.price ? parseFloat(item.price) : null,
            sort_order: idx,
          })) as any
        );
      }

      toast.success(model ? "Modelo atualizado!" : "Modelo criado!");
      onClose();
      onSaved();
    } catch (err: any) {
      toast.error("Erro: " + (err.message || "Falha ao salvar"));
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{model ? "Editar Modelo" : "Novo Modelo de Máquina"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <Label>Nome do Modelo *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Orion 2800" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Linha / Categoria</Label>
              <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex: Linha Profissional" />
            </div>
          </div>

          <div>
            <Label>Descrição Comercial</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Descrição curta para a proposta..." />
          </div>

          <div>
            <Label>Ficha Técnica</Label>
            <Textarea value={techSpecs} onChange={e => setTechSpecs(e.target.value)} rows={4} placeholder="Especificações técnicas detalhadas..." />
          </div>

          {/* Dimensions */}
          <div>
            <Label className="text-xs text-muted-foreground">Área Útil (mm)</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" value={areaX} onChange={e => setAreaX(e.target.value)} placeholder="X" />
              <Input type="number" value={areaY} onChange={e => setAreaY(e.target.value)} placeholder="Y" />
              <Input type="number" value={areaZ} onChange={e => setAreaZ(e.target.value)} placeholder="Z" />
            </div>
          </div>

          {/* Price and delivery */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Preço Base (R$)</Label>
              <Input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Prazo de Entrega (dias)</Label>
              <Input type="number" value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)} placeholder="Ex: 45" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Modelo ativo</Label>
          </div>

          {/* Included items */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Itens Inclusos</Label>
            <div className="flex gap-2">
              <Input
                value={newIncluded}
                onChange={e => setNewIncluded(e.target.value)}
                placeholder="Nome do item incluso"
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addIncluded())}
              />
              <Button type="button" size="sm" variant="outline" onClick={addIncluded}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {includedItems.length > 0 && (
              <div className="space-y-1">
                {includedItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 py-1 px-2 rounded bg-accent/50 text-sm">
                    <span className="flex-1">{item.name}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeIncluded(idx)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Optional items */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Itens Opcionais</Label>
            <div className="flex gap-2">
              <Input
                value={newOptName}
                onChange={e => setNewOptName(e.target.value)}
                placeholder="Nome do opcional"
                className="flex-1"
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addOptional())}
              />
              <Input
                type="number"
                value={newOptPrice}
                onChange={e => setNewOptPrice(e.target.value)}
                placeholder="Preço (R$)"
                className="w-28"
              />
              <Button type="button" size="sm" variant="outline" onClick={addOptional}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {optionalItems.length > 0 && (
              <div className="space-y-1">
                {optionalItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 py-1 px-2 rounded bg-accent/50 text-sm">
                    <span className="flex-1">{item.name}</span>
                    {item.price && <span className="text-primary text-xs font-medium">R$ {parseFloat(item.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>}
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeOptional(idx)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : model ? "Salvar" : "Criar Modelo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
