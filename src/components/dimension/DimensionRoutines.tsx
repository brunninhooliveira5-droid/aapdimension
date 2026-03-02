import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Play, History, RotateCcw, X, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useModule } from "@/contexts/ModuleContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RoutineTemplateFiles } from "./RoutineTemplateFiles";

interface TaskTemplate {
  title: string;
  sector: string;
  priority: string;
  responsible: string;
  days_offset: number;
}

interface Routine {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  tasks_template: TaskTemplate[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface Activation {
  id: string;
  routine_id: string;
  context_data: { context?: string };
  tasks_created: number;
  activated_by: string;
  activated_at: string;
  routine_title?: string;
}

const priorityLabels: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };
const priorityColors: Record<string, string> = { alta: "bg-destructive/10 text-destructive", media: "bg-amber-500/10 text-amber-600", baixa: "bg-muted text-muted-foreground" };

const emptyTemplate: TaskTemplate = { title: "", sector: "", priority: "media", responsible: "", days_offset: 0 };

export function DimensionRoutines() {
  const { tables, storage } = useModule();
  const { session } = useAuth();
  const [tab, setTab] = useState("templates");
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [activations, setActivations] = useState<Activation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectorOptions, setSectorOptions] = useState<string[]>([]);

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [templates, setTemplates] = useState<TaskTemplate[]>([{ ...emptyTemplate }]);

