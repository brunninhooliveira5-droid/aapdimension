import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, ShieldCheck, CheckCircle, XCircle, Clock, Phone, Eye, Star, Settings2, SlidersHorizontal, BookmarkCheck, Trash2, KeyRound, UserCheck, ArrowUpDown, Activity, MessageSquare } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type UserRole, roleLabels } from "@/contexts/AuthContext";
import { ProPlanManager } from "@/components/users/ProPlanManager";
import { SuggestionsTab } from "@/components/users/SuggestionsTab";
import { TemplatesTab } from "@/components/users/TemplatesTab";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useAuth } from "@/contexts/AuthContext";

interface AccessTemplate {
  id: string;
  name: string;
  sections: Record<string, string>;
  pro_access: boolean;
}

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  company: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  role: UserRole;
  approved: boolean;
  rejected: boolean;
  hasCustomAccess: boolean;
  login_count: number;
  last_login_at: string | null;
  appliedTemplateName: string | null;
}

const assignableRoles: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "operador", label: "Operador" },
  { value: "financeiro", label: "Financeiro" },
  { value: "servico", label: "Serviço" },
];

const UsersPage = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const navigate = useNavigate();
  const { startImpersonation } = useImpersonation();
  const { loadImpersonatedProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("operador");

  // Template & multi-select state
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [templates, setTemplates] = useState<AccessTemplate[]>([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [roleFilter, setRoleFilter] = useState("todos");
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<ManagedUser | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [sortField, setSortField] = useState<"name" | "last_login" | "login_count">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [activityFilter, setActivityFilter] = useState<"todos" | "nunca" | "30" | "60" | "90">("todos");

  const fetchUsers = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: accessRows }, { data: activityRows }, { data: templatesList }] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("user_section_access" as any).select("user_id, sections, applied_template_id"),
      supabase.from("user_activity" as any).select("user_id, login_count, last_login_at"),
      supabase.from("access_templates" as any).select("id, name"),
    ]);

    const roleMap = new Map(roles?.map(r => [r.user_id, r.role as UserRole]) ?? []);
    const accessMap = new Set<string>();
    const templateMap = new Map<string, string>(); // user_id -> template name
    const tplNameMap = new Map<string, string>(); // template_id -> name
    (templatesList as any[] ?? []).forEach((t: any) => tplNameMap.set(t.id, t.name));
    (accessRows as any[] ?? []).forEach((row: any) => {
      const sections = row.sections ?? {};
      const hasCustom = Object.values(sections).some((v: any) => v !== "visible");
      if (hasCustom) accessMap.add(row.user_id);
      if (row.applied_template_id && tplNameMap.has(row.applied_template_id)) {
        templateMap.set(row.user_id, tplNameMap.get(row.applied_template_id)!);
      }
    });

    const activityMap = new Map<string, { login_count: number; last_login_at: string | null }>();
    (activityRows as any[] ?? []).forEach((row: any) => {
      activityMap.set(row.user_id, { login_count: row.login_count ?? 0, last_login_at: row.last_login_at ?? null });
    });

    const mapped: ManagedUser[] = (profiles ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      company: p.company ?? "",
      address: p.address ?? "",
      city: p.city ?? "",
      state: p.state ?? "",
      zip_code: p.zip_code ?? "",
      phone: p.phone ?? "",
      role: roleMap.get(p.id) ?? "operador",
      approved: p.approved ?? false,
      rejected: p.rejected ?? false,
      hasCustomAccess: accessMap.has(p.id),
      login_count: activityMap.get(p.id)?.login_count ?? 0,
      last_login_at: activityMap.get(p.id)?.last_login_at ?? null,
      appliedTemplateName: templateMap.get(p.id) ?? null,
    }));

    setUsers(mapped);
    setLoading(false);
  };

  const fetchTemplates = async () => {
    const { data } = await supabase.from("access_templates" as any).select("*").order("name");
    setTemplates((data as any[] ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
      sections: t.sections ?? {},
      pro_access: t.pro_access ?? false,
    })));
  };

  useEffect(() => {
    fetchUsers();
    fetchTemplates();
  }, []);

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleAllApproved = () => {
    const nonAdminApproved = approvedUsers.filter(u => u.role !== "admin_master");
    if (selectedUserIds.size === nonAdminApproved.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(nonAdminApproved.map(u => u.id)));
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplateId || selectedUserIds.size === 0) return;
    const tpl = templates.find(t => t.id === selectedTemplateId);
    if (!tpl) return;
    setApplyingTemplate(true);

    try {
      // For each selected user, upsert section_access and optionally pro plan
      for (const uid of selectedUserIds) {
        // Check if user already has access row
        const { data: existing } = await supabase
          .from("user_section_access" as any)
          .select("id")
          .eq("user_id", uid)
          .single();

        if (existing) {
          await supabase
            .from("user_section_access" as any)
            .update({ sections: tpl.sections, applied_template_id: tpl.id } as any)
            .eq("user_id", uid);
        } else {
          await supabase
            .from("user_section_access" as any)
            .insert({ user_id: uid, sections: tpl.sections, applied_template_id: tpl.id } as any);
        }

        // Update PRO access
        const { data: planRow } = await supabase
          .from("user_plans")
          .select("id")
          .eq("user_id", uid)
          .single();

        const proFeatures = tpl.pro_access ? ["gestao_financeira", "orcamento"] : [];
        const planPayload = {
          pro_access: tpl.pro_access,
          plan: tpl.pro_access ? "pro" : "free",
          features_enabled: proFeatures,
          max_quotes_per_month: tpl.pro_access ? -1 : 5,
          max_financial_entries: tpl.pro_access ? -1 : 0,
          ...(tpl.pro_access ? { pro_activated_at: new Date().toISOString() } : { pro_activated_at: null }),
        };

        if (planRow) {
          await supabase.from("user_plans").update(planPayload as any).eq("user_id", uid);
        } else {
          await supabase.from("user_plans").insert({ user_id: uid, ...planPayload } as any);
        }
      }

      toast.success(`Template "${tpl.name}" aplicado a ${selectedUserIds.size} usuário(s)!`);
      setSelectedUserIds(new Set());
      setTemplateDialogOpen(false);
      setSelectedTemplateId("");
      fetchUsers();
    } catch {
      toast.error("Erro ao aplicar template.");
    }
    setApplyingTemplate(false);
  };

  const handleDeleteTemplate = async (tplId: string) => {
    await supabase.from("access_templates" as any).delete().eq("id", tplId);
    toast.success("Template excluído.");
    fetchTemplates();
  };

  const openEdit = (u: ManagedUser) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormRole(u.role);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingUser || !formName || !formEmail) return;
    await supabase.from("profiles").update({ name: formName, email: formEmail } as any).eq("id", editingUser.id);
    await supabase.from("user_roles").update({ role: formRole }).eq("user_id", editingUser.id);
    toast.success("Usuário atualizado com sucesso");
    setIsDialogOpen(false);
    fetchUsers();
  };

  const handleApprove = async (userId: string) => {
    await supabase.from("profiles").update({ approved: true } as any).eq("id", userId);
    toast.success("Usuário aprovado com sucesso!");
    fetchUsers();
  };

  const handleReject = async (userId: string) => {
    await supabase.from("profiles").update({ rejected: true }).eq("id", userId);
    toast.success("Cadastro recusado.");
    fetchUsers();
  };

  const handleImpersonate = async (u: ManagedUser) => {
    const ok = await startImpersonation(u.id, u.name || u.email);
    if (ok) {
      await loadImpersonatedProfile(u.id);
      const homeRoute = u.role === "servico" ? "/orcamento" : "/";
      navigate(homeRoute);
    }
  };

  const pendingUsers = users.filter(u => !u.approved && !u.rejected && u.role !== "admin_master");
  const approvedUsersAll = users.filter(u => u.approved || u.role === "admin_master");
  const approvedRoleFiltered = roleFilter === "todos" ? approvedUsersAll : approvedUsersAll.filter(u => u.role === roleFilter);

  // Activity filter
  const now = Date.now();
  const approvedFiltered = approvedRoleFiltered.filter(u => {
    if (activityFilter === "todos") return true;
    if (activityFilter === "nunca") return !u.last_login_at || u.login_count === 0;
    const days = parseInt(activityFilter);
    if (!u.last_login_at) return true; // no login = inactive
    const diff = now - new Date(u.last_login_at).getTime();
    return diff > days * 24 * 60 * 60 * 1000;
  });
  
  const approvedUsers = [...approvedFiltered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortField === "last_login") {
      const aTime = a.last_login_at ? new Date(a.last_login_at).getTime() : 0;
      const bTime = b.last_login_at ? new Date(b.last_login_at).getTime() : 0;
      return (aTime - bTime) * dir;
    }
    if (sortField === "login_count") {
      return (a.login_count - b.login_count) * dir;
    }
    return a.name.localeCompare(b.name) * dir;
  });

  const toggleSort = (field: "name" | "last_login" | "login_count") => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(field === "name" ? "asc" : "desc");
    }
  };

  const formatDateTime = (iso: string | null) => {
    if (!iso) return "Nunca";
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const getActivityStatus = (u: ManagedUser) => {
    if (!u.last_login_at || u.login_count === 0) return { label: "Nunca acessou", color: "bg-muted text-muted-foreground border-border", tooltip: "Este usuário nunca fez login" };
    const diffMs = now - new Date(u.last_login_at).getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (diffDays >= 90) return { label: "Inativo", color: "bg-warning/15 text-warning border-warning/30", tooltip: `Último acesso há ${diffDays} dias` };
    if (diffDays >= 30) return { label: "Inativo", color: "bg-warning/15 text-warning border-warning/30", tooltip: `Último acesso há ${diffDays} dias` };
    return { label: "Ativo", color: "bg-success/15 text-success border-success/30", tooltip: `Último acesso há ${diffDays} dia${diffDays !== 1 ? "s" : ""}` };
  };

  const activityChips: { value: typeof activityFilter; label: string }[] = [
    { value: "todos", label: "Todos" },
    { value: "nunca", label: "Nunca acessou" },
    { value: "30", label: "Inativo 30d" },
    { value: "60", label: "Inativo 60d" },
    { value: "90", label: "Inativo 90d" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Gestão de Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie o acesso dos usuários ao portal</p>
        </div>
      </div>

      {/* Permissions summary */}
      <div className="gradient-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Permissões por Perfil</h3>
        </div>
         <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="space-y-1">
            <p className="font-medium text-foreground">Administrador</p>
            <p className="text-muted-foreground">Acesso total a todas as áreas</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Operador</p>
            <p className="text-muted-foreground">Tudo exceto área Financeira</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Financeiro</p>
            <p className="text-muted-foreground">Apenas Home, Financeiro e Config.</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Serviço</p>
            <p className="text-muted-foreground">Equipamentos, Orçamento e Config.</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="approved" className="w-full">
        <TabsList>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="w-3.5 h-3.5" />
            Aprovados ({approvedUsers.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-3.5 h-3.5" />
            Pendentes ({pendingUsers.length})
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-2">
            <Star className="w-3.5 h-3.5" />
            Planos PRO
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="gap-2">
            <MessageSquare className="w-3.5 h-3.5" />
            Sugestões
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <BookmarkCheck className="w-3.5 h-3.5" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Pending Users */}
        <TabsContent value="pending">
          <div className="gradient-card rounded-lg border border-border overflow-hidden">
            {pendingUsers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhum cadastro pendente de aprovação.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground text-xs uppercase">Nome</TableHead>
                    <TableHead className="text-muted-foreground text-xs uppercase">E-mail</TableHead>
                    <TableHead className="text-muted-foreground text-xs uppercase">Empresa</TableHead>
                    <TableHead className="text-muted-foreground text-xs uppercase">Endereço</TableHead>
                    <TableHead className="text-muted-foreground text-xs uppercase">Telefone</TableHead>
                    <TableHead className="text-muted-foreground text-xs uppercase text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map((u) => (
                    <TableRow key={u.id} className="border-border">
                      <TableCell className="text-foreground font-medium text-sm">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{u.company}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {[u.address, u.city, u.state, u.zip_code].filter(Boolean).join(", ")}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {u.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            {u.phone}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(u.id)}
                            className="gap-1 bg-success hover:bg-success/90 text-success-foreground"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(u.id)}
                            className="gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Recusar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* Approved Users */}
        <TabsContent value="approved">
          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Filtrar por perfil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Perfis</SelectItem>
                <SelectItem value="admin_master">Admin Master</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="operador">Operador</SelectItem>
                <SelectItem value="financeiro">Financeiro</SelectItem>
                <SelectItem value="servico">Serviço</SelectItem>
              </SelectContent>
            </Select>

            <div className="h-6 w-px bg-border mx-1" />

            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-muted-foreground" />
              {activityChips.map(chip => (
                <button
                  key={chip.value}
                  onClick={() => setActivityFilter(chip.value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    activityFilter === chip.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-accent/50 text-muted-foreground border-border hover:bg-accent"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <span className="text-xs text-muted-foreground ml-auto">{approvedUsers.length} de {approvedUsersAll.length} usuário(s)</span>
          </div>
          {/* Batch actions bar */}
          {selectedUserIds.size > 0 && (
            <div className="flex items-center gap-3 mb-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
              <span className="text-sm font-medium text-foreground">
                {selectedUserIds.size} usuário(s) selecionado(s)
              </span>
              <Button size="sm" className="gap-1.5" onClick={() => {
                if (templates.length === 0) {
                  toast.error("Nenhum template salvo. Salve um template na página de controle de acesso de um usuário.");
                  return;
                }
                setTemplateDialogOpen(true);
              }}>
                <BookmarkCheck className="w-3.5 h-3.5" />
                Aplicar Template
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedUserIds(new Set())} className="text-muted-foreground">
                Limpar seleção
              </Button>
            </div>
          )}
          <div className="gradient-card rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={approvedUsers.filter(u => u.role !== "admin_master").length > 0 && selectedUserIds.size === approvedUsers.filter(u => u.role !== "admin_master").length}
                      onCheckedChange={toggleAllApproved}
                    />
                  </TableHead>
                  <TableHead className="text-muted-foreground text-xs uppercase">Nome</TableHead>
                  <TableHead className="text-muted-foreground text-xs uppercase">E-mail</TableHead>
                  <TableHead className="text-muted-foreground text-xs uppercase">Empresa</TableHead>
                  <TableHead className="text-muted-foreground text-xs uppercase">Perfil</TableHead>
                  <TableHead className="text-muted-foreground text-xs uppercase">Template</TableHead>
                  <TableHead className="text-muted-foreground text-xs uppercase cursor-pointer select-none" onClick={() => toggleSort("last_login")}>
                    <span className="inline-flex items-center gap-1">
                      Último Acesso
                      <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </TableHead>
                  <TableHead className="text-muted-foreground text-xs uppercase cursor-pointer select-none" onClick={() => toggleSort("login_count")}>
                    <span className="inline-flex items-center gap-1">
                      Logins
                      <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </TableHead>
                  <TableHead className="text-muted-foreground text-xs uppercase text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedUsers.map((u) => (
                  <TableRow key={u.id} className="border-border">
                    <TableCell>
                      {u.role !== "admin_master" ? (
                        <Checkbox
                          checked={selectedUserIds.has(u.id)}
                          onCheckedChange={() => toggleUserSelection(u.id)}
                        />
                      ) : <span className="w-4" />}
                    </TableCell>
                    <TableCell className="text-foreground font-medium text-sm">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.company}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          u.role === "admin" || u.role === "admin_master" ? "bg-warning/15 text-warning border-warning/30" :
                          u.role === "operador" ? "bg-info/15 text-info border-info/30" :
                          u.role === "servico" ? "bg-primary/15 text-primary border-primary/30" :
                          "bg-success/15 text-success border-success/30"
                        }`}>
                          {roleLabels[u.role]}
                        </span>
                        {u.hasCustomAccess && (
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary border border-primary/20">
                                  <SlidersHorizontal className="w-2.5 h-2.5" />
                                  Personalizado
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                Este usuário possui configurações de acesso personalizadas
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {u.appliedTemplateName ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-foreground border border-border">
                          <BookmarkCheck className="w-2.5 h-2.5 text-primary" />
                          {u.appliedTemplateName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getActivityStatus(u).color}`}>
                                {getActivityStatus(u).label}
                              </span>
                              <span className="text-muted-foreground">{formatDateTime(u.last_login_at)}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {getActivityStatus(u).tooltip}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm text-center">
                      {u.login_count}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {u.role !== "admin_master" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-success"
                            title="Entrar como este usuário"
                            onClick={() => handleImpersonate(u)}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/usuarios/${u.id}/acesso`)} className="h-8 w-8 text-muted-foreground hover:text-primary" title="Controle de acesso">
                          <Settings2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/${u.id}`)} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Ver dashboard">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(u)} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-warning"
                          title="Resetar senha financeira"
                          onClick={() => {
                            setResetTargetUser(u);
                            setResetConfirmOpen(true);
                          }}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* PRO Plans */}
        <TabsContent value="plans">
          <ProPlanManager />
        </TabsContent>

        {/* Suggestions */}
        <TabsContent value="suggestions">
          <SuggestionsTab />
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-foreground">Nome</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} className="bg-accent border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">E-mail</Label>
              <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="bg-accent border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Perfil</Label>
              <Select value={formRole} onValueChange={(v) => setFormRole(v as UserRole)}>
                <SelectTrigger className="bg-accent border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Apply Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Aplicar Template de Acesso</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Selecione um template para aplicar a {selectedUserIds.size} usuário(s) selecionado(s). Isso substituirá as configurações de acesso atuais.
          </p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                onClick={() => setSelectedTemplateId(tpl.id)}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedTemplateId === tpl.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <BookmarkCheck className={`w-4 h-4 ${selectedTemplateId === tpl.id ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm font-medium text-foreground">{tpl.name}</span>
                  {tpl.pro_access && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary border border-primary/30">
                      <Star className="w-2 h-2 fill-primary" />PRO
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTemplate(tpl.id);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum template disponível. Salve um template na página de controle de acesso de um usuário.
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-border">Cancelar</Button>
            </DialogClose>
            <Button
              disabled={!selectedTemplateId || applyingTemplate}
              onClick={handleApplyTemplate}
            >
              {applyingTemplate ? "Aplicando..." : "Aplicar Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Finance Password Confirm Dialog */}
      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Resetar Senha Financeira</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja resetar a senha financeira de <span className="font-semibold text-foreground">{resetTargetUser?.name}</span>? O usuário precisará criar uma nova senha no próximo acesso ao módulo financeiro.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-border">Cancelar</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={resettingPassword}
              onClick={async () => {
                if (!resetTargetUser) return;
                setResettingPassword(true);
                try {
                  const { data, error } = await supabase.functions.invoke("finance-password", {
                    body: { action: "reset", target_user_id: resetTargetUser.id },
                  });
                  if (error) throw error;
                  if (data.error) { toast.error(data.error); setResettingPassword(false); return; }
                  toast.success(`Senha financeira de ${resetTargetUser.name} foi resetada.`);
                  setResetConfirmOpen(false);
                  setResetTargetUser(null);
                } catch {
                  toast.error("Erro ao resetar senha financeira.");
                }
                setResettingPassword(false);
              }}
            >
              {resettingPassword ? "Resetando..." : "Confirmar Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
