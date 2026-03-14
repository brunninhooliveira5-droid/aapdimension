import { useState, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Upload, Grid3x3, Download, Play, AlertTriangle, CheckCircle2,
  FileText, Settings2, Table2, ClipboardPaste, FileUp, Crosshair,
  ArrowRight, Scan, Database, Wrench
} from "lucide-react";
import {
  analyzeGcode, generateMesh, generateProbeGcode, importProbeData,
  generateCompensatedGcode, defaultConfigMM, defaultConfigInch,
  fmt, type ZUnit, type GcodeAnalysis, type MeshConfig, type MeshInfo,
  type MeshPoint, type ControllerType, type CompensationResult,
} from "@/lib/z-mapping-engine";

// ── Step indicator ──────────────────────────────────────
function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { num: 1, label: "Rotina de Mapeamento", icon: Scan },
    { num: 2, label: "Dados do Probe", icon: Database },
    { num: 3, label: "G-code Compensado", icon: Wrench },
  ];

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 py-4 px-2">
      {steps.map((step, i) => (
        <div key={step.num} className="flex items-center gap-1 sm:gap-2">
          <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-lg border transition-all ${
            currentStep >= step.num
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-muted/30 border-border text-muted-foreground"
          }`}>
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              currentStep >= step.num
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}>
              {currentStep > step.num ? <CheckCircle2 className="h-3.5 w-3.5" /> : step.num}
            </div>
            <span className="text-xs font-medium hidden sm:inline">{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${currentStep > step.num ? "text-primary" : "text-muted-foreground/40"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── 2D Preview ──────────────────────────────────────────────
function MeshPreview2D({ mesh, analysis, config }: { mesh: MeshInfo | null; analysis: GcodeAnalysis | null; config: MeshConfig }) {
  if (!mesh) return null;
  const pad = 20;
  const allX = mesh.points.map(p => p.x);
  const allY = mesh.points.map(p => p.y);
  let minX = Math.min(...allX), maxX = Math.max(...allX);
  let minY = Math.min(...allY), maxY = Math.max(...allY);

  if (analysis && analysis.width > 0) {
    minX = Math.min(minX, analysis.xMin);
    maxX = Math.max(maxX, analysis.xMax);
    minY = Math.min(minY, analysis.yMin);
    maxY = Math.max(maxY, analysis.yMax);
  }

  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const svgW = 500;
  const svgH = (h / w) * (svgW - 2 * pad) + 2 * pad;
  const scale = (svgW - 2 * pad) / w;

  const tx = (x: number) => pad + (x - minX) * scale;
  const ty = (y: number) => svgH - pad - (y - minY) * scale;

  const meshXMin = config.xStart;
  const meshYMin = config.yStart;
  const meshXMax = config.xStart + config.width;
  const meshYMax = config.yStart + config.height;

  const jobOutside = analysis && analysis.width > 0 && (
    analysis.xMin < meshXMin - 0.01 || analysis.xMax > meshXMax + 0.01 ||
    analysis.yMin < meshYMin - 0.01 || analysis.yMax > meshYMax + 0.01
  );

  return (
    <div className="space-y-2">
      {jobOutside && (
        <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>A área do G-code ultrapassa a malha de probe. Verifique a configuração.</AlertDescription>
        </Alert>
      )}
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full border rounded-lg bg-muted/30" style={{ maxHeight: 400 }}>
        <rect x={tx(meshXMin)} y={ty(meshYMax)} width={(meshXMax - meshXMin) * scale} height={(meshYMax - meshYMin) * scale}
          fill="hsl(var(--primary) / 0.08)" stroke="hsl(var(--primary))" strokeWidth={1.5} strokeDasharray="4 2" />
        {analysis && analysis.width > 0 && (
          <rect x={tx(analysis.xMin)} y={ty(analysis.yMax)}
            width={(analysis.xMax - analysis.xMin) * scale} height={(analysis.yMax - analysis.yMin) * scale}
            fill={jobOutside ? "hsl(0 80% 50% / 0.1)" : "hsl(120 60% 50% / 0.08)"}
            stroke={jobOutside ? "hsl(0 80% 50%)" : "hsl(120 60% 50%)"}
            strokeWidth={1} />
        )}
        {mesh.points.map((pt, i) => (
          <circle key={i} cx={tx(pt.x)} cy={ty(pt.y)} r={3}
            fill={pt.z !== null ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
            opacity={pt.z !== null ? 1 : 0.5} />
        ))}
        <text x={tx(meshXMin) + 4} y={ty(meshYMax) + 14} fontSize={10} fill="hsl(var(--primary))" opacity={0.7}>Malha</text>
        {analysis && analysis.width > 0 && (
          <text x={tx(analysis.xMin) + 4} y={ty(analysis.yMax) - 4} fontSize={10}
            fill={jobOutside ? "hsl(0 80% 50%)" : "hsl(120 60% 50%)"} opacity={0.7}>Job</text>
        )}
      </svg>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function ZMappingPage() {
  const [originalGcode, setOriginalGcode] = useState("");
  const [originalFileName, setOriginalFileName] = useState("");
  const [analysis, setAnalysis] = useState<GcodeAnalysis | null>(null);

  const [unit, setUnit] = useState<ZUnit>("mm");
  const defaults = unit === "mm" ? defaultConfigMM : defaultConfigInch;
  const [xStart, setXStart] = useState(0);
  const [yStart, setYStart] = useState(0);
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(100);
  const [spacing, setSpacing] = useState(defaults.spacing);
  const [probeFeed, setProbeFeed] = useState(defaults.probeFeed);
  const [probeDepth, setProbeDepth] = useState(defaults.probeDepth);
  const [clearance, setClearance] = useState(defaults.clearance);
  const [safeHeight, setSafeHeight] = useState(defaults.safeHeight);
  const [maxSegmentLen, setMaxSegmentLen] = useState(defaults.maxSegmentLen);
  const [decimalPlaces, setDecimalPlaces] = useState(defaults.decimalPlaces);
  const [outOfMeshRule, setOutOfMeshRule] = useState<"block" | "warn" | "nearest">("warn");
  const [tolerance, setTolerance] = useState(defaults.tolerance);
  const [controller, setController] = useState<ControllerType>("mach3");

  const [probeDataText, setProbeDataText] = useState("");
  const [probePoints, setProbePoints] = useState<MeshPoint[]>([]);
  const [dataInputMode, setDataInputMode] = useState("paste");

  const [compensationResult, setCompensationResult] = useState<CompensationResult | null>(null);

  // Status messages
  const [probeGenerated, setProbeGenerated] = useState(false);
  const [dataImported, setDataImported] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const probeFileRef = useRef<HTMLInputElement>(null);

  const config: MeshConfig = useMemo(() => ({
    unit, xStart, yStart, width, height, spacing, probeFeed, probeDepth,
    clearance, safeHeight, maxSegmentLen, decimalPlaces, outOfMeshRule, tolerance,
  }), [unit, xStart, yStart, width, height, spacing, probeFeed, probeDepth,
    clearance, safeHeight, maxSegmentLen, decimalPlaces, outOfMeshRule, tolerance]);

  const mesh = useMemo(() => {
    if (width <= 0 || height <= 0 || spacing <= 0) return null;
    return generateMesh(config);
  }, [config]);

  // Current step for indicator
  const currentStep = compensationResult ? 3 : dataImported ? 2 : probeGenerated ? 1 : 0;

  // ── Handlers ──────────────────────────────────────────
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOriginalFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setOriginalGcode(text);
      const a = analyzeGcode(text);
      setAnalysis(a);

      if (a.unit) {
        setUnit(a.unit);
        const d = a.unit === "mm" ? defaultConfigMM : defaultConfigInch;
        setSpacing(d.spacing); setProbeFeed(d.probeFeed); setProbeDepth(d.probeDepth);
        setClearance(d.clearance); setSafeHeight(d.safeHeight); setMaxSegmentLen(d.maxSegmentLen);
        setTolerance(d.tolerance);
      }

      if (a.width > 0) {
        setXStart(parseFloat(a.xMin.toFixed(3)));
        setYStart(parseFloat(a.yMin.toFixed(3)));
        setWidth(parseFloat(a.width.toFixed(3)));
        setHeight(parseFloat(a.height.toFixed(3)));
      }

      toast.success("Arquivo carregado com sucesso");
    };
    reader.readAsText(file);
  }, []);

  const handleUnitChange = useCallback((u: ZUnit) => {
    setUnit(u);
    const d = u === "mm" ? defaultConfigMM : defaultConfigInch;
    setSpacing(d.spacing); setProbeFeed(d.probeFeed); setProbeDepth(d.probeDepth);
    setClearance(d.clearance); setSafeHeight(d.safeHeight); setMaxSegmentLen(d.maxSegmentLen);
    setTolerance(d.tolerance);
  }, []);

  const handleGenerateProbe = useCallback(() => {
    if (!mesh) return;
    const { code, fileName } = generateProbeGcode(mesh, config, controller, originalFileName || "file");
    downloadText(code, fileName);
    setProbeGenerated(true);
    toast.success("Rotina de mapeamento gerada com sucesso. Execute o arquivo na máquina e depois importe os dados medidos.");
  }, [mesh, config, controller, originalFileName]);

  const handleImportProbeFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !mesh) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setProbeDataText(text);
      const pts = importProbeData(text, mesh);
      setProbePoints(pts);
      setDataImported(true);
      toast.success("Dados de mapeamento carregados. Agora você pode gerar o G-code compensado.");
    };
    reader.readAsText(file);
  }, [mesh]);

  const handlePasteData = useCallback(() => {
    if (!mesh || !probeDataText) return;
    const pts = importProbeData(probeDataText, mesh);
    setProbePoints(pts);
    setDataImported(true);
    toast.success("Dados de mapeamento carregados. Agora você pode gerar o G-code compensado.");
  }, [mesh, probeDataText]);

  const handleCompensate = useCallback(() => {
    if (!mesh || !originalGcode || probePoints.filter(p => p.z !== null).length === 0) {
      toast.error("Carregue o G-code original e os dados do probe");
      return;
    }
    const result = generateCompensatedGcode(originalGcode, mesh, probePoints, config, originalFileName || "file", controller);
    setCompensationResult(result);
    toast.success("G-code compensado gerado com sucesso!");
  }, [mesh, originalGcode, probePoints, config, originalFileName, controller]);

  const handleDownloadCompensated = useCallback(() => {
    if (!compensationResult) return;
    downloadText(compensationResult.code, compensationResult.fileName);
  }, [compensationResult]);

  const handleTableEdit = useCallback((idx: number, z: number) => {
    setProbePoints(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], z };
      return next;
    });
  }, []);

  const ensureProbePoints = useCallback(() => {
    if (mesh && probePoints.length !== mesh.totalPoints) {
      setProbePoints(mesh.points.map(p => ({ ...p })));
    }
  }, [mesh, probePoints.length]);

  function downloadText(text: string, name: string) {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }

  const numField = (label: string, value: number, onChange: (v: number) => void, step?: number) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={value} step={step ?? (unit === "mm" ? 1 : 0.01)}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="h-9" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Grid3x3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mapeamento Z</h1>
            <p className="text-muted-foreground text-sm">Mapeie a superfície da peça e gere um G-code corrigido com compensação automática de altura.</p>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* File upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4" /> Arquivo Original</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
                  <FileUp className="h-4 w-4" /> Carregar G-code
                </Button>
                <input ref={fileRef} type="file" accept=".nc,.tap,.gcode,.txt" className="hidden" onChange={handleFileUpload} />
                {originalFileName && <Badge variant="secondary" className="self-center">{originalFileName}</Badge>}
              </div>

              {analysis && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <p className="text-sm font-medium">Resumo do Arquivo</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div><span className="text-muted-foreground">Unidade:</span> <span className="font-medium">{analysis.unit === "mm" ? "Milímetros" : analysis.unit === "inch" ? "Polegadas" : "Não detectada"}</span></div>
                    <div><span className="text-muted-foreground">X inicial:</span> <span className="font-medium">{fmt(analysis.xMin)}</span></div>
                    <div><span className="text-muted-foreground">Y inicial:</span> <span className="font-medium">{fmt(analysis.yMin)}</span></div>
                    <div><span className="text-muted-foreground">Largura X:</span> <span className="font-medium">{fmt(analysis.width)}</span></div>
                    <div><span className="text-muted-foreground">Altura Y:</span> <span className="font-medium">{fmt(analysis.height)}</span></div>
                    <div><span className="text-muted-foreground">Linhas:</span> <span className="font-medium">{analysis.lineCount}</span></div>
                  </div>
                  {!analysis.unit && (
                    <div className="flex items-center gap-2 pt-2">
                      <Label className="text-xs">Selecionar unidade:</Label>
                      <Select value={unit} onValueChange={(v) => handleUnitChange(v as ZUnit)}>
                        <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mm">Milímetros</SelectItem>
                          <SelectItem value="inch">Polegadas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Config */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Settings2 className="h-4 w-4" /> Configuração do Mapeamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Unidade</Label>
                  <Select value={unit} onValueChange={(v) => handleUnitChange(v as ZUnit)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mm">mm</SelectItem>
                      <SelectItem value="inch">pol</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {numField("X inicial", xStart, setXStart)}
                {numField("Y inicial", yStart, setYStart)}
                {numField("Largura", width, setWidth)}
                {numField("Altura", height, setHeight)}
                {numField("Feed probe", probeFeed, setProbeFeed)}
                {numField("Prof. probe", probeDepth, setProbeDepth, 0.01)}
                {numField("Clearance", clearance, setClearance)}
                {numField("Espaçamento", spacing, setSpacing)}
                {numField("Altura segura", safeHeight, setSafeHeight)}
              </div>

              <div className="flex items-center gap-3">
                <Label className="text-xs">Controlador:</Label>
                <Select value={controller} onValueChange={(v) => setController(v as ControllerType)}>
                  <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mach3">Mach3</SelectItem>
                    <SelectItem value="generic">Genérico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Accordion type="single" collapsible>
                <AccordionItem value="advanced" className="border-none">
                  <AccordionTrigger className="text-xs py-2">Configurações Avançadas</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      {numField("Segmentação", maxSegmentLen, setMaxSegmentLen)}
                      {numField("Casas decimais", decimalPlaces, (v) => setDecimalPlaces(Math.max(1, Math.min(8, Math.round(v)))), 1)}
                      {numField("Tolerância", tolerance, setTolerance, 0.0001)}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Fora da malha</Label>
                        <Select value={outOfMeshRule} onValueChange={(v) => setOutOfMeshRule(v as any)}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="block">Bloquear</SelectItem>
                            <SelectItem value="warn">Avisar e continuar</SelectItem>
                            <SelectItem value="nearest">Ponto mais próximo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* ETAPA 2 — Dados do Probe */}
          <Card className="border-l-2 border-l-primary/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] h-5 px-2 border-primary/40 text-primary bg-primary/5">Etapa 2</Badge>
              </div>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" /> Importar Dados do Probe
              </CardTitle>
              <CardDescription className="text-xs">
                Insira os valores Z medidos durante o mapeamento da superfície.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={dataInputMode} onValueChange={setDataInputMode}>
                <TabsList className="h-8">
                  <TabsTrigger value="file" className="text-xs gap-1"><FileUp className="h-3 w-3" /> Importar</TabsTrigger>
                  <TabsTrigger value="paste" className="text-xs gap-1"><ClipboardPaste className="h-3 w-3" /> Colar</TabsTrigger>
                  <TabsTrigger value="table" className="text-xs gap-1"><Table2 className="h-3 w-3" /> Tabela</TabsTrigger>
                </TabsList>

                <TabsContent value="file" className="space-y-2 mt-3">
                  <Button variant="outline" size="sm" onClick={() => probeFileRef.current?.click()} className="gap-2">
                    <FileUp className="h-3.5 w-3.5" /> Importar arquivo (.csv / .txt)
                  </Button>
                  <input ref={probeFileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImportProbeFile} />
                </TabsContent>

                <TabsContent value="paste" className="space-y-3 mt-3">
                  <Textarea
                    placeholder={"Exemplo de entrada:\n-0.02, -0.01, 0.00\n-0.03, -0.02, -0.01\n-0.04, -0.03, -0.02"}
                    rows={6}
                    value={probeDataText}
                    onChange={(e) => setProbeDataText(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Os valores devem corresponder à malha gerada pelo mapeamento.
                  </p>
                  <Button variant="outline" size="sm" onClick={handlePasteData} className="gap-2">
                    <ClipboardPaste className="h-3.5 w-3.5" /> Processar Dados do Probe
                  </Button>
                </TabsContent>

                <TabsContent value="table" className="space-y-2 mt-3">
                  <Button variant="outline" size="sm" onClick={ensureProbePoints} className="gap-2 mb-2">
                    <Table2 className="h-3.5 w-3.5" /> Inicializar tabela
                  </Button>
                  {mesh && probePoints.length > 0 && (
                    <div className="max-h-64 overflow-auto border rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted">
                          <tr>
                            <th className="px-2 py-1.5 text-left font-medium">#</th>
                            <th className="px-2 py-1.5 text-left font-medium">X</th>
                            <th className="px-2 py-1.5 text-left font-medium">Y</th>
                            <th className="px-2 py-1.5 text-left font-medium">Z</th>
                          </tr>
                        </thead>
                        <tbody>
                          {probePoints.map((pt, i) => (
                            <tr key={i} className="border-t border-border/50">
                              <td className="px-2 py-1 text-muted-foreground">{i}</td>
                              <td className="px-2 py-1">{fmt(pt.x, 3)}</td>
                              <td className="px-2 py-1">{fmt(pt.y, 3)}</td>
                              <td className="px-2 py-1">
                                <Input type="number" value={pt.z ?? ""} step={0.001}
                                  onChange={(e) => handleTableEdit(i, parseFloat(e.target.value) || 0)}
                                  className="h-6 w-24 text-xs px-1" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {probePoints.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  {probePoints.filter(p => p.z !== null).length} de {probePoints.length} pontos com dados
                </div>
              )}

              {dataImported && (
                <Alert className="border-emerald-500/30 bg-emerald-500/5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <AlertDescription className="text-xs text-emerald-400">
                    Dados de mapeamento carregados. Agora você pode gerar o G-code compensado.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* ETAPA 3 — Compensação e Saída */}
          <Card className="border-l-2 border-l-primary/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] h-5 px-2 border-primary/40 text-primary bg-primary/5">Etapa 3</Badge>
              </div>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" /> Gerar G-code Compensado
              </CardTitle>
              <CardDescription className="text-xs">
                Aplica a compensação de altura baseada no mapeamento da superfície.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleCompensate} className="gap-2"
                  disabled={!originalGcode || !mesh || probePoints.filter(p => p.z !== null).length === 0}>
                  <Play className="h-4 w-4" /> Gerar G-code Compensado
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                O novo arquivo terá correção automática de Z aplicada ao G-code original.
              </p>

              {compensationResult && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-medium">G-code compensado gerado</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div><span className="text-muted-foreground">Arquivo:</span> <span className="font-medium">{compensationResult.fileName}</span></div>
                    <div><span className="text-muted-foreground">Linhas:</span> <span className="font-medium">{compensationResult.linesProcessed}</span></div>
                    <div><span className="text-muted-foreground">Segmentos:</span> <span className="font-medium">{compensationResult.segmentsCreated}</span></div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Malha:</span>
                      {compensationResult.meshValid
                        ? <Badge variant="outline" className="text-[10px] h-4 border-emerald-500/50 text-emerald-500">OK</Badge>
                        : <Badge variant="outline" className="text-[10px] h-4 border-amber-500/50 text-amber-500">Incompleta</Badge>}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDownloadCompensated} className="gap-2">
                    <Download className="h-3.5 w-3.5" /> Baixar {compensationResult.fileName}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Mesh summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Grid3x3 className="h-4 w-4" /> Resumo da Malha</CardTitle>
            </CardHeader>
            <CardContent>
              {mesh ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Pontos por linha</span><span className="font-medium">{mesh.pointsPerRow}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Linhas</span><span className="font-medium">{mesh.rows}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Total de pontos</span><span className="font-bold text-primary">{mesh.totalPoints}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Espaçam. real X</span><span className="font-medium">{fmt(mesh.actualSpacingX, 3)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Espaçam. real Y</span><span className="font-medium">{fmt(mesh.actualSpacingY, 3)}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Tempo estimado</span>
                    <span className="font-medium">{Math.floor(mesh.estimatedTimeSec / 60)}min {mesh.estimatedTimeSec % 60}s</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Configure a área e espaçamento.</p>
              )}
            </CardContent>
          </Card>

          {/* 2D Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Crosshair className="h-4 w-4" /> Visualização</CardTitle>
            </CardHeader>
            <CardContent>
              <MeshPreview2D mesh={mesh} analysis={analysis} config={config} />
            </CardContent>
          </Card>

          {/* ETAPA 1 — Probe generation */}
          <Card className="border-l-2 border-l-primary/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] h-5 px-2 border-primary/40 text-primary bg-primary/5">Etapa 1</Badge>
              </div>
              <CardTitle className="text-base flex items-center gap-2">
                <Scan className="h-4 w-4 text-primary" /> Gerar Rotina de Mapeamento
              </CardTitle>
              <CardDescription className="text-xs">
                Gera o G-code que a máquina executará para medir a superfície da peça.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleGenerateProbe} disabled={!mesh} className="w-full gap-2">
                <Download className="h-4 w-4" /> Gerar Rotina de Mapeamento
              </Button>
              <p className="text-[10px] text-muted-foreground">
                Execute este arquivo na máquina para coletar os valores de Z.
              </p>
              <p className="text-[10px] text-muted-foreground">
                Controlador: <span className="font-medium">{controller === "mach3" ? "Mach3" : "Genérico"}</span>
                {mesh && <> · {mesh.totalPoints} pontos</>}
              </p>

              {probeGenerated && (
                <Alert className="border-emerald-500/30 bg-emerald-500/5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <AlertDescription className="text-xs text-emerald-400">
                    Rotina gerada. Execute na máquina e depois importe os dados medidos.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