  // Activation dialog
  const [activateOpen, setActivateOpen] = useState(false);
  const [activatingRoutine, setActivatingRoutine] = useState<Routine | null>(null);
  const [contextText, setContextText] = useState("");
  const [activating, setActivating] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: r }, { data: a }] = await Promise.all([
      supabase.from(tables.routines as any).select("*").order("created_at", { ascending: false }),
      supabase.from(tables.routineActivations as any).select("*").order("activated_at", { ascending: false }),
    ]);
    const routinesData = (r || []).map((item: any) => ({
      ...item,
      tasks_template: Array.isArray(item.tasks_template) ? item.tasks_template : [],
    })) as Routine[];
    setRoutines(routinesData);

    // Enrich activations with routine title
    const activationsData = (a || []).map((act: any) => {
      const routine = routinesData.find(rt => rt.id === act.routine_id);
      return { ...act, context_data: act.context_data || {}, routine_title: routine?.title || "Rotina removida" };
    }) as Activation[];
    setActivations(activationsData);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Fetch dynamic sectors from dimension_production_cards
  useEffect(() => {
    const fetchSectors = async () => {
      const { data } = await supabase
        .from(tables.productionCards as any)
        .select("key")
        .order("title");
      setSectorOptions((data || []).map((d: any) => d.key));
    };
    fetchSectors();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setDescription("");
    setTemplates([{ ...emptyTemplate }]);
    setFormOpen(true);
  };

  const openEdit = (r: Routine) => {
    setEditing(r);
    setTitle(r.title);
    setDescription(r.description);
    setTemplates(r.tasks_template.length > 0 ? r.tasks_template.map(t => ({ ...t })) : [{ ...emptyTemplate }]);
    setFormOpen(true);
  };

  const addTemplateLine = () => setTemplates(prev => [...prev, { ...emptyTemplate }]);
  const removeTemplateLine = (i: number) => setTemplates(prev => prev.filter((_, idx) => idx !== i));
  const updateTemplateLine = (i: number, field: keyof TaskTemplate, value: string | number) => {
    setTemplates(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));
  };

  const saveRoutine = async () => {
    if (!title.trim()) { toast.error("Informe o nome da rotina"); return; }
    const validTemplates = templates.filter(t => t.title.trim());
    if (validTemplates.length === 0) { toast.error("Adicione ao menos uma sub-tarefa"); return; }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      tasks_template: validTemplates as unknown as import("@/integrations/supabase/types").Json,
      created_by: session?.user.id!,
    };

    if (editing) {
      const { error } = await supabase.from(tables.routines as any).update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar rotina"); return; }
      toast.success("Rotina atualizada!");
    } else {
      const { error } = await supabase.from(tables.routines as any).insert(payload);
      if (error) { toast.error("Erro ao criar rotina"); return; }
      toast.success("Rotina criada!");
    }
    setFormOpen(false);
    fetchAll();
  };

  const deleteRoutine = async (id: string) => {
    const { error } = await supabase.from(tables.routines as any).delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Rotina excluída");
    fetchAll();
  };

  const openActivation = (r: Routine) => {
    setActivatingRoutine(r);
    setContextText("");
    setActivateOpen(true);
  };

  const activateRoutine = async () => {
    if (!activatingRoutine || !session) return;
    setActivating(true);

    const now = new Date();
    const tasksToCreate = activatingRoutine.tasks_template.map(t => {
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + (t.days_offset || 0));
      return {
        title: t.title,
        sector: t.sector || null,
        priority: t.priority || "media",
        responsible: t.responsible || "",
        due_date: dueDate.toISOString().split("T")[0],
        description: contextText.trim() ? `Rotina: ${activatingRoutine.title} | ${contextText.trim()}` : `Rotina: ${activatingRoutine.title}`,
        status: "a_fazer",
        category: "producao",
        created_by: session.user.id,
      };
    });

    const { data: createdTasks, error: taskError } = await supabase
      .from(tables.tasks as any)
      .insert(tasksToCreate)
      .select("id");
    if (taskError || !createdTasks) {
      toast.error("Erro ao criar tarefas");
      setActivating(false);
      return;
    }

    // Copy template files to created tasks
    const { data: templateFiles } = await supabase
      .from(tables.routineTemplateFiles as any)
      .select("*")
      .eq("routine_id", activatingRoutine.id);

    if (templateFiles && templateFiles.length > 0) {
      for (const tf of templateFiles as any[]) {
        const taskId = (createdTasks as any[])[tf.task_index]?.id;
        if (!taskId) continue;

        const newPath = `tasks/${taskId}/${crypto.randomUUID()}-${tf.file_name}`;
        const { error: copyErr } = await supabase.storage
          .from(storage.taskFiles)
          .copy(tf.file_path, newPath);

        if (!copyErr) {
          await supabase.from(tables.taskFiles as any).insert({
            task_id: taskId,
            file_name: tf.file_name,
            file_path: newPath,
            file_size: tf.file_size,
            mime_type: tf.mime_type,
            uploaded_by: session.user.id,
          });
        }
      }
    }

    await supabase.from(tables.routineActivations as any).insert({
      routine_id: activatingRoutine.id,
      context_data: { context: contextText.trim() },
      tasks_created: tasksToCreate.length,
      activated_by: session.user.id,
    });

    toast.success(`${tasksToCreate.length} tarefas criadas com sucesso!`);
    setActivating(false);
    setActivateOpen(false);
    fetchAll();
  };

  return (
    <div className="mt-4 space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="templates" className="gap-1.5"><ListChecks className="h-3.5 w-3.5" />Modelos</TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5"><History className="h-3.5 w-3.5" />Histórico</TabsTrigger>
          </TabsList>
          {tab === "templates" && (
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Nova Rotina</Button>
          )}
        </div>

        {/* Templates Tab */}
        <TabsContent value="templates">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
          ) : routines.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <RotateCcw className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">Nenhuma rotina cadastrada</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Crie modelos de rotinas recorrentes para automatizar a geração de tarefas por setor.
                </p>
                <Button className="mt-4" size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Criar primeira rotina</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {routines.map(r => (
                <Card key={r.id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{r.title}</CardTitle>
                      <Badge variant={r.is_active ? "default" : "secondary"} className="text-[10px] shrink-0">
                        {r.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">{r.tasks_template.length} sub-tarefa(s)</p>
                      <div className="flex flex-wrap gap-1">
                        {[...new Set(r.tasks_template.map(t => t.sector).filter(Boolean))].map(s => (
                          <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 pt-2">
                      <Button size="sm" variant="default" className="flex-1 gap-1" onClick={() => openActivation(r)}>
                        <Play className="h-3.5 w-3.5" />Ativar
                      </Button>
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => openEdit(r)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir rotina?</AlertDialogTitle>
                            <AlertDialogDescription>Essa ação não pode ser desfeita. O histórico de ativações também será removido.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteRoutine(r.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          {activations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <History className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">Nenhuma ativação registrada</h3>
                <p className="text-sm text-muted-foreground mt-1">Ative uma rotina para ver o histórico aqui.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {activations.map(a => (
                <Card key={a.id}>
                  <CardContent className="flex items-center justify-between gap-4 py-3 px-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.routine_title}</p>
                      {a.context_data?.context && (
                        <p className="text-xs text-muted-foreground truncate">{a.context_data.context}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-[10px]">{a.tasks_created} tarefas</Badge>
                      <span>{format(new Date(a.activated_at), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Rotina" : "Nova Rotina"}</DialogTitle>
            <DialogDescription>Defina o modelo de rotina e suas sub-tarefas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs font-medium">Nome da rotina *</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Venda de Máquina" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Descrição</label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição opcional..." rows={2} className="mt-1" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium">Sub-tarefas</label>
                <Button size="sm" variant="outline" onClick={addTemplateLine}><Plus className="h-3.5 w-3.5 mr-1" />Adicionar</Button>
              </div>
              <div className="space-y-2">
                {templates.map((t, i) => (
                  <div key={i} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono w-5 shrink-0">#{i + 1}</span>
                      <Input value={t.title} onChange={e => updateTemplateLine(i, "title", e.target.value)} placeholder="Título da tarefa *" className="flex-1 h-8 text-sm" />
                      {templates.length > 1 && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeTemplateLine(i)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Select value={t.sector || "__none__"} onValueChange={v => updateTemplateLine(i, "sector", v === "__none__" ? "" : v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Setor" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sem setor</SelectItem>
                          {sectorOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={t.priority} onValueChange={v => updateTemplateLine(i, "priority", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="media">Média</SelectItem>
                          <SelectItem value="baixa">Baixa</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input value={t.responsible} onChange={e => updateTemplateLine(i, "responsible", e.target.value)} placeholder="Responsável" className="h-8 text-xs" />
                      <div className="flex items-center gap-1">
                        <Input type="number" value={t.days_offset} onChange={e => updateTemplateLine(i, "days_offset", parseInt(e.target.value) || 0)} className="h-8 text-xs w-16" min={0} />
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">dias após</span>
                      </div>
                    </div>
                    <RoutineTemplateFiles
                      routineId={editing?.id || null}
                      taskIndex={i}
                      userId={session?.user.id || ""}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={saveRoutine}>{editing ? "Salvar" : "Criar Rotina"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activation Dialog */}
      <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ativar Rotina: {activatingRoutine?.title}</DialogTitle>
            <DialogDescription>As seguintes tarefas serão criadas automaticamente nos setores definidos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Contexto (opcional)</label>
              <Input value={contextText} onChange={e => setContextText(e.target.value)} placeholder="Ex: Cliente: João - Máquina: CNC X" className="mt-1" />
            </div>
            <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
              {activatingRoutine?.tasks_template.map((t, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 text-sm gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{t.title}</p>
                    <div className="flex gap-1.5 mt-0.5">
                      {t.sector && <Badge variant="outline" className="text-[10px]">{t.sector}</Badge>}
                      <Badge className={`text-[10px] ${priorityColors[t.priority] || ""}`}>{priorityLabels[t.priority] || t.priority}</Badge>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">+{t.days_offset}d</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {activatingRoutine?.tasks_template.length} tarefa(s) serão criadas
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateOpen(false)}>Cancelar</Button>
            <Button onClick={activateRoutine} disabled={activating}>
              {activating ? "Criando..." : "Confirmar e Criar Tarefas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
