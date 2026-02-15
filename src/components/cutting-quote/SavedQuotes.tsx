import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, History, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";

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
}

export function SavedQuotes() {
  const { session } = useAuth();
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);
  const [loading, setLoading] = useState(true);

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
    const { error } = await supabase.from("cutting_quotes" as any).delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir orçamento.");
    } else {
      toast.success("Orçamento excluído.");
      setQuotes((prev) => prev.filter((q) => q.id !== id));
    }
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const exportQuotePDF = (q: SavedQuote) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Orçamento de Corte CNC", 14, 22);
    doc.setFontSize(10);
    doc.text(`Data: ${new Date(q.created_at).toLocaleDateString("pt-BR")}`, 14, 30);

    (doc as any).autoTable({
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          Orçamentos Salvos
        </CardTitle>
        <CardDescription>{quotes.length} orçamento(s) encontrado(s)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Espessura</TableHead>
                <TableHead className="text-right">Tempo</TableHead>
                <TableHead className="text-right">Preço Sugerido</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="text-xs">{new Date(q.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="text-xs font-medium">{q.file_name}</TableCell>
                  <TableCell className="text-xs">{q.material}</TableCell>
                  <TableCell className="text-xs">{q.thickness}</TableCell>
                  <TableCell className="text-xs text-right">{Number(q.estimated_time_min).toFixed(1)} min</TableCell>
                  <TableCell className="text-xs text-right font-medium text-primary">{fmt(Number(q.suggested_sale))}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
