import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const categoryLabels: Record<string, string> = { producao: "Produção", financeiro: "Financeiro", comercial: "Comercial", tecnico: "Técnico", app_sistema: "App/Sistema" };
const statusLabels: Record<string, string> = { pendente: "Pendente", em_andamento: "Em andamento", resolvida: "Resolvida" };
const statusColors: Record<string, string> = { pendente: "bg-destructive/10 text-destructive", em_andamento: "bg-amber-500/10 text-amber-600", resolvida: "bg-green-500/10 text-green-600" };

const emptyForm = { title: "", description: "", priority: "media", category: "producao", responsible: "", due_date: "", status: "pendente" };

export function DimensionPendencies() {
  const { session } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState("all");

  const fetch = async () => {
    const { data } = await supabase.from("dimension_pendencies").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  };

  useEffect(() => { fetch(); }, []);

  const filtered = items.filter((i) => filterCat === "all" || i.category === filterCat);
  const grouped = Object.entries(categoryLabels).map(([key, label]) => ({
    key, label, items: filtered.filter((i) => i.category === key),
  })).filter((g) => filterCat === "all" ? g.items.length > 0 : g.key === filterCat);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (item: any) => { setEditing(item); setForm({ title: item.title, description: item.description, priority: item.priority, category: item.category, responsible: item.responsible, due_date: item.due_date ?? "", status: item.status }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload: any = { ...form, due_date: form.due_date || null };
    if (form.status === "resolvida" && (!editing || editing.status !== "resolvida")) payload.resolved_at = new Date().toISOString();
    if (editing) {
      await supabase.from("dimension_pendencies").update(payload).eq("id", editing.id);
      toast.success("Pendência atualizada!");
    } else {
      payload.created_by = session?.user?.id;
      await supabase.from("dimension_pendencies").insert(payload);
      toast.success("Pendência criada!");
    }
    setDialogOpen(false); setSaving(false); fetch();
  };

  const resolve = async (id: string) => {
    await supabase.from("dimension_pendencies").update({ status: "resolvida", resolved_at: new Date().toISOString() } as any).eq("id", id);
    toast.success("Resolvida!"); fetch();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("dimension_pendencies").delete().eq("id", id);
    toast.success("Excluída!"); fetch();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between gap-2">
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" className="gap-1.5" onClick={openCreate}><Plus className="h-3.5 w-3.5" />Nova Pendência</Button>
      </div>

      {grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma pendência encontrada.</p>
      ) : grouped.map((group) => (
        <div key={group.key} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</h3>
          {group.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <Badge variant="outline" className={`text-[9px] shrink-0 ${statusColors[item.status]}`}>{statusLabels[item.status]}</Badge>
              <span className="text-sm flex-1 truncate">{item.title}</span>
              {item.responsible && <span className="text-[10px] text-muted-foreground shrink-0">👤 {item.responsible}</span>}
              {item.due_date && <span className="text-[10px] text-muted-foreground shrink-0">{format(new Date(item.due_date + "T00:00:00"), "dd/MM", { locale: ptBR })}</span>}
              {item.status !== "resolvida" && <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => resolve(item.id)}><CheckCircle2 className="h-3.5 w-3.5" /></Button>}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir?</AlertDialogTitle><AlertDialogDescription>Ação irreversível.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      ))}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar Pendência" : "Nova Pendência"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="alta">Alta</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="baixa">Baixa</SelectItem></SelectContent>
              </Select>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Responsável" value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} />
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
            {editing && (
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
