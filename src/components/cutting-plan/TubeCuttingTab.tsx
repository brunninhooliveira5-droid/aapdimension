import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package, Layers, Plus, Trash2, Calculator, Save, FileDown, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { calculateTubeCutting, getPieceColor, type TubePiece, type TubeCuttingResult } from "@/lib/cutting-plan-engine";
import { exportCuttingPlanPdf } from "@/lib/cutting-plan-pdf";

interface PieceRow {
  id: string;
  length: string;
  quantity: string;
}

export function TubeCuttingTab() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [source, setSource] = useState<string>("manual");
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [catalogMaterials, setCatalogMaterials] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [materialLength, setMaterialLength] = useState("");
  const [materialPrice, setMaterialPrice] = useState("");
  const [availableQty, setAvailableQty] = useState<number | null>(null);
  const [kerfWidth, setKerfWidth] = useState("3");

  const [pieces, setPieces] = useState<PieceRow[]>([
    { id: "1", length: "", quantity: "1" },
  ]);

  const [result, setResult] = useState<TubeCuttingResult | null>(null);

  const [showSave, setShowSave] = useState(false);
  const [planName, setPlanName] = useState("");
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (source === "estoque") {
      supabase
        .from("inventory_items")
        .select("id, name, current_quantity, unit_cost, avg_cost, last_cost, internal_code")
        .eq("is_active", true)
        .order("name")
        .then(({ data }) => setInventoryItems(data || []));
    }
  }, [source]);

  useEffect(() => {
    if (source === "cadastro") {
      supabase
        .from("cutting_plan_materials" as any)
        .select("*")
        .eq("is_active", true)
        .in("category", ["tubo", "perfil"])
        .order("name")
        .then(({ data }: any) => setCatalogMaterials(data || []));
    }
  }, [source]);

  const handleInventorySelect = (id: string) => {
    setSelectedItemId(id);
    const item = inventoryItems.find((i) => i.id === id);
    if (item) {
      setMaterialName(item.name);
      setMaterialPrice(String(item.unit_cost || item.avg_cost || item.last_cost || 0));
      setAvailableQty(item.current_quantity);
      setMaterialLength("");
    }
  };

  const handleCatalogSelect = (id: string) => {
    setSelectedItemId(id);
    const mat = catalogMaterials.find((m: any) => m.id === id);
    if (mat) {
      setMaterialName(mat.name);
      setMaterialLength(String(mat.length));
      setMaterialPrice(String(mat.unit_price));
      setAvailableQty(null);
    }
  };

  const handleSourceChange = (val: string) => {
    setSource(val);
    setSelectedItemId("");
    setMaterialName("");
    setMaterialLength("");
    setMaterialPrice("");
    setAvailableQty(null);
  };

  const addPiece = () => {
    setPieces((prev) => [...prev, { id: String(Date.now()), length: "", quantity: "1" }]);
  };

  const removePiece = (id: string) => {
    if (pieces.length <= 1) return;
    setPieces((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePiece = (id: string, field: keyof PieceRow, value: string) => {
    setPieces((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleCalculate = () => {
    setResult(null);
    const barLen = parseFloat(materialLength);
    const price = parseFloat(materialPrice) || 0;
    const kerf = parseFloat(kerfWidth) || 0;

    if (!materialName.trim()) {
      toast.error("Selecione ou informe o material.");
      return;
    }
    if (!barLen || barLen <= 0) {
      toast.error("Informe o comprimento do material.");
      return;
    }
    if (kerf < 0) {
      toast.error("A largura da serra deve ser >= 0.");
      return;
    }

    const parsedPieces: TubePiece[] = [];
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      const len = parseFloat(p.length);
      const q = parseInt(p.quantity);
      if (!len || len <= 0) {
        toast.error(`Peça ${i + 1}: informe um comprimento válido.`);
        return;
      }
      if (!q || q <= 0) {
        toast.error(`Peça ${i + 1}: informe uma quantidade válida.`);
        return;
      }
      parsedPieces.push({ id: p.id, length: len, quantity: q });
    }

    const res = calculateTubeCutting(barLen, price, parsedPieces, kerf);
    setResult(res);

    if (res.errors.length > 0) {
      toast.error("Existem peças inválidas. Verifique os erros.");
    } else {
      toast.success(`Plano calculado: ${res.totalBars} barra(s), ${res.totalUtilization.toFixed(1)}% de aproveitamento.`);
    }
  };

  const handleSave = async () => {
    if (!result || result.errors.length > 0 || !planName.trim() || !userId) return;
    setSaving(true);
    try {
      const barLen = parseFloat(materialLength);
      await supabase.from("cutting_plans" as any).insert({
        user_id: userId,
        plan_type: "tubo",
        plan_name: planName.trim(),
        client_name: clientName.trim(),
        project_name: projectName.trim(),
        material_name: materialName,
        material_source: source,
        material_dimensions: { length: barLen },
        material_unit_price: parseFloat(materialPrice) || 0,
        kerf_width: parseFloat(kerfWidth) || 0,
        pieces: pieces.map((p) => ({ length: parseFloat(p.length), quantity: parseInt(p.quantity) })),
        result_json: result,
        utilization_percent: result.totalUtilization,
        waste_area: result.totalWaste,
        units_needed: result.totalBars,
        estimated_cost: result.estimatedCost,
      } as any);
      toast.success("Plano salvo com sucesso!");
      setShowSave(false);
      setPlanName("");
      setClientName("");
      setProjectName("");
    } catch {
      toast.error("Erro ao salvar plano.");
    }
    setSaving(false);
  };

  const handleExportPdf = () => {
    if (!result || result.errors.length > 0) return;
    const barLen = parseFloat(materialLength);
    exportCuttingPlanPdf({
      planName: planName || "Plano de Corte - Tubo",
      planType: "tubo",
      materialName,
      dimensions: `${barLen} mm (comprimento)`,
      unitPrice: parseFloat(materialPrice) || 0,
      kerfWidth: parseFloat(kerfWidth) || 0,
      pieces: pieces.map((p) => ({ length: parseFloat(p.length), quantity: parseInt(p.quantity) })),
      result,
      clientName,
      projectName,
    });
  };

  const barLen = parseFloat(materialLength) || 0;

  return (
    <div className="space-y-4">
      {/* Material */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold flex items-center gap-2 text-foreground">
          <Package className="h-4 w-4 text-primary" /> Material
        </h3>

        <RadioGroup value={source} onValueChange={handleSourceChange} className="flex gap-6">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="estoque" id="tube-src-est" />
            <Label htmlFor="tube-src-est" className="cursor-pointer">Estoque</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="cadastro" id="tube-src-cad" />
            <Label htmlFor="tube-src-cad" className="cursor-pointer">Cadastro</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="manual" id="tube-src-man" />
            <Label htmlFor="tube-src-man" className="cursor-pointer">Manual</Label>
          </div>
        </RadioGroup>

        {source === "estoque" && (
          <Select value={selectedItemId} onValueChange={handleInventorySelect}>
            <SelectTrigger><SelectValue placeholder="Selecione do estoque..." /></SelectTrigger>
            <SelectContent>
              {inventoryItems.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.internal_code ? `[${item.internal_code}] ` : ""}{item.name} — Qtd: {item.current_quantity} — R$ {(item.unit_cost || item.avg_cost || item.last_cost || 0).toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {source === "cadastro" && (
          <Select value={selectedItemId} onValueChange={handleCatalogSelect}>
            <SelectTrigger><SelectValue placeholder="Selecione do cadastro..." /></SelectTrigger>
            <SelectContent>
              {catalogMaterials.map((mat: any) => (
                <SelectItem key={mat.id} value={mat.id}>
                  {mat.name} — {mat.length} mm — R$ {Number(mat.unit_price).toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Nome do material</Label>
            <Input value={materialName} onChange={(e) => setMaterialName(e.target.value)} readOnly={source !== "manual"} placeholder="Ex: Tubo 50x50" />
          </div>
          <div>
            <Label className="text-xs">Comprimento (mm)</Label>
            <Input type="number" value={materialLength} onChange={(e) => setMaterialLength(e.target.value)} placeholder="6000" />
          </div>
          <div>
            <Label className="text-xs">Valor unitário (R$)</Label>
            <Input type="number" value={materialPrice} onChange={(e) => setMaterialPrice(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <Label className="text-xs">Largura da serra (mm)</Label>
            <Input type="number" value={kerfWidth} onChange={(e) => setKerfWidth(e.target.value)} placeholder="3" />
          </div>
        </div>

        {availableQty !== null && (
          <p className="text-xs text-muted-foreground">Quantidade disponível no estoque: <span className="font-semibold text-foreground">{availableQty}</span></p>
        )}
      </Card>

      {/* Pieces */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2 text-foreground">
            <Layers className="h-4 w-4 text-primary" /> Peças
          </h3>
          <Button variant="outline" size="sm" onClick={addPiece}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">#</TableHead>
                <TableHead>Comprimento (mm)</TableHead>
                <TableHead className="w-24">Qtd</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pieces.map((piece, index) => {
                const isInvalid = result?.invalidPieceIds.includes(piece.id);
                return (
                  <TableRow key={piece.id} className={isInvalid ? "bg-destructive/10" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: getPieceColor(index) }} />
                        <span className="text-sm font-medium">Peça {index + 1}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number" value={piece.length}
                        onChange={(e) => updatePiece(piece.id, "length", e.target.value)}
                        className={`h-8 ${isInvalid ? "border-destructive" : ""}`}
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number" value={piece.quantity}
                        onChange={(e) => updatePiece(piece.id, "quantity", e.target.value)}
                        className="h-8 w-20" min="1" placeholder="1"
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removePiece(piece.id)} disabled={pieces.length <= 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <Button onClick={handleCalculate} className="w-full sm:w-auto">
          <Calculator className="h-4 w-4 mr-2" /> Calcular Plano de Corte
        </Button>
      </Card>

      {/* Errors */}
      {result && result.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc pl-4 space-y-1">
              {result.errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {result && result.errors.length === 0 && (
        <Card className="p-4 space-y-6">
          <h3 className="font-semibold text-foreground">Resultado</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-2xl font-bold text-primary">{result.totalBars}</p>
              <p className="text-xs text-muted-foreground">Barra(s) necessária(s)</p>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-2xl font-bold text-primary">{result.totalUtilization.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Aproveitamento</p>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{result.totalWaste.toFixed(1)} mm</p>
              <p className="text-xs text-muted-foreground">Sobra total</p>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-2xl font-bold text-foreground">R$ {result.estimatedCost.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Custo estimado</p>
            </div>
          </div>

          {/* Bar visualizations */}
          <div className="space-y-3">
            {result.bars.map((bar, i) => (
              <div key={i} className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Barra {i + 1} — {bar.segments.length} peça(s) — Aproveitamento: {bar.utilization.toFixed(1)}% — Sobra: {bar.wasteLength.toFixed(1)} mm
                </p>
                <div className="relative h-10 border-2 border-border rounded bg-muted/20 overflow-hidden">
                  {bar.segments.map((seg, j) => (
                    <div
                      key={j}
                      className="absolute h-full flex items-center justify-center text-[10px] font-bold text-white border-r border-white/30"
                      title={`Peça ${seg.pieceIndex + 1}: ${seg.length} mm`}
                      style={{
                        left: `${(seg.position / barLen) * 100}%`,
                        width: `${(seg.length / barLen) * 100}%`,
                        backgroundColor: getPieceColor(seg.pieceIndex),
                      }}
                    >
                      P{seg.pieceIndex + 1}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3">
            {pieces.map((_, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getPieceColor(i) }} />
                Peça {i + 1}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowSave(true)}>
              <Save className="h-4 w-4 mr-1" /> Salvar Plano
            </Button>
            <Button variant="outline" onClick={handleExportPdf}>
              <FileDown className="h-4 w-4 mr-1" /> Exportar PDF
            </Button>
          </div>
        </Card>
      )}

      {/* Save Dialog */}
      <Dialog open={showSave} onOpenChange={setShowSave}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar Plano de Corte</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome do plano *</Label>
              <Input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Ex: Corte tubos projeto ABC" />
            </div>
            <div>
              <Label>Cliente (opcional)</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div>
              <Label>Projeto (opcional)</Label>
              <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Nome do projeto" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowSave(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!planName.trim() || saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
