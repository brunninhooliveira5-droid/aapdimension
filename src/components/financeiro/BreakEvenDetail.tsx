import { useState, useEffect } from "react";
import { getBreakEvenMetrics, BreakEvenMetrics } from "@/lib/breakeven";
import { Shield, Target, TrendingUp, TrendingDown, Wallet, DollarSign } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, Legend } from "recharts";
import { Button } from "@/components/ui/button";

const fmt = (v: number) => `R$ ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

interface Props {
  onNavigate?: (section: string) => void;
}

export function BreakEvenDetail({ onNavigate }: Props) {
  const [metrics, setMetrics] = useState<BreakEvenMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBreakEvenMetrics().then(m => { setMetrics(m); setLoading(false); });
  }, []);

  if (loading) return <p className="text-muted-foreground text-sm text-center py-8">Carregando Ponto de Equilíbrio...</p>;

  if (!metrics || metrics.totalDespesasFixas <= 0) {
    return (
      <div className="gradient-card rounded-lg border border-border p-6 text-center space-y-3">
        <Target className="w-10 h-10 text-muted-foreground mx-auto" />
        <h2 className="text-lg font-semibold text-foreground">Ponto de Equilíbrio</h2>
        <p className="text-sm text-muted-foreground">
          Cadastre Contas Fixas para calcular o Ponto de Equilíbrio.
        </p>
        <Button variant="outline" onClick={() => onNavigate?.("payable")}>
          Ir para Contas Fixas
        </Button>
      </div>
    );
  }

  const m = metrics;
  const statusConfig = {
    positivo: { label: "Saudável", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", barColor: "#10b981" },
    atencao: { label: "Atenção", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", barColor: "#f59e0b" },
    critico: { label: "Crítico", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", barColor: "#ef4444" },
  };
  const sc = statusConfig[m.status];

  const chartData = [
    { name: "Receita", valor: m.receitaMensal, fill: "#10b981" },
    { name: "Desp. Fixas", valor: m.totalDespesasFixas, fill: "#f59e0b" },
    { name: "Desp. Variável", valor: m.despesaVariavel, fill: "#f97316" },
    { name: m.lucroOperacional >= 0 ? "Lucro" : "Prejuízo", valor: m.lucroOperacional, fill: m.lucroOperacional >= 0 ? "#10b981" : "#ef4444" },
  ];

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className={`gradient-card rounded-lg border ${sc.bg} p-5 space-y-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className={`w-6 h-6 ${sc.color}`} />
            <h2 className="text-lg font-bold text-foreground">Ponto de Equilíbrio</h2>
          </div>
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${sc.bg} ${sc.color}`}>{sc.label}</span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Receita vs Ponto de Equilíbrio</span>
            <span className={`font-bold ${sc.color}`}>{m.percentAtingido.toFixed(1)}%</span>
          </div>
          <div className="w-full h-4 bg-accent/40 rounded-full overflow-hidden relative">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(m.percentAtingido / 2, 100)}%`, backgroundColor: sc.barColor }}
            />
            {/* PE marker at 50% = 100% achieved */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-foreground/50" style={{ left: "50%" }} />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>R$ 0</span>
            <span>PE: {fmt(m.pontoEquilibrio)}</span>
            <span>200%</span>
          </div>
        </div>

        {/* KPIs 2x2 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Receita Mensal (3m)" value={fmt(m.receitaMensal)} icon={TrendingUp} color="text-emerald-400" />
          <KpiCard label="Despesas Fixas" value={fmt(m.totalDespesasFixas)} icon={TrendingDown} color="text-amber-400" />
          <KpiCard label="Despesa Variável" value={fmt(m.despesaVariavel)} icon={DollarSign} color="text-orange-400" />
          <KpiCard label="Ponto de Equilíbrio" value={fmt(m.pontoEquilibrio)} icon={Target} color="text-primary" />
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Saldo Caixa" value={fmt(m.saldoCaixa)} sub={m.saldoCaixa >= 0 ? "Positivo" : "Negativo"} positive={m.saldoCaixa >= 0} />
        <MetricCard label="Cobertura do Caixa" value={`${m.mesesCobertura} meses`} sub={`${m.coberturaCaixa.toFixed(1)}x custos fixos`} positive={m.mesesCobertura >= 3} />
        <MetricCard label="Lucro Operacional" value={`${m.lucroOperacional >= 0 ? "+" : "-"}${fmt(m.lucroOperacional)}`} sub="Receita - Despesa Total" positive={m.lucroOperacional >= 0} />
        <MetricCard label="Comprometimento" value={`${m.percentTotalReceita.toFixed(1)}%`} sub={`Fixo: ${m.percentFixoReceita.toFixed(1)}%`} positive={m.percentTotalReceita <= 70} />
      </div>

      {/* Chart */}
      <div className="gradient-card rounded-lg border border-border p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Comparativo Mensal</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(v: number) => fmt(v)}
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
            />
            <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: "Zero", position: "left", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <div className="rounded-lg bg-accent/30 p-3 space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function MetricCard({ label, value, sub, positive }: { label: string; value: string; sub: string; positive: boolean }) {
  return (
    <div className="gradient-card rounded-lg border border-border p-3 space-y-1">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${positive ? "text-emerald-400" : "text-red-400"}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
