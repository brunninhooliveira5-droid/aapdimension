import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Trash2, FileDown, FileText, ChevronDown, Filter } from "lucide-react";
import { generateProposalPdf } from "@/lib/proposal-pdf";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Proposal {
  id: string;
  client_name: string;
  client_company: string;
  model_name: string;
  total_price: number;
  status: string;
  created_at: string;
  description: string;
  tech_specs: string;
  included_items: any[];
  optional_items: any[];
  base_price: number;
  optional_total: number;
  delivery_days: number | null;
  notes: string;
  payment_conditions: string;
  validity_days: number;
  client_email: string;
  client_phone: string;
  client_document: string;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  rascunho: { label: "Rascunho", variant: "outline" },
  enviada: { label: "Enviada", variant: "default" },
  aprovada: { label: "Aprovada", variant: "default" },
  recusada: { label: "Recusada", variant: "destructive" },
  expirada: { label: "Expirada", variant: "secondary" },
  fechado: { label: "Fechado", variant: "default" },
};

export function ProposalHistory() {
  const { session } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [modelFilter, setModelFilter] = useState("todos");
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("client_proposals")
      .select("*")
      .order("created_at", { ascending: false });
    setProposals((data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const uniqueModels = [...new Set(proposals.map(p => p.model_name).filter(Boolean))].sort();

  const filtered = proposals.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.client_name.toLowerCase().includes(q) || p.model_name.toLowerCase().includes(q) || p.client_company?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "todos" || p.status === statusFilter;
    const matchModel = modelFilter === "todos" || p.model_name === modelFilter;
    return matchSearch && matchStatus && matchModel;
  });

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("client_proposals").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Proposta excluída");
    setDeleteConfirm({ open: false, id: "", name: "" });
    fetchData();
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("client_proposals").update({ status: newStatus }).eq("id", id);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    toast.success("Status atualizado");
    fetchData();
  };

  const handleDownloadPdf = async (proposal: Proposal) => {
    const { data: pdfSettings } = await supabase
      .from("pdf_quote_settings")
      .select("*")
      .eq("user_id", session?.user?.id ?? "")
      .maybeSingle();

    await generateProposalPdf({
      ...proposal,
      pdfSettings: pdfSettings as any,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar proposta..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Status</SelectItem>
            {Object.entries(statusMap).map(([key, val]) => (
              <SelectItem key={key} value={key}>{val.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={modelFilter} onValueChange={setModelFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Modelo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Modelos</SelectItem>
            {uniqueModels.map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">Nenhuma proposta encontrada</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Data</th>
                <th className="text-left p-3 font-medium">Cliente</th>
                <th className="text-left p-3 font-medium">Modelo</th>
                <th className="text-right p-3 font-medium">Valor</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="p-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(p => {
                const st = statusMap[p.status] ?? { label: p.status, variant: "secondary" as const };
                return (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="p-3 text-xs">{format(new Date(p.created_at), "dd/MM/yy")}</td>
                    <td className="p-3">
                      <div className="font-medium">{p.client_name}</div>
                      {p.client_company && <div className="text-xs text-muted-foreground">{p.client_company}</div>}
                    </td>
                    <td className="p-3">{p.model_name}</td>
                    <td className="p-3 text-right font-medium">{p.total_price > 0 ? fmt(p.total_price) : "—"}</td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="inline-flex items-center gap-1 cursor-pointer hover:opacity-80">
                            <Badge variant={st.variant}>{st.label}</Badge>
                            <ChevronDown className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {Object.entries(statusMap).map(([key, val]) => (
                            <DropdownMenuItem key={key} onClick={() => handleStatusChange(p.id, key)} className={p.status === key ? "font-bold" : ""}>
                              {val.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleDownloadPdf(p)} title="Baixar PDF">
                          <FileDown className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteConfirm({ open: true, id: p.id, name: p.client_name })} title="Excluir">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={deleteConfirm.open} onOpenChange={o => !o && setDeleteConfirm({ open: false, id: "", name: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
            <AlertDialogDescription>Proposta para "{deleteConfirm.name}" será excluída permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(deleteConfirm.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
