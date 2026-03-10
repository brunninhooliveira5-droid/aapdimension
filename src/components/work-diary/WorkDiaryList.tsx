import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Pencil, FileDown, Search } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { generateWorkDiaryPdf } from "@/lib/work-diary-pdf";
import { WorkDiaryViewDialog } from "./WorkDiaryViewDialog";

const typeLabels: Record<string, string> = {
  obra: "Obra",
  servico: "Serviço",
  atividade_interna: "Ativ. Interna",
  inspecao: "Inspeção",
  visita_tecnica: "Visita Técnica",
  outro: "Outro",
};

const statusLabels: Record<string, string> = {
  concluido: "Concluído",
  parcialmente_concluido: "Parcial",
  nao_concluido: "Não Concluído",
};

const statusColors: Record<string, string> = {
  concluido: "bg-green-500/10 text-green-700 dark:text-green-400",
  parcialmente_concluido: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  nao_concluido: "bg-red-500/10 text-red-700 dark:text-red-400",
};

interface Props {
  onEdit: (id: string) => void;
  onNew: () => void;
}

export function WorkDiaryList({ onEdit, onNew }: Props) {
  const { effectiveUserId, isRealAdminMaster, isImpersonating } = useEffectiveUser();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewEntry, setViewEntry] = useState<any>(null);

  const fetchEntries = async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    let q = supabase.from("work_diary_entries").select("*").order("entry_date", { ascending: false });
    if (!isRealAdminMaster || isImpersonating) {
      q = q.eq("user_id", effectiveUserId);
    }
    const { data, error } = await q;
    if (error) toast.error("Erro ao carregar registros");
    setEntries(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, [effectiveUserId]);

  const filtered = entries.filter((e) => {
    if (filterType !== "all" && e.activity_type !== filterType) return false;
    if (filterStatus !== "all" && e.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!e.title?.toLowerCase().includes(s) && !e.location?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const handleGeneratePdf = async (entry: any) => {
    try {
      const { data: files } = await supabase.from("work_diary_files").select("*").eq("entry_id", entry.id);
      const { data: config } = await supabase.from("work_diary_pdf_config").select("*").eq("user_id", entry.user_id).single();
      const { data: profile } = await supabase.from("profiles").select("signature_url, signature_size, signature_offset_x, signature_offset_y, signature_zoom, signature_darkness, name, company").eq("id", entry.user_id).single();
      await generateWorkDiaryPdf(entry, files || [], config, profile);
      toast.success("PDF gerado com sucesso!");
    } catch {
      toast.error("Erro ao gerar PDF");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar título ou local..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-56" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Registro</Button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Nº</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum registro encontrado.</TableCell></TableRow>
            ) : filtered.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-xs">{e.entry_number}</TableCell>
                <TableCell className="text-sm">{e.entry_date ? format(new Date(e.entry_date), "dd/MM/yyyy") : "-"}</TableCell>
                <TableCell className="font-medium text-sm max-w-[200px] truncate">{e.title || "-"}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{typeLabels[e.activity_type] || e.activity_type}</Badge></TableCell>
                <TableCell className="text-sm max-w-[150px] truncate">{e.location || "-"}</TableCell>
                <TableCell><Badge className={`text-xs ${statusColors[e.status] || ""}`}>{statusLabels[e.status] || e.status}</Badge></TableCell>
                <TableCell className="text-sm">{e.responsible || "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewEntry(e)} title="Visualizar"><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(e.id)} title="Editar"><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleGeneratePdf(e)} title="Gerar PDF"><FileDown className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {viewEntry && <WorkDiaryViewDialog entry={viewEntry} open={!!viewEntry} onClose={() => setViewEntry(null)} />}
    </div>
  );
}
