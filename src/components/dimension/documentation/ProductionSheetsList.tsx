import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, FileText, Pencil, Trash2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProductionSheetDetail } from "./ProductionSheetDetail";

const tipoLabels: Record<string, string> = {
  router: "Router CNC", laser: "Laser", torno: "Torno", "3d": "Impressão 3D", acessorio: "Acessório", outro: "Outro"
};
const statusLabels: Record<string, string> = {
  planejamento: "Planejamento", em_producao: "Em Produção", finalizado: "Finalizado", pausado: "Pausado"
};
const statusColors: Record<string, string> = {
  planejamento: "bg-blue-500/10 text-blue-600", em_producao: "bg-amber-500/10 text-amber-600",
  finalizado: "bg-green-500/10 text-green-600", pausado: "bg-muted text-muted-foreground"
};

interface ProductionSheet {
  id: string;
  nome_projeto: string;
  tipo: string;
  cliente: string;
  produto_modelo: string;
  status: string;
  data_inicio: string | null;
  prazo_final: string | null;
  observacoes: string;
  created_at: string;
}

interface BomTemplate {
  id: string;
  nome: string;
  produto_modelo: string;
  items: any[];
}

interface ProcessTemplate {
  id: string;
  nome: string;
  produto_modelo: string;
  steps: any[];
}

export function ProductionSheetsList() {
  const { session } = useAuth();
  const [sheets, setSheets] = useState<ProductionSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingSheet, setEditingSheet] = useState<ProductionSheet | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<ProductionSheet | null>(null);
  const [bomTemplates, setBomTemplates] = useState<BomTemplate[]>([]);
  const [processTemplates, setProcessTemplates] = useState<ProcessTemplate[]>([]);
  const [selectedBomTemplate, setSelectedBomTemplate] = useState("");
  const [selectedProcessTemplate, setSelectedProcessTemplate] = useState("");

  const [form, setForm] = useState({
    nome_projeto: "", tipo: "outro", cliente: "", produto_modelo: "",
    status: "planejamento", data_inicio: "", prazo_final: "", observacoes: ""
  });

  const fetchSheets = async () => {
    const { data } = await supabase.from("production_sheets").select("*").order("created_at", { ascending: false });
    setSheets((data as any) || []);
    setLoading(false);
  };

  const fetchTemplates = async () => {
    const [bomRes, procRes] = await Promise.all([
      supabase.from("production_bom_templates").select("*").order("nome"),
      supabase.from("production_process_templates").select("*").order("nome"),
    ]);
    setBomTemplates((bomRes.data as any) || []);
    setProcessTemplates((procRes.data as any) || []);
  };

  useEffect(() => { fetchSheets(); fetchTemplates(); }, []);

  const openNew = () => {
    setEditingSheet(null);
    setForm({ nome_projeto: "", tipo: "outro", cliente: "", produto_modelo: "", status: "planejamento", data_inicio: "", prazo_final: "", observacoes: "" });
    setSelectedBomTemplate("");
    setSelectedProcessTemplate("");
    setShowDialog(true);
  };

  const openEdit = (s: ProductionSheet) => {
    setEditingSheet(s);
    setForm({
      nome_projeto: s.nome_projeto, tipo: s.tipo, cliente: s.cliente || "",
      produto_modelo: s.produto_modelo || "", status: s.status,
      data_inicio: s.data_inicio || "", prazo_final: s.prazo_final || "", observacoes: s.observacoes || ""
    });
    setSelectedBomTemplate("");
    setSelectedProcessTemplate("");
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.nome_projeto.trim()) { toast.error("Nome do projeto é obrigatório"); return; }
    const payload = {
      ...form,
      data_inicio: form.data_inicio || null,
      prazo_final: form.prazo_final || null,
    };

    if (editingSheet) {
      const { error } = await supabase.from("production_sheets").update(payload as any).eq("id", editingSheet.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Ficha atualizada");
    } else {
      const { data, error } = await supabase.from("production_sheets").insert({ ...payload, created_by: session?.user.id } as any).select().single();
      if (error) { toast.error("Erro ao criar ficha"); return; }
      // Apply templates if selected
      const sheetId = (data as any).id;
      if (selectedBomTemplate) {
        const tpl = bomTemplates.find(t => t.id === selectedBomTemplate);
        if (tpl && tpl.items.length > 0) {
          const items = tpl.items.map((item: any) => ({ ...item, ficha_id: sheetId }));
          await supabase.from("production_bom_items").insert(items as any);
        }
      }
      if (selectedProcessTemplate) {
        const tpl = processTemplates.find(t => t.id === selectedProcessTemplate);
        if (tpl && tpl.steps.length > 0) {
          const steps = tpl.steps.map((step: any, i: number) => ({ ...step, ficha_id: sheetId, ordem: i }));
          await supabase.from("production_process_steps").insert(steps as any);
        }
      }
      toast.success("Ficha criada");
    }
    setShowDialog(false);
    fetchSheets();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("production_sheets").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Ficha excluída");
    fetchSheets();
  };

  if (selectedSheet) {
    return <ProductionSheetDetail sheet={selectedSheet} onBack={() => { setSelectedSheet(null); fetchSheets(); }} />;
  }

  const filtered = sheets.filter(s => {
    const matchSearch = s.nome_projeto.toLowerCase().includes(search.toLowerCase()) || s.cliente?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar fichas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" />Nova Ficha</Button>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Nenhuma ficha de produção encontrada</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(s => (
            <Card key={s.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setSelectedSheet(s)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-semibold leading-tight">{s.nome_projeto}</CardTitle>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{tipoLabels[s.tipo] || s.tipo}</Badge>
                  <Badge className={`text-xs ${statusColors[s.status] || ""}`}>{statusLabels[s.status] || s.status}</Badge>
                </div>
                {s.cliente && <p className="text-xs text-muted-foreground">Cliente: {s.cliente}</p>}
                {s.produto_modelo && <p className="text-xs text-muted-foreground">Modelo: {s.produto_modelo}</p>}
                <p className="text-xs text-muted-foreground">Criado: {format(new Date(s.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSheet ? "Editar Ficha" : "Nova Ficha de Produção"}</DialogTitle>
            <DialogDescription>Preencha os dados do projeto de produção.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nome do Projeto *</label>
              <Input value={form.nome_projeto} onChange={e => setForm({ ...form, nome_projeto: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(tipoLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Cliente (opcional)</label>
              <Input value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Produto / Modelo (opcional)</label>
              <Input value={form.produto_modelo} onChange={e => setForm({ ...form, produto_modelo: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Data Início</label>
                <Input type="date" value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Prazo Final</label>
                <Input type="date" value={form.prazo_final} onChange={e => setForm({ ...form, prazo_final: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Observações</label>
              <Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={2} />
            </div>

            {!editingSheet && (bomTemplates.length > 0 || processTemplates.length > 0) && (
              <div className="border-t pt-3 space-y-3">
                <p className="text-xs font-semibold flex items-center gap-1"><Copy className="h-3.5 w-3.5" /> Criar a partir de template</p>
                {bomTemplates.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Template BOM</label>
                    <Select value={selectedBomTemplate} onValueChange={setSelectedBomTemplate}>
                      <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {bomTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {processTemplates.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Template Processos</label>
                    <Select value={selectedProcessTemplate} onValueChange={setSelectedProcessTemplate}>
                      <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {processTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingSheet ? "Salvar" : "Criar Ficha"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
