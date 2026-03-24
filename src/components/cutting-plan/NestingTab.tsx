import { useState, useRef, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Upload, Trash2, Calculator, Save, FileDown, AlertTriangle, RotateCw,
  Scissors, ZoomIn, ZoomOut, Maximize2, Move, Eye, Package, Layers,
  X, RotateCcw, GripVertical, Grid3X3, FileImage
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  parseSvgContent,
  calculateNesting,
  getNestingPieceColor,
  checkCollision,
  type NestingPiece,
  type NestingResult,
} from "@/lib/nesting-engine";
import { usePdfSettings } from "./CuttingPlanPdfSettingsTab";
import { exportNestingPdf } from "@/lib/nesting-pdf";

export function NestingTab() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [pdfSettings] = usePdfSettings();

  // SVG state
  const fileRef = useRef<HTMLInputElement>(null);
  const [svgContent, setSvgContent] = useState("");
  const [svgFileName, setSvgFileName] = useState("");
  const [importedPieces, setImportedPieces] = useState<NestingPiece[]>([]);

  // Material
  const [materialName, setMaterialName] = useState("");
  const [matWidth, setMatWidth] = useState("1000");
  const [matHeight, setMatHeight] = useState("2000");
  const [matPrice, setMatPrice] = useState("0");
  const [kerfWidth, setKerfWidth] = useState("3");
  const [autoRotation, setAutoRotation] = useState(true);
  const [singleCut, setSingleCut] = useState(false);

  // Results
  const [result, setResult] = useState<NestingResult | null>(null);

  // Preview
  const [zoom, setZoom] = useState(1);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"single" | "grid">("single");

  // Save dialog
  const [showSave, setShowSave] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [saving, setSaving] = useState(false);

  // Saved projects
  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const [showSaved, setShowSaved] = useState(false);

  // ── SVG Import ──────────────────────────────────────────────

  const handleImportSvg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      setSvgContent(content);
      setSvgFileName(file.name);

      const parsed = parseSvgContent(content);
      const pieces: NestingPiece[] = parsed.pieces.map((p, i) => ({
        id: p.id,
        label: p.label,
        pathData: p.pathData,
        width: Math.round(p.width * 10) / 10,
        height: Math.round(p.height * 10) / 10,
        rotation: 0,
        x: 0,
        y: 0,
        color: getNestingPieceColor(i),
        excluded: false,
      }));

      setImportedPieces(pieces);
      setResult(null);
      toast.success(`${pieces.length} peça(s) detectada(s) no SVG`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const clearSvg = () => {
    setSvgContent("");
    setSvgFileName("");
    setImportedPieces([]);
    setResult(null);
  };

  // ── Calculate ───────────────────────────────────────────────

  const handleCalculate = () => {
    const mw = parseFloat(matWidth) || 0;
    const mh = parseFloat(matHeight) || 0;
    const kerf = parseFloat(kerfWidth) || 0;
    const price = parseFloat(matPrice) || 0;

    if (mw <= 0 || mh <= 0) {
      toast.error("Defina as dimensões do material.");
      return;
    }
    if (importedPieces.filter(p => !p.excluded).length === 0) {
      toast.error("Importe um SVG com peças primeiro.");
      return;
    }

    const res = calculateNesting({
      pieces: importedPieces,
      matW: mw,
      matH: mh,
      kerf,
      autoRotation,
      singleCut,
      unitPrice: price,
    });

    setResult(res);
    if (res.errors.length > 0) {
      res.errors.forEach(err => toast.error(err));
    } else {
      toast.success(`Nesting calculado: ${res.totalSheets} chapa(s), ${res.totalUtilization.toFixed(1)}% aproveitamento`);
    }
  };

  // ── Manual adjustments ──────────────────────────────────────

  const toggleExclude = (id: string) => {
    setImportedPieces(prev => prev.map(p =>
      p.id === id ? { ...p, excluded: !p.excluded } : p
    ));
    setResult(null);
  };

  const rotatePiece = (sheetIdx: number, pieceId: string) => {
    if (!result) return;
    const newSheets = [...result.sheets];
    const sheet = newSheets[sheetIdx];
    const idx = sheet.pieces.findIndex(p => p.id === pieceId);
    if (idx === -1) return;
    const p = { ...sheet.pieces[idx] };
    const oldW = p.width;
    p.width = p.height;
    p.height = oldW;
    p.rotation = (p.rotation + 90) % 360;
    sheet.pieces[idx] = p;
    setResult({ ...result, sheets: newSheets });
  };

  const removePieceFromResult = (sheetIdx: number, pieceId: string) => {
    if (!result) return;
    const newSheets = [...result.sheets];
    newSheets[sheetIdx] = {
      ...newSheets[sheetIdx],
      pieces: newSheets[sheetIdx].pieces.filter(p => p.id !== pieceId),
    };
    // Recalculate utilization
    const mw = parseFloat(matWidth) || 1;
    const mh = parseFloat(matHeight) || 1;
    const matArea = mw * mh;
    newSheets.forEach(sh => {
      sh.usedArea = sh.pieces.reduce((s, p) => s + p.width * p.height, 0);
      sh.freeArea = matArea - sh.usedArea;
      sh.utilization = (sh.usedArea / matArea) * 100;
    });
    setResult({ ...result, sheets: newSheets.filter(sh => sh.pieces.length > 0) });
    toast.info("Peça removida do nesting.");
  };

  // ── Save ────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!userId || !result || !projectName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("nesting_projects").insert({
        user_id: userId,
        project_name: projectName.trim(),
        material_name: materialName,
        material_width: parseFloat(matWidth) || 0,
        material_height: parseFloat(matHeight) || 0,
        unit_price: parseFloat(matPrice) || 0,
        kerf: parseFloat(kerfWidth) || 0,
        auto_rotation: autoRotation,
        single_cut: singleCut,
        utilization_percent: result.totalUtilization,
        sheets_needed: result.totalSheets,
        result_json: result as any,
      });
      if (error) throw error;
      toast.success("Nesting salvo com sucesso!");
      setShowSave(false);
      setProjectName("");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Export PDF ──────────────────────────────────────────────

  const handleExportPdf = () => {
    if (!result) return;
    const mw = parseFloat(matWidth) || 0;
    const mh = parseFloat(matHeight) || 0;

    exportNestingPdf({
      projectName: projectName || "Nesting",
      materialName,
      matW: mw,
      matH: mh,
      unitPrice: parseFloat(matPrice) || 0,
      kerf: parseFloat(kerfWidth) || 0,
      singleCut,
      autoRotation,
      result,
      pdfSettings,
    });
    toast.success("PDF exportado!");
  };

  // ── Render ──────────────────────────────────────────────────

  const mw = parseFloat(matWidth) || 1000;
  const mh = parseFloat(matHeight) || 2000;

  return (
    <div className="space-y-4">
      {/* ── Material Config ────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" /> Material e Configuração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Nome do material</Label>
              <Input value={materialName} onChange={e => setMaterialName(e.target.value)} placeholder="Ex: Aço 1020" className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Largura (mm)</Label>
              <Input value={matWidth} onChange={e => setMatWidth(e.target.value)} type="number" className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Altura (mm)</Label>
              <Input value={matHeight} onChange={e => setMatHeight(e.target.value)} type="number" className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Preço unitário (R$)</Label>
              <Input value={matPrice} onChange={e => setMatPrice(e.target.value)} type="number" className="h-8 text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Largura da serra / kerf (mm)</Label>
              <Input value={kerfWidth} onChange={e => setKerfWidth(e.target.value)} type="number" className="h-8 text-xs" />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <Switch checked={autoRotation} onCheckedChange={setAutoRotation} />
              <Label className="text-xs">Rotação automática</Label>
            </div>
            <div className="flex items-center gap-2 pt-4">
              <Switch checked={singleCut} onCheckedChange={setSingleCut} />
              <Label className="text-xs flex items-center gap-1"><Scissors className="h-3 w-3" /> Corte único</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SVG Import ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" /> Importação SVG
            {svgFileName && <Badge variant="outline" className="text-[10px] ml-auto">{svgFileName}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input ref={fileRef} type="file" accept=".svg" className="hidden" onChange={handleImportSvg} />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> Importar SVG
            </Button>
            {svgContent && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-destructive" onClick={clearSvg}>
                <Trash2 className="h-3.5 w-3.5" /> Remover
              </Button>
            )}
          </div>

          {/* SVG Preview - same style as cutting quote */}
          {svgContent && (
            <Card>
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    Visualização do Arquivo
                  </CardTitle>
                  <CardDescription>{svgFileName}</CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant={viewMode === "single" ? "default" : "ghost"} size="sm" className="h-7 px-2 text-xs gap-1"
                    onClick={() => setViewMode("single")}>
                    <FileImage className="h-3.5 w-3.5" /> Arquivo
                  </Button>
                  <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="h-7 px-2 text-xs gap-1"
                    onClick={() => setViewMode("grid")}>
                    <Grid3X3 className="h-3.5 w-3.5" /> Grid
                  </Button>
                  {viewMode === "single" && (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}>
                        <ZoomOut className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>
                        <ZoomIn className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(1)}>
                        <Maximize2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={clearSvg}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {viewMode === "single" ? (
                  <div className="w-full h-[300px] bg-secondary/30 rounded-lg border border-border flex items-center justify-center overflow-hidden p-4">
                    <div
                      style={{ transform: `scale(${zoom})`, transformOrigin: "center center", color: "#000" }}
                      className="max-w-full max-h-full transition-transform [&_svg]:stroke-black [&_svg_*]:stroke-black [&_svg]:fill-none [&_svg_*]:fill-none [&_svg]:max-w-full [&_svg]:max-h-[268px]"
                      dangerouslySetInnerHTML={{ __html: svgContent }}
                    />
                  </div>
                ) : (
                  <NestingPiecesGrid pieces={importedPieces} />
                )}
              </CardContent>
            </Card>
          )}

          {/* Pieces list */}
          {importedPieces.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">{importedPieces.length} peça(s) detectada(s)</span>
              </div>
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-1">
                  {importedPieces.map((p, i) => (
                    <div key={p.id} className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${p.excluded ? "opacity-40 line-through" : ""}`}>
                      <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: p.color }} />
                      <span className="flex-1 truncate">{p.label}</span>
                      <span className="text-muted-foreground">{p.width.toFixed(0)}×{p.height.toFixed(0)} mm</span>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => toggleExclude(p.id)}>
                        {p.excluded ? <Eye className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Actions ────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleCalculate} className="gap-1.5" disabled={importedPieces.filter(p => !p.excluded).length === 0}>
          <Calculator className="h-4 w-4" /> Calcular Nesting
        </Button>
        {result && result.sheets.length > 0 && (
          <>
            <Button variant="outline" className="gap-1.5" onClick={() => setShowSave(true)}>
              <Save className="h-4 w-4" /> Salvar
            </Button>
            <Button variant="outline" className="gap-1.5" onClick={handleExportPdf}>
              <FileDown className="h-4 w-4" /> Exportar PDF
            </Button>
          </>
        )}
      </div>

      {/* ── Errors ─────────────────────────────────────────── */}
      {result && result.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {result.errors.map((e, i) => <p key={i} className="text-xs">{e}</p>)}
          </AlertDescription>
        </Alert>
      )}

      {/* ── Results ────────────────────────────────────────── */}
      {result && result.sheets.length > 0 && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="p-3">
              <p className="text-[10px] text-muted-foreground">Chapas</p>
              <p className="text-lg font-bold">{result.totalSheets}</p>
            </Card>
            <Card className="p-3">
              <p className="text-[10px] text-muted-foreground">Aproveitamento</p>
              <p className="text-lg font-bold text-primary">{result.totalUtilization.toFixed(1)}%</p>
            </Card>
            <Card className="p-3">
              <p className="text-[10px] text-muted-foreground">Área ocupada</p>
              <p className="text-lg font-bold">{(result.totalUsedArea / 1e6).toFixed(3)} m²</p>
            </Card>
            <Card className="p-3">
              <p className="text-[10px] text-muted-foreground">Área livre</p>
              <p className="text-lg font-bold">{(result.totalFreeArea / 1e6).toFixed(3)} m²</p>
            </Card>
            <Card className="p-3">
              <p className="text-[10px] text-muted-foreground">Custo estimado</p>
              <p className="text-lg font-bold">R$ {result.estimatedCost.toFixed(2)}</p>
            </Card>
          </div>

          {/* Sheet layouts */}
          {result.sheets.map((sheet, si) => (
            <Card key={si}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  Chapa {si + 1}
                  <Badge variant="outline" className="text-[10px]">{sheet.utilization.toFixed(1)}%</Badge>
                  <Badge variant="outline" className="text-[10px]">{sheet.pieces.length} peça(s)</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <NestingPreview
                  sheet={sheet}
                  sheetIndex={si}
                  matW={mw}
                  matH={mh}
                  kerf={parseFloat(kerfWidth) || 0}
                  onRotate={rotatePiece}
                  onRemove={removePieceFromResult}
                  selectedPieceId={selectedPieceId}
                  onSelectPiece={setSelectedPieceId}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Save Dialog ────────────────────────────────────── */}
      <Dialog open={showSave} onOpenChange={setShowSave}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Nesting</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome do projeto</Label>
              <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Ex: Projeto Mesa" className="h-8 text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSave(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !projectName.trim()}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Nesting Preview (interactive) ─────────────────────────────

interface NestingPreviewProps {
  sheet: { pieces: NestingPiece[]; utilization: number };
  sheetIndex: number;
  matW: number;
  matH: number;
  kerf: number;
  onRotate: (sheetIdx: number, pieceId: string) => void;
  onRemove: (sheetIdx: number, pieceId: string) => void;
  selectedPieceId: string | null;
  onSelectPiece: (id: string | null) => void;
}

function NestingPreview({ sheet, sheetIndex, matW, matH, kerf, onRotate, onRemove, selectedPieceId, onSelectPiece }: NestingPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const padding = 10;
  const maxW = 700;
  const scaleX = (maxW - padding * 2) / matW;
  const scaleY = (400 - padding * 2) / matH;
  const scale = Math.min(scaleX, scaleY);
  const svgW = matW * scale + padding * 2;
  const svgH = matH * scale + padding * 2;

  return (
    <div ref={containerRef} className="overflow-auto">
      <svg width={svgW} height={svgH} className="border rounded bg-background">
        {/* Material background */}
        <rect x={padding} y={padding} width={matW * scale} height={matH * scale}
          fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth={1} />

        {/* Pieces */}
        {sheet.pieces.map((p) => {
          const px = padding + p.x * scale;
          const py = padding + p.y * scale;
          const pw = p.width * scale;
          const ph = p.height * scale;
          const isSelected = selectedPieceId === p.id;

          return (
            <g key={p.id} onClick={() => onSelectPiece(isSelected ? null : p.id)} className="cursor-pointer">
              <rect x={px} y={py} width={pw} height={ph}
                fill={p.color + "33"} stroke={isSelected ? "hsl(var(--primary))" : p.color}
                strokeWidth={isSelected ? 2 : 1} rx={1} />
              {pw > 30 && ph > 14 && (
                <text x={px + pw / 2} y={py + ph / 2} textAnchor="middle" dominantBaseline="middle"
                  fontSize={Math.min(10, pw * 0.15, ph * 0.3)} fill="hsl(var(--foreground))" className="select-none">
                  {p.label}
                </text>
              )}
              {pw > 20 && ph > 24 && (
                <text x={px + pw / 2} y={py + ph / 2 + 10} textAnchor="middle" dominantBaseline="middle"
                  fontSize={Math.min(8, pw * 0.12)} fill="hsl(var(--muted-foreground))" className="select-none">
                  {p.width.toFixed(0)}×{p.height.toFixed(0)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Actions for selected piece */}
      {selectedPieceId && (
        <div className="flex gap-1 mt-2 p-1.5 bg-primary/5 rounded border border-primary/20">
          <span className="text-[10px] text-primary font-medium flex-1">
            {sheet.pieces.find(p => p.id === selectedPieceId)?.label}
          </span>
          <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1"
            onClick={() => onRotate(sheetIndex, selectedPieceId)}>
            <RotateCw className="h-3 w-3" /> Rotacionar
          </Button>
          <Button variant="destructive" size="sm" className="h-6 text-[10px] gap-1"
            onClick={() => { onRemove(sheetIndex, selectedPieceId); onSelectPiece(null); }}>
            <Trash2 className="h-3 w-3" /> Remover
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Grid view with mouse-following zoom ───────────────────────

function NestingPiecesGrid({ pieces }: { pieces: NestingPiece[] }) {
  const activePieces = pieces.filter(p => !p.excluded);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-[400px] overflow-auto bg-white p-1">
      {activePieces.map((piece) => (
        <PieceZoomCard key={piece.id} piece={piece} />
      ))}
    </div>
  );
}

function PieceZoomCard({ piece }: { piece: NestingPiece }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transformOrigin, setTransformOrigin] = useState("center center");
  const [isHovered, setIsHovered] = useState(false);
  const zoomLevel = 2.5;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setTransformOrigin(`${x}% ${y}%`);
  }, []);

  const maxDim = Math.max(piece.width, piece.height);
  const padding = maxDim * 0.1;
  const vbW = piece.width + padding * 2;
  const vbH = piece.height + padding * 2;

  return (
    <div
      ref={containerRef}
      className="relative border rounded bg-white overflow-hidden cursor-crosshair group"
      style={{ aspectRatio: "1/1" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setTransformOrigin("center center"); }}
      onMouseMove={handleMouseMove}
    >
      <div
        className="w-full h-full transition-transform duration-100 ease-out"
        style={{
          transform: isHovered ? `scale(${zoomLevel})` : "scale(1)",
          transformOrigin,
        }}
      >
        <svg
          viewBox={`${-padding} ${-padding} ${vbW} ${vbH}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <rect x={0} y={0} width={piece.width} height={piece.height}
            fill="none" stroke="#ddd" strokeWidth={maxDim * 0.005} strokeDasharray={`${maxDim * 0.02} ${maxDim * 0.02}`} />
          <path d={piece.pathData} fill="none" stroke="#000" strokeWidth={maxDim * 0.008}
            transform={`translate(${0},${0})`} />
        </svg>
      </div>

      {/* Label overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1.5 py-1 pointer-events-none">
        <p className="text-[9px] text-white font-medium truncate">{piece.label}</p>
        <p className="text-[8px] text-white/70">{piece.width.toFixed(0)}×{piece.height.toFixed(0)} mm</p>
      </div>

      {/* Zoom indicator */}
      {isHovered && (
        <div className="absolute top-1 right-1 bg-black/60 rounded px-1 py-0.5 pointer-events-none">
          <ZoomIn className="h-3 w-3 text-white" />
        </div>
      )}
    </div>
  );
}
