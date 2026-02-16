import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { BarChart3, TrendingUp, PieChart as PieChartIcon, DollarSign, FileCheck, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface QuoteRow {
  id: string;
  file_name: string;
  material: string;
  thickness: string;
  machine_name: string;
  path_length_m: number;
  quantity: number;
  estimated_time_min: number;
  estimated_cost: number;
  min_recommended: number;
  suggested_sale: number;
  created_at: string;
  status: string;
  total_price: number;
  material_cost: number;
}

const COLORS = [
  "hsl(38, 92%, 55%)",
  "hsl(152, 60%, 42%)",
  "hsl(215, 70%, 55%)",
  "hsl(0, 72%, 51%)",
  "hsl(280, 60%, 55%)",
  "hsl(180, 50%, 45%)",
];

const chartConfig = {
  total: { label: "Total (R$)", color: "hsl(38, 92%, 55%)" },
  count: { label: "Quantidade", color: "hsl(152, 60%, 42%)" },
  cost: { label: "Custo", color: "hsl(215, 70%, 55%)" },
  sale: { label: "Preço Sugerido", color: "hsl(38, 92%, 55%)" },
};

export function QuoteReports() {
  const { session } = useAuth();
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from("cutting_quotes")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setQuotes(data as unknown as QuoteRow[]);
        setLoading(false);
      });
  }, [session]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; total: number; count: number; cost: number }>();
    quotes.forEach((q) => {
      const d = new Date(q.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      const existing = map.get(key) || { month: label, total: 0, count: 0, cost: 0 };
      existing.total += Number(q.total_price) || Number(q.suggested_sale);
      existing.cost += Number(q.estimated_cost);
      existing.count += 1;
      map.set(key, existing);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [quotes]);

  const materialData = useMemo(() => {
    const map = new Map<string, number>();
    quotes.forEach((q) => {
      map.set(q.material, (map.get(q.material) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [quotes]);

  const summaryStats = useMemo(() => {
    if (!quotes.length) return { savedRevenue: 0, totalCost: 0, totalQuotes: 0, closedRevenue: 0, closedCount: 0, closedProfit: 0 };
    const getTotal = (q: QuoteRow) => Number(q.total_price) || Number(q.suggested_sale);
    const closedQuotes = quotes.filter((q) => q.status === "fechado");
    const openQuotes = quotes.filter((q) => q.status !== "fechado");
    const savedRevenue = openQuotes.reduce((s, q) => s + getTotal(q), 0);
    const totalCost = quotes.reduce((s, q) => s + Number(q.estimated_cost), 0);
    const closedRevenue = closedQuotes.reduce((s, q) => s + getTotal(q), 0);
    const closedProfit = closedQuotes.reduce((s, q) => s + (Number(q.suggested_sale) - Number(q.material_cost)), 0);
    return {
      savedRevenue,
      totalCost,
      totalQuotes: quotes.length,
      closedRevenue,
      closedCount: closedQuotes.length,
      closedProfit,
    };
  }, [quotes]);

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Carregando relatórios...</p>;
  }

  if (!quotes.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum orçamento encontrado para gerar relatórios.</p>
          <p className="text-xs text-muted-foreground mt-1">Salve orçamentos na aba "Orçamento" para visualizar os gráficos.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <BarChart3 className="w-3.5 h-3.5" /> Total de Orçamentos
            </div>
            <p className="text-xl font-bold">{summaryStats.totalQuotes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <FileText className="w-3.5 h-3.5" /> Valor Orçamentos Salvos
            </div>
            <p className="text-xl font-bold text-primary">{fmt(summaryStats.savedRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <FileCheck className="w-3.5 h-3.5" /> Valor Orçamentos Fechados
            </div>
            <p className="text-xl font-bold text-green-600">{fmt(summaryStats.closedRevenue)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{summaryStats.closedCount} fechado(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <DollarSign className="w-3.5 h-3.5" /> Lucro Estimado
            </div>
            <p className="text-xl font-bold text-primary">{fmt(summaryStats.closedProfit)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Corte - Material (fechados)</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly Revenue Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Receita Mensal
            </CardTitle>
            <CardDescription>Preço sugerido vs custo por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" name="sale" fill="hsl(38, 92%, 55%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" name="cost" fill="hsl(215, 70%, 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Monthly Count Line Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Orçamentos por Mês
            </CardTitle>
            <CardDescription>Quantidade de orçamentos ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="count" name="count" stroke="hsl(152, 60%, 42%)" strokeWidth={2} dot={{ fill: "hsl(152, 60%, 42%)", r: 4 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Material Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-primary" /> Distribuição por Material
          </CardTitle>
          <CardDescription>Proporção de orçamentos por tipo de material</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <ChartContainer config={chartConfig} className="h-[240px] w-[260px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie data={materialData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} strokeWidth={2}>
                  {materialData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-3">
              {materialData.map((m, i) => (
                <div key={m.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground">{m.name}</span>
                  <span className="font-medium">{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
