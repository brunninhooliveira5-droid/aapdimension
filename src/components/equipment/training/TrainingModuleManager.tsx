import { useState } from "react";
import { Plus, Pencil, Trash2, GripVertical, ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TrainingModule } from "./TrainingTypes";

interface Props {
  equipmentId: string;
  modules: TrainingModule[];
  onModulesChange: () => void;
  selectedModuleId: string | null;
  onSelectModule: (id: string | null) => void;
  isAdmin: boolean;
  moduleLessonCounts: Record<string, { total: number; watched: number }>;
}

export const TrainingModuleManager = ({ equipmentId, modules, onModulesChange, selectedModuleId, onSelectModule, isAdmin, moduleLessonCounts }: Props) => {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleAdd = async () => {
    if (!title.trim()) { toast.error("Preencha o título."); return; }
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    const { error } = await (supabase as any).from("training_modules").insert({
      equipment_id: equipmentId,
      title: title.trim(),
      description,
      sort_order: modules.length,
      created_by: userId,
    });
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Módulo criado!");
    setTitle(""); setDescription(""); setShowAdd(false);
    onModulesChange();
  };

  const handleUpdate = async (mod: TrainingModule) => {
    if (!title.trim()) { toast.error("Preencha o título."); return; }
    const { error } = await (supabase as any).from("training_modules").update({ title: title.trim(), description }).eq("id", mod.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Módulo atualizado!");
    setEditingId(null); setTitle(""); setDescription("");
    onModulesChange();
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("training_modules").delete().eq("id", id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Módulo excluído!");
    if (selectedModuleId === id) onSelectModule(null);
    onModulesChange();
  };

  const toggleActive = async (mod: TrainingModule) => {
    const { error } = await (supabase as any).from("training_modules").update({ is_active: !mod.is_active }).eq("id", mod.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    onModulesChange();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Módulos ({modules.length})</h4>
        {isAdmin && (
          <Button size="sm" variant="outline" className="gap-1.5 border-border h-7 text-xs" onClick={() => { setShowAdd(!showAdd); setEditingId(null); setTitle(""); setDescription(""); }}>
            <Plus className="w-3 h-3" /> Módulo
          </Button>
        )}
      </div>

      {showAdd && isAdmin && (
        <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título do módulo" className="bg-accent border-border text-sm h-8" />
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição (opcional)" className="bg-accent border-border text-sm min-h-[60px]" />
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={handleAdd}>Criar</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAdd(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {modules.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Nenhum módulo criado.</p>
      ) : (
        <div className="space-y-1">
          {modules.map((mod, idx) => {
            const counts = moduleLessonCounts[mod.id] || { total: 0, watched: 0 };
            const isSelected = selectedModuleId === mod.id;
            const isEditing = editingId === mod.id;
            const progress = counts.total > 0 ? Math.round((counts.watched / counts.total) * 100) : 0;

            if (isEditing && isAdmin) {
              return (
                <div key={mod.id} className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                  <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-accent border-border text-sm h-8" />
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-accent border-border text-sm min-h-[60px]" />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={() => handleUpdate(mod)}>Salvar</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>Cancelar</Button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={mod.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 bg-accent/30"} ${!mod.is_active ? "opacity-50" : ""}`}
                onClick={() => onSelectModule(isSelected ? null : mod.id)}
              >
                <div className="flex items-center gap-2">
                  {isSelected ? <ChevronDown className="w-4 h-4 text-primary shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {idx + 1}. {mod.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{counts.total} aula{counts.total !== 1 ? "s" : ""}</span>
                      {counts.total > 0 && (
                        <>
                          <div className="flex-1 max-w-[80px] h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{progress}%</span>
                        </>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleActive(mod)}>
                        {mod.is_active ? <Eye className="w-3 h-3 text-muted-foreground" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingId(mod.id); setTitle(mod.title); setDescription(mod.description); setShowAdd(false); }}>
                        <Pencil className="w-3 h-3 text-muted-foreground" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-foreground">Excluir Módulo</AlertDialogTitle>
                            <AlertDialogDescription>Todas as aulas e materiais deste módulo serão excluídos.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(mod.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
