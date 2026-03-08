import { useState, useCallback, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import {
  Layers, Grid3x3, Sun, Ungroup, Upload, Play, Download,
  FileText, Table2, Eye, Box, Send, Scissors, Settings2,
} from "lucide-react";
import * as THREE from "three";
import { ModelViewer3D, loadModelFile } from "@/components/slicer3d/ModelViewer3D";
import { SlicePreview2D } from "@/components/slicer3d/SlicePreview2D";
import { PartsListTable } from "@/components/slicer3d/PartsListTable";
import {
  StackedParamsPanel,
  InterlockParamsPanel,
  RadialParamsPanel,
  UnfoldParamsPanel,
} from "@/components/slicer3d/SlicerParametersPanel";
import { SlicerMaterialManager, type SlicerMaterial } from "@/components/slicer3d/SlicerMaterialManager";
import {
  stackedSlice,
  interlockedSlice,
  radialSlice,
  unfoldMesh,
  contoursToSVG,
  contoursToDXF,
  type SlicerParams,
  type InterlockParams,
  type RadialParams,
  type UnfoldParams,
  type SlicerResult,
  type SliceContour,
} from "@/lib/slicer3d-engine";
import jsPDF from "jspdf";

const defaultStackedParams: SlicerParams = {
  materialThickness: 3,
  direction: "y",
  spacing: 0,
  toolCompensation: 0,
  kerfWidth: 0.2,
  jointType: "none",
  jointWidth: 10,
  jointDepth: 5,
  jointClearance: 0.1,
  offsetMode: "center",
};

const defaultInterlockParams: InterlockParams = {
  ...defaultStackedParams,
  slicesX: 5,
  slicesY: 5,
  slotClearance: 0.1,
  slotDepth: 15,
};

const defaultRadialParams: RadialParams = {
  ...defaultStackedParams,
  divisions: 8,
  angle: 360,
  clearance: 0.1,
};

const defaultUnfoldParams: UnfoldParams = {
  ...defaultStackedParams,
  maxAngle: 120,
  autoSplit: true,
  generateTabs: false,
  generateFoldLines: true,
};

const modeTabs = [
  { value: "stacked", label: "Stacked Slices", icon: Layers },
  { value: "interlocked", label: "Interlocked", icon: Grid3x3 },
  { value: "radial", label: "Radial / Curve", icon: Sun },
  { value: "unfold", label: "Planificação", icon: Ungroup },
];

export default function Slicer3DPage() {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState("stacked");
  const [result, setResult] = useState<SlicerResult | null>(null);
  const [materialName, setMaterialName] = useState("MDF");
  const [loading, setLoading] = useState(false);
  const [viewTab, setViewTab] = useState<"3d" | "2d" | "list">("3d");

  // Params for each mode
  const [stackedParams, setStackedParams] = useState(defaultStackedParams);
  const [interlockParams, setInterlockParams] = useState(defaultInterlockParams);
  const [radialParams, setRadialParams] = useState(defaultRadialParams);
  const [unfoldParams, setUnfoldParams] = useState(defaultUnfoldParams);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const geo = await loadModelFile(file);
      setGeometry(geo);
      setFileName(file.name);
      setResult(null);
      toast.success(`Modelo "${file.name}" importado com sucesso`);
    } catch (err: any) {
      toast.error("Erro ao importar: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleProcess = useCallback(() => {
    if (!geometry) {
      toast.error("Importe um modelo 3D primeiro");
      return;
    }
    setLoading(true);
    try {
      let res: SlicerResult;
      switch (mode) {
        case "stacked":
          res = stackedSlice(geometry, stackedParams);
          break;
        case "interlocked":
          res = interlockedSlice(geometry, interlockParams);
          break;
        case "radial":
          res = radialSlice(geometry, radialParams);
          break;
        case "unfold":
          res = unfoldMesh(geometry, unfoldParams);
          break;
        default:
          res = stackedSlice(geometry, stackedParams);
      }
      setResult(res);
      setViewTab("2d");
      toast.success(`${res.stats.totalPieces} peças geradas`);
    } catch (err: any) {
      toast.error("Erro no processamento: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [geometry, mode, stackedParams, interlockParams, radialParams, unfoldParams]);

  // Export handlers
  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportSVG = () => {
    if (!result) return;
    const svg = contoursToSVG(result.contours);
    downloadFile(svg, "slicer-pieces.svg", "image/svg+xml");
  };

  const exportDXF = () => {
    if (!result) return;
    const dxf = contoursToDXF(result.contours);
    downloadFile(dxf, "slicer-pieces.dxf", "application/dxf");
  };

  const exportPDF = () => {
    if (!result) return;
    const doc = new jsPDF("landscape", "mm", "a4");
    doc.setFontSize(14);
    doc.text("Slicer 3D CNC — Lista de Peças", 14, 15);
    doc.setFontSize(8);
    doc.text(`Modo: ${mode} | Total: ${result.stats.totalPieces} peças | Material: ${materialName}`, 14, 22);

    let y = 30;
    doc.setFontSize(7);
    const headers = ["#", "Peça", "Largura", "Altura", "Espessura", "Área", "Qtd", "Material"];
    const colX = [14, 28, 60, 90, 120, 150, 185, 200];
    headers.forEach((h, i) => doc.text(h, colX[i], y));
    y += 5;
    doc.line(14, y, 280, y);
    y += 3;

    result.contours.forEach((c, idx) => {
      if (y > 190) { doc.addPage(); y = 15; }
      doc.text(String(idx + 1), colX[0], y);
      doc.text(c.label, colX[1], y);
      doc.text(c.width.toFixed(1), colX[2], y);
      doc.text(c.height.toFixed(1), colX[3], y);
      doc.text(c.thickness.toFixed(1), colX[4], y);
      doc.text(c.area.toFixed(1), colX[5], y);
      doc.text("1", colX[6], y);
      doc.text(materialName, colX[7], y);
      y += 5;
    });

    doc.save("slicer-pieces.pdf");
  };

  const slicePlanes = geometry && result
    ? result.contours.slice(0, 30).map((_, i) => {
        const p = mode === "stacked" ? stackedParams : defaultStackedParams;
        const bounds = new THREE.Box3();
        geometry.computeBoundingBox();
        bounds.copy(geometry.boundingBox!);
        const min = bounds.min[p.direction];
        const step = p.materialThickness + p.spacing;
        return { position: min + step / 2 + i * step, direction: p.direction };
      })
    : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Slicer 3D CNC</h1>
        <p className="text-muted-foreground text-sm">
          Importe modelos 3D (STL/OBJ) e converta em peças 2D prontas para corte CNC
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Panel — Parameters */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          {/* Import */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Upload className="h-4 w-4" /> Importar Modelo
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".stl,.obj"
                onChange={handleFileImport}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {fileName || "Selecionar STL / OBJ"}
              </Button>
              {fileName && (
                <p className="text-xs text-muted-foreground truncate">📁 {fileName}</p>
              )}
              <div>
                <Label className="text-xs">Material</Label>
                <Input value={materialName} onChange={(e) => setMaterialName(e.target.value)} placeholder="Ex: MDF, Acrílico..." />
              </div>
            </CardContent>
          </Card>

          {/* Mode Selection */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings2 className="h-4 w-4" /> Modo de Processamento
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Tabs value={mode} onValueChange={setMode}>
                <TabsList className="w-full flex-wrap h-auto gap-1">
                  {modeTabs.map((t) => (
                    <TabsTrigger key={t.value} value={t.value} className="gap-1 text-xs flex-1">
                      <t.icon className="h-3 w-3" /> {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <div className="mt-3">
                  <TabsContent value="stacked">
                    <StackedParamsPanel params={stackedParams} onChange={setStackedParams} />
                  </TabsContent>
                  <TabsContent value="interlocked">
                    <InterlockParamsPanel params={interlockParams} onChange={setInterlockParams} />
                  </TabsContent>
                  <TabsContent value="radial">
                    <RadialParamsPanel params={radialParams} onChange={setRadialParams} />
                  </TabsContent>
                  <TabsContent value="unfold">
                    <UnfoldParamsPanel params={unfoldParams} onChange={setUnfoldParams} />
                  </TabsContent>
                </div>
              </Tabs>

              <Button className="w-full mt-4" onClick={handleProcess} disabled={!geometry || loading}>
                <Play className="h-4 w-4 mr-2" />
                {loading ? "Processando..." : "Processar"}
              </Button>
            </CardContent>
          </Card>

          {/* Stats */}
          {result && (
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Estatísticas</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Peças geradas</span>
                  <span className="font-medium">{result.stats.totalPieces}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Área total</span>
                  <span className="font-medium">{result.stats.totalArea.toFixed(1)} mm²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bounding Box</span>
                  <span className="font-mono text-xs">
                    {result.stats.boundingBox.x.toFixed(1)} × {result.stats.boundingBox.y.toFixed(1)} × {result.stats.boundingBox.z.toFixed(1)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel — Preview & Results */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {/* View Switcher */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1">
              <Button
                variant={viewTab === "3d" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewTab("3d")}
              >
                <Box className="h-3.5 w-3.5 mr-1" /> 3D
              </Button>
              <Button
                variant={viewTab === "2d" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewTab("2d")}
                disabled={!result}
              >
                <Eye className="h-3.5 w-3.5 mr-1" /> 2D
              </Button>
              <Button
                variant={viewTab === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewTab("list")}
                disabled={!result}
              >
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
                geometry ? (
                  <ModelViewer3D geometry={geometry} slicePlanes={slicePlanes} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                    <Box className="h-16 w-16 opacity-20" />
                    <p className="text-sm">Importe um modelo STL ou OBJ para visualizar</p>
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" /> Importar Modelo
                    </Button>
                  </div>
                )
              )}
              {viewTab === "2d" && result && (
                <SlicePreview2D contours={result.contours} className="h-full" />
              )}
              {viewTab === "list" && result && (
                <div className="p-4 overflow-auto h-full">
                  <PartsListTable contours={result.contours} materialName={materialName} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
