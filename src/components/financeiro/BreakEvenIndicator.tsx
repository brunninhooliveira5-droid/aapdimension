import { useState, useEffect } from "react";
import { getBreakEvenMetrics, BreakEvenMetrics } from "@/lib/breakeven";
import { Shield, ArrowRight, TrendingUp, TrendingDown, Wallet, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const fmt = (v: number) => `R$ ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

interface Props {
  onNavigate?: (section: string) => void;
}

export function BreakEvenIndicator({ onNavigate }: Props) {
  const [metrics, setMetrics] = useState<BreakEvenMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBreakEvenMetrics().then(m => { setMetrics(m); setLoading(false); });
  }, []);

  if (loading) return null;

  // Empty state
  if (!metrics || metrics.totalDespesasFixas <= 0) {
    return (
      <div className="gradient-card rounded-lg border border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Ponto de Equilíbrio</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Cadastre Contas Fixas para calcular o Ponto de Equilíbrio.
        </p>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onNavigate?.("payable")}>
          <ArrowRight className="w-3.5 h-3.5" /> Ir para Contas Fixas
        </Button>
      </div>
    );
  }

  const m = metrics;
  const statusConfig = {
    positivo: { label: "Saudável", color: "text-success", bg: "bg-success/10 border-success/30", barColor: "bg-success" },
    atencao: { label: "Atenção", color: "text-warning", bg: "bg-warning/10 border-warning/30", barColor: "bg-warning" },
    critico: { label: "Crítico", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30", barColor: "bg-destructive" },
    sem_receita: { label: "Sem Receita", color: "text-info", bg: "bg-info/10 border-info/30", barColor: "bg-info/30" },
  };
  const sc = statusConfig[m.status];
  const isSemReceita = m.status === "sem_receita";

  return (
    <div className={`gradient-card rounded-lg border ${sc.bg} p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className={`w-5 h-5 ${sc.color}`} />
          <h3 className="text-sm font-semibold text-foreground">Ponto de Equilíbrio</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>{sc.label}</span>
          <Button size="sm" variant="ghost" className="gap-1 text-xs h-7" onClick={() => onNavigate?.("breakeven-detail")}>
            Ver detalhes <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Sem receita alert */}
      {isSemReceita && (
        <p className="text-xs text-info bg-info/5 rounded px-2 py-1.5">
          Não é possível atingir o ponto de equilíbrio sem faturamento.
        </p>
      )}

      {/* Progress bar - Saúde Operacional */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Saúde Operacional – % Atingido do PE</span>
          <span className={`font-semibold ${sc.color}`}>{isSemReceita ? "N/A" : `${m.percentAtingido.toFixed(1)}%`}</span>
        </div>
        <div className="w-full h-2.5 bg-accent/40 rounded-full overflow-hidden">
          {!isSemReceita && (
            <div
              className={`h-full rounded-full transition-all ${sc.barColor}`}
              style={{ width: `${Math.min(m.percentAtingido, 100)}%` }}
            />
          )}
        </div>
      </div>

      {/* KPIs grid */}
      <div className="space-y-1.5">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Saúde Operacional</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <KpiMini label="Receita Mensal" value={fmt(m.receitaMensal)} icon={TrendingUp} positive={m.receitaMensal > 0} />
          <KpiMini label="Desp. Fixas" value={fmt(m.totalDespesasFixas)} icon={TrendingDown} />
          <KpiMini label="Desp. Variável" value={fmt(m.despesaVariavel)} icon={TrendingDown} />
          <KpiMini label="PE (R$)" value={isSemReceita ? "N/A" : fmt(m.pontoEquilibrio)} icon={Target} />
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Liquidez</p>
        <div className="grid grid-cols-2 gap-2">
          <KpiMini label="Saldo Caixa" value={fmt(m.saldoCaixa)} icon={Wallet} positive={m.saldoCaixa > 0} />
          <KpiMini label="Cobertura" value={`${m.mesesCobertura} meses`} icon={Wallet} positive={m.mesesCobertura >= 3} />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Lucro Operacional: <span className={m.lucroOperacional >= 0 && !isSemReceita ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
            {isSemReceita ? "N/A" : `${m.lucroOperacional >= 0 ? "+" : "-"}${fmt(m.lucroOperacional)}`}
          </span>
        </span>
        <span className="text-muted-foreground">
          Comprometimento: <span className={`font-semibold ${isSemReceita ? "text-muted-foreground" : m.percentTotalReceita <= 70 ? "text-emerald-400" : m.percentTotalReceita <= 90 ? "text-amber-400" : "text-red-400"}`}>
            {isSemReceita ? "N/A" : `${m.percentTotalReceita.toFixed(1)}%`}
          </span>
        </span>
      </div>
    </div>
  );
}

function KpiMini({ label, value, icon: Icon, positive }: { label: string; value: string; icon: any; positive?: boolean }) {
  return (
    <div className="rounded-md bg-accent/30 p-2 text-center">
      <div className="flex items-center justify-center gap-1 mb-0.5">
        <Icon className={`w-3 h-3 ${positive ? "text-emerald-400" : "text-muted-foreground"}`} />
      </div>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground leading-tight">{label}</p>
      <p className="text-xs font-bold text-foreground mt-0.5">{value}</p>
    </div>
  );
}
