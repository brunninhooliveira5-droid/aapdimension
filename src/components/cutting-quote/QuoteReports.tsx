import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { BarChart3, TrendingUp, PieChart as PieChartIcon, DollarSign, Trash2, Download, Pencil, Check, X, Eye, FileText, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface QuoteRow {
  id: string;
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
  client_name: string;
}

const COLORS = [
  "hsl(38, 92%, 55%)",
  "hsl(152, 60%, 42%)",
  "hsl(215, 70%, 55%)",
  "hsl(0, 72%, 51%)",
  "hsl(280, 60%, 55%)",
  "hsl(180, 50%, 45%)",
];

const chartConfig = {
  total: { label: "Total (R$)", color: "hsl(38, 92%, 55%)" },
  count: { label: "Quantidade", color: "hsl(152, 60%, 42%)" },
  cost: { label: "Custo", color: "hsl(215, 70%, 55%)" },
  sale: { label: "Preço Sugerido", color: "hsl(38, 92%, 55%)" },
};

export function QuoteReports() {
  const { session } = useAuth();
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailQuote, setDetailQuote] = useState<QuoteRow | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editClientName, setEditClientName] = useState("");
  const [editStatus, setEditStatus] = useState("");

  useEffect(() => {
    if (!session?.user) return;
    fetchQuotes();
  }, [session]);

  const fetchQuotes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cutting_quotes" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setQuotes(data as any);
    setLoading(false);
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const deleteQuote = async (id: string) => {
    const { error } = await supabase.from("cutting_quotes" as any).delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir orçamento.");
    } else {
      toast.success("Orçamento excluído.");
      setQuotes((prev) => prev.filter((q) => q.id !== id));
    }
  };

  const startEdit = (q: QuoteRow) => {
    setEditingId(q.id);
    setEditClientName(q.client_name || "");
    setEditStatus(q.status || "orcamento");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditClientName("");
    setEditStatus("");
  };

  const saveEdit = async (id: string) => {
    const { error } = await supabase
      .from("cutting_quotes" as any)
      .update({ client_name: editClientName, status: editStatus } as any)
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar orçamento.");
    } else {
      toast.success("Orçamento atualizado!");
      setQuotes((prev) => prev.map((q) => q.id === id ? { ...q, client_name: editClientName, status: editStatus } : q));
      cancelEdit();
    }
  };

  const exportQuotePDF = (q: QuoteRow) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Orçamento de Corte CNC", 14, 22);
    doc.setFontSize(10);
    doc.text(`Data: ${new Date(q.created_at).toLocaleDateString("pt-BR")}`, 14, 30);
    if (q.client_name) doc.text(`Cliente: ${q.client_name}`, 14, 36);

    (doc as any).autoTable({
      startY: q.client_name ? 44 : 38,
      head: [["Item", "Valor"]],
      body: [
        ["Arquivo", q.file_name],
        ["Material", q.material],
        ["Espessura", q.thickness],
        ["Máquina", q.machine_name],
        ["Comprimento de Corte", `${Number(q.path_length_m).toFixed(2)} m`],
        ["Quantidade", `${q.quantity}`],
        ["Tempo Estimado", `${Number(q.estimated_time_min).toFixed(2)} min`],
        ["Custo Estimado", fmt(Number(q.estimated_cost))],
        ["Preço Mínimo", fmt(Number(q.min_recommended))],
        ["Preço Sugerido", fmt(Number(q.suggested_sale))],
      ],
      theme: "striped",
      styles: { fontSize: 10 },
    });

    doc.save(`orcamento_${q.file_name.replace(/\.\w+$/, "")}.pdf`);
  };

  // Stats
  const totalQuotes = quotes.length;
  const orcamentoQuotes = quotes.filter((q) => q.status === "orcamento");
  const executadoQuotes = quotes.filter((q) => q.status === "executado");
  const totalOrcamento = orcamentoQuotes.reduce((s, q) => s + Number(q.suggested_sale), 0);
  const totalExecutado = executadoQuotes.reduce((s, q) => s + Number(q.suggested_sale), 0);

  // Charts
  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; total: number; count: number; cost: number }>();
    quotes.forEach((q) => {
      const d = new Date(q.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      const existing = map.get(key) || { month: label, total: 0, count: 0, cost: 0 };
      existing.total += Number(q.suggested_sale);
      existing.cost += Number(q.estimated_cost);
      existing.count += 1;
      map.set(key, existing);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [quotes]);

  const materialData = useMemo(() => {
    const map = new Map<string, number>();
    quotes.forEach((q) => {
      map.set(q.material, (map.get(q.material) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [quotes]);

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Carregando relatórios...</p>;
  }

  if (!quotes.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum orçamento encontrado.</p>
          <p className="text-xs text-muted-foreground mt-1">Salve orçamentos na aba "Orçamento" para visualizar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <BarChart3 className="w-3.5 h-3.5" /> Total
            </div>
            <p className="text-xl font-bold">{totalQuotes}</p>
          </CardContent>
        </Card>
        <Card className="border-warning/30">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Clock className="w-3.5 h-3.5" /> Orçamentos
            </div>
            <p className="text-xl font-bold">{orcamentoQuotes.length}</p>
            <p className="text-xs text-muted-foreground">{fmt(totalOrcamento)}</p>
          </CardContent>
        </Card>
        <Card className="border-success/30">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Executados
            </div>
            <p className="text-xl font-bold">{executadoQuotes.length}</p>
            <p className="text-xs text-muted-foreground">{fmt(totalExecutado)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <DollarSign className="w-3.5 h-3.5" /> Receita Total
            </div>
            <p className="text-xl font-bold text-primary">{fmt(totalOrcamento + totalExecutado)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quotes Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Orçamentos Salvos
          </CardTitle>
          <CardDescription>{totalQuotes} orçamento(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((q) => (
                  <TableRow key={q.id} className="group">
                    <TableCell className="text-xs">{new Date(q.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-xs">
                      {editingId === q.id ? (
                        <Input
                          value={editClientName}
                          onChange={(e) => setEditClientName(e.target.value)}
                          className="h-7 text-xs w-28"
                          placeholder="Cliente"
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-primary transition-colors"
                          onClick={() => setDetailQuote(q)}
                        >
                          {q.client_name || "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span
                        className="font-medium cursor-pointer hover:text-primary transition-colors"
                        onClick={() => setDetailQuote(q)}
                      >
                        {q.file_name}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{q.material}</TableCell>
                    <TableCell>
                      {editingId === q.id ? (
                        <Select value={editStatus} onValueChange={setEditStatus}>
                          <SelectTrigger className="h-7 text-xs w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="orcamento">Orçamento</SelectItem>
                            <SelectItem value="executado">Executado</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          variant={q.status === "executado" ? "default" : "secondary"}
                          className={q.status === "executado"
                            ? "bg-success/15 text-success border-success/30 text-[10px]"
                            : "bg-warning/15 text-warning border-warning/30 text-[10px]"
                          }
                        >
                          {q.status === "executado" ? "Executado" : "Orçamento"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium text-primary">{fmt(Number(q.suggested_sale))}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {editingId === q.id ? (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => saveEdit(q.id)} title="Salvar">
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit} title="Cancelar">
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailQuote(q)} title="Detalhes">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(q)} title="Editar">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => exportQuotePDF(q)} title="PDF">
                              <Download className="w-3.5 h-3.5" />
                            </Button>
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
                                    Deseja excluir "{q.file_name}"? Esta ação não pode ser desfeita.
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
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailQuote} onOpenChange={() => setDetailQuote(null)}>
        <DialogContent className="max-w-lg">
          {detailQuote && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {detailQuote.file_name}
                </DialogTitle>
                <DialogDescription>
                  Detalhes do orçamento
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge
                    variant={detailQuote.status === "executado" ? "default" : "secondary"}
                    className={detailQuote.status === "executado"
                      ? "bg-success/15 text-success border-success/30"
                      : "bg-warning/15 text-warning border-warning/30"
                    }
                  >
                    {detailQuote.status === "executado" ? "Executado" : "Orçamento"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{new Date(detailQuote.created_at).toLocaleDateString("pt-BR")}</span>
                </div>

                {detailQuote.client_name && (
                  <div>
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="text-sm font-medium">{detailQuote.client_name}</p>
                  </div>
                )}

                <Separator />

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Material</p>
                    <p className="font-medium">{detailQuote.material}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Espessura</p>
                    <p className="font-medium">{detailQuote.thickness}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Máquina</p>
                    <p className="font-medium">{detailQuote.machine_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Quantidade</p>
                    <p className="font-medium">{detailQuote.quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Comprimento de Corte</p>
                    <p className="font-medium">{Number(detailQuote.path_length_m).toFixed(2)} m</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tempo Estimado</p>
                    <p className="font-medium">{Number(detailQuote.estimated_time_min).toFixed(1)} min</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">Custo</p>
                    <p className="text-sm font-medium">{fmt(Number(detailQuote.estimated_cost))}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">Mínimo</p>
                    <p className="text-sm font-medium">{fmt(Number(detailQuote.min_recommended))}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">Sugerido</p>
                    <p className="text-sm font-bold text-primary">{fmt(Number(detailQuote.suggested_sale))}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => exportQuotePDF(detailQuote)}>
                    <Download className="w-4 h-4" /> Exportar PDF
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Receita Mensal
            </CardTitle>
            <CardDescription>Preço sugerido vs custo por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" name="sale" fill="hsl(38, 92%, 55%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" name="cost" fill="hsl(215, 70%, 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Orçamentos por Mês
            </CardTitle>
            <CardDescription>Quantidade de orçamentos ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="count" name="count" stroke="hsl(152, 60%, 42%)" strokeWidth={2} dot={{ fill: "hsl(152, 60%, 42%)", r: 4 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Material Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-primary" /> Distribuição por Material
          </CardTitle>
          <CardDescription>Proporção de orçamentos por tipo de material</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <ChartContainer config={chartConfig} className="h-[240px] w-[260px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie data={materialData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} strokeWidth={2}>
                  {materialData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-3">
              {materialData.map((m, i) => (
                <div key={m.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground">{m.name}</span>
                  <span className="font-medium">{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
