import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, Cpu, Headphones, Calendar, Package, ShoppingBag, Receipt, Settings, Newspaper, FolderOpen, Landmark, Calculator, Eye, EyeOff, Lock, Star, Crown, Save, User, BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type UserRole, roleLabels } from "@/contexts/AuthContext";

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
  { key: "financeiro", label: "Boletos", icon: Receipt },
  { key: "configuracoes", label: "Configurações", icon: Settings },
  { key: "boletins", label: "Boletins Técnicos", icon: Newspaper },
  { key: "arquivos", label: "Arquivos", icon: FolderOpen },
  { key: "gestao_financeira", label: "Financeiro (PRO)", icon: Landmark, isPro: true },
  { key: "orcamento", label: "Orçamento de Corte (PRO)", icon: Calculator, isPro: true },
];

const ORCAMENTO_SUB_FEATURES: SectionConfig[] = [
  { key: "orcamento_pdf", label: "Exportar PDF do Orçamento", icon: Eye, isPro: true },
  { key: "orcamento_salvos", label: "Aba Salvos (Histórico)", icon: Eye, isPro: true },
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

  useEffect(() => {
    if (!userId) return;
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: profile }, { data: roleData }, { data: planData }, { data: accessData }] = await Promise.all([
      supabase.from("profiles").select("name, email, company").eq("id", userId!).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId!).single(),
      supabase.from("user_plans").select("*").eq("user_id", userId!).single(),
      supabase.from("user_section_access" as any).select("sections").eq("user_id", userId!).single(),
    ]);

    setUserName(profile?.name ?? "");
    setUserEmail(profile?.email ?? "");
    setUserCompany((profile as any)?.company ?? "");
    setUserRole((roleData?.role as UserRole) ?? "operador");
    setProAccess(planData?.pro_access ?? false);
    setHasPlanRow(!!planData);
    setHasAccessRow(!!accessData);

    // Build sections state from saved data or defaults
    const saved = (accessData as any)?.sections ?? {};
    const initial: Record<string, Visibility> = {};
    ALL_SECTIONS.forEach((s) => {
      initial[s.key] = saved[s.key] ?? "visible";
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

    try {
      // Save section access
      if (hasAccessRow) {
        await supabase
          .from("user_section_access" as any)
          .update({ sections } as any)
          .eq("user_id", userId);
      } else {
        await supabase
          .from("user_section_access" as any)
          .insert({ user_id: userId, sections } as any);
        setHasAccessRow(true);
      }

      // Save PRO access
      const proFeatures = proAccess ? ["gestao_financeira", "orcamento"] : [];
      if (hasPlanRow) {
        await supabase
          .from("user_plans")
          .update({
            pro_access: proAccess,
            plan: proAccess ? "pro" : "free",
            features_enabled: proFeatures,
            max_quotes_per_month: proAccess ? -1 : 5,
            max_financial_entries: proAccess ? -1 : 0,
            ...(proAccess ? { pro_activated_at: new Date().toISOString() } : { pro_activated_at: null }),
          } as any)
          .eq("user_id", userId);
      } else {
        await supabase.from("user_plans").insert({
          user_id: userId,
          pro_access: proAccess,
          plan: proAccess ? "pro" : "free",
          features_enabled: proFeatures,
          max_quotes_per_month: proAccess ? -1 : 5,
          max_financial_entries: proAccess ? -1 : 0,
          ...(proAccess ? { pro_activated_at: new Date().toISOString() } : {}),
        } as any);
        setHasPlanRow(true);
      }

      // Update pending PRO request if approving
      if (proAccess) {
        await supabase
          .from("pro_access_requests" as any)
          .update({ status: "approved", reviewed_at: new Date().toISOString() } as any)
          .eq("user_id", userId)
          .eq("status", "pending");
      }

      toast.success("Configurações de acesso salvas com sucesso!");
    } catch {
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
              <p className="text-xs text-muted-foreground">Ativa funcionalidades premium (Financeiro e Orçamento de Corte)</p>
            </div>
          </div>
          <Switch
            checked={proAccess}
            onCheckedChange={handleProToggle}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </div>

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
        {proAccess && sections["orcamento"] !== "hidden" && (
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

      {/* Legend */}
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
