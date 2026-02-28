import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListTodo, AlertTriangle, Factory, CalendarDays, Plus, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, addDays, isToday, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProductionCards } from "./ProductionCards";
import { SectorKanban } from "./SectorKanban";

const priorityColors: Record<string, string> = {
  alta: "bg-destructive/10 text-destructive border-destructive/20",
  media: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  baixa: "bg-muted text-muted-foreground border-border",
};

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
  const [newTask, setNewTask] = useState({ title: "", priority: "media", category: "producao" });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const in7days = format(addDays(new Date(), 7), "yyyy-MM-dd");

    const [t, p, pr, ev] = await Promise.all([
      supabase.from("dimension_tasks").select("*").order("due_date", { ascending: true }),
      supabase.from("dimension_pendencies").select("*").neq("status", "resolvida").order("due_date", { ascending: true }),
      supabase.from("dimension_production_items").select("*").neq("status", "pronto").order("estimated_deadline", { ascending: true }),
      supabase.from("dimension_schedule_events").select("*").gte("event_date", today).lte("event_date", in7days).order("event_date", { ascending: true }),
    ]);
    setTasks(t.data ?? []);
    setPendencies(p.data ?? []);
    setProduction(pr.data ?? []);
    setEvents(ev.data ?? []);
  };

  useEffect(() => { fetchAll(); }, []);

  const todayTasks = tasks.filter((t) => t.due_date && isToday(new Date(t.due_date + "T00:00:00")) && t.status !== "concluida");
  const overdue = [...tasks.filter(t => t.due_date && isBefore(new Date(t.due_date + "T00:00:00"), new Date()) && t.status !== "concluida"),
    ...pendencies.filter(p => p.due_date && isBefore(new Date(p.due_date + "T00:00:00"), new Date()) && p.status !== "resolvida")];
  const inProgress = production.filter((p) => p.status === "em_fabricacao");
  const upcoming = events.length;

  const topPriority = [...tasks.filter(t => t.status !== "concluida")]
    .sort((a, b) => {
      const pOrder: Record<string, number> = { alta: 0, media: 1, baixa: 2 };
      return (pOrder[a.priority] ?? 1) - (pOrder[b.priority] ?? 1);
    })
    .slice(0, 10);

  const handleCreate = async () => {
    if (!newTask.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("dimension_tasks").insert({
      title: newTask.title,
      priority: newTask.priority,
      category: newTask.category,
      due_date: format(new Date(), "yyyy-MM-dd"),
      created_by: session?.user?.id,
    } as any);
    if (error) toast.error("Erro ao criar tarefa");
    else { toast.success("Tarefa criada!"); setNewTask({ title: "", priority: "media", category: "producao" }); setCreateOpen(false); fetchAll(); }
    setSaving(false);
  };

  const markDone = async (id: string) => {
    await supabase.from("dimension_tasks").update({ status: "concluida", completed_at: new Date().toISOString() } as any).eq("id", id);
    toast.success("Tarefa concluída!");
    fetchAll();
  };

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

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      {/* Prioridade de hoje */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Prioridade de Hoje</CardTitle>
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Criar tarefa
          </Button>
        </CardHeader>
        <CardContent>
          {topPriority.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma tarefa pendente 🎉</p>
          ) : (
            <div className="space-y-2">
              {topPriority.map((task) => (
                <div key={task.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${priorityColors[task.priority]}`}>
                      {task.priority}
                    </Badge>
                    <span className="text-sm truncate">{task.title}</span>
                    {task.due_date && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {format(new Date(task.due_date + "T00:00:00"), "dd/MM", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-green-600" onClick={() => markDone(task.id)}>
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog criar tarefa rápida */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Tarefa Rápida</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título da tarefa" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
              <Select value={newTask.category} onValueChange={(v) => setNewTask({ ...newTask, category: v })}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Salvando..." : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
