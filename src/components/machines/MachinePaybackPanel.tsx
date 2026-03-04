import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Plus, TrendingUp, DollarSign, Clock, Percent, Calculator, Trash2, Edit2, Save, Target, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInMonths, subMonths, parseISO } from "date-fns";

interface Investment {
  id: string;
  user_id: string;
  machine_id: string | null;
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

type PeriodFilter = "3m" | "6m" | "12m" | "all";

interface MachinePaybackPanelProps {
  machineId: string;
  machineName: string;
}

export function MachinePaybackPanel({ machineId, machineName }: MachinePaybackPanelProps) {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [investment, setInvestment] = useState<Investment | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [loading, setLoading] = useState(true);

  // Investment form
  const [showInvestmentForm, setShowInvestmentForm] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(false);
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

  useEffect(() => {
    if (!userId) return;
    loadData();
  }, [userId, machineId]);

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);

    const { data: invData } = await supabase
      .from("cnc_investments" as any)
      .select("*")
      .eq("machine_id", machineId)
      .maybeSingle();

    if (invData) {
      setInvestment(invData as any);
      const { data: svcData } = await supabase
        .from("cnc_services" as any)
        .select("*")
        .eq("investment_id", (invData as any).id)
        .order("service_date", { ascending: false });
      setServices((svcData as any) ?? []);
    } else {
      setInvestment(null);
      setServices([]);
    }
    setLoading(false);
  };

  const computeDepMonthly = (value: number, method: string, life: number, rate: number) => {
    if (method === "linear") return life > 0 ? value / life : 0;
    return (value * (rate / 100)) / 12;
  };

  const saveInvestment = async () => {
    if (!userId || formInvestedValue <= 0) {
      toast.error("Informe o valor investido.");
      return;
    }
    const depMonthly = computeDepMonthly(formInvestedValue, formDepMethod, formUsefulLife, formDepRate);
    const payload = {
      user_id: userId,
      machine_id: machineId,
      machine_name: machineName,
      invested_value: formInvestedValue,
      purchase_date: formPurchaseDate,
      useful_life_months: formUsefulLife,
      depreciation_method: formDepMethod,
      depreciation_rate_year: formDepMethod === "percentage" ? formDepRate : 0,
      depreciation_monthly: depMonthly,
    };

    let error;
    if (investment && editingInvestment) {
      ({ error } = await supabase.from("cnc_investments" as any).update(payload).eq("id", investment.id));
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
    setEditingInvestment(false);
    setFormInvestedValue(0);
    setFormInvestedDisplay("");
    setFormPurchaseDate(format(new Date(), "yyyy-MM-dd"));
    setFormUsefulLife(60);
    setFormDepMethod("linear");
    setFormDepRate(20);
  };

  const editInvestmentHandler = () => {
    if (!investment) return;
    setEditingInvestment(true);
    setFormInvestedValue(investment.invested_value);
    setFormInvestedDisplay(investment.invested_value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setFormPurchaseDate(investment.purchase_date);
    setFormUsefulLife(investment.useful_life_months);
    setFormDepMethod(investment.depreciation_method as any);
    setFormDepRate(investment.depreciation_rate_year);
    setShowInvestmentForm(true);
  };

  const deleteInvestmentHandler = async () => {
    if (!investment) return;
    if (!confirm("Excluir este investimento e todos os serviços vinculados?")) return;
    await supabase.from("cnc_services" as any).delete().eq("investment_id", investment.id);
    await supabase.from("cnc_investments" as any).delete().eq("id", investment.id);
    toast.success("Investimento excluído.");
    loadData();
  };

  const saveService = async () => {
    if (!userId || !investment || svcRevenue <= 0) {
      toast.error("Informe a receita do serviço.");
      return;
    }
    const totalCosts = svcMaterialCost + svcMachineCost + svcAdditional;
    const profit = svcRevenue - totalCosts;
    const { error } = await supabase.from("cnc_services" as any).insert({
      user_id: userId,
      investment_id: investment.id,
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
      return;
    }
    toast.success("Serviço registrado!");
    setShowServiceForm(false);
    setSvcDate(format(new Date(), "yyyy-MM-dd"));
    setSvcClient(""); setSvcRevenue(0); setSvcMaterialCost(0); setSvcMachineCost(0); setSvcAdditional(0); setSvcNotes("");
    loadData();
  };

  const deleteService = async (id: string) => {
    if (!confirm("Excluir este serviço?")) return;
    await supabase.from("cnc_services" as any).delete().eq("id", id);
    toast.success("Serviço excluído.");
    loadData();
  };

  const filteredServices = useMemo(() => {
    if (periodFilter === "all") return services;
    const months = periodFilter === "3m" ? 3 : periodFilter === "6m" ? 6 : 12;
    const cutoff = format(subMonths(new Date(), months), "yyyy-MM-dd");
    return services.filter((s) => s.service_date >= cutoff);
  }, [services, periodFilter]);

  const metrics = useMemo(() => {
    if (!investment) return null;
    const inv = investment;
    const purchaseDate = parseISO(inv.purchase_date);
    const now = new Date();
    const monthsSincePurchase = Math.max(1, differenceInMonths(now, purchaseDate));
    const totalProfit = services.reduce((sum, s) => sum + s.profit, 0);
    const totalDepreciation = inv.depreciation_monthly * monthsSincePurchase;
    const netProfit = totalProfit - totalDepreciation;
    const accumulated = Math.max(0, netProfit);
    const percentPaid = Math.min(200, (accumulated / inv.invested_value) * 100);
    const remaining = Math.max(0, inv.invested_value - accumulated);

    const last3MonthsCutoff = format(subMonths(now, 3), "yyyy-MM-dd");
    const last3Services = services.filter((s) => s.service_date >= last3MonthsCutoff);
    const last3Profit = last3Services.reduce((sum, s) => sum + s.profit, 0);
    const avgMonthlyNet = (last3Profit / 3) - inv.depreciation_monthly;
    const monthsToPayoff = avgMonthlyNet > 0 ? Math.ceil(remaining / avgMonthlyNet) : Infinity;

    const filteredProfit = filteredServices.reduce((sum, s) => sum + s.profit, 0);
    const filteredRevenue = filteredServices.reduce((sum, s) => sum + s.revenue, 0);

    const depAccumulated = Math.min(inv.invested_value, totalDepreciation);
    const bookValue = Math.max(0, inv.invested_value - depAccumulated);
    const marketFloor = inv.invested_value * 0.75;
    const estimatedResaleValue = Math.max(bookValue, marketFloor);
    const valuePreservedPercent = inv.invested_value > 0 ? (estimatedResaleValue / inv.invested_value) * 100 : 0;

    return {
      percentPaid, accumulated, remaining, depreciationMonthly: inv.depreciation_monthly,
      avgMonthlyNet, monthsToPayoff, totalProfit, totalDepreciation, netProfit, monthsSincePurchase,
      filteredProfit, filteredRevenue, serviceCount: filteredServices.length,
      depAccumulated, bookValue, marketFloor, estimatedResaleValue, valuePreservedPercent,
    };
  }, [investment, services, filteredServices]);

  const chartData = useMemo(() => {
    if (!investment) return { accumulated: [], monthly: [] };
    const inv = investment;
    if (services.length === 0) return { accumulated: [], monthly: [] };
    const byMonth: Record<string, { profit: number; depreciation: number }> = {};
    const purchaseDate = parseISO(inv.purchase_date);
    const now = new Date();
    const months = differenceInMonths(now, purchaseDate);
    for (let i = 0; i <= months; i++) {
      const d = subMonths(now, months - i);
      const key = format(d, "yyyy-MM");
      byMonth[key] = { profit: 0, depreciation: inv.depreciation_monthly };
    }
    services.forEach((s) => {
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
      month: k, lucro: byMonth[k].profit, depreciacao: byMonth[k].depreciation,
    }));
    return { accumulated, monthly };
  }, [investment, services]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>;
  }

  // No investment yet — show setup
  if (!investment && !showInvestmentForm) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-sm text-muted-foreground">Nenhum investimento registrado para esta máquina.</p>
        <Button onClick={() => setShowInvestmentForm(true)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Registrar Investimento
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Investment Form */}
      {showInvestmentForm && (
        <Card className="border-dashed">
          <CardContent className="pt-4 space-y-4">
            <h4 className="font-semibold text-sm">{editingInvestment ? "Editar Investimento" : "Novo Investimento"}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <RadioGroupItem value="linear" id={`dep-linear-${machineId}`} />
                    <Label htmlFor={`dep-linear-${machineId}`} className="text-xs font-normal">Linear</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="percentage" id={`dep-pct-${machineId}`} />
                    <Label htmlFor={`dep-pct-${machineId}`} className="text-xs font-normal">% ao ano</Label>
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
              Depreciação mensal: <strong>{fmt(computeDepMonthly(formInvestedValue, formDepMethod, formUsefulLife, formDepRate))}</strong>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveInvestment} size="sm" className="gap-2"><Save className="w-4 h-4" /> Salvar</Button>
              <Button variant="outline" size="sm" onClick={resetInvestmentForm}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard */}
      {investment && metrics && !showInvestmentForm && (
        <>
          {/* Investment summary + actions */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm">
              <span className="font-medium">{fmt(investment.invested_value)}</span>
              <span className="text-muted-foreground ml-2">• {format(parseISO(investment.purchase_date), "dd/MM/yyyy")}</span>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={editInvestmentHandler}><Edit2 className="w-3 h-3 mr-1" /> Editar</Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive" onClick={deleteInvestmentHandler}><Trash2 className="w-3 h-3 mr-1" /> Excluir</Button>
            </div>
          </div>

          {/* Period filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium">Período:</span>
            {(["3m", "6m", "12m", "all"] as PeriodFilter[]).map((p) => (
              <Button key={p} variant={periodFilter === p ? "default" : "outline"} size="sm" onClick={() => setPeriodFilter(p)} className="text-xs h-7 px-2">
                {p === "3m" ? "3m" : p === "6m" ? "6m" : p === "12m" ? "12m" : "Tudo"}
              </Button>
            ))}
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5"><Percent className="w-3 h-3" /> Máquina Paga</div>
              <p className="text-lg font-bold">{metrics.percentPaid.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5"><DollarSign className="w-3 h-3" /> Valor Pago</div>
              <p className="text-sm font-bold text-primary">{fmt(metrics.accumulated)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5"><Target className="w-3 h-3" /> Falta Pagar</div>
              <p className="text-sm font-bold text-destructive">{fmt(metrics.remaining)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5"><TrendingUp className="w-3 h-3" /> Deprec./mês</div>
              <p className="text-sm font-bold">{fmt(metrics.depreciationMonthly)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5"><DollarSign className="w-3 h-3" /> Lucro líq./mês</div>
              <p className="text-sm font-bold">{fmt(Math.max(0, metrics.avgMonthlyNet))}</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5"><Clock className="w-3 h-3" /> Meses p/ pagar</div>
              <p className="text-sm font-bold">{metrics.monthsToPayoff === Infinity ? "∞" : metrics.monthsToPayoff}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">Progresso: Máquina Paga</span>
              <span className="text-xs font-bold">{metrics.percentPaid.toFixed(1)}%</span>
            </div>
            <Progress value={Math.min(100, metrics.percentPaid)} className="h-3" />
            <div className="flex justify-between mt-0.5 text-[10px] text-muted-foreground">
              <span>{fmt(metrics.accumulated)}</span>
              <span>{fmt(investment.invested_value)}</span>
            </div>
          </div>

          {/* Resale Value Card */}
          <Card className="border-primary/20">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Valor Estimado (Revenda)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase">Valor Inicial</p>
                  <p className="text-xs font-bold">{fmt(investment.invested_value)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase">Uso</p>
                  <p className="text-xs font-bold">{metrics.monthsSincePurchase} meses</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase">Contábil</p>
                  <p className="text-xs font-bold">{fmt(metrics.bookValue)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase">Mín. Mercado</p>
                  <p className="text-xs font-bold">{fmt(metrics.marketFloor)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase">Deprec. Acum.</p>
                  <p className="text-xs font-bold text-destructive">{fmt(metrics.depAccumulated)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase">Estimado</p>
                  <p className="text-sm font-bold text-primary">{fmt(metrics.estimatedResaleValue)}</p>
                </div>
              </div>
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium">Valor Preservado</span>
                  <span className="text-xs font-bold text-primary">{metrics.valuePreservedPercent.toFixed(1)}%</span>
                </div>
                <Progress value={Math.min(100, metrics.valuePreservedPercent)} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-3">
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs">Acumulado</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                {chartData.accumulated.length > 0 ? (
                  <ChartContainer config={{
                    acumulado: { label: "Acumulado", color: "hsl(var(--primary))" },
                    meta: { label: "Meta", color: "hsl(var(--destructive))" },
                  }} className="h-[180px]">
                    <LineChart data={chartData.accumulated}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="acumulado" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="meta" stroke="hsl(var(--destructive))" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">Sem dados</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs">Lucro vs Depreciação</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                {chartData.monthly.length > 0 ? (
                  <ChartContainer config={{
                    lucro: { label: "Lucro", color: "hsl(var(--primary))" },
                    depreciacao: { label: "Depreciação", color: "hsl(var(--destructive))" },
                  }} className="h-[180px]">
                    <BarChart data={chartData.monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="lucro" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="depreciacao" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">Sem dados</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Services */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4">
              <CardTitle className="text-xs">Serviços ({filteredServices.length})</CardTitle>
              <Button size="sm" className="gap-1 h-7 text-xs" onClick={() => setShowServiceForm(true)}>
                <Plus className="w-3 h-3" /> Serviço
              </Button>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {showServiceForm && (
                <Card className="border-dashed mb-3">
                  <CardContent className="pt-3 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Data</Label>
                        <Input type="date" value={svcDate} onChange={(e) => setSvcDate(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Cliente</Label>
                        <Input placeholder="Nome" value={svcClient} onChange={(e) => setSvcClient(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Receita (R$)</Label>
                        <Input type="number" min={0} value={svcRevenue || ""} onChange={(e) => setSvcRevenue(Number(e.target.value))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Custo Material</Label>
                        <Input type="number" min={0} value={svcMaterialCost || ""} onChange={(e) => setSvcMaterialCost(Number(e.target.value))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Custo Máquina</Label>
                        <Input type="number" min={0} value={svcMachineCost || ""} onChange={(e) => setSvcMachineCost(Number(e.target.value))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Custos Adicionais</Label>
                        <Input type="number" min={0} value={svcAdditional || ""} onChange={(e) => setSvcAdditional(Number(e.target.value))} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Observações</Label>
                      <Input placeholder="Notas" value={svcNotes} onChange={(e) => setSvcNotes(e.target.value)} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Lucro: <strong>{fmt(svcRevenue - svcMaterialCost - svcMachineCost - svcAdditional)}</strong>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveService} size="sm" className="gap-1 h-7 text-xs"><Save className="w-3 h-3" /> Salvar</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowServiceForm(false)}>Cancelar</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {filteredServices.length > 0 ? (
                <div className="overflow-auto max-h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Data</TableHead>
                        <TableHead className="text-xs">Cliente</TableHead>
                        <TableHead className="text-xs text-right">Receita</TableHead>
                        <TableHead className="text-xs text-right">Lucro</TableHead>
                        <TableHead className="w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredServices.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-xs">{format(parseISO(s.service_date), "dd/MM/yy")}</TableCell>
                          <TableCell className="text-xs">{s.client_name || "—"}</TableCell>
                          <TableCell className="text-xs text-right">{fmt(s.revenue)}</TableCell>
                          <TableCell className={`text-xs text-right font-medium ${s.profit >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(s.profit)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => deleteService(s.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum serviço registrado.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
