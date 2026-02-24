import { useState, useRef, useEffect } from "react";
import { GraduationCap, Plus, Pencil, Trash2, Video, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface TrainingRow {
  id: string;
  equipment_id: string;
  title: string;
  description: string;
  video_url: string | null;
  file_path: string | null;
  file_name: string | null;
  created_at: string;
}

interface Props {
  equipmentId: string;
}

export const EquipmentTrainingsSection = ({ equipmentId }: Props) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin_master";
  const trainingFileRef = useRef<HTMLInputElement>(null);
  const editTrainingFileRef = useRef<HTMLInputElement>(null);

  const [showDialog, setShowDialog] = useState(false);
  const [trainings, setTrainings] = useState<TrainingRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Add state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newVideo, setNewVideo] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Edit state
  const [editingTraining, setEditingTraining] = useState<TrainingRow | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editVideo, setEditVideo] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage.from("machine-files").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const fetchTrainings = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("registered_equipment_trainings")
      .select("*")
      .eq("equipment_id", equipmentId)
      .order("created_at", { ascending: false });
    setTrainings(data ?? []);
    setLoading(false);
  };

  const openDialog = () => {
    setShowDialog(true);
    fetchTrainings();
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) { toast.error("Preencha o título."); return; }
    setUploading(true);
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) { setUploading(false); return; }

    let filePath: string | null = null;
    let fileName: string | null = null;
    if (newFile) {
      const path = `trainings/equipment/${equipmentId}/${Date.now()}_${newFile.name}`;
      const { error: uploadErr } = await supabase.storage.from("machine-files").upload(path, newFile);
      if (uploadErr) { toast.error("Erro ao enviar arquivo: " + uploadErr.message); setUploading(false); return; }
      filePath = path;
      fileName = newFile.name;
    }

    const { data, error } = await (supabase as any)
      .from("registered_equipment_trainings")
      .insert({
        equipment_id: equipmentId,
        title: newTitle,
        description: newDesc,
        video_url: newVideo || null,
        file_path: filePath,
        file_name: fileName,
        created_by: userId,
      })
      .select()
      .single();

    if (error) { toast.error("Erro ao salvar: " + error.message); setUploading(false); return; }
    toast.success("Treinamento adicionado!");
    setTrainings(prev => [data as TrainingRow, ...prev]);
    setNewTitle(""); setNewDesc(""); setNewVideo(""); setNewFile(null);
    if (trainingFileRef.current) trainingFileRef.current.value = "";
    setUploading(false);
  };

  const handleDelete = async (training: TrainingRow) => {
    if (training.file_path) {
      await supabase.storage.from("machine-files").remove([training.file_path]);
    }
    const { error } = await (supabase as any)
      .from("registered_equipment_trainings")
      .delete()
      .eq("id", training.id);
    if (error) { toast.error("Erro ao excluir: " + error.message); return; }
    setTrainings(prev => prev.filter(t => t.id !== training.id));
    toast.success("Treinamento excluído!");
  };

  const handleEditSave = async () => {
    if (!editingTraining || !editTitle.trim()) { toast.error("Preencha o título."); return; }
    setSavingEdit(true);

    let filePath = editingTraining.file_path;
    let fileName = editingTraining.file_name;

    if (editFile) {
      if (editingTraining.file_path) {
        await supabase.storage.from("machine-files").remove([editingTraining.file_path]);
      }
      const path = `trainings/equipment/${equipmentId}/${Date.now()}_${editFile.name}`;
      const { error: uploadErr } = await supabase.storage.from("machine-files").upload(path, editFile);
      if (uploadErr) { toast.error("Erro ao enviar arquivo: " + uploadErr.message); setSavingEdit(false); return; }
      filePath = path;
      fileName = editFile.name;
    }

    const { error } = await (supabase as any)
      .from("registered_equipment_trainings")
      .update({
        title: editTitle,
        description: editDesc,
        video_url: editVideo || null,
        file_path: filePath,
        file_name: fileName,
      })
      .eq("id", editingTraining.id);

    if (error) { toast.error("Erro ao atualizar: " + error.message); setSavingEdit(false); return; }

    setTrainings(prev => prev.map(t => t.id === editingTraining.id ? {
      ...t, title: editTitle, description: editDesc, video_url: editVideo || null,
      file_path: filePath, file_name: fileName,
    } : t));
    setEditingTraining(null);
    setEditFile(null);
    setSavingEdit(false);
    toast.success("Treinamento atualizado!");
  };

  return (
    <>
      <div
        className="gradient-card rounded-lg border border-border p-5 cursor-pointer hover:border-primary/50 transition-colors"
        onClick={openDialog}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Treinamentos</h3>
            <p className="text-xs text-muted-foreground">Clique para ver materiais de treinamento</p>
          </div>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Treinamentos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {isAdmin && (
              <div className="space-y-3 p-4 rounded-lg border border-border bg-accent/30">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Adicionar Treinamento
                </h4>
                <div className="space-y-2">
                  <Label className="text-foreground text-xs">Título</Label>
                  <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: Operação Básica, Manutenção Preventiva..." className="bg-accent border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground text-xs">Descrição</Label>
                  <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Descreva o conteúdo do treinamento..." className="bg-accent border-border min-h-[80px]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground text-xs flex items-center gap-1"><Video className="w-3.5 h-3.5" /> URL do Vídeo (YouTube, Vimeo, etc.)</Label>
                  <Input value={newVideo} onChange={e => setNewVideo(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="bg-accent border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground text-xs flex items-center gap-1"><Upload className="w-3.5 h-3.5" /> Arquivo (PDF, documento, etc.)</Label>
                  <input ref={trainingFileRef} type="file" className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-accent file:text-foreground hover:file:bg-accent/80" onChange={e => setNewFile(e.target.files?.[0] ?? null)} />
                </div>
                <Button size="sm" className="gap-1.5" onClick={handleAdd} disabled={uploading}>
                  <Plus className="w-3.5 h-3.5" /> {uploading ? "Enviando..." : "Adicionar"}
                </Button>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Materiais ({trainings.length})</h4>
              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : trainings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum treinamento cadastrado.</p>
              ) : (
                trainings.map(t => (
                  <div key={t.id} className="p-4 rounded-lg border border-border bg-accent/30 space-y-3">
                    {editingTraining?.id === t.id ? (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label className="text-foreground text-xs">Título</Label>
                          <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="bg-accent border-border" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground text-xs">Descrição</Label>
                          <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} className="bg-accent border-border min-h-[80px]" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground text-xs flex items-center gap-1"><Video className="w-3.5 h-3.5" /> URL do Vídeo</Label>
                          <Input value={editVideo} onChange={e => setEditVideo(e.target.value)} className="bg-accent border-border" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground text-xs flex items-center gap-1"><Upload className="w-3.5 h-3.5" /> Substituir Arquivo</Label>
                          <input ref={editTrainingFileRef} type="file" className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-accent file:text-foreground hover:file:bg-accent/80" onChange={e => setEditFile(e.target.files?.[0] ?? null)} />
                          {t.file_name && !editFile && (
                            <p className="text-xs text-muted-foreground">Arquivo atual: {t.file_name}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleEditSave} disabled={savingEdit}>
                            {savingEdit ? "Salvando..." : "Salvar"}
                          </Button>
                          <Button size="sm" variant="outline" className="border-border" onClick={() => { setEditingTraining(null); setEditFile(null); }}>Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground">{t.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{new Date(t.created_at).toLocaleDateString("pt-BR")}</p>
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => {
                                setEditingTraining(t);
                                setEditTitle(t.title);
                                setEditDesc(t.description);
                                setEditVideo(t.video_url ?? "");
                                setEditFile(null);
                              }}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-card border-border">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-foreground">Excluir Treinamento</AlertDialogTitle>
                                    <AlertDialogDescription>Tem certeza que deseja excluir este treinamento?</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(t)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>
                        {t.description && (
                          <p className="text-sm text-foreground whitespace-pre-wrap">{t.description}</p>
                        )}
                        {t.video_url && (
                          <a href={t.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                            <Video className="w-3.5 h-3.5" /> Assistir Vídeo
                          </a>
                        )}
                        {t.file_path && t.file_name && (
                          <a href={getFileUrl(t.file_path)} download={t.file_name} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                            <Download className="w-3.5 h-3.5" /> {t.file_name}
                          </a>
                        )}
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-border">Fechar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
