import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, RefreshCw, Scissors } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Scrap {
  id: string;
  material_name: string;
  width: number;
  height: number;
  length: number;
  scrap_type: string;
  status: string;
  notes: string;
  created_at: string;
}

export function ScrapsManager() {
  const [scraps, setScraps] = useState<Scrap[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchScraps = async () => {
    setLoading(true);
    let query = supabase.from("cutting_scraps" as any).select("*").order("created_at", { ascending: false });
    if (filter !== "all") {
      query = query.eq("status", filter);
    }
    const { data } = await query as any;
    setScraps(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchScraps(); }, [filter]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    await supabase.from("cutting_scraps" as any).update({ status: newStatus } as any).eq("id", id);
    toast.success("Status atualizado.");
    fetchScraps();
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await supabase.from("cutting_scraps" as any).delete().eq("id", id);
    toast.success("Retalho excluído.");
    setDeleting(null);
    fetchScraps();
  };

  const statusColor = (s: string) => {
    if (s === "disponível") return "default";
    if (s === "usado") return "secondary";
    return "outline";
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold flex items-center gap-2 text-foreground">
          <Scissors className="h-4 w-4 text-primary" /> Retalhos
        </h3>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-36 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="disponível">Disponíveis</SelectItem>
              <SelectItem value="usado">Usados</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchScraps} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : scraps.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum retalho registrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Dimensões</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {scraps.map((scrap) => (
                <TableRow key={scrap.id}>
                  <TableCell className="font-medium">{scrap.material_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{scrap.scrap_type === "chapa" ? "Chapa" : "Tubo"}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {scrap.scrap_type === "chapa"
                      ? `${Number(scrap.width).toFixed(0)} x ${Number(scrap.height).toFixed(0)} mm`
                      : `${Number(scrap.length).toFixed(0)} mm`}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={scrap.status}
                      onValueChange={(val) => handleStatusChange(scrap.id, val)}
                    >
                      <SelectTrigger className="w-28 h-7 text-xs">
                        <Badge variant={statusColor(scrap.status) as any} className="text-xs">
                          {scrap.status === "disponível" ? "Disponível" : "Usado"}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disponível">Disponível</SelectItem>
                        <SelectItem value="usado">Usado</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(scrap.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(scrap.id)}
                      disabled={deleting === scrap.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
