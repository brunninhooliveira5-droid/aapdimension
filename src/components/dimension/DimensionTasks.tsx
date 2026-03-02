import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, List, Columns3, Paperclip, Download, X, FileImage, FileText, File as FileIcon } from "lucide-react";
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
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [taskFiles, setTaskFiles] = useState<any[]>([]);
  const [taskFileCounts, setTaskFileCounts] = useState<Record<string, number>>({});
  const [uploadingFile, setUploadingFile] = useState(false);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const loadTaskFiles = async (taskId: string) => {
    const { data } = await supabase
      .from("dimension_task_files")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });
    setTaskFiles(data ?? []);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingTask || !session?.user?.id) return;
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploadingFile(true);
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" excede 10MB.`);
        continue;
      }
      const ext = file.name.split(".").pop();
      const path = `${editingTask.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("dimension-task-files").upload(path, file);
      if (uploadErr) { toast.error(`Erro ao enviar "${file.name}"`); continue; }
      await supabase.from("dimension_task_files").insert({
        task_id: editingTask.id,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: session.user.id,
      });
    }
    await loadTaskFiles(editingTask.id);
    setUploadingFile(false);
    toast.success("Arquivo(s) enviado(s)!");
    e.target.value = "";
  };

  const handleDeleteFile = async (fileId: string, filePath: string) => {
    await supabase.storage.from("dimension-task-files").remove([filePath]);
    await supabase.from("dimension_task_files").delete().eq("id", fileId);
    setTaskFiles((prev) => prev.filter((f) => f.id !== fileId));
    toast.success("Arquivo removido!");
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

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(col);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData("taskId");
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Optimistic update
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus, completed_at: newStatus === "concluida" ? new Date().toISOString() : t.completed_at } : t));

    const payload: any = { status: newStatus };
    if (newStatus === "concluida" && task.status !== "concluida") payload.completed_at = new Date().toISOString();

    const { error } = await supabase.from("dimension_tasks").update(payload).eq("id", taskId);
    if (error) {
      toast.error("Erro ao mover tarefa");
      fetchAll();
    } else {
      toast.success(`Tarefa movida para "${statusLabels[newStatus]}"`);
    }
  };

  const fetchAll = async () => {
    const [{ data: tasksData }, { data: filesData }] = await Promise.all([
      supabase.from("dimension_tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("dimension_task_files").select("task_id"),
    ]);
    setTasks(tasksData ?? []);
    const counts: Record<string, number> = {};
    (filesData ?? []).forEach((f: any) => { counts[f.task_id] = (counts[f.task_id] || 0) + 1; });
    setTaskFileCounts(counts);
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = tasks.filter((t) => {
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    return true;
  });

  const openCreate = () => { setEditingTask(null); setForm(emptyTask); setDialogOpen(true); };
  const openEdit = (t: any) => { setEditingTask(t); setForm({ title: t.title, description: t.description, priority: t.priority, category: t.category, responsible: t.responsible, due_date: t.due_date ?? "", status: t.status }); loadTaskFiles(t.id); setDialogOpen(true); };

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
    setDialogOpen(false); setSaving(false); fetchAll();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("dimension_tasks").delete().eq("id", id);
    toast.success("Tarefa excluída!"); fetchAll();
  };

  const kanbanCols = ["a_fazer", "em_andamento", "aguardando", "concluida"];

  const statusGradients: Record<string, string> = {
    a_fazer: "from-slate-500 to-slate-700",
    em_andamento: "from-blue-500 to-blue-700",
    aguardando: "from-amber-500 to-amber-700",
    atrasada: "from-red-500 to-red-700",
    concluida: "from-emerald-500 to-emerald-700",
  };

  const TaskCard = ({ task }: { task: any }) => {
    const gradient = statusGradients[task.status] || "from-slate-600 to-slate-800";
    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        onClick={() => openEdit(task)}
        className="relative rounded-xl overflow-hidden group transition-all duration-300 hover:ring-2 hover:ring-primary/40 hover:shadow-lg cursor-grab active:cursor-grabbing"
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
        <div className="relative p-3 space-y-2">
          <div className="flex items-start justify-between gap-1">
            <p className="text-sm font-semibold leading-tight text-white drop-shadow-sm">{task.title}</p>
            <div className="flex gap-0.5 shrink-0">
              <Button variant="ghost" size="icon" className="h-6 w-6 text-white/70 hover:text-white hover:bg-white/20" onClick={() => openEdit(task)}><Pencil className="h-3 w-3" /></Button>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 text-white/70 hover:text-white hover:bg-white/20"><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Excluir tarefa?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(task.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge className="text-[9px] bg-white/20 text-white border-0 backdrop-blur-sm">{task.priority}</Badge>
            <Badge className="text-[9px] bg-white/20 text-white border-0 backdrop-blur-sm">{categoryLabels[task.category] ?? task.category}</Badge>
          </div>
          {task.responsible && <p className="text-[10px] text-white/80 drop-shadow-sm">👤 {task.responsible}</p>}
          {task.due_date && <p className="text-[10px] text-white/80 drop-shadow-sm">📅 {format(new Date(task.due_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}</p>}
          {(taskFileCounts[task.id] || 0) > 0 && <p className="text-[10px] text-white/80 flex items-center gap-1 drop-shadow-sm"><Paperclip className="w-3 h-3" />{taskFileCounts[task.id]} arquivo(s)</p>}
        </div>
      </div>
    );
  };

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
            <div
              key={col}
              className="space-y-2"
              onDragOver={(e) => handleDragOver(e, col)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col)}
            >
              <div className={`rounded-md px-3 py-1.5 text-xs font-semibold ${statusColors[col]}`}>{statusLabels[col]} ({filtered.filter((t) => t.status === col).length})</div>
              <div className={`space-y-2 min-h-[100px] rounded-lg transition-colors ${dragOverCol === col ? "bg-primary/5 ring-2 ring-primary/20" : ""}`}>
                {filtered.filter((t) => t.status === col).map((task) => <TaskCard key={task.id} task={task} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Nenhuma tarefa encontrada.</p> : filtered.map((task) => {
            const gradient = statusGradients[task.status] || "from-slate-600 to-slate-800";
            return (
              <div key={task.id} className={`relative flex items-center gap-3 p-3 rounded-xl overflow-hidden cursor-pointer`} onClick={() => openEdit(task)}>
                <div className={`absolute inset-0 bg-gradient-to-r ${gradient}`} />
                <div className="absolute inset-0 bg-black/30" />
                <Badge className="relative text-[9px] shrink-0 bg-white/20 text-white border-0 backdrop-blur-sm">{statusLabels[task.status]}</Badge>
                <span className="relative text-sm flex-1 truncate text-white font-medium drop-shadow-sm">{task.title}</span>
                <Badge className="relative text-[9px] bg-white/20 text-white border-0 backdrop-blur-sm">{task.priority}</Badge>
                {task.due_date && <span className="relative text-[10px] text-white/80">{format(new Date(task.due_date + "T00:00:00"), "dd/MM", { locale: ptBR })}</span>}
                <Button variant="ghost" size="icon" className="relative h-7 w-7 text-white/70 hover:text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); openEdit(task); }}><Pencil className="h-3.5 w-3.5" /></Button>
              </div>
            );
          })}
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

            {/* File attachments */}
            {editingTask && (
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
                  <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                    {taskFiles.map((f) => (
                      <div key={f.id} className="flex items-center gap-2 bg-accent rounded-md px-2.5 py-1.5 text-xs">
                        {getFileTypeIcon(f.mime_type)}
                        <span className="flex-1 truncate">{f.file_name}</span>
                        <a href={getFileUrl(f.file_path)} download={f.file_name} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-5 w-5"><Download className="h-3 w-3" /></Button>
                        </a>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => handleDeleteFile(f.id, f.file_path)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {taskFiles.length === 0 && <p className="text-[10px] text-muted-foreground">Nenhum arquivo anexado.</p>}
              </div>
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
