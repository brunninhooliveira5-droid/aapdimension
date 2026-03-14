import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  Upload, FileUp, ChevronLeft, ChevronRight, Grid3x3, Play, Download,
  CheckCircle2, Layers, Shield, PenTool, Wand2, X, Sparkles,
} from "lucide-react";
import { GcodePreview } from "./GcodePreview";
import { CompensationSimulator3D } from "./CompensationSimulator3D";
import { EnhancedHelpTip, PARAM_HELP } from "./VisualHelpSystem";
import type { GcodeAnalysis, MeshInfo, MeshConfig, DensityMap, RetractionMode, UnifiedResult } from "@/lib/z-mapping-engine";
import { fmt } from "@/lib/z-mapping-engine";

/* ── Types ─────────────────────────────────────────────── */
type MappingPrecision = "uniform" | "smart" | "maximum";
type EngravingMode = "standard" | "curved" | "vbit-curved";

interface WizardProps {
  onClose: () => void;
  originalGcode: string;
  originalFileName: string;
  analysis: GcodeAnalysis | null;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
  unit: string;
  safeHeight: number; setSafeHeight: (v: number) => void;
  spacingX: number; setSpacingX: (v: number) => void;
  spacingY: number; setSpacingY: (v: number) => void;
  probeFeed: number; setProbeFeed: (v: number) => void;
  mappingPrecision: MappingPrecision; setMappingPrecision: (v: MappingPrecision) => void;
  retractionMode: RetractionMode; setRetractionMode: (v: RetractionMode) => void;
  retMinSafeZ: number; setRetMinSafeZ: (v: number) => void;
  retAdaptiveClearance: number; setRetAdaptiveClearance: (v: number) => void;
  engravingMode: EngravingMode; setEngravingMode: (v: EngravingMode) => void;
  vbitAngle: number; setVbitAngle: (v: number) => void;
  nominalDepth: number; setNominalDepth: (v: number) => void;
  mesh: MeshInfo | null;
  config: MeshConfig;
  densityMap: DensityMap | null;
  onGenerate: () => void;
  onDownload: () => void;
  result: UnifiedResult | null;
  showSimulator: boolean;
  setShowSimulator: (v: boolean) => void;
}

/* ── Step indicator ────────────────────────────────────── */
const STEP_LABELS = [
  "Arquivo",
  "Configurar",
  "Mapeamento",
  "Segurança",
  "Gravação",
  "Simulação",
  "Gerar",
];

const STEP_DESCRIPTIONS = [
  "Carregue o arquivo G-code que será usinado na máquina.",
  "Agora você vai definir como a máquina irá medir a superfície da peça.",
  "Escolha como o sistema irá distribuir os pontos de medição sobre a área.",
  "Configure a segurança do deslocamento entre os pontos de medição.",
  "Defina como o sistema deve compensar a altura durante a gravação.",
  "Visualize em 3D como a ferramenta acompanhará a superfície da peça.",
  "Gere o arquivo final pronto para executar na máquina CNC.",
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className={`h-2 rounded-full transition-all duration-300 ${
            i === current ? "w-6 bg-primary" : i < current ? "w-2 bg-primary/50" : "w-2 bg-muted-foreground/20"
          }`} />
        </div>
      ))}
    </div>
  );
}

/* ── Number field with visual help ────────────────────── */
function NumField({ label, value, onChange, step, helpKey, helpText }: {
  label: string; value: number; onChange: (v: number) => void; step?: number;
  helpKey?: string; helpText?: string;
}) {
  const helpData = helpKey ? PARAM_HELP[helpKey] : undefined;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs flex items-center gap-1.5">
        {label}
        {helpData ? (
          <EnhancedHelpTip {...helpData} />
        ) : helpText ? (
          <EnhancedHelpTip text={helpText} />
        ) : null}
      </Label>
      <Input type="number" value={value} step={step ?? 1}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="h-9" />
    </div>
  );
}

