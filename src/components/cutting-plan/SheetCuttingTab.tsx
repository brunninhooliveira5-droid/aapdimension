import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Package, Layers, Plus, Trash2, Calculator, Save, FileDown, AlertTriangle, RotateCw, Copy, Upload, XCircle, Scissors } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { calculateSheetCutting, getPieceColor, type SheetPiece, type SheetCuttingResult, type OptimizationMode } from "@/lib/cutting-plan-engine";
import { exportCuttingPlanPdf } from "@/lib/cutting-plan-pdf";

interface PieceRow {
  id: string;
  width: string;
  height: string;
  quantity: string;
  allowRotation: boolean;
}

export function SheetCuttingTab() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Material
  const [source, setSource] = useState<string>("manual");
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [catalogMaterials, setCatalogMaterials] = useState<any[]>([]);
  const [scraps, setScraps] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [materialWidth, setMaterialWidth] = useState("");
  const [materialHeight, setMaterialHeight] = useState("");
  const [materialPrice, setMaterialPrice] = useState("");
  const [availableQty, setAvailableQty] = useState<number | null>(null);
  const [kerfWidth, setKerfWidth] = useState("3");
  const [safetyMargin, setSafetyMargin] = useState("0");
  const [reserveStock, setReserveStock] = useState(false);

  // Optimization
  const [allowRotation, setAllowRotation] = useState(true);
  const [optimizationMode, setOptimizationMode] = useState<OptimizationMode>("best_utilization");
  const [minScrapSize, setMinScrapSize] = useState("150");

  // Pieces
  const [pieces, setPieces] = useState<PieceRow[]>([
    { id: "1", width: "", height: "", quantity: "1", allowRotation: true },
  ]);

  // Result
  const [result, setResult] = useState<SheetCuttingResult | null>(null);

  // Save
  const [showSave, setShowSave] = useState(false);
  const [planName, setPlanName] = useState("");
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch inventory
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

  // Fetch catalog
  useEffect(() => {
    if (source === "cadastro") {
      supabase
        .from("cutting_plan_materials" as any)
        .select("*")
        .eq("is_active", true)
        .eq("category", "chapa")
        .order("name")
        .then(({ data }: any) => setCatalogMaterials(data || []));
    }
  }, [source]);

  // Fetch scraps
  useEffect(() => {
    if (source === "retalho") {
      supabase
        .from("cutting_scraps" as any)
        .select("*")
        .eq("status", "disponível")
        .eq("scrap_type", "chapa")
        .order("created_at", { ascending: false })
        .then(({ data }: any) => setScraps(data || []));
    }
  }, [source]);

  const handleInventorySelect = (id: string) => {
    setSelectedItemId(id);
    const item = inventoryItems.find((i) => i.id === id);
    if (item) {
      setMaterialName(item.name);
      setMaterialPrice(String(item.unit_cost || item.avg_cost || item.last_cost || 0));
      setAvailableQty(item.current_quantity);
      setMaterialWidth("");
      setMaterialHeight("");
    }
  };

  const handleCatalogSelect = (id: string) => {
    setSelectedItemId(id);
    const mat = catalogMaterials.find((m: any) => m.id === id);
    if (mat) {
      setMaterialName(mat.name);
      setMaterialWidth(String(mat.width));
      setMaterialHeight(String(mat.height));
      setMaterialPrice(String(mat.unit_price));
      setAvailableQty(null);
    }
  };

  const handleScrapSelect = (id: string) => {
    setSelectedItemId(id);
    const scrap = scraps.find((s: any) => s.id === id);
    if (scrap) {
      setMaterialName(`Retalho: ${scrap.material_name}`);
      setMaterialWidth(String(scrap.width));
      setMaterialHeight(String(scrap.height));
      setMaterialPrice("0");
      setAvailableQty(1);
    }
  };

  const handleSourceChange = (val: string) => {
    setSource(val);
    setSelectedItemId("");
    setMaterialName("");
    setMaterialWidth("");
    setMaterialHeight("");
    setMaterialPrice("");
    setAvailableQty(null);
    setReserveStock(false);
  };

  const addPiece = () => {
    const newId = String(Date.now());
    setPieces((prev) => [...prev, { id: newId, width: "", height: "", quantity: "1", allowRotation: allowRotation }]);
    setTimeout(() => {
      const el = document.querySelector(`[data-piece-id="${newId}"][data-field="width"]`) as HTMLInputElement;
      el?.focus();
    }, 50);
  };

  const handlePieceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number, field: keyof PieceRow) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addPiece();
    }
    if (e.key === " " && (e.target as HTMLInputElement).value === "") {
      e.preventDefault();
      if (index > 0) {
        const prev = pieces[index - 1];
        const val = String(prev[field] ?? "");
        if (val) updatePiece(pieces[index].id, field, val);
      }
    }
  };

  const duplicatePiece = (id: string) => {
    const piece = pieces.find(p => p.id === id);
    if (piece) {
      setPieces(prev => [...prev, { ...piece, id: String(Date.now()) }]);
    }
  };

  const removePiece = (id: string) => {
    if (pieces.length <= 1) return;
    setPieces((prev) => prev.filter((p) => p.id !== id));
  };

  const clearPieces = () => {
    setPieces([{ id: String(Date.now()), width: "", height: "", quantity: "1", allowRotation: true }]);
    setResult(null);
  };

  const updatePiece = (id: string, field: keyof PieceRow, value: any) => {
    setPieces((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      const newPieces: PieceRow[] = [];
      for (const line of lines) {
        const parts = line.split(/[,;\t]/).map(s => s.trim());
        if (parts.length >= 3) {
          const w = parts[0], h = parts[1], q = parts[2];
          if (parseFloat(w) > 0 && parseFloat(h) > 0) {
            newPieces.push({ id: String(Date.now() + Math.random()), width: w, height: h, quantity: q || "1", allowRotation: true });
          }
        }
      }
      if (newPieces.length > 0) {
        setPieces(prev => [...prev.filter(p => p.width || p.height), ...newPieces]);
        toast.success(`${newPieces.length} peça(s) importada(s) do CSV.`);
      } else {
        toast.error("Nenhuma peça válida encontrada no CSV. Formato: largura,altura,quantidade");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCalculate = () => {
    setResult(null);
    const matW = parseFloat(materialWidth);
    const matH = parseFloat(materialHeight);
    const price = parseFloat(materialPrice) || 0;
    const kerf = parseFloat(kerfWidth) || 0;
    const margin = parseFloat(safetyMargin) || 0;

    if (!materialName.trim()) { toast.error("Selecione ou informe o material."); return; }
    if (!matW || !matH || matW <= 0 || matH <= 0) { toast.error("Informe as dimensões do material."); return; }
    if (kerf < 0) { toast.error("A largura da serra deve ser >= 0."); return; }

    const parsedPieces: SheetPiece[] = [];
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      const w = parseFloat(p.width);
      const h = parseFloat(p.height);
      const q = parseInt(p.quantity);
      if (!w || !h || w <= 0 || h <= 0) { toast.error(`Peça ${i + 1}: informe largura e altura válidas.`); return; }
      if (!q || q <= 0) { toast.error(`Peça ${i + 1}: informe uma quantidade válida.`); return; }
      parsedPieces.push({ id: p.id, width: w, height: h, quantity: q, allowRotation: p.allowRotation });
    }

    const res = calculateSheetCutting(matW, matH, price, parsedPieces, kerf, {
      safetyMargin: margin,
      allowRotation,
      mode: optimizationMode,
      minScrapSize: parseFloat(minScrapSize) || 150,
    });
    setResult(res);

    if (res.errors.length > 0) {
      toast.error("Existem peças inválidas. Verifique os erros.");
    } else {
      toast.success(`Plano calculado: ${res.totalSheets} chapa(s), ${res.totalUtilization.toFixed(1)}% de aproveitamento.`);
    }
  };

  const handleSave = async () => {
    if (!result || result.errors.length > 0 || !planName.trim() || !userId) return;
    setSaving(true);
    try {
      const matW = parseFloat(materialWidth);
      const matH = parseFloat(materialHeight);

      const { data: planData } = await supabase.from("cutting_plans" as any).insert({
        user_id: userId,
        plan_type: "chapa",
        plan_name: planName.trim(),
        client_name: clientName.trim(),
        project_name: projectName.trim(),
        material_name: materialName,
        material_source: source,
        material_dimensions: { width: matW, height: matH },
        material_unit_price: parseFloat(materialPrice) || 0,
        kerf_width: parseFloat(kerfWidth) || 0,
        pieces: pieces.map((p) => ({ width: parseFloat(p.width), height: parseFloat(p.height), quantity: parseInt(p.quantity) })),
        result_json: result,
        utilization_percent: result.totalUtilization,
        waste_area: result.totalWaste,
        units_needed: result.totalSheets,
        estimated_cost: result.estimatedCost,
      } as any).select("id").single() as any;

      // Save scraps
      if (result.scraps.length > 0 && planData?.id) {
        const scrapRows = result.scraps.map(s => ({
          user_id: userId,
          material_name: materialName,
          width: s.width,
          height: s.height,
          length: 0,
          scrap_type: "chapa",
          origin_plan_id: planData.id,
          status: "disponível",
        }));
        await supabase.from("cutting_scraps" as any).insert(scrapRows as any);
      }

      // Reserve stock
      if (reserveStock && source === "estoque" && selectedItemId) {
        await supabase.from("inventory_reservations").insert({
          item_id: selectedItemId,
          quantity: result.totalSheets,
          reserved_by: userId,
          linked_order: planName.trim(),
          linked_machine: "",
          notes: `Reserva automática - Plano de Corte: ${planName}`,
          status: "reservado",
        });
      }

      // Mark scrap as used if source is retalho
      if (source === "retalho" && selectedItemId) {
        await supabase.from("cutting_scraps" as any).update({ status: "usado" } as any).eq("id", selectedItemId);
      }

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
    const matW = parseFloat(materialWidth);
    const matH = parseFloat(materialHeight);
    exportCuttingPlanPdf({
      planName: planName || "Plano de Corte - Chapa",
      planType: "chapa",
      materialName,
      dimensions: `${matW} x ${matH} mm`,
      unitPrice: parseFloat(materialPrice) || 0,
      kerfWidth: parseFloat(kerfWidth) || 0,
      pieces: pieces.map((p) => ({ width: parseFloat(p.width), height: parseFloat(p.height), quantity: parseInt(p.quantity) })),
      result,
      clientName,
      projectName,
    });
  };

  const matW = parseFloat(materialWidth) || 0;
  const matH = parseFloat(materialHeight) || 0;

  return (
    <div className="space-y-4">
      {/* Material Selection */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold flex items-center gap-2 text-foreground">
          <Package className="h-4 w-4 text-primary" /> Material
        </h3>

        <RadioGroup value={source} onValueChange={handleSourceChange} className="flex flex-wrap gap-4">
          {[
            { value: "estoque", label: "Estoque" },
            { value: "cadastro", label: "Cadastro" },
            { value: "retalho", label: "Retalho" },
            { value: "manual", label: "Manual" },
          ].map(s => (
            <div key={s.value} className="flex items-center gap-2">
              <RadioGroupItem value={s.value} id={`src-${s.value}`} />
              <Label htmlFor={`src-${s.value}`} className="cursor-pointer">{s.label}</Label>
            </div>
          ))}
        </RadioGroup>

        {source === "estoque" && (
          <>
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
            <div className="flex items-center gap-2">
              <Checkbox id="reserve-stock" checked={reserveStock} onCheckedChange={(v) => setReserveStock(!!v)} />
              <Label htmlFor="reserve-stock" className="cursor-pointer text-sm">Reservar material do estoque ao salvar</Label>
            </div>
          </>
        )}

        {source === "cadastro" && (
          <Select value={selectedItemId} onValueChange={handleCatalogSelect}>
            <SelectTrigger><SelectValue placeholder="Selecione do cadastro..." /></SelectTrigger>
            <SelectContent>
              {catalogMaterials.map((mat: any) => (
                <SelectItem key={mat.id} value={mat.id}>
                  {mat.name} — {mat.width} x {mat.height} mm — R$ {Number(mat.unit_price).toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {source === "retalho" && (
          <Select value={selectedItemId} onValueChange={handleScrapSelect}>
            <SelectTrigger><SelectValue placeholder="Selecione um retalho disponível..." /></SelectTrigger>
            <SelectContent>
              {scraps.length === 0 ? (
                <SelectItem value="_none" disabled>Nenhum retalho disponível</SelectItem>
              ) : scraps.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.material_name} — {Number(s.width).toFixed(0)} x {Number(s.height).toFixed(0)} mm
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <Label className="text-xs">Nome do material</Label>
            <Input value={materialName} onChange={(e) => setMaterialName(e.target.value)} readOnly={source !== "manual"} placeholder="Ex: Aço 1020" />
          </div>
          <div>
            <Label className="text-xs">Largura (mm)</Label>
            <Input type="number" value={materialWidth} onChange={(e) => setMaterialWidth(e.target.value)} placeholder="1000" />
          </div>
          <div>
            <Label className="text-xs">Altura (mm)</Label>
            <Input type="number" value={materialHeight} onChange={(e) => setMaterialHeight(e.target.value)} placeholder="2000" />
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
          <p className="text-xs text-muted-foreground">Quantidade disponível: <span className="font-semibold text-foreground">{availableQty}</span></p>
        )}
      </Card>

      {/* Optimization Settings */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold flex items-center gap-2 text-foreground">
          <RotateCw className="h-4 w-4 text-primary" /> Otimização
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Modo de otimização</Label>
            <Select value={optimizationMode} onValueChange={(v) => setOptimizationMode(v as OptimizationMode)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="best_utilization">Melhor aproveitamento</SelectItem>
                <SelectItem value="fewer_units">Menos chapas</SelectItem>
                <SelectItem value="simple">Corte simples</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Margem de segurança (mm)</Label>
            <Input type="number" value={safetyMargin} onChange={(e) => setSafetyMargin(e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label className="text-xs">Retalho mínimo (mm)</Label>
            <Input type="number" value={minScrapSize} onChange={(e) => setMinScrapSize(e.target.value)} placeholder="150" />
          </div>
          <div className="flex items-center gap-2 pt-4">
            <Switch id="global-rotation" checked={allowRotation} onCheckedChange={setAllowRotation} />
            <Label htmlFor="global-rotation" className="cursor-pointer text-sm">Rotação automática</Label>
          </div>
        </div>
      </Card>

      {/* Pieces */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold flex items-center gap-2 text-foreground">
            <Layers className="h-4 w-4 text-primary" /> Peças
          </h3>
          <div className="flex gap-1 flex-wrap">
            <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCsvImport} />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={clearPieces}>
              <XCircle className="h-4 w-4 mr-1" /> Limpar
            </Button>
            <Button variant="outline" size="sm" onClick={addPiece}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">#</TableHead>
                <TableHead>Largura (mm)</TableHead>
                <TableHead>Altura (mm)</TableHead>
                <TableHead className="w-24">Qtd</TableHead>
                <TableHead className="w-16">Girar</TableHead>
                <TableHead className="w-20" />
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
                        <span className="text-sm font-medium">P{index + 1}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={piece.width} onChange={(e) => updatePiece(piece.id, "width", e.target.value)} onKeyDown={(e) => handlePieceKeyDown(e, index, "width")} data-piece-id={piece.id} data-field="width" className={`h-8 ${isInvalid ? "border-destructive" : ""}`} placeholder="0" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={piece.height} onChange={(e) => updatePiece(piece.id, "height", e.target.value)} onKeyDown={(e) => handlePieceKeyDown(e, index, "height")} data-piece-id={piece.id} data-field="height" className={`h-8 ${isInvalid ? "border-destructive" : ""}`} placeholder="0" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={piece.quantity} onChange={(e) => updatePiece(piece.id, "quantity", e.target.value)} onKeyDown={(e) => handlePieceKeyDown(e, index, "quantity")} data-piece-id={piece.id} data-field="quantity" className="h-8 w-20" min="1" placeholder="1" />
                    </TableCell>
                    <TableCell>
                      <Checkbox checked={piece.allowRotation} onCheckedChange={(v) => updatePiece(piece.id, "allowRotation", !!v)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => duplicatePiece(piece.id)} title="Duplicar">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removePiece(piece.id)} disabled={pieces.length <= 1}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-2xl font-bold text-primary">{result.totalSheets}</p>
              <p className="text-xs text-muted-foreground">Chapa(s)</p>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-2xl font-bold text-primary">{result.totalUtilization.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Aproveitamento</p>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{(result.totalWaste / 1_000_000).toFixed(4)} m²</p>
              <p className="text-xs text-muted-foreground">Sobra total</p>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-2xl font-bold text-foreground">R$ {result.estimatedCost.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Custo estimado</p>
            </div>
            {result.scraps.length > 0 && (
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-2xl font-bold text-accent-foreground">{result.scraps.length}</p>
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Scissors className="h-3 w-3" /> Retalho(s)</p>
              </div>
            )}
          </div>

          {/* Visual layouts */}
          <div className="space-y-4">
            {result.layouts.map((layout, i) => (
              <div key={i} className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Chapa {i + 1} — {layout.pieces.length} peça(s) — Aproveitamento: {layout.utilization.toFixed(1)}%
                  {layout.scrapWidth && layout.scrapHeight && (
                    <span className="text-muted-foreground ml-2">
                      (Retalho: {layout.scrapWidth.toFixed(0)} x {layout.scrapHeight.toFixed(0)} mm)
                    </span>
                  )}
                </p>
                <div
                  className="relative border-2 border-border rounded bg-muted/20 overflow-hidden"
                  style={{ width: "100%", paddingBottom: `${(matH / matW) * 100}%`, maxHeight: 400 }}
                >
                  {layout.pieces.map((p, j) => (
                    <div
                      key={j}
                      className="absolute flex items-center justify-center text-[9px] font-bold text-white border border-white/30 rounded-sm"
                      title={`Peça ${p.pieceIndex + 1}: ${p.width} x ${p.height} mm${p.rotated ? " (girada)" : ""}`}
                      style={{
                        left: `${(p.x / matW) * 100}%`,
                        top: `${(p.y / matH) * 100}%`,
                        width: `${(p.width / matW) * 100}%`,
                        height: `${(p.height / matH) * 100}%`,
                        backgroundColor: getPieceColor(p.pieceIndex),
                      }}
                    >
                      <span className="truncate px-0.5">
                        P{p.pieceIndex + 1} {p.rotated ? "↻" : ""}
                      </span>
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
              <Input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Ex: Corte Projeto X" />
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
            <Button onClick={handleSave} disabled={saving || !planName.trim()}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
