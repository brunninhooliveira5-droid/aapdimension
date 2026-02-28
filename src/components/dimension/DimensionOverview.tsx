import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ListTodo, AlertTriangle, Factory, CalendarDays, Plus, Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, addDays, isToday, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProductionCards } from "./ProductionCards";
import { SectorKanban } from "./SectorKanban";

const statusLabels: Record<string, string> = { a_fazer: "A fazer", em_andamento: "Em andamento", aguardando: "Aguardando", atrasada: "Atrasada", concluida: "Concluída" };
const statusColors: Record<string, string> = { a_fazer: "bg-muted text-muted-foreground", em_andamento: "bg-blue-500/10 text-blue-600", aguardando: "bg-amber-500/10 text-amber-600", atrasada: "bg-red-500/10 text-red-600", concluida: "bg-green-500/10 text-green-600" };
const priorityColors: Record<string, string> = { alta: "bg-destructive/10 text-destructive", media: "bg-amber-500/10 text-amber-600", baixa: "bg-muted text-muted-foreground" };
const categoryLabels: Record<string, string> = { producao: "Produção", financeiro: "Financeiro", comercial: "Comercial", tecnico: "Técnico", app_sistema: "App/Sistema" };

interface DimensionOverviewProps {
  onNavigateToTasks?: () => void;
}

export function DimensionOverview({ onNavigateToTasks }: DimensionOverviewProps) {
  const { session } = useAuth();
  const [activeSector, setActiveSector] = useState<{ key: string; title: string } | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [pendencies, setPendencies] = useState<any[]>([]);
  const [production, setProduction] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", priority: "media", responsible: "", due_date: "" });
  const [taskFileCounts, setTaskFileCounts] = useState<Record<string, number>>({});

  const fetchAll = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const in7days = format(addDays(new Date(), 7), "yyyy-MM-dd");

    const [t, p, pr, ev, fc] = await Promise.all([
      supabase.from("dimension_tasks").select("*").order("due_date", { ascending: true }),
      supabase.from("dimension_pendencies").select("*").neq("status", "resolvida").order("due_date", { ascending: true }),
      supabase.from("dimension_production_items").select("*").neq("status", "pronto").order("estimated_deadline", { ascending: true }),
      supabase.from("dimension_schedule_events").select("*").gte("event_date", today).lte("event_date", in7days).order("event_date", { ascending: true }),
      supabase.from("dimension_task_files").select("task_id"),
    ]);
    setTasks(t.data ?? []);
    setPendencies(p.data ?? []);
    setProduction(pr.data ?? []);
    setEvents(ev.data ?? []);
    const counts: Record<string, number> = {};
    (fc.data ?? []).forEach((f: any) => { counts[f.task_id] = (counts[f.task_id] || 0) + 1; });
    setTaskFileCounts(counts);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async () => {
    if (!newTask.title.trim() || !session?.user?.id) return;
    setSaving(true);
    const { error } = await supabase.from("dimension_tasks").insert({
      title: newTask.title,
      priority: newTask.priority,
      responsible: newTask.responsible,
      due_date: newTask.due_date || null,
      created_by: session.user.id,
      status: "a_fazer",
    });
    setSaving(false);
    if (error) { toast.error("Erro ao criar tarefa"); return; }
    toast.success("Tarefa criada!");
    setNewTask({ title: "", priority: "media", responsible: "", due_date: "" });
    setCreateOpen(false);
    fetchAll();
  };

  const todayTasks = tasks.filter((t) => t.due_date && isToday(new Date(t.due_date + "T00:00:00")) && t.status !== "concluida");
  const overdue = [...tasks.filter(t => t.due_date && isBefore(new Date(t.due_date + "T00:00:00"), new Date()) && t.status !== "concluida"),
    ...pendencies.filter(p => p.due_date && isBefore(new Date(p.due_date + "T00:00:00"), new Date()) && p.status !== "resolvida")];
  const inProgress = production.filter((p) => p.status === "em_fabricacao");
  const upcoming = events.length;

  const kpis = [
    { label: "Tarefas do dia", value: todayTasks.length, icon: ListTodo, color: "text-primary" },
    { label: "Pendências atrasadas", value: overdue.length, icon: AlertTriangle, color: "text-destructive" },
    { label: "Produção em andamento", value: inProgress.length, icon: Factory, color: "text-amber-500" },
    { label: "Próximos prazos (7d)", value: upcoming, icon: CalendarDays, color: "text-blue-500" },
  ];

  if (activeSector) {
    return <SectorKanban sectorKey={activeSector.key} sectorTitle={activeSector.title} onBack={() => setActiveSector(null)} />;
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Cards de Produção */}
      <ProductionCards onCardClick={(card) => setActiveSector({ key: card.key, title: card.title })} />

      {/* KPIs + botão discreto */}
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
          {kpis.map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${kpi.color}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="ml-2 h-8 w-8 opacity-50 hover:opacity-100 transition-opacity"
          onClick={() => setCreateOpen(true)}
          title="Nova tarefa"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Tarefas ativas */}
      {(() => {
        const activeTasks = tasks.filter(t => t.status !== "concluida");
        if (activeTasks.length === 0) return null;
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">Tarefas ativas ({activeTasks.length})</h3>
              {onNavigateToTasks && (
                <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={onNavigateToTasks}>
                  Ver todas →
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {activeTasks.map((task) => (
                <div key={task.id} className="p-3 rounded-lg border bg-card space-y-2 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-sm font-medium leading-tight">{task.title}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className={`text-[9px] ${statusColors[task.status]}`}>{statusLabels[task.status] ?? task.status}</Badge>
                    <Badge variant="outline" className={`text-[9px] ${priorityColors[task.priority]}`}>{task.priority}</Badge>
                    <Badge variant="outline" className="text-[9px]">{categoryLabels[task.category] ?? task.category}</Badge>
                  </div>
                  {task.responsible && <p className="text-[10px] text-muted-foreground">👤 {task.responsible}</p>}
                  {task.due_date && <p className="text-[10px] text-muted-foreground">📅 {format(new Date(task.due_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}</p>}
                  {(taskFileCounts[task.id] || 0) > 0 && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Paperclip className="w-3 h-3" />{taskFileCounts[task.id]} arquivo(s)</p>}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Dialog nova tarefa */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Nova Tarefa</DialogTitle>
            <DialogDescription className="sr-only">Criar nova tarefa rápida</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título da tarefa" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
            <Input placeholder="Responsável" value={newTask.responsible} onChange={(e) => setNewTask({ ...newTask, responsible: e.target.value })} />
            <div className="flex gap-2">
              <Input type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} className="flex-1" />
              <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={handleCreate} disabled={saving || !newTask.title.trim()}>
              {saving ? "Salvando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
