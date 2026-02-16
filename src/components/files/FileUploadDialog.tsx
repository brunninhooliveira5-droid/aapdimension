import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload } from "lucide-react";

interface Props {
  open: boolean;
  categoryId: string;
  trainingSectorId?: string | null;
  onClose: () => void;
  onUploaded: () => void;
}

export function FileUploadDialog({ open, categoryId, trainingSectorId, onClose, onUploaded }: Props) {
  const { session } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("");
  const [tags, setTags] = useState("");
  const [published, setPublished] = useState(true);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) { toast.error("Selecione um arquivo"); return; }
    if (!displayName.trim()) { toast.error("Nome de exibição é obrigatório"); return; }
    if (!session?.user?.id) { toast.error("Não autenticado"); return; }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${categoryId}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage.from("dimension-files").upload(path, file);
    if (upErr) { toast.error("Erro no upload: " + upErr.message); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from("dimension-files").getPublicUrl(path);

    const { error } = await supabase.from("customer_files").insert({
      category_id: categoryId,
      training_sector_id: trainingSectorId || null,
      file_url: urlData.publicUrl,
      file_name_original: file.name,
      display_name: displayName.trim(),
      description: description.trim(),
      version: version.trim() || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      file_size: file.size,
      mime_type: file.type || "application/octet-stream",
      published,
      created_by: session.user.id,
    });

    if (error) { toast.error("Erro ao salvar: " + error.message); }
    else {
      toast.success("Arquivo enviado com sucesso!");
      setFile(null); setDisplayName(""); setDescription(""); setVersion(""); setTags(""); setPublished(true);
      onUploaded();
    }
    setUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload de Arquivo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Arquivo *</Label>
            <Button variant="outline" className="w-full justify-start" onClick={() => document.getElementById("file-upload-input")?.click()}>
              <Upload className="h-4 w-4 mr-2" /> {file ? file.name : "Selecionar arquivo"}
            </Button>
            <input id="file-upload-input" type="file" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { setFile(f); if (!displayName) setDisplayName(f.name.replace(/\.[^.]+$/, "")); }
            }} />
          </div>
          <div className="space-y-1">
            <Label>Nome de exibição *</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nome exibido para o usuário" />
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição do arquivo" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Versão</Label>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="ex: 1.0" />
            </div>
            <div className="space-y-1">
              <Label>Tags (vírgula)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1, tag2" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Publicado</Label>
            <Switch checked={published} onCheckedChange={setPublished} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={uploading}>{uploading ? "Enviando..." : "Enviar"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
