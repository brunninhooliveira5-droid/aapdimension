import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useModule } from "@/contexts/ModuleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, PackageX, TrendingUp, ShoppingCart } from "lucide-react";

export function InventoryAlerts() {
  const { tables } = useModule();

  const { data: items = [] } = useQuery({
    queryKey: [tables.inventoryItems, "alerts"],
    queryFn: async () => {
      const { data } = await supabase.from(tables.inventoryItems as any).select(`*, ${tables.inventoryUnits}(abbreviation)`).eq("is_active", true);
      return data || [];
    },
  });

  const { data: movements = [] } = useQuery({
    queryKey: [tables.inventoryMovements, "90d"],
    queryFn: async () => {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      const { data } = await supabase.from(tables.inventoryMovements as any).select("item_id, quantity, movement_type").eq("movement_type", "saida").gte("created_at", d.toISOString());
      return data || [];
    },
  });

  const alerts: { type: string; icon: any; color: string; message: string }[] = [];

  (items as any[]).forEach((item) => {
    const qty = Number(item.current_quantity);
    const min = Number(item.min_quantity);
    const unit = item[tables.inventoryUnits]?.abbreviation || "un";

    if (qty === 0) {
      alerts.push({ type: "zerado", icon: PackageX, color: "text-destructive", message: `${item.name} — estoque ZERADO` });
    } else if (min > 0 && qty <= min) {
      alerts.push({ type: "baixo", icon: AlertTriangle, color: "text-amber-500", message: `${item.name} — estoque baixo (${qty} ${unit}, mín: ${min})` });
    }

    const itemMovements = (movements as any[]).filter((m) => m.item_id === item.id);
    const totalOut = itemMovements.reduce((s: number, m: any) => s + Number(m.quantity), 0);
    const avgMonthly = totalOut / 3;
    if (avgMonthly > 0 && qty > 0) {
      const daysRemaining = Math.round((qty / avgMonthly) * 30);
      if (daysRemaining <= 15) {
        alerts.push({ type: "previsao", icon: TrendingUp, color: "text-orange-500", message: `${item.name} — acabará em ~${daysRemaining} dias (consumo médio: ${avgMonthly.toFixed(1)} ${unit}/mês)` });
      }
    }

    if (avgMonthly > 0 && qty <= min) {
      alerts.push({ type: "compra", icon: ShoppingCart, color: "text-blue-500", message: `Compra recomendada: ${item.name} (necessário ~${Math.ceil(avgMonthly)} ${unit}/mês)` });
    }
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4" />Alertas
          {alerts.length > 0 && <Badge variant="destructive">{alerts.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">✅ Nenhum alerta no momento.</p>
        ) : (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                <a.icon className={`h-5 w-5 mt-0.5 shrink-0 ${a.color}`} />
                <p className="text-sm">{a.message}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
