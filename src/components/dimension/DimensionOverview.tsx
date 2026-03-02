import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ListTodo, AlertTriangle, Factory, CalendarDays, Plus, Paperclip, Download, FileImage, FileText, File as FileIcon, X, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
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
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [detailTask, setDetailTask] = useState<any>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", priority: "media", responsible: "", due_date: "", status: "a_fazer", category: "producao" });
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // File management state
  const [taskFiles, setTaskFiles] = useState<any[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const kanbanCols = ["a_fazer", "em_andamento", "aguardando", "atrasada", "concluida"];
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

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
    const allTasks = t.data ?? [];
    // Auto-mark overdue tasks
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const overdueIds: string[] = [];
    const updated = allTasks.map((task: any) => {
      if (task.due_date && task.due_date < todayStr && task.status !== "concluida" && task.status !== "atrasada") {
        overdueIds.push(task.id);
        return { ...task, status: "atrasada" };
      }
      return task;
    });
    // Batch update overdue tasks in DB
    if (overdueIds.length > 0) {
      supabase.from("dimension_tasks").update({ status: "atrasada" }).in("id", overdueIds).then();
    }
    setTasks(updated);
    setPendencies(p.data ?? []);
    setProduction(pr.data ?? []);
    setEvents(ev.data ?? []);
    const counts: Record<string, number> = {};
    (fc.data ?? []).forEach((f: any) => { counts[f.task_id] = (counts[f.task_id] || 0) + 1; });
    setTaskFileCounts(counts);
  };

  useEffect(() => { fetchAll(); }, []);

  // Sector task counts for badges on sector cards
  const sectorTaskCounts: Record<string, number> = {};
  tasks.forEach((t) => {
    if (t.sector && t.status !== "concluida") {
      sectorTaskCounts[t.sector] = (sectorTaskCounts[t.sector] || 0) + 1;
    }
  });

  // Kanban always shows only unassigned tasks
  const overviewTasks = tasks.filter((t) => {
    if (t.sector) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    return true;
  });

  // Sector tasks shown when showAllTasks is on
  const sectorTasks = showAllTasks ? tasks.filter((t) => {
    if (!t.sector) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    return true;
  }) : [];

  // Group sector tasks by sector
  const sectorTasksGrouped: Record<string, any[]> = {};
  sectorTasks.forEach((t) => {
    if (!sectorTasksGrouped[t.sector]) sectorTasksGrouped[t.sector] = [];
    sectorTasksGrouped[t.sector].push(t);
  });

  // File helpers
  const loadTaskFiles = async (taskId: string) => {
    const { data } = await supabase.from("dimension_task_files").select("*").eq("task_id", taskId).order("created_at", { ascending: true });
    setTaskFiles(data ?? []);
  };

  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage.from("dimension-task-files").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const getFileTypeIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <FileImage className="w-3.5 h-3.5 text-primary" />;
    if (mimeType === "application/pdf") return <FileText className="w-3.5 h-3.5 text-destructive" />;
    return <FileIcon className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!detailTask || !session?.user?.id) return;
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingFile(true);
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) { toast.error(`"${file.name}" excede 10MB.`); continue; }
      const ext = file.name.split(".").pop();
      const path = `${detailTask.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("dimension-task-files").upload(path, file);
      if (uploadErr) { toast.error(`Erro ao enviar "${file.name}"`); continue; }
      await supabase.from("dimension_task_files").insert({ task_id: detailTask.id, file_name: file.name, file_path: path, file_size: file.size, mime_type: file.type, uploaded_by: session.user.id });
    }
    await loadTaskFiles(detailTask.id);
    setUploadingFile(false);
    toast.success("Arquivo(s) enviado(s)!");
    e.target.value = "";
    fetchAll();
  };

  const handleDeleteFile = async (fileId: string, filePath: string) => {
    await supabase.storage.from("dimension-task-files").remove([filePath]);
    await supabase.from("dimension_task_files").delete().eq("id", fileId);
    setTaskFiles((prev) => prev.filter((f) => f.id !== fileId));
    toast.success("Arquivo removido!");
    fetchAll();
  };

  const handleCreate = async () => {
    if (!newTask.title.trim() || !session?.user?.id) return;
    setSaving(true);
    const { data: created, error } = await supabase.from("dimension_tasks").insert({
      title: newTask.title,
      priority: newTask.priority,
      responsible: newTask.responsible,
      due_date: newTask.due_date || null,
      created_by: session.user.id,
      status: "a_fazer",
    }).select().single();
    setSaving(false);
    if (error || !created) { toast.error("Erro ao criar tarefa"); return; }
    toast.success("Tarefa criada! Você pode anexar arquivos.");
    setNewTask({ title: "", priority: "media", responsible: "", due_date: "" });
    setCreateOpen(false);
    await fetchAll();
    // Open in edit mode for file uploads
    setDetailTask(created);
    setEditForm({ title: created.title, description: created.description || "", priority: created.priority, responsible: created.responsible, due_date: created.due_date ?? "", status: created.status, category: created.category || "producao" });
    setTaskFiles([]);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData("taskId");
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus, completed_at: newStatus === "concluida" ? new Date().toISOString() : t.completed_at } : t));
    const payload: any = { status: newStatus };
    if (newStatus === "concluida" && task.status !== "concluida") payload.completed_at = new Date().toISOString();
    const { error } = await supabase.from("dimension_tasks").update(payload).eq("id", taskId);
    if (error) { toast.error("Erro ao mover tarefa"); fetchAll(); }
    else { toast.success(`Tarefa movida para "${statusLabels[newStatus]}"`); }
  };

  const handleTaskDroppedToSector = async (taskId: string, sectorKey: string, sectorTitle: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, sector: sectorKey } : t));
    const { error } = await supabase.from("dimension_tasks").update({ sector: sectorKey }).eq("id", taskId);
    if (error) { toast.error("Erro ao mover tarefa para setor"); fetchAll(); }
    else { toast.success(`Tarefa enviada para "${sectorTitle}"`); }
  };

  const openDetail = (task: any) => {
    setDetailTask(task);
    setEditForm({ title: task.title, description: task.description || "", priority: task.priority, responsible: task.responsible, due_date: task.due_date ?? "", status: task.status, category: task.category || "producao" });
    loadTaskFiles(task.id);
  };

  const handleEditSave = async () => {
    if (!detailTask || !editForm.title.trim()) return;
    setEditSaving(true);
    const payload: any = { ...editForm, due_date: editForm.due_date || null };
    if (editForm.status === "concluida" && detailTask.status !== "concluida") payload.completed_at = new Date().toISOString();
    const { error } = await supabase.from("dimension_tasks").update(payload).eq("id", detailTask.id);
    setEditSaving(false);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Tarefa atualizada!");
    setDetailTask(null);
    fetchAll();
  };

  const todayTasks = tasks.filter((t) => t.due_date && isToday(new Date(t.due_date + "T00:00:00")) && t.status !== "concluida");
  const overdue = [...tasks.filter(t => t.due_date && isBefore(new Date(t.due_date + "T00:00:00"), new Date()) && t.status !== "concluida"),
    ...pendencies.filter(p => p.due_date && isBefore(new Date(p.due_date + "T00:00:00"), new Date()) && p.status !== "resolvida")];
  const inProgress = production.filter((p) => p.status === "em_fabricacao");
  const upcoming = events.length;

  const [kpiDialog, setKpiDialog] = useState<string | null>(null);

  const kpis = [
    { key: "today", label: "Tarefas do dia", value: todayTasks.length, icon: ListTodo, color: "text-primary" },
    { key: "overdue", label: "Pendências atrasadas", value: overdue.length, icon: AlertTriangle, color: "text-destructive" },
    { key: "production", label: "Produção em andamento", value: inProgress.length, icon: Factory, color: "text-amber-500" },
    { key: "upcoming", label: "Próximos prazos (7d)", value: upcoming, icon: CalendarDays, color: "text-blue-500" },
  ];

  const getKpiItems = (key: string) => {
    switch (key) {
      case "today": return todayTasks.map(t => ({ id: t.id, title: t.title, sub: t.responsible || "Sem responsável", extra: t.priority, type: "task" as const, sector: t.sector, raw: t }));
      case "overdue": return overdue.map(t => ({ id: t.id, title: t.title, sub: t.responsible || "Sem responsável", extra: t.due_date ? format(new Date(t.due_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "", type: "task" as const, sector: t.sector, raw: t }));
      case "production": return inProgress.map(p => ({ id: p.id, title: p.project_name, sub: `${p.client_name || "—"} • ${p.machine_name || "—"}`, extra: p.responsible || "", type: "prod" as const, sector: null, raw: null }));
      case "upcoming": return events.map(e => ({ id: e.id, title: e.title, sub: e.responsible || "", extra: e.event_date ? format(new Date(e.event_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "", type: "event" as const, sector: null, raw: null }));
      default: return [];
    }
  };

  if (activeSector) {
    return <SectorKanban sectorKey={activeSector.key} sectorTitle={activeSector.title} onBack={() => { setActiveSector(null); fetchAll(); }} />;
  }

  return (
    <div className="space-y-6 mt-4">
      <ProductionCards
        onCardClick={(card) => setActiveSector({ key: card.key, title: card.title })}
        onTaskDroppedToSector={handleTaskDroppedToSector}
        sectorTaskCounts={sectorTaskCounts}
      />

      {/* KPIs + botão discreto */}
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all" onClick={() => setKpiDialog(kpi.key)}>
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

      {/* Kanban de tarefas sem setor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {showAllTasks ? "Todas as tarefas" : "Tarefas não distribuídas"} ({overviewTasks.length})
          </h3>
          <Button
            variant={showAllTasks ? "secondary" : "outline"}
            size="sm"
            className="text-[10px] h-7 gap-1.5"
            onClick={() => setShowAllTasks(!showAllTasks)}
          >
            {showAllTasks ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showAllTasks ? "Só não distribuídas" : "Ver todas as tarefas"}
          </Button>
        </div>
        <div className="flex items-center gap-2 -mt-1">
          <p className="text-[10px] text-muted-foreground">Arraste tarefas para os setores acima para distribuí-las</p>
          <div className="flex gap-1.5 ml-auto">
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[110px] h-7 text-[10px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas prioridades</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[110px] h-7 text-[10px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                <SelectItem value="producao">Produção</SelectItem>
                <SelectItem value="financeiro">Financeiro</SelectItem>
                <SelectItem value="comercial">Comercial</SelectItem>
                <SelectItem value="tecnico">Técnico</SelectItem>
                <SelectItem value="app_sistema">App/Sistema</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {kanbanCols.map((col) => {
            const colTasks = overviewTasks.filter((t) => t.status === col);
            return (
              <div
                key={col}
                className="space-y-2"
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverCol(col); }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => handleDrop(e, col)}
              >
                <div className={`rounded-md px-2.5 py-1 text-[10px] font-semibold ${statusColors[col]}`}>
                  {statusLabels[col]} ({colTasks.length})
                </div>
                <div className={`space-y-2 min-h-[60px] rounded-lg transition-colors ${dragOverCol === col ? "bg-primary/5 ring-2 ring-primary/20" : ""}`}>
                  {colTasks.map((task) => {
                    const statusGradients: Record<string, string> = {
                      a_fazer: "from-slate-500 to-slate-700",
                      em_andamento: "from-blue-500 to-blue-700",
                      aguardando: "from-amber-500 to-amber-700",
                      atrasada: "from-red-500 to-red-700",
                      concluida: "from-emerald-500 to-emerald-700",
                    };
                    const gradient = statusGradients[task.status] || "from-slate-600 to-slate-800";
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => openDetail(task)}
                        className={`relative rounded-xl overflow-hidden group transition-all duration-300 hover:ring-2 hover:ring-primary/40 hover:shadow-lg cursor-grab active:cursor-grabbing`}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                        <div className="relative p-2.5 space-y-1.5">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-xs font-semibold leading-tight flex-1 text-white drop-shadow-sm">{task.title}</p>
                            <div className="flex gap-0.5 shrink-0">
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-white/70 hover:text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); openDetail(task); }}>
                                <Pencil className="h-2.5 w-2.5" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-5 w-5 text-white/70 hover:text-white hover:bg-white/20" onClick={(e) => e.stopPropagation()}>
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
                                    <AlertDialogDescription>Esta ação não pode ser desfeita. A tarefa "{task.title}" será removida permanentemente.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={async () => {
                                      await supabase.from("dimension_task_files").delete().eq("task_id", task.id);
                                      await supabase.from("dimension_tasks").delete().eq("id", task.id);
                                      toast.success("Tarefa excluída!");
                                      fetchAll();
                                    }}>Excluir</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <Badge className={`text-[8px] bg-white/20 text-white border-0 backdrop-blur-sm`}>{task.priority}</Badge>
                            <Badge className="text-[8px] bg-white/20 text-white border-0 backdrop-blur-sm">{categoryLabels[task.category] ?? task.category}</Badge>
                          </div>
                          {task.responsible && <p className="text-[9px] text-white/80 drop-shadow-sm">👤 {task.responsible}</p>}
                          {task.due_date && <p className="text-[9px] text-white/80 drop-shadow-sm">📅 {format(new Date(task.due_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}</p>}
                          {(taskFileCounts[task.id] || 0) > 0 && <p className="text-[9px] text-white/80 flex items-center gap-1 drop-shadow-sm"><Paperclip className="w-2.5 h-2.5" />{taskFileCounts[task.id]}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tarefas dos setores quando showAllTasks está ativo */}
      {showAllTasks && Object.keys(sectorTasksGrouped).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Tarefas nos setores ({sectorTasks.length})</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 items-start">
            {Object.entries(sectorTasksGrouped).map(([sector, sTasks]) => (
              <div key={sector} className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">📍 {sector} ({sTasks.length})</p>
                <div className="flex flex-col gap-1.5">
                  {sTasks.map((task: any) => {
                    const statusGradients: Record<string, string> = {
                      a_fazer: "from-slate-500 to-slate-700",
                      em_andamento: "from-blue-500 to-blue-700",
                      aguardando: "from-amber-500 to-amber-700",
                      atrasada: "from-red-500 to-red-700",
                      concluida: "from-emerald-500 to-emerald-700",
                    };
                    const gradient = statusGradients[task.status] || "from-slate-600 to-slate-800";
                    return (
                      <div
                        key={task.id}
                        onClick={() => openDetail(task)}
                        className="relative rounded-lg overflow-hidden group transition-all duration-200 hover:ring-1 hover:ring-primary/40 hover:shadow cursor-pointer"
                      >
                        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                        <div className="relative px-2 py-1.5 space-y-0.5">
                          <p className="text-[10px] font-semibold leading-tight text-white drop-shadow-sm truncate">{task.title}</p>
                          <div className="flex gap-1">
                            <Badge className="text-[7px] px-1 py-0 bg-white/20 text-white border-0">{statusLabels[task.status]}</Badge>
                            <Badge className="text-[7px] px-1 py-0 bg-white/20 text-white border-0">{task.priority}</Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Dialog editar tarefa com arquivos */}
      <Dialog open={!!detailTask} onOpenChange={(open) => { if (!open) { setDetailTask(null); setTaskFiles([]); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Editar Tarefa</DialogTitle>
            <DialogDescription className="sr-only">Editar detalhes da tarefa</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
            <Textarea placeholder="Descrição (opcional)" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={editForm.priority} onValueChange={(v) => setEditForm({ ...editForm, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Responsável" value={editForm.responsible} onChange={(e) => setEditForm({ ...editForm, responsible: e.target.value })} />
              <Input type="date" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} />
            </div>

            {/* File attachments */}
            {detailTask && (
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Arquivos</span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-primary hover:underline">
                    <Paperclip className="w-3.5 h-3.5" />
                    {uploadingFile ? "Enviando..." : "Anexar arquivo"}
                    <input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" multiple className="hidden" onChange={handleFileUpload} disabled={uploadingFile} />
                  </label>
                </div>
                {taskFiles.length > 0 && (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {taskFiles.map((f) => (
                      <div key={f.id} className="rounded-lg border bg-accent/50 overflow-hidden">
                        {f.mime_type.startsWith("image/") && (
                          <a href={getFileUrl(f.file_path)} target="_blank" rel="noopener noreferrer">
                            <img
                              src={getFileUrl(f.file_path)}
                              alt={f.file_name}
                              className="w-full max-h-48 object-contain bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                            />
                          </a>
                        )}
                        <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs">
                          {getFileTypeIcon(f.mime_type)}
                          <span className="flex-1 truncate">{f.file_name}</span>
                          <a href={getFileUrl(f.file_path)} download={f.file_name} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-5 w-5"><Download className="h-3 w-3" /></Button>
                          </a>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => handleDeleteFile(f.id, f.file_path)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {taskFiles.length === 0 && !uploadingFile && (
                  <p className="text-[10px] text-muted-foreground">Nenhum arquivo anexado</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setDetailTask(null); setTaskFiles([]); }}>Cancelar</Button>
            <Button size="sm" onClick={handleEditSave} disabled={editSaving || !editForm.title.trim()}>
              {editSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* KPI detail dialog */}
      <Dialog open={!!kpiDialog} onOpenChange={(open) => { if (!open) setKpiDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{kpis.find(k => k.key === kpiDialog)?.label}</DialogTitle>
            <DialogDescription className="sr-only">Detalhes do indicador</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {kpiDialog && getKpiItems(kpiDialog).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum item encontrado.</p>
            )}
            {kpiDialog && getKpiItems(kpiDialog).map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors ${item.raw ? "cursor-pointer hover:bg-accent/50 hover:border-primary/40" : "hover:bg-accent/50"}`}
                onClick={() => {
                  if (item.raw) {
                    setKpiDialog(null);
                    openDetail(item.raw);
                  }
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.sub}</p>
                  {item.sector && (
                    <Badge variant="secondary" className="text-[8px] mt-1">📍 Setor: {item.sector}</Badge>
                  )}
                  {item.type === "task" && !item.sector && (
                    <Badge variant="outline" className="text-[8px] mt-1 text-muted-foreground">Sem setor</Badge>
                  )}
                </div>
                {item.extra && (
                  <Badge variant="outline" className="text-[9px] shrink-0">{item.extra}</Badge>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
