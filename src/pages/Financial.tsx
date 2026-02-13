import { DollarSign, TrendingUp, Clock, AlertTriangle, Download, RefreshCw } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { financialSummary, invoices } from "@/data/mockData";
import { toast } from "sonner";

const Financial = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground mt-1">Resumo financeiro e boletos</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Contratado" value={`R$ ${financialSummary.totalContracted.toLocaleString("pt-BR")}`} icon={DollarSign} />
        <StatCard title="Total Pago" value={`R$ ${financialSummary.totalPaid.toLocaleString("pt-BR")}`} icon={TrendingUp} variant="highlight" />
        <StatCard title="Em Aberto" value={`R$ ${financialSummary.pending.toLocaleString("pt-BR")}`} icon={Clock} variant="warning" />
        <StatCard title="Em Atraso" value={`R$ ${financialSummary.overdue.toLocaleString("pt-BR")}`} icon={AlertTriangle} variant={financialSummary.overdue > 0 ? "danger" : "default"} />
      </div>

      {/* Invoices Table */}
      <div className="gradient-card rounded-lg border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Parcelas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Parcela</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Valor</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Vencimento</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Status</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="p-4 text-sm font-mono text-foreground">{inv.number}/{invoices.length}</td>
                  <td className="p-4 text-sm font-medium text-foreground">R$ {inv.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  <td className="p-4 text-sm text-muted-foreground">{new Date(inv.dueDate).toLocaleDateString("pt-BR")}</td>
                  <td className="p-4"><StatusBadge status={inv.status} /></td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => toast.success("Boleto baixado!")}>
                        <Download className="w-3.5 h-3.5" /> Baixar
                      </Button>
                      {inv.status !== "pago" && (
                        <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => toast.success("Boleto reemitido!")}>
                          <RefreshCw className="w-3.5 h-3.5" /> Reemitir
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Financial;
