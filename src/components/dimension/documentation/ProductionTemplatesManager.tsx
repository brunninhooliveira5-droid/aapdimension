import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, List, Route, Save, Paperclip, X, Eye, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useModule } from "@/contexts/ModuleContext";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const categoriaLabels: Record<string, string> = { mecanica: "Mecânica", eletrica: "Elétrica", eletronica: "Eletrônica", acabamento: "Acabamento", outro: "Outro" };
// Sectors are now fetched dynamically from production cards
const unidadeOptions = ["un", "m", "kg", "mm", "cm", "L", "pç", "conj"];
const itemTypeLabels: Record<string, string> = {
  materia_prima: "Matéria-prima",
  componente: "Componente",
  consumivel: "Consumível",
  ferramenta: "Ferramenta",
  produto_acabado: "Produto Acabado",
};

export function ProductionTemplatesManager() {
  const { session } = useAuth();
  const { tables, storage } = useModule();
  const [tab, setTab] = useState("bom");
  const [bomTemplates, setBomTemplates] = useState<any[]>([]);
  const [processTemplates, setProcessTemplates] = useState<any[]>([]);
  const [showBomDialog, setShowBomDialog] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [editingBom, setEditingBom] = useState<any>(null);
  const [editingProcess, setEditingProcess] = useState<any>(null);
  const [bomForm, setBomForm] = useState({ nome: "", produto_modelo: "", items: [] as any[] });
  const [processForm, setProcessForm] = useState({ nome: "", produto_modelo: "", steps: [] as any[] });
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [stepFiles, setStepFiles] = useState<Record<number, any[]>>({});
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; mime: string } | null>(null);

  const fetchAll = async () => {
    const [b, p] = await Promise.all([
      supabase.from(tables.productionBomTemplates as any).select("*").order("nome"),
      supabase.from(tables.productionProcessTemplates as any).select("*").order("nome"),
    ]);
    setBomTemplates((b.data as any) || []);
    setProcessTemplates((p.data as any) || []);
  };

  useEffect(() => { fetchAll(); }, [tables]);

  useEffect(() => {
    const fetchInventory = async () => {
      const { data, error } = await supabase.from(tables.inventoryItems as any).select("id, name, internal_code, item_type, unit_cost, avg_cost, last_cost").eq("is_active", true).order("name");
      if (error) console.error("Erro ao buscar itens do estoque:", error);
      setInventoryItems((data as any) || []);
    };
    fetchInventory();
  }, [tables]);

  // BOM Template CRUD
  const openNewBom = () => { setEditingBom(null); setBomForm({ nome: "", produto_modelo: "", items: [] }); setShowBomDialog(true); };
  const openEditBom = (t: any) => {
    setEditingBom(t);
    // Refresh costs from inventory
    const updatedItems = (t.items || []).map((item: any) => {
      if (item.inventory_item_id) {
        const inv = inventoryItems.find((it: any) => it.id === item.inventory_item_id);
        if (inv) {
          const bestCost = inv.unit_cost || inv.avg_cost || inv.last_cost || 0;
          return { ...item, valor_unitario: bestCost, item_nome: inv.name };
        }
      }
      return item;
    });
    setBomForm({ nome: t.nome, produto_modelo: t.produto_modelo || "", items: updatedItems });
    setShowBomDialog(true);
  };
  const saveBom = async () => {
    if (!bomForm.nome.trim()) { toast.error("Nome obrigatório"); return; }
    const unlinked = bomForm.items.filter((i: any) => !i.inventory_item_id);
    if (unlinked.length > 0) { toast.error(`${unlinked.length} item(ns) sem vínculo ao estoque.`); return; }
    if (editingBom) {
      await supabase.from(tables.productionBomTemplates as any).update({ nome: bomForm.nome, produto_modelo: bomForm.produto_modelo, items: bomForm.items } as any).eq("id", editingBom.id);
    } else {
      await supabase.from(tables.productionBomTemplates as any).insert({ ...bomForm, created_by: session?.user.id } as any);
    }
    toast.success("Template BOM salvo"); setShowBomDialog(false); fetchAll();
  };
  const deleteBom = async (id: string) => { await supabase.from(tables.productionBomTemplates as any).delete().eq("id", id); toast.success("Template removido"); fetchAll(); };

  const addBomItem = () => setBomForm({ ...bomForm, items: [...bomForm.items, { item_nome: "", categoria: "outro", unidade: "un", quantidade: 1, valor_unitario: 0, fornecedor: "", item_type: "", inventory_item_id: "" }] });
  const updateBomItem = (i: number, field: string, val: any) => { const items = [...bomForm.items]; items[i][field] = val; setBomForm({ ...bomForm, items }); };
  const removeBomItem = (i: number) => setBomForm({ ...bomForm, items: bomForm.items.filter((_, idx) => idx !== i) });

  const handleBomTypeChange = (i: number, type: string) => {
    const items = [...bomForm.items];
    items[i] = { ...items[i], item_type: type, inventory_item_id: "", item_nome: "", valor_unitario: 0 };
    setBomForm({ ...bomForm, items });
  };

  const getBestCost = (inv: any) => inv.unit_cost || inv.avg_cost || inv.last_cost || 0;

  const handleBomInventorySelect = (i: number, itemId: string) => {
    const inv = inventoryItems.find((it: any) => it.id === itemId);
    if (!inv) return;
    const items = [...bomForm.items];
    items[i] = { ...items[i], inventory_item_id: inv.id, item_nome: inv.name, valor_unitario: getBestCost(inv) };
    setBomForm({ ...bomForm, items });
  };

  // Process Template CRUD
  const openNewProcess = () => { setEditingProcess(null); setProcessForm({ nome: "", produto_modelo: "", steps: [] }); setStepFiles({}); setShowProcessDialog(true); };
  const openEditProcess = async (t: any) => {
    setEditingProcess(t);
    setProcessForm({ nome: t.nome, produto_modelo: t.produto_modelo || "", steps: t.steps || [] });
    // Load existing files for this template
    const { data } = await supabase.from(tables.processTemplateFiles as any).select("*").eq("template_id", t.id).order("step_index");
    const grouped: Record<number, any[]> = {};
    ((data as any[]) || []).forEach((f: any) => {
      if (!grouped[f.step_index]) grouped[f.step_index] = [];
      grouped[f.step_index].push(f);
    });
    setStepFiles(grouped);
    setShowProcessDialog(true);
  };
  const saveProcess = async () => {
    if (!processForm.nome.trim()) { toast.error("Nome obrigatório"); return; }
    if (editingProcess) {
      await supabase.from(tables.productionProcessTemplates as any).update({ nome: processForm.nome, produto_modelo: processForm.produto_modelo, steps: processForm.steps } as any).eq("id", editingProcess.id);
    } else {
      const { data } = await supabase.from(tables.productionProcessTemplates as any).insert({ ...processForm, created_by: session?.user.id } as any).select().single();
      if (data) {
        // Upload pending files for new template
        const templateId = (data as any).id;
        for (const [stepIdx, files] of Object.entries(stepFiles)) {
          for (const f of files) {
            if (f._pendingFile) {
              await uploadStepFile(templateId, parseInt(stepIdx), f._pendingFile);
            }
          }
        }
      }
    }
    toast.success("Template processos salvo"); setShowProcessDialog(false); fetchAll();
  };
  const deleteProcess = async (id: string) => {
    // Delete files from storage
    const { data: files } = await supabase.from(tables.processTemplateFiles as any).select("file_path").eq("template_id", id);
    if (files && (files as any[]).length > 0) {
      await supabase.storage.from(storage.processTemplateFiles).remove((files as any[]).map((f: any) => f.file_path));
    }
    await supabase.from(tables.productionProcessTemplates as any).delete().eq("id", id);
    toast.success("Template removido"); fetchAll();
  };

  const addProcessStep = () => setProcessForm({ ...processForm, steps: [...processForm.steps, { etapa_nome: "", setor_responsavel: "montagem", tempo_estimado_horas: null, prazo_dias: null, status: "todo" }] });
  const updateProcessStep = (i: number, field: string, val: any) => { const steps = [...processForm.steps]; steps[i][field] = val; setProcessForm({ ...processForm, steps }); };
  const removeProcessStep = (i: number) => {
    setProcessForm({ ...processForm, steps: processForm.steps.filter((_, idx) => idx !== i) });
    // Also remove files for this step
    const newFiles = { ...stepFiles };
    delete newFiles[i];
    // Re-index files for steps after the removed one
    const reindexed: Record<number, any[]> = {};
    Object.entries(newFiles).forEach(([k, v]) => {
      const idx = parseInt(k);
      reindexed[idx > i ? idx - 1 : idx] = v;
    });
    setStepFiles(reindexed);
  };

  const uploadStepFile = async (templateId: string, stepIndex: number, file: File) => {
    const filePath = `${templateId}/${stepIndex}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from(storage.processTemplateFiles).upload(filePath, file);
    if (uploadError) { toast.error("Erro ao enviar arquivo"); return; }
    const { data: { publicUrl } } = supabase.storage.from(storage.processTemplateFiles).getPublicUrl(filePath);
    await supabase.from(tables.processTemplateFiles as any).insert({
      template_id: templateId, step_index: stepIndex, file_name: file.name,
      file_path: filePath, file_size: file.size, mime_type: file.type, uploaded_by: session?.user.id,
    } as any);
    return { file_name: file.name, file_path: filePath, mime_type: file.type, id: crypto.randomUUID() };
  };

  const handleStepFileUpload = async (stepIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (editingProcess) {
      // Upload immediately for existing template
      for (const file of Array.from(files)) {
        const result = await uploadStepFile(editingProcess.id, stepIndex, file);
        if (result) {
          setStepFiles(prev => ({ ...prev, [stepIndex]: [...(prev[stepIndex] || []), result] }));
        }
      }
      toast.success("Arquivo(s) enviado(s)");
    } else {
      // Queue for upload after template creation
      const pending = Array.from(files).map(f => ({ file_name: f.name, mime_type: f.type, _pendingFile: f, id: crypto.randomUUID() }));
      setStepFiles(prev => ({ ...prev, [stepIndex]: [...(prev[stepIndex] || []), ...pending] }));
    }
    e.target.value = "";
  };

  const deleteStepFile = async (stepIndex: number, fileRecord: any) => {
    if (fileRecord.file_path) {
      await supabase.storage.from(storage.processTemplateFiles).remove([fileRecord.file_path]);
      await supabase.from(tables.processTemplateFiles as any).delete().eq("id", fileRecord.id);
    }
    setStepFiles(prev => ({
      ...prev, [stepIndex]: (prev[stepIndex] || []).filter((f: any) => f.id !== fileRecord.id)
    }));
    toast.success("Arquivo removido");
  };

  const getFileUrl = (filePath: string) => {
    return supabase.storage.from(storage.processTemplateFiles).getPublicUrl(filePath).data.publicUrl;
  };

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
            {bomForm.items.map((item: any, i: number) => {
              const filteredInvItems = item.item_type ? inventoryItems.filter((inv: any) => inv.item_type === item.item_type) : [];
              return (
                <div key={i} className="flex flex-col gap-2 border rounded p-2">
                  <div className="flex gap-2 items-center">
                    <Select value={item.item_type || "__none__"} onValueChange={v => handleBomTypeChange(i, v === "__none__" ? "" : v)}>
                      <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Tipo...</SelectItem>
                        {Object.entries(itemTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select
                      value={item.inventory_item_id || "__none__"}
                      onValueChange={v => { if (v !== "__none__") handleBomInventorySelect(i, v); }}
                      disabled={!item.item_type || filteredInvItems.length === 0}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder={!item.item_type ? "Selecione o tipo primeiro" : filteredInvItems.length === 0 ? "Nenhum item deste tipo" : "Selecionar item..."} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Selecionar item...</SelectItem>
                        {filteredInvItems.map((inv: any) => (
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.internal_code ? `${inv.internal_code} - ` : ""}{inv.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input className="h-8 text-xs w-16" type="number" value={item.quantidade} onChange={e => updateBomItem(i, "quantidade", parseFloat(e.target.value) || 0)} placeholder="Qtd" />
                    {item.inventory_item_id && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">R$ {(Number(item.valor_unitario || 0) * Number(item.quantidade || 1)).toFixed(2)}</span>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeBomItem(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              );
            })}
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
            {processForm.steps.map((step: any, i: number) => {
              const files = stepFiles[i] || [];
              return (
                <div key={i} className="border rounded p-2 space-y-2">
                  <div className="flex gap-2 items-center">
                    <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}.</span>
                    <Input className="h-8 text-xs flex-1" value={step.etapa_nome} onChange={e => updateProcessStep(i, "etapa_nome", e.target.value)} placeholder="Nome da etapa" />
                    <Select value={step.setor_responsavel} onValueChange={v => updateProcessStep(i, "setor_responsavel", v)}>
                      <SelectTrigger className="h-8 text-xs w-[100px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(setorLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input className="h-8 text-xs w-20" type="number" value={step.prazo_dias || ""} onChange={e => updateProcessStep(i, "prazo_dias", parseInt(e.target.value) || null)} placeholder="Dias" />
                    <label className="cursor-pointer">
                      <input type="file" multiple className="hidden" onChange={e => handleStepFileUpload(i, e)} />
                      <div className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                        <Paperclip className="h-3.5 w-3.5" />
                      </div>
                    </label>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeProcessStep(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                  {files.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 ml-7">
                      {files.map((f: any) => {
                        const isImage = f.mime_type?.startsWith("image/");
                        const url = f.file_path ? getFileUrl(f.file_path) : null;
                        return (
                          <div key={f.id} className="flex items-center gap-1 bg-muted/50 border rounded px-2 py-1 text-xs group">
                            {isImage && url ? (
                              <img src={url} alt={f.file_name} className="h-5 w-5 rounded object-cover" />
                            ) : (
                              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <span className="max-w-[100px] truncate">{f.file_name}</span>
                            {url && (
                              <button onClick={() => setPreviewFile({ url, name: f.file_name, mime: f.mime_type })} className="text-muted-foreground hover:text-foreground">
                                <Eye className="h-3 w-3" />
                              </button>
                            )}
                            <button onClick={() => deleteStepFile(i, f)} className="text-muted-foreground hover:text-destructive">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProcessDialog(false)}>Cancelar</Button>
            <Button onClick={saveProcess}><Save className="h-3.5 w-3.5 mr-1" />Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-sm truncate">{previewFile?.name}</DialogTitle>
            <DialogDescription>Pré-visualização do arquivo</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[300px]">
            {previewFile?.mime?.startsWith("image/") ? (
              <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-[70vh] object-contain rounded" />
            ) : previewFile?.mime === "application/pdf" ? (
              <iframe src={previewFile.url} className="w-full h-[70vh] rounded border" />
            ) : (
              <div className="text-center space-y-3">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{previewFile?.name}</p>
                <a href={previewFile?.url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline">Baixar arquivo</Button>
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
