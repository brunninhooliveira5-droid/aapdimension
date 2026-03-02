import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowDownUp } from "lucide-react";
import { format } from "date-fns";

const TYPE_MAP: Record<string, { label: string; color: string }> = {
  entrada: { label: "Entrada", color: "bg-emerald-500 text-white" },
  saida: { label: "Saída", color: "bg-destructive text-destructive-foreground" },
  ajuste: { label: "Ajuste", color: "bg-amber-500 text-white" },
  reserva: { label: "Reserva", color: "bg-blue-500 text-white" },
  cancelamento: { label: "Cancelamento", color: "bg-muted text-muted-foreground" },
};

export function InventoryMovements() {
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["inventory-movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("*, inventory_items(name, internal_code)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><ArrowDownUp className="h-4 w-4" />Movimentações</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
        ) : movements.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma movimentação registrada.</p>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Projeto/Máquina</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => {
                  const t = TYPE_MAP[m.movement_type] || { label: m.movement_type, color: "" };
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs">{format(new Date(m.created_at), "dd/MM/yy HH:mm")}</TableCell>
                      <TableCell className="font-medium">{(m as any).inventory_items?.name || "-"}</TableCell>
                      <TableCell><Badge className={t.color}>{t.label}</Badge></TableCell>
                      <TableCell className="text-right">{Number(m.quantity)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.reason || "-"}</TableCell>
                      <TableCell className="text-xs">{m.linked_project || m.linked_machine || "-"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
