import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, X, Download, File, Users, Shield, Layers, Eye, Calendar, Trash2, CheckCircle, Clock, PackageCheck, FileText, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const STATUS_OPTIONS = [
  { value: "orcamento", label: "Orçamento", icon: FileText, color: "" },
  { value: "fechado", label: "Fechado", icon: CheckCircle, color: "bg-blue-600 hover:bg-blue-700" },
  { value: "aprovado_corte", label: "Aprovado p/ Corte", icon: CheckCircle, color: "bg-emerald-600 hover:bg-emerald-700" },
  { value: "aguardando_retirada", label: "Aguardando Retirada", icon: Clock, color: "bg-amber-600 hover:bg-amber-700" },
  { value: "finalizado", label: "Finalizado", icon: PackageCheck, color: "bg-primary hover:bg-primary/90" },
] as const;

function getStatusConfig(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];
}

interface ServiceQuote {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_company: string;
  file_name: string;
  material: string;
  thickness: string;
  machine_name: string;
  path_length_m: number;
  quantity: number;
  estimated_time_min: number;
  estimated_cost: number;
  min_recommended: number;
  suggested_sale: number;
  created_at: string;
  status: string;
  file_path: string | null;
  material_cost: number;
  material_owner: string;
  total_price: number;
  client_name: string;
  client_phone: string;
  notes: string;
  service_value: number;
  service_value_included: boolean;
  use_master_pricing: boolean;
  use_dimension_materials: boolean;
  pdf_url: string | null;
}

