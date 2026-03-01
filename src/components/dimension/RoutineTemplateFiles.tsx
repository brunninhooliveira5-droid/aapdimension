import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, Trash2, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TemplateFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
}

interface Props {
  routineId: string | null; // null when creating new routine (not yet saved)
  taskIndex: number;
  userId: string;
  disabled?: boolean;
}

export function RoutineTemplateFiles({ routineId, taskIndex, userId, disabled }: Props) {
  const [files, setFiles] = useState<TemplateFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchFiles = async () => {
    if (!routineId) return;
    const { data } = await supabase
      .from("dimension_routine_template_files")
      .select("id, file_name, file_path, file_size, mime_type")
      .eq("routine_id", routineId)
      .eq("task_index", taskIndex)
      .order("created_at");
    setFiles((data as TemplateFile[]) || []);
  };

  useEffect(() => {
    fetchFiles();
  }, [routineId, taskIndex]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !routineId) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `routine-templates/${routineId}/${taskIndex}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("dimension-task-files")
      .upload(path, file);

    if (uploadError) {
      toast.error("Erro ao enviar arquivo");
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase
      .from("dimension_routine_template_files")
      .insert({
        routine_id: routineId,
        task_index: taskIndex,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: userId,
      });

    if (dbError) {
      toast.error("Erro ao salvar registro do arquivo");
    } else {
      toast.success("Arquivo anexado!");
      fetchFiles();
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleDownload = async (f: TemplateFile) => {
    const { data } = await supabase.storage
      .from("dimension-task-files")
      .createSignedUrl(f.file_path, 60);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    } else {
      toast.error("Erro ao gerar link de download");
    }
  };

  const handleDelete = async (f: TemplateFile) => {
    await supabase.storage.from("dimension-task-files").remove([f.file_path]);
    const { error } = await supabase
      .from("dimension_routine_template_files")
      .delete()
      .eq("id", f.id);
    if (error) {
      toast.error("Erro ao remover arquivo");
    } else {
      toast.success("Arquivo removido");
      fetchFiles();
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        {files.map((f) => (
          <Badge key={f.id} variant="secondary" className="gap-1 text-[10px] py-0.5 pr-0.5">
            <FileText className="h-3 w-3" />
            <span className="max-w-[100px] truncate">{f.file_name}</span>
            <span className="text-muted-foreground">({formatSize(f.file_size)})</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-4 w-4 ml-0.5"
              onClick={() => handleDownload(f)}
              type="button"
            >
              <Download className="h-2.5 w-2.5" />
            </Button>
            {!disabled && (
              <Button
                size="icon"
                variant="ghost"
                className="h-4 w-4 text-destructive"
                onClick={() => handleDelete(f)}
                type="button"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            )}
          </Badge>
        ))}
      </div>
      {!disabled && routineId && (
        <label className="inline-flex items-center gap-1 text-[10px] text-primary cursor-pointer hover:underline">
          {uploading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Upload className="h-3 w-3" />
          )}
          {uploading ? "Enviando..." : "Anexar arquivo"}
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      )}
      {!routineId && (
        <p className="text-[10px] text-muted-foreground italic">Salve a rotina para anexar arquivos</p>
      )}
    </div>
  );
}
