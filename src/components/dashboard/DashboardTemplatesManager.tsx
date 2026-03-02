import { useState, useEffect, useMemo } from "react";
import {
  LayoutTemplate, Plus, Pencil, Trash2, Copy, Lock, LockOpen,
  Save, X, Search, Eye, EyeOff, GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ALL_WIDGETS, DashboardCardItem } from "@/hooks/useDashboardLayout";
import { MENU_REGISTRY, flattenRegistry, type MenuRegistryItem } from "@/data/menuRegistry";
import { roleLabels, type UserRole } from "@/contexts/AuthContext";

interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  is_locked: boolean;
  allowed_roles: string[];
  layout: DashboardCardItem[];
  created_at: string;
}

const ALL_ROLES: UserRole[] = ["admin_master", "admin", "operador", "financeiro", "servico", "usuario_interno"];

export function DashboardTemplatesManager() {
  const [templates, setTemplates] = useState<DashboardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editLocked, setEditLocked] = useState(false);
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [editLayout, setEditLayout] = useState<DashboardCardItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [libTab, setLibTab] = useState("widgets");

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("dashboard_templates" as any)
      .select("*")
      .order("name");
    setTemplates(
      (data as any[] ?? []).map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description ?? "",
        is_active: t.is_active,
        is_locked: t.is_locked,
        allowed_roles: t.allowed_roles ?? [],
        layout: (t.layout as DashboardCardItem[]) ?? [],
        created_at: t.created_at,
      }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openNew = () => {
    setEditId(null);
    setEditName("");
    setEditDesc("");
    setEditLocked(false);
    setEditRoles([]);
    setEditLayout(ALL_WIDGETS.map((w, i) => ({
      id: `w_${w.key}`, type: "widget" as const, key: w.key,
      title: w.label, visible: true, order: i,
    })));
    setSearch("");
    setEditOpen(true);
  };

  const openEdit = (tpl: DashboardTemplate) => {
    setEditId(tpl.id);
    setEditName(tpl.name);
    setEditDesc(tpl.description);
    setEditLocked(tpl.is_locked);
    setEditRoles([...tpl.allowed_roles]);
    setEditLayout([...tpl.layout]);
    setSearch("");
    setEditOpen(true);
  };

  const duplicate = (tpl: DashboardTemplate) => {
    setEditId(null);
    setEditName(`${tpl.name} (cópia)`);
    setEditDesc(tpl.description);
    setEditLocked(tpl.is_locked);
    setEditRoles([...tpl.allowed_roles]);
    setEditLayout([...tpl.layout]);
    setSearch("");
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    const userId = (await supabase.auth.getSession()).data.session?.user?.id;
    const payload = {
      name: editName.trim(),
      description: editDesc.trim(),
      is_locked: editLocked,
      allowed_roles: editRoles,
      layout: editLayout.map((c, i) => ({ ...c, order: i })),
      created_by: userId,
    };

    if (editId) {
      const { name, description, is_locked, allowed_roles, layout } = payload;
      const { error } = await supabase
        .from("dashboard_templates" as any)
        .update({ name, description, is_locked, allowed_roles, layout } as any)
        .eq("id", editId);
      if (error) toast.error("Erro ao salvar template");
      else toast.success("Template atualizado!");
    } else {
      const { error } = await supabase
        .from("dashboard_templates" as any)
        .insert(payload as any);
      if (error) toast.error("Erro ao criar template");
      else toast.success("Template criado!");
    }
    setSaving(false);
    setEditOpen(false);
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("dashboard_templates" as any).update({ is_active: false } as any).eq("id", id);
    toast.success("Template desativado.");
    setDeleteConfirm(null);
    fetchTemplates();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("dashboard_templates" as any).update({ is_active: !current } as any).eq("id", id);
    toast.success(current ? "Template desativado" : "Template ativado");
    fetchTemplates();
  };

  // Layout editor helpers
  const toggleCardVisible = (key: string) => {
    setEditLayout(prev => prev.map(c => c.key === key ? { ...c, visible: !c.visible } : c));
  };

  const removeCard = (key: string) => {
    setEditLayout(prev => prev.filter(c => c.key !== key));
  };

  const unusedWidgets = useMemo(() => {
    const keys = new Set(editLayout.map(c => c.key));
    return ALL_WIDGETS.filter(w => !keys.has(w.key));
  }, [editLayout]);

  const addWidget = (key: string) => {
    const def = ALL_WIDGETS.find(w => w.key === key);
    if (!def) return;
    setEditLayout(prev => [...prev, {
      id: `w_${key}`, type: "widget" as const, key,
      title: def.label, visible: true, order: prev.length,
    }]);
  };

  const availableShortcuts = useMemo(() => {
    const keys = new Set(editLayout.map(c => c.key));
    const result: { parent: MenuRegistryItem; children: MenuRegistryItem[] }[] = [];
    for (const item of MENU_REGISTRY) {
      if (item.id === "nav_home") continue;
      const children = (item.children ?? []).filter(c => !keys.has(c.id));
      if (!keys.has(item.id) || children.length > 0) {
        result.push({ parent: item, children });
      }
    }
    return result;
  }, [editLayout]);

  const addShortcut = (entry: MenuRegistryItem) => {
    if (editLayout.some(c => c.key === entry.id)) return;
    setEditLayout(prev => [...prev, {
      id: `s_${entry.id}`, type: "shortcut" as const, key: entry.id,
      title: entry.label, visible: true, order: prev.length,
      targetRoute: entry.route,
    }]);
  };

  const toggleRole = (role: string) => {
    setEditRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const filteredWidgets = search
    ? unusedWidgets.filter(w => w.label.toLowerCase().includes(search.toLowerCase()))
    : unusedWidgets;

  const filteredShortcuts = search
    ? availableShortcuts.map(g => ({
        parent: g.parent,
        children: g.children.filter(c => c.label.toLowerCase().includes(search.toLowerCase())),
      })).filter(g => g.parent.label.toLowerCase().includes(search.toLowerCase()) || g.children.length > 0)
    : availableShortcuts;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Templates de Dashboard</h3>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Novo Template
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Crie dashboards pré-prontos que os usuários podem aplicar com 1 clique na Home.
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
      ) : templates.length === 0 ? (
        <div className="gradient-card rounded-lg border border-border p-8 text-center">
          <LayoutTemplate className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum template criado ainda.</p>
        </div>
      ) : (
        <div className="gradient-card rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs uppercase">Nome</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase">Status</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase">Bloqueado</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase">Cards</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map(tpl => (
                <TableRow key={tpl.id} className="border-border">
                  <TableCell className="font-medium text-sm text-foreground">
                    <div>
                      {tpl.name}
                      {tpl.description && <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{tpl.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={tpl.is_active ? "default" : "secondary"} className="text-[10px]">
                      {tpl.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {tpl.is_locked ? <Lock className="w-3.5 h-3.5 text-warning" /> : <LockOpen className="w-3.5 h-3.5 text-muted-foreground" />}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {tpl.layout.filter(c => c.visible).length} visíveis
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => openEdit(tpl)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicar" onClick={() => duplicate(tpl)}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title={tpl.is_active ? "Desativar" : "Ativar"} onClick={() => toggleActive(tpl.id, tpl.is_active)}>
                        {tpl.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Excluir" onClick={() => setDeleteConfirm(tpl.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="flex items-center gap-2 text-base">
              <LayoutTemplate className="w-4 h-4 text-primary" />
              {editId ? "Editar Template" : "Novo Template"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
            {/* Basic info */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome</Label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Ex: Dashboard Operador" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descrição</Label>
                <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Opcional" className="text-sm min-h-[60px]" />
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-md border border-border">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-warning" />
                  <span className="text-xs font-medium text-foreground">Layout bloqueado (usuário não pode editar)</span>
                </div>
                <Switch checked={editLocked} onCheckedChange={setEditLocked} className="scale-90" />
              </div>
            </div>

            {/* Allowed roles */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Perfis permitidos (vazio = todos)</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_ROLES.map(role => (
                  <label key={role} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox checked={editRoles.includes(role)} onCheckedChange={() => toggleRole(role)} />
                    {roleLabels[role]}
                  </label>
                ))}
              </div>
            </div>

            {/* Layout cards */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Cards do template</Label>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {editLayout.map(card => (
                  <div key={card.key} className={`flex items-center gap-2 p-2 rounded-md border text-xs ${card.visible ? "bg-primary/5 border-primary/20" : "bg-card border-border"}`}>
                    <span className="flex-1 truncate text-foreground">{card.title}</span>
                    <Badge variant="outline" className="text-[9px]">{card.type === "widget" ? "Widget" : "Atalho"}</Badge>
                    <Switch checked={card.visible} onCheckedChange={() => toggleCardVisible(card.key)} className="scale-75" />
                    <button onClick={() => removeCard(card.key)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add cards library */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Adicionar cards</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-7 h-7 text-xs" />
              </div>
              <Tabs value={libTab} onValueChange={setLibTab}>
                <TabsList className="mb-1.5">
                  <TabsTrigger value="widgets" className="text-[11px] h-6 px-2.5">Widgets</TabsTrigger>
                  <TabsTrigger value="shortcuts" className="text-[11px] h-6 px-2.5">Atalhos</TabsTrigger>
                </TabsList>
                <TabsContent value="widgets">
                  {filteredWidgets.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground py-1">Todos adicionados.</p>
                  ) : (
                    <div className="space-y-1 max-h-[120px] overflow-y-auto">
                      {filteredWidgets.map(w => (
                        <button key={w.key} onClick={() => addWidget(w.key)} className="flex items-center gap-2 w-full p-1.5 rounded border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 text-left text-xs">
                          <Plus className="w-3 h-3 text-primary shrink-0" />
                          {w.label}
                        </button>
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="shortcuts">
                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                    {filteredShortcuts.map(g => {
                      const parentAdded = editLayout.some(c => c.key === g.parent.id);
                      return (
                        <div key={g.parent.id}>
                          {!parentAdded && (
                            <button onClick={() => addShortcut(g.parent)} className="flex items-center gap-2 w-full p-1.5 rounded border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 text-left text-xs">
                              <Plus className="w-3 h-3 text-primary shrink-0" />
                              {g.parent.label}
                            </button>
                          )}
                          {g.children.length > 0 && (
                            <div className="ml-4 mt-0.5 space-y-0.5">
                              {g.children.map(c => (
                                <button key={c.id} onClick={() => addShortcut(c)} className="flex items-center gap-2 w-full p-1 rounded border border-dashed border-border/60 hover:border-primary/30 hover:bg-primary/5 text-left text-[11px]">
                                  <Plus className="w-2.5 h-2.5 text-primary shrink-0" />
                                  {c.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <DialogFooter className="px-5 py-3 border-t border-border gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>
              <X className="w-3.5 h-3.5 mr-1" /> Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !editName.trim()}>
              <Save className="w-3.5 h-3.5 mr-1" /> {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={open => !open && setDeleteConfirm(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle className="text-foreground">Desativar Template</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">O template será desativado e não ficará mais disponível para novos usuários. Dashboards já aplicados não serão afetados.</p>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" className="border-border">Cancelar</Button></DialogClose>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Desativar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
