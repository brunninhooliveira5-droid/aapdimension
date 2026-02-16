import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TrainingSector } from "./SectorCardsGrid";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  open: boolean;
  sector?: TrainingSector;
  onClose: () => void;
  onSaved: () => void;
}

export function SectorManageDialog({ open, sector, onClose, onSaved }: Props) {
  const { session } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (sector) {
      setName(sector.name);
      setDescription(sector.description);
      setSortOrder(sector.sort_order);
      setIsActive(sector.is_active);
    } else {
      setName("");
      setDescription("");
      setSortOrder(0);
      setIsActive(true);
    }
    setImageFile(null);
  }, [sector, open]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!session?.user?.id) { toast.error("Não autenticado"); return; }
    setSaving(true);

    let image_url = sector?.image_url || null;

    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `sectors/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("dimension-category-images").upload(path, imageFile);
      if (upErr) { toast.error("Erro no upload da imagem"); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("dimension-category-images").getPublicUrl(path);
      image_url = urlData.publicUrl;
    }

    if (sector) {
      const { error } = await supabase.from("training_sectors").update({
        name, description, sort_order: sortOrder, is_active: isActive, image_url,
      }).eq("id", sector.id);
      if (error) { toast.error("Erro ao atualizar: " + error.message); }
      else { toast.success("Setor atualizado!"); onSaved(); }
    } else {
      const { error } = await supabase.from("training_sectors").insert({
        name, description, sort_order: sortOrder, is_active: isActive, image_url, created_by: session.user.id,
      });
      if (error) { toast.error("Erro ao criar: " + error.message); }
      else { toast.success("Setor criado!"); onSaved(); }
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{sector ? "Editar Setor" : "Novo Setor"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Orion, Falcon..." />
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
              <Button variant="outline" size="sm" onClick={() => document.getElementById("sector-img-input")?.click()}>
                <Upload className="h-4 w-4 mr-1" /> {imageFile ? imageFile.name : "Escolher imagem"}
              </Button>
              <input id="sector-img-input" type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Setor ativo</Label>
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
