import { useState, useEffect } from "react";
import { ExternalLink, Plus, Pencil, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PartsStore {
  id: string;
  name: string;
  url: string;
}

const PartsStores = () => {
  const { user } = useAuth();
  const isAdminMaster = user?.role === "admin_master";

  const [stores, setStores] = useState<PartsStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingStore, setEditingStore] = useState<PartsStore | null>(null);
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");

  const fetchStores = async () => {
    setLoading(true);
    const { data } = await supabase.from("parts_stores").select("id, name, url").order("created_at", { ascending: true });
    setStores(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchStores(); }, []);

  const openAdd = () => {
    setEditingStore(null);
    setFormName("");
    setFormUrl("");
    setShowDialog(true);
  };

  const openEdit = (store: PartsStore) => {
    setEditingStore(store);
    setFormName(store.name);
    setFormUrl(store.url);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formName || !formUrl) {
      toast.error("Preencha todos os campos.");
      return;
    }

    if (editingStore) {
      const { error } = await supabase.from("parts_stores").update({ name: formName, url: formUrl }).eq("id", editingStore.id);
      if (error) { toast.error("Erro ao atualizar: " + error.message); return; }
      toast.success("Link atualizado!");
    } else {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) { toast.error("Usuário não autenticado."); return; }
      const { error } = await supabase.from("parts_stores").insert({ name: formName, url: formUrl, created_by: userId });
      if (error) { toast.error("Erro ao adicionar: " + error.message); return; }
      toast.success("Link adicionado!");
    }

    setShowDialog(false);
    fetchStores();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("parts_stores").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir: " + error.message); return; }
    toast.success("Link excluído!");
    fetchStores();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Peças e Acessórios</h1>
          <p className="text-sm text-muted-foreground mt-1">Links para lojas de peças e acessórios</p>
        </div>
        {isAdminMaster && (
          <Button onClick={openAdd} className="gap-2">
            <Plus className="w-4 h-4" /> Adicionar Link
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : stores.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ShoppingBag className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">Nenhum link cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {stores.map(store => (
            <div key={store.id} className="gradient-card rounded-lg border border-border p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-foreground">{store.name}</h3>
                {isAdminMaster && (
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(store)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(store.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              <a
                href={store.url.startsWith("http") ? store.url : `https://${store.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline break-all"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                {store.url}
              </a>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingStore ? "Editar Link" : "Adicionar Link"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-foreground">Nome da Loja *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex: Loja de Peças CNC" className="bg-accent border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">URL do Site *</Label>
              <Input value={formUrl} onChange={e => setFormUrl(e.target.value)} placeholder="Ex: https://loja.com.br" className="bg-accent border-border" />
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

export default PartsStores;
