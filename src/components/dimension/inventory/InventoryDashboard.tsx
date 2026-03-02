import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, DollarSign, AlertTriangle, PackageX, BookmarkCheck, ArrowDownUp } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export function InventoryDashboard() {
  const { data: items = [] } = useQuery({
    queryKey: ["inventory-items-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory_items").select("*").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["inventory-movements-dashboard"],
    queryFn: async () => {
      const sixMonthsAgo = subMonths(new Date(), 6).toISOString();
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("*, inventory_items(name)")
        .gte("created_at", sixMonthsAgo)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalItems = items.length;
  const totalValue = items.reduce((sum, i) => sum + Number(i.current_quantity) * Number(i.avg_cost || i.unit_cost), 0);
  const belowMin = items.filter((i) => Number(i.current_quantity) <= Number(i.min_quantity) && Number(i.current_quantity) > 0).length;
  const zeroItems = items.filter((i) => Number(i.current_quantity) === 0).length;
  const reservedItems = items.filter((i) => Number(i.reserved_quantity) > 0).length;

  // Monthly entries vs exits
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), 5 - i);
    const monthStart = startOfMonth(month);
    const monthEnd = startOfMonth(subMonths(new Date(), 4 - i));
    const monthMovements = movements.filter((m) => {
      const d = new Date(m.created_at);
      return d >= monthStart && (i === 5 || d < monthEnd);
    });
    return {
      month: format(month, "MMM", { locale: ptBR }),
      entradas: monthMovements.filter((m) => m.movement_type === "entrada").reduce((s, m) => s + Number(m.quantity), 0),
      saidas: monthMovements.filter((m) => m.movement_type === "saida").reduce((s, m) => s + Number(m.quantity), 0),
    };
  });

  // By type
  const typeMap: Record<string, number> = {};
  items.forEach((i) => {
    const label = { materia_prima: "Matéria-prima", componente: "Componente", consumivel: "Consumível", ferramenta: "Ferramenta", produto_acabado: "Produto Acabado" }[i.item_type] || i.item_type;
    typeMap[label] = (typeMap[label] || 0) + 1;
  });
  const typeData = Object.entries(typeMap).map(([name, value]) => ({ name, value }));
  const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  const statCards = [
    { label: "Total de Itens", value: totalItems, icon: Package, color: "text-primary" },
    { label: "Valor em Estoque", value: `R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-emerald-500" },
    { label: "Abaixo do Mínimo", value: belowMin, icon: AlertTriangle, color: "text-amber-500" },
    { label: "Itens Zerados", value: zeroItems, icon: PackageX, color: "text-destructive" },
    { label: "Itens Reservados", value: reservedItems, icon: BookmarkCheck, color: "text-blue-500" },
    { label: "Movimentações", value: movements.length, icon: ArrowDownUp, color: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Entradas vs Saídas (6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ entradas: { label: "Entradas", color: "hsl(var(--chart-2))" }, saidas: { label: "Saídas", color: "hsl(var(--chart-5))" } }} className="h-[250px]">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="entradas" fill="var(--color-entradas)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saidas" fill="var(--color-saidas)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Distribuição por Tipo</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {typeData.length > 0 ? (
              <div className="h-[250px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {typeData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-10">Nenhum item cadastrado.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {movements.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Últimas Movimentações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {movements.slice(0, 8).map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm border-b pb-1">
                  <span className="font-medium">{(m as any).inventory_items?.name || "Item"}</span>
                  <span className={m.movement_type === "entrada" ? "text-emerald-500" : "text-destructive"}>
                    {m.movement_type === "entrada" ? "+" : "-"}{Number(m.quantity)}
                  </span>
                  <span className="text-muted-foreground text-xs">{format(new Date(m.created_at), "dd/MM HH:mm")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
