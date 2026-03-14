import { useState, useCallback, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Upload, FileUp, Download, Eye, Layers, AlertTriangle, Info,
  CheckCircle2, RotateCcw, Box, ArrowRight, Ruler, Grid3x3, Zap,
} from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { toast } from "sonner";
import {
  reconstructSurface,
  surfaceInterp,
  generateMachiningMapGcode,
  defaultMachiningMapConfig,
  type ReconstructedSurface,
  type MachiningMapConfig,
  type MachiningMapResult,
} from "@/lib/machining-map-engine";
import { analyzeGcode, type GcodeAnalysis } from "@/lib/z-mapping-engine";

// ── 3D Surface Viewer ─────────────────────────────────────────

function SurfaceMesh3D({ surface }: { surface: ReconstructedSurface }) {
  const geometry = useMemo(() => {
    const { gridCols, gridRows, spacingX, spacingY, xMin, yMin, grid, zMin, zMax } = surface;
    if (gridCols < 2 || gridRows < 2) return null;

    const geom = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const zRange = (zMax - zMin) || 1;

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const x = xMin + c * spacingX;
        const y = yMin + r * spacingY;
        const z = grid[r]?.[c] ?? 0;
        vertices.push(x, y, z);

        // Color by height
        const t = (z - zMin) / zRange;
        const color = new THREE.Color();
        if (t < 0.25) color.setHSL(0.6, 0.8, 0.3 + t * 2);
        else if (t < 0.5) color.setHSL(0.35, 0.8, 0.4 + (t - 0.25) * 1.5);
        else if (t < 0.75) color.setHSL(0.15, 0.9, 0.4 + (t - 0.5) * 1.5);
        else color.setHSL(0.0, 0.9, 0.4 + (t - 0.75) * 1.2);
        colors.push(color.r, color.g, color.b);
      }
    }

    for (let r = 0; r < gridRows - 1; r++) {
      for (let c = 0; c < gridCols - 1; c++) {
        const i = r * gridCols + c;
        indices.push(i, i + 1, i + gridCols);
        indices.push(i + 1, i + gridCols + 1, i + gridCols);
      }
    }

    geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }, [surface]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} />
    </mesh>
  );
}

function ToolpathLine({ gcode, surface, config }: { gcode: string; surface: ReconstructedSurface; config: MachiningMapConfig }) {
  const points = useMemo(() => {
    const lines = gcode.split("\n");
    const pts: THREE.Vector3[] = [];
    let curX = 0, curY = 0, curZ = 0, curG = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("(") || trimmed.startsWith(";") || trimmed.startsWith("%")) continue;
      const upper = trimmed.toUpperCase();
      const gm = upper.match(/G(\d+)/);
      if (gm) curG = parseInt(gm[1], 10);
      const xm = upper.match(/X([+-]?\d*\.?\d+)/);
      const ym = upper.match(/Y([+-]?\d*\.?\d+)/);
      const zm = upper.match(/Z([+-]?\d*\.?\d+)/);
      const newX = xm ? parseFloat(xm[1]) : curX;
      const newY = ym ? parseFloat(ym[1]) : curY;
      const newZ = zm ? parseFloat(zm[1]) : curZ;

      if (curG === 1 && newZ < 0) {
        const offset = surfaceInterp(newX, newY, surface);
        pts.push(new THREE.Vector3(newX, newY, newZ + offset));
      } else {
        pts.push(new THREE.Vector3(newX, newY, newZ));
      }
      curX = newX; curY = newY; curZ = newZ;
    }
    return pts;
  }, [gcode, surface, config]);

  if (points.length < 2) return null;
  const geom = new THREE.BufferGeometry().setFromPoints(points);
  return (
    <line>
      <primitive object={geom} attach="geometry" />
      <lineBasicMaterial color="#f59e0b" linewidth={1} />
    </line>
  );
}

