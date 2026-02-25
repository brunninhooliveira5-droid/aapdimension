import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, List, Columns3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const statusLabels: Record<string, string> = { a_fazer: "A fazer", em_andamento: "Em andamento", aguardando: "Aguardando", concluida: "Concluída" };
const statusColors: Record<string, string> = { a_fazer: "bg-muted text-muted-foreground", em_andamento: "bg-blue-500/10 text-blue-600", aguardando: "bg-amber-500/10 text-amber-600", concluida: "bg-green-500/10 text-green-600" };
const priorityColors: Record<string, string> = { alta: "bg-destructive/10 text-destructive", media: "bg-amber-500/10 text-amber-600", baixa: "bg-muted text-muted-foreground" };
const categoryLabels: Record<string, string> = { producao: "Produção", financeiro: "Financeiro", comercial: "Comercial", tecnico: "Técnico", app_sistema: "App/Sistema" };

const emptyTask = { title: "", description: "", priority: "media", category: "producao", responsible: "", due_date: "", status: "a_fazer" };

export function DimensionTasks() {
  const { session } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [view, setView] = useState<"list" | "kanban">("kanban");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [form, setForm] = useState(emptyTask);
  const [saving, setSaving] = useState(false);
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const fetch = async () => {
    const { data } = await supabase.from("dimension_tasks").select("*").order("created_at", { ascending: false });
    setTasks(data ?? []);
  };

  useEffect(() => { fetch(); }, []);

  const filtered = tasks.filter((t) => {
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    return true;
  });

  const openCreate = () => { setEditingTask(null); setForm(emptyTask); setDialogOpen(true); };
  const openEdit = (t: any) => { setEditingTask(t); setForm({ title: t.title, description: t.description, priority: t.priority, category: t.category, responsible: t.responsible, due_date: t.due_date ?? "", status: t.status }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload: any = { ...form, due_date: form.due_date || null };
    if (editingTask) {
      if (form.status === "concluida" && editingTask.status !== "concluida") payload.completed_at = new Date().toISOString();
      await supabase.from("dimension_tasks").update(payload).eq("id", editingTask.id);
      toast.success("Tarefa atualizada!");
    } else {
      payload.created_by = session?.user?.id;
      await supabase.from("dimension_tasks").insert(payload);
      toast.success("Tarefa criada!");
    }
    setDialogOpen(false); setSaving(false); fetch();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("dimension_tasks").delete().eq("id", id);
    toast.success("Tarefa excluída!"); fetch();
  };

  const kanbanCols = ["a_fazer", "em_andamento", "aguardando", "concluida"];

  const TaskCard = ({ task }: { task: any }) => (
    <div className="p-3 rounded-lg border bg-card space-y-2 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-1">
        <p className="text-sm font-medium leading-tight">{task.title}</p>
        <div className="flex gap-0.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(task)}><Pencil className="h-3 w-3" /></Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Excluir tarefa?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(task.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className={`text-[9px] ${priorityColors[task.priority]}`}>{task.priority}</Badge>
        <Badge variant="outline" className="text-[9px]">{categoryLabels[task.category] ?? task.category}</Badge>
      </div>
      {task.responsible && <p className="text-[10px] text-muted-foreground">👤 {task.responsible}</p>}
      {task.due_date && <p className="text-[10px] text-muted-foreground">📅 {format(new Date(task.due_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}</p>}
    </div>
  );

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="producao">Produção</SelectItem>
              <SelectItem value="financeiro">Financeiro</SelectItem>
              <SelectItem value="comercial">Comercial</SelectItem>
              <SelectItem value="tecnico">Técnico</SelectItem>
              <SelectItem value="app_sistema">App/Sistema</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-md overflow-hidden">
            <Button variant={view === "kanban" ? "default" : "ghost"} size="sm" className="rounded-none h-8 gap-1" onClick={() => setView("kanban")}><Columns3 className="h-3.5 w-3.5" />Kanban</Button>
            <Button variant={view === "list" ? "default" : "ghost"} size="sm" className="rounded-none h-8 gap-1" onClick={() => setView("list")}><List className="h-3.5 w-3.5" />Lista</Button>
          </div>
          <Button size="sm" className="gap-1.5" onClick={openCreate}><Plus className="h-3.5 w-3.5" />Nova Tarefa</Button>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kanbanCols.map((col) => (
            <div key={col} className="space-y-2">
              <div className={`rounded-md px-3 py-1.5 text-xs font-semibold ${statusColors[col]}`}>{statusLabels[col]} ({filtered.filter((t) => t.status === col).length})</div>
              <div className="space-y-2 min-h-[100px]">
                {filtered.filter((t) => t.status === col).map((task) => <TaskCard key={task.id} task={task} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Nenhuma tarefa encontrada.</p> : filtered.map((task) => (
            <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <Badge variant="outline" className={`text-[9px] shrink-0 ${statusColors[task.status]}`}>{statusLabels[task.status]}</Badge>
              <span className="text-sm flex-1 truncate">{task.title}</span>
              <Badge variant="outline" className={`text-[9px] ${priorityColors[task.priority]}`}>{task.priority}</Badge>
              {task.due_date && <span className="text-[10px] text-muted-foreground">{format(new Date(task.due_date + "T00:00:00"), "dd/MM", { locale: ptBR })}</span>}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(task)}><Pencil className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingTask ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea placeholder="Descrição (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="producao">Produção</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="tecnico">Técnico</SelectItem>
                  <SelectItem value="app_sistema">App/Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Responsável" value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} />
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
            {editingTask && (
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : editingTask ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
