import { useState, useRef } from "react";
import { Plus, Pencil, Trash2, Video, Upload, Check, ChevronLeft, ChevronRight, FileText, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TrainingVideoPlayer } from "./TrainingVideoPlayer";
import type { TrainingLesson, TrainingMaterial, TrainingProgressRow, TrainingModule } from "./TrainingTypes";

interface Props {
  module: TrainingModule;
  lessons: TrainingLesson[];
  materials: TrainingMaterial[];
  progress: TrainingProgressRow[];
  equipmentId: string;
  isAdmin: boolean;
  onDataChange: () => void;
}

const VIDEO_ACCEPT = ".mp4,.webm,.ogg,.mov,.avi,.mkv";

export const TrainingLessonManager = ({ module, lessons, materials, progress, equipmentId, isAdmin, onDataChange }: Props) => {
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const editVideoFileRef = useRef<HTMLInputElement>(null);

  // Material upload
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [matTitle, setMatTitle] = useState("");
  const [matFile, setMatFile] = useState<File | null>(null);
  const [matForLesson, setMatForLesson] = useState<string | null>(null);
  const matFileRef = useRef<HTMLInputElement>(null);

  const activeLesson = lessons.find(l => l.id === activeLessonId);
  const activeIdx = lessons.findIndex(l => l.id === activeLessonId);

  const isWatched = (lessonId: string) => progress.some(p => p.lesson_id === lessonId && p.watched);

  const getVideoPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("machine-files").getPublicUrl(path);
    return data.publicUrl;
  };

  const uploadVideo = async (file: File): Promise<{ path: string; url: string } | null> => {
    const path = `trainings/videos/${module.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("machine-files").upload(path, file);
    if (error) { toast.error("Erro ao enviar vídeo: " + error.message); return null; }
    return { path, url: getVideoPublicUrl(path) };
  };

  const handleAddLesson = async () => {
    if (!title.trim()) { toast.error("Preencha o título."); return; }
    setUploading(true);

    let videoUrl = "";
    let videoPath: string | null = null;

    if (videoFile) {
      const result = await uploadVideo(videoFile);
      if (!result) { setUploading(false); return; }
      videoUrl = result.url;
      videoPath = result.path;
    }

    const { error } = await (supabase as any).from("training_lessons").insert({
      module_id: module.id, title: title.trim(), description, video_url: videoUrl, video_path: videoPath, duration, sort_order: lessons.length,
    });
    if (error) { toast.error("Erro: " + error.message); setUploading(false); return; }
    toast.success("Aula adicionada!");
    setTitle(""); setDescription(""); setDuration(""); setVideoFile(null); setShowAddLesson(false);
    if (videoFileRef.current) videoFileRef.current.value = "";
    setUploading(false);
    onDataChange();
  };

  const handleUpdateLesson = async (lesson: TrainingLesson) => {
    if (!title.trim()) { toast.error("Preencha o título."); return; }
    setUploading(true);

    let videoUrl = lesson.video_url;
    let videoPath = lesson.video_path;

    if (videoFile) {
      // Remove old video
      if (lesson.video_path) {
        await supabase.storage.from("machine-files").remove([lesson.video_path]);
      }
      const result = await uploadVideo(videoFile);
      if (!result) { setUploading(false); return; }
      videoUrl = result.url;
      videoPath = result.path;
    }

    const { error } = await (supabase as any).from("training_lessons").update({ title: title.trim(), description, video_url: videoUrl, video_path: videoPath, duration }).eq("id", lesson.id);
    if (error) { toast.error("Erro: " + error.message); setUploading(false); return; }
    toast.success("Aula atualizada!");
    setEditingLessonId(null); setVideoFile(null); setUploading(false);
    onDataChange();
  };

  const handleDeleteLesson = async (id: string) => {
    const lesson = lessons.find(l => l.id === id);
    if (lesson?.video_path) {
      await supabase.storage.from("machine-files").remove([lesson.video_path]);
    }
    const { error } = await (supabase as any).from("training_lessons").delete().eq("id", id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Aula excluída!");
    if (activeLessonId === id) setActiveLessonId(null);
    onDataChange();
  };

  const toggleWatched = async (lesson: TrainingLesson) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    const existing = progress.find(p => p.lesson_id === lesson.id);
    if (existing) {
      const { error } = await (supabase as any).from("training_progress").update({ watched: !existing.watched, watched_at: !existing.watched ? new Date().toISOString() : null }).eq("id", existing.id);
      if (error) { toast.error("Erro: " + error.message); return; }
    } else {
      const { error } = await (supabase as any).from("training_progress").insert({ user_id: userId, equipment_id: equipmentId, module_id: module.id, lesson_id: lesson.id, watched: true, watched_at: new Date().toISOString() });
      if (error) { toast.error("Erro: " + error.message); return; }
    }
    onDataChange();
  };

  const toggleLessonActive = async (lesson: TrainingLesson) => {
    const { error } = await (supabase as any).from("training_lessons").update({ is_active: !lesson.is_active }).eq("id", lesson.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    onDataChange();
  };

  const handleAddMaterial = async () => {
    if (!matTitle.trim() || !matFile) { toast.error("Preencha título e selecione arquivo."); return; }
    const path = `trainings/materials/${module.id}/${Date.now()}_${matFile.name}`;
    const { error: upErr } = await supabase.storage.from("machine-files").upload(path, matFile);
    if (upErr) { toast.error("Erro upload: " + upErr.message); return; }
    const { data: urlData } = supabase.storage.from("machine-files").getPublicUrl(path);
    const { error } = await (supabase as any).from("training_materials").insert({
      module_id: matForLesson ? null : module.id,
      lesson_id: matForLesson || null,
      title: matTitle.trim(),
      file_url: urlData.publicUrl,
      file_path: path,
      file_type: matFile.type || matFile.name.split(".").pop() || "",
    });
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Material adicionado!");
    setMatTitle(""); setMatFile(null); setShowAddMaterial(false); setMatForLesson(null);
    if (matFileRef.current) matFileRef.current.value = "";
    onDataChange();
  };

  const handleDeleteMaterial = async (mat: TrainingMaterial) => {
    if (mat.file_path) await supabase.storage.from("machine-files").remove([mat.file_path]);
    const { error } = await (supabase as any).from("training_materials").delete().eq("id", mat.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Material excluído!");
    onDataChange();
  };

  const moduleMaterials = materials.filter(m => m.module_id === module.id && !m.lesson_id);

  const resetForm = () => {
    setTitle(""); setDescription(""); setDuration(""); setVideoFile(null);
    if (videoFileRef.current) videoFileRef.current.value = "";
    if (editVideoFileRef.current) editVideoFileRef.current.value = "";
  };

  // Video file input component
  const VideoFileInput = ({ inputRef, currentVideoPath }: { inputRef: React.RefObject<HTMLInputElement>; currentVideoPath?: string | null }) => (
    <div className="space-y-1">
      <Label className="text-foreground text-xs flex items-center gap-1"><Video className="w-3.5 h-3.5" /> Vídeo (MP4, WebM, OGG, MOV)</Label>
      <div
        className="relative h-20 rounded-lg border-2 border-dashed border-border bg-accent/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        {videoFile ? (
          <div className="flex items-center gap-2 text-xs text-foreground">
            <Video className="w-4 h-4 text-primary" />
            <span className="truncate max-w-[200px]">{videoFile.name}</span>
            <span className="text-muted-foreground">({(videoFile.size / 1024 / 1024).toFixed(1)} MB)</span>
          </div>
        ) : currentVideoPath ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Video className="w-4 h-4 text-primary" />
            <span>Vídeo atual • Clique para substituir</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <Upload className="w-5 h-5" />
            <span className="text-xs">Clique para selecionar vídeo</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={VIDEO_ACCEPT}
        className="hidden"
        onChange={e => setVideoFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );

  // Player view
  if (activeLesson) {
    const lessonMaterials = materials.filter(m => m.lesson_id === activeLesson.id);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs" onClick={() => setActiveLessonId(null)}>
            <ChevronLeft className="w-3 h-3" /> Voltar
          </Button>
          <span className="text-xs text-muted-foreground">Aula {activeIdx + 1} de {lessons.length}</span>
        </div>

        <div>
          <h3 className="text-base font-semibold text-foreground">{activeLesson.title}</h3>
          {activeLesson.description && <p className="text-sm text-muted-foreground mt-1">{activeLesson.description}</p>}
          {activeLesson.duration && <span className="text-xs text-muted-foreground">⏱ {activeLesson.duration}</span>}
        </div>

        {activeLesson.video_url && <TrainingVideoPlayer videoUrl={activeLesson.video_url} />}

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleWatched(activeLesson)}>
            <Checkbox checked={isWatched(activeLesson.id)} />
            <span className="text-sm text-foreground">Marcar como assistido</span>
          </div>
        </div>

        {lessonMaterials.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Materiais desta aula</p>
            {lessonMaterials.map(m => (
              <a key={m.id} href={m.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-primary hover:underline p-1.5 rounded hover:bg-accent/50">
                <FileText className="w-3.5 h-3.5" /> {m.title}
              </a>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button variant="outline" size="sm" className="gap-1 h-7 text-xs border-border" disabled={activeIdx <= 0} onClick={() => setActiveLessonId(lessons[activeIdx - 1]?.id)}>
            <ChevronLeft className="w-3 h-3" /> Anterior
          </Button>
          <Button variant="outline" size="sm" className="gap-1 h-7 text-xs border-border" disabled={activeIdx >= lessons.length - 1} onClick={() => setActiveLessonId(lessons[activeIdx + 1]?.id)}>
            Próxima <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">{module.title} — Aulas</h4>
        {isAdmin && (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="gap-1 border-border h-7 text-xs" onClick={() => { setShowAddMaterial(!showAddMaterial); setShowAddLesson(false); setMatForLesson(null); }}>
              <Upload className="w-3 h-3" /> Material
            </Button>
            <Button size="sm" variant="outline" className="gap-1 border-border h-7 text-xs" onClick={() => { setShowAddLesson(!showAddLesson); setShowAddMaterial(false); setEditingLessonId(null); resetForm(); }}>
              <Plus className="w-3 h-3" /> Aula
            </Button>
          </div>
        )}
      </div>

      {showAddMaterial && isAdmin && (
        <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
          <p className="text-xs font-semibold text-foreground">Adicionar Material ao Módulo</p>
          <Input value={matTitle} onChange={e => setMatTitle(e.target.value)} placeholder="Título do material" className="bg-accent border-border text-sm h-8" />
          <input ref={matFileRef} type="file" className="text-xs text-muted-foreground" onChange={e => setMatFile(e.target.files?.[0] ?? null)} />
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={handleAddMaterial}>Enviar</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAddMaterial(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {showAddLesson && isAdmin && (
        <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título da aula" className="bg-accent border-border text-sm h-8" />
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição" className="bg-accent border-border text-sm min-h-[50px]" />
          <VideoFileInput inputRef={videoFileRef} />
          <Input value={duration} onChange={e => setDuration(e.target.value)} placeholder="Duração (ex: 15min)" className="bg-accent border-border text-sm h-8" />
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs gap-1" onClick={handleAddLesson} disabled={uploading}>
              {uploading && <Loader2 className="w-3 h-3 animate-spin" />}
              {uploading ? "Enviando..." : "Criar"}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setShowAddLesson(false); resetForm(); }}>Cancelar</Button>
          </div>
        </div>
      )}

      {lessons.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3 text-center">Nenhuma aula neste módulo.</p>
      ) : (
        <div className="space-y-1">
          {lessons.map((lesson, idx) => {
            const watched = isWatched(lesson.id);
            if (editingLessonId === lesson.id && isAdmin) {
              return (
                <div key={lesson.id} className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                  <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-accent border-border text-sm h-8" />
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-accent border-border text-sm min-h-[50px]" />
                  <VideoFileInput inputRef={editVideoFileRef} currentVideoPath={lesson.video_path} />
                  <Input value={duration} onChange={e => setDuration(e.target.value)} placeholder="Duração" className="bg-accent border-border text-sm h-8" />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleUpdateLesson(lesson)} disabled={uploading}>
                      {uploading && <Loader2 className="w-3 h-3 animate-spin" />}
                      {uploading ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditingLessonId(null); resetForm(); }}>Cancelar</Button>
                  </div>
                </div>
              );
            }

            return (
              <div key={lesson.id} className={`p-3 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer bg-accent/20 ${!lesson.is_active ? "opacity-50" : ""}`} onClick={() => setActiveLessonId(lesson.id)}>
                <div className="flex items-center gap-3">
                  {/* Video Thumbnail */}
                  {lesson.video_url ? (
                    <div className="w-20 h-14 rounded-md overflow-hidden bg-black/50 shrink-0 relative group">
                      <video
                        src={lesson.video_url}
                        className="w-full h-full object-cover"
                        preload="metadata"
                        muted
                        playsInline
                        onLoadedData={(e) => {
                          const vid = e.currentTarget;
                          vid.currentTime = 1;
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                        <div className="w-6 h-6 rounded-full bg-primary/90 flex items-center justify-center">
                          <Video className="w-3 h-3 text-primary-foreground ml-0.5" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-20 h-14 rounded-md bg-muted/50 shrink-0 flex items-center justify-center">
                      <Video className="w-5 h-5 text-muted-foreground/50" />
                    </div>
                  )}

                  {/* Lesson number badge */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${watched ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {watched ? <Check className="w-3 h-3" /> : idx + 1}
                  </div>

                  {/* Lesson info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{lesson.title}</p>
                    <div className="flex items-center gap-2">
                      {lesson.duration && <span className="text-[10px] text-muted-foreground">⏱ {lesson.duration}</span>}
                      {watched && <Badge variant="default" className="text-[9px] h-4 px-1 bg-primary/20 text-primary">Assistido</Badge>}
                    </div>
                  </div>

                  {/* Admin actions */}
                  {isAdmin && (
                    <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleLessonActive(lesson)}>
                        {lesson.is_active ? <Eye className="w-3 h-3 text-muted-foreground" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingLessonId(lesson.id); setTitle(lesson.title); setDescription(lesson.description); setDuration(lesson.duration); setVideoFile(null); setShowAddLesson(false); }}>
                        <Pencil className="w-3 h-3 text-muted-foreground" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6"><Trash2 className="w-3 h-3 text-muted-foreground" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-foreground">Excluir Aula</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteLesson(lesson.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
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

      {/* Module materials */}
      {moduleMaterials.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Materiais do Módulo</p>
          {moduleMaterials.map(m => (
            <div key={m.id} className="flex items-center justify-between p-2 rounded hover:bg-accent/50">
              <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-primary hover:underline">
                <FileText className="w-3.5 h-3.5" /> {m.title}
              </a>
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6"><Trash2 className="w-3 h-3 text-muted-foreground" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-foreground">Excluir Material</AlertDialogTitle>
                      <AlertDialogDescription>Deseja excluir este material?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteMaterial(m)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
