import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Shield, TrendingDown } from "lucide-react";

const fmt = (v: number) => `R$ ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export function BreakEvenIndicator() {
  const [currentBalance, setCurrentBalance] = useState(0);
  const [fixedMonthlyCosts, setFixedMonthlyCosts] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: paidRec }, { data: paidPay }, { data: fixedExp }] = await Promise.all([
        supabase.from("finance_accounts_receivable").select("amount").eq("status", "recebido"),
        supabase.from("finance_accounts_payable").select("amount").eq("status", "pago"),
        supabase.from("finance_fixed_expenses").select("monthly_value").eq("is_active", true),
      ]);
      const totalRec = (paidRec ?? []).reduce((s, r) => s + Number(r.amount), 0);
      const totalPaid = (paidPay ?? []).reduce((s, r) => s + Number(r.amount), 0);
      setCurrentBalance(totalRec - totalPaid);
      setFixedMonthlyCosts((fixedExp ?? []).reduce((s, f) => s + Number(f.monthly_value), 0));
      setLoading(false);
    };
    fetch();
  }, []);

  const runwayMonths = fixedMonthlyCosts > 0 ? currentBalance / fixedMonthlyCosts : Infinity;

  const statusColor = runwayMonths >= 3 ? "text-emerald-400" : runwayMonths >= 1 ? "text-amber-400" : "text-red-400";
  const statusBg = runwayMonths >= 3 ? "bg-emerald-500/10 border-emerald-500/30" : runwayMonths >= 1 ? "bg-amber-500/10 border-amber-500/30" : "bg-red-500/10 border-red-500/30";
  const statusLabel = runwayMonths >= 3 ? "Saudável" : runwayMonths >= 1 ? "Atenção" : "Crítico";

  const projData = useMemo(() => {
    if (fixedMonthlyCosts <= 0) return [];
    const data = [];
    let bal = currentBalance;
    const months = Math.min(Math.ceil(runwayMonths) + 2, 24);
    for (let i = 0; i <= months; i++) {
      data.push({ mes: i === 0 ? "Atual" : `M${i}`, saldo: Math.round(bal) });
      bal -= fixedMonthlyCosts;
    }
    return data;
  }, [currentBalance, fixedMonthlyCosts, runwayMonths]);

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
            {runwayMonths === Infinity ? "∞" : `${Math.floor(runwayMonths)} meses`}
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {runwayMonths === Infinity
          ? "Sem custos fixos cadastrados."
          : `Seu caixa atual cobre ${Math.floor(runwayMonths)} meses de custos fixos (visão conservadora, sem receitas variáveis).`
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
              <Area type="monotone" dataKey="saldo" stroke={runwayMonths >= 3 ? "#10b981" : runwayMonths >= 1 ? "#f59e0b" : "#ef4444"} fill={runwayMonths >= 3 ? "#10b981" : runwayMonths >= 1 ? "#f59e0b" : "#ef4444"} fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
