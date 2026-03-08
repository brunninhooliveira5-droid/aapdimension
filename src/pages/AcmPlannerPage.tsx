import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import {
  Box, Eye, Table2, Download, FileText, Play, Settings2,
  Layers, Ruler, Wrench, Maximize2,
} from "lucide-react";
import jsPDF from "jspdf";
import {
  generateAcm,
  acmPiecesToSVG,
  acmPiecesToDXF,
  defaultAcmParams,
  ACM_OBJECT_OPTIONS,
  type AcmParams,
  type AcmResult,
  type AcmObjectType,
  type AcmMaterial,
  type AcmMode,
  type BendType,
} from "@/lib/acm-engine";
import { AcmPreview3D } from "@/components/acm-planner/AcmPreview3D";
import { AcmPreview2D } from "@/components/acm-planner/AcmPreview2D";
import { AcmPartsList } from "@/components/acm-planner/AcmPartsList";

export default function AcmPlannerPage() {
  const [params, setParams] = useState<AcmParams>(defaultAcmParams);
  const [result, setResult] = useState<AcmResult | null>(null);
  const [viewTab, setViewTab] = useState<"3d" | "2d" | "list">("3d");

  // Always generate a live 3D preview
  const liveResult = generateAcm(params);

  const update = (partial: Partial<AcmParams>) => setParams((p) => ({ ...p, ...partial }));

  const handleGenerate = useCallback(() => {
    try {
      const res = generateAcm(params);
      setResult(res);
      setViewTab("2d");
      toast.success(`Planificação gerada — ${res.pieces[0]?.panels.length || 0} painéis`);
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
    downloadFile(acmPiecesToSVG(result.pieces), `${params.projectName}.svg`, "image/svg+xml");
  };
  const exportDXF = () => {
    if (!result) return;
    downloadFile(acmPiecesToDXF(result.pieces), `${params.projectName}.dxf`, "application/dxf");
  };

  const exportPDF = () => {
    if (!result) return;
    const doc = new jsPDF("landscape", "mm", "a4");
    doc.setFontSize(14);
    doc.text(`Planificador ACM — ${params.projectName}`, 14, 15);
    doc.setFontSize(8);
    const matLabel = params.material === "acm_3mm" ? "ACM 3mm" : "ACM 4mm";
    const objLabel = ACM_OBJECT_OPTIONS.find(o => o.value === params.objectType)?.label || params.objectType;
    doc.text(`Tipo: ${objLabel} | Material: ${matLabel}`, 14, 22);
    doc.text(`Dimensões: ${params.width} × ${params.height} × ${params.depth} mm`, 14, 27);

    let y = 35;
    doc.setFontSize(7);
    const headers = ["#", "Painel", "Largura", "Altura", "Espessura", "Material"];
    const colX = [14, 28, 90, 120, 150, 180];
    headers.forEach((h, i) => doc.text(h, colX[i], y));
    y += 4;
    doc.line(14, y, 270, y);
    y += 3;

    for (const piece of result.pieces) {
      piece.panels.forEach((panel, idx) => {
        if (y > 190) { doc.addPage(); y = 15; }
        doc.text(String(idx + 1), colX[0], y);
        doc.text(panel.label, colX[1], y);
        doc.text(panel.width.toFixed(1), colX[2], y);
        doc.text(panel.height.toFixed(1), colX[3], y);
        doc.text(params.material === "acm_3mm" ? "3.0" : "4.0", colX[4], y);
        doc.text(matLabel, colX[5], y);
        y += 5;
      });
    }

    y += 5;
    doc.setFontSize(8);
    doc.text(`Área total do material: ${result.materialArea.toFixed(0)} mm²`, 14, y);
    y += 5;
    doc.text("Legenda: Vermelho = Corte | Azul = Usinagem | Verde = Dobra", 14, y);

    doc.save(`${params.projectName}.pdf`);
  };

  const thickness = params.material === "acm_3mm" ? 3 : 4;
  const matLabel = params.material === "acm_3mm" ? "ACM 3mm" : "ACM 4mm";

  const showDepth = ["box", "niche", "totem", "column"].includes(params.objectType);
  const showReturn = ["panel_return", "panel_chamfer", "niche"].includes(params.objectType);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Planificador ACM</h1>
        <p className="text-muted-foreground text-sm">
          Crie objetos paramétricos em ACM e gere a planificação para corte e usinagem CNC
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ─── Left Panel — Parameters ─── */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4 max-h-[calc(100vh-160px)] overflow-y-auto pr-1">
          {/* Project */}
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
              <div className="flex items-center justify-between">
                <Label className="text-xs">Modo</Label>
                <div className="flex items-center gap-2 text-xs">
                  <span className={params.mode === "quick" ? "text-primary font-medium" : "text-muted-foreground"}>Rápido</span>
                  <Switch
                    checked={params.mode === "advanced"}
                    onCheckedChange={(v) => update({ mode: v ? "advanced" : "quick" })}
                  />
                  <span className={params.mode === "advanced" ? "text-primary font-medium" : "text-muted-foreground"}>Avançado</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Object Type */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Box className="h-4 w-4" /> Tipo de Objeto
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Select value={params.objectType} onValueChange={(v) => update({ objectType: v as AcmObjectType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACM_OBJECT_OPTIONS.map((o) => (
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
                <Ruler className="h-4 w-4" /> Dimensões (mm)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Largura</Label>
                  <Input type="number" value={params.width} onChange={(e) => update({ width: +e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Altura</Label>
                  <Input type="number" value={params.height} onChange={(e) => update({ height: +e.target.value })} />
                </div>
              </div>
              {showDepth && (
                <div>
                  <Label className="text-xs">Profundidade</Label>
                  <Input type="number" value={params.depth} onChange={(e) => update({ depth: +e.target.value })} />
                </div>
              )}
              {showReturn && (
                <div>
                  <Label className="text-xs">Retorno</Label>
                  <Input type="number" value={params.returnDepth} onChange={(e) => update({ returnDepth: +e.target.value })} />
                </div>
              )}
              {params.objectType === "panel_chamfer" && (
                <div>
                  <Label className="text-xs">Ângulo do Chanfro (°)</Label>
                  <Input type="number" value={params.chamferAngle} onChange={(e) => update({ chamferAngle: +e.target.value })} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Material */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4" /> Material
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Select value={params.material} onValueChange={(v) => update({ material: v as AcmMaterial })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="acm_3mm">ACM 3mm</SelectItem>
                  <SelectItem value="acm_4mm">ACM 4mm</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Glue tabs */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Maximize2 className="h-4 w-4" /> Abas de Colagem
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Incluir abas</Label>
                <Switch checked={params.glueTabs} onCheckedChange={(v) => update({ glueTabs: v })} />
              </div>
              {params.glueTabs && (
                <div>
                  <Label className="text-xs">Largura da aba (mm)</Label>
                  <Input type="number" value={params.glueTabWidth} onChange={(e) => update({ glueTabWidth: +e.target.value })} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Advanced params */}
          {params.mode === "advanced" && (
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wrench className="h-4 w-4" /> Parâmetros de Usinagem
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div>
                  <Label className="text-xs">Tipo de Dobra</Label>
                  <Select value={params.bendType} onValueChange={(v) => update({ bendType: v as BendType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="v_groove">V-Groove</SelectItem>
                      <SelectItem value="channel">Canal</SelectItem>
                      <SelectItem value="score">Vinco</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Largura do Canal (mm)</Label>
                    <Input type="number" step="0.1" value={params.channelWidth} onChange={(e) => update({ channelWidth: +e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Prof. Usinagem (mm)</Label>
                    <Input type="number" step="0.1" value={params.machiningDepth} onChange={(e) => update({ machiningDepth: +e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Compensação Dobra (mm)</Label>
                    <Input type="number" step="0.1" value={params.bendAllowance} onChange={(e) => update({ bendAllowance: +e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Folga Fechamento (mm)</Label>
                    <Input type="number" step="0.1" value={params.closingGap} onChange={(e) => update({ closingGap: +e.target.value })} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generate Button */}
          <Button className="w-full" size="lg" onClick={handleGenerate}>
            <Play className="h-4 w-4 mr-2" /> Gerar Planificação
          </Button>

          {/* Stats */}
          {result && (
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Estatísticas</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Peças planificadas</span>
                  <span className="font-medium">{result.totalPieces}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Área do material</span>
                  <span className="font-medium">{result.materialArea.toFixed(0)} mm²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Painéis</span>
                  <span className="font-medium">{result.pieces.reduce((s, p) => s + p.panels.length, 0)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Linhas de dobra</span>
                  <span className="font-medium">{result.pieces.reduce((s, p) => s + p.bendLines.length, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Linhas de usinagem</span>
                  <span className="font-medium">{result.pieces.reduce((s, p) => s + p.machiningLines.length, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Linhas de corte</span>
                  <span className="font-medium">{result.pieces.reduce((s, p) => s + p.cutLines.length, 0)}</span>
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
              </div>
            )}
          </div>

          {/* Preview Area */}
          <Card className="overflow-hidden">
            <CardContent className="p-0" style={{ height: "500px" }}>
              {viewTab === "3d" && (
                <AcmPreview3D
                  faces={liveResult.faces3d}
                  dimensions={{ width: params.width, height: params.height, depth: params.depth }}
                  className="h-full"
                />
              )}
              {viewTab === "2d" && result && (
                <AcmPreview2D pieces={result.pieces} className="h-full" />
              )}
              {viewTab === "list" && result && (
                <div className="p-4 overflow-auto h-full">
                  <AcmPartsList
                    pieces={result.pieces}
                    material={matLabel}
                    thickness={thickness}
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
