import { useState, useMemo, useCallback, useRef } from "react";
import { ZMappingAnimation } from "@/components/ZMappingAnimation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Upload, Grid3x3, Download, CheckCircle2, FileUp, Settings2, ChevronDown,
  Scan, ClipboardPaste, Wrench, Play
} from "lucide-react";
import {
  analyzeGcode, generateMesh, generateProbeGcode, importProbeData,
  generateCompensatedGcode, defaultConfigMM, defaultConfigInch,
  fmt, type ZUnit, type GcodeAnalysis, type MeshConfig,
  type MeshPoint, type ControllerType, type CompensationResult,
} from "@/lib/z-mapping-engine";

export default function ZMappingPage() {
  const [showAnimation, setShowAnimation] = useState(false);
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

  const [compensationResult, setCompensationResult] = useState<CompensationResult | null>(null);
  const [probeGenerated, setProbeGenerated] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const config: MeshConfig = useMemo(() => ({
    unit, xStart, yStart, width, height, spacing, probeFeed, probeDepth,
    clearance, safeHeight, maxSegmentLen, decimalPlaces, outOfMeshRule, tolerance,
  }), [unit, xStart, yStart, width, height, spacing, probeFeed, probeDepth,
    clearance, safeHeight, maxSegmentLen, decimalPlaces, outOfMeshRule, tolerance]);

  const mesh = useMemo(() => {
    if (width <= 0 || height <= 0 || spacing <= 0) return null;
    return generateMesh(config);
  }, [config]);

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
      toast.success("Arquivo carregado");
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
    toast.success("Arquivo de mapeamento gerado!");
  }, [mesh, config, controller, originalFileName]);

  const handleLoadData = useCallback(() => {
    if (!mesh || !probeDataText.trim()) return;
    const pts = importProbeData(probeDataText, mesh);
    setProbePoints(pts);
    setDataLoaded(true);
    toast.success("Dados carregados com sucesso");
  }, [mesh, probeDataText]);

  const handleCompensate = useCallback(() => {
    if (!mesh || !originalGcode || probePoints.filter(p => p.z !== null).length === 0) {
      toast.error("Carregue o G-code e os dados medidos primeiro");
      return;
    }
    const result = generateCompensatedGcode(originalGcode, mesh, probePoints, config, originalFileName || "file", controller);
    setCompensationResult(result);
    toast.success("G-code corrigido gerado!");
  }, [mesh, originalGcode, probePoints, config, originalFileName, controller]);

  const handleDownload = useCallback(() => {
    if (!compensationResult) return;
    downloadText(compensationResult.code, compensationResult.fileName);
  }, [compensationResult]);

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

  const filledPoints = probePoints.filter(p => p.z !== null).length;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Grid3x3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mapeamento Z</h1>
          <p className="text-muted-foreground text-sm">Corrija a altura do G-code automaticamente mapeando a superfície da peça.</p>
        </div>
      </div>

      {/* Upload */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4 text-primary" /> Arquivo G-code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Carregue o arquivo G-code que deseja corrigir.</p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
              <FileUp className="h-4 w-4" /> Carregar arquivo
            </Button>
            <input ref={fileRef} type="file" accept=".nc,.tap,.gcode,.txt" className="hidden" onChange={handleFileUpload} />
            {originalFileName && <Badge variant="secondary">{originalFileName}</Badge>}
          </div>
          {analysis && (
            <div className="rounded-lg border bg-muted/30 p-3 grid grid-cols-3 gap-2 text-xs">
              <div><span className="text-muted-foreground">Área X:</span> <span className="font-medium">{fmt(analysis.width)}</span></div>
              <div><span className="text-muted-foreground">Área Y:</span> <span className="font-medium">{fmt(analysis.height)}</span></div>
              <div><span className="text-muted-foreground">Unidade:</span> <span className="font-medium">{analysis.unit === "mm" ? "mm" : analysis.unit === "inch" ? "pol" : "—"}</span></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── PASSO 1 ── */}
      <Card className="border-l-4 border-l-primary/40">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
            <CardTitle className="text-lg">Gerar arquivo de mapeamento</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Primeiro vamos criar o arquivo que a máquina usará para medir a superfície da peça.
          </p>

          {mesh && (
            <div className="text-xs text-muted-foreground">
              A malha terá <span className="font-medium text-foreground">{mesh.totalPoints} pontos</span> de medição.
            </div>
          )}

          <Button onClick={handleGenerateProbe} disabled={!mesh} size="lg" className="gap-2 w-full sm:w-auto">
            <Scan className="h-4 w-4" /> Gerar arquivo de mapeamento
          </Button>

          <p className="text-xs text-muted-foreground">
            Execute este arquivo na máquina para medir os pontos da superfície.
          </p>

          {probeGenerated && (
            <Alert className="border-emerald-500/30 bg-emerald-500/5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <AlertDescription className="text-sm text-emerald-400">
                Arquivo gerado! Execute na máquina e depois cole os valores medidos no passo 2.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* ── PASSO 2 ── */}
      <Card className="border-l-4 border-l-primary/40">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
            <CardTitle className="text-lg">Inserir os valores medidos</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Depois que a máquina medir a superfície, copie os valores e cole aqui.
          </p>

          <Textarea
            placeholder={"Exemplo:\n-0.02, -0.01, 0.00\n-0.03, -0.02, -0.01\n-0.04, -0.03, -0.02"}
            rows={7}
            value={probeDataText}
            onChange={(e) => setProbeDataText(e.target.value)}
            className="font-mono text-xs"
          />

          <Button onClick={handleLoadData} disabled={!mesh || !probeDataText.trim()} variant="outline" size="lg" className="gap-2 w-full sm:w-auto">
            <ClipboardPaste className="h-4 w-4" /> Carregar dados
          </Button>

          {dataLoaded && (
            <Alert className="border-emerald-500/30 bg-emerald-500/5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <AlertDescription className="text-sm text-emerald-400">
                Dados carregados com sucesso — {filledPoints} pontos reconhecidos.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* ── PASSO 3 ── */}
      <Card className="border-l-4 border-l-primary/40">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</div>
            <CardTitle className="text-lg">Gerar G-code corrigido</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O sistema irá corrigir automaticamente a altura do G-code usando o mapeamento da superfície.
          </p>

          <Button onClick={handleCompensate} size="lg" className="gap-2 w-full sm:w-auto"
            disabled={!originalGcode || !mesh || filledPoints === 0}>
            <Play className="h-4 w-4" /> Gerar G-code corrigido
          </Button>

          {compensationResult && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium">Arquivo corrigido pronto!</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Arquivo:</span> <span className="font-medium">{compensationResult.fileName}</span></div>
                <div><span className="text-muted-foreground">Linhas:</span> <span className="font-medium">{compensationResult.linesProcessed}</span></div>
              </div>
              <Button onClick={handleDownload} size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                <Download className="h-4 w-4" /> Baixar arquivo corrigido
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Configurações avançadas ── */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <Settings2 className="h-3.5 w-3.5" />
            Configurações avançadas
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-3">
            <CardContent className="pt-5 space-y-4">
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
                {numField("Velocidade de medição", probeFeed, setProbeFeed)}
                {numField("Profundidade de medição", probeDepth, setProbeDepth, 0.01)}
                {numField("Folga de segurança", clearance, setClearance)}
                {numField("Espaçamento dos pontos", spacing, setSpacing)}
                {numField("Altura segura", safeHeight, setSafeHeight)}
                {numField("Comprimento de divisão", maxSegmentLen, setMaxSegmentLen)}
                {numField("Casas decimais", decimalPlaces, (v) => setDecimalPlaces(Math.max(1, Math.min(8, Math.round(v)))), 1)}
                {numField("Tolerância", tolerance, setTolerance, 0.0001)}
                <div className="space-y-1.5">
                  <Label className="text-xs">Controlador</Label>
                  <Select value={controller} onValueChange={(v) => setController(v as ControllerType)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mach3">Mach3</SelectItem>
                      <SelectItem value="generic">Genérico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fora da área mapeada</Label>
                  <Select value={outOfMeshRule} onValueChange={(v) => setOutOfMeshRule(v as any)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="block">Bloquear</SelectItem>
                      <SelectItem value="warn">Avisar e continuar</SelectItem>
                      <SelectItem value="nearest">Usar ponto mais próximo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
