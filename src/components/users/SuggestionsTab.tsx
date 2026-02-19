import { useState, useEffect } from "react";
import { Search, Filter, MessageSquare, Clock, CheckCircle, AlertCircle, Download, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Suggestion {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  category: string | null;
  message: string;
  status: string;
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "novo", label: "Novo" },
  { value: "em_analise", label: "Em Análise" },
  { value: "resolvido", label: "Resolvido" },
];

const CATEGORY_OPTIONS = [
  { value: "todos", label: "Todas" },
  { value: "orcamento_corte", label: "Orçamento de Corte" },
  { value: "financeiro", label: "Financeiro" },
  { value: "maquinas", label: "Máquinas" },
  { value: "treinamentos", label: "Treinamentos" },
  { value: "app_interface", label: "App / Interface" },
  { value: "outro", label: "Outro" },
];

const PERIOD_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
];

const categoryLabel = (cat: string | null) => {
  if (!cat) return "—";
  return CATEGORY_OPTIONS.find(c => c.value === cat)?.label || cat;
};

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  novo: { label: "Novo", icon: AlertCircle, className: "bg-info/15 text-info border-info/30" },
  em_analise: { label: "Em Análise", icon: Clock, className: "bg-warning/15 text-warning border-warning/30" },
  resolvido: { label: "Resolvido", icon: CheckCircle, className: "bg-success/15 text-success border-success/30" },
};

export function SuggestionsTab() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [periodFilter, setPeriodFilter] = useState("todos");
  const [detailSuggestion, setDetailSuggestion] = useState<Suggestion | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchSuggestions = async () => {
    setLoading(true);
    let query = (supabase as any)
      .from("user_suggestions")
      .select("*")
      .order("created_at", { ascending: false });

    if (statusFilter !== "todos") query = query.eq("status", statusFilter);
    if (categoryFilter !== "todos") query = query.eq("category", categoryFilter);
    if (periodFilter !== "todos") {
      const days = parseInt(periodFilter);
      const since = new Date();
      since.setDate(since.getDate() - days);
      query = query.gte("created_at", since.toISOString());
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Erro ao carregar sugestões");
    } else {
      setSuggestions(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSuggestions();
  }, [statusFilter, categoryFilter, periodFilter]);

  const filtered = suggestions.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.user_name?.toLowerCase().includes(q)) ||
      (s.user_email?.toLowerCase().includes(q)) ||
      s.message.toLowerCase().includes(q)
    );
  });

  const handleStatusChange = async (id: string, newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === "resolvido") updates.resolved_at = new Date().toISOString();
    else updates.resolved_at = null;

    const { error } = await (supabase as any).from("user_suggestions").update(updates).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success("Status atualizado");
      fetchSuggestions();
      if (detailSuggestion?.id === id) {
        setDetailSuggestion(prev => prev ? { ...prev, status: newStatus, resolved_at: updates.resolved_at } : null);
      }
    }
  };

  const handleSaveNotes = async () => {
    if (!detailSuggestion) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("user_suggestions")
      .update({ admin_notes: adminNotes })
      .eq("id", detailSuggestion.id);
    if (error) {
      toast.error("Erro ao salvar nota");
    } else {
      toast.success("Nota salva");
      setDetailSuggestion(prev => prev ? { ...prev, admin_notes: adminNotes } : null);
      fetchSuggestions();
    }
    setSaving(false);
  };

  const handleExportCSV = () => {
    const headers = ["Data", "Usuário", "Email", "Categoria", "Mensagem", "Status", "Notas Admin"];
    const rows = filtered.map(s => [
      new Date(s.created_at).toLocaleDateString("pt-BR"),
      s.user_name || "—",
      s.user_email || "—",
      categoryLabel(s.category),
      `"${s.message.replace(/"/g, '""')}"`,
      statusConfig[s.status]?.label || s.status,
      `"${(s.admin_notes || "").replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sugestoes_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const newCount = suggestions.filter(s => s.status === "novo").length;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou mensagem..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportCSV}>
          <Download className="w-3.5 h-3.5" /> CSV
        </Button>
      </div>

      {/* Summary */}
      <div className="flex gap-3 text-xs">
        <span className="text-muted-foreground">{filtered.length} sugestão(ões)</span>
        {newCount > 0 && (
          <Badge variant="default" className="text-xs">{newCount} nova(s)</Badge>
        )}
      </div>

      {/* Table */}
      <div className="gradient-card rounded-lg border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Nenhuma sugestão encontrada.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs uppercase">Data</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase">Usuário</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase">Categoria</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase">Mensagem</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase">Status</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => {
                const sc = statusConfig[s.status] || statusConfig.novo;
                const Icon = sc.icon;
                return (
                  <TableRow key={s.id} className="border-border">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(s.created_at).toLocaleDateString("pt-BR")}
                      <br />
                      <span className="text-[10px]">
                        {new Date(s.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground">{s.user_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{s.user_email || "—"}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {categoryLabel(s.category)}
                    </TableCell>
                    <TableCell className="max-w-[250px]">
                      <p className="text-sm text-foreground truncate">{s.message}</p>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${sc.className}`}>
                        <Icon className="w-3 h-3" />
                        {sc.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Select
                          value={s.status}
                          onValueChange={(v) => handleStatusChange(s.id, v)}
                        >
                          <SelectTrigger className="h-7 w-[110px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="novo">Novo</SelectItem>
                            <SelectItem value="em_analise">Em Análise</SelectItem>
                            <SelectItem value="resolvido">Resolvido</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => {
                            setDetailSuggestion(s);
                            setAdminNotes(s.admin_notes || "");
                          }}
                        >
                          Detalhes
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detailSuggestion} onOpenChange={(o) => { if (!o) setDetailSuggestion(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Sugestão</DialogTitle>
          </DialogHeader>
          {detailSuggestion && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Usuário</p>
                  <p className="font-medium">{detailSuggestion.user_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{detailSuggestion.user_email || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="font-medium">
                    {new Date(detailSuggestion.created_at).toLocaleDateString("pt-BR")}{" "}
                    {new Date(detailSuggestion.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Categoria</p>
                  <p className="font-medium">{categoryLabel(detailSuggestion.category)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Select
                    value={detailSuggestion.status}
                    onValueChange={(v) => handleStatusChange(detailSuggestion.id, v)}
                  >
                    <SelectTrigger className="h-8 w-[130px] text-xs mt-0.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="novo">Novo</SelectItem>
                      <SelectItem value="em_analise">Em Análise</SelectItem>
                      <SelectItem value="resolvido">Resolvido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Mensagem</p>
                <div className="p-3 rounded-md bg-muted/50 border text-sm whitespace-pre-wrap">
                  {detailSuggestion.message}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Nota interna (admin)</p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Adicione observações internas..."
                  className="min-h-[80px]"
                />
              </div>

              {detailSuggestion.resolved_at && (
                <p className="text-xs text-success">
                  Resolvido em {new Date(detailSuggestion.resolved_at).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailSuggestion(null)}>Fechar</Button>
            <Button onClick={handleSaveNotes} disabled={saving}>
              {saving ? "Salvando..." : "Salvar nota"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