function Scene3D({
  surface,
  flatGcode,
  config,
  showToolpath,
}: {
  surface: ReconstructedSurface;
  flatGcode: string | null;
  config: MachiningMapConfig;
  showToolpath: boolean;
}) {
  const center = useMemo(() => {
    const cx = (surface.xMin + surface.xMax) / 2;
    const cy = (surface.yMin + surface.yMax) / 2;
    const cz = (surface.zMin + surface.zMax) / 2;
    return new THREE.Vector3(cx, cy, cz);
  }, [surface]);

  const extent = Math.max(surface.xMax - surface.xMin, surface.yMax - surface.yMin, 50);

  return (
    <Canvas camera={{ position: [center.x + extent, center.y - extent * 0.6, center.z + extent * 0.8], fov: 45, near: 0.1, far: 10000 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[extent, extent, extent]} intensity={0.7} />
      <SurfaceMesh3D surface={surface} />
      {showToolpath && flatGcode && <ToolpathLine gcode={flatGcode} surface={surface} config={config} />}
      <OrbitControls target={center} />
      <gridHelper
        args={[extent * 1.5, 20]}
        rotation={[Math.PI / 2, 0, 0]}
        position={[center.x, center.y, surface.zMin - 1]}
      />
    </Canvas>
  );
}

// ── Tip component ─────────────────────────────────────────────

function HelpTip({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help inline ml-1" />
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[220px] text-xs">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function MachiningMapPage() {
  // Surface file
  const [surfaceGcode, setSurfaceGcode] = useState<string | null>(null);
  const [surfaceFileName, setSurfaceFileName] = useState("");
  const [surfaceAnalysis, setSurfaceAnalysis] = useState<GcodeAnalysis | null>(null);
  const [surface, setSurface] = useState<ReconstructedSurface | null>(null);

  // Flat file
  const [flatGcode, setFlatGcode] = useState<string | null>(null);
  const [flatFileName, setFlatFileName] = useState("");
  const [flatAnalysis, setFlatAnalysis] = useState<GcodeAnalysis | null>(null);

  // Config
  const [config, setConfig] = useState<MachiningMapConfig>({ ...defaultMachiningMapConfig });

  // Result
  const [result, setResult] = useState<MachiningMapResult | null>(null);

  // View
  const [viewTab, setViewTab] = useState<"surface" | "toolpath">("surface");
  const [showToolpath, setShowToolpath] = useState(true);

  const surfaceInputRef = useRef<HTMLInputElement>(null);
  const flatInputRef = useRef<HTMLInputElement>(null);

  const handleSurfaceFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setSurfaceGcode(text);
      setSurfaceFileName(file.name);
      const analysis = analyzeGcode(text);
      setSurfaceAnalysis(analysis);

      const surf = reconstructSurface(text, config);
      setSurface(surf);
      setResult(null);
      toast.success(`Superfície reconstruída: ${surf.gridCols}×${surf.gridRows} pontos`);
    };
    reader.readAsText(file);
  }, [config]);

  const handleFlatFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setFlatGcode(text);
      setFlatFileName(file.name);
      setFlatAnalysis(analyzeGcode(text));
      setResult(null);
      toast.success("Arquivo plano carregado");
    };
    reader.readAsText(file);
  }, []);

  const handleReconstructSurface = useCallback(() => {
    if (!surfaceGcode) return;
    const surf = reconstructSurface(surfaceGcode, config);
    setSurface(surf);
    setResult(null);
    toast.success(`Superfície reconstruída: ${surf.gridCols}×${surf.gridRows} pontos`);
  }, [surfaceGcode, config]);

  const handleGenerate = useCallback(() => {
    if (!flatGcode || !surface) {
      toast.error("Carregue ambos os arquivos primeiro");
      return;
    }
    const r = generateMachiningMapGcode(flatGcode, surface, config, flatFileName);
    setResult(r);
    toast.success("G-code compensado gerado com sucesso!");
  }, [flatGcode, surface, config, flatFileName]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    const blob = new Blob([result.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const handleReset = () => {
    setSurfaceGcode(null);
    setSurfaceFileName("");
    setSurfaceAnalysis(null);
    setSurface(null);
    setFlatGcode(null);
    setFlatFileName("");
    setFlatAnalysis(null);
    setResult(null);
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-background">
      {/* ── Top bar ── */}
      <div className="shrink-0 border-b border-border bg-card px-4 py-2 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold">Mapa por Usinagem</h1>
        </div>
        <Separator orientation="vertical" className="h-5" />
        <Badge variant="outline" className="text-[10px]">
          {surfaceFileName ? surfaceFileName : "Nenhum arquivo de superfície"}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {flatFileName ? flatFileName : "Nenhum arquivo plano"}
        </Badge>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs gap-1">
            <RotateCcw className="h-3 w-3" /> Limpar
          </Button>
          {surface && flatGcode && (
            <Button size="sm" onClick={handleGenerate} className="h-7 text-xs gap-1">
              <Zap className="h-3 w-3" /> Gerar Compensado
            </Button>
          )}
          {result && (
            <Button size="sm" variant="secondary" onClick={handleDownload} className="h-7 text-xs gap-1">
              <Download className="h-3 w-3" /> Baixar
            </Button>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left panel ── */}
        <div className="w-[300px] shrink-0 border-r border-border bg-card/50">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-4">
              {/* Block 1: Surface file */}
              <Card className="border-primary/20">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                    <Box className="h-3.5 w-3.5 text-primary" />
                    Arquivo que Gerou a Superfície
                    <HelpTip text="Carregue o G-code da usinagem anterior que criou a superfície da peça." />
                  </CardTitle>
                  <CardDescription className="text-[10px]">
                    G-code da usinagem anterior
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-1 space-y-2">
                  <input ref={surfaceInputRef} type="file" accept=".nc,.tap,.gcode,.txt,.ngc" className="hidden" onChange={handleSurfaceFile} />
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1" onClick={() => surfaceInputRef.current?.click()}>
                    <Upload className="h-3 w-3" />
                    {surfaceFileName || "Carregar G-code da superfície"}
                  </Button>
                  {surfaceAnalysis && (
                    <div className="text-[10px] text-muted-foreground space-y-0.5 bg-muted/50 rounded p-2">
                      <p>Área: {surfaceAnalysis.width.toFixed(1)} × {surfaceAnalysis.height.toFixed(1)} mm</p>
                      <p>Linhas: {surfaceAnalysis.lineCount} | Arcos: {surfaceAnalysis.arcCount}</p>
                    </div>
                  )}
                  {surface && (
                    <div className="text-[10px] space-y-0.5 bg-primary/5 border border-primary/10 rounded p-2">
                      <p className="font-medium text-primary">Superfície reconstruída ✓</p>
                      <p className="text-muted-foreground">Grade: {surface.gridCols}×{surface.gridRows}</p>
                      <p className="text-muted-foreground">Z: {surface.zMin.toFixed(2)} a {surface.zMax.toFixed(2)} mm</p>
                      <p className="text-muted-foreground">Variação: {(surface.zMax - surface.zMin).toFixed(2)} mm</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-center">
                <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
              </div>

              {/* Block 2: Flat file */}
              <Card className="border-amber-500/20">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                    <FileUp className="h-3.5 w-3.5 text-amber-500" />
                    Arquivo para Aplicar sobre a Superfície
                    <HelpTip text="Carregue o G-code plano que será compensado para acompanhar a superfície." />
                  </CardTitle>
                  <CardDescription className="text-[10px]">
                    G-code plano para compensar
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-1 space-y-2">
                  <input ref={flatInputRef} type="file" accept=".nc,.tap,.gcode,.txt,.ngc" className="hidden" onChange={handleFlatFile} />
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1" onClick={() => flatInputRef.current?.click()}>
                    <Upload className="h-3 w-3" />
                    {flatFileName || "Carregar G-code plano"}
                  </Button>
                  {flatAnalysis && (
                    <div className="text-[10px] text-muted-foreground space-y-0.5 bg-muted/50 rounded p-2">
                      <p>Área: {flatAnalysis.width.toFixed(1)} × {flatAnalysis.height.toFixed(1)} mm</p>
                      <p>Linhas: {flatAnalysis.lineCount} | Arcos: {flatAnalysis.arcCount}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Separator />

              {/* Configuration */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold flex items-center gap-1">
                  <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                  Configurações
                </h3>
                <div className="space-y-2">
                  <div>
                    <Label className="text-[10px]">
                      Resolução da grade (mm)
                      <HelpTip text="Distância entre pontos da grade virtual. Menor = mais preciso, mais lento." />
                    </Label>
                    <Input
                      type="number" step="0.5" min="0.5" max="50"
                      value={config.gridResolution}
                      onChange={(e) => setConfig(prev => ({ ...prev, gridResolution: parseFloat(e.target.value) || 5 }))}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">
                      Segmento máximo (mm)
                      <HelpTip text="Tamanho máximo de cada segmento de corte. Menor = compensação mais suave." />
                    </Label>
                    <Input
                      type="number" step="0.5" min="0.5" max="50"
                      value={config.maxSegmentLen}
                      onChange={(e) => setConfig(prev => ({ ...prev, maxSegmentLen: parseFloat(e.target.value) || 5 }))}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">
                      Casas decimais
                      <HelpTip text="Precisão numérica do G-code gerado." />
                    </Label>
                    <Input
                      type="number" step="1" min="1" max="6"
                      value={config.decimalPlaces}
                      onChange={(e) => setConfig(prev => ({ ...prev, decimalPlaces: parseInt(e.target.value) || 4 }))}
                      className="h-7 text-xs"
                    />
                  </div>

                  {surface && (
                    <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={handleReconstructSurface}>
                      <Grid3x3 className="h-3 w-3 mr-1" /> Recalcular Superfície
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              {/* Alert */}
              <Alert className="border-amber-500/30 bg-amber-500/5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-[10px] text-muted-foreground">
                  Este modo funciona melhor quando a peça permanece na mesma posição e a superfície real corresponde à usinagem anterior.
                </AlertDescription>
              </Alert>
            </div>
          </ScrollArea>
        </div>

        {/* ── Center: 3D Viewer ── */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="shrink-0 border-b border-border px-3 py-1.5 flex items-center gap-2">
            <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as typeof viewTab)} className="flex-1">
              <TabsList className="h-7">
                <TabsTrigger value="surface" className="text-[10px] h-5 px-2">Superfície 3D</TabsTrigger>
                <TabsTrigger value="toolpath" className="text-[10px] h-5 px-2" disabled={!flatGcode}>
                  Percurso Compensado
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 min-h-0 relative">
            {!surface ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Layers className="h-12 w-12 opacity-20" />
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium">Nenhuma superfície carregada</p>
                  <p className="text-xs">Carregue o G-code da usinagem anterior para reconstruir o mapa virtual da superfície.</p>
                </div>
              </div>
            ) : (
              <Canvas camera={{ position: [100, -60, 80], fov: 45, near: 0.1, far: 10000 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[200, 200, 200]} intensity={0.7} />
                <SurfaceMesh3D surface={surface} />
                {viewTab === "toolpath" && flatGcode && (
                  <ToolpathLine gcode={flatGcode} surface={surface} config={config} />
                )}
                <OrbitControls />
                <gridHelper
                  args={[Math.max(surface.xMax - surface.xMin, surface.yMax - surface.yMin, 50) * 1.5, 20]}
                  rotation={[Math.PI / 2, 0, 0]}
                  position={[(surface.xMin + surface.xMax) / 2, (surface.yMin + surface.yMax) / 2, surface.zMin - 1]}
                />
              </Canvas>
            )}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="w-[240px] shrink-0 border-l border-border bg-card/50">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-4">
              {/* Stats */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold">Estatísticas</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-muted/50 rounded p-1.5 text-center">
                    <p className="text-[9px] text-muted-foreground">Pontos</p>
                    <p className="text-sm font-bold">{surface ? surface.points.length : "–"}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-1.5 text-center">
                    <p className="text-[9px] text-muted-foreground">Grade</p>
                    <p className="text-sm font-bold">{surface ? `${surface.gridCols}×${surface.gridRows}` : "–"}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-1.5 text-center">
                    <p className="text-[9px] text-muted-foreground">Z mín</p>
                    <p className="text-sm font-bold">{surface ? surface.zMin.toFixed(2) : "–"}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-1.5 text-center">
                    <p className="text-[9px] text-muted-foreground">Z máx</p>
                    <p className="text-sm font-bold">{surface ? surface.zMax.toFixed(2) : "–"}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold">Ações</h3>
                <Button
                  className="w-full h-8 text-xs gap-1"
                  onClick={handleGenerate}
                  disabled={!surface || !flatGcode}
                >
                  <Zap className="h-3 w-3" /> Gerar G-code Compensado
                </Button>
                {result && (
                  <Button variant="secondary" className="w-full h-8 text-xs gap-1" onClick={handleDownload}>
                    <Download className="h-3 w-3" /> Baixar {result.fileName}
                  </Button>
                )}
              </div>

              {/* Result info */}
              {result && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      Resultado
                    </h3>
                    <div className="text-[10px] space-y-0.5 bg-green-500/5 border border-green-500/10 rounded p-2">
                      <p>Arquivo: <span className="font-medium">{result.fileName}</span></p>
                      <p>Linhas processadas: {result.linesProcessed}</p>
                      <p>Segmentos criados: {result.segmentsCreated}</p>
                      <p>Pontos de superfície: {result.surfacePoints}</p>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Status */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold">Status</h3>
                <StatusItem label="Superfície carregada" ok={!!surface} />
                <StatusItem label="Arquivo plano carregado" ok={!!flatGcode} />
                <StatusItem label="G-code gerado" ok={!!result} />
              </div>

              <Separator />

              {/* How it works */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  Como funciona
                </h3>
                <div className="text-[10px] text-muted-foreground space-y-1.5">
                  <p>1. Carregue o G-code que <span className="font-medium">criou a superfície</span> da peça.</p>
                  <p>2. O sistema reconstrói um <span className="font-medium">mapa virtual</span> da superfície.</p>
                  <p>3. Carregue o <span className="font-medium">novo G-code plano</span> que deseja aplicar.</p>
                  <p>4. O sistema <span className="font-medium">ajusta a altura</span> do novo percurso para acompanhar a superfície.</p>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* ── Bottom status bar ── */}
      <div className="shrink-0 border-t border-border bg-card px-4 py-1 flex items-center gap-4 text-[10px] text-muted-foreground">
        <span>Mapa por Usinagem v1.0</span>
        <Separator orientation="vertical" className="h-3" />
        <span>{surfaceFileName ? `Superfície: ${surfaceFileName}` : "Sem superfície"}</span>
        <Separator orientation="vertical" className="h-3" />
        <span>{flatFileName ? `Plano: ${flatFileName}` : "Sem arquivo plano"}</span>
        {result && (
          <>
            <Separator orientation="vertical" className="h-3" />
            <span className="text-green-600 dark:text-green-400 font-medium">
              ✓ G-code pronto para exportação
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function StatusItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      <div className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-green-500" : "bg-muted-foreground/30"}`} />
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}
