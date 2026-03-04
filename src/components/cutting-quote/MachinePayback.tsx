import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Plus, TrendingUp, DollarSign, Clock, Percent, Calculator, Trash2, Edit2, Save, Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInMonths, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Investment {
  id: string;
  user_id: string;
  machine_name: string;
  invested_value: number;
  purchase_date: string;
  useful_life_months: number;
  depreciation_method: string;
  depreciation_rate_year: number;
  depreciation_monthly: number;
}

interface Service {
  id: string;
  user_id: string;
  investment_id: string;
  service_date: string;
  client_name: string;
  revenue: number;
  material_cost: number;
  machine_cost: number;
  additional_costs: number;
  profit: number;
  origin: string;
  notes: string;
}

type PeriodFilter = "3m" | "6m" | "12m" | "all" | "custom";

export function MachinePayback() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [investments, setInvestments] = useState<Investment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string>("");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [loading, setLoading] = useState(true);

  // Investment form
  const [showInvestmentForm, setShowInvestmentForm] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [formMachineName, setFormMachineName] = useState("");
  const [formInvestedValue, setFormInvestedValue] = useState(0);
  const [formInvestedDisplay, setFormInvestedDisplay] = useState("");

  const formatCurrencyInput = (raw: string): { display: string; numeric: number } => {
    const digits = raw.replace(/\D/g, "");
    const cents = parseInt(digits || "0", 10);
    const value = cents / 100;
    const display = value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return { display, numeric: value };
  };

  const handleInvestedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { display, numeric } = formatCurrencyInput(e.target.value);
    setFormInvestedDisplay(display);
    setFormInvestedValue(numeric);
  };
  const [formPurchaseDate, setFormPurchaseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formUsefulLife, setFormUsefulLife] = useState(60);
  const [formDepMethod, setFormDepMethod] = useState<"linear" | "percentage">("linear");
  const [formDepRate, setFormDepRate] = useState(20);

  // Service form
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [svcDate, setSvcDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [svcClient, setSvcClient] = useState("");
  const [svcRevenue, setSvcRevenue] = useState(0);
  const [svcMaterialCost, setSvcMaterialCost] = useState(0);
  const [svcMachineCost, setSvcMachineCost] = useState(0);
  const [svcAdditional, setSvcAdditional] = useState(0);
  const [svcNotes, setSvcNotes] = useState("");

  // Load data
  useEffect(() => {
    if (!userId) return;
    loadData();
  }, [userId]);

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    const [invRes, svcRes] = await Promise.all([
      supabase.from("cnc_investments" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("cnc_services" as any).select("*").order("service_date", { ascending: false }),
    ]);
    if (invRes.data) {
      setInvestments(invRes.data as any);
      if (!selectedInvestmentId && (invRes.data as any).length > 0) {
        setSelectedInvestmentId((invRes.data as any)[0].id);
      }
    }
    if (svcRes.data) setServices(svcRes.data as any);
    setLoading(false);
  };

  const selectedInvestment = investments.find((i) => i.id === selectedInvestmentId);

  // Compute depreciation monthly
  const computeDepMonthly = (value: number, method: string, life: number, rate: number) => {
    if (method === "linear") return life > 0 ? value / life : 0;
    return (value * (rate / 100)) / 12;
  };

  // Save investment
  const saveInvestment = async () => {
    if (!userId || !formMachineName || formInvestedValue <= 0) {
      toast.error("Preencha nome da máquina e valor investido.");
      return;
    }
    const depMonthly = computeDepMonthly(formInvestedValue, formDepMethod, formUsefulLife, formDepRate);
    const payload = {
      user_id: userId,
      machine_name: formMachineName,
      invested_value: formInvestedValue,
      purchase_date: formPurchaseDate,
      useful_life_months: formUsefulLife,
      depreciation_method: formDepMethod,
      depreciation_rate_year: formDepMethod === "percentage" ? formDepRate : 0,
      depreciation_monthly: depMonthly,
    };

    let error;
    if (editingInvestment) {
      ({ error } = await supabase.from("cnc_investments" as any).update(payload).eq("id", editingInvestment.id));
    } else {
      ({ error } = await supabase.from("cnc_investments" as any).insert(payload));
    }
    if (error) {
      toast.error("Erro ao salvar investimento.");
      console.error(error);
      return;
    }
    toast.success(editingInvestment ? "Investimento atualizado!" : "Investimento registrado!");
    resetInvestmentForm();
    loadData();
  };

  const resetInvestmentForm = () => {
    setShowInvestmentForm(false);
    setEditingInvestment(null);
    setFormMachineName("");
    setFormInvestedValue(0);
    setFormInvestedDisplay("");
    setFormPurchaseDate(format(new Date(), "yyyy-MM-dd"));
    setFormUsefulLife(60);
    setFormDepMethod("linear");
    setFormDepRate(20);
  };

  const editInvestment = (inv: Investment) => {
    setEditingInvestment(inv);
    setFormMachineName(inv.machine_name);
    setFormInvestedValue(inv.invested_value);
    setFormInvestedDisplay(inv.invested_value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setFormPurchaseDate(inv.purchase_date);
    setFormUsefulLife(inv.useful_life_months);
    setFormDepMethod(inv.depreciation_method as any);
    setFormDepRate(inv.depreciation_rate_year);
    setShowInvestmentForm(true);
  };

  const deleteInvestment = async (id: string) => {
    if (!confirm("Excluir este investimento e todos os serviços vinculados?")) return;
    await supabase.from("cnc_services" as any).delete().eq("investment_id", id);
    await supabase.from("cnc_investments" as any).delete().eq("id", id);
    toast.success("Investimento excluído.");
    if (selectedInvestmentId === id) setSelectedInvestmentId("");
    loadData();
  };

  // Save service
  const saveService = async () => {
    if (!userId || !selectedInvestmentId || svcRevenue <= 0) {
      toast.error("Selecione um investimento e informe a receita.");
      return;
    }
    const totalCosts = svcMaterialCost + svcMachineCost + svcAdditional;
    const profit = svcRevenue - totalCosts;
    const { error } = await supabase.from("cnc_services" as any).insert({
      user_id: userId,
      investment_id: selectedInvestmentId,
      service_date: svcDate,
      client_name: svcClient,
      revenue: svcRevenue,
      material_cost: svcMaterialCost,
      machine_cost: svcMachineCost,
      additional_costs: svcAdditional,
      profit,
      origin: "manual",
      notes: svcNotes,
    });
    if (error) {
      toast.error("Erro ao salvar serviço.");
      console.error(error);
      return;
    }
    toast.success("Serviço registrado!");
    setShowServiceForm(false);
    setSvcDate(format(new Date(), "yyyy-MM-dd"));
    setSvcClient("");
    setSvcRevenue(0);
    setSvcMaterialCost(0);
    setSvcMachineCost(0);
    setSvcAdditional(0);
    setSvcNotes("");
    loadData();
  };

  const deleteService = async (id: string) => {
    if (!confirm("Excluir este serviço?")) return;
    await supabase.from("cnc_services" as any).delete().eq("id", id);
    toast.success("Serviço excluído.");
    loadData();
  };

  // Filter services by investment and period
  const filteredServices = useMemo(() => {
    if (!selectedInvestmentId) return [];
    let filtered = services.filter((s) => s.investment_id === selectedInvestmentId);
    if (periodFilter !== "all") {
      const months = periodFilter === "3m" ? 3 : periodFilter === "6m" ? 6 : 12;
      const cutoff = format(subMonths(new Date(), months), "yyyy-MM-dd");
      filtered = filtered.filter((s) => s.service_date >= cutoff);
    }
    return filtered;
  }, [services, selectedInvestmentId, periodFilter]);

  // Calculate payback metrics
  const metrics = useMemo(() => {
    if (!selectedInvestment) return null;

    const inv = selectedInvestment;
    const allInvServices = services.filter((s) => s.investment_id === inv.id);
    const purchaseDate = parseISO(inv.purchase_date);
    const now = new Date();
    const monthsSincePurchase = Math.max(1, differenceInMonths(now, purchaseDate));

    // Total profit from ALL services (not filtered)
    const totalProfit = allInvServices.reduce((sum, s) => sum + s.profit, 0);
    const totalDepreciation = inv.depreciation_monthly * monthsSincePurchase;
    const netProfit = totalProfit - totalDepreciation;
    const accumulated = Math.max(0, netProfit);
    const percentPaid = Math.min(200, (accumulated / inv.invested_value) * 100);
    const remaining = Math.max(0, inv.invested_value - accumulated);

    // Average last 3 months net profit
    const last3MonthsCutoff = format(subMonths(now, 3), "yyyy-MM-dd");
    const last3Services = allInvServices.filter((s) => s.service_date >= last3MonthsCutoff);
    const last3Profit = last3Services.reduce((sum, s) => sum + s.profit, 0);
    const avgMonthlyNet = (last3Profit / 3) - inv.depreciation_monthly;
    const monthsToPayoff = avgMonthlyNet > 0 ? Math.ceil(remaining / avgMonthlyNet) : Infinity;

    // Filtered period profit
    const filteredProfit = filteredServices.reduce((sum, s) => sum + s.profit, 0);
    const filteredRevenue = filteredServices.reduce((sum, s) => sum + s.revenue, 0);

    return {
      percentPaid,
      accumulated,
      remaining,
      depreciationMonthly: inv.depreciation_monthly,
      avgMonthlyNet,
      monthsToPayoff,
      totalProfit,
      totalDepreciation,
      netProfit,
      monthsSincePurchase,
      filteredProfit,
      filteredRevenue,
      serviceCount: filteredServices.length,
    };
  }, [selectedInvestment, services, filteredServices]);

  // Monthly chart data
  const chartData = useMemo(() => {
    if (!selectedInvestment) return { accumulated: [], monthly: [] };
    const inv = selectedInvestment;
    const allSvcs = services.filter((s) => s.investment_id === inv.id);
    if (allSvcs.length === 0) return { accumulated: [], monthly: [] };

    // Group by month
    const byMonth: Record<string, { profit: number; depreciation: number }> = {};
    const purchaseDate = parseISO(inv.purchase_date);
    const now = new Date();
    const months = differenceInMonths(now, purchaseDate);

    for (let i = 0; i <= months; i++) {
      const d = subMonths(now, months - i);
      const key = format(d, "yyyy-MM");
      byMonth[key] = { profit: 0, depreciation: inv.depreciation_monthly };
    }

    allSvcs.forEach((s) => {
      const key = s.service_date.substring(0, 7);
      if (byMonth[key]) byMonth[key].profit += s.profit;
      else byMonth[key] = { profit: s.profit, depreciation: inv.depreciation_monthly };
    });

    const sortedKeys = Object.keys(byMonth).sort();
    let acc = 0;
    const accumulated = sortedKeys.map((k) => {
      const net = byMonth[k].profit - byMonth[k].depreciation;
      acc += net;
      return { month: k, acumulado: Math.max(0, acc), meta: inv.invested_value };
    });

    const monthly = sortedKeys.map((k) => ({
      month: k,
      lucro: byMonth[k].profit,
      depreciacao: byMonth[k].depreciation,
    }));

    return { accumulated, monthly };
  }, [selectedInvestment, services]);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Investment Setup */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5" /> Investimentos CNC
            </CardTitle>
            <CardDescription>Registre suas máquinas e acompanhe o retorno do investimento</CardDescription>
          </div>
          <Button onClick={() => { resetInvestmentForm(); setShowInvestmentForm(true); }} size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> Novo Investimento
          </Button>
        </CardHeader>
        <CardContent>
          {investments.length === 0 && !showInvestmentForm && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum investimento cadastrado. Clique em "Novo Investimento" para começar.
            </p>
          )}

          {investments.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              {investments.map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvestmentId(inv.id)}
                  className={`cursor-pointer rounded-lg border p-3 transition-all ${
                    selectedInvestmentId === inv.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{inv.machine_name || "Sem nome"}</span>
                    <Badge variant="outline" className="text-xs">{fmt(inv.invested_value)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Adquirida em {format(parseISO(inv.purchase_date), "dd/MM/yyyy")}
                  </p>
                  <div className="flex gap-1 mt-2">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={(e) => { e.stopPropagation(); editInvestment(inv); }}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-destructive" onClick={(e) => { e.stopPropagation(); deleteInvestment(inv.id); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Investment Form */}
          {showInvestmentForm && (
            <Card className="border-dashed">
              <CardContent className="pt-4 space-y-4">
                <h4 className="font-semibold text-sm">{editingInvestment ? "Editar Investimento" : "Novo Investimento"}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome da Máquina</Label>
                    <Input placeholder="Ex: Orion 2800" value={formMachineName} onChange={(e) => setFormMachineName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor Investido (R$)</Label>
                    <Input type="text" inputMode="numeric" placeholder="0,00" value={formInvestedDisplay} onChange={handleInvestedChange} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data de Aquisição</Label>
                    <Input type="date" value={formPurchaseDate} onChange={(e) => setFormPurchaseDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Vida Útil (meses)</Label>
                    <Input type="number" min={1} value={formUsefulLife || ""} onChange={(e) => setFormUsefulLife(Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Método de Depreciação</Label>
                    <RadioGroup value={formDepMethod} onValueChange={(v) => setFormDepMethod(v as any)} className="flex gap-4 pt-1">
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="linear" id="dep-linear" />
                        <Label htmlFor="dep-linear" className="text-xs font-normal">Linear</Label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="percentage" id="dep-pct" />
                        <Label htmlFor="dep-pct" className="text-xs font-normal">% ao ano</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  {formDepMethod === "percentage" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Depreciação (% ao ano)</Label>
                      <Input type="number" min={0} max={100} value={formDepRate || ""} onChange={(e) => setFormDepRate(Number(e.target.value))} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calculator className="w-3.5 h-3.5" />
                  Depreciação mensal estimada: <strong>{fmt(computeDepMonthly(formInvestedValue, formDepMethod, formUsefulLife, formDepRate))}</strong>
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveInvestment} size="sm" className="gap-2">
                    <Save className="w-4 h-4" /> Salvar
                  </Button>
                  <Button variant="outline" size="sm" onClick={resetInvestmentForm}>Cancelar</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Dashboard - only show when an investment is selected */}
      {selectedInvestment && metrics && (
        <>
          {/* Period filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Período:</span>
            {(["3m", "6m", "12m", "all"] as PeriodFilter[]).map((p) => (
              <Button
                key={p}
                variant={periodFilter === p ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriodFilter(p)}
                className="text-xs"
              >
                {p === "3m" ? "3 meses" : p === "6m" ? "6 meses" : p === "12m" ? "12 meses" : "Desde o início"}
              </Button>
            ))}
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Percent className="w-3.5 h-3.5" /> Máquina Paga
                </div>
                <p className="text-2xl font-bold">{metrics.percentPaid.toFixed(1)}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <DollarSign className="w-3.5 h-3.5" /> Valor Pago
                </div>
                <p className="text-lg font-bold text-primary">{fmt(metrics.accumulated)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Target className="w-3.5 h-3.5" /> Falta Pagar
                </div>
                <p className="text-lg font-bold text-destructive">{fmt(metrics.remaining)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Deprec./mês
                </div>
                <p className="text-lg font-bold">{fmt(metrics.depreciationMonthly)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <DollarSign className="w-3.5 h-3.5" /> Lucro líq./mês
                </div>
                <p className="text-lg font-bold">{fmt(Math.max(0, metrics.avgMonthlyNet))}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Clock className="w-3.5 h-3.5" /> Meses p/ pagar
                </div>
                <p className="text-lg font-bold">
                  {metrics.monthsToPayoff === Infinity ? "∞" : metrics.monthsToPayoff}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Progress bar */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progresso: Máquina Paga</span>
                <span className="text-sm font-bold">{metrics.percentPaid.toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(100, metrics.percentPaid)} className="h-4" />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>{fmt(metrics.accumulated)}</span>
                <span>{fmt(selectedInvestment.invested_value)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Accumulated chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Acumulado ao longo do tempo</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.accumulated.length > 0 ? (
                  <ChartContainer config={{
                    acumulado: { label: "Acumulado", color: "hsl(var(--primary))" },
                    meta: { label: "Meta (investimento)", color: "hsl(var(--destructive))" },
                  }} className="h-[250px]">
                    <LineChart data={chartData.accumulated}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="acumulado" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="meta" stroke="hsl(var(--destructive))" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados para exibir</p>
                )}
              </CardContent>
            </Card>

            {/* Monthly chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Lucro mensal vs Depreciação</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.monthly.length > 0 ? (
                  <ChartContainer config={{
                    lucro: { label: "Lucro", color: "hsl(var(--primary))" },
                    depreciacao: { label: "Depreciação", color: "hsl(var(--destructive))" },
                  }} className="h-[250px]">
                    <BarChart data={chartData.monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="lucro" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="depreciacao" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados para exibir</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Services table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Serviços Realizados</CardTitle>
                <CardDescription>{filteredServices.length} serviço(s) no período</CardDescription>
              </div>
              <Button size="sm" className="gap-2" onClick={() => setShowServiceForm(true)}>
                <Plus className="w-4 h-4" /> Adicionar Serviço
              </Button>
            </CardHeader>
            <CardContent>
              {/* Service form inline */}
              {showServiceForm && (
                <Card className="border-dashed mb-4">
                  <CardContent className="pt-4 space-y-4">
                    <h4 className="font-semibold text-sm">Novo Serviço Manual</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Data</Label>
                        <Input type="date" value={svcDate} onChange={(e) => setSvcDate(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Cliente</Label>
                        <Input placeholder="Nome do cliente" value={svcClient} onChange={(e) => setSvcClient(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Receita (R$)</Label>
                        <Input type="number" min={0} value={svcRevenue || ""} onChange={(e) => setSvcRevenue(Number(e.target.value))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Custo Material (R$)</Label>
                        <Input type="number" min={0} value={svcMaterialCost || ""} onChange={(e) => setSvcMaterialCost(Number(e.target.value))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Custo Máquina (R$)</Label>
                        <Input type="number" min={0} value={svcMachineCost || ""} onChange={(e) => setSvcMachineCost(Number(e.target.value))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Custos Adicionais (R$)</Label>
                        <Input type="number" min={0} value={svcAdditional || ""} onChange={(e) => setSvcAdditional(Number(e.target.value))} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Observações</Label>
                      <Input placeholder="Notas sobre o serviço" value={svcNotes} onChange={(e) => setSvcNotes(e.target.value)} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Lucro estimado: <strong>{fmt(svcRevenue - svcMaterialCost - svcMachineCost - svcAdditional)}</strong>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveService} size="sm" className="gap-2">
                        <Save className="w-4 h-4" /> Salvar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowServiceForm(false)}>Cancelar</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {filteredServices.length > 0 ? (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                        <TableHead className="text-right">Custos</TableHead>
                        <TableHead className="text-right">Lucro</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredServices.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-sm">{format(parseISO(s.service_date), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="text-sm">{s.client_name || "—"}</TableCell>
                          <TableCell className="text-right text-sm">{fmt(s.revenue)}</TableCell>
                          <TableCell className="text-right text-sm">{fmt(s.material_cost + s.machine_cost + s.additional_costs)}</TableCell>
                          <TableCell className={`text-right text-sm font-medium ${s.profit >= 0 ? "text-primary" : "text-destructive"}`}>
                            {fmt(s.profit)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {s.origin === "orcamento_corte" ? "Orçamento" : "Manual"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteService(s.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum serviço registrado neste período.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