export function ServiceClientsTab() {
  const { session } = useAuth();
  const [quotes, setQuotes] = useState<ServiceQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<ServiceQuote | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [materialFilter, setMaterialFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [userPlans, setUserPlans] = useState<Record<string, { pro_access: boolean; valid_until: string | null }>>({});

  const uniqueMaterials = useMemo(() => {
    const mats = new Set(quotes.map((q) => q.material));
    return Array.from(mats).sort();
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const matchSearch =
        searchTerm === "" ||
        q.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.user_company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.client_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchMaterial = materialFilter === "todos" || q.material === materialFilter;
      const matchStatus = statusFilter === "todos" || q.status === statusFilter;
      const qDate = new Date(q.created_at);
      const matchFrom = !dateFrom || qDate >= new Date(dateFrom);
      const matchTo = !dateTo || qDate <= new Date(dateTo + "T23:59:59");
      return matchSearch && matchMaterial && matchStatus && matchFrom && matchTo;
    });
  }, [quotes, searchTerm, materialFilter, statusFilter, dateFrom, dateTo]);

  const fetchServiceQuotes = async () => {
    if (!session?.user) return;
    setLoading(true);

    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "servico");

    if (roleError || !roleRows || roleRows.length === 0) {
      setQuotes([]);
      setLoading(false);
      return;
    }

    const serviceUserIds = roleRows.map((r) => r.user_id);

    const [{ data: profiles }, { data: plansData }] = await Promise.all([
      supabase.from("profiles").select("id, name, email, company").in("id", serviceUserIds),
      supabase.from("user_plans").select("user_id, pro_access, valid_until").in("user_id", serviceUserIds),
    ]);

    const profileMap = new Map(
      (profiles ?? []).map((p: any) => [p.id, { name: p.name, email: p.email, company: p.company ?? "" }])
    );

    const plansMap: Record<string, { pro_access: boolean; valid_until: string | null }> = {};
    (plansData ?? []).forEach((p: any) => {
      plansMap[p.user_id] = { pro_access: p.pro_access, valid_until: p.valid_until };
    });
    setUserPlans(plansMap);

    const { data: quotesData, error: quotesError } = await supabase
      .from("cutting_quotes" as any)
      .select("*")
      .in("user_id", serviceUserIds)
      .order("created_at", { ascending: false });

    if (quotesError) {
      toast.error("Erro ao carregar orçamentos de clientes de serviço.");
      setLoading(false);
      return;
    }

    const mapped: ServiceQuote[] = (quotesData as any[] ?? []).map((q: any) => {
      const profile = profileMap.get(q.user_id) ?? { name: "—", email: "—", company: "" };
      return { ...q, user_name: profile.name, user_email: profile.email, user_company: profile.company };
    });

    setQuotes(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchServiceQuotes();
  }, [session]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const updateStatus = async (quoteId: string, newStatus: string) => {
    const { error } = await supabase
      .from("cutting_quotes" as any)
      .update({ status: newStatus } as any)
      .eq("id", quoteId);
    if (error) {
      toast.error("Erro ao atualizar status.");
    } else {
      const config = getStatusConfig(newStatus);
      toast.success(`Status alterado para "${config.label}".`);
      setQuotes((prev) => prev.map((q) => q.id === quoteId ? { ...q, status: newStatus } : q));
      if (selectedQuote?.id === quoteId) {
        setSelectedQuote((prev) => prev ? { ...prev, status: newStatus } : null);
      }
    }
  };

  const deleteQuote = async (id: string) => {
    const quote = quotes.find((q) => q.id === id);
    if (quote?.file_path) {
      await supabase.storage.from("cutting-files").remove([quote.file_path]);
    }
    const { error } = await supabase.from("cutting_quotes" as any).delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir orçamento.");
    } else {
      toast.success("Orçamento excluído.");
      setQuotes((prev) => prev.filter((q) => q.id !== id));
      if (selectedQuote?.id === id) setSelectedQuote(null);
    }
  };

  const exportQuotePDF = (q: ServiceQuote) => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Orçamento de Corte CNC — Cliente Serviço", 14, 22);
      doc.setFontSize(10);
      doc.text(`Data: ${new Date(q.created_at).toLocaleDateString("pt-BR")}`, 14, 30);
      doc.text(`Cliente: ${q.user_name} (${q.user_email})`, 14, 36);
      if (q.user_company) doc.text(`Empresa: ${q.user_company}`, 14, 42);

      autoTable(doc, {
        startY: q.user_company ? 48 : 42,
        head: [["Item", "Valor"]],
        body: [
          ["Arquivo", q.file_name],
          ["Material", q.material],
          ["Espessura", q.thickness],
          ["Máquina", q.machine_name],
          ["Comprimento de Corte", `${Number(q.path_length_m).toFixed(2)} m`],
          ["Quantidade", `${q.quantity}`],
          ["Tempo Estimado", `${Number(q.estimated_time_min).toFixed(2)} min`],
          ["Valor do Corte", fmt(Number(q.suggested_sale))],
          ["Custo do Material", fmt(Number(q.material_cost))],
          ...(q.service_value_included ? [["Valor de Serviço", fmt(Number(q.service_value))]] : []),
          ["Total Final", fmt(Number(q.total_price))],
          ["Status", getStatusConfig(q.status).label],
        ],
        theme: "striped",
        styles: { fontSize: 10 },
      });

      doc.save(`servico_${q.user_name.replace(/\s/g, "_")}_${q.file_name.replace(/\.\w+$/, "")}.pdf`);
    } catch {
      toast.error("Erro ao gerar PDF.");
    }
  };

  const downloadOriginalFile = async (q: ServiceQuote) => {
    if (!q.file_path) {
      toast.error("Arquivo original não disponível.");
      return;
    }
    const { data, error } = await supabase.storage.from("cutting-files").download(q.file_path);
    if (error || !data) {
      toast.error("Erro ao baixar arquivo.");
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = q.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalQuotes = filteredQuotes.length;
  const totalRevenue = filteredQuotes.reduce((sum, q) => sum + Number(q.total_price), 0);
  const uniqueClients = new Set(filteredQuotes.map((q) => q.user_id)).size;

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Carregando orçamentos de clientes de serviço...</p>;
  }

  const getProBadge = (userId: string) => {
    const plan = userPlans[userId];
    if (!plan?.pro_access) return <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">FREE</Badge>;
    if (!plan.valid_until) return <Badge className="text-[9px] px-1 py-0 h-4 bg-primary"><Crown className="w-2.5 h-2.5 mr-0.5" />PRO</Badge>;
    const now = new Date();
    const expires = new Date(plan.valid_until);
    const diffDays = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">PRO expirado</Badge>;
    if (diffDays <= 7) return <Badge className="text-[9px] px-1 py-0 h-4 bg-amber-600"><Crown className="w-2.5 h-2.5 mr-0.5" />{diffDays}d</Badge>;
    return <Badge className="text-[9px] px-1 py-0 h-4 bg-primary"><Crown className="w-2.5 h-2.5 mr-0.5" />{diffDays}d</Badge>;
  };

  const StatusBadgeComponent = ({ status, quoteId }: { status: string; quoteId: string }) => {
    const config = getStatusConfig(status);
    const Icon = config.icon;
    return (
      <Select value={status} onValueChange={(v) => updateStatus(quoteId, v)}>
        <SelectTrigger className="h-auto border-0 p-0 shadow-none focus:ring-0 w-auto">
          <Badge
            variant={status === "orcamento" ? "secondary" : "default"}
            className={`text-[10px] cursor-pointer whitespace-nowrap ${config.color}`}
          >
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Orçamentos de Clientes de Serviço
          </CardTitle>
          <CardDescription>
            {filteredQuotes.length} de {quotes.length} orçamento(s) de usuários com perfil "Serviço"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="gradient-card rounded-lg border border-border p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{totalQuotes}</p>
              <p className="text-xs text-muted-foreground">Orçamentos</p>
            </div>
            <div className="gradient-card rounded-lg border border-border p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{uniqueClients}</p>
              <p className="text-xs text-muted-foreground">Clientes</p>
            </div>
            <div className="gradient-card rounded-lg border border-border p-3 text-center">
              <p className="text-2xl font-bold text-primary">{fmt(totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">Valor Total</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, e-mail, empresa ou arquivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
              {searchTerm && (
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => setSearchTerm("")}>
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={materialFilter} onValueChange={setMaterialFilter}>
              <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm">
                <SelectValue placeholder="Material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {uniqueMaterials.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-sm w-[140px]" />
              <span className="text-xs text-muted-foreground">a</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-sm w-[140px]" />
            </div>
          </div>

          {/* Table */}
          {quotes.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum orçamento de clientes de serviço encontrado.</p>
              <p className="text-xs text-muted-foreground mt-1">Orçamentos de usuários com perfil "Serviço" aparecerão aqui.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Material / Espessura</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                        Nenhum orçamento encontrado com os filtros aplicados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQuotes.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell className="text-xs">{new Date(q.created_at).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-medium">{q.user_name}</p>
                              {getProBadge(q.user_id)}
                            </div>
                            <p className="text-[10px] text-muted-foreground">{q.user_email}</p>
                            {q.user_company && <p className="text-[10px] text-muted-foreground">{q.user_company}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => setSelectedQuote(q)}
                            className="text-xs font-medium text-primary hover:underline cursor-pointer text-left"
                          >
                            {q.file_name}
                          </button>
                        </TableCell>
                        <TableCell className="text-xs">
                          {q.material} / {q.thickness}
                        </TableCell>
                        <TableCell>
                          <StatusBadgeComponent status={q.status} quoteId={q.id} />
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium text-primary">
                          {fmt(Number(q.total_price))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedQuote(q)} title="Ver detalhes">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => exportQuotePDF(q)} title="Baixar PDF">
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                            {q.file_path && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadOriginalFile(q)} title="Baixar arquivo original">
                                <File className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Excluir">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Deseja excluir o orçamento "{q.file_name}" de {q.user_name}? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteQuote(q.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedQuote} onOpenChange={(open) => !open && setSelectedQuote(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <File className="w-4 h-4 text-primary" />
              {selectedQuote?.file_name}
            </DialogTitle>
          </DialogHeader>

          {selectedQuote && (
            <div className="space-y-4">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {selectedQuote.use_master_pricing && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary border border-primary/20">
                    <Shield className="w-3 h-3" /> Configuração Dimension
                  </span>
                )}
                {selectedQuote.use_dimension_materials && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary border border-primary/20">
                    <Layers className="w-3 h-3" /> Materiais Dimension
                  </span>
                )}
              </div>

              {/* Status changer */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                <Select value={selectedQuote.status} onValueChange={(v) => updateStatus(selectedQuote.id, v)}>
                  <SelectTrigger className="h-9 text-sm w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Client Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Usuário (Serviço)</p>
                  <p className="font-medium">{selectedQuote.user_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedQuote.user_email}</p>
                </div>
                {selectedQuote.user_company && (
                  <div>
                    <p className="text-muted-foreground text-xs">Empresa</p>
                    <p className="font-medium">{selectedQuote.user_company}</p>
                  </div>
                )}
              </div>

              {(selectedQuote.client_name || selectedQuote.client_phone) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedQuote.client_name && (
                      <div>
                        <p className="text-muted-foreground text-xs">Cliente Final</p>
                        <p className="font-medium">{selectedQuote.client_name}</p>
                      </div>
                    )}
                    {selectedQuote.client_phone && (
                      <div>
                        <p className="text-muted-foreground text-xs">Contato</p>
                        <p className="font-medium">{selectedQuote.client_phone}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              <Separator />

              {/* Quote Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Material</p>
                  <p className="font-medium">{selectedQuote.material}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Espessura</p>
                  <p className="font-medium">{selectedQuote.thickness}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Máquina</p>
                  <p className="font-medium">{selectedQuote.machine_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Quantidade</p>
                  <p className="font-medium">{selectedQuote.quantity}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Comprimento de Corte</p>
                  <p className="font-medium">{Number(selectedQuote.path_length_m).toFixed(2)} m</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Tempo Estimado</p>
                  <p className="font-medium">{Number(selectedQuote.estimated_time_min).toFixed(1)} min</p>
                </div>
              </div>

              <Separator />

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Valor do Corte</p>
                  <p className="font-medium">{fmt(Number(selectedQuote.suggested_sale))}</p>
                </div>
                {Number(selectedQuote.material_cost) > 0 && (
                  <div>
                    <p className="text-muted-foreground text-xs">Custo do Material</p>
                    <p className="font-medium">{fmt(Number(selectedQuote.material_cost))}</p>
                  </div>
                )}
                {selectedQuote.service_value_included && Number(selectedQuote.service_value) > 0 && (
                  <div>
                    <p className="text-muted-foreground text-xs">Valor de Serviço</p>
                    <p className="font-medium">{fmt(Number(selectedQuote.service_value))}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-xs">Total Final</p>
                  <p className="font-bold text-primary text-base">{fmt(Number(selectedQuote.total_price))}</p>
                </div>
              </div>

              {/* Notes */}
              {selectedQuote.notes && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Observações do Cliente</Label>
                    <div className="rounded-md border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                      {selectedQuote.notes}
                    </div>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 flex-wrap">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportQuotePDF(selectedQuote)}>
                  <Download className="w-3.5 h-3.5" /> Baixar PDF
                </Button>
                {selectedQuote.file_path && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => downloadOriginalFile(selectedQuote)}>
                    <File className="w-3.5 h-3.5" /> Baixar Arquivo
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" className="gap-1.5">
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Deseja excluir o orçamento "{selectedQuote.file_name}" de {selectedQuote.user_name}? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteQuote(selectedQuote.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
