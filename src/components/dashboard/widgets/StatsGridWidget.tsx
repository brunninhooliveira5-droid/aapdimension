import { Cpu, DollarSign, Calendar, AlertTriangle, Scissors } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { useNavigate } from "react-router-dom";

interface Props {
  isAdminMaster: boolean;
  isViewingUser: boolean;
  totalMachines: number;
  openInvoicesCount: number;
  overdueInvoicesCount: number;
  nextDueDate: string | null;
  nextMaintenanceDate: string | null;
  nextMaintenanceInfo: string | null;
  pendingServiceQuotes: number;
  onShowOpen: () => void;
  onShowOverdue: () => void;
}

export function StatsGridWidget({
  isAdminMaster, isViewingUser, totalMachines,
  openInvoicesCount, overdueInvoicesCount, nextDueDate,
  nextMaintenanceDate, nextMaintenanceInfo, pendingServiceQuotes,
  onShowOpen, onShowOverdue,
}: Props) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {isAdminMaster && (
        <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => navigate("/maquinas")}>
          <StatCard title="Máquinas Ativas" value={totalMachines} subtitle="Total cadastradas" icon={Cpu} variant="highlight" />
        </div>
      )}
      <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={onShowOpen}>
        <StatCard title="Faturas em Aberto" value={openInvoicesCount}
          subtitle={nextDueDate ? `Próx. venc. ${nextDueDate}` : "Nenhum"}
          icon={DollarSign} variant="warning" />
      </div>
      <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={onShowOverdue}>
        <StatCard title="Faturas em Atraso" value={overdueInvoicesCount}
          subtitle={overdueInvoicesCount > 0 ? "Requerem atenção" : "Nenhum atraso"}
          icon={AlertTriangle} variant={overdueInvoicesCount > 0 ? "danger" : "default"} />
      </div>
      <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => navigate("/manutencao")}>
        <StatCard title="Próxima Manutenção" value={nextMaintenanceDate ?? "—"}
          subtitle={nextMaintenanceInfo ?? undefined} icon={Calendar} />
      </div>
      {isAdminMaster && !isViewingUser && (
        <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => navigate("/orcamento?tab=clients")}>
          <StatCard title="Serviços de Corte" value={pendingServiceQuotes}
            subtitle={pendingServiceQuotes > 0 ? "Pendentes de finalização" : "Todos finalizados"}
            icon={Scissors} variant={pendingServiceQuotes > 0 ? "warning" : "default"} />
        </div>
      )}
    </div>
  );
}
