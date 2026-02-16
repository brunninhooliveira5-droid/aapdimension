import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, ArrowUpCircle, ArrowDownCircle, Pencil, Check, X, Wallet, FileDown } from "lucide-react";
import { generateCashFlowPdf } from "@/lib/cashflow-pdf";
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

interface FixedExpense {
  monthly_value: number;
  due_day: number;
}

export function CashFlow() {
  const [payables, setPayables] = useState<FlowEntry[]>([]);
  const [receivables, setReceivables] = useState<FlowEntry[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculatedBalance, setCalculatedBalance] = useState(0);
  const [manualBalance, setManualBalance] = useState<string>("");
  const [useManual, setUseManual] = useState(false);
  const [editingBalance, setEditingBalance] = useState(false);
  const [horizon, setHorizon] = useState<"30" | "60" | "90">("90");

  const initialBalance = useManual && manualBalance !== "" ? parseFloat(manualBalance.replace(",", ".")) || 0 : calculatedBalance;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() + 90);
    const endStr = end.toISOString().split("T")[0];

    const [{ data: pay }, { data: rec }, { data: paidRec }, { data: paidPay }, { data: fixed }] = await Promise.all([
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
      supabase
        .from("finance_fixed_expenses")
        .select("monthly_value, due_day")
        .eq("is_active", true),
    ]);

    const totalReceived = (paidRec ?? []).reduce((s, r) => s + Number(r.amount), 0);
    const totalPaid = (paidPay ?? []).reduce((s, r) => s + Number(r.amount), 0);
    setCalculatedBalance(totalReceived - totalPaid);

    setPayables(
      (pay ?? []).map((p: any) => ({ amount: Number(p.amount), date: p.due_date, status: p.status }))
    );
    setReceivables(
      (rec ?? []).map((r: any) => ({ amount: Number(r.amount), date: r.expected_date, status: r.status }))
    );
    setFixedExpenses(
      (fixed ?? []).map((f: any) => ({ monthly_value: Number(f.monthly_value), due_day: Number(f.due_day) }))
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
      const dayOfMonth = d.getDate();
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(dayOfMonth).padStart(2, "0")}`;

      const dayReceivable = receivables
        .filter((r) => r.date === dateStr)
        .reduce((s, r) => s + r.amount, 0);

      let dayPayable = payables
        .filter((p) => p.date === dateStr)
        .reduce((s, p) => s + p.amount, 0);

      // Add fixed expenses on their due day
      for (const fe of fixedExpenses) {
        if (dayOfMonth === fe.due_day) {
          dayPayable += fe.monthly_value;
        }
      }

      runningBalance += dayReceivable - dayPayable;

      result.push({
        date: dateStr,
        label: `${String(dayOfMonth).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
        receivable: dayReceivable,
        payable: dayPayable,
        net: dayReceivable - dayPayable,
        balance: runningBalance,
      });
    }

    return result;
  }, [payables, receivables, fixedExpenses, initialBalance, horizon]);

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
      {/* Initial Balance Editor */}
      <Card className="gradient-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Saldo Inicial:</span>
            </div>

            {!editingBalance ? (
              <div className="flex items-center gap-3">
                <span className={`text-lg font-bold ${initialBalance >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                  {fmtSigned(initialBalance)}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({useManual ? "Manual" : "Calculado: Recebido − Pago"})
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingBalance(true)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch checked={useManual} onCheckedChange={(v) => { setUseManual(v); if (!v) setManualBalance(""); }} />
                  <Label className="text-xs text-muted-foreground">Saldo manual</Label>
                </div>
                {useManual && (
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">R$</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={manualBalance}
                      onChange={(e) => setManualBalance(e.target.value)}
                      placeholder={calculatedBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      className="w-[160px] h-8 bg-accent border-border text-sm"
                      autoFocus
                    />
                  </div>
                )}
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-400" onClick={() => setEditingBalance(false)}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingBalance(false); setUseManual(false); setManualBalance(""); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() =>
                generateCashFlowPdf({
                  initialBalance,
                  balanceType: useManual ? "Manual" : "Calculado",
                  horizon,
                  projections,
                  summary30: s30,
                  summary60: s60,
                  summary90: s90,
                })
              }
            >
              <FileDown className="w-3.5 h-3.5" />
              Exportar PDF
            </Button>
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
          </div>
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
