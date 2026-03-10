import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, Pencil, FileText, ClipboardList } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { generateContractPdf } from "@/lib/contract-pdf";

interface Contract {
  id: string;
  contract_number: number;
  client_name: string;
  machine_model: string;
  closing_date: string;
  total_value: number;
  payment_method: string;
  status: string;
}

const statusColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  finalizado: "bg-primary/10 text-primary",
  enviado: "bg-blue-500/10 text-blue-600",
  assinado: "bg-emerald-500/10 text-emerald-600",
};

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  finalizado: "Finalizado",
  enviado: "Enviado",
  assinado: "Assinado",
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  onEdit: (id: string) => void;
  onNew: () => void;
}

export function ContractsList({ onEdit, onNew }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewContract, setViewContract] = useState<any | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  const fetchContracts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("dimension_contracts" as any)
      .select("*")
      .order("contract_number", { ascending: false });
    if (error) { toast.error("Erro ao carregar contratos"); console.error(error); }
    setContracts((data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchContracts(); }, []);

  const filtered = contracts.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.client_name.toLowerCase().includes(q) || c.machine_model.toLowerCase().includes(q) || String(c.contract_number).includes(q);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleView = async (id: string) => {
    const { data } = await supabase.from("dimension_contracts" as any).select("*").eq("id", id).single();
    if (data) {
      const { data: items } = await supabase.from("dimension_contract_items" as any).select("*").eq("contract_id", id).order("sort_order");
      setViewContract({ ...(data as any), items: items ?? [] });
    }
  };

  const handleGeneratePdf = async (id: string) => {
    setGeneratingPdf(id);
    try {
      const { data: contract } = await supabase.from("dimension_contracts" as any).select("*").eq("id", id).single();
      if (!contract) { toast.error("Contrato não encontrado"); return; }
      const { data: items } = await supabase.from("dimension_contract_items" as any).select("*").eq("contract_id", id).order("sort_order");
      const { data: pdfSettings } = await supabase.from("dimension_contract_pdf_settings" as any).select("*").limit(1).maybeSingle();
      const { blob, fileName } = await generateContractPdf({ ...(contract as any), items: (items as any[]) ?? [] }, pdfSettings as any);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF gerado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao gerar PDF: " + (err.message || ""));
      console.error(err);
    }
    setGeneratingPdf(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente, modelo, nº..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="assinado">Assinado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={onNew}>
          <Plus className="w-4 h-4 mr-1" /> Novo Contrato
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">Nenhum contrato encontrado</p>
          <Button size="sm" variant="outline" onClick={onNew}>
            <Plus className="w-4 h-4 mr-1" /> Criar primeiro contrato
          </Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-2.5 font-medium">Nº</th>
                  <th className="text-left px-4 py-2.5 font-medium">Data</th>
                  <th className="text-left px-4 py-2.5 font-medium">Cliente</th>
                  <th className="text-left px-4 py-2.5 font-medium">Máquina</th>
                  <th className="text-right px-4 py-2.5 font-medium">Valor Total</th>
                  <th className="text-left px-4 py-2.5 font-medium">Pagamento</th>
                  <th className="text-center px-4 py-2.5 font-medium">Status</th>
                  <th className="text-center px-4 py-2.5 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs">{String(c.contract_number).padStart(4, "0")}</td>
                    <td className="px-4 py-2.5 text-xs">{new Date(c.closing_date).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-2.5 font-medium max-w-[200px] truncate">{c.client_name || "—"}</td>
                    <td className="px-4 py-2.5 text-xs">{c.machine_model || "—"}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{fmt(c.total_value)}</td>
                    <td className="px-4 py-2.5 text-xs max-w-[140px] truncate">{c.payment_method || "—"}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge className={statusColors[c.status] || ""}>{statusLabels[c.status] || c.status}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1 justify-center">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleView(c.id)} title="Visualizar">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(c.id)} title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleGeneratePdf(c.id)} disabled={generatingPdf === c.id} title="Gerar PDF">
                          <FileText className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View dialog */}
      <Dialog open={!!viewContract} onOpenChange={o => !o && setViewContract(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contrato #{viewContract?.contract_number ? String(viewContract.contract_number).padStart(4, "0") : ""}</DialogTitle>
          </DialogHeader>
          {viewContract && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Cliente:</span> <strong>{viewContract.client_name}</strong></div>
                <div><span className="text-muted-foreground">CPF/CNPJ:</span> {viewContract.client_document}</div>
                <div><span className="text-muted-foreground">Endereço:</span> {viewContract.client_address}</div>
                <div><span className="text-muted-foreground">Telefone:</span> {viewContract.client_phone}</div>
                <div><span className="text-muted-foreground">E-mail:</span> {viewContract.client_email}</div>
                <div><span className="text-muted-foreground">Responsável:</span> {viewContract.client_responsible}</div>
              </div>
              <div className="border-t border-border pt-3">
                <h4 className="font-semibold mb-2">Máquina</h4>
                <p><strong>{viewContract.machine_model}</strong></p>
                {viewContract.machine_description && <p className="text-muted-foreground text-xs">{viewContract.machine_description}</p>}
              </div>
              {viewContract.items?.length > 0 && (
                <div className="border-t border-border pt-3">
                  <h4 className="font-semibold mb-2">Itens Contratados</h4>
                  <div className="space-y-1">
                    {viewContract.items.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-xs">
                        <span>{item.description} (x{item.quantity})</span>
                        <span>{fmt(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="border-t border-border pt-3">
                <div className="flex justify-between font-semibold">
                  <span>Valor Total:</span>
                  <span className="text-primary">{fmt(viewContract.total_value)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Pagamento: {viewContract.payment_method}</p>
              </div>
              {viewContract.clauses && (
                <div className="border-t border-border pt-3">
                  <h4 className="font-semibold mb-1">Cláusulas</h4>
                  <p className="text-xs whitespace-pre-wrap text-muted-foreground">{viewContract.clauses}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
