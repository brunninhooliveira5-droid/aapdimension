import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Clock, ArrowUpCircle, ArrowDownCircle, Bell, CalendarClock, Calendar, Receipt, Wallet, FileDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend, ReferenceLine } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { exportWeeklySummaryPdf } from "@/lib/finance-export";
import { BreakEvenIndicator } from "./BreakEvenIndicator";

interface PayableRow {
  id: string;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: string;
  category_id: string | null;
  supplier: string;
  description: string;
}

interface ReceivableRow {
  id: string;
  amount: number;
  expected_date: string;
  received_date: string | null;
  status: string;
  client: string;
  description: string;
}

interface CategoryRow {
  id: string;
  name: string;
  type: string;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
];

interface FinanceDashboardProps {
  onNavigate?: (section: string) => void;
}

export function FinanceDashboard({ onNavigate }: FinanceDashboardProps) {
  const [payables, setPayables] = useState<PayableRow[]>([]);
  const [receivables, setReceivables] = useState<ReceivableRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: p }, { data: r }, { data: c }] = await Promise.all([
        supabase.from("finance_accounts_payable").select("id, amount, due_date, payment_date, status, category_id, supplier, description"),
        supabase.from("finance_accounts_receivable").select("id, amount, expected_date, received_date, status, client, description"),
        supabase.from("finance_categories").select("id, name, type"),
      ]);
      setPayables((p as PayableRow[]) ?? []);
      setReceivables((r as ReceivableRow[]) ?? []);
      setCategories((c as CategoryRow[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  // Weekly summary (current week: Monday to Sunday)
  const weekStart = useMemo(() => {
    const d = new Date(now);
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    return d.toISOString().split("T")[0];
  }, []);
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d.toISOString().split("T")[0];
  }, [weekStart]);

  const weeklySummary = useMemo(() => {
    const paidThisWeek = payables.filter(p => p.status === "pago" && p.payment_date && p.payment_date >= weekStart && p.payment_date <= weekEnd);
    const receivedThisWeek = receivables.filter(r => r.status === "recebido" && r.received_date && r.received_date >= weekStart && r.received_date <= weekEnd);
    const dueSoonPay = payables.filter(p => p.status !== "pago" && p.due_date >= weekStart && p.due_date <= weekEnd);
    const dueSoonRec = receivables.filter(r => r.status !== "recebido" && r.expected_date >= weekStart && r.expected_date <= weekEnd);

    const totalPaidWeek = paidThisWeek.reduce((s, p) => s + Number(p.amount), 0);
    const totalReceivedWeek = receivedThisWeek.reduce((s, r) => s + Number(r.amount), 0);
    const totalDuePay = dueSoonPay.reduce((s, p) => s + Number(p.amount), 0);
    const totalDueRec = dueSoonRec.reduce((s, r) => s + Number(r.amount), 0);

    const topPayments = [...paidThisWeek].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 3);
    const topReceipts = [...receivedThisWeek].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 3);
    const pendingItems = [...dueSoonPay.map(p => ({ label: p.supplier, amount: Number(p.amount), date: p.due_date, type: "pagar" as const })), ...dueSoonRec.map(r => ({ label: r.client, amount: Number(r.amount), date: r.expected_date, type: "receber" as const }))].sort((a, b) => a.date.localeCompare(b.date));

    return { totalPaidWeek, totalReceivedWeek, totalDuePay, totalDueRec, topPayments, topReceipts, pendingItems, balance: totalReceivedWeek - totalPaidWeek };
  }, [payables, receivables, weekStart, weekEnd]);

  const totalPayable30 = useMemo(
    () => payables.filter(p => p.status !== "pago" && p.due_date <= in30).reduce((s, p) => s + Number(p.amount), 0),
    [payables, in30]
  );

  const totalReceivable30 = useMemo(
    () => receivables.filter(r => r.status !== "recebido" && r.expected_date <= in30).reduce((s, r) => s + Number(r.amount), 0),
    [receivables, in30]
  );

  const totalPaid = useMemo(
    () => payables.filter(p => p.status === "pago").reduce((s, p) => s + Number(p.amount), 0),
    [payables]
  );

  const totalReceived = useMemo(
    () => receivables.filter(r => r.status === "recebido").reduce((s, r) => s + Number(r.amount), 0),
    [receivables]
  );

  const overduePayable = useMemo(
    () => payables.filter(p => p.status !== "pago" && p.due_date < today).reduce((s, p) => s + Number(p.amount), 0),
    [payables, today]
  );

  const overdueReceivable = useMemo(
    () => receivables.filter(r => r.status !== "recebido" && r.expected_date < today).reduce((s, r) => s + Number(r.amount), 0),
    [receivables, today]
  );

  const resultado = totalReceived - totalPaid;

  // Upcoming & overdue alerts
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const alerts = useMemo(() => {
    const items: { id: string; type: "pagar" | "receber"; label: string; description: string; date: string; amount: number; severity: "overdue" | "urgent" | "soon" }[] = [];

    payables.filter(p => p.status !== "pago").forEach(p => {
      const isOverdue = p.due_date < today;
      const isUrgent = !isOverdue && p.due_date <= in7;
      if (isOverdue || isUrgent) {
        items.push({
          id: p.id, type: "pagar", label: p.supplier, description: p.description,
          date: p.due_date, amount: Number(p.amount),
          severity: isOverdue ? "overdue" : "urgent",
        });
      }
    });

    receivables.filter(r => r.status !== "recebido").forEach(r => {
      const isOverdue = r.expected_date < today;
      const isUrgent = !isOverdue && r.expected_date <= in7;
      if (isOverdue || isUrgent) {
        items.push({
          id: r.id, type: "receber", label: r.client, description: r.description,
          date: r.expected_date, amount: Number(r.amount),
          severity: isOverdue ? "overdue" : "urgent",
        });
      }
    });

    items.sort((a, b) => a.date.localeCompare(b.date));
    return items;
  }, [payables, receivables, today, in7]);

  const severityConfig = {
    overdue: { badge: "Atrasado", badgeClass: "bg-red-500/15 text-red-400 border-red-500/30", iconClass: "text-red-400", borderClass: "border-l-red-500" },
    urgent: { badge: "Vence em breve", badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30", iconClass: "text-amber-400", borderClass: "border-l-amber-500" },
    soon: { badge: "Próximo", badgeClass: "bg-blue-500/15 text-blue-400 border-blue-500/30", iconClass: "text-blue-400", borderClass: "border-l-blue-500" },
  };

  const formatDate = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  const daysUntil = (d: string) => {
    const diff = Math.ceil((new Date(d).getTime() - new Date(today).getTime()) / 86400000);
    if (diff < 0) return `${Math.abs(diff)} dia(s) atrasado`;
    if (diff === 0) return "Vence hoje";
    return `Vence em ${diff} dia(s)`;
  };

  // Monthly chart data (last 6 months)
  const monthlyData = useMemo(() => {
    const months: { label: string; receitas: number; despesas: number; resultado: number; acumulado: number }[] = [];
    let acumulado = 0;
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

      const receitas = receivables
        .filter(r => r.status === "recebido" && r.received_date?.startsWith(key))
        .reduce((s, r) => s + Number(r.amount), 0);

      const despesas = payables
        .filter(p => p.status === "pago" && p.payment_date?.startsWith(key))
        .reduce((s, p) => s + Number(p.amount), 0);

      const resultado = receitas - despesas;
      acumulado += resultado;

      months.push({ label, receitas, despesas, resultado, acumulado });
    }
    return months;
  }, [payables, receivables]);

  // Category breakdown for payables
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    payables.filter(p => p.status !== "pago").forEach(p => {
      const cat = categories.find(c => c.id === p.category_id);
      const name = cat?.name || "Sem categoria";
      map[name] = (map[name] || 0) + Number(p.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [payables, categories]);

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  if (loading) {
    return <p className="text-muted-foreground text-sm py-8 text-center">Carregando dashboard...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards — clickable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => onNavigate?.("receivable")} className="cursor-pointer transition-transform hover:scale-[1.02]">
          <StatCard title="A Receber (30 dias)" value={fmt(totalReceivable30)} icon={ArrowUpCircle} variant="highlight" />
        </div>
        <div onClick={() => onNavigate?.("payable")} className="cursor-pointer transition-transform hover:scale-[1.02]">
          <StatCard title="A Pagar (30 dias)" value={fmt(totalPayable30)} icon={ArrowDownCircle} variant="warning" />
        </div>
        <div onClick={() => onNavigate?.("cashflow")} className="cursor-pointer transition-transform hover:scale-[1.02]">
          <StatCard title="Resultado (Recebido - Pago)" value={fmt(resultado)} icon={resultado >= 0 ? TrendingUp : TrendingDown} variant={resultado >= 0 ? "highlight" : "danger"} />
        </div>
        <div onClick={() => onNavigate?.("debts")} className="cursor-pointer transition-transform hover:scale-[1.02]">
          <StatCard title="Inadimplência (Receber)" value={fmt(overdueReceivable)} icon={AlertTriangle} variant={overdueReceivable > 0 ? "danger" : "default"} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div onClick={() => onNavigate?.("reports")} className="cursor-pointer transition-transform hover:scale-[1.02]">
          <StatCard title="Total Pago (acumulado)" value={fmt(totalPaid)} icon={DollarSign} />
        </div>
        <div onClick={() => onNavigate?.("payable")} className="cursor-pointer transition-transform hover:scale-[1.02]">
          <StatCard title="Atrasado (Pagar)" value={fmt(overduePayable)} icon={Clock} variant={overduePayable > 0 ? "danger" : "default"} />
        </div>
      </div>

      {/* Weekly Summary */}
      <div className="gradient-card rounded-lg border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Resumo Semanal ({formatDate(weekStart)} – {formatDate(weekEnd)})
            </h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => exportWeeklySummaryPdf({
              weekStart,
              weekEnd,
              totalReceivedWeek: weeklySummary.totalReceivedWeek,
              totalPaidWeek: weeklySummary.totalPaidWeek,
              balance: weeklySummary.balance,
              totalDuePay: weeklySummary.totalDuePay,
              totalDueRec: weeklySummary.totalDueRec,
              topReceipts: weeklySummary.topReceipts.map(r => ({ label: r.client, amount: Number(r.amount) })),
              topPayments: weeklySummary.topPayments.map(p => ({ label: p.supplier, amount: Number(p.amount) })),
              pendingItems: weeklySummary.pendingItems.slice(0, 5),
            })}
          >
            <FileDown className="w-3.5 h-3.5" /> Exportar PDF
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-md bg-accent/40 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Recebido</p>
            <p className="text-lg font-bold text-emerald-400 mt-1">{fmt(weeklySummary.totalReceivedWeek)}</p>
          </div>
          <div className="rounded-md bg-accent/40 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pago</p>
            <p className="text-lg font-bold text-red-400 mt-1">{fmt(weeklySummary.totalPaidWeek)}</p>
          </div>
          <div className="rounded-md bg-accent/40 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo Semana</p>
            <p className={`text-lg font-bold mt-1 ${weeklySummary.balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(weeklySummary.balance)}</p>
          </div>
          <div className="rounded-md bg-accent/40 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pendente</p>
            <p className="text-lg font-bold text-amber-400 mt-1">{fmt(weeklySummary.totalDuePay + weeklySummary.totalDueRec)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-muted-foreground">Maiores Recebimentos</span>
            </div>
            {weeklySummary.topReceipts.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 italic">Nenhum recebimento na semana</p>
            ) : (
              weeklySummary.topReceipts.map(r => (
                <div key={r.id} className="flex items-center justify-between text-xs bg-accent/20 rounded px-2 py-1.5">
                  <span className="text-foreground truncate mr-2">{r.client}</span>
                  <span className="text-emerald-400 font-medium whitespace-nowrap">{fmt(Number(r.amount))}</span>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-medium text-muted-foreground">Maiores Pagamentos</span>
            </div>
            {weeklySummary.topPayments.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 italic">Nenhum pagamento na semana</p>
            ) : (
              weeklySummary.topPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs bg-accent/20 rounded px-2 py-1.5">
                  <span className="text-foreground truncate mr-2">{p.supplier}</span>
                  <span className="text-red-400 font-medium whitespace-nowrap">{fmt(Number(p.amount))}</span>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-medium text-muted-foreground">Pendentes da Semana</span>
            </div>
            {weeklySummary.pendingItems.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 italic">Nenhum vencimento na semana</p>
            ) : (
              weeklySummary.pendingItems.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-accent/20 rounded px-2 py-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Badge variant="outline" className={`text-[9px] px-1 py-0 shrink-0 ${item.type === "pagar" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                      {item.type === "pagar" ? "Pagar" : "Receber"}
                    </Badge>
                    <span className="text-foreground truncate">{item.label}</span>
                  </div>
                  <span className="text-foreground font-medium whitespace-nowrap ml-2">{fmt(item.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Alerts Panel */}
      {alerts.length > 0 && (
        <div className="gradient-card rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-foreground">
              Alertas de Vencimento ({alerts.length})
            </h3>
          </div>
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {alerts.map(alert => {
              const config = severityConfig[alert.severity];
              return (
                <div
                  key={`${alert.type}-${alert.id}`}
                  className={`flex items-center justify-between gap-3 p-3 rounded-md bg-accent/30 border-l-4 ${config.borderClass}`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <CalendarClock className={`w-4 h-4 shrink-0 ${config.iconClass}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground truncate">{alert.label}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.badgeClass}`}>
                          {config.badge}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${alert.type === "pagar" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                          {alert.type === "pagar" ? "Pagar" : "Receber"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{alert.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(alert.date)} · {daysUntil(alert.date)}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground whitespace-nowrap">{fmt(alert.amount)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Break-Even Indicator */}
      <BreakEvenIndicator onNavigate={onNavigate} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue vs Expenses */}
        <div className="gradient-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Receitas vs Despesas (últimos 6 meses)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                formatter={(value: number) => fmt(value)}
              />
              <Bar dataKey="receitas" fill="hsl(var(--chart-2))" name="Receitas" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" fill="hsl(var(--chart-5))" name="Despesas" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payable by category */}
        <div className="gradient-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Contas a Pagar por Categoria</h3>
          {categoryData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Nenhuma conta a pagar registrada.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => fmt(value)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

    </div>
  );
}
