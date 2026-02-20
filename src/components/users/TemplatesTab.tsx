import { useState, useEffect } from "react";
import { BookmarkCheck, Pencil, Trash2, Star, Eye, EyeOff, Lock, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Visibility = "visible" | "locked" | "hidden";

interface AccessTemplate {
  id: string;
  name: string;
  sections: Record<string, string>;
  pro_access: boolean;
  created_at: string;
}

const SECTION_LABELS: Record<string, string> = {
  home: "Home",
  maquinas: "Minhas Máquinas",
  suporte: "Suporte",
  manutencao: "Manutenção",
  equipamentos: "Equipamentos Dimension",
  pecas: "Peças e Acessórios",
  financeiro: "Faturas",
  configuracoes: "Configurações",
  boletins: "Boletins Técnicos",
  arquivos: "Arquivos",
  orcamento: "Orçamento de Corte",
  gestao_financeira: "Gerenciador Financeiro",
  propostas: "Propostas",
  usuarios: "Usuários",
  orcamento_pdf: "Exportar PDF",
  orcamento_salvos: "Aba Salvos",
  assistente_preco: "Assistente de Preço",
};

const visibilityConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  visible: { label: "Visível", color: "bg-success/15 text-success border-success/30", icon: Eye },
  locked: { label: "Bloqueado", color: "bg-warning/15 text-warning border-warning/30", icon: Lock },
  hidden: { label: "Oculto", color: "bg-destructive/15 text-destructive border-destructive/30", icon: EyeOff },
};

export function TemplatesTab() {
  const [templates, setTemplates] = useState<AccessTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTemplate, setEditTemplate] = useState<AccessTemplate | null>(null);
  const [editName, setEditName] = useState("");
  const [editProAccess, setEditProAccess] = useState(false);
  const [editSections, setEditSections] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase.from("access_templates" as any).select("*").order("name");
    setTemplates(
      (data as any[] ?? []).map((t: any) => ({
        id: t.id,
        name: t.name,
        sections: t.sections ?? {},
        pro_access: t.pro_access ?? false,
        created_at: t.created_at,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openEdit = (tpl: AccessTemplate) => {
    setEditTemplate(tpl);
    setEditName(tpl.name);
    setEditProAccess(tpl.pro_access);
    setEditSections({ ...tpl.sections });
  };

  const handleSave = async () => {
    if (!editTemplate || !editName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("access_templates" as any)
      .update({ name: editName.trim(), pro_access: editProAccess, sections: editSections } as any)
      .eq("id", editTemplate.id);

    if (error) {
      toast.error("Erro ao salvar template.");
    } else {
      toast.success("Template atualizado com sucesso!");
      setEditTemplate(null);
      fetchTemplates();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("access_templates" as any).delete().eq("id", id);
    toast.success("Template excluído.");
    setDeleteConfirm(null);
    fetchTemplates();
  };

  const setSectionVisibility = (key: string, value: Visibility) => {
    setEditSections((prev) => ({ ...prev, [key]: value }));
  };

  const sectionKeys = Object.keys(SECTION_LABELS);

  return (
    <div className="space-y-4">
      <div className="gradient-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-2 mb-1">
          <BookmarkCheck className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Templates de Acesso</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Templates salvos a partir da página de controle de acesso dos usuários. Edite ou exclua conforme necessário.
        </p>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground text-sm py-8">Carregando templates...</div>
      ) : templates.length === 0 ? (
        <div className="gradient-card rounded-lg border border-border p-8 text-center">
          <BookmarkCheck className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum template salvo. Crie templates na página de controle de acesso de um usuário.
          </p>
        </div>
      ) : (
        <div className="gradient-card rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs uppercase">Nome</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase">Plano PRO</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase">Seções Configuradas</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase">Criado em</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((tpl) => {
                const sectionEntries = Object.entries(tpl.sections);
                const lockedCount = sectionEntries.filter(([, v]) => v === "locked").length;
                const hiddenCount = sectionEntries.filter(([, v]) => v === "hidden").length;

                return (
                  <TableRow key={tpl.id} className="border-border">
                    <TableCell className="text-foreground font-medium text-sm">
                      <div className="flex items-center gap-2">
                        <BookmarkCheck className="w-4 h-4 text-primary" />
                        {tpl.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {tpl.pro_access ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/30">
                          <Star className="w-2.5 h-2.5 fill-primary" />PRO
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          FREE
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">{sectionEntries.length} seções</span>
                        {lockedCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning border border-warning/30">
                            <Lock className="w-2.5 h-2.5" />{lockedCount}
                          </span>
                        )}
                        {hiddenCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-medium text-destructive border border-destructive/30">
                            <EyeOff className="w-2.5 h-2.5" />{hiddenCount}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(tpl.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Editar" onClick={() => openEdit(tpl)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Excluir" onClick={() => setDeleteConfirm(tpl.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Template Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={(open) => !open && setEditTemplate(null)}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />
              Editar Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Nome do Template</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-accent border-border" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Acesso PRO</span>
              </div>
              <Switch checked={editProAccess} onCheckedChange={setEditProAccess} />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground text-xs uppercase tracking-wider">Visibilidade das Seções</Label>
              <div className="space-y-1.5">
                {sectionKeys.map((key) => {
                  const current = (editSections[key] as Visibility) || "visible";
                  const cfg = visibilityConfig[current];
                  return (
                    <div key={key} className="flex items-center justify-between p-2 rounded-md border border-border">
                      <span className="text-sm text-foreground">{SECTION_LABELS[key]}</span>
                      <Select value={current} onValueChange={(v) => setSectionVisibility(key, v as Visibility)}>
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(visibilityConfig).map(([val, c]) => (
                            <SelectItem key={val} value={val}>
                              <span className="flex items-center gap-1.5">
                                <c.icon className="w-3 h-3" />
                                {c.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-border">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving || !editName.trim()} className="gap-1.5">
              <Save className="w-3.5 h-3.5" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Excluir Template</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-border">Cancelar</Button>
            </DialogClose>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
