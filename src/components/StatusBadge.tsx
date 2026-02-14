import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Ativa", className: "bg-success/15 text-success border-success/30" },
  maintenance: { label: "Em Manutenção", className: "bg-warning/15 text-warning border-warning/30" },
  inactive: { label: "Inativa", className: "bg-destructive/15 text-destructive border-destructive/30" },
  aberto: { label: "Aberto", className: "bg-info/15 text-info border-info/30" },
  em_andamento: { label: "Em Andamento", className: "bg-warning/15 text-warning border-warning/30" },
  resolvido: { label: "Resolvido", className: "bg-success/15 text-success border-success/30" },
  agendada: { label: "Agendada", className: "bg-info/15 text-info border-info/30" },
  pendente: { label: "Pendente", className: "bg-warning/15 text-warning border-warning/30" },
  aguardando_aprovacao: { label: "Aguardando Aprovação", className: "bg-info/15 text-info border-info/30" },
  aguardando_agendamento: { label: "Aguardando Agendamento", className: "bg-muted text-muted-foreground border-muted" },
  realizada: { label: "Realizada", className: "bg-success/15 text-success border-success/30" },
  pago: { label: "Pago", className: "bg-success/15 text-success border-success/30" },
  em_aberto: { label: "Em Aberto", className: "bg-warning/15 text-warning border-warning/30" },
  atrasado: { label: "Atrasado", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", config.className, className)}>
      {config.label}
    </span>
  );
}
