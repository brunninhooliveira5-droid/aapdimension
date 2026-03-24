import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Calculator, Save, FileDown, AlertTriangle, Scissors, Zap, Clock, PackagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { calculateTubeCutting, getPieceColor, type TubePiece, type TubeCuttingResult, type CalculationSpeed } from "@/lib/cutting-plan-engine";
import { exportMultiMaterialTubePdf } from "@/lib/cutting-plan-pdf";
import { InteractiveTubeLayout } from "./InteractiveTubeLayout";
import { TubeMaterialBlock, type TubeMaterialGroupData } from "./TubeMaterialBlock";
import { usePdfSettings } from "./CuttingPlanPdfSettingsTab";

interface MaterialResult {
  group: TubeMaterialGroupData;
  result: TubeCuttingResult;
}

function createEmptyGroup(): TubeMaterialGroupData {
  return {
    id: String(Date.now()),
    source: "manual",
    selectedItemId: "",
    materialName: "",
    materialLength: "",
    materialPrice: "",
    availableQty: null,
    reserveStock: false,
    pieces: [{ id: String(Date.now() + 1), length: "", quantity: "1" }],
  };
}

export function TubeCuttingTab() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [pdfSettings] = usePdfSettings();

  const [groups, setGroups] = useState<TubeMaterialGroupData[]>([createEmptyGroup()]);
  const [kerfWidth, setKerfWidth] = useState("3");
  const [safetyMargin, setSafetyMargin] = useState("0");
  const [minScrapSize, setMinScrapSize] = useState("150");
  const [calcSpeed, setCalcSpeed] = useState<CalculationSpeed>("fast");

  const [results, setResults] = useState<MaterialResult[]>([]);

  const [showSave, setShowSave] = useState(false);
  const [planName, setPlanName] = useState("");
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportA4, setExportA4] = useState(true);
  const [exportRealScale, setExportRealScale] = useState(false);
  const [folderName, setFolderName] = useState("");

  const updateGroup = (id: string, data: TubeMaterialGroupData) => {
    setGroups(prev => prev.map(g => g.id === id ? data : g));
  };

  const removeGroup = (id: string) => {
    if (groups.length <= 1) return;
    setGroups(prev => prev.filter(g => g.id !== id));
    setResults(prev => prev.filter(r => r.group.id !== id));
  };

  const addGroup = () => {
    setGroups(prev => [...prev, createEmptyGroup()]);
  };

  const handleCalculate = () => {
    setResults([]);
    const kerf = parseFloat(kerfWidth) || 0;
    const margin = parseFloat(safetyMargin) || 0;
    const minScrap = parseFloat(minScrapSize) || 150;

    if (kerf < 0) { toast.error("A largura da serra deve ser >= 0."); return; }

    const newResults: MaterialResult[] = [];
    let hasErrors = false;

    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi];
      const barLen = parseFloat(g.materialLength);

      if (!g.materialName.trim()) { toast.error(`Material ${gi + 1}: informe o nome do material.`); return; }
      if (!barLen || barLen <= 0) { toast.error(`Material ${gi + 1} (${g.materialName}): informe o comprimento.`); return; }

      const parsedPieces: TubePiece[] = [];
      for (let i = 0; i < g.pieces.length; i++) {
        const p = g.pieces[i];
        const len = parseFloat(p.length);
        const q = parseInt(p.quantity);
        if (!len || len <= 0) { toast.error(`Material ${gi + 1}, Peça ${i + 1}: comprimento inválido.`); return; }
        if (!q || q <= 0) { toast.error(`Material ${gi + 1}, Peça ${i + 1}: quantidade inválida.`); return; }
        parsedPieces.push({ id: p.id, length: len, quantity: q });
      }

      const res = calculateTubeCutting(barLen, parseFloat(g.materialPrice) || 0, parsedPieces, kerf, {
        safetyMargin: margin,
        minScrapSize: minScrap,
        speed: calcSpeed,
      });

      if (res.errors.length > 0) hasErrors = true;
      newResults.push({ group: g, result: res });
    }

    setResults(newResults);

    if (hasErrors) {
      toast.error("Existem peças inválidas em um ou mais materiais.");
    } else {
      const totalBars = newResults.reduce((s, r) => s + r.result.totalBars, 0);
      const totalCost = newResults.reduce((s, r) => s + r.result.estimatedCost, 0);
      toast.success(`Plano calculado: ${newResults.length} material(is), ${totalBars} barra(s) total, R$ ${totalCost.toFixed(2)}.`);
    }
  };

  const handleSave = async () => {
    if (results.length === 0 || !planName.trim() || !userId) return;
    if (results.some(r => r.result.errors.length > 0)) return;
    setSaving(true);
    try {
      for (const mr of results) {
        const g = mr.group;
        const r = mr.result;
        const barLen = parseFloat(g.materialLength);

        const { data: planData } = await supabase.from("cutting_plans" as any).insert({
          user_id: userId, plan_type: "tubo",
          plan_name: results.length > 1 ? `${planName.trim()} — ${g.materialName}` : planName.trim(),
          client_name: clientName.trim(), project_name: projectName.trim(),
          material_name: g.materialName, material_source: g.source,
          material_dimensions: { length: barLen },
          material_unit_price: parseFloat(g.materialPrice) || 0,
          kerf_width: parseFloat(kerfWidth) || 0,
          pieces: g.pieces.map((p) => ({ length: parseFloat(p.length), quantity: parseInt(p.quantity) })),
          result_json: r, utilization_percent: r.totalUtilization,
          waste_area: r.totalWaste, units_needed: r.totalBars, estimated_cost: r.estimatedCost,
        } as any).select("id").single() as any;

        if (r.scraps.length > 0 && planData?.id) {
          const scrapRows = r.scraps.map(s => ({ user_id: userId, material_name: g.materialName, width: 0, height: 0, length: s.length, scrap_type: "tubo", origin_plan_id: planData.id, status: "disponível" }));
          await supabase.from("cutting_scraps" as any).insert(scrapRows as any);
        }

        if (g.reserveStock && g.source === "estoque" && g.selectedItemId) {
          await supabase.from("inventory_reservations").insert({ item_id: g.selectedItemId, quantity: r.totalBars, reserved_by: userId, linked_order: planName.trim(), linked_machine: "", notes: `Reserva - Plano: ${planName}`, status: "reservado" });
        }

        if (g.source === "retalho" && g.selectedItemId) {
          await supabase.from("cutting_scraps" as any).update({ status: "usado" } as any).eq("id", g.selectedItemId);
        }
      }

      toast.success("Plano(s) salvo(s)!");
      setShowSave(false); setPlanName(""); setClientName(""); setProjectName("");
    } catch { toast.error("Erro ao salvar."); }
    setSaving(false);
  };

  const handleExportPdf = () => {
    if (results.length === 0 || results.some(r => r.result.errors.length > 0)) return;
    if (!exportA4 && !exportRealScale) { toast.error("Selecione pelo menos um formato."); return; }

    exportMultiMaterialTubePdf({
      planName: planName || "Plano de Corte - Tubos",
      materials: results.map(mr => ({
        materialName: mr.group.materialName,
        dimensions: `${parseFloat(mr.group.materialLength)} mm`,
        unitPrice: parseFloat(mr.group.materialPrice) || 0,
        pieces: mr.group.pieces.map(p => ({ length: parseFloat(p.length), quantity: parseInt(p.quantity) })),
        result: mr.result,
        barLength: parseFloat(mr.group.materialLength) || 6000,
      })),
      kerfWidth: parseFloat(kerfWidth) || 0,
      clientName,
      projectName,
      pdfSettings,
    }, { exportA4, exportRealScale, folderName: folderName.trim() });
    setShowExportDialog(false);
  };

  const totalBars = results.reduce((s, r) => s + r.result.totalBars, 0);
  const totalCost = results.reduce((s, r) => s + r.result.estimatedCost, 0);
  const allValid = results.length > 0 && results.every(r => r.result.errors.length === 0);

  return (
    <div className="space-y-4">
      {/* Shared settings */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-foreground text-sm">Configurações gerais</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><Label className="text-xs">Largura da serra (mm)</Label><Input type="number" value={kerfWidth} onChange={(e) => setKerfWidth(e.target.value)} placeholder="3" /></div>
          <div><Label className="text-xs">Margem segurança (mm)</Label><Input type="number" value={safetyMargin} onChange={(e) => setSafetyMargin(e.target.value)} placeholder="0" /></div>
          <div><Label className="text-xs">Retalho mínimo (mm)</Label><Input type="number" value={minScrapSize} onChange={(e) => setMinScrapSize(e.target.value)} placeholder="150" /></div>
          <div>
            <Label className="text-xs">Velocidade do cálculo</Label>
            <div className="flex gap-1 mt-1">
              <Button variant={calcSpeed === "fast" ? "default" : "outline"} size="sm" className="flex-1 gap-1" onClick={() => setCalcSpeed("fast")}>
                <Zap className="h-3.5 w-3.5" /> Rápido
              </Button>
              <Button variant={calcSpeed === "thorough" ? "default" : "outline"} size="sm" className="flex-1 gap-1" onClick={() => setCalcSpeed("thorough")}>
                <Clock className="h-3.5 w-3.5" /> Otimizado
              </Button>
            </div>
          </div>
        </div>
        {calcSpeed === "thorough" && (
          <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            ⏳ O modo <strong>Otimizado</strong> testa múltiplas estratégias de arranjo para minimizar barras e desperdício.
          </p>
        )}
      </Card>

      {/* Material groups */}
      {groups.map((g, i) => (
        <TubeMaterialBlock
          key={g.id}
          group={g}
          index={i}
          total={groups.length}
          onChange={(data) => updateGroup(g.id, data)}
          onRemove={() => removeGroup(g.id)}
          invalidPieceIds={results.find(r => r.group.id === g.id)?.result.invalidPieceIds}
        />
      ))}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={addGroup} className="gap-1.5">
          <PackagePlus className="h-4 w-4" /> Adicionar Material
        </Button>
        <Button onClick={handleCalculate} className="gap-1.5">
          <Calculator className="h-4 w-4" /> Calcular Plano de Corte
        </Button>
      </div>

      {/* Errors */}
      {results.map((mr, ri) => mr.result.errors.length > 0 && (
        <Alert key={ri} variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold">{mr.group.materialName}:</p>
            <ul className="list-disc pl-4 space-y-1">{mr.result.errors.map((err, i) => <li key={i}>{err}</li>)}</ul>
          </AlertDescription>
        </Alert>
      ))}

      {/* Results */}
      {allValid && (
        <Card className="p-4 space-y-6">
          {results.length > 1 && (
            <>
              <h3 className="font-semibold text-foreground">Resumo Geral</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg border border-border p-3 text-center"><p className="text-2xl font-bold text-primary">{results.length}</p><p className="text-xs text-muted-foreground">Material(is)</p></div>
                <div className="rounded-lg border border-border p-3 text-center"><p className="text-2xl font-bold text-primary">{totalBars}</p><p className="text-xs text-muted-foreground">Barra(s) total</p></div>
                <div className="rounded-lg border border-border p-3 text-center"><p className="text-2xl font-bold text-foreground">R$ {totalCost.toFixed(2)}</p><p className="text-xs text-muted-foreground">Custo total</p></div>
                {results.reduce((s, r) => s + r.result.scraps.length, 0) > 0 && (
                  <div className="rounded-lg border border-border p-3 text-center"><p className="text-2xl font-bold text-accent-foreground">{results.reduce((s, r) => s + r.result.scraps.length, 0)}</p><p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Scissors className="h-3 w-3" /> Retalho(s)</p></div>
                )}
              </div>
            </>
          )}

          {results.map((mr, ri) => {
            const r = mr.result;
            const barLen = parseFloat(mr.group.materialLength) || 6000;
            return (
              <div key={ri} className="space-y-4">
                {results.length > 1 && (
                  <h4 className="font-semibold text-foreground border-b border-border pb-2">
                    {mr.group.materialName}
                  </h4>
                )}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="rounded-lg border border-border p-3 text-center"><p className="text-2xl font-bold text-primary">{r.totalBars}</p><p className="text-xs text-muted-foreground">Barra(s)</p></div>
                  <div className="rounded-lg border border-border p-3 text-center"><p className="text-2xl font-bold text-primary">{r.totalUtilization.toFixed(1)}%</p><p className="text-xs text-muted-foreground">Aproveitamento</p></div>
                  <div className="rounded-lg border border-border p-3 text-center"><p className="text-2xl font-bold text-foreground">{r.totalWaste.toFixed(1)} mm</p><p className="text-xs text-muted-foreground">Sobra total</p></div>
                  <div className="rounded-lg border border-border p-3 text-center"><p className="text-2xl font-bold text-foreground">R$ {r.estimatedCost.toFixed(2)}</p><p className="text-xs text-muted-foreground">Custo estimado</p></div>
                  {r.scraps.length > 0 && (
                    <div className="rounded-lg border border-border p-3 text-center"><p className="text-2xl font-bold text-accent-foreground">{r.scraps.length}</p><p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Scissors className="h-3 w-3" /> Retalho(s)</p></div>
                  )}
                </div>

                <InteractiveTubeLayout
                  result={r}
                  barLength={barLen}
                  kerfWidth={parseFloat(kerfWidth) || 0}
                  onResultChange={(newResult) => {
                    setResults(prev => prev.map((pr, pi) => pi === ri ? { ...pr, result: newResult } : pr));
                  }}
                />

                <div className="flex flex-wrap gap-3">
                  {mr.group.pieces.map((_, i) => (<div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getPieceColor(i) }} />Peça {i + 1}</div>))}
                </div>
              </div>
            );
          })}

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowSave(true)}><Save className="h-4 w-4 mr-1" /> Salvar Plano</Button>
            <Button variant="outline" onClick={() => setShowExportDialog(true)}><FileDown className="h-4 w-4 mr-1" /> Exportar PDF</Button>
          </div>
        </Card>
      )}

      <Dialog open={showSave} onOpenChange={setShowSave}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Salvar Plano de Corte</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome do plano *</Label><Input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Ex: Corte Projeto Y" /></div>
            <div><Label>Cliente (opcional)</Label><Input value={clientName} onChange={(e) => setClientName(e.target.value)} /></div>
            <div><Label>Projeto (opcional)</Label><Input value={projectName} onChange={(e) => setProjectName(e.target.value)} /></div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowSave(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !planName.trim()}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Exportar PDF</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Selecione os formatos de exportação:</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-md border border-border hover:bg-muted/50 cursor-pointer" onClick={() => setExportA4(!exportA4)}>
                <Checkbox checked={exportA4} onCheckedChange={(v) => setExportA4(!!v)} id="tube-a4" className="mt-0.5" />
                <div>
                  <Label htmlFor="tube-a4" className="cursor-pointer font-medium">Formato A4</Label>
                  <p className="text-xs text-muted-foreground">Reduzido para caber em uma folha A4</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-md border border-border hover:bg-muted/50 cursor-pointer" onClick={() => setExportRealScale(!exportRealScale)}>
                <Checkbox checked={exportRealScale} onCheckedChange={(v) => setExportRealScale(!!v)} id="tube-real" className="mt-0.5" />
                <div>
                  <Label htmlFor="tube-real" className="cursor-pointer font-medium">Escala 1:1</Label>
                  <p className="text-xs text-muted-foreground">Tamanho real</p>
                </div>
              </div>
              {exportRealScale && (
                <div className="pl-8 space-y-1">
                  <Label className="text-sm">Nome da pasta</Label>
                  <Input placeholder="Ex: corte-tubo-abc" value={folderName} onChange={(e) => setFolderName(e.target.value)} />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>Cancelar</Button>
            <Button onClick={handleExportPdf} disabled={!exportA4 && !exportRealScale}><FileDown className="h-4 w-4 mr-1" /> Exportar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
