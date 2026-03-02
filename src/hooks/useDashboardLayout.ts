import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface WidgetLayoutItem {
  key: string;
  visible: boolean;
  order: number;
}

export interface WidgetDefinition {
  key: string;
  label: string;
  /** Which sections the user must have access to for this widget to appear */
  requiredAccess?: string[];
}

export const ALL_WIDGETS: WidgetDefinition[] = [
  { key: "tips_card", label: "Sugestões / Feedback" },
  { key: "pro_countdown_card", label: "Status PRO" },
  { key: "financial_status_card", label: "Status Financeiro" },
  { key: "stats_grid", label: "Indicadores Rápidos" },
  { key: "bulletins_card", label: "Boletins Técnicos", requiredAccess: ["boletins"] },
  { key: "support_tickets_card", label: "Chamados Recentes", requiredAccess: ["suporte"] },
  { key: "maintenance_card", label: "Manutenções Próximas", requiredAccess: ["manutencao"] },
  { key: "cutting_quote_shortcut", label: "Atalho Orçamento de Corte", requiredAccess: ["orcamento"] },
  { key: "store_shortcut_card", label: "Atalho Peças e Loja", requiredAccess: ["pecas"] },
  { key: "recent_files_card", label: "Arquivos Recentes", requiredAccess: ["arquivos"] },
];

const rolePresets: Record<string, string[]> = {
  admin_master: [
    "tips_card", "stats_grid", "bulletins_card", "support_tickets_card",
    "maintenance_card", "cutting_quote_shortcut",
  ],
  admin: [
    "tips_card", "pro_countdown_card", "financial_status_card", "stats_grid",
    "support_tickets_card", "maintenance_card",
  ],
  operador: [
    "tips_card", "pro_countdown_card", "financial_status_card", "stats_grid",
    "support_tickets_card", "maintenance_card",
  ],
  financeiro: [
    "tips_card", "pro_countdown_card", "financial_status_card", "stats_grid",
  ],
  servico: [
    "tips_card", "cutting_quote_shortcut",
  ],
  usuario_interno: [
    "tips_card", "pro_countdown_card",
  ],
};

function getDefaultLayout(role: UserRole): WidgetLayoutItem[] {
  const preset = rolePresets[role] ?? rolePresets.operador;
  return ALL_WIDGETS.map((w, i) => ({
    key: w.key,
    visible: preset.includes(w.key),
    order: i,
  }));
}

export function useDashboardLayout() {
  const { user, session, hasAccess } = useAuth();
  const [layout, setLayout] = useState<WidgetLayoutItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const userId = session?.user?.id;
  const role = user?.role ?? "operador";

  // Filter widgets by access
  const isWidgetAvailable = useCallback((key: string): boolean => {
    const def = ALL_WIDGETS.find(w => w.key === key);
    if (!def) return false;
    if (!def.requiredAccess || def.requiredAccess.length === 0) return true;
    return def.requiredAccess.some(s => hasAccess(s));
  }, [hasAccess]);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("user_dashboard_layout" as any)
        .select("layout")
        .eq("user_id", userId)
        .single();

      if (data && (data as any).layout) {
        const saved = (data as any).layout as WidgetLayoutItem[];
        // Merge with any new widgets that may have been added since last save
        const savedKeys = new Set(saved.map(s => s.key));
        const merged = [...saved];
        ALL_WIDGETS.forEach((w, i) => {
          if (!savedKeys.has(w.key)) {
            merged.push({ key: w.key, visible: false, order: merged.length + i });
          }
        });
        setLayout(merged.sort((a, b) => a.order - b.order));
      } else {
        // First time — create default layout from preset
        const defaultLayout = getDefaultLayout(role as UserRole);
        setLayout(defaultLayout);
        // Save it
        await supabase.from("user_dashboard_layout" as any).upsert({
          user_id: userId,
          layout: defaultLayout,
        } as any);
      }
      setIsLoading(false);
    };
    load();
  }, [userId, role]);

  const saveLayout = useCallback(async (newLayout: WidgetLayoutItem[]) => {
    if (!userId) return;
    setIsSaving(true);
    const ordered = newLayout.map((item, i) => ({ ...item, order: i }));
    const { error } = await supabase
      .from("user_dashboard_layout" as any)
      .upsert({ user_id: userId, layout: ordered } as any);
    if (error) {
      toast.error("Erro ao salvar layout");
    } else {
      setLayout(ordered);
      toast.success("Layout salvo!");
    }
    setIsSaving(false);
  }, [userId]);

  const resetToDefault = useCallback(async () => {
    const defaultLayout = getDefaultLayout(role as UserRole);
    await saveLayout(defaultLayout);
  }, [role, saveLayout]);

  const visibleWidgets = layout
    .filter(item => item.visible && isWidgetAvailable(item.key))
    .sort((a, b) => a.order - b.order);

  return {
    layout,
    setLayout,
    visibleWidgets,
    isLoading,
    isSaving,
    saveLayout,
    resetToDefault,
    isWidgetAvailable,
  };
}
