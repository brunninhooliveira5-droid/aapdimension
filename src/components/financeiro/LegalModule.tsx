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
import { Plus, Search, Trash2, Pencil, FileText, Scale, Gavel, AlertTriangle } from "lucide-react";

// --- Types ---
interface Contract {
  id: string; title: string; contract_type: string; counterparty: string; description: string;
  start_date: string; end_date: string | null; value: number; status: string;
  notes: string | null; created_at: string;
}
interface LegalCase {
  id: string; case_number: string; title: string; case_type: string; counterparty: string;
  description: string; status: string; court: string | null; lawyer: string | null;
  filed_date: string; next_hearing_date: string | null; estimated_value: number;
  notes: string | null; created_at: string;
}
interface Collection {
  id: string; debtor: string; amount: number; original_due_date: string;
  collection_type: string; status: string; description: string; notes: string | null; created_at: string;
}

const contractStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  vigente: { label: "Vigente", variant: "default" },
  encerrado: { label: "Encerrado", variant: "secondary" },
  cancelado: { label: "Cancelado", variant: "destructive" },
  renovacao: { label: "Em Renovação", variant: "outline" },
};
const caseStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  em_andamento: { label: "Em Andamento", variant: "default" },
  encerrado: { label: "Encerrado", variant: "secondary" },
  ganho: { label: "Ganho", variant: "default" },
  perdido: { label: "Perdido", variant: "destructive" },
  acordo: { label: "Acordo", variant: "outline" },
};
const collectionStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  em_andamento: { label: "Em Andamento", variant: "default" },
  resolvido: { label: "Resolvido", variant: "secondary" },
  protestado: { label: "Protestado", variant: "destructive" },
  negativado: { label: "Negativado", variant: "destructive" },
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ========== CONTRACTS SUB-TAB ==========
function ContractsTab() {
  const { user, session } = useAuth();
  const canEdit = user?.role === "admin_master" || user?.role === "financeiro";
  const [items, setItems] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [dialog, setDialog] = useState<{ open: boolean; item?: Contract }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("legal_contracts").select("*").order("created_at", { ascending: false });
    setItems((data as Contract[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => items.filter(i => {
    if (statusFilter !== "todos" && i.status !== statusFilter) return false;
    const q = search.toLowerCase();
    return !q || i.title.toLowerCase().includes(q) || i.counterparty.toLowerCase().includes(q);
  }), [items, search, statusFilter]);

  const handleSave = async (values: Partial<Contract>) => {
    if (!session?.user?.id) return;
    if (values.id) {
      const { error } = await supabase.from("legal_contracts").update(values).eq("id", values.id);
      if (error) { toast.error("Erro ao atualizar contrato"); return; }
      toast.success("Contrato atualizado");
    } else {
      const { error } = await supabase.from("legal_contracts").insert({ ...values, created_by: session.user.id } as any);
      if (error) { toast.error("Erro ao criar contrato"); return; }
      toast.success("Contrato criado");
    }
    setDialog({ open: false });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("legal_contracts").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Contrato excluído");
    setDeleteConfirm({ open: false, id: "", name: "" });
    fetchData();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-xs"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar contratos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="vigente">Vigente</SelectItem><SelectItem value="encerrado">Encerrado</SelectItem><SelectItem value="cancelado">Cancelado</SelectItem><SelectItem value="renovacao">Em Renovação</SelectItem></SelectContent></Select>
        </div>
        {canEdit && <Button size="sm" onClick={() => setDialog({ open: true })}><Plus className="w-4 h-4 mr-1" />Novo Contrato</Button>}
      </div>

      {loading ? <p className="text-muted-foreground text-sm">Carregando...</p> : filtered.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">Nenhum contrato encontrado</p> : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr><th className="text-left p-3 font-medium">Título</th><th className="text-left p-3 font-medium">Contraparte</th><th className="text-left p-3 font-medium">Tipo</th><th className="text-right p-3 font-medium">Valor</th><th className="text-left p-3 font-medium">Vigência</th><th className="text-left p-3 font-medium">Status</th>{canEdit && <th className="p-3 w-20" />}</tr></thead>
            <tbody className="divide-y">
              {filtered.map(i => {
                const st = contractStatusMap[i.status] ?? { label: i.status, variant: "secondary" as const };
                return (
                  <tr key={i.id} className="hover:bg-muted/30">
                    <td className="p-3 font-medium">{i.title}</td>
                    <td className="p-3">{i.counterparty}</td>
                    <td className="p-3 capitalize">{i.contract_type}</td>
                    <td className="p-3 text-right">{fmt(i.value)}</td>
                    <td className="p-3 text-xs">{format(new Date(i.start_date), "dd/MM/yy")}{i.end_date ? ` - ${format(new Date(i.end_date), "dd/MM/yy")}` : " - Indeterminado"}</td>
                    <td className="p-3"><Badge variant={st.variant}>{st.label}</Badge></td>
                    {canEdit && <td className="p-3"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => setDialog({ open: true, item: i })}><Pencil className="w-3.5 h-3.5" /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteConfirm({ open: true, id: i.id, name: i.title })}><Trash2 className="w-3.5 h-3.5" /></Button></div></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ContractDialog open={dialog.open} item={dialog.item} onClose={() => setDialog({ open: false })} onSave={handleSave} />
      <AlertDialog open={deleteConfirm.open} onOpenChange={o => !o && setDeleteConfirm({ open: false, id: "", name: "" })}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir contrato?</AlertDialogTitle><AlertDialogDescription>Contrato "{deleteConfirm.name}" será excluído permanentemente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(deleteConfirm.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ContractDialog({ open, item, onClose, onSave }: { open: boolean; item?: Contract; onClose: () => void; onSave: (v: Partial<Contract>) => void }) {
  const [form, setForm] = useState({ title: "", contract_type: "servico", counterparty: "", description: "", start_date: format(new Date(), "yyyy-MM-dd"), end_date: "", value: 0, status: "vigente", notes: "" });
  useEffect(() => { if (item) setForm({ title: item.title, contract_type: item.contract_type, counterparty: item.counterparty, description: item.description, start_date: item.start_date, end_date: item.end_date ?? "", value: item.value, status: item.status, notes: item.notes ?? "" }); else setForm({ title: "", contract_type: "servico", counterparty: "", description: "", start_date: format(new Date(), "yyyy-MM-dd"), end_date: "", value: 0, status: "vigente", notes: "" }); }, [item, open]);
  const handleSubmit = () => { if (!form.title || !form.counterparty) { toast.error("Preencha título e contraparte"); return; } onSave({ ...(item?.id ? { id: item.id } : {}), ...form, end_date: form.end_date || null, value: Number(form.value) } as any); };
  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{item ? "Editar Contrato" : "Novo Contrato"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Título *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Contraparte *</Label><Input value={form.counterparty} onChange={e => setForm(p => ({ ...p, counterparty: e.target.value }))} /></div>
            <div><Label>Tipo</Label><Select value={form.contract_type} onValueChange={v => setForm(p => ({ ...p, contract_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="servico">Serviço</SelectItem><SelectItem value="fornecimento">Fornecimento</SelectItem><SelectItem value="locacao">Locação</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Início</Label><Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} /></div>
            <div><Label>Fim</Label><Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} /></div>
            <div><Label>Valor (R$)</Label><Input type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: Number(e.target.value) }))} /></div>
          </div>
          <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="vigente">Vigente</SelectItem><SelectItem value="encerrado">Encerrado</SelectItem><SelectItem value="cancelado">Cancelado</SelectItem><SelectItem value="renovacao">Em Renovação</SelectItem></SelectContent></Select></div>
          <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
          <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={handleSubmit}>{item ? "Salvar" : "Criar"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========== CASES SUB-TAB ==========
function CasesTab() {
  const { user, session } = useAuth();
  const canEdit = user?.role === "admin_master" || user?.role === "financeiro";
  const [items, setItems] = useState<LegalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; item?: LegalCase }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("legal_cases").select("*").order("created_at", { ascending: false });
    setItems((data as LegalCase[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return !q || i.title.toLowerCase().includes(q) || i.counterparty.toLowerCase().includes(q) || i.case_number.toLowerCase().includes(q);
  }), [items, search]);

  const handleSave = async (values: Partial<LegalCase>) => {
    if (!session?.user?.id) return;
    if (values.id) {
      const { error } = await supabase.from("legal_cases").update(values).eq("id", values.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Processo atualizado");
    } else {
      const { error } = await supabase.from("legal_cases").insert({ ...values, created_by: session.user.id } as any);
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Processo criado");
    }
    setDialog({ open: false });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("legal_cases").delete().eq("id", id);
    toast.success("Processo excluído");
    setDeleteConfirm({ open: false, id: "", name: "" });
    fetchData();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-xs"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar processos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" /></div>
        {canEdit && <Button size="sm" onClick={() => setDialog({ open: true })}><Plus className="w-4 h-4 mr-1" />Novo Processo</Button>}
      </div>

      {loading ? <p className="text-muted-foreground text-sm">Carregando...</p> : filtered.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">Nenhum processo encontrado</p> : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr><th className="text-left p-3 font-medium">Nº</th><th className="text-left p-3 font-medium">Título</th><th className="text-left p-3 font-medium">Contraparte</th><th className="text-left p-3 font-medium">Tipo</th><th className="text-right p-3 font-medium">Valor Est.</th><th className="text-left p-3 font-medium">Próx. Audiência</th><th className="text-left p-3 font-medium">Status</th>{canEdit && <th className="p-3 w-20" />}</tr></thead>
            <tbody className="divide-y">
              {filtered.map(i => {
                const st = caseStatusMap[i.status] ?? { label: i.status, variant: "secondary" as const };
                return (
                  <tr key={i.id} className="hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{i.case_number || "—"}</td>
                    <td className="p-3 font-medium">{i.title}</td>
                    <td className="p-3">{i.counterparty}</td>
                    <td className="p-3 capitalize">{i.case_type}</td>
                    <td className="p-3 text-right">{fmt(i.estimated_value)}</td>
                    <td className="p-3 text-xs">{i.next_hearing_date ? format(new Date(i.next_hearing_date), "dd/MM/yy") : "—"}</td>
                    <td className="p-3"><Badge variant={st.variant}>{st.label}</Badge></td>
                    {canEdit && <td className="p-3"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => setDialog({ open: true, item: i })}><Pencil className="w-3.5 h-3.5" /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteConfirm({ open: true, id: i.id, name: i.title })}><Trash2 className="w-3.5 h-3.5" /></Button></div></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CaseDialog open={dialog.open} item={dialog.item} onClose={() => setDialog({ open: false })} onSave={handleSave} />
      <AlertDialog open={deleteConfirm.open} onOpenChange={o => !o && setDeleteConfirm({ open: false, id: "", name: "" })}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir processo?</AlertDialogTitle><AlertDialogDescription>Processo "{deleteConfirm.name}" será excluído permanentemente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(deleteConfirm.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CaseDialog({ open, item, onClose, onSave }: { open: boolean; item?: LegalCase; onClose: () => void; onSave: (v: Partial<LegalCase>) => void }) {
  const [form, setForm] = useState({ case_number: "", title: "", case_type: "civel", counterparty: "", description: "", status: "em_andamento", court: "", lawyer: "", filed_date: format(new Date(), "yyyy-MM-dd"), next_hearing_date: "", estimated_value: 0, notes: "" });
  useEffect(() => { if (item) setForm({ case_number: item.case_number, title: item.title, case_type: item.case_type, counterparty: item.counterparty, description: item.description, status: item.status, court: item.court ?? "", lawyer: item.lawyer ?? "", filed_date: item.filed_date, next_hearing_date: item.next_hearing_date ?? "", estimated_value: item.estimated_value, notes: item.notes ?? "" }); else setForm({ case_number: "", title: "", case_type: "civel", counterparty: "", description: "", status: "em_andamento", court: "", lawyer: "", filed_date: format(new Date(), "yyyy-MM-dd"), next_hearing_date: "", estimated_value: 0, notes: "" }); }, [item, open]);
  const handleSubmit = () => { if (!form.title || !form.counterparty) { toast.error("Preencha título e contraparte"); return; } onSave({ ...(item?.id ? { id: item.id } : {}), ...form, next_hearing_date: form.next_hearing_date || null, estimated_value: Number(form.estimated_value) } as any); };
  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{item ? "Editar Processo" : "Novo Processo"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Título *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Nº Processo</Label><Input value={form.case_number} onChange={e => setForm(p => ({ ...p, case_number: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Contraparte *</Label><Input value={form.counterparty} onChange={e => setForm(p => ({ ...p, counterparty: e.target.value }))} /></div>
            <div><Label>Tipo</Label><Select value={form.case_type} onValueChange={v => setForm(p => ({ ...p, case_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="civel">Cível</SelectItem><SelectItem value="trabalhista">Trabalhista</SelectItem><SelectItem value="tributario">Tributário</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Vara / Tribunal</Label><Input value={form.court} onChange={e => setForm(p => ({ ...p, court: e.target.value }))} /></div>
            <div><Label>Advogado</Label><Input value={form.lawyer} onChange={e => setForm(p => ({ ...p, lawyer: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Data Início</Label><Input type="date" value={form.filed_date} onChange={e => setForm(p => ({ ...p, filed_date: e.target.value }))} /></div>
            <div><Label>Próx. Audiência</Label><Input type="date" value={form.next_hearing_date} onChange={e => setForm(p => ({ ...p, next_hearing_date: e.target.value }))} /></div>
            <div><Label>Valor Estimado</Label><Input type="number" value={form.estimated_value} onChange={e => setForm(p => ({ ...p, estimated_value: Number(e.target.value) }))} /></div>
          </div>
          <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="em_andamento">Em Andamento</SelectItem><SelectItem value="encerrado">Encerrado</SelectItem><SelectItem value="ganho">Ganho</SelectItem><SelectItem value="perdido">Perdido</SelectItem><SelectItem value="acordo">Acordo</SelectItem></SelectContent></Select></div>
          <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
          <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={handleSubmit}>{item ? "Salvar" : "Criar"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========== COLLECTIONS SUB-TAB ==========
function CollectionsTab() {
  const { user, session } = useAuth();
  const canEdit = user?.role === "admin_master" || user?.role === "financeiro";
  const [items, setItems] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; item?: Collection }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("legal_collections").select("*").order("created_at", { ascending: false });
    setItems((data as Collection[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return !q || i.debtor.toLowerCase().includes(q);
  }), [items, search]);

  const handleSave = async (values: Partial<Collection>) => {
    if (!session?.user?.id) return;
    if (values.id) {
      const { error } = await supabase.from("legal_collections").update(values).eq("id", values.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Cobrança atualizada");
    } else {
      const { error } = await supabase.from("legal_collections").insert({ ...values, created_by: session.user.id } as any);
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Cobrança criada");
    }
    setDialog({ open: false });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("legal_collections").delete().eq("id", id);
    toast.success("Cobrança excluída");
    setDeleteConfirm({ open: false, id: "", name: "" });
    fetchData();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-xs"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar devedores..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" /></div>
        {canEdit && <Button size="sm" onClick={() => setDialog({ open: true })}><Plus className="w-4 h-4 mr-1" />Nova Cobrança</Button>}
      </div>

      {loading ? <p className="text-muted-foreground text-sm">Carregando...</p> : filtered.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">Nenhuma cobrança encontrada</p> : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr><th className="text-left p-3 font-medium">Devedor</th><th className="text-left p-3 font-medium">Tipo</th><th className="text-right p-3 font-medium">Valor</th><th className="text-left p-3 font-medium">Vencimento Orig.</th><th className="text-left p-3 font-medium">Status</th>{canEdit && <th className="p-3 w-20" />}</tr></thead>
            <tbody className="divide-y">
              {filtered.map(i => {
                const st = collectionStatusMap[i.status] ?? { label: i.status, variant: "secondary" as const };
                return (
                  <tr key={i.id} className="hover:bg-muted/30">
                    <td className="p-3 font-medium">{i.debtor}</td>
                    <td className="p-3 capitalize">{i.collection_type}</td>
                    <td className="p-3 text-right">{fmt(i.amount)}</td>
                    <td className="p-3 text-xs">{format(new Date(i.original_due_date), "dd/MM/yy")}</td>
                    <td className="p-3"><Badge variant={st.variant}>{st.label}</Badge></td>
                    {canEdit && <td className="p-3"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => setDialog({ open: true, item: i })}><Pencil className="w-3.5 h-3.5" /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteConfirm({ open: true, id: i.id, name: i.debtor })}><Trash2 className="w-3.5 h-3.5" /></Button></div></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CollectionDialog open={dialog.open} item={dialog.item} onClose={() => setDialog({ open: false })} onSave={handleSave} />
      <AlertDialog open={deleteConfirm.open} onOpenChange={o => !o && setDeleteConfirm({ open: false, id: "", name: "" })}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir cobrança?</AlertDialogTitle><AlertDialogDescription>Cobrança contra "{deleteConfirm.name}" será excluída permanentemente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(deleteConfirm.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CollectionDialog({ open, item, onClose, onSave }: { open: boolean; item?: Collection; onClose: () => void; onSave: (v: Partial<Collection>) => void }) {
  const [form, setForm] = useState({ debtor: "", amount: 0, original_due_date: format(new Date(), "yyyy-MM-dd"), collection_type: "protesto", status: "em_andamento", description: "", notes: "" });
  useEffect(() => { if (item) setForm({ debtor: item.debtor, amount: item.amount, original_due_date: item.original_due_date, collection_type: item.collection_type, status: item.status, description: item.description, notes: item.notes ?? "" }); else setForm({ debtor: "", amount: 0, original_due_date: format(new Date(), "yyyy-MM-dd"), collection_type: "protesto", status: "em_andamento", description: "", notes: "" }); }, [item, open]);
  const handleSubmit = () => { if (!form.debtor) { toast.error("Preencha o devedor"); return; } onSave({ ...(item?.id ? { id: item.id } : {}), ...form, amount: Number(form.amount) } as any); };
  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{item ? "Editar Cobrança" : "Nova Cobrança"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Devedor *</Label><Input value={form.debtor} onChange={e => setForm(p => ({ ...p, debtor: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Valor (R$)</Label><Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))} /></div>
            <div><Label>Vencimento Original</Label><Input type="date" value={form.original_due_date} onChange={e => setForm(p => ({ ...p, original_due_date: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tipo</Label><Select value={form.collection_type} onValueChange={v => setForm(p => ({ ...p, collection_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="protesto">Protesto</SelectItem><SelectItem value="negativacao">Negativação</SelectItem><SelectItem value="judicial">Judicial</SelectItem><SelectItem value="extrajudicial">Extrajudicial</SelectItem></SelectContent></Select></div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="em_andamento">Em Andamento</SelectItem><SelectItem value="resolvido">Resolvido</SelectItem><SelectItem value="protestado">Protestado</SelectItem><SelectItem value="negativado">Negativado</SelectItem></SelectContent></Select></div>
          </div>
          <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
          <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={handleSubmit}>{item ? "Salvar" : "Criar"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========== MAIN EXPORT ==========
export function LegalModule() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Scale className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Módulo Jurídico</h2>
      </div>
      <Tabs defaultValue="contracts" className="w-full">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger value="contracts" className="gap-1.5 data-[state=active]:bg-background"><FileText className="w-3.5 h-3.5" />Contratos</TabsTrigger>
          <TabsTrigger value="cases" className="gap-1.5 data-[state=active]:bg-background"><Gavel className="w-3.5 h-3.5" />Processos</TabsTrigger>
          <TabsTrigger value="collections" className="gap-1.5 data-[state=active]:bg-background"><AlertTriangle className="w-3.5 h-3.5" />Cobranças</TabsTrigger>
        </TabsList>
        <TabsContent value="contracts" className="mt-4"><ContractsTab /></TabsContent>
        <TabsContent value="cases" className="mt-4"><CasesTab /></TabsContent>
        <TabsContent value="collections" className="mt-4"><CollectionsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
