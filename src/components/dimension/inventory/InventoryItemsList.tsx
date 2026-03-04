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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package } from "lucide-react";
import { toast } from "sonner";
import { CurrencyInput } from "./CurrencyInput";
import { InventoryImageUpload } from "./InventoryImageUpload";

const ITEM_TYPES = [
  { value: "materia_prima", label: "Matéria-prima" },
  { value: "componente", label: "Componente" },
  { value: "consumivel", label: "Consumível" },
  { value: "ferramenta", label: "Ferramenta" },
  { value: "produto_acabado", label: "Produto Acabado" },
];

const COMPATIBLE = ["Orion", "Falcon", "Quantum", "Laser", "Geral"];

export function InventoryItemsList() {
  const { session } = useAuth();
  const { tables } = useModule();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", internal_code: "", subcategory: "", item_type: "materia_prima",
    compatible_with: [] as string[], min_quantity: "0", ideal_quantity: "0",
    unit_cost: "0", category_id: "", unit_id: "", location_id: "", supplier_id: "",
    image_url: null as string | null,
  });

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

  const createItem = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Nome obrigatório");
      const { error } = await supabase.from(tables.inventoryItems as any).insert({
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
        created_by: session?.user.id!,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item criado!");
      qc.invalidateQueries({ queryKey: [tables.inventoryItems] });
      setOpen(false);
      setForm({ name: "", internal_code: "", subcategory: "", item_type: "materia_prima", compatible_with: [], min_quantity: "0", ideal_quantity: "0", unit_cost: "0", category_id: "", unit_id: "", location_id: "", supplier_id: "", image_url: null });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (items as any[]).filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.internal_code.toLowerCase().includes(search.toLowerCase())
  );

  const getStockBadge = (item: any) => {
    const qty = Number(item.current_quantity);
    const min = Number(item.min_quantity);
    if (qty === 0) return <Badge variant="destructive">Zerado</Badge>;
    if (qty <= min) return <Badge variant="secondary" className="border-amber-500 text-amber-600">Baixo</Badge>;
    return <Badge variant="secondary" className="border-emerald-500 text-emerald-600">OK</Badge>;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" />Itens de Estoque</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo Item</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Novo Item de Estoque</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Foto do Item</Label>
                  <InventoryImageUpload
                    imageUrl={form.image_url}
                    onImageChange={(url) => setForm({ ...form, image_url: url })}
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
                    <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>{(categories as any[]).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Subcategoria</Label><Input value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Unidade</Label>
                    <Select value={form.unit_id} onValueChange={(v) => setForm({ ...form, unit_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>{(units as any[]).map((u) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Localização</Label>
                    <Select value={form.location_id} onValueChange={(v) => setForm({ ...form, location_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>{(locations as any[]).map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Compatível com</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {COMPATIBLE.map((c) => (
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
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Estoque Mín.</Label><Input type="number" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: e.target.value })} /></div>
                  <div><Label>Estoque Ideal</Label><Input type="number" value={form.ideal_quantity} onChange={(e) => setForm({ ...form, ideal_quantity: e.target.value })} /></div>
                  <div><Label>Custo Unit.</Label><CurrencyInput value={form.unit_cost} onChange={(v) => setForm({ ...form, unit_cost: v })} /></div>
                </div>
                <div>
                  <Label>Fornecedor Principal</Label>
                  <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>{(suppliers as any[]).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={() => createItem.mutate()} disabled={createItem.isPending} className="w-full">
                  {createItem.isPending ? "Salvando..." : "Cadastrar Item"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou código..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
