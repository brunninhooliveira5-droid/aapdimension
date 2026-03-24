import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload, Trash2, Calculator, Save, FileDown, AlertTriangle, RotateCw,
  Scissors, ZoomIn, ZoomOut, Maximize2, Eye, Package, Layers,
  X, Grid3X3, FileImage, FileCode, Move
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  parseSvgContent,
  calculateNesting,
  getNestingPieceColor,
  checkCollision,
  groupSimilarPieces,
  type NestingPiece,
  type NestingResult,
  type PieceGroup,
  type Point,
} from "@/lib/nesting-engine";
import { translatePolygon } from "@/lib/nesting-geometry";
import { usePdfSettings } from "./CuttingPlanPdfSettingsTab";
import { exportNestingPdf } from "@/lib/nesting-pdf";

export function NestingTab() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [pdfSettings] = usePdfSettings();
  const [expandedSheet, setExpandedSheet] = useState<number | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [svgContent, setSvgContent] = useState("");
  const [svgFileName, setSvgFileName] = useState("");
  const [importedPieces, setImportedPieces] = useState<NestingPiece[]>([]);
  const [pieceGroups, setPieceGroups] = useState<PieceGroup[]>([]);

  const [materialName, setMaterialName] = useState("");
  const [matWidth, setMatWidth] = useState("1000");
  const [matHeight, setMatHeight] = useState("2000");
  const [matPrice, setMatPrice] = useState("0");
  const [kerfWidth, setKerfWidth] = useState("3");
  const [autoRotation, setAutoRotation] = useState(true);
  const [singleCut, setSingleCut] = useState(false);

  const [result, setResult] = useState<NestingResult | null>(null);
  const [zoom, setZoom] = useState(1);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"single" | "grid">("single");
  const [highlightContours, setHighlightContours] = useState(true);

  const [showSave, setShowSave] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [saving, setSaving] = useState(false);

  // Update groups when pieces change
  useEffect(() => {
    setPieceGroups(groupSimilarPieces(importedPieces));
  }, [importedPieces]);

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
        bboxX: p.bboxX,
        bboxY: p.bboxY,
        bboxW: p.bboxW,
        bboxH: p.bboxH,
        rotation: 0,
        x: 0,
        y: 0,
        color: getNestingPieceColor(i),
        excluded: false,
        polygonPoints: p.polygonPoints,
        realArea: p.realArea,
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
    setPieceGroups([]);
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

    toast.info("Calculando nesting por geometria real...");

    // Use setTimeout to allow UI to update
    setTimeout(() => {
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
    }, 50);
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
    const mw = parseFloat(matWidth) || 1;
    const mh = parseFloat(matHeight) || 1;
    const matArea = mw * mh;
    newSheets.forEach(sh => {
      sh.usedArea = sh.pieces.reduce((s, p) => s + (p.realArea || p.width * p.height), 0);
      sh.freeArea = matArea - sh.usedArea;
      sh.utilization = (sh.usedArea / matArea) * 100;
    });
    setResult({ ...result, sheets: newSheets.filter(sh => sh.pieces.length > 0) });
    toast.info("Peça removida do nesting.");
  };

  const handleDragPiece = (sheetIdx: number, pieceId: string, newX: number, newY: number) => {
    if (!result) return;
    const mw = parseFloat(matWidth) || 1;
    const mh = parseFloat(matHeight) || 1;
    const kerf = parseFloat(kerfWidth) || 0;

    const newSheets = [...result.sheets];
    const sheet = { ...newSheets[sheetIdx] };
    const pIdx = sheet.pieces.findIndex(p => p.id === pieceId);
    if (pIdx === -1) return;

    const movedPiece = { ...sheet.pieces[pIdx], x: newX, y: newY };
    const collision = checkCollision(movedPiece, sheet.pieces, mw, mh, kerf);
    if (collision) {
      toast.error(collision);
      return;
    }

    sheet.pieces = [...sheet.pieces];
    sheet.pieces[pIdx] = movedPiece;
    newSheets[sheetIdx] = sheet;
    setResult({ ...result, sheets: newSheets });
  };

  // ── Save ────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!userId || !result || !projectName.trim()) return;
    setSaving(true);
    try {
      const { data: project, error } = await supabase.from("nesting_projects").insert({
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
      }).select("id").single();

      if (error) throw error;

      // Save individual items
      if (project) {
        const items = result.sheets.flatMap((sheet, si) =>
          sheet.pieces.map(p => ({
            nesting_project_id: project.id,
            piece_name: p.label,
            path_data: p.pathData,
            polygon_points: JSON.stringify(p.polygonPoints || []),
            width: p.width,
            height: p.height,
            x_pos: p.x,
            y_pos: p.y,
            rotation: p.rotation,
            sheet_index: si,
          }))
        );
        if (items.length > 0) {
          await supabase.from("nesting_items").insert(items);
        }
      }

      toast.success("Nesting salvo com sucesso!");
      setShowSave(false);
      setProjectName("");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Export ──────────────────────────────────────────────────

  const handleExportPdf = () => {
    if (!result) return;
    exportNestingPdf({
      projectName: projectName || "Nesting",
      materialName,
      matW: parseFloat(matWidth) || 0,
      matH: parseFloat(matHeight) || 0,
      unitPrice: parseFloat(matPrice) || 0,
      kerf: parseFloat(kerfWidth) || 0,
      singleCut,
      autoRotation,
      result,
      pdfSettings,
    });
    toast.success("PDF exportado!");
  };

  const handleExportSvg = () => {
    if (!result) return;
    const mw = parseFloat(matWidth) || 1000;
    const mh = parseFloat(matHeight) || 2000;

    result.sheets.forEach((sheet, si) => {
      let svgOut = `<svg xmlns="http://www.w3.org/2000/svg" width="${mw}mm" height="${mh}mm" viewBox="0 0 ${mw} ${mh}">\n`;
      svgOut += `  <rect x="0" y="0" width="${mw}" height="${mh}" fill="none" stroke="#000" stroke-width="0.5"/>\n`;

      sheet.pieces.forEach(p => {
        if (p.polygonPoints && p.polygonPoints.length >= 3) {
          const absPoly = translatePolygon(p.polygonPoints, p.x, p.y);
          const pts = absPoly.map(pt => `${pt.x.toFixed(2)},${pt.y.toFixed(2)}`).join(" ");
          svgOut += `  <polygon points="${pts}" fill="none" stroke="#000" stroke-width="0.3"/>\n`;
        } else {
          svgOut += `  <rect x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" fill="none" stroke="#000" stroke-width="0.3"/>\n`;
        }
      });

      svgOut += `</svg>`;
      const blob = new Blob([svgOut], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nesting_chapa_${si + 1}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    });
    toast.success("SVG exportado!");
  };

  const handleExportDxf = () => {
    if (!result) return;
    const mw = parseFloat(matWidth) || 1000;
    const mh = parseFloat(matHeight) || 2000;

    result.sheets.forEach((sheet, si) => {
      let dxf = "0\nSECTION\n2\nENTITIES\n";

      // Material boundary
      dxf += `0\nLWPOLYLINE\n8\nBORDA\n70\n1\n90\n4\n`;
      dxf += `10\n0\n20\n0\n10\n${mw}\n20\n0\n10\n${mw}\n20\n${mh}\n10\n0\n20\n${mh}\n`;

      sheet.pieces.forEach(p => {
        if (p.polygonPoints && p.polygonPoints.length >= 3) {
          const absPoly = translatePolygon(p.polygonPoints, p.x, p.y);
          dxf += `0\nLWPOLYLINE\n8\nPECAS\n70\n1\n90\n${absPoly.length}\n`;
          absPoly.forEach(pt => { dxf += `10\n${pt.x.toFixed(3)}\n20\n${pt.y.toFixed(3)}\n`; });
        } else {
          dxf += `0\nLWPOLYLINE\n8\nPECAS\n70\n1\n90\n4\n`;
          dxf += `10\n${p.x}\n20\n${p.y}\n10\n${p.x + p.width}\n20\n${p.y}\n`;
          dxf += `10\n${p.x + p.width}\n20\n${p.y + p.height}\n10\n${p.x}\n20\n${p.y + p.height}\n`;
        }
      });

      dxf += "0\nENDSEC\n0\nEOF\n";
      const blob = new Blob([dxf], { type: "application/dxf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nesting_chapa_${si + 1}.dxf`;
      a.click();
      URL.revokeObjectURL(url);
    });
    toast.success("DXF exportado!");
  };

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
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> Importar SVG
            </Button>
            {svgContent && (
              <>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-destructive" onClick={clearSvg}>
                  <Trash2 className="h-3.5 w-3.5" /> Remover
                </Button>
                <Button variant={highlightContours ? "default" : "outline"} size="sm" className="gap-1.5 text-xs"
                  onClick={() => setHighlightContours(!highlightContours)}>
                  <Eye className="h-3.5 w-3.5" /> Realçar contornos
                </Button>
              </>
            )}
          </div>

          {/* SVG Preview */}
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
                  <div className="w-full h-[300px] bg-white rounded-lg border border-border flex items-center justify-center overflow-hidden p-4">
                    <div
                      style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
                      className={`max-w-full max-h-full transition-transform [&_svg]:max-w-full [&_svg]:max-h-[268px] ${
                        highlightContours
                          ? "[&_svg]:fill-none [&_svg_*]:fill-none [&_svg_*]:stroke-[#111] [&_svg_*]:[stroke-width:1.5px] [&_svg]:stroke-[#111]"
                          : "[&_svg]:fill-none [&_svg_*]:fill-none [&_svg_*]:stroke-black [&_svg_*]:[stroke-width:1px]"
                      }`}
                      dangerouslySetInnerHTML={{ __html: svgContent }}
                    />
                  </div>
                ) : (
                  <NestingPiecesGrid pieces={importedPieces} />
                )}
              </CardContent>
            </Card>
          )}

          {/* Piece groups */}
          {pieceGroups.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">{importedPieces.filter(p => !p.excluded).length} peça(s) em {pieceGroups.length} grupo(s)</span>
              </div>
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-1">
                  {pieceGroups.map((g, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1 rounded text-xs bg-muted/30">
                      <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: getNestingPieceColor(i) }} />
                      <span className="flex-1 truncate">{g.label}</span>
                      <Badge variant="secondary" className="text-[10px]">×{g.count}</Badge>
                      <span className="text-muted-foreground">{g.width.toFixed(0)}×{g.height.toFixed(0)} mm</span>
                      <span className="text-muted-foreground text-[10px]">{g.realArea.toFixed(0)} mm²</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Individual pieces toggle */}
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Ver todas as peças individualmente
                </summary>
                <div className="space-y-1 mt-1">
                  {importedPieces.map((p) => (
                    <div key={p.id} className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${p.excluded ? "opacity-40 line-through" : ""}`}>
                      <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: p.color }} />
                      <span className="flex-1 truncate">{p.label}</span>
                      <span className="text-muted-foreground">{p.width.toFixed(0)}×{p.height.toFixed(0)}</span>
                      {p.realArea && <span className="text-muted-foreground text-[10px]">{p.realArea.toFixed(0)} mm²</span>}
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => toggleExclude(p.id)}>
                        {p.excluded ? <Eye className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      </Button>
                    </div>
                  ))}
                </div>
              </details>
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
              <FileDown className="h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" className="gap-1.5" onClick={handleExportSvg}>
              <FileImage className="h-4 w-4" /> SVG
            </Button>
            <Button variant="outline" className="gap-1.5" onClick={handleExportDxf}>
              <FileCode className="h-4 w-4" /> DXF
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

          {result.sheets.map((sheet, si) => (
            <Card key={si}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
                  Chapa {si + 1}
                  <Badge variant="outline" className="text-[10px]">{sheet.utilization.toFixed(1)}%</Badge>
                  <Badge variant="outline" className="text-[10px]">{sheet.pieces.length} peça(s)</Badge>
                  {singleCut && (
                    <Badge className="text-[10px] gap-1 bg-amber-500/15 text-amber-700 border-amber-300 hover:bg-amber-500/20">
                      <Scissors className="h-3 w-3" /> Corte Único
                    </Badge>
                  )}
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setExpandedSheet(si)}>
                  <Maximize2 className="h-3.5 w-3.5" /> Ampliar
                </Button>
              </CardHeader>
              <CardContent>
                <NestingPreview
                  sheet={sheet}
                  sheetIndex={si}
                  matW={mw}
                  matH={mh}
                  kerf={parseFloat(kerfWidth) || 0}
                  singleCut={singleCut}
                  onRotate={rotatePiece}
                  onRemove={removePieceFromResult}
                  onDrag={handleDragPiece}
                  selectedPieceId={selectedPieceId}
                  onSelectPiece={setSelectedPieceId}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Expanded Sheet Dialog ──────────────────────────── */}
      <Dialog open={expandedSheet !== null} onOpenChange={() => setExpandedSheet(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Chapa {expandedSheet !== null ? expandedSheet + 1 : ""}
              {expandedSheet !== null && result && result.sheets[expandedSheet] && (
                <>
                  <Badge variant="outline" className="text-[10px]">{result.sheets[expandedSheet].utilization.toFixed(1)}%</Badge>
                  <Badge variant="outline" className="text-[10px]">{result.sheets[expandedSheet].pieces.length} peça(s)</Badge>
                  {singleCut && (
                    <Badge className="text-[10px] gap-1 bg-amber-500/15 text-amber-700 border-amber-300">
                      <Scissors className="h-3 w-3" /> Corte Único
                    </Badge>
                  )}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {expandedSheet !== null && result && result.sheets[expandedSheet] && (
            <div className="overflow-auto max-h-[80vh]">
              <NestingPreview
                sheet={result.sheets[expandedSheet]}
                sheetIndex={expandedSheet}
                matW={mw}
                matH={mh}
                kerf={parseFloat(kerfWidth) || 0}
                singleCut={singleCut}
                onRotate={rotatePiece}
                onRemove={removePieceFromResult}
                onDrag={handleDragPiece}
                selectedPieceId={selectedPieceId}
                onSelectPiece={setSelectedPieceId}
                expanded
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

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

// ── Nesting Preview with drag support ─────────────────────────

interface NestingPreviewProps {
  sheet: { pieces: NestingPiece[]; utilization: number };
  sheetIndex: number;
  matW: number;
  matH: number;
  kerf: number;
  singleCut?: boolean;
  onRotate: (sheetIdx: number, pieceId: string) => void;
  onRemove: (sheetIdx: number, pieceId: string) => void;
  onDrag: (sheetIdx: number, pieceId: string, newX: number, newY: number) => void;
  selectedPieceId: string | null;
  onSelectPiece: (id: string | null) => void;
  expanded?: boolean;
}

function NestingPreview({ sheet, sheetIndex, matW, matH, kerf, singleCut, onRotate, onRemove, onDrag, selectedPieceId, onSelectPiece, expanded }: NestingPreviewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragState, setDragState] = useState<{ pieceId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const padding = 10;
  const maxW = expanded ? 1200 : 700;
  const maxH = expanded ? 700 : 400;
  const scaleX = (maxW - padding * 2) / matW;
  const scaleY = (maxH - padding * 2) / matH;
  const scale = Math.min(scaleX, scaleY);
  const svgW = matW * scale + padding * 2;
  const svgH = matH * scale + padding * 2;

  const handleMouseDown = useCallback((e: React.MouseEvent, pieceId: string) => {
    e.stopPropagation();
    const piece = sheet.pieces.find(p => p.id === pieceId);
    if (!piece) return;
    onSelectPiece(pieceId);
    setDragState({
      pieceId,
      startX: e.clientX,
      startY: e.clientY,
      origX: piece.x,
      origY: piece.y,
    });
  }, [sheet.pieces, onSelectPiece]);

  useEffect(() => {
    if (!dragState) return;
    const handleMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragState.startX) / scale;
      const dy = (e.clientY - dragState.startY) / scale;
      const newX = Math.max(0, Math.round(dragState.origX + dx));
      const newY = Math.max(0, Math.round(dragState.origY + dy));
      onDrag(sheetIndex, dragState.pieceId, newX, newY);
    };
    const handleUp = () => setDragState(null);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragState, scale, sheetIndex, onDrag]);

  return (
    <div>
      <svg ref={svgRef} width={svgW} height={svgH} className="border rounded bg-white cursor-crosshair">
        <rect x={padding} y={padding} width={matW * scale} height={matH * scale}
          fill="#f8f8f8" stroke="hsl(var(--border))" strokeWidth={1} />

        {/* Grid lines for reference */}
        {expanded && Array.from({ length: Math.floor(matW / 100) }).map((_, i) => (
          <line key={`gv-${i}`}
            x1={padding + (i + 1) * 100 * scale} y1={padding}
            x2={padding + (i + 1) * 100 * scale} y2={padding + matH * scale}
            stroke="#e5e5e5" strokeWidth={0.5} />
        ))}
        {expanded && Array.from({ length: Math.floor(matH / 100) }).map((_, i) => (
          <line key={`gh-${i}`}
            x1={padding} y1={padding + (i + 1) * 100 * scale}
            x2={padding + matW * scale} y2={padding + (i + 1) * 100 * scale}
            stroke="#e5e5e5" strokeWidth={0.5} />
        ))}

        {/* Pieces — render real polygon geometry */}
        {sheet.pieces.map((p) => {
          const isSelected = selectedPieceId === p.id;
          const isDragging = dragState?.pieceId === p.id;

          // Screen coordinates for the piece
          const px = padding + p.x * scale;
          const py = padding + p.y * scale;
          const pw = p.width * scale;
          const ph = p.height * scale;
          const labelCx = px + pw / 2;
          const labelCy = py + ph / 2;

          // Determine viewBox for the path — use original SVG bbox
          const vbX = p.bboxX || 0;
          const vbY = p.bboxY || 0;
          const vbW = p.bboxW || p.width;
          const vbH = p.bboxH || p.height;

          // Rotation transform applied inside the nested SVG
          const rotAngle = p.rotation || 0;
          const rotTransform = rotAngle
            ? `rotate(${rotAngle}, ${vbX + vbW / 2}, ${vbY + vbH / 2})`
            : undefined;

          const hasPath = p.pathData && p.pathData.length > 2;

          return (
            <g key={p.id}
              onMouseDown={(e) => handleMouseDown(e, p.id)}
              onClick={() => onSelectPiece(isSelected ? null : p.id)}
              className={isDragging ? "cursor-grabbing" : "cursor-grab"}>

              {/* Background rect for hit area + color fill */}
              <rect x={px} y={py} width={pw} height={ph}
                fill={p.color + "20"}
                stroke="none" />

              {/* Real path rendered via nested SVG with viewBox — clean coord mapping */}
              {hasPath && (
                <svg x={px} y={py} width={pw} height={ph}
                  viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
                  preserveAspectRatio="none"
                  overflow="visible">
                  <path
                    d={p.pathData}
                    fill={p.color + "30"}
                    stroke={isSelected ? "hsl(var(--primary))" : "#111"}
                    strokeWidth={Math.max(vbW, vbH) * 0.008}
                    transform={rotTransform}
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              )}

              {/* Selection border */}
              {isSelected && (
                <rect x={px} y={py} width={pw} height={ph}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  strokeDasharray="6 3" />
              )}

              {/* Label */}
              {pw > 25 && ph > 12 && (
                <text x={labelCx} y={labelCy - 4} textAnchor="middle" dominantBaseline="middle"
                  fontSize={Math.min(11, pw * 0.16)} fontWeight="600"
                  fill="#222" className="select-none pointer-events-none">
                  {p.label}
                </text>
              )}
              {pw > 20 && ph > 22 && (
                <text x={labelCx} y={labelCy + 8} textAnchor="middle" dominantBaseline="middle"
                  fontSize={Math.min(9, pw * 0.13)} fill="#555" className="select-none pointer-events-none">
                  {p.width.toFixed(0)}×{p.height.toFixed(0)}
                </text>
              )}
              {isDragging && (
                <g transform={`translate(${labelCx - 6}, ${labelCy - 22})`}>
                  <rect x={-2} y={-2} width={16} height={16} rx={3} fill="hsl(var(--primary))" opacity={0.8} />
                  <text x={6} y={8} textAnchor="middle" dominantBaseline="middle" fontSize={8} fill="white">⊞</text>
                </g>
              )}
            </g>
          );

          // Fallback: bbox rendering
          const px = padding + p.x * scale;
          const py = padding + p.y * scale;
          const pw = p.width * scale;
          const ph = p.height * scale;

          return (
            <g key={p.id}
              onMouseDown={(e) => handleMouseDown(e, p.id)}
              onClick={() => onSelectPiece(isSelected ? null : p.id)}
              className={isDragging ? "cursor-grabbing" : "cursor-grab"}>
              <rect x={px} y={py} width={pw} height={ph}
                fill={p.color + "35"} stroke={isSelected ? "hsl(var(--primary))" : p.color}
                strokeWidth={isSelected ? 2.5 : 1.2} rx={1} />
              {pw > 30 && ph > 14 && (
                <text x={px + pw / 2} y={py + ph / 2 - 4} textAnchor="middle" dominantBaseline="middle"
                  fontSize={Math.min(12, pw * 0.18)} fontWeight="600" fill="#222" className="select-none pointer-events-none">
                  {p.label}
                </text>
              )}
              {pw > 20 && ph > 24 && (
                <text x={px + pw / 2} y={py + ph / 2 + 10} textAnchor="middle" dominantBaseline="middle"
                  fontSize={Math.min(9, pw * 0.14)} fill="#555" className="select-none pointer-events-none">
                  {p.width.toFixed(0)}×{p.height.toFixed(0)}
                </text>
              )}
            </g>
          );
        })}

        {/* Single cut indicator */}
        {singleCut && (
          <text x={padding + 4} y={padding + matH * scale - 4}
            fontSize={10} fill="#b45309" fontWeight="600" className="select-none pointer-events-none">
            ⚡ Corte Único Ativo
          </text>
        )}
      </svg>

      {/* Actions for selected piece */}
      {selectedPieceId && (
        <div className="flex gap-1 mt-2 p-1.5 bg-primary/5 rounded border border-primary/20 items-center">
          <Move className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-primary font-medium flex-1">
            {sheet.pieces.find(p => p.id === selectedPieceId)?.label} — arraste para mover
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

// ── Grid view ─────────────────────────────────────────────────

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
  const [transformOrigin, setTransformOrigin] = useState("center center");
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setTransformOrigin(`${x}% ${y}%`);
  }, []);

  const bw = piece.bboxW || piece.width;
  const bh = piece.bboxH || piece.height;
  const maxDim = Math.max(bw, bh);
  const pad = maxDim * 0.1;

  return (
    <div
      className="relative border rounded bg-white overflow-hidden cursor-crosshair group"
      style={{ aspectRatio: "1/1" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setTransformOrigin("center center"); }}
      onMouseMove={handleMouseMove}
    >
      <div
        className="w-full h-full transition-transform duration-100 ease-out"
        style={{ transform: isHovered ? `scale(2.5)` : "scale(1)", transformOrigin }}
      >
        <svg
          viewBox={`${piece.bboxX - pad} ${piece.bboxY - pad} ${bw + pad * 2} ${bh + pad * 2}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <rect x={piece.bboxX} y={piece.bboxY} width={bw} height={bh}
            fill="none" stroke="#ddd" strokeWidth={maxDim * 0.005} strokeDasharray={`${maxDim * 0.02} ${maxDim * 0.02}`} />
          <path d={piece.pathData} fill={piece.color + "15"} stroke="#000" strokeWidth={maxDim * 0.01} />
        </svg>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1.5 py-1 pointer-events-none">
        <p className="text-[9px] text-white font-medium truncate">{piece.label}</p>
        <p className="text-[8px] text-white/70">{piece.width.toFixed(0)}×{piece.height.toFixed(0)} mm</p>
      </div>

      {isHovered && (
        <div className="absolute top-1 right-1 bg-black/60 rounded px-1 py-0.5 pointer-events-none">
          <ZoomIn className="h-3 w-3 text-white" />
        </div>
      )}
    </div>
  );
}
