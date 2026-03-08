import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import {
  Box, Eye, Table2, Download, FileText, Send, Scissors,
  Play, Settings2, Layers, Grid3x3, Ruler,
} from "lucide-react";
import jsPDF from "jspdf";
import {
  generateBox,
  boxPiecesToSVG,
  boxPiecesToDXF,
  defaultBoxParams,
  type BoxParams,
  type BoxResult,
  type BoxType,
  type FabMode,
  type JointType,
  type CornerRelief,
  type DimensionMode,
  type OffsetMode,
} from "@/lib/box-generator-engine";
import { BoxPreview2D } from "@/components/box-generator/BoxPreview2D";
import { BoxPreview3D } from "@/components/box-generator/BoxPreview3D";
import { BoxPartsList } from "@/components/box-generator/BoxPartsList";

const boxTypeOptions: { value: BoxType; label: string }[] = [
  { value: "closed", label: "Caixa Fechada" },
  { value: "open", label: "Caixa Aberta" },
  { value: "lid_simple", label: "Tampa Simples" },
  { value: "lid_sliding", label: "Tampa Deslizante" },
  { value: "dividers", label: "Com Divisórias" },
  { value: "polygon", label: "Poligonal" },
  { value: "curved", label: "Curva" },
];

const jointOptions: { value: JointType; label: string }[] = [
  { value: "finger", label: "Finger Joint" },
  { value: "straight", label: "Junta Reta" },
  { value: "slot", label: "Encaixe Slot" },
  { value: "tslot", label: "T-Slot" },
];

const cornerOptions: { value: CornerRelief; label: string }[] = [
  { value: "none", label: "Nenhum" },
  { value: "dogbone", label: "Dogbone" },
  { value: "tbone", label: "T-Bone" },
  { value: "fillet", label: "Filete de Alívio" },
];

