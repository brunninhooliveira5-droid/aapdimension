import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Newspaper, X, Search } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

interface DimensionEquipment {
  id: string;
  name: string;
}

const BulletinsPage = () => {
  const { user } = useAuth();
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Bulletin | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Equipment list for target selection
  const [equipmentList, setEquipmentList] = useState<DimensionEquipment[]>([]);
  const [equipSearch, setEquipSearch] = useState("");

  // Form
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [details, setDetails] = useState("");
  const [active, setActive] = useState(true);
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split("T")[0]);
  const [validUntil, setValidUntil] = useState("");
  const [targetAll, setTargetAll] = useState(true);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  const fetchBulletins = async () => {
    const { data } = await supabase
      .from("technical_bulletins")
      .select("*")
      .order("created_at", { ascending: false });
    setBulletins((data as Bulletin[]) ?? []);
  };

  const fetchEquipment = async () => {
    const { data } = await (supabase as any)
      .from("dimension_equipment")
      .select("id, name")
      .eq("status", "ativo")
      .order("name", { ascending: true });
    setEquipmentList((data as DimensionEquipment[]) ?? []);
  };

  useEffect(() => { fetchBulletins(); fetchEquipment(); }, []);

  const resetForm = () => {
    setTitle(""); setContent(""); setDetails(""); setActive(true);
    setValidFrom(new Date().toISOString().split("T")[0]); setValidUntil("");
    setTargetAll(true); setSelectedModels([]); setEquipSearch("");
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
    const models = b.target_models ?? [];
    if (models.length === 0) {
      setTargetAll(true);
      setSelectedModels([]);
    } else {
      setTargetAll(false);
      setSelectedModels(models);
    }
    setEquipSearch("");
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) { toast.error("Título e conteúdo são obrigatórios."); return; }
    setSaving(true);
    const models = targetAll ? [] : selectedModels;
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
    setDeleteConfirmId(null);
    fetchBulletins();
  };

  const toggleActive = async (b: Bulletin) => {
    await (supabase as any).from("technical_bulletins").update({ active: !b.active }).eq("id", b.id);
    fetchBulletins();
  };

  const toggleModel = (name: string) => {
    setSelectedModels(prev =>
      prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name]
    );
  };

  const filteredEquipment = equipmentList.filter(e =>
    e.name.toLowerCase().includes(equipSearch.toLowerCase())
  );

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
                <span>
                  {(!b.target_models || b.target_models.length === 0)
                    ? "Todos os equipamentos"
                    : `Modelos: ${b.target_models.join(", ")}`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Switch checked={b.active} onCheckedChange={() => toggleActive(b)} />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(b)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirmId(b.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) { setShowDialog(false); resetForm(); } else setShowDialog(true); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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

            {/* Target Models Selection */}
            <div className="space-y-2">
              <Label className="text-xs">Destinatários</Label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setTargetAll(true); setSelectedModels([]); }}
                  className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${targetAll ? "bg-primary text-primary-foreground border-primary" : "bg-accent border-border text-muted-foreground hover:text-foreground"}`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setTargetAll(false)}
                  className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${!targetAll ? "bg-primary text-primary-foreground border-primary" : "bg-accent border-border text-muted-foreground hover:text-foreground"}`}
                >
                  Por equipamento
                </button>
              </div>

              {!targetAll && (
                <div className="space-y-2 mt-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      value={equipSearch}
                      onChange={e => setEquipSearch(e.target.value)}
                      placeholder="Buscar equipamento..."
                      className="bg-accent border-border pl-8 h-8 text-xs"
                    />
                  </div>

                  {/* Selected chips */}
                  {selectedModels.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedModels.map(model => (
                        <span key={model} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-primary/15 text-primary font-medium">
                          {model}
                          <button type="button" onClick={() => toggleModel(model)} className="hover:text-destructive">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Equipment list */}
                  <div className="max-h-32 overflow-y-auto border border-border rounded-md bg-accent/50">
                    {filteredEquipment.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground p-2 text-center">Nenhum equipamento encontrado</p>
                    ) : filteredEquipment.map(eq => (
                      <button
                        key={eq.id}
                        type="button"
                        onClick={() => toggleModel(eq.name)}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors flex items-center justify-between ${selectedModels.includes(eq.name) ? "text-primary font-medium" : "text-foreground"}`}
                      >
                        <span>{eq.name}</span>
                        {selectedModels.includes(eq.name) && <span className="text-[10px] text-primary">✓</span>}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Usuários com estes equipamentos cadastrados receberão o boletim.
                  </p>
                </div>
              )}
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este boletim? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BulletinsPage;
