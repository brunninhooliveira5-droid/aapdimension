import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2, History, Download, CheckCircle, FileText, FileDown, File, Search, X, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SavedQuote {
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
  file_path: string | null;
  material_cost: number;
  material_owner: string;
  total_price: number;
  client_name: string;
  client_phone: string;
  notes: string;
}

export function SavedQuotes() {
  const { session } = useAuth();
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<SavedQuote | null>(null);
  const [notesText, setNotesText] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "orcamento" | "fechado">("todos");
  const [materialFilter, setMaterialFilter] = useState("todos");

  const uniqueMaterials = useMemo(() => {
    const mats = new Set(quotes.map((q) => q.material));
    return Array.from(mats).sort();
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const matchSearch = searchTerm === "" || 
        q.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.material.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.machine_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "todos" || q.status === statusFilter;
      const matchMaterial = materialFilter === "todos" || q.material === materialFilter;
      return matchSearch && matchStatus && matchMaterial;
    });
  }, [quotes, searchTerm, statusFilter, materialFilter]);

  const fetchQuotes = async () => {
    if (!session?.user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("cutting_quotes" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setQuotes(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchQuotes();
  }, [session]);

  const deleteQuote = async (id: string) => {
    const quote = quotes.find((q) => q.id === id);
    // Delete file from storage if exists
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

  const toggleStatus = async (q: SavedQuote) => {
    const newStatus = q.status === "fechado" ? "orcamento" : "fechado";
    const { error } = await supabase
      .from("cutting_quotes" as any)
      .update({ status: newStatus } as any)
      .eq("id", q.id);
    if (error) {
      toast.error("Erro ao atualizar status.");
    } else {
      toast.success(newStatus === "fechado" ? "Orçamento fechado!" : "Status revertido para orçamento.");
      setQuotes((prev) => prev.map((item) => item.id === q.id ? { ...item, status: newStatus } : item));
    }
  };

  const openQuoteDetail = (q: SavedQuote) => {
    setSelectedQuote(q);
    setNotesText(q.notes || "");
  };

  const saveNotes = async () => {
    if (!selectedQuote) return;
    setSavingNotes(true);
    const { error } = await supabase
      .from("cutting_quotes" as any)
      .update({ notes: notesText } as any)
      .eq("id", selectedQuote.id);
    setSavingNotes(false);
    if (error) {
      toast.error("Erro ao salvar observações.");
    } else {
      toast.success("Observações salvas!");
      setQuotes((prev) => prev.map((item) => item.id === selectedQuote.id ? { ...item, notes: notesText } : item));
      setSelectedQuote({ ...selectedQuote, notes: notesText });
    }
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const exportQuotePDF = (q: SavedQuote) => {
    try {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Orçamento de Corte CNC", 14, 22);
    doc.setFontSize(10);
    doc.text(`Data: ${new Date(q.created_at).toLocaleDateString("pt-BR")}`, 14, 30);

    autoTable(doc, {
      startY: 38,
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
    } catch (err: any) {
      console.error("Erro ao gerar PDF:", err);
      toast.error("Erro ao gerar PDF.");
    }
  };

  const downloadOriginalFile = async (q: SavedQuote) => {
    if (!q.file_path) {
      toast.error("Arquivo original não disponível para este orçamento.");
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

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Carregando orçamentos...</p>;
  }

  if (quotes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <History className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum orçamento salvo ainda.</p>
          <p className="text-xs text-muted-foreground mt-1">Calcule e salve orçamentos na aba "Orçamento por Arquivo".</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            Orçamentos Salvos
          </CardTitle>
           <CardDescription>{filteredQuotes.length} de {quotes.length} orçamento(s)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por arquivo, material ou máquina..."
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
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="orcamento">Orçamento</SelectItem>
                <SelectItem value="fechado">Fechado</SelectItem>
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
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Espessura</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Tempo</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                      Nenhum orçamento encontrado com os filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                filteredQuotes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="text-xs">{new Date(q.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => openQuoteDetail(q)}
                        className="text-xs font-medium text-primary hover:underline cursor-pointer text-left"
                      >
                        {q.file_name}
                      </button>
                    </TableCell>
                    <TableCell className="text-xs">{q.material}</TableCell>
                    <TableCell className="text-xs">{q.thickness}</TableCell>
                    <TableCell>
                      <Badge
                        variant={q.status === "fechado" ? "default" : "secondary"}
                        className={`text-[10px] cursor-pointer ${q.status === "fechado" ? "bg-green-600 hover:bg-green-700" : ""}`}
                        onClick={() => toggleStatus(q)}
                      >
                        {q.status === "fechado" ? <><CheckCircle className="w-3 h-3 mr-1" /> Fechado</> : <><FileText className="w-3 h-3 mr-1" /> Orçamento</>}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-right">{Number(q.estimated_time_min).toFixed(1)} min</TableCell>
                    <TableCell className="text-xs text-right font-medium text-primary">
                      {fmt(Number(q.total_price) || Number(q.suggested_sale))}
                      {Number(q.material_cost) > 0 && (
                        <span className="block text-[10px] text-muted-foreground font-normal">
                          Corte: {fmt(Number(q.suggested_sale))} + Material: {fmt(Number(q.material_cost))}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => exportQuotePDF(q)} title="Exportar PDF">
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
                                Deseja excluir o orçamento "{q.file_name}"? Esta ação não pode ser desfeita.
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
        </CardContent>
      </Card>

      {/* Quote Detail Dialog */}
      <Dialog open={!!selectedQuote} onOpenChange={(open) => !open && setSelectedQuote(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <File className="w-4 h-4 text-primary" />
              {selectedQuote?.file_name}
            </DialogTitle>
          </DialogHeader>

          {selectedQuote && (
            <div className="space-y-4">
              {/* Client Info */}
              {(selectedQuote.client_name || selectedQuote.client_phone) && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedQuote.client_name && (
                    <div>
                      <p className="text-muted-foreground text-xs">Cliente</p>
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
              )}

              {(selectedQuote.client_name || selectedQuote.client_phone) && <Separator />}

              {/* Quote Info */}
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
                <div>
                  <p className="text-muted-foreground text-xs">Valor do Corte</p>
                  <p className="font-medium">{fmt(Number(selectedQuote.suggested_sale))}</p>
                </div>
                {Number(selectedQuote.material_cost) > 0 && (
                  <div>
                    <p className="text-muted-foreground text-xs">Valor do Material</p>
                    <p className="font-medium">{fmt(Number(selectedQuote.material_cost))}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-xs">Valor Total</p>
                  <p className="font-medium text-primary">{fmt(Number(selectedQuote.total_price) || Number(selectedQuote.suggested_sale))}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <Badge
                    variant={selectedQuote.status === "fechado" ? "default" : "secondary"}
                    className={`text-[10px] ${selectedQuote.status === "fechado" ? "bg-green-600" : ""}`}
                  >
                    {selectedQuote.status === "fechado" ? "Fechado" : "Orçamento"}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Observações */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Observações</Label>
                <Textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder="Adicione observações sobre este orçamento..."
                  className="min-h-[80px] text-sm"
                />
                <Button
                  size="sm"
                  onClick={saveNotes}
                  disabled={savingNotes || notesText === (selectedQuote?.notes || "")}
                  className="gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingNotes ? "Salvando..." : "Salvar Observações"}
                </Button>
              </div>

              <Separator />

              {/* Download Actions */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Downloads</p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => downloadOriginalFile(selectedQuote)}
                    disabled={!selectedQuote.file_path}
                  >
                    <FileDown className="w-4 h-4" />
                    Baixar Arquivo Original ({selectedQuote.file_name.split(".").pop()?.toUpperCase()})
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => exportQuotePDF(selectedQuote)}
                  >
                    <Download className="w-4 h-4" />
                    Exportar PDF do Orçamento
                  </Button>
                </div>
                {!selectedQuote.file_path && (
                  <p className="text-[10px] text-muted-foreground">
                    Arquivo original não disponível (orçamento salvo antes desta funcionalidade).
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
