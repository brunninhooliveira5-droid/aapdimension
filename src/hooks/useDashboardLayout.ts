import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { flattenRegistry } from "@/data/menuRegistry";
import { toast } from "sonner";

export type CardType = "widget" | "shortcut";

export interface DashboardCardItem {
  id: string;
  type: CardType;
  /** Widget key (e.g. "tips_card") or menu registry id (e.g. "nav_support") */
  key: string;
  title: string;
  visible: boolean;
  order: number;
  /** Column span: 1 | 2 | 3 | 4 (default 1) */
  colSpan?: number;
  /** Grid position for react-grid-layout */
  gridX?: number;
  gridY?: number;
  gridW?: number;
  gridH?: number;
  /** For shortcuts only */
  targetRoute?: string;
}

export interface WidgetDefinition {
  key: string;
  label: string;
  requiredAccess?: string[];
  /** If true, always visible and cannot be hidden */
  fixed?: boolean;
  /** Default column span (1-4). Defaults to 1. */
  defaultColSpan?: number;
}

export const ALL_WIDGETS: WidgetDefinition[] = [
  { key: "tips_card", label: "Sugestões / Feedback", fixed: true, defaultColSpan: 1 },
  { key: "pro_countdown_card", label: "Status PRO", defaultColSpan: 1 },
  { key: "financial_status_card", label: "Status Financeiro", defaultColSpan: 1 },
  { key: "stat_active_machines", label: "Máquinas Ativas", defaultColSpan: 1 },
  { key: "stat_open_invoices", label: "Faturas em Aberto", defaultColSpan: 1 },
  { key: "stat_overdue_invoices", label: "Faturas em Atraso", defaultColSpan: 1 },
  { key: "stat_next_maintenance", label: "Próxima Manutenção", defaultColSpan: 1 },
  { key: "stat_cutting_services", label: "Serviços de Corte", defaultColSpan: 1 },
  { key: "bulletins_card", label: "Boletins Técnicos", requiredAccess: ["boletins"], defaultColSpan: 2 },
  { key: "support_tickets_card", label: "Chamados Recentes", requiredAccess: ["suporte"], defaultColSpan: 2 },
  { key: "maintenance_card", label: "Manutenções Próximas", requiredAccess: ["manutencao"], defaultColSpan: 2 },
  { key: "cutting_quote_shortcut", label: "Atalho Orçamento de Corte", requiredAccess: ["orcamento"], defaultColSpan: 1 },
  { key: "store_shortcut_card", label: "Atalho Peças e Loja", requiredAccess: ["pecas"], defaultColSpan: 1 },
  { key: "recent_files_card", label: "Arquivos Recentes", requiredAccess: ["arquivos"], defaultColSpan: 2 },
];

/** Grid-positioned presets per role. Each entry: [key, x, y, w, h] */
type GridPreset = [string, number, number, number, number][];

const roleGridPresets: Record<string, GridPreset> = {
  admin_master: [
    // Row 0: Sugestões (span 2) + 2 KPIs
    ["tips_card",              0, 0, 2, 1],
    ["stat_active_machines",   2, 0, 1, 1],
    ["stat_cutting_services",  3, 0, 1, 1],
    // Row 1: 4 KPIs financeiros/manutenção
    ["stat_open_invoices",     0, 1, 1, 1],
    ["stat_overdue_invoices",  1, 1, 1, 1],
    ["stat_next_maintenance",  2, 1, 1, 1],
    ["cutting_quote_shortcut", 3, 1, 1, 1],
    // Row 2: Painéis grandes (span 2 cada)
    ["bulletins_card",         0, 2, 2, 3],
    ["support_tickets_card",   2, 2, 2, 3],
    // Row 5: Manutenção grande
    ["maintenance_card",       0, 5, 2, 3],
  ],
  admin: [
    // Row 0: Sugestões + PRO + Financeiro
    ["tips_card",              0, 0, 2, 1],
    ["pro_countdown_card",     2, 0, 1, 1],
    ["financial_status_card",  3, 0, 1, 2],
    // Row 1: KPIs
    ["stat_open_invoices",     0, 1, 1, 1],
    ["stat_overdue_invoices",  1, 1, 1, 1],
    ["stat_next_maintenance",  2, 1, 1, 1],
    // Row 2: Painéis grandes
    ["support_tickets_card",   0, 2, 2, 3],
    ["maintenance_card",       2, 2, 2, 3],
  ],
  operador: [
    // Row 0: Sugestões + PRO + Financeiro
    ["tips_card",              0, 0, 2, 1],
    ["pro_countdown_card",     2, 0, 1, 1],
    ["financial_status_card",  3, 0, 1, 2],
    // Row 1: KPIs
    ["stat_open_invoices",     0, 1, 1, 1],
    ["stat_overdue_invoices",  1, 1, 1, 1],
    ["stat_next_maintenance",  2, 1, 1, 1],
    // Row 2: Painéis grandes
    ["support_tickets_card",   0, 2, 2, 3],
    ["maintenance_card",       2, 2, 2, 3],
  ],
  financeiro: [
    // Row 0: Sugestões + PRO
    ["tips_card",              0, 0, 2, 1],
    ["pro_countdown_card",     2, 0, 1, 1],
    ["financial_status_card",  3, 0, 1, 2],
    // Row 1: KPIs financeiros
    ["stat_open_invoices",     0, 1, 2, 1],
    ["stat_overdue_invoices",  2, 1, 2, 1],
  ],
  servico: [
    // Row 0: Sugestões + Atalho de corte
    ["tips_card",              0, 0, 2, 1],
    ["cutting_quote_shortcut", 2, 0, 1, 1],
  ],
  usuario_interno: [
    // Row 0: Sugestões + PRO
    ["tips_card",              0, 0, 2, 1],
    ["pro_countdown_card",     2, 0, 1, 1],
  ],
};

