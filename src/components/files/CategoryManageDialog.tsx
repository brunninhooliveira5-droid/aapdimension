import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FileCategory } from "@/pages/FilesPage";
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
  category?: FileCategory;
  onClose: () => void;
  onSaved: () => void;
}

export function CategoryManageDialog({ open, category, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description);
      setSortOrder(category.sort_order);
      setIsActive(category.is_active);
    } else {
      setName("");
      setDescription("");
      setSortOrder(0);
      setIsActive(true);
    }
    setImageFile(null);
  }, [category, open]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);

    let image_url = category?.image_url || null;

    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("dimension-category-images").upload(path, imageFile);
      if (upErr) { toast.error("Erro no upload da imagem"); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("dimension-category-images").getPublicUrl(path);
      image_url = urlData.publicUrl;
    }

    if (category) {
      const { error } = await supabase.from("file_categories").update({ name, description, sort_order: sortOrder, is_active: isActive, image_url }).eq("id", category.id);
      if (error) { toast.error("Erro ao atualizar: " + error.message); } else { toast.success("Categoria atualizada!"); onSaved(); }
    } else {
      const { error } = await supabase.from("file_categories").insert({ name, description, sort_order: sortOrder, is_active: isActive, image_url });
      if (error) { toast.error("Erro ao criar: " + error.message); } else { toast.success("Categoria criada!"); onSaved(); }
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da categoria" />
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição curta" rows={2} />
          </div>
          <div className="space-y-1">
            <Label>Ordem de exibição</Label>
            <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label>Imagem</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => document.getElementById("cat-img-input")?.click()}>
                <Upload className="h-4 w-4 mr-1" /> {imageFile ? imageFile.name : "Escolher imagem"}
              </Button>
              <input id="cat-img-input" type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Categoria ativa</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
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
