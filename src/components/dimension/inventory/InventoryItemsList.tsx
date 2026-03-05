import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useModule } from "@/contexts/ModuleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectWithAdd } from "./SelectWithAdd";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, Pencil, Trash2, ShieldAlert, Scale } from "lucide-react";
import { toast } from "sonner";
import { CurrencyInput } from "./CurrencyInput";
import { InventoryImageUpload } from "./InventoryImageUpload";
import { InventoryPasswordPrompt } from "./InventoryPasswordPrompt";
import { InventoryItemDashboard } from "./InventoryItemDashboard";

const ITEM_TYPES = [
  { value: "materia_prima", label: "Matéria-prima" },
  { value: "componente", label: "Componente" },
  { value: "consumivel", label: "Consumível" },
  { value: "ferramenta", label: "Ferramenta" },
  { value: "produto_acabado", label: "Produto Acabado" },
];

const FALLBACK_COMPATIBLE = ["Orion", "Falcon", "Quantum", "Laser", "Geral"];

const emptyForm = {
  name: "", internal_code: "", subcategory: "", item_type: "materia_prima",
  compatible_with: [] as string[], min_quantity: "0", ideal_quantity: "0",
  unit_cost: "0", category_id: "", unit_id: "", location_id: "", supplier_id: "",
  image_url: null as string | null,
};

