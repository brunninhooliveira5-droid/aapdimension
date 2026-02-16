import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts";

interface DayProjection {
  date: string;
  label: string;
  receivable: number;
  payable: number;
  net: number;
  balance: number;
}

interface FlowEntry {
  amount: number;
  date: string;
  status: string;
}

export function CashFlow() {
  const [payables, setPayables] = useState<FlowEntry[]>([]);
  const [receivables, setReceivables] = useState<FlowEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialBalance, setInitialBalance] = useState(0);
  const [horizon, setHorizon] = useState<"30" | "60" | "90">("90");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() + 90);
    const endStr = end.toISOString().split("T")[0];

    const [{ data: pay }, { data: rec }, { data: paidRec }, { data: paidPay }] = await Promise.all([
      supabase
        .from("finance_accounts_payable")
        .select("amount, due_date, status")
        .in("status", ["aberto", "parcelado", "atrasado"])
        .lte("due_date", endStr),
      supabase
        .from("finance_accounts_receivable")
        .select("amount, expected_date, status")
        .in("status", ["aberto", "parcelado", "atrasado"])
        .lte("expected_date", endStr),
      supabase
        .from("finance_accounts_receivable")
        .select("amount")
        .eq("status", "recebido"),
      supabase
        .from("finance_accounts_payable")
        .select("amount")
        .eq("status", "pago"),
    ]);

    const totalReceived = (paidRec ?? []).reduce((s, r) => s + Number(r.amount), 0);
    const totalPaid = (paidPay ?? []).reduce((s, r) => s + Number(r.amount), 0);
    setInitialBalance(totalReceived - totalPaid);

    setPayables(
      (pay ?? []).map((p: any) => ({ amount: Number(p.amount), date: p.due_date, status: p.status }))
    );
    setReceivables(
      (rec ?? []).map((r: any) => ({ amount: Number(r.amount), date: r.expected_date, status: r.status }))
    );
    setLoading(false);
  };

  const projections = useMemo(() => {
    const days = Number(horizon);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result: DayProjection[] = [];
    let runningBalance = initialBalance;

    for (let i = 0; i <= days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      const dayReceivable = receivables
        .filter((r) => r.date === dateStr)
        .reduce((s, r) => s + r.amount, 0);

      const dayPayable = payables
        .filter((p) => p.date === dateStr)
        .reduce((s, p) => s + p.amount, 0);

      runningBalance += dayReceivable - dayPayable;

      result.push({
        date: dateStr,
        label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
        receivable: dayReceivable,
        payable: dayPayable,
        net: dayReceivable - dayPayable,
        balance: runningBalance,
      });
    }

    return result;
  }, [payables, receivables, initialBalance, horizon]);

  const summaryAt = (days: number) => {
    const slice = projections.slice(0, days + 1);
    if (slice.length === 0) return { totalIn: 0, totalOut: 0, endBalance: initialBalance, minBalance: initialBalance, negDays: 0 };
    const totalIn = slice.reduce((s, d) => s + d.receivable, 0);
    const totalOut = slice.reduce((s, d) => s + d.payable, 0);
    const endBalance = slice[slice.length - 1]?.balance ?? initialBalance;
    const minBalance = Math.min(...slice.map((d) => d.balance));
    const negDays = slice.filter((d) => d.balance < 0).length;
    return { totalIn, totalOut, endBalance, minBalance, negDays };
  };

  const s30 = summaryAt(30);
  const s60 = summaryAt(60);
  const s90 = summaryAt(90);

  const negativeAlerts = useMemo(() => {
    const alerts: { start: string; end: string; minValue: number }[] = [];
    let inNeg = false;
    let start = "";
    let min = 0;

    for (const p of projections) {
      if (p.balance < 0) {
        if (!inNeg) {
          inNeg = true;
          start = p.label;
          min = p.balance;
        } else {
          min = Math.min(min, p.balance);
        }
      } else if (inNeg) {
        alerts.push({ start, end: projections[projections.indexOf(p) - 1]?.label ?? p.label, minValue: min });
        inNeg = false;
      }
    }
    if (inNeg) {
      alerts.push({ start, end: projections[projections.length - 1].label, minValue: min });
    }
    return alerts;
  }, [projections]);

  const fmt = (v: number) =>
    `R$ ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const fmtSigned = (v: number) =>
    `${v < 0 ? "- " : ""}R$ ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  if (loading) {
    return <p className="text-sm text-muted-foreground p-4 text-center">Carregando fluxo de caixa...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Negative Balance Alerts */}
      {negativeAlerts.length > 0 && (
        <div className="space-y-2">
          {negativeAlerts.map((alert, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-lg border border-destructive/50 bg-destructive/10"
            >
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div className="text-sm">
                <span className="font-semibold text-destructive">Alerta de caixa negativo</span>
                <p className="text-muted-foreground mt-0.5">
                  Período de <strong>{alert.start}</strong> a <strong>{alert.end}</strong> —
                  Saldo mínimo projetado: <strong className="text-destructive">{fmtSigned(alert.minValue)}</strong>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Projection Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "30 Dias", data: s30 },
          { label: "60 Dias", data: s60 },
          { label: "90 Dias", data: s90 },
        ].map(({ label, data }) => (
          <Card key={label} className="gradient-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Saldo Final</span>
                <span className={`text-lg font-bold ${data.endBalance >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                  {fmtSigned(data.endBalance)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-emerald-400">
                  <ArrowUpCircle className="w-3 h-3" /> Entradas
                </span>
                <span>{fmt(data.totalIn)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-red-400">
                  <ArrowDownCircle className="w-3 h-3" /> Saídas
                </span>
                <span>{fmt(data.totalOut)}</span>
              </div>
              {data.negDays > 0 && (
                <div className="flex items-center gap-1 text-xs text-destructive mt-1">
                  <AlertTriangle className="w-3 h-3" />
                  {data.negDays} dia(s) com saldo negativo
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="gradient-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Projeção de Saldo</CardTitle>
          <Select value={horizon} onValueChange={(v) => setHorizon(v as "30" | "60" | "90")}>
            <SelectTrigger className="w-[120px] h-8 text-xs bg-accent border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="60">60 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projections} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="balanceGradientPos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  interval="preserveStartEnd"
                  tickCount={8}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) =>
                    `${v < 0 ? "-" : ""}${Math.abs(v) >= 1000 ? `${(Math.abs(v) / 1000).toFixed(0)}k` : Math.abs(v)}`
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      balance: "Saldo",
                      receivable: "Entradas",
                      payable: "Saídas",
                    };
                    return [fmtSigned(value), labels[name] || name];
                  }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="4 4" strokeOpacity={0.7} />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(var(--chart-2))"
                  fill="url(#balanceGradientPos)"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Daily Breakdown */}
      <Card className="gradient-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Movimentações Diárias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-medium text-muted-foreground">Data</th>
                  <th className="text-right p-2 font-medium text-emerald-400">Entradas</th>
                  <th className="text-right p-2 font-medium text-red-400">Saídas</th>
                  <th className="text-right p-2 font-medium text-muted-foreground">Líquido</th>
                  <th className="text-right p-2 font-medium text-muted-foreground">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {projections
                  .filter((d) => d.receivable > 0 || d.payable > 0)
                  .map((d) => (
                    <tr key={d.date} className="hover:bg-accent/20 transition-colors">
                      <td className="p-2 font-medium">{d.label}</td>
                      <td className="p-2 text-right text-emerald-400">
                        {d.receivable > 0 ? fmt(d.receivable) : "—"}
                      </td>
                      <td className="p-2 text-right text-red-400">
                        {d.payable > 0 ? fmt(d.payable) : "—"}
                      </td>
                      <td className={`p-2 text-right font-medium ${d.net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {fmtSigned(d.net)}
                      </td>
                      <td className={`p-2 text-right font-semibold ${d.balance >= 0 ? "text-foreground" : "text-destructive"}`}>
                        {fmtSigned(d.balance)}
                      </td>
                    </tr>
                  ))}
                {projections.filter((d) => d.receivable > 0 || d.payable > 0).length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      Nenhuma movimentação projetada no período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
