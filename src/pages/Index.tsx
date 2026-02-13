import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Cpu, DollarSign, Calendar, AlertTriangle, Database } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { machines, financialSummary, maintenances, tickets } from "@/data/mockData";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import heroWelcome from "@/assets/hero-welcome.png";

const activeMachines = machines.filter(m => m.status === "active").length;
const nextMaintenance = maintenances.find(m => m.status === "agendada");
const openTickets = tickets.filter(t => t.status !== "resolvido");

const Index = () => {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "Usuário";
  const isAdmin = user?.role === "admin_master";
  const [totalMachines, setTotalMachines] = useState<number>(0);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from("machines").select("id", { count: "exact", head: true }).then(({ count }) => {
      setTotalMachines(count ?? 0);
    });
  }, [isAdmin]);
  const navigate = useNavigate();
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Banner */}
      <div className="relative rounded-lg overflow-hidden h-40">
        <img src={heroWelcome} alt="CNC Machine" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
        <div className="absolute inset-0 flex items-center px-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Olá, {firstName}</h1>
            <p className="text-sm text-muted-foreground mt-1">Bem-vindo ao portal Dimension CNC</p>
          </div>
        </div>
      </div>

      {/* Admin Card */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Máquinas Cadastradas"
            value={totalMachines}
            subtitle="Total no sistema"
            icon={Database}
            variant="highlight"
          />
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Máquinas Ativas"
          value={activeMachines}
          subtitle={`${machines.length} total`}
          icon={Cpu}
          variant="highlight"
        />
        <StatCard
          title="Próximo Boleto"
          value={`R$ ${financialSummary.nextDueValue.toLocaleString("pt-BR")}`}
          subtitle={`Vence em ${new Date(financialSummary.nextDueDate).toLocaleDateString("pt-BR")}`}
          icon={DollarSign}
        />
        <div
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => navigate("/maintenance")}
        >
          <StatCard
            title="Próxima Manutenção"
            value={nextMaintenance ? new Date(nextMaintenance.date).toLocaleDateString("pt-BR") : "—"}
            subtitle={nextMaintenance ? `${nextMaintenance.machineName} • ${nextMaintenance.userName}` : undefined}
            icon={Calendar}
          />
        </div>
        <StatCard
          title="Chamados Abertos"
          value={openTickets.length}
          subtitle={openTickets.length > 0 ? "Requerem atenção" : "Tudo em dia"}
          icon={AlertTriangle}
          variant={openTickets.length > 0 ? "warning" : "default"}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tickets */}
        <div className="gradient-card rounded-lg border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Chamados Recentes</h3>
          <div className="space-y-3">
            {tickets.slice(0, 3).map(ticket => (
              <div key={ticket.id} className="flex items-center justify-between p-3 rounded-md bg-accent/50">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{ticket.machineName}</p>
                  <p className="text-xs text-muted-foreground truncate">{ticket.type} — {ticket.description}</p>
                </div>
                <StatusBadge status={ticket.status} className="ml-3 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Maintenances */}
        <div className="gradient-card rounded-lg border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Manutenções Próximas</h3>
          <div className="space-y-3">
            {maintenances.filter(m => m.status === "agendada").map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-md bg-accent/50">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{m.machineName}</p>
                  <p className="text-xs text-muted-foreground">{m.type} — {new Date(m.date).toLocaleDateString("pt-BR")}</p>
                </div>
                <StatusBadge status={m.status} className="ml-3 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
