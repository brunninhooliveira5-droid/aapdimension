import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useModule } from "@/contexts/ModuleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowDownUp } from "lucide-react";
import { format } from "date-fns";
import { InventoryDateFilter, filterByMonthYear, getMonthLabel } from "./InventoryDateFilter";
import { exportInventoryPdf } from "@/lib/inventory-pdf";

const TYPE_MAP: Record<string, { label: string; color: string }> = {
  entrada: { label: "Entrada", color: "bg-emerald-500 text-white" },
  saida: { label: "Saída", color: "bg-destructive text-destructive-foreground" },
  ajuste: { label: "Ajuste", color: "bg-amber-500 text-white" },
  reserva: { label: "Reserva", color: "bg-blue-500 text-white" },
  cancelamento: { label: "Cancelamento", color: "bg-muted text-muted-foreground" },
};

export function InventoryMovements() {
  const { tables } = useModule();
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const { data: movements = [], isLoading } = useQuery({
    queryKey: [tables.inventoryMovements],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tables.inventoryMovements as any)
        .select(`*, ${tables.inventoryItems}(name, internal_code)`)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = filterByMonthYear(movements as any[], month, year);
  const hasFilter = !!month || !!year;
  const filterLabel = hasFilter
    ? `${month ? getMonthLabel(month) : "Todos os meses"} / ${year || "Todos os anos"}`
    : "";

  const handleExport = () => {
    exportInventoryPdf({
      title: "Movimentações de Estoque",
      filterLabel,
      columns: ["Data", "Código", "Item", "Tipo", "Qtd", "Motivo", "Projeto/Máquina"],
      rows: filtered.map((m: any) => [
        format(new Date(m.created_at), "dd/MM/yy HH:mm"),
        m[tables.inventoryItems]?.internal_code || "-",
        m[tables.inventoryItems]?.name || "-",
        TYPE_MAP[m.movement_type]?.label || m.movement_type,
        String(Number(m.quantity)),
        m.reason || "-",
        m.linked_project || m.linked_machine || "-",
      ]),
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3 space-y-2">
        <CardTitle className="text-base flex items-center gap-2"><ArrowDownUp className="h-4 w-4" />Movimentações</CardTitle>
        <InventoryDateFilter
          month={month} year={year}
          onMonthChange={setMonth} onYearChange={setYear}
          onClear={() => { setMonth(""); setYear(""); }}
          onExportPdf={handleExport}
          hasFilter={hasFilter}
        />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma movimentação encontrada.</p>
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
                {filtered.map((m: any) => {
                  const t = TYPE_MAP[m.movement_type] || { label: m.movement_type, color: "" };
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs">{format(new Date(m.created_at), "dd/MM/yy HH:mm")}</TableCell>
                      <TableCell className="font-medium">{m[tables.inventoryItems]?.name || "-"}</TableCell>
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
