import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, History } from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const typeLabels: Record<string, string> = {
  pagamento: "Pagamento", recebimento: "Recebimento", recibo: "Recibo", entrada: "Entrada", parcela: "Parcela",
};
const statusColors: Record<string, string> = {
  pago: "bg-emerald-500/10 text-emerald-600",
  pendente: "bg-amber-500/10 text-amber-600",
  atrasado: "bg-red-500/10 text-red-600",
};

export function PaymentHistoryTab() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      const { data } = await supabase.from("payment_history").select("*").order("payment_date", { ascending: false });
      setHistory(data ?? []);
      setLoading(false);
    };
    fetch_();
  }, []);

  const filtered = history.filter(h => {
    const q = search.toLowerCase();
    const matchSearch = !q || h.party_name?.toLowerCase().includes(q) || h.contract_id?.toLowerCase().includes(q) || h.proposal_id?.toLowerCase().includes(q);
    const matchType = typeFilter === "all" || h.payment_type === typeFilter;
    const matchStatus = statusFilter === "all" || h.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente, contrato..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pagamento">Pagamento</SelectItem>
            <SelectItem value="recebimento">Recebimento</SelectItem>
            <SelectItem value="entrada">Entrada</SelectItem>
            <SelectItem value="parcela">Parcela</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <History className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">Nenhum registro no histórico</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-2.5 font-medium">Data</th>
                  <th className="text-left px-4 py-2.5 font-medium">Cliente</th>
                  <th className="text-left px-4 py-2.5 font-medium">Tipo</th>
                  <th className="text-right px-4 py-2.5 font-medium">Valor</th>
                  <th className="text-left px-4 py-2.5 font-medium">Pagamento</th>
                  <th className="text-left px-4 py-2.5 font-medium">Parcela</th>
                  <th className="text-left px-4 py-2.5 font-medium">Contrato</th>
                  <th className="text-center px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(h => (
                  <tr key={h.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 text-xs">{new Date(h.payment_date).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-2.5 font-medium max-w-[160px] truncate">{h.party_name || "—"}</td>
                    <td className="px-4 py-2.5 text-xs">{typeLabels[h.payment_type] || h.payment_type}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{fmt(Number(h.amount))}</td>
                    <td className="px-4 py-2.5 text-xs capitalize">{h.payment_method}</td>
                    <td className="px-4 py-2.5 text-xs">{h.total_installments > 0 ? `${h.current_installment}/${h.total_installments}` : "—"}</td>
                    <td className="px-4 py-2.5 text-xs">{h.contract_id || h.proposal_id || "—"}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge className={statusColors[h.status] || "bg-muted text-muted-foreground"}>{h.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
