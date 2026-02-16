import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, CheckCircle, FileDown, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmt = (v: number) => `R$ ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const fmtSigned = (v: number) => `${v < 0 ? "- " : ""}${fmt(v)}`;

type Decision = "RECOMENDADO" | "CAUTELA" | "NÃO RECOMENDADO";

interface SimSettings {
  minimum_cash_reserve: number;
  safe_commitment_limit: number;
  projection_horizon_months: number;
  max_installments: number;
}

interface InstallmentOption {
  parcelas: number;
  valorParcela: number;
  comprometimento: number;
  decision: Decision;
  label: string;
  pctReceita: number;
}

const defaultSettings: SimSettings = {
  minimum_cash_reserve: 10000,
  safe_commitment_limit: 60,
  projection_horizon_months: 6,
  max_installments: 12,
};

export function DecisionAssistant() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin_master";

  // Settings
  const [settings, setSettings] = useState<SimSettings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);

  // Inputs
  const [description, setDescription] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState<"compra" | "pagamento">("compra");
  const [forma, setForma] = useState<"avista" | "parcelado">("avista");
  const [suggestParcelamento, setSuggestParcelamento] = useState(true);

  // Real data from DB
  const [currentBalance, setCurrentBalance] = useState(0);
  const [futurePayables, setFuturePayables] = useState({ d30: 0, d60: 0, d90: 0 });
  const [futureReceivables, setFutureReceivables] = useState({ d30: 0, d60: 0, d90: 0 });
  const [fixedMonthly, setFixedMonthly] = useState(0);
  const [avgMonthlyRevenue, setAvgMonthlyRevenue] = useState(0);
  const [avgMonthlyExpense, setAvgMonthlyExpense] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const d30 = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    const d60 = new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0];
    const d90 = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];

    const [
      { data: paidRec }, { data: paidPay },
      { data: payOpen }, { data: recOpen },
      { data: fixedExp }, { data: simSettings },
      { data: allPaidPay6m }, { data: allReceivedRec6m }
    ] = await Promise.all([
      supabase.from("finance_accounts_receivable").select("amount").eq("status", "recebido"),
      supabase.from("finance_accounts_payable").select("amount").eq("status", "pago"),
      supabase.from("finance_accounts_payable").select("amount, due_date").in("status", ["aberto", "parcelado", "atrasado"]),
      supabase.from("finance_accounts_receivable").select("amount, expected_date").in("status", ["aberto", "parcelado", "atrasado"]),
      supabase.from("finance_fixed_expenses").select("monthly_value").eq("is_active", true),
      supabase.from("finance_simulator_settings").select("*").limit(1),
      supabase.from("finance_accounts_payable").select("amount, payment_date").eq("status", "pago"),
      supabase.from("finance_accounts_receivable").select("amount, received_date").eq("status", "recebido"),
    ]);

    const totalRec = (paidRec ?? []).reduce((s, r) => s + Number(r.amount), 0);
    const totalPaid = (paidPay ?? []).reduce((s, r) => s + Number(r.amount), 0);
    setCurrentBalance(totalRec - totalPaid);

    const payArr = payOpen ?? [];
    setFuturePayables({
      d30: payArr.filter(p => p.due_date <= d30).reduce((s, p) => s + Number(p.amount), 0),
      d60: payArr.filter(p => p.due_date <= d60).reduce((s, p) => s + Number(p.amount), 0),
      d90: payArr.filter(p => p.due_date <= d90).reduce((s, p) => s + Number(p.amount), 0),
    });

    const recArr = recOpen ?? [];
    setFutureReceivables({
      d30: recArr.filter(r => r.expected_date <= d30).reduce((s, r) => s + Number(r.amount), 0),
      d60: recArr.filter(r => r.expected_date <= d60).reduce((s, r) => s + Number(r.amount), 0),
      d90: recArr.filter(r => r.expected_date <= d90).reduce((s, r) => s + Number(r.amount), 0),
    });

    setFixedMonthly((fixedExp ?? []).reduce((s, f) => s + Number(f.monthly_value), 0));

    if (simSettings && simSettings.length > 0) {
      setSettings({
        minimum_cash_reserve: Number(simSettings[0].minimum_cash_reserve),
        safe_commitment_limit: Number(simSettings[0].safe_commitment_limit),
        projection_horizon_months: Number(simSettings[0].projection_horizon_months),
        max_installments: Number(simSettings[0].max_installments),
      });
    }

    // Calculate avg monthly revenue and expense (last 6 months)
    const now = new Date();
    let totalRevenue6 = 0, totalExpense6 = 0, monthsCounted = 0;
    for (let i = 1; i <= 6; i++) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const rev = (allReceivedRec6m ?? []).filter(r => r.received_date?.startsWith(key)).reduce((s, r) => s + Number(r.amount), 0);
      const exp = (allPaidPay6m ?? []).filter(p => p.payment_date?.startsWith(key)).reduce((s, p) => s + Number(p.amount), 0);
      totalRevenue6 += rev;
      totalExpense6 += exp;
      monthsCounted++;
    }
    setAvgMonthlyRevenue(monthsCounted > 0 ? totalRevenue6 / monthsCounted : 0);
    setAvgMonthlyExpense(monthsCounted > 0 ? totalExpense6 / monthsCounted : 0);

    setLoading(false);
  };

  const purchaseValue = parseFloat(valor) || 0;

  // Decision engine
  const analysis = useMemo(() => {
    if (purchaseValue <= 0) return null;

    const horizonMonths = settings.projection_horizon_months;
    const totalFutureOut = futurePayables.d90 + (fixedMonthly * horizonMonths);
    const totalFutureIn = futureReceivables.d90 + (avgMonthlyRevenue * Math.max(0, horizonMonths - 3));

    const balanceAfter = currentBalance - purchaseValue;
    const belowReserve = balanceAfter < settings.minimum_cash_reserve;

    // Project month by month
    let projectedNegative = false;
    const projData: { mes: string; antes: number; depois: number }[] = [];
    let balBefore = currentBalance;
    let balAfter = currentBalance - purchaseValue;

    for (let i = 0; i <= horizonMonths; i++) {
      if (i > 0) {
        const monthIn = avgMonthlyRevenue + (futureReceivables.d30 / 3);
        const monthOut = avgMonthlyExpense + fixedMonthly;
        balBefore += monthIn - monthOut;
        balAfter += monthIn - monthOut;
      }
      projData.push({ mes: i === 0 ? "Atual" : `Mês ${i}`, antes: Math.round(balBefore), depois: Math.round(balAfter) });
      if (balAfter < 0) projectedNegative = true;
    }

    // Commitment
    const totalOutWithPurchase = totalFutureOut + purchaseValue;
    const commitment = totalFutureIn > 0 ? (totalOutWithPurchase / totalFutureIn) * 100 : 100;

    let decision: Decision = "RECOMENDADO";
    const reasons: string[] = [];

    if (belowReserve) {
      decision = "NÃO RECOMENDADO";
      reasons.push(`Saldo pós-compra (${fmtSigned(balanceAfter)}) ficará abaixo da reserva mínima (${fmt(settings.minimum_cash_reserve)})`);
    }
    if (projectedNegative) {
      decision = "NÃO RECOMENDADO";
      reasons.push(`Saldo projetado ficará negativo no horizonte de ${horizonMonths} meses`);
    }
    if (commitment > 80) {
      decision = "NÃO RECOMENDADO";
      reasons.push(`Comprometimento do caixa (${commitment.toFixed(1)}%) supera 80%`);
    } else if (commitment > settings.safe_commitment_limit) {
      if (decision === "RECOMENDADO") decision = "CAUTELA";
      reasons.push(`Comprometimento do caixa (${commitment.toFixed(1)}%) está acima do limite seguro (${settings.safe_commitment_limit}%)`);
    }

    if (reasons.length === 0) {
      reasons.push("Saldo adequado após a operação");
      reasons.push(`Comprometimento do caixa dentro do limite (${commitment.toFixed(1)}%)`);
    }

    // Installment suggestions
    const installments: InstallmentOption[] = [];
    if (suggestParcelamento && purchaseValue > 0) {
      for (let n = 2; n <= settings.max_installments; n++) {
        const parcela = purchaseValue / n;
        const monthlyOutWithParcela = avgMonthlyExpense + fixedMonthly + parcela;
        const monthlyIn = avgMonthlyRevenue + (futureReceivables.d30 / 3);
        const comp = monthlyIn > 0 ? (monthlyOutWithParcela / monthlyIn) * 100 : 100;

        let projNeg = false;
        let bal = currentBalance;
        for (let m = 1; m <= Math.min(n, horizonMonths); m++) {
          bal += monthlyIn - monthlyOutWithParcela;
          if (bal < 0) projNeg = true;
        }
        const violatesReserve = (currentBalance - parcela) < settings.minimum_cash_reserve && n <= 1;

        let dec: Decision = "RECOMENDADO";
        if (projNeg || violatesReserve) dec = "NÃO RECOMENDADO";
        else if (comp > 80) dec = "NÃO RECOMENDADO";
        else if (comp > settings.safe_commitment_limit) dec = "CAUTELA";

        const pctReceita = avgMonthlyRevenue > 0 ? (parcela / avgMonthlyRevenue) * 100 : 0;

        installments.push({ parcelas: n, valorParcela: parcela, comprometimento: comp, decision: dec, label: `${n}x`, pctReceita });
      }
    }

    // Pick best: conservative, balanced, aggressive
    const viable = installments.filter(i => i.decision !== "NÃO RECOMENDADO");
    const conservative = viable.length > 0 ? viable[viable.length - 1] : null; // most parcelas
    const aggressive = viable.length > 0 ? viable[0] : null; // fewest parcelas
    const midIdx = Math.floor(viable.length / 2);
    const balanced = viable.length > 2 ? viable[midIdx] : viable.length === 2 ? viable[1] : viable[0] ?? null;

    const margin = avgMonthlyRevenue > 0 ? ((avgMonthlyRevenue - avgMonthlyExpense) / avgMonthlyRevenue) * 100 : 0;

    return {
      decision, reasons, balanceAfter, commitment, projData,
      installments, conservative, balanced, aggressive,
      margin,
    };
  }, [purchaseValue, currentBalance, futurePayables, futureReceivables, fixedMonthly, avgMonthlyRevenue, avgMonthlyExpense, settings, suggestParcelamento]);

  const saveSettings = async () => {
    const { data: existing } = await supabase.from("finance_simulator_settings").select("id").limit(1);
    if (existing && existing.length > 0) {
      await supabase.from("finance_simulator_settings").update(settings).eq("id", existing[0].id);
    } else {
      await supabase.from("finance_simulator_settings").insert(settings);
    }
    toast.success("Configurações salvas!");
    setShowSettings(false);
  };

  const decisionConfig: Record<Decision, { icon: typeof ShieldCheck; color: string; bg: string; border: string }> = {
    "RECOMENDADO": { icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    "CAUTELA": { icon: ShieldAlert, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    "NÃO RECOMENDADO": { icon: ShieldX, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  };

  const exportPdf = () => {
    if (!analysis) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Assistente de Decisão Financeira", 14, 20);
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);

    doc.setFontSize(12);
    doc.text(`Descrição: ${description || "—"}`, 14, 38);
    doc.text(`Valor: ${fmt(purchaseValue)}`, 14, 45);
    doc.text(`Tipo: ${tipo === "compra" ? "Compra" : "Pagamento"}`, 14, 52);
    doc.text(`Decisão: ${analysis.decision}`, 14, 62);

    doc.setFontSize(10);
    let y = 72;
    analysis.reasons.forEach(r => {
      doc.text(`• ${r}`, 18, y);
      y += 6;
    });

    y += 4;
    doc.text(`Saldo Atual: ${fmtSigned(currentBalance)}`, 14, y);
    doc.text(`Saldo Pós-${tipo}: ${fmtSigned(analysis.balanceAfter)}`, 14, y + 7);
    doc.text(`Comprometimento: ${analysis.commitment.toFixed(1)}%`, 14, y + 14);

    if (analysis.conservative || analysis.balanced || analysis.aggressive) {
      y += 24;
      doc.setFontSize(12);
      doc.text("Sugestões de Parcelamento", 14, y);
      y += 8;
      const suggestions = [analysis.conservative, analysis.balanced, analysis.aggressive].filter(Boolean);
      autoTable(doc, {
        startY: y,
        head: [["Perfil", "Parcelas", "Valor/Parcela", "Comprometimento", "% Receita"]],
        body: suggestions.map((s, i) => [
          i === 0 ? "Conservador" : i === 1 ? "Equilibrado" : "Agressivo",
          `${s!.parcelas}x`, fmt(s!.valorParcela),
          `${s!.comprometimento.toFixed(1)}%`, `${s!.pctReceita.toFixed(1)}%`,
        ]),
        theme: "grid",
        headStyles: { fillColor: [38, 92, 55] },
      });
    }

    doc.save(`decisao-${description || "simulacao"}-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  if (loading) return <p className="text-sm text-muted-foreground p-4 text-center">Carregando dados financeiros...</p>;

  

  return (
    <div className="space-y-4">
      {/* Admin Settings Toggle */}
      {isAdmin && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="w-4 h-4" /> Configurações
          </Button>
        </div>
      )}

      {showSettings && isAdmin && (
        <div className="bg-card border rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold">Configurações do Simulador</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><Label className="text-xs">Reserva Mínima (R$)</Label><Input type="number" value={settings.minimum_cash_reserve} onChange={e => setSettings(s => ({ ...s, minimum_cash_reserve: Number(e.target.value) }))} /></div>
            <div><Label className="text-xs">Limite Comprometimento (%)</Label><Input type="number" value={settings.safe_commitment_limit} onChange={e => setSettings(s => ({ ...s, safe_commitment_limit: Number(e.target.value) }))} /></div>
            <div><Label className="text-xs">Horizonte (meses)</Label><Input type="number" value={settings.projection_horizon_months} onChange={e => setSettings(s => ({ ...s, projection_horizon_months: Number(e.target.value) }))} /></div>
            <div><Label className="text-xs">Máx Parcelas</Label><Input type="number" value={settings.max_installments} onChange={e => setSettings(s => ({ ...s, max_installments: Number(e.target.value) }))} /></div>
          </div>
          <Button size="sm" onClick={saveSettings}>Salvar Configurações</Button>
        </div>
      )}

      {/* Input Form */}
      <div className="bg-card border rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2"><Label>Descrição</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Compra de equipamento" /></div>
          <div><Label>Valor (R$)</Label><Input type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" /></div>
          <div><Label>Tipo</Label>
            <Select value={tipo} onValueChange={v => setTipo(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="compra">Compra</SelectItem>
                <SelectItem value="pagamento">Pagamento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Checkbox checked={suggestParcelamento} onCheckedChange={v => setSuggestParcelamento(!!v)} />
            <Label className="text-sm">Sugerir parcelamento automaticamente</Label>
          </div>
        </div>
      </div>

      {/* Results */}
      {analysis && purchaseValue > 0 && (
        <div className="space-y-4">
          {/* Decision Badge */}
          {(() => {
            const cfg = decisionConfig[analysis.decision];
            const Icon = cfg.icon;
            return (
              <div className={`rounded-lg border ${cfg.border} ${cfg.bg} p-4 flex items-center gap-3`}>
                <Icon className={`w-8 h-8 ${cfg.color}`} />
                <div>
                  <p className={`text-lg font-bold ${cfg.color}`}>{analysis.decision}</p>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-0.5">
                    {analysis.reasons.map((r, i) => <li key={i} className="flex items-start gap-1.5"><span>•</span><span>{r}</span></li>)}
                  </ul>
                </div>
                <Button variant="outline" size="sm" className="ml-auto gap-1.5 shrink-0" onClick={exportPdf}>
                  <FileDown className="w-4 h-4" /> PDF
                </Button>
              </div>
            );
          })()}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Saldo Atual</p>
              <p className={`text-lg font-bold ${currentBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtSigned(currentBalance)}</p>
            </div>
            <div className="bg-card border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Saldo Pós-{tipo}</p>
              <p className={`text-lg font-bold ${analysis.balanceAfter >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtSigned(analysis.balanceAfter)}</p>
            </div>
            <div className="bg-card border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Comprometimento</p>
              <p className={`text-lg font-bold ${analysis.commitment <= 60 ? "text-emerald-400" : analysis.commitment <= 80 ? "text-amber-400" : "text-red-400"}`}>{analysis.commitment.toFixed(1)}%</p>
            </div>
            <div className="bg-card border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Margem Mensal</p>
              <p className={`text-lg font-bold ${analysis.margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>{analysis.margin.toFixed(1)}%</p>
            </div>
          </div>

          {/* Projection Chart */}
          <div className="bg-card border rounded-lg p-4">
            <h4 className="text-sm font-medium mb-3">Saldo Projetado: Antes × Depois</h4>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={analysis.projData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmtSigned(v)} />
                <Legend />
                <ReferenceLine y={settings.minimum_cash_reserve} stroke="hsl(var(--warning))" strokeDasharray="4 4" label={{ value: "Reserva mín.", fontSize: 10, fill: "hsl(var(--warning))" }} />
                <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="antes" name="Sem compra" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                <Area type="monotone" dataKey="depois" name="Com compra" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Installment Suggestions */}
          {suggestParcelamento && (analysis.conservative || analysis.balanced || analysis.aggressive) && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Sugestões de Parcelamento</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { opt: analysis.conservative, label: "Conservador", desc: "Menor impacto mensal" },
                  { opt: analysis.balanced, label: "Equilibrado", desc: "Melhor custo-benefício" },
                  { opt: analysis.aggressive, label: "Agressivo", desc: "Menos parcelas" },
                ].map(({ opt, label, desc }) => {
                  if (!opt) return null;
                  const cfg = decisionConfig[opt.decision];
                  return (
                    <div key={label} className={`rounded-lg border ${cfg.border} ${cfg.bg} p-4 space-y-2`}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">{label}</p>
                        <Badge variant="outline" className={`text-xs ${cfg.color}`}>{opt.decision}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                      <div className="space-y-1">
                        <p className="text-lg font-bold text-foreground">{opt.parcelas}x de {fmt(opt.valorParcela)}</p>
                        <p className="text-xs text-muted-foreground">Comprometimento: {opt.comprometimento.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">{opt.pctReceita.toFixed(1)}% da receita média mensal</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