function getDefaultCards(role: UserRole): DashboardCardItem[] {
  const preset = roleGridPresets[role] ?? roleGridPresets.operador;
  const presetMap = new Map(preset.map(([key, x, y, w, h]) => [key, { x, y, w, h }]));

  const cards: DashboardCardItem[] = [];

  // First add preset cards with grid positions
  for (const [key, x, y, w, h] of preset) {
    const def = ALL_WIDGETS.find(wd => wd.key === key);
    cards.push({
      id: `w_${key}`,
      type: "widget" as CardType,
      key,
      title: def?.label ?? key,
      visible: true,
      order: y * 100 + x,
      colSpan: w,
      gridX: x,
      gridY: y,
      gridW: w,
      gridH: h,
    });
  }

  // Then add remaining widgets as hidden
  for (const w of ALL_WIDGETS) {
    if (!presetMap.has(w.key)) {
      cards.push({
        id: `w_${w.key}`,
        type: "widget" as CardType,
        key: w.key,
        title: w.label,
        visible: false,
        order: 9999,
        colSpan: w.defaultColSpan ?? 1,
      });
    }
  }

  return cards;
}

export function useDashboardLayout() {
  const { user, hasAccess, hasProAccess } = useAuth();
  const { effectiveUserId } = useEffectiveUser();
  const [cards, setCards] = useState<DashboardCardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(null);
  const [dashboardLocked, setDashboardLocked] = useState(false);

  const role = user?.role ?? "operador";

  /** Check if a card (widget or shortcut) is available for the current user */
  const isCardAvailable = useCallback((card: DashboardCardItem): boolean => {
    if (card.type === "widget") {
      const def = ALL_WIDGETS.find(w => w.key === card.key);
      if (!def) return false;
      if (!def.requiredAccess || def.requiredAccess.length === 0) return true;
      return def.requiredAccess.some(s => hasAccess(s));
    }
    // shortcut
    const entry = flattenRegistry().find(m => m.id === card.key);
    if (!entry) return false;
    if (!hasAccess(entry.section)) return false;
    if (entry.proFeature && !hasProAccess(entry.proFeature)) return false;
    return true;
  }, [hasAccess, hasProAccess]);

  useEffect(() => {
    if (!effectiveUserId) return;
    const load = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("user_dashboard_layout" as any)
        .select("layout, applied_template_id, dashboard_locked")
        .eq("user_id", effectiveUserId)
        .single();

      if (data) {
        setAppliedTemplateId((data as any).applied_template_id ?? null);
        setDashboardLocked((data as any).dashboard_locked ?? false);
      }

      if (data && (data as any).layout) {
        const raw = (data as any).layout as any[];
        // Migrate legacy items (no type/id) to new format
        const saved: DashboardCardItem[] = raw.map(item => {
          if (!item.type) {
            const def = ALL_WIDGETS.find(w => w.key === item.key);
            return {
              ...item,
              id: item.id || `w_${item.key}`,
              type: "widget" as CardType,
              title: item.title || def?.label || item.key,
            };
          }
          return item as DashboardCardItem;
        });
        // Merge with any new widgets that may have been added since last save
        const savedKeys = new Set(saved.map(s => s.key));
        const merged = [...saved];
        ALL_WIDGETS.forEach((w, i) => {
          if (!savedKeys.has(w.key)) {
            merged.push({
              id: `w_${w.key}`,
              type: "widget",
              key: w.key,
              title: w.label,
              visible: false,
              order: merged.length + i,
              colSpan: w.defaultColSpan ?? 1,
            });
          }
        });
        // Force fixed widgets to always be visible + apply default colSpan if missing
        for (const m of merged) {
          if (m.type === "widget") {
            const def = ALL_WIDGETS.find(w => w.key === m.key);
            if (def?.fixed) m.visible = true;
            if (!m.colSpan) m.colSpan = def?.defaultColSpan ?? 1;
          }
        }
        setCards(merged.sort((a, b) => a.order - b.order));
      } else {
        const defaultCards = getDefaultCards(role as UserRole);
        setCards(defaultCards);
        await supabase.from("user_dashboard_layout" as any).upsert({
          user_id: effectiveUserId,
          layout: defaultCards,
        } as any);
      }
      setIsLoading(false);
    };
    load();
  }, [effectiveUserId, role]);

  const saveCards = useCallback(async (newCards: DashboardCardItem[]) => {
    if (!effectiveUserId) return;
    setIsSaving(true);
    const ordered = newCards.map((item, i) => ({ ...item, order: i }));
    const { error } = await supabase
      .from("user_dashboard_layout" as any)
      .upsert({
        user_id: effectiveUserId,
        layout: ordered,
        applied_template_id: appliedTemplateId,
        dashboard_locked: dashboardLocked,
      } as any);
    if (error) {
      toast.error("Erro ao salvar layout");
    } else {
      setCards(ordered);
      toast.success("Layout salvo!");
    }
    setIsSaving(false);
  }, [effectiveUserId, appliedTemplateId, dashboardLocked]);

  const resetToDefault = useCallback(async () => {
    const defaultCards = getDefaultCards(role as UserRole);
    setAppliedTemplateId(null);
    setDashboardLocked(false);
    if (!effectiveUserId) return;
    const ordered = defaultCards.map((item, i) => ({ ...item, order: i }));
    const { error } = await supabase
      .from("user_dashboard_layout" as any)
      .upsert({
        user_id: effectiveUserId,
        layout: ordered,
        applied_template_id: null,
        dashboard_locked: false,
      } as any);
    if (error) {
      toast.error("Erro ao restaurar layout");
    } else {
      setCards(ordered);
      toast.success("Layout restaurado!");
    }
  }, [role, effectiveUserId]);

  /** Apply a template */
  const applyTemplate = useCallback(async (layout: DashboardCardItem[], templateId: string, locked: boolean) => {
    if (!effectiveUserId) return;
    setIsSaving(true);
    // Force fixed widgets visible
    const finalLayout = layout.map((c, i) => {
      const fixed = c.type === "widget" && ALL_WIDGETS.find(w => w.key === c.key)?.fixed;
      return { ...c, order: i, visible: fixed ? true : c.visible };
    });
    const { error } = await supabase
      .from("user_dashboard_layout" as any)
      .upsert({
        user_id: effectiveUserId,
        layout: finalLayout,
        applied_template_id: templateId,
        dashboard_locked: locked,
      } as any);
    if (error) {
      toast.error("Erro ao aplicar template");
    } else {
      setCards(finalLayout);
      setAppliedTemplateId(templateId);
      setDashboardLocked(locked);
    }
    setIsSaving(false);
  }, [effectiveUserId]);

  /** Add a shortcut card from menu registry */
  const addShortcut = useCallback((menuId: string) => {
    const entry = flattenRegistry().find(m => m.id === menuId);
    if (!entry) return;
    if (cards.some(c => c.key === menuId)) {
      toast.info("Este atalho já está na sua Home");
      return;
    }
    const newCard: DashboardCardItem = {
      id: `s_${menuId}`,
      type: "shortcut",
      key: menuId,
      title: entry.label,
      visible: true,
      order: cards.length,
      targetRoute: entry.route,
    };
    setCards(prev => [...prev, newCard]);
  }, [cards]);

  /** Remove a card from the layout */
  const removeCard = useCallback((key: string) => {
    setCards(prev => prev.filter(c => c.key !== key));
  }, []);

  const visibleCards = cards
    .filter(item => item.visible && isCardAvailable(item))
    .sort((a, b) => a.order - b.order);

  return {
    cards,
    setCards,
    visibleCards,
    isLoading,
    isSaving,
    saveCards,
    resetToDefault,
    isCardAvailable,
    addShortcut,
    removeCard,
    appliedTemplateId,
    dashboardLocked,
    applyTemplate,
  };
}
