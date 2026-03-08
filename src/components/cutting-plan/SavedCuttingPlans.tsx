import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Save, Trash2, FileDown, Eye, RefreshCw, Play, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { exportCuttingPlanWithOptions } from "@/lib/cutting-plan-pdf";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SavedPlan {
  id: string;
  plan_type: string;
  plan_name: string;
  client_name: string;
  project_name: string;
  material_name: string;
  material_source: string;
  material_dimensions: any;
  material_unit_price: number;
  kerf_width: number;
  pieces: any[];
  result_json: any;
  utilization_percent: number;
  waste_area: number;
  units_needed: number;
  estimated_cost: number;
  created_at: string;
  execution_status: string;
}

export function SavedCuttingPlans() {
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SavedPlan | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportA4, setExportA4] = useState(true);
  const [exportRealScale, setExportRealScale] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [exportPlan, setExportPlan] = useState<SavedPlan | null>(null);
  const [singleCut, setSingleCut] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cutting_plans" as any)
      .select("*")
      .order("created_at", { ascending: false }) as any;
    setPlans(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await supabase.from("cutting_plans" as any).delete().eq("id", id);
    toast.success("Plano excluído.");
    setDeleting(null);
    fetchPlans();
  };

  const handleToggleStatus = async (plan: SavedPlan) => {
    const newStatus = plan.execution_status === "aguardando" ? "em_execucao" : "aguardando";
    setTogglingStatus(plan.id);

    await supabase.from("cutting_plans" as any).update({ execution_status: newStatus } as any).eq("id", plan.id);

    // When setting to "em_execucao", save scraps from the plan result
    if (newStatus === "em_execucao") {
      await saveScrapsFromPlan(plan);
    } else {
      // When reverting to "aguardando", remove scraps linked to this plan
      await supabase.from("cutting_scraps" as any).delete().eq("origin_plan_id", plan.id);
      toast.success("Status: Aguardando. Retalhos removidos.");
    }

    setTogglingStatus(null);
    fetchPlans();
  };

  const saveScrapsFromPlan = async (plan: SavedPlan) => {
    const result = plan.result_json;
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    const scrapsToInsert: any[] = [];

    if (plan.plan_type === "chapa" && result?.scraps?.length > 0) {
      for (const scrap of result.scraps) {
        if ((scrap.width > 0 && scrap.height > 0)) {
          scrapsToInsert.push({
            user_id: userId,
            material_name: plan.material_name,
            width: scrap.width,
            height: scrap.height,
            length: 0,
            scrap_type: "chapa",
            status: "disponível",
            notes: `Gerado do plano: ${plan.plan_name} (Chapa ${scrap.sheetIndex + 1})`,
            origin_plan_id: plan.id,
          });
        }
      }
    } else if (plan.plan_type === "tubo" && result?.bars?.length > 0) {
      for (let i = 0; i < result.bars.length; i++) {
        const bar = result.bars[i];
        if (bar.wasteLength > 0) {
          scrapsToInsert.push({
            user_id: userId,
            material_name: plan.material_name,
            width: 0,
            height: 0,
            length: bar.wasteLength,
            scrap_type: "tubo",
            status: "disponível",
            notes: `Gerado do plano: ${plan.plan_name} (Barra ${i + 1})`,
            origin_plan_id: plan.id,
          });
        }
      }
    }

    if (scrapsToInsert.length > 0) {
      // Remove existing scraps from this plan first to avoid duplicates
      await supabase.from("cutting_scraps" as any).delete().eq("origin_plan_id", plan.id);
      await supabase.from("cutting_scraps" as any).insert(scrapsToInsert as any);
      toast.success(`Em Execução! ${scrapsToInsert.length} retalho(s) salvo(s).`);
    } else {
      toast.success("Em Execução! Nenhum retalho gerado.");
    }
  };

  const openExportDialog = (plan: SavedPlan) => {
    setExportPlan(plan);
    setExportA4(true);
    setExportRealScale(false);
    setFolderName("");
    setShowExportDialog(true);
  };

  const handleExportPdf = () => {
    if (!exportPlan) return;
    if (!exportA4 && !exportRealScale) {
      toast.error("Selecione pelo menos um formato.");
      return;
    }
    if (exportRealScale && !folderName.trim()) {
      toast.error("Informe o nome da pasta para exportação 1:1.");
      return;
    }
    const plan = exportPlan;
    const dims = plan.material_dimensions;
    const dimensionsStr = plan.plan_type === "chapa"
      ? `${dims.width} x ${dims.height} mm`
      : `${dims.length} mm`;

    exportCuttingPlanWithOptions({
      planName: plan.plan_name,
      planType: plan.plan_type as "chapa" | "tubo",
      materialName: plan.material_name,
      dimensions: dimensionsStr,
      unitPrice: plan.material_unit_price,
      kerfWidth: plan.kerf_width,
      pieces: plan.pieces,
      result: plan.result_json,
      clientName: plan.client_name,
      projectName: plan.project_name,
    }, { exportA4, exportRealScale, folderName: folderName.trim(), singleCut });
    setShowExportDialog(false);
  };

  const sourceLabel = (s: string) => {
    if (s === "estoque") return "Estoque";
    if (s === "cadastro") return "Cadastro";
    return "Manual";
  };

  const statusBadge = (status: string) => {
    if (status === "em_execucao") {
      return <Badge className="bg-green-600 hover:bg-green-700 text-white gap-1"><Play className="h-3 w-3" />Em Execução</Badge>;
    }
    return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Aguardando</Badge>;
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2 text-foreground">
          <Save className="h-4 w-4 text-primary" /> Planos Salvos
        </h3>
        <Button variant="outline" size="sm" onClick={fetchPlans} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : plans.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum plano salvo ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Aproveitamento</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.plan_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {plan.plan_type === "chapa" ? "Chapa" : "Tubo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{plan.material_name}</TableCell>
                  <TableCell>
                    <span className="font-semibold text-primary">{Number(plan.utilization_percent).toFixed(1)}%</span>
                  </TableCell>
                  <TableCell>R$ {Number(plan.estimated_cost).toFixed(2)}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleToggleStatus(plan)}
                      disabled={togglingStatus === plan.id}
                      className="cursor-pointer disabled:opacity-50"
                    >
                      {statusBadge(plan.execution_status || "aguardando")}
                    </button>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(plan.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedPlan(plan)} title="Ver detalhes">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openExportDialog(plan)} title="Exportar PDF">
                        <FileDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(plan.id)}
                        disabled={deleting === plan.id}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPlan?.plan_name}</DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground">Tipo</p>
                  <p className="font-medium">{selectedPlan.plan_type === "chapa" ? "Corte de Chapa" : "Corte de Tubos"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Origem</p>
                  <p className="font-medium">{sourceLabel(selectedPlan.material_source)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Material</p>
                  <p className="font-medium">{selectedPlan.material_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Dimensões</p>
                  <p className="font-medium">
                    {selectedPlan.plan_type === "chapa"
                      ? `${selectedPlan.material_dimensions.width} x ${selectedPlan.material_dimensions.height} mm`
                      : `${selectedPlan.material_dimensions.length} mm`}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor unitário</p>
                  <p className="font-medium">R$ {Number(selectedPlan.material_unit_price).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Largura da serra</p>
                  <p className="font-medium">{selectedPlan.kerf_width} mm</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <div className="mt-1">{statusBadge(selectedPlan.execution_status || "aguardando")}</div>
                </div>
              </div>

              {selectedPlan.client_name && (
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedPlan.client_name}</p>
                </div>
              )}
              {selectedPlan.project_name && (
                <div>
                  <p className="text-muted-foreground">Projeto</p>
                  <p className="font-medium">{selectedPlan.project_name}</p>
                </div>
              )}

              <div>
                <p className="text-muted-foreground mb-1">Peças</p>
                <div className="space-y-1">
                  {selectedPlan.pieces.map((p: any, i: number) => (
                    <p key={i} className="text-xs bg-muted/50 rounded px-2 py-1">
                      Peça {i + 1}: {selectedPlan.plan_type === "chapa" ? `${p.width} x ${p.height} mm` : `${p.length} mm`} — Qtd: {p.quantity}
                    </p>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <div>
                  <p className="text-muted-foreground">{selectedPlan.plan_type === "chapa" ? "Chapas" : "Barras"}</p>
                  <p className="text-lg font-bold text-primary">{selectedPlan.units_needed}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Aproveitamento</p>
                  <p className="text-lg font-bold text-primary">{Number(selectedPlan.utilization_percent).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Custo estimado</p>
                  <p className="text-lg font-bold">R$ {Number(selectedPlan.estimated_cost).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data</p>
                  <p className="font-medium">{new Date(selectedPlan.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" variant="outline" onClick={() => openExportDialog(selectedPlan)}>
                  <FileDown className="h-4 w-4 mr-1" /> Exportar PDF
                </Button>
                <Button
                  className="flex-1"
                  variant={selectedPlan.execution_status === "em_execucao" ? "secondary" : "default"}
                  onClick={() => { handleToggleStatus(selectedPlan); setSelectedPlan(null); }}
                >
                  {selectedPlan.execution_status === "em_execucao" ? (
                    <><Clock className="h-4 w-4 mr-1" /> Voltar p/ Aguardando</>
                  ) : (
                    <><Play className="h-4 w-4 mr-1" /> Iniciar Execução</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Exportar PDF</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Selecione os formatos de exportação:</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-md border border-border hover:bg-muted/50 cursor-pointer" onClick={() => setExportA4(!exportA4)}>
                <Checkbox checked={exportA4} onCheckedChange={(v) => setExportA4(!!v)} id="saved-a4" className="mt-0.5" />
                <div>
                  <Label htmlFor="saved-a4" className="cursor-pointer font-medium">Formato A4</Label>
                  <p className="text-xs text-muted-foreground">Reduzido para caber em uma folha A4</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-md border border-border hover:bg-muted/50 cursor-pointer" onClick={() => setExportRealScale(!exportRealScale)}>
                <Checkbox checked={exportRealScale} onCheckedChange={(v) => setExportRealScale(!!v)} id="saved-real" className="mt-0.5" />
                <div>
                  <Label htmlFor="saved-real" className="cursor-pointer font-medium">Escala 1:1</Label>
                  <p className="text-xs text-muted-foreground">Tamanho real — cada chapa em arquivo separado</p>
                </div>
              </div>
              {exportRealScale && (
                <div className="pl-8 space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="saved-folder-name" className="text-sm">Nome da pasta</Label>
                    <Input id="saved-folder-name" placeholder="Ex: corte-cliente-abc" value={folderName} onChange={(e) => setFolderName(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Arquivos: pasta/chapa-1.pdf, chapa-2.pdf…</p>
                  </div>
                  {exportPlan?.plan_type === "chapa" && (
                    <div className="flex items-start gap-3 p-3 rounded-md border border-border hover:bg-muted/50 cursor-pointer" onClick={() => setSingleCut(!singleCut)}>
                      <Checkbox checked={singleCut} onCheckedChange={(v) => setSingleCut(!!v)} id="saved-single-cut" className="mt-0.5" />
                      <div>
                        <Label htmlFor="saved-single-cut" className="cursor-pointer font-medium">Corte Único</Label>
                        <p className="text-xs text-muted-foreground">Compartilha um único corte entre peças adjacentes, reduzindo percurso da máquina</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>Cancelar</Button>
            <Button onClick={handleExportPdf} disabled={!exportA4 && !exportRealScale}>
              <FileDown className="h-4 w-4 mr-1" /> Exportar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
