import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { ShieldCheck, ShieldAlert, ShieldX, CheckCircle, FileDown, Settings, TrendingUp, TrendingDown, Wallet, CalendarClock } from "lucide-react";
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

interface MonthlyFlow {
  receivable: number;
  payable: number;
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

  const [settings, setSettings] = useState<SimSettings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);

  const [description, setDescription] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState<"compra" | "pagamento">("compra");
  const [suggestParcelamento, setSuggestParcelamento] = useState(true);

  const [currentBalance, setCurrentBalance] = useState(0);
  const [futureMonthlyFlows, setFutureMonthlyFlows] = useState<MonthlyFlow[]>([]);
  const [totalReceivableHorizon, setTotalReceivableHorizon] = useState(0);
  const [totalPayableHorizon, setTotalPayableHorizon] = useState(0);
  const [fixedMonthly, setFixedMonthly] = useState(0);
  const [avgMonthlyRevenue, setAvgMonthlyRevenue] = useState(0);
  const [avgMonthlyExpense, setAvgMonthlyExpense] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    setLoading(true);
    const now = new Date();

    const [
      { data: paidRec }, { data: paidPay },
      { data: payOpen }, { data: recOpen },
      { data: fixedExp }, { data: simSettings },
      { data: allPaidPay }, { data: allReceivedRec }
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

    const fixed = (fixedExp ?? []).reduce((s, f) => s + Number(f.monthly_value), 0);
    setFixedMonthly(fixed);

    let loadedSettings = defaultSettings;
    if (simSettings && simSettings.length > 0) {
      loadedSettings = {
        minimum_cash_reserve: Number(simSettings[0].minimum_cash_reserve),
        safe_commitment_limit: Number(simSettings[0].safe_commitment_limit),
        projection_horizon_months: Number(simSettings[0].projection_horizon_months),
        max_installments: Number(simSettings[0].max_installments),
      };
      setSettings(loadedSettings);
    }

    // Build monthly flow map for horizon
    const horizonMonths = loadedSettings.projection_horizon_months;
    const flows: MonthlyFlow[] = [];
    let totalRecH = 0, totalPayH = 0;

    for (let i = 1; i <= horizonMonths; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 0);
      const msStr = monthStart.toISOString().split("T")[0];
      const meStr = monthEnd.toISOString().split("T")[0];

      const monthRec = (recOpen ?? [])
        .filter(r => r.expected_date >= msStr && r.expected_date <= meStr)
        .reduce((s, r) => s + Number(r.amount), 0);
      const monthPay = (payOpen ?? [])
        .filter(p => p.due_date >= msStr && p.due_date <= meStr)
        .reduce((s, p) => s + Number(p.amount), 0);

      totalRecH += monthRec;
      totalPayH += monthPay;
      flows.push({ receivable: monthRec, payable: monthPay });
    }

    setFutureMonthlyFlows(flows);
    setTotalReceivableHorizon(totalRecH);
    setTotalPayableHorizon(totalPayH);

    // Avg revenue/expense last 6 months
    let totalRevenue = 0, totalExpense = 0;
    for (let i = 1; i <= 6; i++) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      totalRevenue += (allReceivedRec ?? []).filter(r => r.received_date?.startsWith(key)).reduce((s, r) => s + Number(r.amount), 0);
      totalExpense += (allPaidPay ?? []).filter(p => p.payment_date?.startsWith(key)).reduce((s, p) => s + Number(p.amount), 0);
    }
    setAvgMonthlyRevenue(totalRevenue / 6);
    setAvgMonthlyExpense(totalExpense / 6);

    setLoading(false);
  };

  const purchaseValue = parseFloat(valor) || 0;

  // Helper: project month-by-month balance with optional installment
  const projectBalance = (parcela: number, numParcelas: number) => {
    const horizonMonths = settings.projection_horizon_months;
    const data: { mes: string; antes: number; depois: number }[] = [];
    let balBefore = currentBalance;
    let balAfter = currentBalance - (numParcelas === 0 ? purchaseValue : 0); // à vista = subtract all at month 0

    for (let i = 0; i <= horizonMonths; i++) {
      if (i > 0) {
        const flow = futureMonthlyFlows[i - 1] || { receivable: 0, payable: 0 };
        // Use max of (actual receivable for month, avg revenue) for realistic projection
        const monthIn = Math.max(flow.receivable, avgMonthlyRevenue);
        const monthOut = flow.payable + fixedMonthly;
        balBefore += monthIn - monthOut;

        const parcelaThisMonth = (numParcelas > 0 && i <= numParcelas) ? parcela : 0;
        balAfter += monthIn - monthOut - parcelaThisMonth;
      }
      data.push({ mes: i === 0 ? "Atual" : `Mês ${i}`, antes: Math.round(balBefore), depois: Math.round(balAfter) });
    }
    return data;
  };

  const checkViability = (parcela: number, numParcelas: number) => {
    const horizonMonths = settings.projection_horizon_months;
    let bal = currentBalance - (numParcelas === 0 ? purchaseValue : 0);
    let negativeMonth = false;
    let reserveViolated = numParcelas === 0 && bal < settings.minimum_cash_reserve;

    for (let i = 1; i <= horizonMonths; i++) {
      const flow = futureMonthlyFlows[i - 1] || { receivable: 0, payable: 0 };
      const monthIn = Math.max(flow.receivable, avgMonthlyRevenue);
      const monthOut = flow.payable + fixedMonthly;
      const parcelaThisMonth = (numParcelas > 0 && i <= numParcelas) ? parcela : 0;
      bal += monthIn - monthOut - parcelaThisMonth;
      if (bal < 0) negativeMonth = true;
      if (bal < settings.minimum_cash_reserve) reserveViolated = true;
    }

    const comp = avgMonthlyRevenue > 0
      ? ((numParcelas === 0 ? purchaseValue : parcela) / avgMonthlyRevenue) * 100
      : 100;

    return { negativeMonth, reserveViolated, commitment: comp };
  };

  // Decision engine
  const analysis = useMemo(() => {
    if (purchaseValue <= 0) return null;

    // === 1) À vista ===
    const balanceAfter = currentBalance - purchaseValue;
    const avistaCheck = checkViability(0, 0);
    const avistaCommitment = avistaCheck.commitment;

    let avistaDecision: Decision = "RECOMENDADO";
    const avistaReasons: string[] = [];

    if (avistaCheck.reserveViolated) {
      avistaDecision = "NÃO RECOMENDADO";
      avistaReasons.push(`Saldo pós-compra à vista (${fmtSigned(balanceAfter)}) ficará abaixo da reserva mínima (${fmt(settings.minimum_cash_reserve)})`);
    }
    if (avistaCheck.negativeMonth) {
      avistaDecision = "NÃO RECOMENDADO";
      avistaReasons.push(`Saldo projetado ficará negativo no horizonte de ${settings.projection_horizon_months} meses`);
    }
    if (avistaCommitment > 80) {
      avistaDecision = "NÃO RECOMENDADO";
      avistaReasons.push(`Comprometimento à vista (${avistaCommitment.toFixed(1)}%) supera 80% da receita mensal`);
    } else if (avistaCommitment > settings.safe_commitment_limit) {
      if (avistaDecision === "RECOMENDADO") avistaDecision = "CAUTELA";
      avistaReasons.push(`Comprometimento à vista (${avistaCommitment.toFixed(1)}%) acima do limite seguro (${settings.safe_commitment_limit}%)`);
    }

    if (avistaDecision === "RECOMENDADO" && avistaReasons.length === 0) {
      avistaReasons.push("Saldo e fluxo futuro suportam compra à vista");
      avistaReasons.push(`Comprometimento: ${avistaCommitment.toFixed(1)}% da receita média mensal`);
    }

    const avistaViable = avistaDecision === "RECOMENDADO";

    // === 2) Parcelamento ===
    const installments: InstallmentOption[] = [];
    for (let n = 2; n <= settings.max_installments; n++) {
      const parcela = purchaseValue / n;
      const { negativeMonth, reserveViolated, commitment: comp } = checkViability(parcela, n);

      let dec: Decision = "RECOMENDADO";
      if (negativeMonth) dec = "NÃO RECOMENDADO";
      else if (reserveViolated) dec = "NÃO RECOMENDADO";
      else if (comp > 80) dec = "NÃO RECOMENDADO";
      else if (comp > settings.safe_commitment_limit) dec = "CAUTELA";

      const pctReceita = avgMonthlyRevenue > 0 ? (parcela / avgMonthlyRevenue) * 100 : 0;
      installments.push({ parcelas: n, valorParcela: parcela, comprometimento: comp, decision: dec, label: `${n}x`, pctReceita });
    }

    const viable = installments.filter(i => i.decision !== "NÃO RECOMENDADO");
    const healthy = installments.filter(i => i.decision === "RECOMENDADO");
    const conservative = viable.length > 0 ? viable[viable.length - 1] : null;
    const aggressive = viable.length > 0 ? viable[0] : null;
    const midIdx = Math.floor(viable.length / 2);
    const balanced = viable.length > 2 ? viable[midIdx] : viable.length === 2 ? viable[1] : viable[0] ?? null;
    const bestInstallment = healthy.length > 0 ? healthy[0] : (viable.length > 0 ? viable[0] : null);

    // === 3) Decisão final ===
    let decision: Decision;
    const reasons: string[] = [];

    if (avistaViable) {
      decision = "RECOMENDADO";
      reasons.push("✅ Compra à vista viável — saldo atual, receitas futuras e comprometimento dentro dos limites");
      if (bestInstallment && suggestParcelamento) {
        reasons.push(`💡 Parcelamento também disponível: ${bestInstallment.parcelas}x de ${fmt(bestInstallment.valorParcela)} (${bestInstallment.comprometimento.toFixed(1)}% da receita)`);
      }
    } else if (bestInstallment) {
      decision = bestInstallment.decision === "RECOMENDADO" ? "CAUTELA" : "CAUTELA";
      reasons.push(`⚠️ À vista: Não recomendado — ${avistaReasons[0] || "saldo insuficiente"}`);
      reasons.push(`✅ Parcelamento recomendado: ${bestInstallment.parcelas}x de ${fmt(bestInstallment.valorParcela)}`);
      reasons.push(`Comprometimento mensal: ${bestInstallment.comprometimento.toFixed(1)}% da receita média (${fmt(avgMonthlyRevenue)}/mês)`);
      if (healthy.length > 1) reasons.push(`${healthy.length} opções de parcelamento saudáveis disponíveis`);
    } else {
      decision = "NÃO RECOMENDADO";
      reasons.push(`❌ À vista: ${avistaReasons[0] || "Não viável"}`);
      reasons.push("❌ Nenhum parcelamento viável — todos excedem os limites de segurança considerando receitas futuras");
      if (avistaReasons.length > 1) avistaReasons.slice(1).forEach(r => reasons.push(r));
    }

    const commitment = avistaViable ? avistaCommitment : (bestInstallment ? bestInstallment.comprometimento : avistaCommitment);
    const margin = avgMonthlyRevenue > 0 ? ((avgMonthlyRevenue - avgMonthlyExpense) / avgMonthlyRevenue) * 100 : 0;

    // Build projection data for the chosen scenario
    const projData = avistaViable
      ? projectBalance(0, 0)
      : bestInstallment
        ? projectBalance(bestInstallment.valorParcela, bestInstallment.parcelas)
        : projectBalance(0, 0);

    return {
      decision, reasons, balanceAfter, commitment, projData,
      installments, conservative, balanced, aggressive,
      bestInstallment, avistaDecision, avistaReasons, avistaViable,
      margin,
    };
  }, [purchaseValue, currentBalance, futureMonthlyFlows, fixedMonthly, avgMonthlyRevenue, avgMonthlyExpense, settings, suggestParcelamento]);

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
    analysis.reasons.forEach(r => { doc.text(`• ${r}`, 18, y); y += 6; });

    y += 6;
    doc.setFontSize(11);
    doc.text("Dados Considerados:", 14, y); y += 7;
    doc.setFontSize(10);
    doc.text(`Saldo Atual: ${fmtSigned(currentBalance)}`, 18, y); y += 6;
    doc.text(`Total a Receber (${settings.projection_horizon_months}m): ${fmt(totalReceivableHorizon)}`, 18, y); y += 6;
    doc.text(`Total a Pagar (${settings.projection_horizon_months}m): ${fmt(totalPayableHorizon)}`, 18, y); y += 6;
    doc.text(`Receita Média Mensal: ${fmt(avgMonthlyRevenue)}`, 18, y); y += 6;
    doc.text(`Despesa Média Mensal: ${fmt(avgMonthlyExpense)}`, 18, y); y += 6;
    doc.text(`Custos Fixos Mensais: ${fmt(fixedMonthly)}`, 18, y); y += 6;
    doc.text(`Comprometimento: ${analysis.commitment.toFixed(1)}%`, 18, y); y += 6;

    if (analysis.conservative || analysis.balanced || analysis.aggressive) {
      y += 4;
      doc.setFontSize(12);
      doc.text("Sugestões de Parcelamento", 14, y); y += 8;
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
      {/* Admin Settings */}
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
        <div className="flex items-center gap-2">
          <Checkbox checked={suggestParcelamento} onCheckedChange={v => setSuggestParcelamento(!!v)} />
          <Label className="text-sm">Sugerir parcelamento automaticamente</Label>
        </div>
      </div>

      {/* Data Sources Summary (always visible) */}
      <div className="bg-card border rounded-lg p-4">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2"><CalendarClock className="w-4 h-4" /> Dados Considerados na Análise</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Caixa Atual</p>
            <p className={`text-sm font-bold ${currentBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtSigned(currentBalance)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">A Receber ({settings.projection_horizon_months}m)</p>
            <p className="text-sm font-bold text-emerald-400">{fmt(totalReceivableHorizon)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">A Pagar ({settings.projection_horizon_months}m)</p>
            <p className="text-sm font-bold text-red-400">{fmt(totalPayableHorizon)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Receita Média/Mês</p>
            <p className="text-sm font-bold text-foreground">{fmt(avgMonthlyRevenue)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Despesa Média/Mês</p>
            <p className="text-sm font-bold text-foreground">{fmt(avgMonthlyExpense)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Custos Fixos/Mês</p>
            <p className="text-sm font-bold text-foreground">{fmt(fixedMonthly)}</p>
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

          {/* À Vista vs Parcelamento Status */}
          {!analysis.avistaViable && analysis.bestInstallment && (
            <div className="bg-card border rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldX className="w-5 h-5 text-red-400" />
                <p className="text-sm font-semibold text-red-400">À vista: Não recomendado</p>
              </div>
              <p className="text-xs text-muted-foreground ml-7">{analysis.avistaReasons[0]}</p>
              <div className="flex items-center gap-2 mt-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <p className="text-sm font-semibold text-emerald-400">
                  Parcelamento recomendado: {analysis.bestInstallment.parcelas}x de {fmt(analysis.bestInstallment.valorParcela)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground ml-7">
                Impacto mensal: {analysis.bestInstallment.comprometimento.toFixed(1)}% da receita média ({fmt(avgMonthlyRevenue)}/mês)
              </p>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card border rounded-lg p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="w-3 h-3" /> Saldo Atual</p>
              <p className={`text-lg font-bold ${currentBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtSigned(currentBalance)}</p>
            </div>
            <div className="bg-card border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Impacto Mensal da Compra</p>
              <p className="text-lg font-bold text-foreground">
                {analysis.bestInstallment && !analysis.avistaViable
                  ? `${fmt(analysis.bestInstallment.valorParcela)}/mês`
                  : fmt(purchaseValue)
                }
              </p>
              <p className="text-xs text-muted-foreground">
                {analysis.bestInstallment && !analysis.avistaViable
                  ? `${analysis.bestInstallment.parcelas}x`
                  : "à vista"
                }
              </p>
            </div>
            <div className="bg-card border rounded-lg p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Comprometimento</p>
              <p className={`text-lg font-bold ${analysis.commitment <= settings.safe_commitment_limit ? "text-emerald-400" : analysis.commitment <= 80 ? "text-amber-400" : "text-red-400"}`}>{analysis.commitment.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">da receita média mensal</p>
            </div>
            <div className="bg-card border rounded-lg p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Margem Mensal</p>
              <p className={`text-lg font-bold ${analysis.margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>{analysis.margin.toFixed(1)}%</p>
            </div>
          </div>

          {/* Projection Chart */}
          <div className="bg-card border rounded-lg p-4">
            <h4 className="text-sm font-medium mb-3">
              Saldo Projetado: Sem compra × {analysis.bestInstallment && !analysis.avistaViable ? `Com ${analysis.bestInstallment.parcelas}x` : "Com compra à vista"}
            </h4>
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
