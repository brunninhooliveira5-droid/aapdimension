import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, Pencil, FileText, ClipboardList } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { generateReceiptPdf } from "@/lib/receipt-pdf";

const statusColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  finalizado: "bg-primary/10 text-primary",
  assinado: "bg-emerald-500/10 text-emerald-600",
  enviado: "bg-blue-500/10 text-blue-600",
};
const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  finalizado: "Finalizado",
  assinado: "Assinado",
  enviado: "Enviado",
};
const typeLabels: Record<string, string> = { pagamento: "Pagamento", recebimento: "Recebimento" };
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  onEdit: (id: string) => void;
  onNew: () => void;
}

export function ReceiptsList({ onEdit, onNew }: Props) {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewReceipt, setViewReceipt] = useState<any | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  const fetch_ = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payment_receipts")
      .select("*")
      .order("receipt_number", { ascending: false });
    if (error) { toast.error("Erro ao carregar comprovantes"); console.error(error); }
    setReceipts(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, []);

  const filtered = receipts.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.party_name.toLowerCase().includes(q) || String(r.receipt_number).includes(q);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchType = typeFilter === "all" || r.receipt_type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const handleView = async (id: string) => {
    const { data } = await supabase.from("payment_receipts").select("*").eq("id", id).single();
    if (data) {
      const { data: sigs } = await supabase.from("receipt_signatures").select("*").eq("receipt_id", id);
      setViewReceipt({ ...data, signatures: sigs ?? [] });
    }
  };

  const handleGeneratePdf = async (id: string) => {
    setGeneratingPdf(id);
    try {
      const { data: receipt } = await supabase.from("payment_receipts").select("*").eq("id", id).single();
      if (!receipt) { toast.error("Comprovante não encontrado"); return; }
      const { data: sigs } = await supabase.from("receipt_signatures").select("*").eq("receipt_id", id);
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      let pdfSettings: any = null;
      let profileSig: string | null = null;
      if (userId) {
        const { data: ps } = await supabase.from("receipt_pdf_settings").select("*").eq("user_id", userId).maybeSingle();
        pdfSettings = ps;
        const { data: prof } = await supabase.from("profiles").select("signature_url").eq("id", userId).single();
        profileSig = prof?.signature_url || null;
      }
      const partySig = (sigs ?? []).find((s: any) => s.signer_type === "outra_parte");
      const { blob, fileName } = await generateReceiptPdf(receipt, pdfSettings, profileSig, partySig?.image_url || null);
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
        <div className="flex gap-2 flex-1 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar nome, nº..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pagamento">Pagamento</SelectItem>
              <SelectItem value="recebimento">Recebimento</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
              <SelectItem value="assinado">Assinado</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={onNew}><Plus className="w-4 h-4 mr-1" /> Novo Comprovante</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">Nenhum comprovante encontrado</p>
          <Button size="sm" variant="outline" onClick={onNew}><Plus className="w-4 h-4 mr-1" /> Criar primeiro</Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-2.5 font-medium">Nº</th>
                  <th className="text-left px-4 py-2.5 font-medium">Data</th>
                  <th className="text-left px-4 py-2.5 font-medium">Tipo</th>
                  <th className="text-left px-4 py-2.5 font-medium">Parte</th>
                  <th className="text-right px-4 py-2.5 font-medium">Valor</th>
                  <th className="text-left px-4 py-2.5 font-medium">Pagamento</th>
                  <th className="text-center px-4 py-2.5 font-medium">Status</th>
                  <th className="text-center px-4 py-2.5 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs">{String(r.receipt_number).padStart(4, "0")}</td>
                    <td className="px-4 py-2.5 text-xs">{new Date(r.receipt_date).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-2.5 text-xs capitalize">{typeLabels[r.receipt_type] || r.receipt_type}</td>
                    <td className="px-4 py-2.5 font-medium max-w-[200px] truncate">{r.party_name || "—"}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{fmt(Number(r.amount))}</td>
                    <td className="px-4 py-2.5 text-xs capitalize">{r.payment_method}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge className={statusColors[r.status] || ""}>{statusLabels[r.status] || r.status}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1 justify-center">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleView(r.id)} title="Visualizar"><Eye className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(r.id)} title="Editar"><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleGeneratePdf(r.id)} disabled={generatingPdf === r.id} title="Gerar PDF"><FileText className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={!!viewReceipt} onOpenChange={o => !o && setViewReceipt(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comprovante #{viewReceipt?.receipt_number ? String(viewReceipt.receipt_number).padStart(4, "0") : ""}</DialogTitle>
          </DialogHeader>
          {viewReceipt && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Tipo:</span> <strong className="capitalize">{typeLabels[viewReceipt.receipt_type]}</strong></div>
                <div><span className="text-muted-foreground">Data:</span> {new Date(viewReceipt.receipt_date).toLocaleDateString("pt-BR")}</div>
                <div><span className="text-muted-foreground">Parte:</span> <strong>{viewReceipt.party_name}</strong></div>
                <div><span className="text-muted-foreground">CPF/CNPJ:</span> {viewReceipt.party_document}</div>
                <div><span className="text-muted-foreground">Telefone:</span> {viewReceipt.party_phone}</div>
                <div><span className="text-muted-foreground">E-mail:</span> {viewReceipt.party_email}</div>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between font-semibold">
                  <span>Valor:</span>
                  <span className="text-primary">{fmt(Number(viewReceipt.amount))}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Pagamento: {viewReceipt.payment_method} | Referente: {viewReceipt.reference_type}</p>
              </div>
              {viewReceipt.description && (
                <div className="border-t border-border pt-3">
                  <h4 className="font-semibold mb-1">Descrição</h4>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{viewReceipt.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
