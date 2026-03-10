import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, Cpu, Headphones, Calendar, Package, ShoppingBag, Receipt, Settings, Newspaper, FolderOpen, Landmark, Calculator, Eye, EyeOff, Lock, Star, Crown, Save, User, BookmarkPlus, Layers, Gift, Plus, TrendingUp, TrendingDown, Trash2, Clock, Factory, Wrench, Hammer, LayoutGrid, Box, PackageOpen, PanelTop, Route, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type UserRole, roleLabels } from "@/contexts/AuthContext";
import { format } from "date-fns";

type Visibility = "visible" | "locked" | "hidden";

interface SectionConfig {
  key: string;
  label: string;
  icon: React.ElementType;
  isPro?: boolean;
}

const ALL_SECTIONS: SectionConfig[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "maquinas", label: "Minhas Máquinas", icon: Cpu },
  { key: "suporte", label: "Suporte", icon: Headphones },
  { key: "manutencao", label: "Manutenção", icon: Calendar },
  { key: "equipamentos", label: "Equipamentos Dimension", icon: Package },
  { key: "pecas", label: "Peças e Acessórios", icon: ShoppingBag },
  { key: "financeiro", label: "Faturas", icon: Receipt },
  { key: "configuracoes", label: "Configurações", icon: Settings },
  { key: "boletins", label: "Boletins Técnicos", icon: Newspaper },
  { key: "arquivos", label: "Arquivos", icon: FolderOpen },
  { key: "orcamento", label: "Orçamento de Corte", icon: Calculator },
  { key: "controle_producao", label: "Controle de Produção", icon: Factory },
  { key: "gestao_financeira", label: "Gerenciador Financeiro (PRO)", icon: Landmark, isPro: true },
];

const ORCAMENTO_SUB_FEATURES: SectionConfig[] = [
  { key: "orcamento_pdf", label: "Exportar PDF do Orçamento", icon: Eye },
  { key: "orcamento_salvos", label: "Aba Salvos (Histórico)", icon: Eye },
  { key: "assistente_preco", label: "Assistente de Preço", icon: Star },
];

const visibilityOptions: { value: Visibility; label: string; icon: React.ElementType; description: string; color: string }[] = [
  { value: "visible", label: "Visível", icon: Eye, description: "Usuário pode acessar normalmente", color: "bg-success/15 text-success border-success/30" },
  { value: "locked", label: "Com cadeado", icon: Lock, description: "Aparece no menu mas não pode clicar", color: "bg-warning/15 text-warning border-warning/30" },
  { value: "hidden", label: "Oculto", icon: EyeOff, description: "Não aparece no menu", color: "bg-destructive/15 text-destructive border-destructive/30" },
];

const UserAccessPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userCompany, setUserCompany] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("operador");
  const [proAccess, setProAccess] = useState(false);
  const [hasPlanRow, setHasPlanRow] = useState(false);
  const [sections, setSections] = useState<Record<string, Visibility>>({});
  const [hasAccessRow, setHasAccessRow] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [useMasterPricing, setUseMasterPricing] = useState(false);
  const [useDimensionMaterials, setUseDimensionMaterials] = useState(false);

  // Bonus state
  const [bonuses, setBonuses] = useState<any[]>([]);
  const [showBonusDialog, setShowBonusDialog] = useState(false);
  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusType, setBonusType] = useState("credito");
  const [bonusDescription, setBonusDescription] = useState("");
  const [bonusNotes, setBonusNotes] = useState("");
  const [savingBonus, setSavingBonus] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: profile }, { data: roleData }, { data: planData }, { data: accessData }, { data: bonusData }] = await Promise.all([
      supabase.from("profiles").select("name, email, company").eq("id", userId!).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId!).single(),
      supabase.from("user_plans").select("*").eq("user_id", userId!).single(),
      supabase.from("user_section_access" as any).select("sections").eq("user_id", userId!).single(),
      supabase.from("service_bonuses" as any).select("*").eq("user_id", userId!).order("created_at", { ascending: false }),
    ]);

    setUserName(profile?.name ?? "");
    setUserEmail(profile?.email ?? "");
    setUserCompany((profile as any)?.company ?? "");
    setUserRole((roleData?.role as UserRole) ?? "operador");
    setProAccess(planData?.pro_access ?? false);
    setUseMasterPricing((planData as any)?.use_master_pricing ?? false);
    setUseDimensionMaterials((planData as any)?.use_dimension_materials ?? false);
    setHasPlanRow(!!planData);
    setHasAccessRow(!!accessData);
    setBonuses((bonusData as any[]) ?? []);

    // Build sections state from saved data or role-aware defaults
    const saved = (accessData as any)?.sections ?? {};
    const role = (roleData?.role as UserRole) ?? "operador";
    const rolePerms: Record<UserRole, string[]> = {
      admin_master: ["home", "maquinas", "suporte", "manutencao", "equipamentos", "pecas", "financeiro", "gestao_financeira", "configuracoes", "usuarios", "boletins", "orcamento", "arquivos", "propostas", "dimension", "controle_producao"],
      admin: ["home", "maquinas", "suporte", "manutencao", "equipamentos", "pecas", "financeiro", "configuracoes", "orcamento", "arquivos"],
      operador: ["home", "maquinas", "suporte", "manutencao", "equipamentos", "pecas", "configuracoes", "orcamento", "arquivos"],
      financeiro: ["home", "equipamentos", "financeiro", "gestao_financeira", "configuracoes", "arquivos"],
      servico: ["home", "equipamentos", "configuracoes", "orcamento"],
      usuario_interno: ["home", "configuracoes"],
    };
    const allowedByRole = rolePerms[role] ?? [];
    const initial: Record<string, Visibility> = {};
    ALL_SECTIONS.forEach((s) => {
      initial[s.key] = saved[s.key] ?? (allowedByRole.includes(s.key) ? "visible" : "hidden");
    });
    // Also initialize sub-feature keys (orcamento_pdf, orcamento_salvos, etc.)
    ORCAMENTO_SUB_FEATURES.forEach((s) => {
      initial[s.key] = saved[s.key] ?? "hidden";
    });
    setSections(initial);
    setLoading(false);
  };

  const handleVisibilityChange = (sectionKey: string, visibility: Visibility) => {
    setSections((prev) => ({ ...prev, [sectionKey]: visibility }));
  };

  const handleProToggle = async () => {
    const newPro = !proAccess;
    setProAccess(newPro);
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);

    // Capture values at save time to avoid stale closures
    const saveUseMasterPricing = useMasterPricing;
    const saveUseDimensionMaterials = useDimensionMaterials;
    const saveProAccess = proAccess;

    try {
      // Save section access
      if (hasAccessRow) {
        const { error: accessError } = await supabase
          .from("user_section_access" as any)
          .update({ sections } as any)
          .eq("user_id", userId);
        if (accessError) {
          console.error("Erro ao salvar acesso de seções:", accessError);
          toast.error("Erro ao salvar configurações de seções.");
          setSaving(false);
          return;
        }
      } else {
        const { error: accessError } = await supabase
          .from("user_section_access" as any)
          .insert({ user_id: userId, sections } as any);
        if (accessError) {
          console.error("Erro ao inserir acesso de seções:", accessError);
          toast.error("Erro ao salvar configurações de seções.");
          setSaving(false);
          return;
        }
        setHasAccessRow(true);
      }

      // Save PRO access + master pricing flag
      const proFeatures = saveProAccess ? ["gestao_financeira", "orcamento"] : [];
      const planPayload = {
        pro_access: saveProAccess,
        plan: saveProAccess ? "pro" : "free",
        features_enabled: proFeatures,
        max_quotes_per_month: saveProAccess ? -1 : 5,
        max_financial_entries: saveProAccess ? -1 : 0,
        use_master_pricing: saveUseMasterPricing,
        use_dimension_materials: saveUseDimensionMaterials,
        ...(saveProAccess ? { pro_activated_at: new Date().toISOString() } : { pro_activated_at: null }),
      };

      if (hasPlanRow) {
        const { error: planError } = await supabase
          .from("user_plans")
          .update(planPayload as any)
          .eq("user_id", userId);
        if (planError) {
          console.error("Erro ao atualizar plano:", planError);
          toast.error("Erro ao salvar configurações do plano.");
          setSaving(false);
          return;
        }
      } else {
        const { error: planError } = await supabase.from("user_plans").insert({
          user_id: userId,
          ...planPayload,
        } as any);
        if (planError) {
          console.error("Erro ao inserir plano:", planError);
          toast.error("Erro ao salvar configurações do plano.");
          setSaving(false);
          return;
        }
        setHasPlanRow(true);
      }

      // Verify the save was successful by re-reading
      const { data: verifyPlan } = await supabase
        .from("user_plans")
        .select("use_master_pricing, use_dimension_materials")
        .eq("user_id", userId)
        .maybeSingle();

      if (verifyPlan) {
        const savedMasterPricing = (verifyPlan as any)?.use_master_pricing ?? false;
        const savedDimensionMaterials = (verifyPlan as any)?.use_dimension_materials ?? false;
        // Sync state with actual DB values
        setUseMasterPricing(savedMasterPricing);
        setUseDimensionMaterials(savedDimensionMaterials);

        if (savedDimensionMaterials !== saveUseDimensionMaterials || savedMasterPricing !== saveUseMasterPricing) {
          console.warn("Divergência detectada no save! Enviado:", { saveUseMasterPricing, saveUseDimensionMaterials }, "Salvo:", { savedMasterPricing, savedDimensionMaterials });
          toast.warning("Atenção: os valores salvos diferem do esperado. A tela foi atualizada com os valores reais.");
        }
      }

      // Update pending PRO request if approving
      if (saveProAccess) {
        await supabase
          .from("pro_access_requests" as any)
          .update({ status: "approved", reviewed_at: new Date().toISOString() } as any)
          .eq("user_id", userId)
          .eq("status", "pending");
      }

      toast.success("Configurações de acesso salvas com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar configurações:", err);
      toast.error("Erro ao salvar configurações.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        Carregando configurações de acesso...
      </div>
    );
  }

  const basicSections = ALL_SECTIONS.filter((s) => !s.isPro);
  const proSections = ALL_SECTIONS.filter((s) => s.isPro);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/usuarios")} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Controle de Acesso</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie a visibilidade dos módulos para este usuário</p>
        </div>
        <Button variant="outline" onClick={() => setTemplateDialogOpen(true)} className="gap-2 border-border">
          <BookmarkPlus className="h-4 w-4" />
          Salvar como Template
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>

      {/* User info card */}
      <div className="gradient-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full bg-accent flex items-center justify-center">
            <User className="w-5 h-5 text-accent-foreground" />
            {proAccess && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <Crown className="w-2.5 h-2.5 text-primary-foreground" />
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{userName}</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                userRole === "admin" || userRole === "admin_master" ? "bg-warning/15 text-warning border-warning/30" :
                userRole === "operador" ? "bg-info/15 text-info border-info/30" :
                "bg-success/15 text-success border-success/30"
              }`}>
                {roleLabels[userRole]}
              </span>
              {proAccess ? (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary border border-primary/30">
                  <Star className="w-2 h-2 fill-primary" />PRO
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  FREE
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
            {userCompany && <p className="text-[10px] text-muted-foreground">{userCompany}</p>}
          </div>
        </div>
      </div>

      {/* PRO Access toggle */}
      <div className="gradient-card rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Crown className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Acesso PRO</p>
              <p className="text-xs text-muted-foreground">Ativa funcionalidades premium (Financeiro)</p>
            </div>
          </div>
          <Switch
            checked={proAccess}
            onCheckedChange={handleProToggle}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </div>

      {/* Master Pricing inheritance */}
      {sections["orcamento"] !== "hidden" && (
        <div className="gradient-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calculator className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Usar configurações de orçamento da Dimension</p>
                <p className="text-xs text-muted-foreground">
                  O usuário utilizará as configurações oficiais de precificação definidas pelo Admin Master
                </p>
              </div>
            </div>
            <Switch
              checked={useMasterPricing}
              onCheckedChange={setUseMasterPricing}
              className="data-[state=checked]:bg-primary"
            />
          </div>
          {useMasterPricing && (
            <div className="mt-3 p-2.5 rounded-md bg-primary/5 border border-primary/20">
              <p className="text-xs text-primary font-medium">
                ⚡ Este usuário utiliza as configurações oficiais da Dimension CNC. As alterações feitas pelo Admin Master refletirão automaticamente nos orçamentos deste usuário.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Dimension Materials inheritance */}
      {sections["orcamento"] !== "hidden" && (
        <div className="gradient-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Layers className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Usar materiais da Dimension</p>
                <p className="text-xs text-muted-foreground">
                  O usuário utilizará o catálogo oficial de materiais da Dimension (não poderá cadastrar materiais próprios)
                </p>
              </div>
            </div>
            <Switch
              checked={useDimensionMaterials}
              onCheckedChange={setUseDimensionMaterials}
              className="data-[state=checked]:bg-primary"
            />
          </div>
          {useDimensionMaterials && (
            <div className="mt-3 p-2.5 rounded-md bg-primary/5 border border-primary/20">
              <p className="text-xs text-primary font-medium">
                📦 Este usuário utiliza o catálogo oficial de materiais da Dimension CNC. Ele não poderá cadastrar ou editar materiais, apenas selecionar do catálogo.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Basic sections */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Módulos Básicos</h2>
        <div className="grid gap-2">
          {basicSections.map((section) => (
            <SectionRow
              key={section.key}
              section={section}
              visibility={sections[section.key] ?? "visible"}
              onChange={(v) => handleVisibilityChange(section.key, v)}
            />
          ))}
        </div>
      </div>

      {/* PRO sections */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-3.5 h-3.5 text-primary fill-primary/30" />
          <h2 className="text-xs font-semibold text-primary uppercase tracking-wider">Módulos PRO</h2>
        </div>
        <div className="grid gap-2">
          {proSections.map((section) => (
            <SectionRow
              key={section.key}
              section={section}
              visibility={sections[section.key] ?? "visible"}
              onChange={(v) => handleVisibilityChange(section.key, v)}
              disabled={!proAccess}
            />
          ))}
        </div>
        {!proAccess && (
          <p className="text-xs text-muted-foreground mt-2 italic">
            Ative o Acesso PRO acima para configurar estes módulos.
          </p>
        )}

        {/* Orçamento sub-features */}
        {sections["orcamento"] !== "hidden" && (
          <div className="mt-4 ml-4 border-l-2 border-primary/20 pl-4 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Sub-controles do Orçamento de Corte
            </p>
            {ORCAMENTO_SUB_FEATURES.map((section) => (
              <SectionRow
                key={section.key}
                section={section}
                visibility={sections[section.key] ?? "hidden"}
                onChange={(v) => handleVisibilityChange(section.key, v)}
              />
            ))}
            <p className="text-[10px] text-muted-foreground italic">
              Quando oculto, o usuário verá uma mensagem para entrar em contato com o administrador.
            </p>
          </div>
        )}
      </div>

      {/* Bonus Section - only for servico users */}
      {userRole === "servico" && (
        <div className="gradient-card rounded-lg border border-border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Gift className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Bônus do Cliente</p>
                <p className="text-xs text-muted-foreground">Gerencie créditos e débitos de bônus</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-bold">
                Saldo: {(() => {
                  const credits = bonuses.filter(b => b.type === "credito").reduce((s: number, b: any) => s + Number(b.amount), 0);
                  const debits = bonuses.filter(b => b.type === "debito").reduce((s: number, b: any) => s + Number(b.amount), 0);
                  const bal = credits - debits;
                  return bal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                })()}
              </Badge>
              <Button size="sm" className="gap-1.5 h-7 text-xs" onClick={() => { setBonusAmount(""); setBonusType("credito"); setBonusDescription(""); setBonusNotes(""); setShowBonusDialog(true); }}>
                <Plus className="w-3 h-3" /> Novo
              </Button>
            </div>
          </div>

          {/* Bonus history */}
          {bonuses.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum bônus registrado para este cliente.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Descrição</TableHead>
                    <TableHead className="text-xs text-right">Valor</TableHead>
                    <TableHead className="text-xs text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bonuses.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-xs">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {format(new Date(b.created_at), "dd/MM/yyyy HH:mm")}
                        </span>
                      </TableCell>
                      <TableCell>
                        {b.type === "credito" ? (
                          <Badge className="text-[10px] bg-primary gap-0.5"><TrendingUp className="w-3 h-3" />Crédito</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] gap-0.5"><TrendingDown className="w-3 h-3" />Débito</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <p className="truncate max-w-[200px]">{b.description}</p>
                        {b.notes && <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{b.notes}</p>}
                      </TableCell>
                      <TableCell className={`text-xs text-right font-bold ${b.type === "credito" ? "text-primary" : "text-destructive"}`}>
                        {b.type === "credito" ? "+" : "−"}{Number(b.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir registro de bônus?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={async () => {
                                const { error } = await supabase.from("service_bonuses" as any).delete().eq("id", b.id);
                                if (error) { toast.error("Erro ao excluir."); return; }
                                setBonuses(prev => prev.filter((x: any) => x.id !== b.id));
                                toast.success("Registro excluído.");
                              }}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Add Bonus Dialog */}
      <Dialog open={showBonusDialog} onOpenChange={setShowBonusDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" />
              Novo Bônus — {userName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo *</Label>
                <Select value={bonusType} onValueChange={setBonusType}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credito">Crédito (+)</SelectItem>
                    <SelectItem value="debito">Débito (−)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor (R$) *</Label>
                <Input type="number" min="0.01" step="0.01" value={bonusAmount} onChange={e => setBonusAmount(e.target.value)} className="h-9 text-sm" placeholder="0,00" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Input value={bonusDescription} onChange={e => setBonusDescription(e.target.value)} className="h-9 text-sm" placeholder="Ex: Bônus de indicação" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observações</Label>
              <Textarea value={bonusNotes} onChange={e => setBonusNotes(e.target.value)} className="text-sm min-h-[60px]" placeholder="Notas internas (opcional)" />
            </div>
            <Button className="w-full" disabled={savingBonus || !bonusAmount || Number(bonusAmount) <= 0} onClick={async () => {
              setSavingBonus(true);
              const { data: { user: authUser } } = await supabase.auth.getUser();
              if (!authUser) { setSavingBonus(false); return; }
              const { error } = await supabase.from("service_bonuses" as any).insert({
                user_id: userId,
                amount: Number(bonusAmount),
                type: bonusType,
                description: bonusDescription || (bonusType === "credito" ? "Bônus adicionado" : "Bônus removido"),
                granted_by: authUser.id,
                notes: bonusNotes || null,
              } as any);
              if (error) { toast.error("Erro ao registrar bônus."); }
              else {
                toast.success(`Bônus ${bonusType === "credito" ? "adicionado" : "debitado"} com sucesso.`);
                setShowBonusDialog(false);
                // Refresh bonuses
                const { data: refreshed } = await supabase.from("service_bonuses" as any).select("*").eq("user_id", userId!).order("created_at", { ascending: false });
                setBonuses((refreshed as any[]) ?? []);
              }
              setSavingBonus(false);
            }}>
              {savingBonus ? "Salvando..." : `Registrar ${bonusType === "credito" ? "Crédito" : "Débito"}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      <div className="gradient-card rounded-lg border border-border p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Legenda</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {visibilityOptions.map((opt) => (
            <div key={opt.value} className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${opt.color}`}>
                <opt.icon className="w-3 h-3" />
                {opt.label}
              </span>
              <span className="text-[10px] text-muted-foreground">{opt.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Save as Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Salvar como Template</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Salve a configuração atual de acesso como um template reutilizável para aplicar a múltiplos usuários.
          </p>
          <div className="space-y-2">
            <Label className="text-foreground">Nome do Template</Label>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Ex: Acesso Operador Padrão"
              className="bg-accent border-border"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-border">Cancelar</Button>
            </DialogClose>
            <Button
              disabled={!templateName.trim()}
              onClick={async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const { error } = await supabase.from("access_templates" as any).insert({
                  name: templateName.trim(),
                  sections,
                  pro_access: proAccess,
                  created_by: user.id,
                } as any);
                if (error) {
                  toast.error("Erro ao salvar template.");
                } else {
                  toast.success(`Template "${templateName.trim()}" salvo com sucesso!`);
                  setTemplateDialogOpen(false);
                  setTemplateName("");
                }
              }}
            >
              <BookmarkPlus className="h-4 w-4 mr-2" />
              Salvar Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function SectionRow({
  section,
  visibility,
  onChange,
  disabled = false,
}: {
  section: SectionConfig;
  visibility: Visibility;
  onChange: (v: Visibility) => void;
  disabled?: boolean;
}) {
  const Icon = section.icon;
  const currentOpt = visibilityOptions.find((o) => o.value === visibility)!;

  return (
    <div className={`gradient-card rounded-lg border border-border p-3 flex items-center gap-3 ${disabled ? "opacity-50" : ""}`}>
      <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{section.label}</p>
      </div>
      <div className="flex items-center gap-1">
        {visibilityOptions.map((opt) => {
          const isActive = visibility === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => !disabled && onChange(opt.value)}
              disabled={disabled}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all ${
                isActive ? opt.color : "bg-transparent text-muted-foreground border-transparent hover:bg-accent"
              } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
              title={opt.description}
            >
              <opt.icon className="w-3 h-3" />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default UserAccessPage;
