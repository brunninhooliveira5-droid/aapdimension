import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Trash2, Copy, GripVertical, Save, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Task {
  id?: string;
  activity: string;
  due_date: string;
  responsible: string;
  is_done: boolean;
  sort_order: number;
}

interface Section {
  id?: string;
  title: string;
  notes: string;
  sort_order: number;
  tasks: Task[];
  isOpen: boolean;
}

interface ChecklistData {
  id?: string;
  title: string;
  checklist_date: string;
  general_responsible: string;
  project_name: string;
  notes: string;
  is_template: boolean;
  template_name: string;
}

interface Props {
  checklistId?: string | null;
  onBack: () => void;
  onSaved: () => void;
}

export function ChecklistEditor({ checklistId, onBack, onSaved }: Props) {
  const { session } = useAuth();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistData>({
    title: "",
    checklist_date: new Date().toISOString().split("T")[0],
    general_responsible: "",
    project_name: "",
    notes: "",
    is_template: false,
    template_name: "",
  });
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    if (checklistId) loadChecklist(checklistId);
  }, [checklistId]);

  async function loadChecklist(id: string) {
    const { data: cl } = await (supabase as any).from("pc_checklists").select("*").eq("id", id).single();
    if (!cl) return;
    setChecklist({
      id: cl.id,
      title: cl.title,
      checklist_date: cl.checklist_date,
      general_responsible: cl.general_responsible,
      project_name: cl.project_name,
      notes: cl.notes,
      is_template: cl.is_template,
      template_name: cl.template_name,
    });

    const { data: secs } = await (supabase as any)
      .from("pc_checklist_sections")
      .select("*")
      .eq("checklist_id", id)
      .order("sort_order");

    if (!secs) return;

    const loadedSections: Section[] = [];
    for (const s of secs) {
      const { data: tasks } = await (supabase as any)
        .from("pc_checklist_tasks")
        .select("*")
        .eq("section_id", s.id)
        .order("sort_order");

      loadedSections.push({
        id: s.id,
        title: s.title,
        notes: s.notes,
        sort_order: s.sort_order,
        isOpen: true,
        tasks: (tasks || []).map((t: any) => ({
          id: t.id,
          activity: t.activity,
          due_date: t.due_date || "",
          responsible: t.responsible,
          is_done: t.is_done,
          sort_order: t.sort_order,
        })),
      });
    }
    setSections(loadedSections);
  }

  function addSection() {
    setSections((prev) => [
      ...prev,
      { title: "", notes: "", sort_order: prev.length, tasks: [], isOpen: true },
    ]);
  }

  function removeSection(idx: number) {
    setSections((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateSection(idx: number, field: keyof Section, value: any) {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }

  function addTask(sectionIdx: number) {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIdx
          ? {
              ...s,
              tasks: [
                ...s.tasks,
                { activity: "", due_date: "", responsible: "", is_done: false, sort_order: s.tasks.length },
              ],
            }
          : s
      )
    );
  }

  function removeTask(sectionIdx: number, taskIdx: number) {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIdx ? { ...s, tasks: s.tasks.filter((_, ti) => ti !== taskIdx) } : s
      )
    );
  }

  function duplicateTask(sectionIdx: number, taskIdx: number) {
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sectionIdx) return s;
        const task = { ...s.tasks[taskIdx], id: undefined, is_done: false };
        const tasks = [...s.tasks];
        tasks.splice(taskIdx + 1, 0, task);
        return { ...s, tasks };
      })
    );
  }

  function updateTask(sectionIdx: number, taskIdx: number, field: keyof Task, value: any) {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIdx
          ? {
              ...s,
              tasks: s.tasks.map((t, ti) => (ti === taskIdx ? { ...t, [field]: value } : t)),
            }
          : s
      )
    );
  }

  function moveSection(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sections.length) return;
    setSections((prev) => {
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  }

  function moveTask(sectionIdx: number, taskIdx: number, dir: -1 | 1) {
    const newIdx = taskIdx + dir;
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sectionIdx || newIdx < 0 || newIdx >= s.tasks.length) return s;
        const tasks = [...s.tasks];
        [tasks[taskIdx], tasks[newIdx]] = [tasks[newIdx], tasks[taskIdx]];
        return { ...s, tasks };
      })
    );
  }

  async function handleSave() {
    if (!user?.id) return;
    if (!checklist.title.trim()) {
      toast.error("Informe o título do checklist");
      return;
    }
    setSaving(true);
    try {
      let clId = checklist.id;

      if (clId) {
        await (supabase as any)
          .from("pc_checklists")
          .update({
            title: checklist.title,
            checklist_date: checklist.checklist_date,
            general_responsible: checklist.general_responsible,
            project_name: checklist.project_name,
            notes: checklist.notes,
            is_template: checklist.is_template,
            template_name: checklist.template_name,
          })
          .eq("id", clId);

        // Delete existing sections/tasks and recreate
        await (supabase as any).from("pc_checklist_sections").delete().eq("checklist_id", clId);
      } else {
        const { data, error } = await (supabase as any)
          .from("pc_checklists")
          .insert({
            created_by: user.id,
            title: checklist.title,
            checklist_date: checklist.checklist_date,
            general_responsible: checklist.general_responsible,
            project_name: checklist.project_name,
            notes: checklist.notes,
            is_template: checklist.is_template,
            template_name: checklist.template_name,
          })
          .select("id")
          .single();
        if (error) throw error;
        clId = data.id;
      }

      for (let si = 0; si < sections.length; si++) {
        const sec = sections[si];
        const { data: secData } = await (supabase as any)
          .from("pc_checklist_sections")
          .insert({ checklist_id: clId, title: sec.title, notes: sec.notes, sort_order: si })
          .select("id")
          .single();
        if (!secData) continue;

        if (sec.tasks.length > 0) {
          await (supabase as any).from("pc_checklist_tasks").insert(
            sec.tasks.map((t, ti) => ({
              section_id: secData.id,
              activity: t.activity,
              due_date: t.due_date || null,
              responsible: t.responsible,
              is_done: t.is_done,
              sort_order: ti,
            }))
          );
        }
      }

      toast.success("Checklist salvo com sucesso!");
      onSaved();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAsTemplate() {
    const name = prompt("Nome do template:");
    if (!name) return;
    setChecklist((prev) => ({ ...prev, is_template: true, template_name: name }));
    // Save after state update
    setTimeout(() => handleSave(), 100);
  }

  const totalTasks = sections.reduce((acc, s) => acc + s.tasks.length, 0);
  const doneTasks = sections.reduce((acc, s) => acc + s.tasks.filter((t) => t.is_done).length, 0);
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <h2 className="text-lg font-semibold">{checklistId ? "Editar" : "Novo"} Checklist</h2>
        {totalTasks > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {doneTasks}/{totalTasks} ({pct}%)
          </span>
        )}
      </div>

      {/* Header fields */}
      <Card>
        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Label>Título do Checklist *</Label>
            <Input value={checklist.title} onChange={(e) => setChecklist((p) => ({ ...p, title: e.target.value }))} placeholder="Ex: Checklist de entrega" />
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" value={checklist.checklist_date} onChange={(e) => setChecklist((p) => ({ ...p, checklist_date: e.target.value }))} />
          </div>
          <div>
            <Label>Responsável Geral</Label>
            <Input value={checklist.general_responsible} onChange={(e) => setChecklist((p) => ({ ...p, general_responsible: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <Label>Projeto / Cliente</Label>
            <Input value={checklist.project_name} onChange={(e) => setChecklist((p) => ({ ...p, project_name: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      {sections.map((sec, si) => (
        <Card key={si}>
          <Collapsible open={sec.isOpen} onOpenChange={(open) => updateSection(si, "isOpen", open)}>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={sec.title}
                  onChange={(e) => updateSection(si, "title", e.target.value)}
                  placeholder="Título da seção"
                  className="font-semibold"
                />
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSection(si, -1)} disabled={si === 0}>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSection(si, 1)} disabled={si === sections.length - 1}>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeSection(si)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      {sec.isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-2">
                <Textarea
                  value={sec.notes}
                  onChange={(e) => updateSection(si, "notes", e.target.value)}
                  placeholder="Observações da seção (opcional)"
                  className="text-xs min-h-[40px]"
                />
                {sec.tasks.map((task, ti) => (
                  <div key={ti} className="flex items-start gap-2 p-2 rounded border bg-muted/30">
                    <Checkbox
                      checked={task.is_done}
                      onCheckedChange={(v) => updateTask(si, ti, "is_done", !!v)}
                      className="mt-2"
                    />
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input
                        value={task.activity}
                        onChange={(e) => updateTask(si, ti, "activity", e.target.value)}
                        placeholder="Atividade"
                        className={`text-xs sm:col-span-3 ${task.is_done ? "line-through opacity-60" : ""}`}
                      />
                      <Input
                        type="date"
                        value={task.due_date}
                        onChange={(e) => updateTask(si, ti, "due_date", e.target.value)}
                        className="text-xs"
                      />
                      <Input
                        value={task.responsible}
                        onChange={(e) => updateTask(si, ti, "responsible", e.target.value)}
                        placeholder="Responsável"
                        className="text-xs"
                      />
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveTask(si, ti, -1)} disabled={ti === 0}>
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveTask(si, ti, 1)} disabled={ti === sec.tasks.length - 1}>
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateTask(si, ti)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeTask(si, ti)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="text-xs" onClick={() => addTask(si)}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar Tarefa
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}

      <Button variant="outline" onClick={addSection}>
        <Plus className="h-4 w-4 mr-1" /> Adicionar Seção
      </Button>

      {/* Notes */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Observações Gerais</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Textarea
            value={checklist.notes}
            onChange={(e) => setChecklist((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Observações gerais do checklist..."
            className="min-h-[60px]"
          />
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Salvar Checklist"}
        </Button>
        <Button variant="secondary" onClick={handleSaveAsTemplate} disabled={saving}>
          <Copy className="h-4 w-4 mr-1" /> Salvar como Template
        </Button>
      </div>
    </div>
  );
}
