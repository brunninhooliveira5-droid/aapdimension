import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useModule } from "@/contexts/ModuleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Package, ArrowLeft, TrendingDown, TrendingUp, AlertTriangle, Clock, MapPin, Truck, Tag, Wrench, BarChart3 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const ITEM_TYPES: Record<string, string> = {
  materia_prima: "Matéria-prima",
  componente: "Componente",
  consumivel: "Consumível",
  ferramenta: "Ferramenta",
  produto_acabado: "Produto Acabado",
};

interface InventoryItemDashboardProps {
  item: any;
  onBack: () => void;
}

export function InventoryItemDashboard({ item, onBack }: InventoryItemDashboardProps) {
  const { tables } = useModule();

  // Fetch movements for this item (last 90 days)
  const { data: movements = [] } = useQuery({
    queryKey: [tables.inventoryMovements, "item-dashboard", item.id],
    queryFn: async () => {
      const since = subDays(new Date(), 90).toISOString();
      const { data } = await supabase
        .from(tables.inventoryMovements as any)
        .select("*")
        .eq("item_id", item.id)
        .gte("created_at", since)
        .order("created_at", { ascending: true });
      return (data || []) as any[];
    },
  });

  // Fetch related data
  const { data: category } = useQuery({
    queryKey: [tables.inventoryCategories, item.category_id],
    enabled: !!item.category_id,
    queryFn: async () => {
      const { data } = await supabase.from(tables.inventoryCategories as any).select("name").eq("id", item.category_id).single();
      return data as any;
    },
  });

  const { data: unit } = useQuery({
    queryKey: [tables.inventoryUnits, item.unit_id],
    enabled: !!item.unit_id,
    queryFn: async () => {
      const { data } = await supabase.from(tables.inventoryUnits as any).select("name, abbreviation").eq("id", item.unit_id).single();
      return data as any;
    },
  });

  const { data: location } = useQuery({
    queryKey: [tables.inventoryLocations, item.location_id],
    enabled: !!item.location_id,
    queryFn: async () => {
      const { data } = await supabase.from(tables.inventoryLocations as any).select("name").eq("id", item.location_id).single();
      return data as any;
    },
  });

  const { data: supplier } = useQuery({
    queryKey: [tables.inventorySuppliers, item.supplier_id],
    enabled: !!item.supplier_id,
    queryFn: async () => {
      const { data } = await supabase.from(tables.inventorySuppliers as any).select("name").eq("id", item.supplier_id).single();
      return data as any;
    },
  });

  // Calculate indicators
  const currentQty = Number(item.current_quantity);
  const reservedQty = Number(item.reserved_quantity);
  const availableQty = currentQty - reservedQty;
  const minQty = Number(item.min_quantity);
  const idealQty = Number(item.ideal_quantity);
  const avgCost = Number(item.avg_cost || item.unit_cost);

  // Calculate consumption (exits in last 90 days)
  const totalExits = movements
    .filter((m: any) => m.movement_type === "saida")
    .reduce((sum: number, m: any) => sum + Number(m.quantity), 0);
  const totalEntries = movements
    .filter((m: any) => m.movement_type === "entrada")
    .reduce((sum: number, m: any) => sum + Number(m.quantity), 0);
  const avgMonthlyConsumption = totalExits / 3; // 90 days = 3 months
  const daysRemaining = avgMonthlyConsumption > 0 ? Math.round((currentQty / avgMonthlyConsumption) * 30) : null;

  // Build chart data (daily cumulative stock level)
  const chartData = buildChartData(movements, currentQty);

  // Stock status
  const getStatus = () => {
    if (currentQty === 0) return { label: "Zerado", color: "destructive" as const, icon: AlertTriangle };
    if (minQty > 0 && currentQty <= minQty) return { label: "Baixo", color: "secondary" as const, icon: TrendingDown };
    return { label: "Normal", color: "secondary" as const, icon: TrendingUp };
  };
  const status = getStatus();

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Voltar aos itens
      </Button>

      {/* Header with image and basic info */}
      <div className="flex gap-4 items-start">
        <div className="shrink-0">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="h-24 w-24 rounded-lg object-cover border border-border" />
          ) : (
            <div className="h-24 w-24 rounded-lg bg-muted flex items-center justify-center border border-border">
              <Package className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-foreground">{item.name}</h2>
            <Badge variant={status.color} className={currentQty === 0 ? "" : currentQty <= minQty ? "border-amber-500 text-amber-600" : "border-emerald-500 text-emerald-600"}>
              {status.label}
            </Badge>
          </div>
          {item.internal_code && <p className="text-sm text-muted-foreground mt-0.5">Código: {item.internal_code}</p>}
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
            {item.item_type && (
              <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{ITEM_TYPES[item.item_type] || item.item_type}</span>
            )}
            {category?.name && (
              <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{category.name}</span>
            )}
            {location?.name && (
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{location.name}</span>
            )}
            {supplier?.name && (
              <span className="flex items-center gap-1"><Truck className="h-3 w-3" />{supplier.name}</span>
            )}
            {unit && (
              <span className="flex items-center gap-1">Unidade: {unit.abbreviation}</span>
            )}
          </div>
          {(item.compatible_with?.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {item.compatible_with.map((c: string) => (
                <Badge key={c} variant="outline" className="text-xs gap-1">
                  <Wrench className="h-3 w-3" />{c}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Indicator cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <IndicatorCard
          title="Estoque Atual"
          value={currentQty}
          subtitle={unit ? unit.abbreviation : "un"}
          highlight={currentQty === 0 ? "destructive" : currentQty <= minQty ? "warning" : undefined}
        />
        <IndicatorCard
          title="Reservado"
          value={reservedQty}
          subtitle={`Disponível: ${availableQty}`}
        />
        <IndicatorCard
          title="Consumo Méd./Mês"
          value={avgMonthlyConsumption > 0 ? avgMonthlyConsumption.toFixed(1) : "—"}
          subtitle={daysRemaining !== null ? `~${daysRemaining} dias restantes` : "Sem consumo"}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
        <IndicatorCard
          title="Custo Médio"
          value={`R$ ${avgCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          subtitle={`Valor em estoque: R$ ${(avgCost * currentQty).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
        />
      </div>

      {/* Min/Ideal thresholds */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <IndicatorCard title="Estoque Mínimo" value={minQty} subtitle="Alerta abaixo deste valor" />
        <IndicatorCard title="Estoque Ideal" value={idealQty} subtitle="Meta de reposição" />
        <IndicatorCard title="Entradas (90d)" value={totalEntries} subtitle="Total de entradas" icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} />
        <IndicatorCard title="Saídas (90d)" value={totalExits} subtitle="Total de saídas" icon={<TrendingDown className="h-4 w-4 text-destructive" />} />
      </div>

      {/* Movement chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Movimentações (últimos 90 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Area
                  type="monotone"
                  dataKey="stock"
                  stroke="hsl(var(--primary))"
                  fill="url(#stockGrad)"
                  strokeWidth={2}
                  name="Estoque"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma movimentação nos últimos 90 dias.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function IndicatorCard({ title, value, subtitle, icon, highlight }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  highlight?: "destructive" | "warning";
}) {
  return (
    <Card className={highlight === "destructive" ? "border-destructive/50" : highlight === "warning" ? "border-amber-500/50" : ""}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{title}</p>
          {icon}
        </div>
        <p className={`text-xl font-bold mt-1 ${highlight === "destructive" ? "text-destructive" : highlight === "warning" ? "text-amber-600" : "text-foreground"}`}>
          {value}
        </p>
        {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function buildChartData(movements: any[], currentQty: number) {
  if (!movements.length) return [];

  // Work backwards from current stock to reconstruct daily levels
  const sorted = [...movements].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Calculate stock at start of period by reversing all movements
  let stockAtStart = currentQty;
  for (const m of sorted) {
    if (m.movement_type === "entrada") {
      stockAtStart -= Number(m.quantity);
    } else {
      stockAtStart += Number(m.quantity);
    }
  }

  // Build daily data forward
  const dailyMap = new Map<string, number>();
  const forwardSorted = [...movements].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  let runningStock = stockAtStart;
  for (const m of forwardSorted) {
    const day = format(new Date(m.created_at), "yyyy-MM-dd");
    if (m.movement_type === "entrada") {
      runningStock += Number(m.quantity);
    } else {
      runningStock -= Number(m.quantity);
    }
    dailyMap.set(day, Math.max(0, runningStock));
  }

  // Add today
  const today = format(new Date(), "yyyy-MM-dd");
  if (!dailyMap.has(today)) {
    dailyMap.set(today, currentQty);
  }

  return Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stock]) => ({
      label: format(new Date(date + "T12:00:00"), "dd/MM", { locale: ptBR }),
      stock,
      date,
    }));
}
