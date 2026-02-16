import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, Search, Trash2, Pencil, CalendarDays, FileDown, TableIcon, CalendarIcon } from "lucide-react";
import { exportFinanceListPdf, exportFinanceListCsv } from "@/lib/finance-export";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PayableDialog } from "./PayableDialog";

interface PayableRow {
  id: string;
  supplier: string;
  description: string;
  category_id: string | null;
  cost_center: string | null;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: string;
  payment_method: string | null;
  is_recurring: boolean;
  recurrence_period: string | null;
  notes: string | null;
  installment_number: number | null;
  total_installments: number | null;
  created_at: string;
}

interface CategoryRow {
  id: string;
  name: string;
  type: string;
}

export function AccountsPayable() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin_master" || user?.role === "financeiro";

  const [items, setItems] = useState<PayableRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [categoryFilter, setCategoryFilter] = useState("todos");

  const [dialog, setDialog] = useState<{ open: boolean; item?: PayableRow }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("finance_accounts_payable").select("*").order("due_date", { ascending: true }),
      supabase.from("finance_categories").select("id, name, type").in("type", ["despesa", "ambos"]).eq("is_active", true).order("sort_order"),
    ]);
    setItems((p as PayableRow[]) ?? []);
    setCategories((c as CategoryRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (statusFilter !== "todos" && item.status !== statusFilter) return false;
      if (categoryFilter !== "todos" && item.category_id !== categoryFilter) return false;
      if (dateFrom) {
        const d = new Date(item.due_date);
        if (d < dateFrom) return false;
      }
      if (dateTo) {
        const d = new Date(item.due_date);
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return item.supplier.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [items, statusFilter, categoryFilter, search, dateFrom, dateTo]);

  const handleDelete = async () => {
    const { error } = await supabase.from("finance_accounts_payable").delete().eq("id", deleteConfirm.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Conta excluída!");
    setDeleteConfirm({ open: false, id: "", name: "" });
    fetchData();
  };

  const getCategoryName = (id: string | null) => categories.find(c => c.id === id)?.name || "—";

  const fmt = (v: number) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const totalFiltered = filtered.reduce((s, i) => s + Number(i.amount), 0);

  const buildExportConfig = () => ({
    title: "Contas a Pagar",
    columns: ["Fornecedor", "Descrição", "Categoria", "Valor", "Vencimento", "Pagamento", "Status"],
    rows: filtered.map(item => ({
      cols: [
        item.supplier,
        item.description || "—",
        getCategoryName(item.category_id),
        fmt(item.amount),
        new Date(item.due_date).toLocaleDateString("pt-BR"),
        item.payment_date ? new Date(item.payment_date).toLocaleDateString("pt-BR") : "—",
        item.status,
      ],
    })),
    summary: `${filtered.length} registros — Total: ${fmt(totalFiltered)}`,
    accentColor: [185, 60, 60] as [number, number, number],
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar fornecedor ou descrição..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-accent border-border" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] bg-accent border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Status</SelectItem>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
            <SelectItem value="parcelado">Parcelado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px] bg-accent border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas Categorias</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-1.5 w-[140px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="w-3.5 h-3.5" />
              {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Data início"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-1.5 w-[140px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
              <CalendarIcon className="w-3.5 h-3.5" />
              {dateTo ? format(dateTo, "dd/MM/yyyy") : "Data fim"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>Limpar datas</Button>
        )}
        {canEdit && (
          <Button size="sm" className="gap-1.5" onClick={() => setDialog({ open: true })}>
            <Plus className="w-4 h-4" /> Nova Conta
          </Button>
        )}
        <div className="flex gap-1 ml-auto">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportFinanceListCsv(buildExportConfig())}>
            <TableIcon className="w-3.5 h-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportFinanceListPdf(buildExportConfig())}>
            <FileDown className="w-3.5 h-3.5" /> PDF
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground">
        {filtered.length} registros — Total: <span className="font-semibold text-foreground">{fmt(totalFiltered)}</span>
      </div>

      {/* Table */}
      <div className="gradient-card rounded-lg border border-border overflow-hidden">
        {loading ? (
          <p className="text-sm text-muted-foreground p-4 text-center">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4 text-center">Nenhuma conta a pagar encontrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Fornecedor</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Descrição</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Categoria</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Valor</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Vencimento</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Pagamento</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                  {canEdit && <th className="text-center p-3 font-medium text-muted-foreground">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-accent/20 transition-colors">
                    <td className="p-3 font-medium text-foreground">{item.supplier}</td>
                    <td className="p-3 text-muted-foreground max-w-[200px] truncate">{item.description || "—"}</td>
                    <td className="p-3 text-muted-foreground">{getCategoryName(item.category_id)}</td>
                    <td className="p-3 text-right font-semibold text-foreground">{fmt(item.amount)}</td>
                    <td className="p-3 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {new Date(item.due_date).toLocaleDateString("pt-BR")}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {item.payment_date ? new Date(item.payment_date).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="p-3 text-center">
                      <StatusBadge status={item.status} />
                    </td>
                    {canEdit && (
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDialog({ open: true, item })}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirm({ open: true, id: item.id, name: item.supplier })}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <PayableDialog
        open={dialog.open}
        item={dialog.item}
        categories={categories}
        onClose={() => setDialog({ open: false })}
        onSaved={() => { setDialog({ open: false }); fetchData(); }}
      />

      <AlertDialog open={deleteConfirm.open} onOpenChange={o => !o && setDeleteConfirm({ ...deleteConfirm, open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Conta a Pagar</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir a conta de "{deleteConfirm.name}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
