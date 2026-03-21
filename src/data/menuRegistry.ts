import {
  Home, Cpu, Headphones, Calendar, Settings, Users, ShoppingBag,
  Package, Newspaper, Calculator, FolderOpen, Receipt, Landmark,
  Activity, Building2, Factory, FileText, Wrench, BarChart3,
  ClipboardList, Box, Truck, ShieldCheck, DollarSign, CreditCard,
  PiggyBank, TrendingUp, BookOpen, Layers, LayoutGrid, Target,
  Clock, Briefcase, Presentation, type LucideIcon,
} from "lucide-react";

export interface MenuRegistryItem {
  id: string;
  label: string;
  route: string;
  icon: LucideIcon;
  /** Permission key – must pass hasAccess(section) */
  section: string;
  /** Pro feature key – must pass hasProAccess(feature) */
  proFeature?: string;
  children?: MenuRegistryItem[];
}

/**
 * Centralised menu tree used by the sidebar AND the dashboard shortcut library.
 * Each item has a unique `id` (used as card key) and a `section` for permission checks.
 */
export const MENU_REGISTRY: MenuRegistryItem[] = [
  {
    id: "nav_home",
    label: "Home",
    route: "/",
    icon: Home,
    section: "home",
  },
  {
    id: "nav_dimension",
    label: "Dimension",
    route: "/dimension",
    icon: Building2,
    section: "dimension",
    children: [
      { id: "nav_dimension_overview", label: "Visão Geral", route: "/dimension", icon: LayoutGrid, section: "dimension" },
      { id: "nav_dimension_tasks", label: "Tarefas", route: "/dimension?tab=tarefas", icon: ClipboardList, section: "dimension" },
      { id: "nav_dimension_routines", label: "Rotinas", route: "/dimension?tab=rotinas", icon: Clock, section: "dimension" },
      { id: "nav_dimension_goals", label: "Metas", route: "/dimension?tab=metas", icon: Target, section: "dimension" },
      { id: "nav_dimension_production", label: "Produção", route: "/dimension?tab=producao", icon: Factory, section: "dimension" },
      { id: "nav_dimension_schedule", label: "Agenda", route: "/dimension?tab=agenda", icon: Calendar, section: "dimension" },
      { id: "nav_dimension_pendencies", label: "Pendências", route: "/dimension?tab=pendencias", icon: Briefcase, section: "dimension" },
      { id: "nav_dimension_docs", label: "Documentação", route: "/dimension?tab=documentacao", icon: FileText, section: "dimension" },
      { id: "nav_dimension_inventory", label: "Estoque", route: "/dimension?tab=estoque", icon: Box, section: "dimension" },
    ],
  },
  {
    id: "nav_machines",
    label: "Minhas Máquinas",
    route: "/maquinas",
    icon: Cpu,
    section: "maquinas",
  },
  {
    id: "nav_support",
    label: "Suporte",
    route: "/suporte",
    icon: Headphones,
    section: "suporte",
  },
  {
    id: "nav_maintenance",
    label: "Manutenção",
    route: "/manutencao",
    icon: Calendar,
    section: "manutencao",
  },
  {
    id: "nav_equipment",
    label: "Equipamentos Dimension",
    route: "/equipamentos",
    icon: Package,
    section: "equipamentos",
  },
  {
    id: "nav_parts",
    label: "Peças e Acessórios",
    route: "/pecas",
    icon: ShoppingBag,
    section: "pecas",
  },
  {
    id: "nav_invoices",
    label: "Faturas",
    route: "/boletos",
    icon: Receipt,
    section: "financeiro",
  },
  {
    id: "nav_cutting_quote",
    label: "Orçamento de Corte",
    route: "/orcamento",
    icon: Calculator,
    section: "orcamento",
  },
  {
    id: "nav_production_control",
    label: "Controle de Produção",
    route: "/controle-producao",
    icon: Factory,
    section: "controle_producao",
    children: [
      { id: "nav_pc_overview", label: "Visão Geral", route: "/controle-producao", icon: LayoutGrid, section: "controle_producao" },
      { id: "nav_pc_tasks", label: "Tarefas", route: "/controle-producao?tab=tarefas", icon: ClipboardList, section: "controle_producao" },
      { id: "nav_pc_production", label: "Produção", route: "/controle-producao?tab=producao", icon: Factory, section: "controle_producao" },
      { id: "nav_pc_inventory", label: "Estoque/Produção", route: "/controle-producao?tab=estoque", icon: Box, section: "controle_producao" },
    ],
  },
  {
    id: "nav_bulletins",
    label: "Boletins Técnicos",
    route: "/boletins",
    icon: Newspaper,
    section: "boletins",
  },
  {
    id: "nav_files",
    label: "Arquivos",
    route: "/arquivos",
    icon: FolderOpen,
    section: "arquivos",
  },
  {
    id: "nav_company_users",
    label: "Colaboradores",
    route: "/empresa/usuarios",
    icon: Users,
    section: "empresa",
  },
  {
    id: "nav_settings",
    label: "Configurações",
    route: "/configuracoes",
    icon: Settings,
    section: "configuracoes",
  },
  {
    id: "nav_users",
    label: "Usuários",
    route: "/usuarios",
    icon: Users,
    section: "usuarios",
  },
  {
    id: "nav_engagement",
    label: "Engajamento",
    route: "/engajamento",
    icon: Activity,
    section: "usuarios",
  },
  {
    id: "nav_finance",
    label: "Gerenciador Financeiro",
    route: "/gestao-financeira",
    icon: Landmark,
    section: "gestao_financeira",
    proFeature: "gestao_financeira",
    children: [
      { id: "nav_finance_dashboard", label: "Dashboard Financeiro", route: "/gestao-financeira", icon: BarChart3, section: "gestao_financeira", proFeature: "gestao_financeira" },
      { id: "nav_finance_payable", label: "Contas a Pagar", route: "/gestao-financeira?tab=pagar", icon: CreditCard, section: "gestao_financeira", proFeature: "gestao_financeira" },
      { id: "nav_finance_receivable", label: "Contas a Receber", route: "/gestao-financeira?tab=receber", icon: DollarSign, section: "gestao_financeira", proFeature: "gestao_financeira" },
      { id: "nav_finance_fixed", label: "Despesas Fixas", route: "/gestao-financeira?tab=fixas", icon: PiggyBank, section: "gestao_financeira", proFeature: "gestao_financeira" },
      { id: "nav_finance_cashflow", label: "Fluxo de Caixa", route: "/gestao-financeira?tab=fluxo", icon: TrendingUp, section: "gestao_financeira", proFeature: "gestao_financeira" },
    ],
  },
  {
    id: "nav_showcase",
    label: "Apresentação",
    route: "/apresentacao",
    icon: Presentation,
    section: "home",
  },
];

/** Flatten the tree into a flat list (parent + children) */
export function flattenRegistry(items: MenuRegistryItem[] = MENU_REGISTRY): MenuRegistryItem[] {
  const result: MenuRegistryItem[] = [];
  for (const item of items) {
    result.push(item);
    if (item.children) {
      result.push(...item.children);
    }
  }
  return result;
}
