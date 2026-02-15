import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Bulletin {
  id: string;
  title: string;
  content: string;
  details: string;
  active: boolean;
  valid_from: string;
  valid_until: string | null;
  target_models: string[];
  created_at: string;
}

const BulletinsPage = () => {
  const { user } = useAuth();
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Bulletin | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [details, setDetails] = useState("");
  const [active, setActive] = useState(true);
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split("T")[0]);
  const [validUntil, setValidUntil] = useState("");
  const [targetModels, setTargetModels] = useState("");

  const fetchBulletins = async () => {
    const { data } = await supabase
      .from("technical_bulletins")
      .select("*")
      .order("created_at", { ascending: false });
    setBulletins((data as Bulletin[]) ?? []);
  };

  useEffect(() => { fetchBulletins(); }, []);

  const resetForm = () => {
    setTitle(""); setContent(""); setDetails(""); setActive(true);
    setValidFrom(new Date().toISOString().split("T")[0]); setValidUntil(""); setTargetModels("");
    setEditing(null);
  };

  const openNew = () => { resetForm(); setShowDialog(true); };

  const openEdit = (b: Bulletin) => {
    setEditing(b);
    setTitle(b.title);
    setContent(b.content);
    setDetails(b.details);
    setActive(b.active);
    setValidFrom(b.valid_from);
    setValidUntil(b.valid_until ?? "");
    setTargetModels((b.target_models ?? []).join(", "));
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) { toast.error("Título e conteúdo são obrigatórios."); return; }
    setSaving(true);
    const models = targetModels.split(",").map(s => s.trim()).filter(Boolean);
    const payload = {
      title: title.trim(),
      content: content.trim(),
      details: details.trim(),
      active,
      valid_from: validFrom,
      valid_until: validUntil || null,
      target_models: models,
    };

    if (editing) {
      const { error } = await (supabase as any).from("technical_bulletins").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar."); setSaving(false); return; }
      toast.success("Boletim atualizado!");
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Sessão expirada."); setSaving(false); return; }
      const { error } = await (supabase as any).from("technical_bulletins").insert({ ...payload, created_by: session.user.id });
      if (error) { toast.error("Erro ao criar."); setSaving(false); return; }
      toast.success("Boletim criado!");
    }
    setSaving(false);
    setShowDialog(false);
    resetForm();
    fetchBulletins();
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("technical_bulletins").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir."); return; }
    toast.success("Boletim excluído!");
    fetchBulletins();
  };

  const toggleActive = async (b: Bulletin) => {
    await (supabase as any).from("technical_bulletins").update({ active: !b.active }).eq("id", b.id);
    fetchBulletins();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Boletins Técnicos</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie dicas e informativos técnicos para os usuários</p>
        </div>
        <Button size="sm" className="gap-1" onClick={openNew}>
          <Plus className="w-4 h-4" /> Novo Boletim
        </Button>
      </div>

      <div className="space-y-3">
        {bulletins.length === 0 ? (
          <div className="gradient-card rounded-lg border border-border p-8 text-center">
            <Newspaper className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum boletim cadastrado.</p>
          </div>
        ) : bulletins.map(b => (
          <div key={b.id} className="gradient-card rounded-lg border border-border p-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-foreground truncate">{b.title}</h3>
                <StatusBadge status={b.active ? "ativo" : "inativo"} />
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1 mb-1">{b.content}</p>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>De: {new Date(b.valid_from).toLocaleDateString("pt-BR")}</span>
                {b.valid_until && <span>Até: {new Date(b.valid_until).toLocaleDateString("pt-BR")}</span>}
                {b.target_models && b.target_models.length > 0 && (
                  <span>Modelos: {b.target_models.join(", ")}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Switch checked={b.active} onCheckedChange={() => toggleActive(b)} />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(b)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(b.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={v => { if (!v) { setShowDialog(false); resetForm(); } else setShowDialog(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Boletim" : "Novo Boletim"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Título *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-accent border-border" placeholder="Ex: Dica de manutenção preventiva" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Texto curto *</Label>
              <Textarea value={content} onChange={e => setContent(e.target.value)} className="bg-accent border-border" rows={2} placeholder="Resumo exibido no card do dashboard" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Detalhes (expandido)</Label>
              <Textarea value={details} onChange={e => setDetails(e.target.value)} className="bg-accent border-border" rows={4} placeholder="Texto completo exibido ao clicar 'Ver detalhes'" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Válido de</Label>
                <Input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} className="bg-accent border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Válido até (opcional)</Label>
                <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="bg-accent border-border" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Modelos alvo (separados por vírgula, vazio = todos)</Label>
              <Input value={targetModels} onChange={e => setTargetModels(e.target.value)} className="bg-accent border-border" placeholder="Ex: Router CNC 1325, Laser 6090" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={active} onCheckedChange={setActive} />
              <Label className="text-xs">Ativo</Label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? "Salvando..." : editing ? "Atualizar" : "Criar"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setShowDialog(false); resetForm(); }}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BulletinsPage;