/* ── Main wizard ───────────────────────────────────────── */
export function ZMappingWizard(props: WizardProps) {
  const [step, setStep] = useState(0);
  const totalSteps = 7;

  const canGoNext = useCallback(() => {
    if (step === 0) return !!props.analysis;
    if (step === 6) return !!props.result;
    return true;
  }, [step, props.analysis, props.result]);

  const next = () => setStep(s => Math.min(totalSteps - 1, s + 1));
  const prev = () => setStep(s => Math.max(0, s - 1));

  return (
    <div className="space-y-4 max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wand2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Assistente de Mapeamento Z</h2>
            <p className="text-xs text-muted-foreground">Etapa {step + 1} de {totalSteps} — {STEP_LABELS[step]}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={props.onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <StepIndicator current={step} total={totalSteps} />

      {/* Step description banner */}
      <div className="rounded-lg bg-primary/5 border border-primary/10 px-4 py-2.5">
        <p className="text-xs text-foreground leading-relaxed">{STEP_DESCRIPTIONS[step]}</p>
      </div>

      {/* Step content */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {step === 0 && <Step1File {...props} />}
          {step === 1 && <Step2Config {...props} />}
          {step === 2 && <Step3Mapping {...props} />}
          {step === 3 && <Step4Safety {...props} />}
          {step === 4 && <Step5Engraving {...props} />}
          {step === 5 && <Step6Simulation {...props} />}
          {step === 6 && <Step7Generate {...props} />}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={prev} disabled={step === 0} className="gap-1.5 text-xs">
          <ChevronLeft className="h-3.5 w-3.5" /> Anterior
        </Button>
        <span className="text-[10px] text-muted-foreground">{step + 1} / {totalSteps}</span>
        {step < totalSteps - 1 ? (
          <Button size="sm" onClick={next} disabled={!canGoNext()} className="gap-1.5 text-xs">
            Próximo <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={props.onClose} className="gap-1.5 text-xs">
            Finalizar
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── Step 1: Load file ─────────────────────────────────── */
function Step1File(props: WizardProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" /> Carregar arquivo
        </h3>
        <p className="text-xs text-muted-foreground">
          O arquivo G-code contém o percurso que a ferramenta fará na peça. O sistema analisa esse arquivo para calcular a área de mapeamento.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => props.fileRef.current?.click()} className="gap-2">
          <FileUp className="h-4 w-4" /> Carregar arquivo
        </Button>
        <input ref={props.fileRef as any} type="file" accept=".nc,.tap,.gcode,.txt" className="hidden" onChange={props.onFileUpload} />
        {props.originalFileName && <Badge variant="secondary">{props.originalFileName}</Badge>}
      </div>

      {props.analysis && props.originalGcode && (
        <>
          <div className="rounded-lg bg-muted/30 p-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              O sistema analisou seu G-code e encontrou a área onde a ferramenta irá trabalhar.
            </p>
            <div className="flex gap-4 text-xs">
              <span>Área: <strong className="text-foreground">{fmt(props.analysis.width)} × {fmt(props.analysis.height)} {props.unit}</strong></span>
              <span>Linhas: <strong className="text-foreground">{props.analysis.lineCount}</strong></span>
              {props.analysis.arcCount > 0 && (
                <span>Curvas: <strong className="text-foreground">{props.analysis.arcCount}</strong></span>
              )}
            </div>
          </div>

          <GcodePreview
            originalGcode={props.originalGcode}
            mesh={props.mesh}
            config={props.config}
            xMin={props.analysis.xMin}
            yMin={props.analysis.yMin}
            xMax={props.analysis.xMax}
            yMax={props.analysis.yMax}
            densityMap={props.densityMap}
          />
        </>
      )}
    </div>
  );
}

/* ── Step 2: Configure ─────────────────────────────────── */
function Step2Config(props: WizardProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Configurar o mapeamento</h3>
        <p className="text-xs text-muted-foreground">
          Esses parâmetros controlam como a máquina irá medir a superfície. Passe o mouse sobre o ícone <span className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full bg-muted text-muted-foreground mx-0.5 align-middle text-[8px]">?</span> e aguarde para ver uma ilustração explicativa.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <NumField label={`Altura segura (${props.unit})`} value={props.safeHeight} onChange={props.setSafeHeight}
          helpKey="safeHeight" />
        <NumField label="Distância entre pontos X" value={props.spacingX} onChange={props.setSpacingX}
          helpKey="spacingX" />
        <NumField label="Distância entre pontos Y" value={props.spacingY} onChange={props.setSpacingY}
          helpKey="spacingY" />
        <NumField label={`Velocidade do toque (${props.unit}/min)`} value={props.probeFeed} onChange={props.setProbeFeed}
          helpKey="probeFeed" />
      </div>

      {props.mesh && (
        <div className="rounded-lg bg-muted/30 p-3 flex gap-6 text-xs">
          <span className="flex items-center gap-1.5">
            <Grid3x3 className="h-3.5 w-3.5 text-primary" />
            Pontos estimados: <strong className="text-foreground">{props.mesh.totalPoints}</strong>
          </span>
          <span>
            Tempo aprox.: <strong className="text-foreground">{props.mesh.estimatedTimeSec < 60
              ? `${props.mesh.estimatedTimeSec}s`
              : `${Math.round(props.mesh.estimatedTimeSec / 60)}min`
            }</strong>
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Step 3: Mapping mode ──────────────────────────────── */
function Step3Mapping(props: WizardProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Modo de mapeamento</h3>
        <p className="text-xs text-muted-foreground">
          Escolha como os pontos de medição serão distribuídos. Cada modo é indicado para um tipo de trabalho diferente.
        </p>
      </div>

      <RadioGroup value={props.mappingPrecision} onValueChange={(v) => props.setMappingPrecision(v as MappingPrecision)} className="space-y-3">
        <label htmlFor="wiz-uniform" className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
          <RadioGroupItem value="uniform" id="wiz-uniform" className="mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Grade tradicional</p>
              <EnhancedHelpTip {...PARAM_HELP.mappingUniform} />
            </div>
            <p className="text-xs text-muted-foreground">Mede a superfície em pontos organizados em grade regular. Ideal para peças planas ou com pouca variação.</p>
          </div>
        </label>
        <label htmlFor="wiz-smart" className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
          <RadioGroupItem value="smart" id="wiz-smart" className="mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Inteligente</p>
              <EnhancedHelpTip {...PARAM_HELP.mappingSmart} />
            </div>
            <p className="text-xs text-muted-foreground">Coloca mais pontos onde o trabalho tem mais detalhes. Economiza tempo sem perder precisão.</p>
          </div>
        </label>
        <label htmlFor="wiz-max" className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
          <RadioGroupItem value="maximum" id="wiz-max" className="mt-0.5" />
          <div>
            <p className="text-sm font-medium">Varredura máxima</p>
            <p className="text-xs text-muted-foreground">Mede com alta densidade de pontos. Mais preciso porém mais lento. Indicado para peças pequenas com muita variação.</p>
          </div>
        </label>
      </RadioGroup>

      {props.analysis && props.originalGcode && props.mesh && (
        <GcodePreview
          originalGcode={props.originalGcode}
          mesh={props.mesh}
          config={props.config}
          xMin={props.analysis.xMin}
          yMin={props.analysis.yMin}
          xMax={props.analysis.xMax}
          yMax={props.analysis.yMax}
          densityMap={props.densityMap}
        />
      )}
    </div>
  );
}

/* ── Step 4: Safety ────────────────────────────────────── */
function Step4Safety(props: WizardProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" /> Segurança do mapeamento
        </h3>
        <p className="text-xs text-muted-foreground">
          Define como a ferramenta se desloca entre os pontos de medição. Em peças curvas ou irregulares, usar o modo adaptativo evita colisões.
        </p>
      </div>

      <RadioGroup value={props.retractionMode} onValueChange={(v) => props.setRetractionMode(v as RetractionMode)} className="space-y-3">
        <label htmlFor="wiz-ret-std" className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
          <RadioGroupItem value="standard" id="wiz-ret-std" className="mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Padrão</p>
              <EnhancedHelpTip {...PARAM_HELP.retraction} />
            </div>
            <p className="text-xs text-muted-foreground">Usa a mesma altura fixa de segurança para todos os deslocamentos. Mais simples e previsível.</p>
          </div>
        </label>
        <label htmlFor="wiz-ret-safe" className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
          <RadioGroupItem value="safe" id="wiz-ret-safe" className="mt-0.5" />
          <div>
            <p className="text-sm font-medium">Seguro</p>
            <p className="text-xs text-muted-foreground">Adapta a altura de deslocamento com base no último ponto medido. Evita colisões em peças com variação moderada.</p>
          </div>
        </label>
        <label htmlFor="wiz-ret-curved" className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
          <RadioGroupItem value="curved" id="wiz-ret-curved" className="mt-0.5" />
          <div>
            <p className="text-sm font-medium">Superfície curva</p>
            <p className="text-xs text-muted-foreground">Proteção reforçada com margem extra para grandes variações de altura. Indicado para peças muito irregulares.</p>
          </div>
        </label>
      </RadioGroup>

      {props.retractionMode !== "standard" && (
        <div className="grid grid-cols-2 gap-4 bg-muted/30 rounded-lg p-3">
          <NumField label={`Z seguro mínimo (${props.unit})`} value={props.retMinSafeZ} onChange={props.setRetMinSafeZ}
            helpText="Altura mínima de segurança durante o deslocamento entre pontos." step={0.5} />
          <NumField label={`Margem adaptativa (${props.unit})`} value={props.retAdaptiveClearance} onChange={props.setRetAdaptiveClearance}
            helpText="Margem extra adicionada sobre o último ponto medido para evitar colisão." step={0.5} />
        </div>
      )}
    </div>
  );
}

/* ── Step 5: Engraving ─────────────────────────────────── */
function Step5Engraving(props: WizardProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <PenTool className="h-4 w-4 text-primary" /> Tipo de gravação
        </h3>
        <p className="text-xs text-muted-foreground">
          Escolha como o sistema deve tratar a altura da ferramenta durante a usinagem. Para gravação em peças curvas, use os modos de compensação.
        </p>
      </div>

      <RadioGroup value={props.engravingMode} onValueChange={(v) => props.setEngravingMode(v as EngravingMode)} className="space-y-3">
        <label htmlFor="wiz-eng-std" className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
          <RadioGroupItem value="standard" id="wiz-eng-std" className="mt-0.5" />
          <div>
            <p className="text-sm font-medium">Usinagem normal</p>
            <p className="text-xs text-muted-foreground">Sem compensação especial de curvatura. Ideal para peças planas ou quando não há necessidade de acompanhar a superfície.</p>
          </div>
        </label>
        <label htmlFor="wiz-eng-curved" className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
          <RadioGroupItem value="curved" id="wiz-eng-curved" className="mt-0.5" />
          <div>
            <p className="text-sm font-medium">Gravação em superfície curva</p>
            <p className="text-xs text-muted-foreground">A ferramenta acompanha a superfície mantendo a profundidade relativa constante.</p>
          </div>
        </label>
        <label htmlFor="wiz-eng-vbit" className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
          <RadioGroupItem value="vbit-curved" id="wiz-eng-vbit" className="mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Gravação V-bit em superfície curva</p>
              <EnhancedHelpTip {...PARAM_HELP.vbitComp} />
            </div>
            <p className="text-xs text-muted-foreground">Compensa altura e inclinação para manter a largura do traço da V-bit constante, mesmo em superfícies irregulares.</p>
          </div>
        </label>
      </RadioGroup>

      {props.engravingMode === "vbit-curved" && (
        <div className="grid grid-cols-2 gap-4 bg-muted/30 rounded-lg p-3">
          <NumField label="Ângulo da V-bit (°)" value={props.vbitAngle} onChange={props.setVbitAngle}
            helpText="Ângulo total da ponta da ferramenta V-bit. Ângulos maiores geram traços mais largos." step={5} />
          <NumField label={`Profundidade da gravação (${props.unit})`} value={props.nominalDepth} onChange={props.setNominalDepth}
            helpText="Profundidade desejada da gravação. Determina a largura final do traço junto com o ângulo da V-bit." step={0.05} />
        </div>
      )}
    </div>
  );
}

/* ── Step 6: Simulation ────────────────────────────────── */
function Step6Simulation(props: WizardProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" /> Simulação 3D
        </h3>
        <p className="text-xs text-muted-foreground">
          A simulação mostra uma prévia visual de como a ferramenta irá subir ou descer para acompanhar a superfície da peça. Você pode girar, dar zoom e explorar o mapa de cores.
        </p>
      </div>

      {props.mesh && props.originalGcode ? (
        <>
          {!props.showSimulator ? (
            <Button variant="outline" className="gap-2 w-full" onClick={() => props.setShowSimulator(true)}>
              <Layers className="h-4 w-4" /> Abrir simulação 3D
            </Button>
          ) : (
            <CompensationSimulator3D
              originalGcode={props.originalGcode}
              mesh={props.mesh}
              config={props.config}
              onClose={() => props.setShowSimulator(false)}
            />
          )}
          <div className="rounded-lg bg-muted/30 p-3 text-center space-y-1">
            <p className="text-[11px] text-muted-foreground">
              As cores representam a variação de altura da superfície.
            </p>
            <div className="flex items-center justify-center gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Mais baixo</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Médio</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Mais alto</span>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg bg-muted/30 p-6 text-center">
          <p className="text-xs text-muted-foreground">Carregue um arquivo G-code para visualizar a simulação.</p>
        </div>
      )}
    </div>
  );
}

/* ── Step 7: Generate ──────────────────────────────────── */
function Step7Generate(props: WizardProps) {
  const suggestedName = props.originalFileName
    ? `MZ_${props.originalFileName.replace(/\.[^.]+$/, "")}.tap`
    : "MZ_arquivo.tap";

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Gerar arquivo final
        </h3>
        <p className="text-xs text-muted-foreground">
          O sistema criará um arquivo único que primeiro faz o mapeamento da superfície e depois executa a usinagem com compensação automática de altura.
        </p>
      </div>

      <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
        Nome sugerido: <strong className="text-foreground">{suggestedName}</strong>
      </div>

      <Button onClick={props.onGenerate} size="lg" className="gap-2 w-full text-base h-12">
        <Play className="h-5 w-5" /> Gerar G-code com compensação
      </Button>

      {props.result && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium">Arquivo pronto para ser executado na CNC.</span>
          </div>

          <div className="rounded-lg bg-muted/30 p-3 space-y-1.5 text-xs text-muted-foreground">
            <p><strong className="text-foreground">O que acontece ao executar:</strong></p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>A máquina mede a superfície da peça</li>
              <li>Pausa para trocar a ferramenta</li>
              <li>Inicia a usinagem com compensação</li>
            </ol>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">Arquivo:</span> <span className="font-medium">{props.result.fileName}</span></div>
            <div><span className="text-muted-foreground">Pontos:</span> <span className="font-medium">{props.result.totalPoints}</span></div>
          </div>

          <Button onClick={props.onDownload} size="lg" className="gap-2 w-full">
            <Download className="h-4 w-4" /> Baixar arquivo de nivelamento
          </Button>
        </div>
      )}
    </div>
  );
}
