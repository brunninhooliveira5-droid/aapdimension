import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

interface FixedExpense {
  id: string;
  name: string;
  category_id: string | null;
  monthly_value: number;
  due_day: number;
  is_active: boolean;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
}

interface CategoryRow {
  id: string;
  name: string;
}

export function FixedExpenses() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin_master" || user?.role === "financeiro";

  const [items, setItems] = useState<FixedExpense[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; item?: FixedExpense }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });

  // Form state
  const [form, setForm] = useState({
    name: "", category_id: "", monthly_value: "", due_day: "1",
    is_active: true, payment_method: "", notes: "",
  });

  const fetchData = async () => {
    setLoading(true);
    const [{ data: expenses }, { data: cats }] = await Promise.all([
      supabase.from("finance_fixed_expenses").select("*").order("name"),
      supabase.from("finance_categories").select("id, name").eq("is_active", true).in("type", ["despesa", "ambos"]).order("sort_order"),
    ]);
    setItems((expenses as FixedExpense[]) ?? []);
    setCategories((cats as CategoryRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openDialog = (item?: FixedExpense) => {
    if (item) {
      setForm({
        name: item.name, category_id: item.category_id ?? "",
        monthly_value: String(item.monthly_value), due_day: String(item.due_day),
        is_active: item.is_active, payment_method: item.payment_method ?? "",
        notes: item.notes ?? "",
      });
    } else {
      setForm({ name: "", category_id: "", monthly_value: "", due_day: "1", is_active: true, payment_method: "", notes: "" });
    }
    setDialog({ open: true, item });
  };

  const handleSave = async () => {
    if (!form.name || !form.monthly_value) {
      toast.error("Nome e valor mensal são obrigatórios");
      return;
    }
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) { toast.error("Usuário não autenticado"); return; }
    const payload = {
      name: form.name,
      category_id: form.category_id || null,
      monthly_value: parseFloat(form.monthly_value) || 0,
      due_day: parseInt(form.due_day) || 1,
      is_active: form.is_active,
      payment_method: form.payment_method || null,
      notes: form.notes || null,
      created_by: userId,
    };

    if (dialog.item) {
      const { error } = await supabase.from("finance_fixed_expenses").update(payload).eq("id", dialog.item.id);
      if (error) { toast.error("Erro: " + error.message); return; }
      toast.success("Conta fixa atualizada!");
    } else {
      const { error } = await supabase.from("finance_fixed_expenses").insert(payload);
      if (error) { toast.error("Erro: " + error.message); return; }
      toast.success("Conta fixa criada!");
    }
    setDialog({ open: false });
    fetchData();
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("finance_fixed_expenses").delete().eq("id", deleteConfirm.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Conta fixa excluída!");
    setDeleteConfirm({ open: false, id: "", name: "" });
    fetchData();
  };

  const fmt = (v: number) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const totalActive = items.filter(i => i.is_active).reduce((s, i) => s + Number(i.monthly_value), 0);
  const getCatName = (id: string | null) => categories.find(c => c.id === id)?.name || "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" /> Contas Fixas Mensais
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total ativo: <span className="font-semibold text-foreground">{fmt(totalActive)}/mês</span>
          </p>
        </div>
        {canEdit && (
          <Button size="sm" className="gap-1.5" onClick={() => openDialog()}>
            <Plus className="w-4 h-4" /> Nova Conta Fixa
          </Button>
        )}
      </div>

      <div className="gradient-card rounded-lg border border-border overflow-hidden">
        {loading ? (
          <p className="text-sm text-muted-foreground p-4 text-center">Carregando...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4 text-center">Nenhuma conta fixa cadastrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Categoria</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Valor/mês</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Dia Vcto</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                  {canEdit && <th className="text-center p-3 font-medium text-muted-foreground">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {items.map(item => (
                  <tr key={item.id} className={cn("hover:bg-accent/20 transition-colors", !item.is_active && "opacity-50")}>
                    <td className="p-3 font-medium text-foreground">{item.name}</td>
                    <td className="p-3 text-muted-foreground">{getCatName(item.category_id)}</td>
                    <td className="p-3 text-right font-semibold text-foreground">{fmt(item.monthly_value)}</td>
                    <td className="p-3 text-center text-muted-foreground">Dia {item.due_day}</td>
                    <td className="p-3 text-center">
                      <StatusBadge status={item.is_active ? "ativo" : "inativo"} />
                    </td>
                    {canEdit && (
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDialog(item)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirm({ open: true, id: item.id, name: item.name })}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialog.open} onOpenChange={o => !o && setDialog({ open: false })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog.item ? "Editar Conta Fixa" : "Nova Conta Fixa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Aluguel" /></div>
            <div><Label>Categoria</Label>
              <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valor Mensal (R$) *</Label><Input type="number" value={form.monthly_value} onChange={e => setForm(f => ({ ...f, monthly_value: e.target.value }))} /></div>
              <div><Label>Dia de Vencimento</Label><Input type="number" min={1} max={31} value={form.due_day} onChange={e => setForm(f => ({ ...f, due_day: e.target.value }))} /></div>
            </div>
            <div><Label>Forma de Pagamento</Label><Input value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} placeholder="Ex: Boleto, PIX" /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Ativa</Label>
            </div>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false })}>Cancelar</Button>
            <Button onClick={handleSave}>{dialog.item ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirm.open} onOpenChange={o => !o && setDeleteConfirm({ ...deleteConfirm, open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Conta Fixa</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir "{deleteConfirm.name}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
