import { useState, useEffect, useRef } from "react";
import { Plus, Pencil, Trash2, Package, FileText, Upload, CircleDot, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Equipment {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  category: string;
  pdf_url: string | null;
  pdf_admin_url: string | null;
  status: string;
}

const EquipmentCatalog = () => {
  const { user } = useAuth();
  const isAdminMaster = user?.role === "admin_master";

  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState<string>("maquina");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const [adminPdfFile, setAdminPdfFile] = useState<File | null>(null);
  const [adminPdfName, setAdminPdfName] = useState<string | null>(null);
  const adminPdfRef = useRef<HTMLInputElement>(null);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("dimension_equipment")
      .select("id, name, description, image_url, category, pdf_url, pdf_admin_url, status")
      .order("created_at", { ascending: true });
    setItems((data as Equipment[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const resetForm = () => {
    setFormName(""); setFormDesc(""); setFormCategory("maquina");
    setImageFile(null); setImagePreview(null);
    setPdfFile(null); setPdfName(null);
    setAdminPdfFile(null); setAdminPdfName(null);
    setEditing(null);
  };

  const openAdd = () => { resetForm(); setShowDialog(true); };

  const openEdit = (item: Equipment) => {
    setEditing(item);
    setFormName(item.name);
    setFormDesc(item.description ?? "");
    setFormCategory(item.category ?? "maquina");
    setImagePreview(item.image_url); setImageFile(null);
    setPdfName(item.pdf_url ? "PDF anexado" : null); setPdfFile(null);
    setAdminPdfName(item.pdf_admin_url ? "PDF Admin anexado" : null); setAdminPdfFile(null);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error("Preencha o nome."); return; }

    let imageUrl: string | null = editing?.image_url ?? null;
    let pdfUrl: string | null = editing?.pdf_url ?? null;
    let pdfAdminUrl: string | null = editing?.pdf_admin_url ?? null;

    if (imageFile) {
      const path = `catalog/${Date.now()}_${imageFile.name}`;
      const { error: upErr } = await supabase.storage.from("machine-files").upload(path, imageFile);
      if (upErr) { toast.error("Erro ao enviar imagem."); return; }
      const { data: pubData } = supabase.storage.from("machine-files").getPublicUrl(path);
      imageUrl = pubData.publicUrl;
    }

    if (pdfFile) {
      const path = `catalog/pdf/${Date.now()}_${pdfFile.name}`;
      const { error: upErr } = await supabase.storage.from("machine-files").upload(path, pdfFile);
      if (upErr) { toast.error("Erro ao enviar PDF."); return; }
      const { data: pubData } = supabase.storage.from("machine-files").getPublicUrl(path);
      pdfUrl = pubData.publicUrl;
    }

    if (adminPdfFile) {
      const path = `catalog/pdf-admin/${Date.now()}_${adminPdfFile.name}`;
      const { error: upErr } = await supabase.storage.from("machine-files").upload(path, adminPdfFile);
      if (upErr) { toast.error("Erro ao enviar PDF Admin."); return; }
      const { data: pubData } = supabase.storage.from("machine-files").getPublicUrl(path);
      pdfAdminUrl = pubData.publicUrl;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const payload = { name: formName.trim(), description: formDesc.trim(), image_url: imageUrl, category: formCategory, pdf_url: pdfUrl, pdf_admin_url: pdfAdminUrl };

    if (editing) {
      const { error } = await (supabase as any).from("dimension_equipment").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar: " + error.message); return; }
      toast.success("Equipamento atualizado!");
    } else {
      const { error } = await (supabase as any).from("dimension_equipment").insert({ ...payload, created_by: session.user.id });
      if (error) { toast.error("Erro ao adicionar: " + error.message); return; }
      toast.success("Equipamento adicionado!");
    }

    setShowDialog(false); resetForm(); fetchItems();
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("dimension_equipment").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir: " + error.message); return; }
    toast.success("Equipamento excluído!"); setDeleteConfirmId(null); fetchItems();
  };

  const handleToggleStatus = async (item: Equipment) => {
    const newStatus = item.status === "ativo" ? "fora_de_linha" : "ativo";
    const { error } = await (supabase as any).from("dimension_equipment").update({ status: newStatus }).eq("id", item.id);
    if (error) { toast.error("Erro ao alterar status."); return; }
    toast.success(newStatus === "ativo" ? "Equipamento ativado!" : "Equipamento marcado como fora de linha!");
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
            <Plus className="w-4 h-4" /> Cadastrar Equipamento
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map(item => (
            <div key={item.id} className="gradient-card rounded-lg border border-border overflow-hidden group">
              <div className="h-32 bg-accent/50 flex items-center justify-center overflow-hidden">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-10 h-10 text-muted-foreground/30" />
                )}
              </div>
              <div className="p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                  {isAdminMaster && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" onClick={() => openEdit(item)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirmId(item.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground font-medium uppercase tracking-wider">
                    {item.category === "acessorio" ? "Acessório" : "Máquina"}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider flex items-center gap-0.5 ${item.status === "fora_de_linha" ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"}`}>
                    <CircleDot className="w-2.5 h-2.5" />
                    {item.status === "fora_de_linha" ? "Fora de Linha" : "Ativo"}
                  </span>
                  {item.pdf_url && (
                    <a href={item.pdf_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium flex items-center gap-0.5">
                      <FileText className="w-3 h-3" /> PDF
                    </a>
                  )}
                  {isAdminMaster && item.pdf_admin_url && (
                    <a href={item.pdf_admin_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] px-1.5 py-0.5 rounded bg-warning/15 text-warning font-medium flex items-center gap-0.5">
                      <FileText className="w-3 h-3" /> PDF Admin
                    </a>
                  )}
                </div>
                {isAdminMaster && (
                  <div className="flex items-center gap-2 mt-1">
                    <Switch
                      checked={item.status === "ativo"}
                      onCheckedChange={() => handleToggleStatus(item)}
                      className="scale-75 origin-left"
                    />
                    <span className="text-[10px] text-muted-foreground">{item.status === "ativo" ? "Ativo" : "Fora de Linha"}</span>
                  </div>
                )}
                {item.description && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Catalog Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { setShowDialog(v); if (!v) resetForm(); }}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editing ? "Editar Equipamento" : "Cadastrar Equipamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-foreground">Foto</Label>
              <div
                className="relative h-32 rounded-lg border-2 border-dashed border-border bg-accent/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
                onClick={() => imageRef.current?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImagePlus className="w-6 h-6" />
                    <span className="text-xs">Clique para selecionar</span>
                  </div>
                )}
              </div>
              <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); } }} />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Categoria *</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger className="bg-accent border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="maquina">Máquina</SelectItem>
                  <SelectItem value="acessorio">Acessório</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Nome do Equipamento *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex: Spindle 3.5kW" className="bg-accent border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Especificação Técnica</Label>
              <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Descreva as especificações técnicas do equipamento" className="bg-accent border-border min-h-[80px]" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">PDF do Produto</Label>
              <div
                className="relative h-16 rounded-lg border-2 border-dashed border-border bg-accent/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => pdfRef.current?.click()}
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Upload className="w-5 h-5" />
                  <span className="text-xs">{pdfFile?.name ?? pdfName ?? "Clique para enviar PDF"}</span>
                </div>
              </div>
              <input ref={pdfRef} type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setPdfFile(f); setPdfName(f.name); } }} />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">PDF Exclusivo Admin Master</Label>
              <div
                className="relative h-16 rounded-lg border-2 border-dashed border-warning/40 bg-warning/5 flex items-center justify-center cursor-pointer hover:border-warning/60 transition-colors"
                onClick={() => adminPdfRef.current?.click()}
              >
                <div className="flex items-center gap-2 text-warning">
                  <Upload className="w-5 h-5" />
                  <span className="text-xs">{adminPdfFile?.name ?? adminPdfName ?? "Clique para enviar PDF (Admin)"}</span>
                </div>
              </div>
              <input ref={adminPdfRef} type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setAdminPdfFile(f); setAdminPdfName(f.name); } }} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-border">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSave}>{editing ? "Atualizar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este equipamento? Esta ação não pode ser desfeita.
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

export default EquipmentCatalog;
