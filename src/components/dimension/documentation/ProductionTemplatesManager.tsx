import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, List, Route, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const categoriaLabels: Record<string, string> = { mecanica: "Mecânica", eletrica: "Elétrica", eletronica: "Eletrônica", acabamento: "Acabamento", outro: "Outro" };
const setorLabels: Record<string, string> = { cnc: "CNC", laser: "Laser", torno: "Torno", "3d": "3D", montagem: "Montagem", eletrica: "Elétrica", adm: "Adm" };
const unidadeOptions = ["un", "m", "kg", "mm", "cm", "L", "pç", "conj"];

export function ProductionTemplatesManager() {
  const { session } = useAuth();
  const [tab, setTab] = useState("bom");
  const [bomTemplates, setBomTemplates] = useState<any[]>([]);
  const [processTemplates, setProcessTemplates] = useState<any[]>([]);
  const [showBomDialog, setShowBomDialog] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [editingBom, setEditingBom] = useState<any>(null);
  const [editingProcess, setEditingProcess] = useState<any>(null);
  const [bomForm, setBomForm] = useState({ nome: "", produto_modelo: "", items: [] as any[] });
  const [processForm, setProcessForm] = useState({ nome: "", produto_modelo: "", steps: [] as any[] });

  const fetchAll = async () => {
    const [b, p] = await Promise.all([
      supabase.from("production_bom_templates").select("*").order("nome"),
      supabase.from("production_process_templates").select("*").order("nome"),
    ]);
    setBomTemplates((b.data as any) || []);
    setProcessTemplates((p.data as any) || []);
  };

  useEffect(() => { fetchAll(); }, []);

  // BOM Template CRUD
  const openNewBom = () => { setEditingBom(null); setBomForm({ nome: "", produto_modelo: "", items: [] }); setShowBomDialog(true); };
  const openEditBom = (t: any) => { setEditingBom(t); setBomForm({ nome: t.nome, produto_modelo: t.produto_modelo || "", items: t.items || [] }); setShowBomDialog(true); };
  const saveBom = async () => {
    if (!bomForm.nome.trim()) { toast.error("Nome obrigatório"); return; }
    if (editingBom) {
      await supabase.from("production_bom_templates").update({ nome: bomForm.nome, produto_modelo: bomForm.produto_modelo, items: bomForm.items } as any).eq("id", editingBom.id);
    } else {
      await supabase.from("production_bom_templates").insert({ ...bomForm, created_by: session?.user.id } as any);
    }
    toast.success("Template BOM salvo"); setShowBomDialog(false); fetchAll();
  };
  const deleteBom = async (id: string) => { await supabase.from("production_bom_templates").delete().eq("id", id); toast.success("Template removido"); fetchAll(); };

  const addBomItem = () => setBomForm({ ...bomForm, items: [...bomForm.items, { item_nome: "", categoria: "outro", unidade: "un", quantidade: 1, valor_unitario: 0, fornecedor: "" }] });
  const updateBomItem = (i: number, field: string, val: any) => { const items = [...bomForm.items]; items[i][field] = val; setBomForm({ ...bomForm, items }); };
  const removeBomItem = (i: number) => setBomForm({ ...bomForm, items: bomForm.items.filter((_, idx) => idx !== i) });

  // Process Template CRUD
  const openNewProcess = () => { setEditingProcess(null); setProcessForm({ nome: "", produto_modelo: "", steps: [] }); setShowProcessDialog(true); };
  const openEditProcess = (t: any) => { setEditingProcess(t); setProcessForm({ nome: t.nome, produto_modelo: t.produto_modelo || "", steps: t.steps || [] }); setShowProcessDialog(true); };
  const saveProcess = async () => {
    if (!processForm.nome.trim()) { toast.error("Nome obrigatório"); return; }
    if (editingProcess) {
      await supabase.from("production_process_templates").update({ nome: processForm.nome, produto_modelo: processForm.produto_modelo, steps: processForm.steps } as any).eq("id", editingProcess.id);
    } else {
      await supabase.from("production_process_templates").insert({ ...processForm, created_by: session?.user.id } as any);
    }
    toast.success("Template processos salvo"); setShowProcessDialog(false); fetchAll();
  };
  const deleteProcess = async (id: string) => { await supabase.from("production_process_templates").delete().eq("id", id); toast.success("Template removido"); fetchAll(); };

  const addProcessStep = () => setProcessForm({ ...processForm, steps: [...processForm.steps, { etapa_nome: "", setor_responsavel: "montagem", tempo_estimado_horas: null, prazo_dias: null, status: "todo" }] });
  const updateProcessStep = (i: number, field: string, val: any) => { const steps = [...processForm.steps]; steps[i][field] = val; setProcessForm({ ...processForm, steps }); };
  const removeProcessStep = (i: number) => setProcessForm({ ...processForm, steps: processForm.steps.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-transparent p-0 gap-1">
          <TabsTrigger value="bom" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><List className="h-3.5 w-3.5" />Templates BOM</TabsTrigger>
          <TabsTrigger value="processos" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Route className="h-3.5 w-3.5" />Templates Processos</TabsTrigger>
        </TabsList>

        <TabsContent value="bom">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Templates de BOM</CardTitle>
                <Button size="sm" onClick={openNewBom}><Plus className="h-3.5 w-3.5 mr-1" />Novo Template</Button>
              </div>
            </CardHeader>
            <CardContent>
              {bomTemplates.length === 0 ? <p className="text-center text-muted-foreground py-4 text-sm">Nenhum template criado</p> : (
                <div className="space-y-2">
                  {bomTemplates.map(t => (
                    <div key={t.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div>
                        <p className="text-sm font-medium">{t.nome}</p>
                        <p className="text-xs text-muted-foreground">{t.produto_modelo || "Genérico"} • {(t.items || []).length} itens</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditBom(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteBom(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processos">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Templates de Processos</CardTitle>
                <Button size="sm" onClick={openNewProcess}><Plus className="h-3.5 w-3.5 mr-1" />Novo Template</Button>
              </div>
            </CardHeader>
            <CardContent>
              {processTemplates.length === 0 ? <p className="text-center text-muted-foreground py-4 text-sm">Nenhum template criado</p> : (
                <div className="space-y-2">
                  {processTemplates.map(t => (
                    <div key={t.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div>
                        <p className="text-sm font-medium">{t.nome}</p>
                        <p className="text-xs text-muted-foreground">{t.produto_modelo || "Genérico"} • {(t.steps || []).length} etapas</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditProcess(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteProcess(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* BOM Template Dialog */}
      <Dialog open={showBomDialog} onOpenChange={setShowBomDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBom ? "Editar" : "Novo"} Template BOM</DialogTitle>
            <DialogDescription>Defina os itens padrão da lista de materiais.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><Input value={bomForm.nome} onChange={e => setBomForm({ ...bomForm, nome: e.target.value })} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Produto/Modelo</label><Input value={bomForm.produto_modelo} onChange={e => setBomForm({ ...bomForm, produto_modelo: e.target.value })} /></div>
            </div>
            <div className="flex justify-between items-center"><p className="text-xs font-semibold">Itens</p><Button size="sm" variant="outline" onClick={addBomItem}><Plus className="h-3.5 w-3.5 mr-1" />Item</Button></div>
            {bomForm.items.map((item: any, i: number) => (
              <div key={i} className="flex gap-2 items-center border rounded p-2">
                <Input className="h-8 text-xs flex-1" value={item.item_nome} onChange={e => updateBomItem(i, "item_nome", e.target.value)} placeholder="Item" />
                <Select value={item.categoria} onValueChange={v => updateBomItem(i, "categoria", v)}>
                  <SelectTrigger className="h-8 text-xs w-[100px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(categoriaLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
                <Input className="h-8 text-xs w-14" type="number" value={item.quantidade} onChange={e => updateBomItem(i, "quantidade", parseFloat(e.target.value) || 0)} />
                <Input className="h-8 text-xs w-20" type="number" step="0.01" value={item.valor_unitario} onChange={e => updateBomItem(i, "valor_unitario", parseFloat(e.target.value) || 0)} placeholder="R$" />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeBomItem(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBomDialog(false)}>Cancelar</Button>
            <Button onClick={saveBom}><Save className="h-3.5 w-3.5 mr-1" />Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Process Template Dialog */}
      <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProcess ? "Editar" : "Novo"} Template Processos</DialogTitle>
            <DialogDescription>Defina as etapas padrão do roteiro de produção.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><Input value={processForm.nome} onChange={e => setProcessForm({ ...processForm, nome: e.target.value })} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Produto/Modelo</label><Input value={processForm.produto_modelo} onChange={e => setProcessForm({ ...processForm, produto_modelo: e.target.value })} /></div>
            </div>
            <div className="flex justify-between items-center"><p className="text-xs font-semibold">Etapas</p><Button size="sm" variant="outline" onClick={addProcessStep}><Plus className="h-3.5 w-3.5 mr-1" />Etapa</Button></div>
            {processForm.steps.map((step: any, i: number) => (
              <div key={i} className="flex gap-2 items-center border rounded p-2">
                <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}.</span>
                <Input className="h-8 text-xs flex-1" value={step.etapa_nome} onChange={e => updateProcessStep(i, "etapa_nome", e.target.value)} placeholder="Nome da etapa" />
                <Select value={step.setor_responsavel} onValueChange={v => updateProcessStep(i, "setor_responsavel", v)}>
                  <SelectTrigger className="h-8 text-xs w-[100px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(setorLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
                <Input className="h-8 text-xs w-20" type="number" value={step.prazo_dias || ""} onChange={e => updateProcessStep(i, "prazo_dias", parseInt(e.target.value) || null)} placeholder="Dias" />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeProcessStep(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProcessDialog(false)}>Cancelar</Button>
            <Button onClick={saveProcess}><Save className="h-3.5 w-3.5 mr-1" />Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
