import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, X, Download, File, Users, Shield, Layers, Eye, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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
      const qDate = new Date(q.created_at);
      const matchFrom = !dateFrom || qDate >= new Date(dateFrom);
      const matchTo = !dateTo || qDate <= new Date(dateTo + "T23:59:59");
      return matchSearch && matchMaterial && matchFrom && matchTo;
    });
  }, [quotes, searchTerm, materialFilter, dateFrom, dateTo]);

  const fetchServiceQuotes = async () => {
    if (!session?.user) return;
    setLoading(true);

    // 1. Get all user_ids with role='servico'
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

    // 2. Get profiles for these users
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email, company")
      .in("id", serviceUserIds);

    const profileMap = new Map(
      (profiles ?? []).map((p: any) => [p.id, { name: p.name, email: p.email, company: p.company ?? "" }])
    );

    // 3. Get all quotes for these users
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
      return {
        ...q,
        user_name: profile.name,
        user_email: profile.email,
        user_company: profile.company,
      };
    });

    setQuotes(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchServiceQuotes();
  }, [session]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

  // Summary stats
  const totalQuotes = filteredQuotes.length;
  const totalRevenue = filteredQuotes.reduce((sum, q) => sum + Number(q.total_price), 0);
  const uniqueClients = new Set(filteredQuotes.map((q) => q.user_id)).size;

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Carregando orçamentos de clientes de serviço...</p>;
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Orçamentos de Clientes de Serviço
          </CardTitle>
          <CardDescription>
            Histórico de todos os orçamentos gerados por usuários com perfil "Serviço"
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
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
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
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                        Nenhum orçamento encontrado com os filtros aplicados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQuotes.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell className="text-xs">{new Date(q.created_at).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-xs font-medium">{q.user_name}</p>
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
        <DialogContent className="max-w-lg">
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
                <Badge variant={selectedQuote.status === "fechado" ? "default" : "secondary"} className={`text-[10px] ${selectedQuote.status === "fechado" ? "bg-green-600" : ""}`}>
                  {selectedQuote.status === "fechado" ? "Fechado" : "Orçamento"}
                </Badge>
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

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportQuotePDF(selectedQuote)}>
                  <Download className="w-3.5 h-3.5" /> Baixar PDF
                </Button>
                {selectedQuote.file_path && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => downloadOriginalFile(selectedQuote)}>
                    <File className="w-3.5 h-3.5" /> Baixar Arquivo
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
