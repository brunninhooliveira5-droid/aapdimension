import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Save, Trash2, FileDown, Eye, RefreshCw } from "lucide-react";
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
}

export function SavedCuttingPlans() {
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SavedPlan | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportScale, setExportScale] = useState<PdfScale>("a4");
  const [exportPlan, setExportPlan] = useState<SavedPlan | null>(null);

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

  const openExportDialog = (plan: SavedPlan) => {
    setExportPlan(plan);
    setExportScale("a4");
    setShowExportDialog(true);
  };

  const handleExportPdf = () => {
    if (!exportPlan) return;
    const plan = exportPlan;
    const dims = plan.material_dimensions;
    const dimensionsStr = plan.plan_type === "chapa"
      ? `${dims.width} x ${dims.height} mm`
      : `${dims.length} mm`;

    exportCuttingPlanPdf({
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
      scale: exportScale,
    });
    setShowExportDialog(false);
  };

  const sourceLabel = (s: string) => {
    if (s === "estoque") return "Estoque";
    if (s === "cadastro") return "Cadastro";
    return "Manual";
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

              <Button className="w-full" variant="outline" onClick={() => openExportDialog(selectedPlan)}>
                <FileDown className="h-4 w-4 mr-1" /> Exportar PDF
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Export Scale Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Exportar PDF</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Selecione o formato de exportação:</p>
            <RadioGroup value={exportScale} onValueChange={(v) => setExportScale(v as PdfScale)} className="space-y-2">
              <div className="flex items-start gap-3 p-3 rounded-md border border-border hover:bg-muted/50 cursor-pointer" onClick={() => setExportScale("a4")}>
                <RadioGroupItem value="a4" id="saved-scale-a4" className="mt-0.5" />
                <div>
                  <Label htmlFor="saved-scale-a4" className="cursor-pointer font-medium">Formato A4</Label>
                  <p className="text-xs text-muted-foreground">Reduzido para caber em uma folha A4</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-md border border-border hover:bg-muted/50 cursor-pointer" onClick={() => setExportScale("1:1")}>
                <RadioGroupItem value="1:1" id="saved-scale-real" className="mt-0.5" />
                <div>
                  <Label htmlFor="saved-scale-real" className="cursor-pointer font-medium">Escala 1:1</Label>
                  <p className="text-xs text-muted-foreground">Tamanho real do material (página personalizada)</p>
                </div>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>Cancelar</Button>
            <Button onClick={handleExportPdf}>
              <FileDown className="h-4 w-4 mr-1" /> Exportar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
