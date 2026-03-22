import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Copy, FileText, Trash2, BookTemplate } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { generateChecklistPdf } from "@/lib/checklist-pdf";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ChecklistRow {
  id: string;
  title: string;
  checklist_date: string;
  general_responsible: string;
  project_name: string;
  is_template: boolean;
  template_name: string;
  created_at: string;
  totalTasks: number;
  doneTasks: number;
}

interface Props {
  onEdit: (id: string) => void;
  onNew: () => void;
}

export function ChecklistList({ onEdit, onNew }: Props) {
  const { session } = useAuth();
  const { user } = useAuth();
  const [checklists, setChecklists] = useState<ChecklistRow[]>([]);
  const [templates, setTemplates] = useState<ChecklistRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, [user?.id]);

  async function loadAll() {
    if (!userId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("pc_checklists")
      .select("*")
      .order("created_at", { ascending: false });

    if (!data) {
      setLoading(false);
      return;
    }

    const rows: ChecklistRow[] = [];
    for (const cl of data) {
      const { data: secs } = await (supabase as any)
        .from("pc_checklist_sections")
        .select("id")
        .eq("checklist_id", cl.id);
      let totalTasks = 0;
      let doneTasks = 0;
      if (secs) {
        for (const sec of secs) {
          const { data: tasks } = await (supabase as any)
            .from("pc_checklist_tasks")
            .select("is_done")
            .eq("section_id", sec.id);
          if (tasks) {
            totalTasks += tasks.length;
            doneTasks += tasks.filter((t: any) => t.is_done).length;
          }
        }
      }
      rows.push({ ...cl, totalTasks, doneTasks });
    }

    setChecklists(rows.filter((r) => !r.is_template));
    setTemplates(rows.filter((r) => r.is_template));
    setLoading(false);
  }

  async function handleDuplicate(id: string) {
    // Load full checklist and duplicate
    const { data: cl } = await (supabase as any).from("pc_checklists").select("*").eq("id", id).single();
    if (!cl) return;

    const { data: newCl } = await (supabase as any)
      .from("pc_checklists")
      .insert({
        created_by: user!.id,
        title: cl.title + " (cópia)",
        checklist_date: new Date().toISOString().split("T")[0],
        general_responsible: cl.general_responsible,
        project_name: cl.project_name,
        notes: cl.notes,
        is_template: false,
        template_name: "",
      })
      .select("id")
      .single();

    if (!newCl) return;

    const { data: secs } = await (supabase as any)
      .from("pc_checklist_sections")
      .select("*")
      .eq("checklist_id", id)
      .order("sort_order");

    if (secs) {
      for (const sec of secs) {
        const { data: newSec } = await (supabase as any)
          .from("pc_checklist_sections")
          .insert({ checklist_id: newCl.id, title: sec.title, notes: sec.notes, sort_order: sec.sort_order })
          .select("id")
          .single();

        if (newSec) {
          const { data: tasks } = await (supabase as any)
            .from("pc_checklist_tasks")
            .select("*")
            .eq("section_id", sec.id)
            .order("sort_order");
          if (tasks && tasks.length > 0) {
            await (supabase as any).from("pc_checklist_tasks").insert(
              tasks.map((t: any) => ({
                section_id: newSec.id,
                activity: t.activity,
                due_date: t.due_date,
                responsible: t.responsible,
                is_done: false,
                sort_order: t.sort_order,
              }))
            );
          }
        }
      }
    }
    toast.success("Checklist duplicado!");
    loadAll();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este checklist?")) return;
    await (supabase as any).from("pc_checklists").delete().eq("id", id);
    toast.success("Checklist excluído");
    loadAll();
  }

  async function handleGeneratePdf(id: string) {
    try {
      await generateChecklistPdf(id, user!.id);
      toast.success("PDF gerado!");
    } catch (err: any) {
      toast.error("Erro ao gerar PDF: " + err.message);
    }
  }

  async function handleLoadTemplate(templateId: string) {
    await handleDuplicate(templateId);
  }

  function renderCard(cl: ChecklistRow) {
    const pct = cl.totalTasks > 0 ? Math.round((cl.doneTasks / cl.totalTasks) * 100) : 0;
    return (
      <Card key={cl.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{cl.title || "Sem título"}</h3>
              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                {cl.checklist_date && (
                  <p>{format(new Date(cl.checklist_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}</p>
                )}
                {cl.general_responsible && <p>Responsável: {cl.general_responsible}</p>}
                {cl.project_name && <p>Projeto: {cl.project_name}</p>}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={pct === 100 ? "default" : "secondary"} className="text-xs">
                  {cl.doneTasks}/{cl.totalTasks} ({pct}%)
                </Badge>
                {cl.is_template && <Badge variant="outline" className="text-xs">Template</Badge>}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(cl.id)}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleGeneratePdf(cl.id)}>
                <FileText className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuplicate(cl.id)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(cl.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Checklists</h2>
        <div className="flex gap-2">
          {templates.length > 0 && (
            <Select onValueChange={handleLoadTemplate}>
              <SelectTrigger className="w-[180px] h-9 text-xs">
                <SelectValue placeholder="Carregar template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.template_name || t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button size="sm" onClick={onNew}>
            <Plus className="h-4 w-4 mr-1" /> Novo Checklist
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
      ) : checklists.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhum checklist criado ainda.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {checklists.map(renderCard)}
        </div>
      )}
    </div>
  );
}
