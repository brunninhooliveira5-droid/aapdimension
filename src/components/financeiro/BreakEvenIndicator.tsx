import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Shield, TrendingUp } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const fmt = (v: number) => `R$ ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export function BreakEvenIndicator() {
  const [currentBalance, setCurrentBalance] = useState(0);
  const [fixedMonthlyCosts, setFixedMonthlyCosts] = useState(0);
  const [futureReceivables, setFutureReceivables] = useState(0);
  const [futurePayables, setFuturePayables] = useState(0);
  const [showProjected, setShowProjected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const today = new Date();
      const end90 = new Date(today);
      end90.setDate(end90.getDate() + 90);
      const endStr = end90.toISOString().split("T")[0];

      const [{ data: paidRec }, { data: paidPay }, { data: fixedExp }, { data: futRec }, { data: futPay }] = await Promise.all([
        supabase.from("finance_accounts_receivable").select("amount").eq("status", "recebido"),
        supabase.from("finance_accounts_payable").select("amount").eq("status", "pago"),
        supabase.from("finance_fixed_expenses").select("monthly_value").eq("is_active", true),
        supabase.from("finance_accounts_receivable").select("amount").in("status", ["aberto", "parcelado", "atrasado"]).lte("expected_date", endStr),
        supabase.from("finance_accounts_payable").select("amount").in("status", ["aberto", "parcelado", "atrasado"]).lte("due_date", endStr),
      ]);
      const totalRec = (paidRec ?? []).reduce((s, r) => s + Number(r.amount), 0);
      const totalPaid = (paidPay ?? []).reduce((s, r) => s + Number(r.amount), 0);
      setCurrentBalance(totalRec - totalPaid);
      setFixedMonthlyCosts((fixedExp ?? []).reduce((s, f) => s + Number(f.monthly_value), 0));
      setFutureReceivables((futRec ?? []).reduce((s, r) => s + Number(r.amount), 0));
      setFuturePayables((futPay ?? []).reduce((s, r) => s + Number(r.amount), 0));
      setLoading(false);
    };
    fetch();
  }, []);

  const conservativeRunway = fixedMonthlyCosts > 0 ? currentBalance / fixedMonthlyCosts : Infinity;
  const netMonthlyFlow = (futureReceivables - futurePayables) / 3; // avg over 3 months
  const projectedRunway = fixedMonthlyCosts > 0
    ? (fixedMonthlyCosts - netMonthlyFlow > 0
      ? currentBalance / (fixedMonthlyCosts - netMonthlyFlow)
      : Infinity)
    : Infinity;

  const activeRunway = showProjected ? projectedRunway : conservativeRunway;

  const statusColor = activeRunway >= 3 ? "text-emerald-400" : activeRunway >= 1 ? "text-amber-400" : "text-red-400";
  const statusBg = activeRunway >= 3 ? "bg-emerald-500/10 border-emerald-500/30" : activeRunway >= 1 ? "bg-amber-500/10 border-amber-500/30" : "bg-red-500/10 border-red-500/30";
  const statusLabel = activeRunway >= 3 ? "Saudável" : activeRunway >= 1 ? "Atenção" : "Crítico";

  const projData = useMemo(() => {
    if (fixedMonthlyCosts <= 0) return [];
    const data = [];
    let bal = currentBalance;
    const monthlyDrain = showProjected ? Math.max(fixedMonthlyCosts - netMonthlyFlow, 0) : fixedMonthlyCosts;
    const months = monthlyDrain > 0 ? Math.min(Math.ceil(currentBalance / monthlyDrain) + 2, 24) : 12;
    for (let i = 0; i <= months; i++) {
      data.push({ mes: i === 0 ? "Atual" : `M${i}`, saldo: Math.round(bal) });
      bal -= monthlyDrain;
    }
    return data;
  }, [currentBalance, fixedMonthlyCosts, netMonthlyFlow, showProjected]);

  if (loading) return null;
  if (fixedMonthlyCosts <= 0) return null;

  return (
    <div className={`gradient-card rounded-lg border ${statusBg} p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className={`w-5 h-5 ${statusColor}`} />
          <h3 className="text-sm font-semibold text-foreground">Ponto de Equilíbrio</h3>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBg} ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={showProjected} onCheckedChange={setShowProjected} className="scale-75" />
        <Label className="text-[10px] text-muted-foreground">
          {showProjected ? "Runway Projetado (c/ receitas)" : "Runway Conservador (só fixos)"}
        </Label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Caixa Atual</p>
          <p className={`text-lg font-bold ${currentBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(currentBalance)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Custos Fixos/mês</p>
          <p className="text-lg font-bold text-foreground">{fmt(fixedMonthlyCosts)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Runway</p>
          <p className={`text-lg font-bold ${statusColor}`}>
            {activeRunway === Infinity ? "∞" : `${Math.floor(activeRunway)} meses`}
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {activeRunway === Infinity
          ? "Sem custos fixos cadastrados."
          : showProjected
            ? `Considerando receitas futuras (~${fmt(netMonthlyFlow)}/mês), seu caixa cobre ${Math.floor(activeRunway)} meses.`
            : `Seu caixa atual cobre ${Math.floor(activeRunway)} meses de custos fixos (visão conservadora, sem receitas variáveis).`
        }
      </p>

      {projData.length > 0 && (
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="saldo" stroke={activeRunway >= 3 ? "#10b981" : activeRunway >= 1 ? "#f59e0b" : "#ef4444"} fill={activeRunway >= 3 ? "#10b981" : activeRunway >= 1 ? "#f59e0b" : "#ef4444"} fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
