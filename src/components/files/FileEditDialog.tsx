import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CustomerFile, FileCategory } from "@/pages/FilesPage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  open: boolean;
  file?: CustomerFile;
  categories: FileCategory[];
  onClose: () => void;
  onSaved: () => void;
}

export function FileEditDialog({ open, file, categories, onClose, onSaved }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("");
  const [tags, setTags] = useState("");
  const [published, setPublished] = useState(true);
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (file) {
      setDisplayName(file.display_name);
      setDescription(file.description);
      setVersion(file.version || "");
      setTags(file.tags?.join(", ") || "");
      setPublished(file.published);
      setCategoryId(file.category_id);
    }
  }, [file, open]);

  const handleSave = async () => {
    if (!file) return;
    if (!displayName.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);

    const { error } = await supabase.from("customer_files").update({
      display_name: displayName.trim(),
      description: description.trim(),
      version: version.trim() || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      published,
      category_id: categoryId,
    }).eq("id", file.id);

    if (error) { toast.error("Erro ao salvar: " + error.message); }
    else { toast.success("Arquivo atualizado!"); onSaved(); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Arquivo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Nome de exibição *</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Versão</Label>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Tags (vírgula)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Publicado</Label>
            <Switch checked={published} onCheckedChange={setPublished} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
