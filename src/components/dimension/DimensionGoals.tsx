import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Target, TrendingUp, Calendar, Users, Pencil, Trash2, RefreshCw, BarChart3, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, isAfter, isBefore, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";

const periodLabels: Record<string, string> = { mensal: "Mensal", trimestral: "Trimestral", anual: "Anual" };
const statusLabels: Record<string, string> = { em_andamento: "Em andamento", concluida: "Concluída", cancelada: "Cancelada", atrasada: "Atrasada" };
const statusColors: Record<string, string> = { em_andamento: "bg-blue-500/10 text-blue-600", concluida: "bg-green-500/10 text-green-600", cancelada: "bg-muted text-muted-foreground", atrasada: "bg-red-500/10 text-red-600" };
const typeLabels: Record<string, string> = { setor: "Por Setor", individual: "Individual" };

const defaultForm = {
  title: "", description: "", sector: "", responsible: "", goal_type: "setor",
  period_type: "mensal", period_start: "", period_end: "", target_value: "",
  current_value: "0", unit: "unidades", linked_task_category: "", linked_task_sector: "", status: "em_andamento",
};

export function DimensionGoals() {
  const { session } = useAuth();
  const [goals, setGoals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [historyGoalId, setHistoryGoalId] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [goalsRes, tasksRes, histRes] = await Promise.all([
      supabase.from("dimension_goals").select("*").order("created_at", { ascending: false }),
      supabase.from("dimension_tasks").select("*"),
      supabase.from("dimension_goal_history").select("*").order("snapshot_date", { ascending: true }),
    ]);
    if (goalsRes.data) setGoals(goalsRes.data);
    if (tasksRes.data) setTasks(tasksRes.data);
    if (histRes.data) setHistory(histRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Calcula progresso automático baseado em tarefas concluídas
  const getAutoProgress = (goal: any) => {
    if (!goal.linked_task_category && !goal.linked_task_sector) return null;
    const filtered = tasks.filter(t => {
      const matchCat = !goal.linked_task_category || t.category === goal.linked_task_category;
      const matchSector = !goal.linked_task_sector || t.sector === goal.linked_task_sector;
      const inPeriod = t.created_at >= goal.period_start && t.created_at <= goal.period_end + "T23:59:59";
      return matchCat && matchSector && inPeriod;
    });
    const completed = filtered.filter(t => t.status === "concluida").length;
    return { total: filtered.length, completed, percent: filtered.length > 0 ? Math.round((completed / filtered.length) * 100) : 0 };
  };

  const getProgress = (goal: any) => {
    const auto = getAutoProgress(goal);
    if (auto) return auto.percent;
    if (goal.target_value <= 0) return 0;
    return Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
  };

  const getEffectiveStatus = (goal: any) => {
    if (goal.status === "cancelada" || goal.status === "concluida") return goal.status;
    const progress = getProgress(goal);
    if (progress >= 100) return "concluida";
    if (isBefore(new Date(goal.period_end + "T23:59:59"), new Date()) && progress < 100) return "atrasada";
    return "em_andamento";
  };

  const syncGoalProgress = async (goal: any) => {
    const auto = getAutoProgress(goal);
    if (!auto) return;
    const { error } = await supabase.from("dimension_goals").update({
      current_value: auto.completed,
      target_value: auto.total > 0 ? auto.total : goal.target_value,
      status: auto.percent >= 100 ? "concluida" : goal.status,
    }).eq("id", goal.id);
    if (!error) {
      await supabase.from("dimension_goal_history").insert({ goal_id: goal.id, value: auto.completed });
      toast.success("Progresso sincronizado!");
      fetchAll();
    }
  };

  const openCreate = () => {
    setEditingGoal(null);
    const now = new Date();
    setForm({ ...defaultForm, period_start: format(startOfMonth(now), "yyyy-MM-dd"), period_end: format(endOfMonth(now), "yyyy-MM-dd") });
    setDialogOpen(true);
  };

  const openEdit = (goal: any) => {
    setEditingGoal(goal);
    setForm({
      title: goal.title, description: goal.description, sector: goal.sector || "", responsible: goal.responsible,
      goal_type: goal.goal_type, period_type: goal.period_type, period_start: goal.period_start, period_end: goal.period_end,
      target_value: String(goal.target_value), current_value: String(goal.current_value), unit: goal.unit,
      linked_task_category: goal.linked_task_category || "", linked_task_sector: goal.linked_task_sector || "", status: goal.status,
    });
    setDialogOpen(true);
  };

  const handlePeriodTypeChange = (type: string) => {
    const now = new Date();
    let start = "", end = "";
    if (type === "mensal") { start = format(startOfMonth(now), "yyyy-MM-dd"); end = format(endOfMonth(now), "yyyy-MM-dd"); }
    else if (type === "trimestral") { start = format(startOfQuarter(now), "yyyy-MM-dd"); end = format(endOfQuarter(now), "yyyy-MM-dd"); }
    else if (type === "anual") { start = format(startOfYear(now), "yyyy-MM-dd"); end = format(endOfYear(now), "yyyy-MM-dd"); }
    setForm(f => ({ ...f, period_type: type, period_start: start, period_end: end }));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !session?.user?.id) return;
    setSaving(true);
    const payload = {
      title: form.title, description: form.description, sector: form.sector || null,
      responsible: form.responsible, goal_type: form.goal_type, period_type: form.period_type,
      period_start: form.period_start, period_end: form.period_end,
      target_value: Number(form.target_value) || 0, current_value: Number(form.current_value) || 0,
      unit: form.unit, linked_task_category: form.linked_task_category || null,
      linked_task_sector: form.linked_task_sector || null, status: form.status,
    };
    let error;
    if (editingGoal) {
      ({ error } = await supabase.from("dimension_goals").update(payload).eq("id", editingGoal.id));
    } else {
      ({ error } = await supabase.from("dimension_goals").insert({ ...payload, created_by: session.user.id }));
    }
    setSaving(false);
    if (error) { toast.error("Erro ao salvar meta"); return; }
    toast.success(editingGoal ? "Meta atualizada!" : "Meta criada!");
    setDialogOpen(false);
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("dimension_goals").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Meta excluída");
    fetchAll();
  };

  const filtered = useMemo(() => {
    return goals.filter(g => {
      if (filterPeriod !== "all" && g.period_type !== filterPeriod) return false;
      if (filterType !== "all" && g.goal_type !== filterType) return false;
      return true;
    });
  }, [goals, filterPeriod, filterType]);

  // Stats
  const stats = useMemo(() => {
    const total = goals.length;
    const completed = goals.filter(g => getEffectiveStatus(g) === "concluida").length;
    const overdue = goals.filter(g => getEffectiveStatus(g) === "atrasada").length;
    const inProgress = goals.filter(g => getEffectiveStatus(g) === "em_andamento").length;
    const avgProgress = total > 0 ? Math.round(goals.reduce((sum, g) => sum + getProgress(g), 0) / total) : 0;
    return { total, completed, overdue, inProgress, avgProgress };
  }, [goals, tasks]);

  const historyForGoal = useMemo(() => {
    if (!historyGoalId) return [];
    return history.filter(h => h.goal_id === historyGoalId);
  }, [historyGoalId, history]);

  // Get unique sectors from tasks
  const sectorOptions = useMemo(() => {
    const sectors = new Set(tasks.map(t => t.sector).filter(Boolean));
    return Array.from(sectors);
  }, [tasks]);

  const categoryOptions = [
    { value: "producao", label: "Produção" },
    { value: "financeiro", label: "Financeiro" },
    { value: "comercial", label: "Comercial" },
    { value: "tecnico", label: "Técnico" },
    { value: "app_sistema", label: "App/Sistema" },
  ];

  if (loading) return <div className="py-8 text-center text-muted-foreground">Carregando metas...</div>;

  return (
    <div className="space-y-6">
      {/* Stats KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, icon: Target, color: "text-primary" },
          { label: "Em andamento", value: stats.inProgress, icon: TrendingUp, color: "text-blue-600" },
          { label: "Concluídas", value: stats.completed, icon: CheckCircle2, color: "text-green-600" },
          { label: "Atrasadas", value: stats.overdue, icon: Calendar, color: "text-red-600" },
          { label: "Progresso médio", value: `${stats.avgProgress}%`, icon: BarChart3, color: "text-amber-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color} shrink-0`} />
              <div>
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + Add */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos períodos</SelectItem>
            <SelectItem value="mensal">Mensal</SelectItem>
            <SelectItem value="trimestral">Trimestral</SelectItem>
            <SelectItem value="anual">Anual</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            <SelectItem value="setor">Por Setor</SelectItem>
            <SelectItem value="individual">Individual</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Nova Meta</Button>
      </div>

      {/* Goals Grid */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma meta encontrada. Crie sua primeira meta!</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(goal => {
            const progress = getProgress(goal);
            const effectiveStatus = getEffectiveStatus(goal);
            const auto = getAutoProgress(goal);
            return (
              <Card key={goal.id} className="flex flex-col">
                <CardHeader className="pb-2 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-semibold leading-tight">{goal.title}</CardTitle>
                    <div className="flex gap-1 shrink-0">
                      {auto && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Sincronizar" onClick={() => syncGoalProgress(goal)}>
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(goal)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(goal.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge className={`text-[9px] ${statusColors[effectiveStatus] || ""}`}>{statusLabels[effectiveStatus]}</Badge>
                    <Badge variant="outline" className="text-[9px]">{periodLabels[goal.period_type]}</Badge>
                    <Badge variant="outline" className="text-[9px]">{typeLabels[goal.goal_type]}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3 pt-0">
                  {goal.description && <p className="text-xs text-muted-foreground line-clamp-2">{goal.description}</p>}

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2.5" />
                    {auto ? (
                      <p className="text-[10px] text-muted-foreground">{auto.completed}/{auto.total} tarefas concluídas</p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">{goal.current_value}/{goal.target_value} {goal.unit}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                    {goal.sector && <div><span className="text-muted-foreground">Setor:</span> <span className="font-medium">{goal.sector}</span></div>}
                    {goal.responsible && <div><span className="text-muted-foreground">Responsável:</span> <span className="font-medium">{goal.responsible}</span></div>}
                    <div><span className="text-muted-foreground">Início:</span> <span className="font-medium">{format(new Date(goal.period_start + "T00:00:00"), "dd/MM/yy")}</span></div>
                    <div><span className="text-muted-foreground">Fim:</span> <span className="font-medium">{format(new Date(goal.period_end + "T00:00:00"), "dd/MM/yy")}</span></div>
                  </div>

                  <Button variant="ghost" size="sm" className="w-full text-xs h-7" onClick={() => setHistoryGoalId(goal.id)}>
                    <BarChart3 className="h-3 w-3 mr-1" /> Ver histórico
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGoal ? "Editar Meta" : "Nova Meta"}</DialogTitle>
            <DialogDescription>Preencha os campos para {editingGoal ? "editar" : "criar"} a meta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título da meta *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <Textarea placeholder="Descrição" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
                <Select value={form.goal_type} onValueChange={v => setForm(f => ({ ...f, goal_type: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="setor">Por Setor</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Período</label>
                <Select value={form.period_type} onValueChange={handlePeriodTypeChange}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Início</label>
                <Input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} className="h-9 text-xs" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Fim</label>
                <Input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} className="h-9 text-xs" />
              </div>
            </div>

            {form.goal_type === "setor" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Setor</label>
                <Input placeholder="Ex: CNC, Montagem..." value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} />
              </div>
            )}

            <Input placeholder="Responsável" value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} />

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Meta</label>
                <Input type="number" value={form.target_value} onChange={e => setForm(f => ({ ...f, target_value: e.target.value }))} className="h-9 text-xs" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Atual</label>
                <Input type="number" value={form.current_value} onChange={e => setForm(f => ({ ...f, current_value: e.target.value }))} className="h-9 text-xs" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Unidade</label>
                <Input placeholder="unidades" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="h-9 text-xs" />
              </div>
            </div>

            {/* Vínculo automático com tarefas */}
            <Card className="border-dashed">
              <CardContent className="p-3 space-y-2">
                <p className="text-xs font-medium flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Vínculo automático com tarefas</p>
                <p className="text-[10px] text-muted-foreground">Vincule a uma categoria/setor de tarefas para calcular progresso automaticamente.</p>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={form.linked_task_category || "__none__"} onValueChange={v => setForm(f => ({ ...f, linked_task_category: v === "__none__" ? "" : v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhuma</SelectItem>
                      {categoryOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={form.linked_task_sector || "__none__"} onValueChange={v => setForm(f => ({ ...f, linked_task_sector: v === "__none__" ? "" : v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Setor" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {sectorOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {editingGoal && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim()}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyGoalId} onOpenChange={() => setHistoryGoalId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Histórico de Desempenho</DialogTitle>
            <DialogDescription>Evolução do progresso ao longo do tempo.</DialogDescription>
          </DialogHeader>
          {historyForGoal.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum registro de histórico ainda. Sincronize o progresso para gerar registros.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {historyForGoal.map(h => {
                const goal = goals.find(g => g.id === h.goal_id);
                const pct = goal && goal.target_value > 0 ? Math.round((h.value / goal.target_value) * 100) : 0;
                return (
                  <div key={h.id} className="flex items-center gap-3 p-2 rounded border">
                    <div className="flex-1">
                      <p className="text-xs font-medium">{format(new Date(h.snapshot_date + "T00:00:00"), "dd/MM/yyyy")}</p>
                      <p className="text-[10px] text-muted-foreground">{h.value} {goal?.unit || "unidades"}</p>
                    </div>
                    <div className="w-20">
                      <Progress value={pct} className="h-2" />
                    </div>
                    <span className="text-xs font-medium w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