export default function BoxGeneratorPage() {
  const [params, setParams] = useState<BoxParams>(defaultBoxParams);
  const [result, setResult] = useState<BoxResult | null>(null);
  const [viewTab, setViewTab] = useState<"3d" | "2d" | "list">("3d");

  const update = (partial: Partial<BoxParams>) => setParams((p) => ({ ...p, ...partial }));

  const handleGenerate = useCallback(() => {
    try {
      const res = generateBox(params);
      setResult(res);
      setViewTab("2d");
      toast.success(`${res.totalPieces} peças geradas com sucesso`);
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  }, [params]);

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportSVG = () => {
    if (!result) return;
    downloadFile(boxPiecesToSVG(result.pieces), `${params.projectName}.svg`, "image/svg+xml");
  };

  const exportDXF = () => {
    if (!result) return;
    downloadFile(boxPiecesToDXF(result.pieces), `${params.projectName}.dxf`, "application/dxf");
  };

  const exportPDF = () => {
    if (!result) return;
    const doc = new jsPDF("landscape", "mm", "a4");
    doc.setFontSize(14);
    doc.text(`Gerador de Caixas CNC — ${params.projectName}`, 14, 15);
    doc.setFontSize(8);
    doc.text(`Tipo: ${params.boxType} | Modo: ${params.fabMode.toUpperCase()} | Material: ${params.materialName} (${params.materialThickness}mm)`, 14, 22);
    doc.text(`Dimensões: ${params.width} × ${params.height} × ${params.depth} ${params.unit} (${params.dimensionMode === "internal" ? "internas" : "externas"})`, 14, 27);

    let y = 35;
    doc.setFontSize(7);
    const headers = ["#", "Peça", "Largura", "Altura", "Espessura", "Qtd", "Material"];
    const colX = [14, 28, 80, 110, 140, 165, 185];
    headers.forEach((h, i) => doc.text(h, colX[i], y));
    y += 4;
    doc.line(14, y, 270, y);
    y += 3;

    result.pieces.forEach((p, idx) => {
      if (y > 190) { doc.addPage(); y = 15; }
      doc.text(String(idx + 1), colX[0], y);
      doc.text(p.label, colX[1], y);
      doc.text(p.width.toFixed(1), colX[2], y);
      doc.text(p.height.toFixed(1), colX[3], y);
      doc.text(params.materialThickness.toFixed(1), colX[4], y);
      doc.text(String(p.quantity), colX[5], y);
      doc.text(params.materialName, colX[6], y);
      y += 5;
    });

    doc.save(`${params.projectName}.pdf`);
  };

  const showLid = params.boxType === "lid_simple" || params.boxType === "lid_sliding";
  const showDividers = params.boxType === "dividers" || params.dividersH > 0 || params.dividersV > 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gerador de Caixas CNC / Laser</h1>
        <p className="text-muted-foreground text-sm">
          Gere caixas paramétricas prontas para corte CNC Router ou Laser
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ─── Left Panel — Parameters ─── */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4 max-h-[calc(100vh-160px)] overflow-y-auto pr-1">
          {/* Project & Mode */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings2 className="h-4 w-4" /> Projeto
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div>
                <Label className="text-xs">Nome do Projeto</Label>
                <Input value={params.projectName} onChange={(e) => update({ projectName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Unidade</Label>
                  <Select value={params.unit} onValueChange={(v) => update({ unit: v as "mm" | "in" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mm">mm</SelectItem>
                      <SelectItem value="in">Polegadas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Fabricação</Label>
                  <Select value={params.fabMode} onValueChange={(v) => update({ fabMode: v as FabMode })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="laser">Laser</SelectItem>
                      <SelectItem value="cnc">CNC Router</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Box Type */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Box className="h-4 w-4" /> Tipo de Caixa
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Select value={params.boxType} onValueChange={(v) => update({ boxType: v as BoxType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {boxTypeOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Dimensions */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Ruler className="h-4 w-4" /> Dimensões
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <RadioGroup
                value={params.dimensionMode}
                onValueChange={(v) => update({ dimensionMode: v as DimensionMode })}
                className="flex gap-4"
              >
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="external" id="ext" />
                  <Label htmlFor="ext" className="text-xs">Externas</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="internal" id="int" />
                  <Label htmlFor="int" className="text-xs">Internas</Label>
                </div>
              </RadioGroup>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Largura</Label>
                  <Input type="number" value={params.width} onChange={(e) => update({ width: +e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Altura</Label>
                  <Input type="number" value={params.height} onChange={(e) => update({ height: +e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Profundidade</Label>
                  <Input type="number" value={params.depth} onChange={(e) => update({ depth: +e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Material */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4" /> Material
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Espessura ({params.unit})</Label>
                  <Input type="number" value={params.materialThickness} onChange={(e) => update({ materialThickness: +e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Nome do Material</Label>
                  <Input value={params.materialName} onChange={(e) => update({ materialName: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Joints */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Grid3x3 className="h-4 w-4" /> Encaixe
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <Select value={params.jointType} onValueChange={(v) => update({ jointType: v as JointType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {jointOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Mín. Dedo</Label>
                  <Input type="number" value={params.fingerMinSize} onChange={(e) => update({ fingerMinSize: +e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Máx. Dedo</Label>
                  <Input type="number" value={params.fingerMaxSize} onChange={(e) => update({ fingerMaxSize: +e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Folga</Label>
                  <Input type="number" step="0.05" value={params.fingerClearance} onChange={(e) => update({ fingerClearance: +e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cut Compensation */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Compensação de Corte</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {params.fabMode === "laser" ? (
                <div>
                  <Label className="text-xs">Kerf ({params.unit})</Label>
                  <Input type="number" step="0.05" value={params.kerf} onChange={(e) => update({ kerf: +e.target.value })} />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Ø Fresa ({params.unit})</Label>
                      <Input type="number" value={params.toolDiameter} onChange={(e) => update({ toolDiameter: +e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Tipo de Corte</Label>
                      <Select value={params.offsetMode} onValueChange={(v) => update({ offsetMode: v as OffsetMode })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="center">Centro</SelectItem>
                          <SelectItem value="internal">Interno</SelectItem>
                          <SelectItem value="external">Externo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Separator />
                  <Label className="text-xs font-medium">Cantos Internos</Label>
                  <Select value={params.cornerRelief} onValueChange={(v) => update({ cornerRelief: v as CornerRelief })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {cornerOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {params.cornerRelief !== "none" && (
                    <div>
                      <Label className="text-xs">Tamanho Alívio</Label>
                      <Input type="number" value={params.reliefSize} onChange={(e) => update({ reliefSize: +e.target.value })} />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Lid options */}
          {showLid && (
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Tampa</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div>
                  <Label className="text-xs">Folga da Tampa</Label>
                  <Input type="number" step="0.1" value={params.lidClearance} onChange={(e) => update({ lidClearance: +e.target.value })} />
                </div>
                {params.boxType === "lid_sliding" && (
                  <div>
                    <Label className="text-xs">Profundidade do Trilho</Label>
                    <Input type="number" value={params.slidingTrackDepth} onChange={(e) => update({ slidingTrackDepth: +e.target.value })} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dividers */}
          {(params.boxType === "dividers" || showDividers) && (
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Divisórias</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Horizontais</Label>
                    <Input type="number" min="0" value={params.dividersH} onChange={(e) => update({ dividersH: +e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Verticais</Label>
                    <Input type="number" min="0" value={params.dividersV} onChange={(e) => update({ dividersV: +e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Espessura Divisória</Label>
                  <Input type="number" value={params.dividerThickness} onChange={(e) => update({ dividerThickness: +e.target.value })} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generate Button */}
          <Button className="w-full" size="lg" onClick={handleGenerate}>
            <Play className="h-4 w-4 mr-2" /> Gerar Caixa
          </Button>

          {/* Stats */}
          {result && (
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Estatísticas</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total de peças</span>
                  <span className="font-medium">{result.totalPieces}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Área total</span>
                  <span className="font-medium">{result.stats.totalArea.toFixed(0)} {params.unit}²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipos de peça</span>
                  <span className="font-medium">{result.pieces.length}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ─── Right Panel — Preview ─── */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {/* View Switcher */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1">
              <Button variant={viewTab === "3d" ? "default" : "outline"} size="sm" onClick={() => setViewTab("3d")}>
                <Box className="h-3.5 w-3.5 mr-1" /> 3D
              </Button>
              <Button variant={viewTab === "2d" ? "default" : "outline"} size="sm" onClick={() => setViewTab("2d")} disabled={!result}>
                <Eye className="h-3.5 w-3.5 mr-1" /> 2D
              </Button>
              <Button variant={viewTab === "list" ? "default" : "outline"} size="sm" onClick={() => setViewTab("list")} disabled={!result}>
                <Table2 className="h-3.5 w-3.5 mr-1" /> Lista
              </Button>
            </div>

            {result && (
              <div className="flex gap-1 flex-wrap">
                <Button variant="outline" size="sm" onClick={exportDXF}>
                  <Download className="h-3.5 w-3.5 mr-1" /> DXF
                </Button>
                <Button variant="outline" size="sm" onClick={exportSVG}>
                  <Download className="h-3.5 w-3.5 mr-1" /> SVG
                </Button>
                <Button variant="outline" size="sm" onClick={exportPDF}>
                  <FileText className="h-3.5 w-3.5 mr-1" /> PDF
                </Button>
                <Button variant="secondary" size="sm" onClick={() => toast.info("Em breve: enviar para Plano de Corte")}>
                  <Send className="h-3.5 w-3.5 mr-1" /> Plano de Corte
                </Button>
                <Button variant="secondary" size="sm" onClick={() => toast.info("Em breve: enviar para Nesting")}>
                  <Scissors className="h-3.5 w-3.5 mr-1" /> Nesting
                </Button>
              </div>
            )}
          </div>

          {/* Preview Area */}
          <Card className="overflow-hidden">
            <CardContent className="p-0" style={{ height: "500px" }}>
              {viewTab === "3d" && (
                <BoxPreview3D params={params} className="h-full" />
              )}
              {viewTab === "2d" && result && (
                <BoxPreview2D pieces={result.pieces} className="h-full" />
              )}
              {viewTab === "list" && result && (
                <div className="p-4 overflow-auto h-full">
                  <BoxPartsList
                    pieces={result.pieces}
                    materialName={params.materialName}
                    thickness={params.materialThickness}
                    unit={params.unit}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