export function InventoryItemsList() {
  const { session } = useAuth();
  const { tables } = useModule();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [customCompatible, setCustomCompatible] = useState<string[]>([]);
  const [newCompatibleInput, setNewCompatibleInput] = useState("");

  // Password prompt state for add/delete
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteVerifying, setDeleteVerifying] = useState(false);

  // Calibration state
  const [calibrateTarget, setCalibrateTarget] = useState<any>(null);
  const [calibrateQty, setCalibrateQty] = useState("");
  const [calibrateNote, setCalibrateNote] = useState("");
  const [calibrating, setCalibrating] = useState(false);
  const [showCalibrateDialog, setShowCalibrateDialog] = useState(false);

  const table = tables.inventoryItems.startsWith("pc_") ? "pc" as const : "dimension" as const;

  // Load compatible options from settings
  const { data: settings } = useQuery({
    queryKey: [tables.inventorySettings, "compatible"],
    queryFn: async () => {
      const { data } = await supabase.from(tables.inventorySettings as any).select("compatible_options").limit(1).single();
      return data as any;
    },
  });

  const configuredCompatible: string[] = settings?.compatible_options || FALLBACK_COMPATIBLE;
  const allCompatible = [...new Set([...configuredCompatible, ...customCompatible])];

  const { data: items = [], isLoading } = useQuery({
    queryKey: [tables.inventoryItems],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tables.inventoryItems as any)
        .select(`*, ${tables.inventoryCategories}(name), ${tables.inventoryUnits}(abbreviation), ${tables.inventoryLocations}(name), ${tables.inventorySuppliers}(name)`)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: [tables.inventoryCategories],
    queryFn: async () => {
      const { data } = await supabase.from(tables.inventoryCategories as any).select("*").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: units = [] } = useQuery({
    queryKey: [tables.inventoryUnits],
    queryFn: async () => {
      const { data } = await supabase.from(tables.inventoryUnits as any).select("*").eq("is_active", true);
      return data || [];
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: [tables.inventoryLocations],
    queryFn: async () => {
      const { data } = await supabase.from(tables.inventoryLocations as any).select("*").eq("is_active", true);
      return data || [];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: [tables.inventorySuppliers],
    queryFn: async () => {
      const { data } = await supabase.from(tables.inventorySuppliers as any).select("*").eq("is_active", true);
      return data || [];
    },
  });

  const saveItem = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Nome obrigatório");
      const payload = {
        name: form.name.trim(),
        internal_code: form.internal_code.trim(),
        subcategory: form.subcategory.trim(),
        item_type: form.item_type,
        compatible_with: form.compatible_with,
        min_quantity: Number(form.min_quantity) || 0,
        ideal_quantity: Number(form.ideal_quantity) || 0,
        unit_cost: Number(form.unit_cost) || 0,
        category_id: form.category_id || null,
        unit_id: form.unit_id || null,
        location_id: form.location_id || null,
        supplier_id: form.supplier_id || null,
        image_url: form.image_url,
      };

      if (editingItem) {
        const { error } = await supabase.from(tables.inventoryItems as any)
          .update(payload).eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(tables.inventoryItems as any)
          .insert({ ...payload, created_by: session?.user.id! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingItem ? "Item atualizado!" : "Item criado!");
      qc.invalidateQueries({ queryKey: [tables.inventoryItems] });
      closeForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const closeForm = () => {
    setOpen(false);
    setEditingItem(null);
    setForm({ ...emptyForm });
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      name: item.name || "",
      internal_code: item.internal_code || "",
      subcategory: item.subcategory || "",
      item_type: item.item_type || "materia_prima",
      compatible_with: item.compatible_with || [],
      min_quantity: String(item.min_quantity ?? 0),
      ideal_quantity: String(item.ideal_quantity ?? 0),
      unit_cost: String(item.unit_cost ?? 0),
      category_id: item.category_id || "",
      unit_id: item.unit_id || "",
      location_id: item.location_id || "",
      supplier_id: item.supplier_id || "",
      image_url: item.image_url || null,
    });
    setOpen(true);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setDeleteVerifying(true);
    try {
      const { error: delErr } = await supabase.from(tables.inventoryItems as any)
        .update({ is_active: false }).eq("id", deleteTarget.id);
      if (delErr) throw delErr;

      toast.success("Item excluído!");
      qc.invalidateQueries({ queryKey: [tables.inventoryItems] });
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir");
    } finally {
      setDeleteVerifying(false);
    }
  };

  const requestAdd = () => {
    setPendingAction(() => () => setOpen(true));
    setPasswordPromptOpen(true);
  };

  const requestDelete = (item: any) => {
    setDeleteTarget(item);
    setPendingAction(() => () => executeDelete());
    setPasswordPromptOpen(true);
  };

  const requestCalibrate = (item: any) => {
    setCalibrateTarget(item);
    setCalibrateQty(String(item.current_quantity));
    setCalibrateNote("");
    setPendingAction(() => () => setShowCalibrateDialog(true));
    setPasswordPromptOpen(true);
  };

  const executeCalibrate = async () => {
    if (!calibrateTarget) return;
    setCalibrating(true);
    try {
      const oldQty = Number(calibrateTarget.current_quantity);
      const newQty = Number(calibrateQty);
      const diff = newQty - oldQty;

      if (diff !== 0) {
        const { error: movErr } = await supabase.from(tables.inventoryMovements as any).insert({
          item_id: calibrateTarget.id,
          movement_type: diff > 0 ? "entrada" : "saida",
          quantity: Math.abs(diff),
          reason: "Calibração manual",
          notes: calibrateNote || `Ajuste: ${oldQty} → ${newQty}`,
          created_by: session?.user.id,
        } as any);
        if (movErr) throw movErr;

        const { error: updErr } = await supabase.from(tables.inventoryItems as any)
          .update({ current_quantity: newQty } as any)
          .eq("id", calibrateTarget.id);
        if (updErr) throw updErr;
      } else {
        toast.info("Quantidade não alterada.");
        setCalibrating(false);
        return;
      }

      toast.success(`Estoque calibrado: ${oldQty} → ${newQty}`);
      qc.invalidateQueries({ queryKey: [tables.inventoryItems] });
      setShowCalibrateDialog(false);
      setCalibrateTarget(null);
    } catch (err: any) {
      console.error("Calibration error:", err);
      toast.error(err?.message || "Erro ao calibrar estoque.");
    }
    setCalibrating(false);
  };

  const filtered = (items as any[]).filter((i) => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.internal_code || "").toLowerCase().includes(search.toLowerCase());
    const matchesType = !selectedType || i.item_type === selectedType;
    return matchesSearch && matchesType;
  });

  const getStockBadge = (item: any) => {
    const qty = Number(item.current_quantity);
    const min = Number(item.min_quantity);
    if (qty === 0) return <Badge variant="destructive">Zerado</Badge>;
    if (qty <= min) return <Badge variant="secondary" className="border-amber-500 text-amber-600">Baixo</Badge>;
    return <Badge variant="secondary" className="border-emerald-500 text-emerald-600">OK</Badge>;
  };

  const renderForm = () => (
    <div className="space-y-3">
      <div>
        <Label>Foto do Item</Label>
        <InventoryImageUpload
          imageUrl={form.image_url}
          onImageChange={(url) => setForm({ ...form, image_url: url })}
          itemId={editingItem?.id}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Código Interno</Label><Input value={form.internal_code} onChange={(e) => setForm({ ...form, internal_code: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Tipo</Label>
          <Select value={form.item_type} onValueChange={(v) => setForm({ ...form, item_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ITEM_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Categoria</Label>
          <SelectWithAdd
            value={form.category_id}
            onValueChange={(v) => setForm({ ...form, category_id: v })}
            placeholder="Selecionar"
            options={(categories as any[]).map((c) => ({ id: c.id, label: c.name }))}
            onAdd={async (name) => {
              const { data, error } = await (supabase.from(tables.inventoryCategories as any) as any).insert({ name }).select("id").single();
              if (error) { toast.error(error.message); return null; }
              qc.invalidateQueries({ queryKey: [tables.inventoryCategories] });
              toast.success("Categoria criada!");
              return data?.id || null;
            }}
          />
        </div>
      </div>
      <div><Label>Subcategoria</Label><Input value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Unidade</Label>
          <SelectWithAdd
            value={form.unit_id}
            onValueChange={(v) => setForm({ ...form, unit_id: v })}
            placeholder="Selecionar"
            options={(units as any[]).map((u) => ({ id: u.id, label: `${u.name} (${u.abbreviation})` }))}
            withAbbreviation
            onAdd={async (name, abbr) => {
              if (!abbr) { toast.error("Abreviação obrigatória"); return null; }
              const { data, error } = await (supabase.from(tables.inventoryUnits as any) as any).insert({ name, abbreviation: abbr }).select("id").single();
              if (error) { toast.error(error.message); return null; }
              qc.invalidateQueries({ queryKey: [tables.inventoryUnits] });
              toast.success("Unidade criada!");
              return data?.id || null;
            }}
          />
        </div>
        <div>
          <Label>Localização</Label>
          <SelectWithAdd
            value={form.location_id}
            onValueChange={(v) => setForm({ ...form, location_id: v })}
            placeholder="Selecionar"
            options={(locations as any[]).map((l) => ({ id: l.id, label: l.name }))}
            onAdd={async (name) => {
              const { data, error } = await (supabase.from(tables.inventoryLocations as any) as any).insert({ name }).select("id").single();
              if (error) { toast.error(error.message); return null; }
              qc.invalidateQueries({ queryKey: [tables.inventoryLocations] });
              toast.success("Localização criada!");
              return data?.id || null;
            }}
          />
        </div>
      </div>
      <div>
        <Label>Compatível com</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {allCompatible.map((c) => (
            <Badge
              key={c}
              variant={form.compatible_with.includes(c) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setForm({
                ...form,
                compatible_with: form.compatible_with.includes(c)
                  ? form.compatible_with.filter((x) => x !== c)
                  : [...form.compatible_with, c],
              })}
            >
              {c}
            </Badge>
          ))}
        </div>
        <div className="flex gap-1.5 mt-2">
          <Input
            value={newCompatibleInput}
            onChange={(e) => setNewCompatibleInput(e.target.value)}
            placeholder="Adicionar compatível..."
            className="h-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newCompatibleInput.trim()) {
                const val = newCompatibleInput.trim();
                if (!allCompatible.includes(val)) {
                  setCustomCompatible([...customCompatible, val]);
                }
                if (!form.compatible_with.includes(val)) {
                  setForm({ ...form, compatible_with: [...form.compatible_with, val] });
                }
                setNewCompatibleInput("");
              }
            }}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2"
            onClick={() => {
              if (!newCompatibleInput.trim()) return;
              const val = newCompatibleInput.trim();
              if (!allCompatible.includes(val)) {
                setCustomCompatible([...customCompatible, val]);
              }
              if (!form.compatible_with.includes(val)) {
                setForm({ ...form, compatible_with: [...form.compatible_with, val] });
              }
              setNewCompatibleInput("");
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><Label>Estoque Mín.</Label><Input type="number" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: e.target.value })} /></div>
        <div><Label>Estoque Ideal</Label><Input type="number" value={form.ideal_quantity} onChange={(e) => setForm({ ...form, ideal_quantity: e.target.value })} /></div>
        <div><Label>Custo Unit.</Label><CurrencyInput value={form.unit_cost} onChange={(v) => setForm({ ...form, unit_cost: v })} /></div>
      </div>
      <div>
        <Label>Fornecedor Principal</Label>
        <SelectWithAdd
          value={form.supplier_id}
          onValueChange={(v) => setForm({ ...form, supplier_id: v })}
          placeholder="Selecionar"
          options={(suppliers as any[]).map((s) => ({ id: s.id, label: s.name }))}
          onAdd={async (name) => {
            const { data, error } = await (supabase.from(tables.inventorySuppliers as any) as any).insert({ name }).select("id").single();
            if (error) { toast.error(error.message); return null; }
            qc.invalidateQueries({ queryKey: [tables.inventorySuppliers] });
            toast.success("Fornecedor criado!");
            return data?.id || null;
          }}
        />
      </div>
      <Button onClick={() => saveItem.mutate()} disabled={saveItem.isPending} className="w-full">
        {saveItem.isPending ? "Salvando..." : editingItem ? "Salvar Alterações" : "Cadastrar Item"}
      </Button>
    </div>
  );

  return (
    <>
      {selectedItem && (
        <InventoryItemDashboard item={selectedItem} onBack={() => setSelectedItem(null)} />
      )}

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" />Itens de Estoque</CardTitle>
            <Dialog open={open} onOpenChange={(v) => { if (!v) closeForm(); else setOpen(true); }}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={(e) => { e.preventDefault(); requestAdd(); }}><Plus className="h-4 w-4 mr-1" />Novo Item</Button>
              </DialogTrigger>
              {open && (
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingItem ? "Editar Item" : "Novo Item de Estoque"}</DialogTitle>
                  </DialogHeader>
                  {renderForm()}
                </DialogContent>
              )}
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou código..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={selectedType || "__none__"} onValueChange={(v) => setSelectedType(v === "__none__" ? "" : v)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Todos os Tipos</SelectItem>
                {ITEM_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum item encontrado.</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Reserv.</TableHead>
                    <TableHead className="text-right">Disponível</TableHead>
                    <TableHead className="text-right">Custo Méd.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedItem(item)}>
                      <TableCell className="w-12 pr-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="h-8 w-8 rounded object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{item.internal_code || "-"}</TableCell>
                      <TableCell className="text-xs">{ITEM_TYPES.find((t) => t.value === item.item_type)?.label}</TableCell>
                      <TableCell className="text-right">{Number(item.current_quantity)}</TableCell>
                      <TableCell className="text-right">{Number(item.reserved_quantity)}</TableCell>
                      <TableCell className="text-right font-medium">{Number(item.current_quantity) - Number(item.reserved_quantity)}</TableCell>
                      <TableCell className="text-right">R$ {Number(item.avg_cost || item.unit_cost).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{getStockBadge(item)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Calibrar estoque" onClick={() => requestCalibrate(item)}>
                            <Scale className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => requestDelete(item)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <InventoryPasswordPrompt
        open={passwordPromptOpen}
        onOpenChange={(v) => { if (!v) { setPasswordPromptOpen(false); if (!open && !showCalibrateDialog) { setDeleteTarget(null); setCalibrateTarget(null); } } }}
        onSuccess={() => {
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
        }}
        table={table}
        title={deleteTarget ? "Confirmar Exclusão" : calibrateTarget ? "Calibrar Estoque" : "Autenticação de Estoque"}
        description={deleteTarget ? `Digite a senha do estoque para excluir "${deleteTarget?.name}".` : calibrateTarget ? `Digite a senha para calibrar o estoque de "${calibrateTarget?.name}".` : "Digite a senha do estoque para cadastrar um novo item."}
      />

      {/* Calibration dialog */}
      <Dialog open={showCalibrateDialog} onOpenChange={(v) => { if (!v) { setShowCalibrateDialog(false); setCalibrateTarget(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Calibrar Estoque
            </DialogTitle>
            <DialogDescription>
              Ajuste manual da quantidade de <strong>{calibrateTarget?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Quantidade Atual</Label>
              <Input value={calibrateTarget?.current_quantity ?? 0} disabled className="bg-muted" />
            </div>
            <div>
              <Label>Nova Quantidade</Label>
              <Input
                type="number"
                min={0}
                step="any"
                value={calibrateQty}
                onChange={(e) => setCalibrateQty(e.target.value)}
                autoFocus
                placeholder="0"
              />
            </div>
            <div>
              <Label>Motivo (opcional)</Label>
              <Input
                value={calibrateNote}
                onChange={(e) => setCalibrateNote(e.target.value)}
                placeholder="Ex: Contagem física, ajuste..."
              />
            </div>
            {calibrateTarget && Number(calibrateQty) !== Number(calibrateTarget.current_quantity) && (
              <p className="text-xs text-muted-foreground">
                Diferença: <strong className={Number(calibrateQty) > Number(calibrateTarget.current_quantity) ? "text-emerald-600" : "text-destructive"}>
                  {Number(calibrateQty) > Number(calibrateTarget.current_quantity) ? "+" : ""}
                  {(Number(calibrateQty) - Number(calibrateTarget.current_quantity)).toLocaleString("pt-BR")}
                </strong>
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowCalibrateDialog(false); setCalibrateTarget(null); }}>Cancelar</Button>
            <Button onClick={executeCalibrate} disabled={calibrating}>
              {calibrating ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
    </>
  );
}
