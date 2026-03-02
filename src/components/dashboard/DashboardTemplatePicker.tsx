import { useState, useEffect } from "react";
import { LayoutTemplate, Lock, Check, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardCardItem } from "@/hooks/useDashboardLayout";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  is_locked: boolean;
  allowed_roles: string[];
  layout: DashboardCardItem[];
}

interface Props {
  currentTemplateId: string | null;
  onApply: (layout: DashboardCardItem[], templateId: string, locked: boolean) => Promise<void>;
}

export function DashboardTemplatePicker({ currentTemplateId, onApply }: Props) {
  const [templates, setTemplates] = useState<DashboardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("dashboard_templates" as any)
        .select("id, name, description, is_locked, allowed_roles, layout")
        .eq("is_active", true)
        .order("name");

      const role = user?.role ?? "operador";
      const isAdminMaster = role === "admin_master";
      // Admin master can see ALL templates
      const filtered = (data as any[] ?? []).filter((t: any) => {
        if (isAdminMaster) return true;
        const roles = t.allowed_roles as string[] | null;
        if (!roles || roles.length === 0) return true;
        return roles.includes(role);
      });

      setTemplates(filtered.map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description ?? "",
        is_locked: t.is_locked,
        allowed_roles: t.allowed_roles ?? [],
        layout: (t.layout as DashboardCardItem[]) ?? [],
      })));
      setLoading(false);
    };
    fetch();
  }, [user?.role]);

  const { hasAccess } = useAuth();

  /** Check if a template requires a specific module the user doesn't have access to */
  const isTemplateLocked = (tpl: DashboardTemplate): boolean => {
    // "Controle de Produção" requires controle_producao access
    if (tpl.name === "Controle de Produção" && !hasAccess("controle_producao")) {
      return true;
    }
    return false;
  };

  const handleApply = async (tpl: DashboardTemplate) => {
    if (isTemplateLocked(tpl)) {
      toast.error("Você não tem permissão para usar este template.");
      return;
    }
    const confirmed = window.confirm("Isso substituirá seu dashboard atual. Deseja continuar?");
    if (!confirmed) return;
    setApplying(tpl.id);
    try {
      await onApply(tpl.layout, tpl.id, tpl.is_locked);
      toast.success(`Template "${tpl.name}" aplicado!`);
    } catch {
      toast.error("Erro ao aplicar template");
    }
    setApplying(null);
  };

  if (loading) {
    return <p className="text-xs text-muted-foreground py-4 text-center">Carregando templates...</p>;
  }

  if (templates.length === 0) {
    return (
      <div className="py-4 text-center">
        <LayoutTemplate className="w-6 h-6 text-muted-foreground mx-auto mb-1.5" />
        <p className="text-xs text-muted-foreground">Nenhum template disponível para seu perfil.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {templates.map(tpl => {
        const isApplied = tpl.id === currentTemplateId;
        const locked = isTemplateLocked(tpl);
        const widgetCount = tpl.layout.filter(c => c.visible && c.type === "widget").length;
        const shortcutCount = tpl.layout.filter(c => c.visible && c.type === "shortcut").length;

        return (
          <div
            key={tpl.id}
            className={`p-3 rounded-lg border transition-colors ${
              locked ? "bg-muted/30 border-border opacity-70" :
              isApplied ? "bg-primary/10 border-primary/30" : "bg-card border-border hover:border-primary/20"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-medium truncate ${locked ? "text-muted-foreground" : "text-foreground"}`}>{tpl.name}</span>
                  {locked && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ShieldAlert className="w-3.5 h-3.5 text-destructive shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">Sem permissão para este módulo</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {tpl.is_locked && !locked && <span title="Layout bloqueado"><Lock className="w-3 h-3 text-warning shrink-0" /></span>}
                  {isApplied && <Badge className="text-[9px] bg-primary/20 text-primary border-primary/30">Aplicado</Badge>}
                </div>
                {tpl.description && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{tpl.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-muted-foreground">{widgetCount} widgets</span>
                  {shortcutCount > 0 && (
                    <span className="text-[10px] text-muted-foreground">{shortcutCount} atalhos</span>
                  )}
                </div>
              </div>
              {locked ? (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Bloqueado</span>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant={isApplied ? "secondary" : "default"}
                  className="h-7 text-[11px] gap-1 shrink-0"
                  disabled={applying === tpl.id}
                  onClick={() => handleApply(tpl)}
                >
                  {applying === tpl.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : isApplied ? (
                    <><Check className="w-3 h-3" /> Reaplicar</>
                  ) : (
                    "Aplicar"
                  )}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
