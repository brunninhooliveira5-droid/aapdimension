import { useState, useEffect, useRef } from "react";
import { FileText, Youtube, ClipboardList, Plus, Trash2, ExternalLink, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface EquipmentFile {
  id: string;
  file_type: string;
  title: string;
  description: string;
  file_path: string | null;
  file_url: string | null;
  created_at: string;
}

interface Props {
  equipmentId: string;
}

const fileTypeConfig = {
  pdf: { icon: FileText, label: "PDF", color: "text-red-500" },
  youtube: { icon: Youtube, label: "YouTube", color: "text-red-600" },
  tech_spec: { icon: ClipboardList, label: "Ficha Técnica", color: "text-primary" },
};

export const EquipmentFilesSection = ({ equipmentId }: Props) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin_master";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<EquipmentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const [formType, setFormType] = useState<string>("pdf");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("registered_equipment_files")
      .select("*")
      .eq("equipment_id", equipmentId)
      .order("created_at", { ascending: true });
    setFiles(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchFiles(); }, [equipmentId]);

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("machine-files").getPublicUrl(path);
    return data.publicUrl;
  };

  const resetForm = () => {
    setFormType("pdf");
    setFormTitle("");
    setFormDescription("");
    setFormUrl("");
    setFormFile(null);
  };

  const handleAdd = async () => {
    if (!formTitle.trim()) {
      toast.error("Informe o título.");
      return;
    }

    setSaving(true);
    let filePath: string | null = null;
    let fileUrl: string | null = formUrl || null;

    if (formType === "pdf" && formFile) {
      const path = `equipment-files/${equipmentId}/${Date.now()}_${formFile.name}`;
      const { error: uploadErr } = await supabase.storage.from("machine-files").upload(path, formFile);
      if (uploadErr) {
        toast.error("Erro ao enviar arquivo: " + uploadErr.message);
        setSaving(false);
        return;
      }
      filePath = path;
      fileUrl = getPublicUrl(path);
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();

    const { error } = await (supabase as any).from("registered_equipment_files").insert({
      equipment_id: equipmentId,
      file_type: formType,
      title: formTitle,
      description: formDescription,
      file_path: filePath,
      file_url: fileUrl,
      created_by: authUser?.id,
    });

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Adicionado com sucesso!");
      setShowAddDialog(false);
      resetForm();
      fetchFiles();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("registered_equipment_files").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success("Removido!");
      fetchFiles();
    }
  };

  const handleOpenFile = (file: EquipmentFile) => {
    const url = file.file_url || (file.file_path ? getPublicUrl(file.file_path) : null);
    if (url) window.open(url, "_blank");
  };

  const grouped = {
    pdf: files.filter(f => f.file_type === "pdf"),
    youtube: files.filter(f => f.file_type === "youtube"),
    tech_spec: files.filter(f => f.file_type === "tech_spec"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Documentos & Mídia</h2>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Adicionar
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : files.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum documento adicionado ainda.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(["pdf", "youtube", "tech_spec"] as const).map(type => {
            const items = grouped[type];
            if (items.length === 0) return null;
            const config = fileTypeConfig[type];
            const Icon = config.icon;

            return (
              <div key={type} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <h3 className="text-sm font-medium text-foreground">{config.label}</h3>
                  <span className="text-xs text-muted-foreground">({items.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map(file => (
                    <div
                      key={file.id}
                      className="gradient-card rounded-lg border border-border p-4 hover:border-primary/30 transition-colors cursor-pointer group"
                      onClick={() => handleOpenFile(file)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 min-w-0">
                          <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${config.color}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{file.title}</p>
                            {file.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{file.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Adicionar Documento / Mídia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-foreground">Tipo *</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="bg-accent border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="youtube">Link YouTube</SelectItem>
                  <SelectItem value="tech_spec">Ficha Técnica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Título *</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Ex: Manual de operação" className="bg-accent border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Descrição</Label>
              <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Descrição opcional..." className="bg-accent border-border resize-none" rows={2} />
            </div>

            {formType === "pdf" && (
              <div className="space-y-2">
                <Label className="text-foreground">Arquivo PDF</Label>
                <div
                  className="h-20 rounded-lg border-2 border-dashed border-border bg-accent/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {formFile ? (
                    <p className="text-sm text-foreground truncate px-4">{formFile.name}</p>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Upload className="w-4 h-4" />
                      <span className="text-xs">Clique para selecionar PDF</span>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={e => setFormFile(e.target.files?.[0] ?? null)} />
              </div>
            )}

            {(formType === "youtube" || formType === "tech_spec") && (
              <div className="space-y-2">
                <Label className="text-foreground">{formType === "youtube" ? "Link do YouTube *" : "Link (opcional)"}</Label>
                <Input value={formUrl} onChange={e => setFormUrl(e.target.value)} placeholder={formType === "youtube" ? "https://youtube.com/watch?v=..." : "https://..."} className="bg-accent border-border" />
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-border">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
