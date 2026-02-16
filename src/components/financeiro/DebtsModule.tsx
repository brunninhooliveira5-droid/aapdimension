import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, Trash2, Pencil, Landmark, UserX, CreditCard } from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// --- Types ---
interface Loan {
  id: string; creditor: string; description: string; loan_type: string;
  total_amount: number; outstanding_balance: number; interest_rate: number;
  installments_total: number; installments_paid: number; monthly_payment: number;
  start_date: string; end_date: string | null; next_due_date: string | null;
  status: string; notes: string | null; created_at: string;
}
interface Delinquency {
  id: string; client: string; description: string; original_amount: number;
  current_amount: number; original_due_date: string; days_overdue: number;
  status: string; collection_action: string | null; contact_info: string | null;
  notes: string | null; created_at: string;
}

const loanStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ativo: { label: "Ativo", variant: "default" },
  quitado: { label: "Quitado", variant: "secondary" },
  renegociado: { label: "Renegociado", variant: "outline" },
};
const delinquencyStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  inadimplente: { label: "Inadimplente", variant: "destructive" },
  em_cobranca: { label: "Em Cobrança", variant: "outline" },
  negociado: { label: "Negociado", variant: "default" },
  recuperado: { label: "Recuperado", variant: "secondary" },
};

// ========== LOANS ==========
function LoansTab() {
  const { user, session } = useAuth();
  const canEdit = user?.role === "admin_master" || user?.role === "financeiro";
  const [items, setItems] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; item?: Loan }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("debts_loans").select("*").order("created_at", { ascending: false });
    setItems((data as Loan[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return !q || i.creditor.toLowerCase().includes(q) || i.description.toLowerCase().includes(q);
  }), [items, search]);

  const totalOutstanding = useMemo(() => items.filter(i => i.status === "ativo").reduce((s, i) => s + i.outstanding_balance, 0), [items]);

  const handleSave = async (values: Partial<Loan>) => {
    if (!session?.user?.id) return;
    if (values.id) {
      const { error } = await supabase.from("debts_loans").update(values).eq("id", values.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Empréstimo atualizado");
    } else {
      const { error } = await supabase.from("debts_loans").insert({ ...values, created_by: session.user.id } as any);
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Empréstimo criado");
    }
    setDialog({ open: false });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("debts_loans").delete().eq("id", id);
    toast.success("Empréstimo excluído");
    setDeleteConfirm({ open: false, id: "", name: "" });
    fetchData();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
        <div className="bg-card border rounded-lg p-3"><p className="text-xs text-muted-foreground">Saldo Devedor Total</p><p className="text-lg font-bold text-destructive">{fmt(totalOutstanding)}</p></div>
        <div className="bg-card border rounded-lg p-3"><p className="text-xs text-muted-foreground">Empréstimos Ativos</p><p className="text-lg font-bold">{items.filter(i => i.status === "ativo").length}</p></div>
        <div className="bg-card border rounded-lg p-3"><p className="text-xs text-muted-foreground">Quitados</p><p className="text-lg font-bold text-emerald-600">{items.filter(i => i.status === "quitado").length}</p></div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-xs"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar empréstimos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" /></div>
        {canEdit && <Button size="sm" onClick={() => setDialog({ open: true })}><Plus className="w-4 h-4 mr-1" />Novo Empréstimo</Button>}
      </div>

      {loading ? <p className="text-muted-foreground text-sm">Carregando...</p> : filtered.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">Nenhum empréstimo encontrado</p> : (
        <div className="space-y-3">
          {filtered.map(i => {
            const st = loanStatusMap[i.status] ?? { label: i.status, variant: "secondary" as const };
            const progress = i.installments_total > 0 ? (i.installments_paid / i.installments_total) * 100 : 0;
            return (
              <div key={i.id} className="bg-card border rounded-lg p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div><p className="font-medium">{i.creditor}</p><p className="text-xs text-muted-foreground">{i.description || i.loan_type}</p></div>
                  <div className="flex items-center gap-2"><Badge variant={st.variant}>{st.label}</Badge>
                    {canEdit && <div className="flex gap-1"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDialog({ open: true, item: i })}><Pencil className="w-3.5 h-3.5" /></Button><Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm({ open: true, id: i.id, name: i.creditor })}><Trash2 className="w-3.5 h-3.5" /></Button></div>}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-2">
                  <div><span className="text-muted-foreground">Total:</span> <span className="font-medium">{fmt(i.total_amount)}</span></div>
                  <div><span className="text-muted-foreground">Saldo:</span> <span className="font-medium text-destructive">{fmt(i.outstanding_balance)}</span></div>
                  <div><span className="text-muted-foreground">Parcela:</span> <span className="font-medium">{fmt(i.monthly_payment)}</span></div>
                  <div><span className="text-muted-foreground">Juros:</span> <span className="font-medium">{i.interest_rate}% a.m.</span></div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={progress} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground">{i.installments_paid}/{i.installments_total}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <LoanDialog open={dialog.open} item={dialog.item} onClose={() => setDialog({ open: false })} onSave={handleSave} />
      <AlertDialog open={deleteConfirm.open} onOpenChange={o => !o && setDeleteConfirm({ open: false, id: "", name: "" })}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir empréstimo?</AlertDialogTitle><AlertDialogDescription>Empréstimo de "{deleteConfirm.name}" será excluído permanentemente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(deleteConfirm.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LoanDialog({ open, item, onClose, onSave }: { open: boolean; item?: Loan; onClose: () => void; onSave: (v: Partial<Loan>) => void }) {
  const [form, setForm] = useState({ creditor: "", description: "", loan_type: "emprestimo", total_amount: 0, outstanding_balance: 0, interest_rate: 0, installments_total: 1, installments_paid: 0, monthly_payment: 0, start_date: format(new Date(), "yyyy-MM-dd"), end_date: "", next_due_date: "", status: "ativo", notes: "" });
  useEffect(() => { if (item) setForm({ creditor: item.creditor, description: item.description, loan_type: item.loan_type, total_amount: item.total_amount, outstanding_balance: item.outstanding_balance, interest_rate: item.interest_rate, installments_total: item.installments_total, installments_paid: item.installments_paid, monthly_payment: item.monthly_payment, start_date: item.start_date, end_date: item.end_date ?? "", next_due_date: item.next_due_date ?? "", status: item.status, notes: item.notes ?? "" }); else setForm({ creditor: "", description: "", loan_type: "emprestimo", total_amount: 0, outstanding_balance: 0, interest_rate: 0, installments_total: 1, installments_paid: 0, monthly_payment: 0, start_date: format(new Date(), "yyyy-MM-dd"), end_date: "", next_due_date: "", status: "ativo", notes: "" }); }, [item, open]);
  const handleSubmit = () => { if (!form.creditor) { toast.error("Preencha o credor"); return; } onSave({ ...(item?.id ? { id: item.id } : {}), ...form, end_date: form.end_date || null, next_due_date: form.next_due_date || null, total_amount: Number(form.total_amount), outstanding_balance: Number(form.outstanding_balance), interest_rate: Number(form.interest_rate), monthly_payment: Number(form.monthly_payment), installments_total: Number(form.installments_total), installments_paid: Number(form.installments_paid) } as any); };
  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{item ? "Editar Empréstimo" : "Novo Empréstimo"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Credor *</Label><Input value={form.creditor} onChange={e => setForm(p => ({ ...p, creditor: e.target.value }))} /></div>
            <div><Label>Tipo</Label><Select value={form.loan_type} onValueChange={v => setForm(p => ({ ...p, loan_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="emprestimo">Empréstimo</SelectItem><SelectItem value="financiamento">Financiamento</SelectItem><SelectItem value="leasing">Leasing</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Valor Total</Label><Input type="number" value={form.total_amount} onChange={e => setForm(p => ({ ...p, total_amount: Number(e.target.value) }))} /></div>
            <div><Label>Saldo Devedor</Label><Input type="number" value={form.outstanding_balance} onChange={e => setForm(p => ({ ...p, outstanding_balance: Number(e.target.value) }))} /></div>
            <div><Label>Juros (% a.m.)</Label><Input type="number" step="0.01" value={form.interest_rate} onChange={e => setForm(p => ({ ...p, interest_rate: Number(e.target.value) }))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Total Parcelas</Label><Input type="number" value={form.installments_total} onChange={e => setForm(p => ({ ...p, installments_total: Number(e.target.value) }))} /></div>
            <div><Label>Parcelas Pagas</Label><Input type="number" value={form.installments_paid} onChange={e => setForm(p => ({ ...p, installments_paid: Number(e.target.value) }))} /></div>
            <div><Label>Valor Parcela</Label><Input type="number" value={form.monthly_payment} onChange={e => setForm(p => ({ ...p, monthly_payment: Number(e.target.value) }))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Início</Label><Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} /></div>
            <div><Label>Fim</Label><Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} /></div>
            <div><Label>Próx. Vencimento</Label><Input type="date" value={form.next_due_date} onChange={e => setForm(p => ({ ...p, next_due_date: e.target.value }))} /></div>
          </div>
          <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ativo">Ativo</SelectItem><SelectItem value="quitado">Quitado</SelectItem><SelectItem value="renegociado">Renegociado</SelectItem></SelectContent></Select></div>
          <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
          <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={handleSubmit}>{item ? "Salvar" : "Criar"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========== DELINQUENCY ==========
function DelinquencyTab() {
  const { user, session } = useAuth();
  const canEdit = user?.role === "admin_master" || user?.role === "financeiro";
  const [items, setItems] = useState<Delinquency[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; item?: Delinquency }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("debts_client_delinquency").select("*").order("days_overdue", { ascending: false });
    setItems((data as Delinquency[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return !q || i.client.toLowerCase().includes(q);
  }), [items, search]);

  const totalDelinquent = useMemo(() => items.filter(i => i.status === "inadimplente").reduce((s, i) => s + i.current_amount, 0), [items]);

  const handleSave = async (values: Partial<Delinquency>) => {
    if (!session?.user?.id) return;
    if (values.id) {
      const { error } = await supabase.from("debts_client_delinquency").update(values).eq("id", values.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Registro atualizado");
    } else {
      const { error } = await supabase.from("debts_client_delinquency").insert({ ...values, created_by: session.user.id } as any);
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Registro criado");
    }
    setDialog({ open: false });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("debts_client_delinquency").delete().eq("id", id);
    toast.success("Registro excluído");
    setDeleteConfirm({ open: false, id: "", name: "" });
    fetchData();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
        <div className="bg-card border rounded-lg p-3"><p className="text-xs text-muted-foreground">Total Inadimplente</p><p className="text-lg font-bold text-destructive">{fmt(totalDelinquent)}</p></div>
        <div className="bg-card border rounded-lg p-3"><p className="text-xs text-muted-foreground">Clientes Inadimplentes</p><p className="text-lg font-bold">{items.filter(i => i.status === "inadimplente").length}</p></div>
        <div className="bg-card border rounded-lg p-3"><p className="text-xs text-muted-foreground">Recuperados</p><p className="text-lg font-bold text-emerald-600">{items.filter(i => i.status === "recuperado").length}</p></div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-xs"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar clientes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" /></div>
        {canEdit && <Button size="sm" onClick={() => setDialog({ open: true })}><Plus className="w-4 h-4 mr-1" />Novo Registro</Button>}
      </div>

      {loading ? <p className="text-muted-foreground text-sm">Carregando...</p> : filtered.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">Nenhum registro encontrado</p> : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr><th className="text-left p-3 font-medium">Cliente</th><th className="text-right p-3 font-medium">Valor Original</th><th className="text-right p-3 font-medium">Valor Atual</th><th className="text-left p-3 font-medium">Vencimento</th><th className="text-right p-3 font-medium">Dias Atraso</th><th className="text-left p-3 font-medium">Status</th>{canEdit && <th className="p-3 w-20" />}</tr></thead>
            <tbody className="divide-y">
              {filtered.map(i => {
                const st = delinquencyStatusMap[i.status] ?? { label: i.status, variant: "secondary" as const };
                return (
                  <tr key={i.id} className="hover:bg-muted/30">
                    <td className="p-3 font-medium">{i.client}</td>
                    <td className="p-3 text-right">{fmt(i.original_amount)}</td>
                    <td className="p-3 text-right font-medium text-destructive">{fmt(i.current_amount)}</td>
                    <td className="p-3 text-xs">{format(new Date(i.original_due_date), "dd/MM/yy")}</td>
                    <td className="p-3 text-right"><span className={i.days_overdue > 90 ? "text-destructive font-bold" : i.days_overdue > 30 ? "text-orange-500 font-medium" : ""}>{i.days_overdue}d</span></td>
                    <td className="p-3"><Badge variant={st.variant}>{st.label}</Badge></td>
                    {canEdit && <td className="p-3"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => setDialog({ open: true, item: i })}><Pencil className="w-3.5 h-3.5" /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteConfirm({ open: true, id: i.id, name: i.client })}><Trash2 className="w-3.5 h-3.5" /></Button></div></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <DelinquencyDialog open={dialog.open} item={dialog.item} onClose={() => setDialog({ open: false })} onSave={handleSave} />
      <AlertDialog open={deleteConfirm.open} onOpenChange={o => !o && setDeleteConfirm({ open: false, id: "", name: "" })}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir registro?</AlertDialogTitle><AlertDialogDescription>Registro de "{deleteConfirm.name}" será excluído permanentemente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(deleteConfirm.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DelinquencyDialog({ open, item, onClose, onSave }: { open: boolean; item?: Delinquency; onClose: () => void; onSave: (v: Partial<Delinquency>) => void }) {
  const [form, setForm] = useState({ client: "", description: "", original_amount: 0, current_amount: 0, original_due_date: format(new Date(), "yyyy-MM-dd"), days_overdue: 0, status: "inadimplente", collection_action: "", contact_info: "", notes: "" });
  useEffect(() => { if (item) setForm({ client: item.client, description: item.description, original_amount: item.original_amount, current_amount: item.current_amount, original_due_date: item.original_due_date, days_overdue: item.days_overdue, status: item.status, collection_action: item.collection_action ?? "", contact_info: item.contact_info ?? "", notes: item.notes ?? "" }); else setForm({ client: "", description: "", original_amount: 0, current_amount: 0, original_due_date: format(new Date(), "yyyy-MM-dd"), days_overdue: 0, status: "inadimplente", collection_action: "", contact_info: "", notes: "" }); }, [item, open]);
  const handleSubmit = () => { if (!form.client) { toast.error("Preencha o cliente"); return; } onSave({ ...(item?.id ? { id: item.id } : {}), ...form, original_amount: Number(form.original_amount), current_amount: Number(form.current_amount), days_overdue: Number(form.days_overdue) } as any); };
  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{item ? "Editar Registro" : "Novo Registro"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Cliente *</Label><Input value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Valor Original</Label><Input type="number" value={form.original_amount} onChange={e => setForm(p => ({ ...p, original_amount: Number(e.target.value) }))} /></div>
            <div><Label>Valor Atual</Label><Input type="number" value={form.current_amount} onChange={e => setForm(p => ({ ...p, current_amount: Number(e.target.value) }))} /></div>
            <div><Label>Dias Atraso</Label><Input type="number" value={form.days_overdue} onChange={e => setForm(p => ({ ...p, days_overdue: Number(e.target.value) }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Vencimento Original</Label><Input type="date" value={form.original_due_date} onChange={e => setForm(p => ({ ...p, original_due_date: e.target.value }))} /></div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="inadimplente">Inadimplente</SelectItem><SelectItem value="em_cobranca">Em Cobrança</SelectItem><SelectItem value="negociado">Negociado</SelectItem><SelectItem value="recuperado">Recuperado</SelectItem></SelectContent></Select></div>
          </div>
          <div><Label>Ação de Cobrança</Label><Input value={form.collection_action} onChange={e => setForm(p => ({ ...p, collection_action: e.target.value }))} placeholder="Ex: Ligação, carta, protesto..." /></div>
          <div><Label>Contato</Label><Input value={form.contact_info} onChange={e => setForm(p => ({ ...p, contact_info: e.target.value }))} /></div>
          <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
          <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={handleSubmit}>{item ? "Salvar" : "Criar"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========== MAIN EXPORT ==========
export function DebtsModule() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <CreditCard className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Dívidas e Inadimplência</h2>
      </div>
      <Tabs defaultValue="loans" className="w-full">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger value="loans" className="gap-1.5 data-[state=active]:bg-background"><Landmark className="w-3.5 h-3.5" />Empréstimos</TabsTrigger>
          <TabsTrigger value="delinquency" className="gap-1.5 data-[state=active]:bg-background"><UserX className="w-3.5 h-3.5" />Inadimplência</TabsTrigger>
        </TabsList>
        <TabsContent value="loans" className="mt-4"><LoansTab /></TabsContent>
        <TabsContent value="delinquency" className="mt-4"><DelinquencyTab /></TabsContent>
      </Tabs>
    </div>
  );
}
