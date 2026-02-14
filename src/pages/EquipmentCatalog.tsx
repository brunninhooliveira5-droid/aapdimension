import { useState, useEffect } from "react";
import { ExternalLink, Plus, Pencil, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Equipment {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  link: string | null;
}

const EquipmentCatalog = () => {
  const { user } = useAuth();
  const isAdminMaster = user?.role === "admin_master";

  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formLink, setFormLink] = useState("");

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("dimension_equipment")
      .select("*")
      .order("created_at", { ascending: true });
    setItems((data as Equipment[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const openAdd = () => {
    setEditing(null);
    setFormName("");
    setFormDesc("");
    setFormImage("");
    setFormLink("");
    setShowDialog(true);
  };

  const openEdit = (item: Equipment) => {
    setEditing(item);
    setFormName(item.name);
    setFormDesc(item.description ?? "");
    setFormImage(item.image_url ?? "");
    setFormLink(item.link ?? "");
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formName) { toast.error("Preencha o nome."); return; }

    const payload = {
      name: formName,
      description: formDesc,
      image_url: formImage || null,
      link: formLink || null,
    };

    if (editing) {
      const { error } = await supabase.from("dimension_equipment").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar: " + error.message); return; }
      toast.success("Equipamento atualizado!");
    } else {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) { toast.error("Usuário não autenticado."); return; }
      const { error } = await supabase.from("dimension_equipment").insert({ ...payload, created_by: userId });
      if (error) { toast.error("Erro ao adicionar: " + error.message); return; }
      toast.success("Equipamento adicionado!");
    }

    setShowDialog(false);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("dimension_equipment").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir: " + error.message); return; }
    toast.success("Equipamento excluído!");
    fetchItems();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Equipamentos Dimension</h1>
          <p className="text-sm text-muted-foreground mt-1">Catálogo de equipamentos da Dimension CNC</p>
        </div>
        {isAdminMaster && (
          <Button onClick={openAdd} className="gap-2">
            <Plus className="w-4 h-4" /> Adicionar Equipamento
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">Nenhum equipamento cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className="gradient-card rounded-lg border border-border overflow-hidden">
              {item.image_url && (
                <div className="aspect-video bg-muted">
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground">{item.name}</h3>
                  {isAdminMaster && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                {item.link && (
                  <a
                    href={item.link.startsWith("http") ? item.link : `https://${item.link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" /> Ver detalhes
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editing ? "Editar Equipamento" : "Adicionar Equipamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-foreground">Nome *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex: Router CNC 3020" className="bg-accent border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Descrição</Label>
              <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Descrição do equipamento" className="bg-accent border-border" rows={3} />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">URL da Imagem</Label>
              <Input value={formImage} onChange={e => setFormImage(e.target.value)} placeholder="https://..." className="bg-accent border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Link Externo</Label>
              <Input value={formLink} onChange={e => setFormLink(e.target.value)} placeholder="https://dimensioncnc.com.br/..." className="bg-accent border-border" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-border">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EquipmentCatalog;
