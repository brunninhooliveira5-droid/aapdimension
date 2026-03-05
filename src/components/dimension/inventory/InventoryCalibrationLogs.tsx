import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useModule } from "@/contexts/ModuleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Search } from "lucide-react";
import { format } from "date-fns";
import { InventoryDateFilter, filterByMonthYear, getMonthLabel } from "./InventoryDateFilter";
import { exportInventoryPdf } from "@/lib/inventory-pdf";

export function InventoryCalibrationLogs() {
  const { tables } = useModule();
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: [tables.inventoryCalibrationLogs],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tables.inventoryCalibrationLogs as any)
        .select(`*, ${tables.inventoryItems}(name, internal_code)`)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-for-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, name");
      return data || [];
    },
  });

  const profileMap = Object.fromEntries((profiles as any[]).map((p: any) => [p.id, p.name]));

  const dateFiltered = filterByMonthYear(logs as any[], month, year);

  const filtered = dateFiltered.filter((l: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const itemName = l[tables.inventoryItems]?.name || "";
    const itemCode = l[tables.inventoryItems]?.internal_code || "";
    const reason = l.reason || "";
    return itemName.toLowerCase().includes(s) || itemCode.toLowerCase().includes(s) || reason.toLowerCase().includes(s);
  });

  const hasFilter = !!month || !!year;
  const filterLabel = hasFilter
    ? `${month ? getMonthLabel(month) : "Todos os meses"} / ${year || "Todos os anos"}`
    : "";

  const handleExport = () => {
    exportInventoryPdf({
      title: "Logs de Calibração",
      filterLabel,
      columns: ["Data", "Código", "Item", "Qtd Anterior", "Qtd Nova", "Diferença", "Motivo", "Responsável"],
      rows: filtered.map((l: any) => [
        format(new Date(l.created_at), "dd/MM/yy HH:mm"),
        l[tables.inventoryItems]?.internal_code || "-",
        l[tables.inventoryItems]?.name || "-",
        String(Number(l.old_quantity)),
        String(Number(l.new_quantity)),
        String(Number(l.difference)),
        l.reason || "-",
        profileMap[l.calibrated_by] || "-",
      ]),
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Logs de Calibração
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por item ou motivo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>
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
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum log de calibração encontrado.</p>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qtd Anterior</TableHead>
                  <TableHead className="text-right">Qtd Nova</TableHead>
                  <TableHead className="text-right">Diferença</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l: any) => {
                  const diff = Number(l.difference);
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(l.created_at), "dd/MM/yy HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>{l[tables.inventoryItems]?.name || "-"}</div>
                        {l[tables.inventoryItems]?.internal_code && (
                          <span className="text-xs text-muted-foreground">{l[tables.inventoryItems].internal_code}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{Number(l.old_quantity)}</TableCell>
                      <TableCell className="text-right">{Number(l.new_quantity)}</TableCell>
                      <TableCell className="text-right">
                        <Badge className={diff > 0 ? "bg-emerald-500 text-white" : diff < 0 ? "bg-destructive text-destructive-foreground" : ""}>
                          {diff > 0 ? `+${diff}` : diff}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{l.reason || "-"}</TableCell>
                      <TableCell className="text-xs">{profileMap[l.calibrated_by] || "-"}</TableCell>
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
