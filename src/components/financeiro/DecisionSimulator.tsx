import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, AreaChart, Area } from "recharts";
import { Calculator, TrendingUp, Target, DollarSign, FileDown, ShieldCheck } from "lucide-react";
import { generateScenarioPdf, generateInvestmentPdf, generateCashFlowProjectionPdf } from "@/lib/simulator-pdf";
import { DecisionAssistant } from "./DecisionAssistant";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ========== SCENARIO SIMULATOR ==========
function ScenarioSimulator() {
  const [months, setMonths] = useState(12);
  const [currentRevenue, setCurrentRevenue] = useState(50000);
  const [currentExpense, setCurrentExpense] = useState(35000);
  const [revenueGrowth, setRevenueGrowth] = useState({ optimistic: 8, realistic: 3, pessimistic: -2 });
  const [expenseGrowth, setExpenseGrowth] = useState({ optimistic: 2, realistic: 4, pessimistic: 7 });

  const projectionData = useMemo(() => {
    const data = [];
    let revO = currentRevenue, revR = currentRevenue, revP = currentRevenue;
    let expO = currentExpense, expR = currentExpense, expP = currentExpense;
    for (let i = 1; i <= months; i++) {
      revO *= 1 + revenueGrowth.optimistic / 100;
      revR *= 1 + revenueGrowth.realistic / 100;
      revP *= 1 + revenueGrowth.pessimistic / 100;
      expO *= 1 + expenseGrowth.optimistic / 100;
      expR *= 1 + expenseGrowth.realistic / 100;
      expP *= 1 + expenseGrowth.pessimistic / 100;
      data.push({
        mes: `Mês ${i}`,
        balOtimista: Math.round(revO - expO),
        balRealista: Math.round(revR - expR),
        balPessimista: Math.round(revP - expP),
      });
    }
    return data;
  }, [months, currentRevenue, currentExpense, revenueGrowth, expenseGrowth]);

  const lastMonth = projectionData[projectionData.length - 1];

  const handleExportPdf = () => {
    generateScenarioPdf({ currentRevenue, currentExpense, months, revenueGrowth, expenseGrowth, projectionData });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5">
          <FileDown className="w-4 h-4" />Exportar PDF
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div><Label>Receita Atual (R$/mês)</Label><Input type="number" value={currentRevenue} onChange={e => setCurrentRevenue(Number(e.target.value))} /></div>
        <div><Label>Despesa Atual (R$/mês)</Label><Input type="number" value={currentExpense} onChange={e => setCurrentExpense(Number(e.target.value))} /></div>
        <div><Label>Período (meses)</Label><Input type="number" min={1} max={60} value={months} onChange={e => setMonths(Number(e.target.value))} /></div>
        <div className="flex items-end"><p className="text-xs text-muted-foreground">Saldo Atual: <span className="font-bold text-foreground">{fmt(currentRevenue - currentExpense)}/mês</span></p></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <h4 className="text-sm font-medium mb-3">Crescimento Receita (%/mês)</h4>
          <div className="grid grid-cols-3 gap-2">
            <div><Label className="text-xs text-success">Otimista</Label><Input type="number" step="0.5" value={revenueGrowth.optimistic} onChange={e => setRevenueGrowth(p => ({ ...p, optimistic: Number(e.target.value) }))} /></div>
            <div><Label className="text-xs text-info">Realista</Label><Input type="number" step="0.5" value={revenueGrowth.realistic} onChange={e => setRevenueGrowth(p => ({ ...p, realistic: Number(e.target.value) }))} /></div>
            <div><Label className="text-xs text-destructive">Pessimista</Label><Input type="number" step="0.5" value={revenueGrowth.pessimistic} onChange={e => setRevenueGrowth(p => ({ ...p, pessimistic: Number(e.target.value) }))} /></div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <h4 className="text-sm font-medium mb-3">Crescimento Despesa (%/mês)</h4>
          <div className="grid grid-cols-3 gap-2">
            <div><Label className="text-xs text-success">Otimista</Label><Input type="number" step="0.5" value={expenseGrowth.optimistic} onChange={e => setExpenseGrowth(p => ({ ...p, optimistic: Number(e.target.value) }))} /></div>
            <div><Label className="text-xs text-info">Realista</Label><Input type="number" step="0.5" value={expenseGrowth.realistic} onChange={e => setExpenseGrowth(p => ({ ...p, realistic: Number(e.target.value) }))} /></div>
            <div><Label className="text-xs text-destructive">Pessimista</Label><Input type="number" step="0.5" value={expenseGrowth.pessimistic} onChange={e => setExpenseGrowth(p => ({ ...p, pessimistic: Number(e.target.value) }))} /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-success/10 border border-success/30 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">Otimista (Mês {months})</p><p className="text-lg font-bold text-success">{fmt(lastMonth?.balOtimista ?? 0)}</p></div>
        <div className="bg-info/10 border border-info/30 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">Realista (Mês {months})</p><p className="text-lg font-bold text-info">{fmt(lastMonth?.balRealista ?? 0)}</p></div>
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">Pessimista (Mês {months})</p><p className="text-lg font-bold text-destructive">{fmt(lastMonth?.balPessimista ?? 0)}</p></div>
      </div>

      <div className="bg-card border rounded-lg p-4">
        <h4 className="text-sm font-medium mb-3">Projeção de Saldo Mensal</h4>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={projectionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Legend />
            <Area type="monotone" dataKey="balOtimista" name="Otimista" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
            <Area type="monotone" dataKey="balRealista" name="Realista" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
            <Area type="monotone" dataKey="balPessimista" name="Pessimista" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.1} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ========== INVESTMENT ANALYSIS ==========
function InvestmentAnalysis() {
  const [investmentCost, setInvestmentCost] = useState(150000);
  const [monthlyReturn, setMonthlyReturn] = useState(8000);
  const [monthlyCost, setMonthlyCost] = useState(2000);
  const [analysisPeriod, setAnalysisPeriod] = useState(36);
  const [discountRate, setDiscountRate] = useState(1);

  const analysis = useMemo(() => {
    const netMonthly = monthlyReturn - monthlyCost;
    const paybackMonths = netMonthly > 0 ? Math.ceil(investmentCost / netMonthly) : Infinity;
    
    let npv = -investmentCost;
    const cashflowData = [];
    let cumulative = -investmentCost;
    for (let i = 1; i <= analysisPeriod; i++) {
      const discFactor = Math.pow(1 + discountRate / 100, i);
      npv += netMonthly / discFactor;
      cumulative += netMonthly;
      cashflowData.push({
        mes: `M${i}`,
        fluxo: Math.round(cumulative),
        retorno: Math.round(netMonthly),
      });
    }

    const totalReturn = netMonthly * analysisPeriod;
    const roi = investmentCost > 0 ? ((totalReturn - investmentCost) / investmentCost) * 100 : 0;

    return { paybackMonths, npv: Math.round(npv), roi: Math.round(roi * 100) / 100, totalReturn: Math.round(totalReturn), netMonthly, cashflowData };
  }, [investmentCost, monthlyReturn, monthlyCost, analysisPeriod, discountRate]);

  const handleExportPdf = () => {
    generateInvestmentPdf({ investmentCost, monthlyReturn, monthlyCost, analysisPeriod, discountRate, ...analysis });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5">
          <FileDown className="w-4 h-4" />Exportar PDF
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div><Label>Investimento (R$)</Label><Input type="number" value={investmentCost} onChange={e => setInvestmentCost(Number(e.target.value))} /></div>
        <div><Label>Retorno Mensal (R$)</Label><Input type="number" value={monthlyReturn} onChange={e => setMonthlyReturn(Number(e.target.value))} /></div>
        <div><Label>Custo Mensal (R$)</Label><Input type="number" value={monthlyCost} onChange={e => setMonthlyCost(Number(e.target.value))} /></div>
        <div><Label>Período (meses)</Label><Input type="number" value={analysisPeriod} onChange={e => setAnalysisPeriod(Number(e.target.value))} /></div>
        <div><Label>Taxa Desc. (%/mês)</Label><Input type="number" step="0.1" value={discountRate} onChange={e => setDiscountRate(Number(e.target.value))} /></div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border rounded-lg p-3"><p className="text-xs text-muted-foreground">Payback</p><p className="text-lg font-bold">{analysis.paybackMonths === Infinity ? "—" : `${analysis.paybackMonths} meses`}</p></div>
        <div className="bg-card border rounded-lg p-3"><p className="text-xs text-muted-foreground">ROI</p><p className={`text-lg font-bold ${analysis.roi >= 0 ? "text-success" : "text-destructive"}`}>{analysis.roi}%</p></div>
        <div className="bg-card border rounded-lg p-3"><p className="text-xs text-muted-foreground">VPL (NPV)</p><p className={`text-lg font-bold ${analysis.npv >= 0 ? "text-success" : "text-destructive"}`}>{fmt(analysis.npv)}</p></div>
        <div className="bg-card border rounded-lg p-3"><p className="text-xs text-muted-foreground">Lucro Líquido/mês</p><p className={`text-lg font-bold ${analysis.netMonthly >= 0 ? "text-success" : "text-destructive"}`}>{fmt(analysis.netMonthly)}</p></div>
      </div>

      <div className="bg-card border rounded-lg p-4">
        <h4 className="text-sm font-medium mb-3">Fluxo de Caixa Acumulado</h4>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={analysis.cashflowData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} interval={Math.floor(analysisPeriod / 12)} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Area type="monotone" dataKey="fluxo" name="Acumulado" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ========== CASHFLOW PROJECTION ==========
function CashFlowProjection() {
  const [initialBalance, setInitialBalance] = useState(20000);
  const [monthlyInflow, setMonthlyInflow] = useState(50000);
  const [monthlyOutflow, setMonthlyOutflow] = useState(38000);
  const [projMonths, setProjMonths] = useState(12);
  const [inflowVariation, setInflowVariation] = useState(5);
  const [outflowVariation, setOutflowVariation] = useState(3);

  const projData = useMemo(() => {
    const data = [];
    let balance = initialBalance;
    for (let i = 1; i <= projMonths; i++) {
      const variation = 1 + (Math.random() * 2 - 1) * (inflowVariation / 100);
      const inflow = Math.round(monthlyInflow * variation);
      const outVariation = 1 + (Math.random() * 2 - 1) * (outflowVariation / 100);
      const outflow = Math.round(monthlyOutflow * outVariation);
      balance += inflow - outflow;
      data.push({ mes: `Mês ${i}`, entradas: inflow, saidas: outflow, saldo: balance });
    }
    return data;
  }, [initialBalance, monthlyInflow, monthlyOutflow, projMonths, inflowVariation, outflowVariation]);

  const handleExportPdf = () => {
    generateCashFlowProjectionPdf({ initialBalance, monthlyInflow, monthlyOutflow, projMonths, inflowVariation, outflowVariation, projData });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5">
          <FileDown className="w-4 h-4" />Exportar PDF
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div><Label>Saldo Inicial (R$)</Label><Input type="number" value={initialBalance} onChange={e => setInitialBalance(Number(e.target.value))} /></div>
        <div><Label>Entradas/mês (R$)</Label><Input type="number" value={monthlyInflow} onChange={e => setMonthlyInflow(Number(e.target.value))} /></div>
        <div><Label>Saídas/mês (R$)</Label><Input type="number" value={monthlyOutflow} onChange={e => setMonthlyOutflow(Number(e.target.value))} /></div>
        <div><Label>Variação Entrada (%)</Label><Input type="number" value={inflowVariation} onChange={e => setInflowVariation(Number(e.target.value))} /></div>
        <div><Label>Meses</Label><Input type="number" min={1} max={60} value={projMonths} onChange={e => setProjMonths(Number(e.target.value))} /></div>
      </div>

      <div className="bg-card border rounded-lg p-4">
        <h4 className="text-sm font-medium mb-3">Projeção de Fluxo de Caixa</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={projData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Legend />
            <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[2, 2, 0, 0]} />
            <Bar dataKey="saidas" name="Saídas" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card border rounded-lg p-4">
        <h4 className="text-sm font-medium mb-3">Evolução do Saldo</h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={projData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Line type="monotone" dataKey="saldo" name="Saldo" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ========== MAIN EXPORT ==========
export function DecisionSimulator() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Calculator className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Simulador de Decisão</h2>
      </div>
      <Tabs defaultValue="assistant" className="w-full">
        <TabsList className="bg-muted/50 border border-border flex-wrap h-auto">
          <TabsTrigger value="assistant" className="gap-1.5 data-[state=active]:bg-background"><ShieldCheck className="w-3.5 h-3.5" />Assistente</TabsTrigger>
          <TabsTrigger value="scenarios" className="gap-1.5 data-[state=active]:bg-background"><TrendingUp className="w-3.5 h-3.5" />Cenários</TabsTrigger>
          <TabsTrigger value="investment" className="gap-1.5 data-[state=active]:bg-background"><Target className="w-3.5 h-3.5" />Investimentos</TabsTrigger>
          <TabsTrigger value="cashflow" className="gap-1.5 data-[state=active]:bg-background"><DollarSign className="w-3.5 h-3.5" />Projeção Caixa</TabsTrigger>
        </TabsList>
        <TabsContent value="assistant" className="mt-4"><DecisionAssistant /></TabsContent>
        <TabsContent value="scenarios" className="mt-4"><ScenarioSimulator /></TabsContent>
        <TabsContent value="investment" className="mt-4"><InvestmentAnalysis /></TabsContent>
        <TabsContent value="cashflow" className="mt-4"><CashFlowProjection /></TabsContent>
      </Tabs>
    </div>
  );
}
