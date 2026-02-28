import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ListTodo, AlertTriangle, Factory, CalendarDays, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, addDays, isToday, isBefore } from "date-fns";
import { ProductionCards } from "./ProductionCards";
import { SectorKanban } from "./SectorKanban";

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
