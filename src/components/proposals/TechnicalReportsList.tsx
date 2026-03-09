import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Edit, Trash2, FileDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { TechnicalReportForm } from "./TechnicalReportForm";
import { generateTechnicalReportPdf } from "@/lib/technical-report-pdf";

const statusColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  em_andamento: "bg-blue-500/20 text-blue-400",
  finalizado: "bg-emerald-500/20 text-emerald-400",
  enviado: "bg-purple-500/20 text-purple-400",
};

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  em_andamento: "Em Andamento",
  finalizado: "Finalizado",
  enviado: "Enviado",
};

export function TechnicalReportsList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["technical-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technical_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("technical_reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technical-reports"] });
      toast.success("Relatório excluído");
    },
    onError: () => toast.error("Erro ao excluir relatório"),
  });

  const filtered = reports.filter((r: any) => {
    const matchSearch =
      !search ||
      r.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.technician_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.equipment_name?.toLowerCase().includes(search.toLowerCase()) ||
      String(r.report_number).includes(search);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (creating || editingId) {
    return (
      <TechnicalReportForm
        reportId={editingId}
        onClose={() => {
          setCreating(false);
          setEditingId(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Relatório
        </Button>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nº, cliente, técnico..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="finalizado">Finalizado</SelectItem>
            <SelectItem value="enviado">Enviado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Nenhum relatório técnico encontrado</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Nº</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead>Equipamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">#{r.report_number}</TableCell>
                  <TableCell className="text-sm">
                    {r.attendance_date ? format(new Date(r.attendance_date), "dd/MM/yyyy") : "-"}
                  </TableCell>
                  <TableCell className="text-sm">{r.client_name || "-"}</TableCell>
                  <TableCell className="text-sm">{r.technician_name || "-"}</TableCell>
                  <TableCell className="text-sm">{r.equipment_name || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[r.status] || ""}>
                      {statusLabels[r.status] || r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditingId(r.id)} title="Editar">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => generateTechnicalReportPdf(r)}
                        title="Gerar PDF"
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm("Excluir este relatório?")) deleteMutation.mutate(r.id);
                        }}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
