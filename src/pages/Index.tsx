import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Cpu, DollarSign, Calendar, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { maintenances, tickets } from "@/data/mockData";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import heroWelcome from "@/assets/hero-welcome.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const nextMaintenance = maintenances.find(m => m.status === "agendada");
const openTickets = tickets.filter(t => t.status !== "resolvido");

interface InvoiceWithUser {
  id: string;
  amount: number;
  due_date: string;
  installment: number;
  total_installments: number;
  status: string;
  user_name: string;
  user_email: string;
}

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { userId: viewUserId } = useParams<{ userId?: string }>();

  const [viewUserName, setViewUserName] = useState<string | null>(null);
  const isViewingUser = !!viewUserId;
  const firstName = isViewingUser ? viewUserName ?? "Usuário" : (user?.name?.split(" ")[0] ?? "Usuário");

  const [totalMachines, setTotalMachines] = useState(0);
  const [openInvoices, setOpenInvoices] = useState<InvoiceWithUser[]>([]);
  const [overdueInvoices, setOverdueInvoices] = useState<InvoiceWithUser[]>([]);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showOverdueDialog, setShowOverdueDialog] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // If viewing a specific user, fetch their name
      if (viewUserId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", viewUserId)
          .single();
        setViewUserName(profile?.name?.split(" ")[0] ?? "Usuário");
      }

      // Fetch total machines (filtered if viewing a specific user)
      let machineQuery = supabase.from("machines").select("*", { count: "exact", head: true });
      if (viewUserId) machineQuery = machineQuery.eq("owner_id", viewUserId);
      const { count } = await machineQuery;
      setTotalMachines(count ?? 0);

      // Fetch invoices (filtered if viewing a specific user)
      let invoiceQuery = supabase.from("invoices").select("*");
      if (viewUserId) invoiceQuery = invoiceQuery.eq("user_id", viewUserId);
      const { data: invoices } = await invoiceQuery;

      if (invoices) {
        const today = new Date().toISOString().split("T")[0];

        const userIds = [...new Set(invoices.map(i => i.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);

        const mapInvoice = (inv: any): InvoiceWithUser => {
          const profile = profileMap.get(inv.user_id);
          return {
            id: inv.id,
            amount: inv.amount,
            due_date: inv.due_date,
            installment: inv.installment,
            total_installments: inv.total_installments,
            status: inv.status,
            user_name: profile?.name ?? "—",
            user_email: profile?.email ?? "—",
          };
        };

        setOpenInvoices(
          invoices.filter(i => i.status === "em_aberto").map(mapInvoice)
        );
        setOverdueInvoices(
          invoices
            .filter(i => i.status === "em_aberto" && i.due_date < today)
            .map(mapInvoice)
        );
      }
    };

    fetchData();
  }, [viewUserId]);

  const nextDueInvoice = openInvoices.length > 0
    ? openInvoices.reduce((a, b) => a.due_date < b.due_date ? a : b)
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Banner */}
      <div className="relative rounded-lg overflow-hidden h-40">
        <img src={heroWelcome} alt="CNC Machine" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
        <div className="absolute inset-0 flex items-center px-6">
          <div>
            {isViewingUser && (
              <button onClick={() => navigate("/usuarios")} className="text-xs text-primary hover:underline mb-1">
                ← Voltar para Usuários
              </button>
            )}
            <h1 className="text-2xl font-bold text-foreground">
              {isViewingUser ? `Dashboard de ${firstName}` : `Olá, ${firstName}`}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isViewingUser ? "Visualizando dados do usuário" : "Bem-vindo ao portal Dimension CNC"}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Máquinas Ativas"
          value={totalMachines}
          subtitle="Total cadastradas"
          icon={Cpu}
          variant="highlight"
        />
        <div
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => setShowOpenDialog(true)}
        >
          <StatCard
            title="Boletos em Aberto"
            value={openInvoices.length}
            subtitle={nextDueInvoice ? `Próx. venc. ${new Date(nextDueInvoice.due_date).toLocaleDateString("pt-BR")}` : "Nenhum"}
            icon={DollarSign}
            variant="warning"
          />
        </div>
        <div
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => setShowOverdueDialog(true)}
        >
          <StatCard
            title="Boletos em Atraso"
            value={overdueInvoices.length}
            subtitle={overdueInvoices.length > 0 ? "Requerem atenção" : "Nenhum atraso"}
            icon={AlertTriangle}
            variant={overdueInvoices.length > 0 ? "danger" : "default"}
          />
        </div>
        <div
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => navigate("/manutencao")}
        >
          <StatCard
            title="Próxima Manutenção"
            value={nextMaintenance ? new Date(nextMaintenance.date).toLocaleDateString("pt-BR") : "—"}
            subtitle={nextMaintenance ? `${nextMaintenance.machineName} • ${nextMaintenance.userName}` : undefined}
            icon={Calendar}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

      {/* Dialog: Boletos em Aberto */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Boletos em Aberto</DialogTitle>
          </DialogHeader>
          {openInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum boleto em aberto.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {openInvoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-md bg-accent/50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{inv.user_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Parcela {inv.installment}/{inv.total_installments} — Venc. {new Date(inv.due_date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-foreground ml-3 shrink-0">
                    R$ {inv.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Boletos em Atraso */}
      <Dialog open={showOverdueDialog} onOpenChange={setShowOverdueDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Boletos em Atraso</DialogTitle>
          </DialogHeader>
          {overdueInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum boleto em atraso.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {overdueInvoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-md bg-accent/50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{inv.user_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Parcela {inv.installment}/{inv.total_installments} — Venc. {new Date(inv.due_date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-destructive ml-3 shrink-0">
                    R$ {inv.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
