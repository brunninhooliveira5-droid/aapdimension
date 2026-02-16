import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, GripVertical, ArrowUpCircle, ArrowDownCircle, ArrowLeftRight } from "lucide-react";

interface CategoryRow {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  receita: { label: "Receita", icon: <ArrowUpCircle className="w-3.5 h-3.5" />, className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  despesa: { label: "Despesa", icon: <ArrowDownCircle className="w-3.5 h-3.5" />, className: "bg-red-500/15 text-red-400 border-red-500/30" },
  ambos: { label: "Ambos", icon: <ArrowLeftRight className="w-3.5 h-3.5" />, className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
};

export function FinanceCategories() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin_master";

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");

  const [dialog, setDialog] = useState<{ open: boolean; item?: CategoryRow }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });

  // Dialog form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("despesa");
  const [formActive, setFormActive] = useState(true);
  const [formOrder, setFormOrder] = useState("0");
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("finance_categories")
      .select("*")
      .order("sort_order", { ascending: true });
    setCategories((data as CategoryRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (dialog.open) {
      if (dialog.item) {
        setFormName(dialog.item.name);
        setFormType(dialog.item.type);
        setFormActive(dialog.item.is_active);
        setFormOrder(String(dialog.item.sort_order));
      } else {
        setFormName("");
        setFormType("despesa");
        setFormActive(true);
        setFormOrder(String(categories.length));
      }
    }
  }, [dialog.open, dialog.item, categories.length]);

  const filtered = useMemo(() => {
    return categories.filter(cat => {
      if (typeFilter !== "todos" && cat.type !== typeFilter) return false;
      if (search) {
        return cat.name.toLowerCase().includes(search.toLowerCase());
      }
      return true;
    });
  }, [categories, typeFilter, search]);

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Informe o nome da categoria.");
      return;
    }
    setSaving(true);

    if (dialog.item) {
      const { error } = await supabase
        .from("finance_categories")
        .update({
          name: formName.trim(),
          type: formType,
          is_active: formActive,
          sort_order: parseInt(formOrder) || 0,
        })
        .eq("id", dialog.item.id);
      if (error) { toast.error("Erro: " + error.message); setSaving(false); return; }
      toast.success("Categoria atualizada!");
    } else {
      const { error } = await supabase
        .from("finance_categories")
        .insert({
          name: formName.trim(),
          type: formType,
          is_active: formActive,
          sort_order: parseInt(formOrder) || 0,
        } as any);
      if (error) { toast.error("Erro: " + error.message); setSaving(false); return; }
      toast.success("Categoria criada!");
    }

    setSaving(false);
    setDialog({ open: false });
    fetchData();
  };

  const handleDelete = async () => {
    const { error } = await supabase
      .from("finance_categories")
      .delete()
      .eq("id", deleteConfirm.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Categoria excluída!");
    setDeleteConfirm({ open: false, id: "", name: "" });
    fetchData();
  };

  const handleToggleActive = async (cat: CategoryRow) => {
    const { error } = await supabase
      .from("finance_categories")
      .update({ is_active: !cat.is_active })
      .eq("id", cat.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    fetchData();
  };

  const stats = useMemo(() => ({
    total: categories.length,
    active: categories.filter(c => c.is_active).length,
    receita: categories.filter(c => c.type === "receita").length,
    despesa: categories.filter(c => c.type === "despesa").length,
    ambos: categories.filter(c => c.type === "ambos").length,
  }), [categories]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="gradient-card rounded-lg border border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="gradient-card rounded-lg border border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">Ativas</p>
          <p className="text-lg font-bold text-emerald-400">{stats.active}</p>
        </div>
        <div className="gradient-card rounded-lg border border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">Receitas</p>
          <p className="text-lg font-bold text-foreground">{stats.receita}</p>
        </div>
        <div className="gradient-card rounded-lg border border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">Despesas</p>
          <p className="text-lg font-bold text-foreground">{stats.despesa}</p>
        </div>
        <div className="gradient-card rounded-lg border border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">Ambos</p>
          <p className="text-lg font-bold text-foreground">{stats.ambos}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar categoria..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-accent border-border"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px] bg-accent border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Tipos</SelectItem>
            <SelectItem value="receita">Receita</SelectItem>
            <SelectItem value="despesa">Despesa</SelectItem>
            <SelectItem value="ambos">Ambos</SelectItem>
          </SelectContent>
        </Select>
        {canEdit && (
          <Button size="sm" className="gap-1.5" onClick={() => setDialog({ open: true })}>
            <Plus className="w-4 h-4" /> Nova Categoria
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="gradient-card rounded-lg border border-border overflow-hidden">
        {loading ? (
          <p className="text-sm text-muted-foreground p-4 text-center">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4 text-center">Nenhuma categoria encontrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/30">
                  <th className="text-left p-3 font-medium text-muted-foreground w-12">#</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Ativa</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Ordem</th>
                  {canEdit && <th className="text-center p-3 font-medium text-muted-foreground">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map(cat => {
                  const typeInfo = TYPE_LABELS[cat.type] || TYPE_LABELS.despesa;
                  return (
                    <tr key={cat.id} className={`hover:bg-accent/20 transition-colors ${!cat.is_active ? "opacity-50" : ""}`}>
                      <td className="p-3 text-muted-foreground">
                        <GripVertical className="w-4 h-4" />
                      </td>
                      <td className="p-3 font-medium text-foreground">{cat.name}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${typeInfo.className}`}>
                          {typeInfo.icon}
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {canEdit ? (
                          <Switch
                            checked={cat.is_active}
                            onCheckedChange={() => handleToggleActive(cat)}
                          />
                        ) : (
                          <span className={cat.is_active ? "text-emerald-400" : "text-muted-foreground"}>
                            {cat.is_active ? "Sim" : "Não"}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center text-muted-foreground">{cat.sort_order}</td>
                      {canEdit && (
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setDialog({ open: true, item: cat })}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteConfirm({ open: true, id: cat.id, name: cat.name })}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialog.open} onOpenChange={o => !o && setDialog({ open: false })}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {dialog.item ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="bg-accent border-border"
                placeholder="Ex: Salários, Vendas, Impostos..."
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="bg-accent border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">
                    <span className="flex items-center gap-1.5">
                      <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-400" /> Receita
                    </span>
                  </SelectItem>
                  <SelectItem value="despesa">
                    <span className="flex items-center gap-1.5">
                      <ArrowDownCircle className="w-3.5 h-3.5 text-red-400" /> Despesa
                    </span>
                  </SelectItem>
                  <SelectItem value="ambos">
                    <span className="flex items-center gap-1.5">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" /> Ambos
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ordem de exibição</Label>
              <Input
                type="number"
                min="0"
                value={formOrder}
                onChange={e => setFormOrder(e.target.value)}
                className="bg-accent border-border"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formActive} onCheckedChange={setFormActive} />
              <Label>Categoria ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-border">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : dialog.item ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={o => !o && setDeleteConfirm({ ...deleteConfirm, open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteConfirm.name}"? Contas associadas a esta categoria perderão a referência.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
