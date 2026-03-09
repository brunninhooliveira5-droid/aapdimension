import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Upload, ChevronRight, ChevronLeft, FileImage, Box, Settings2, Gauge, 
  Wand2, CheckCircle2, AlertTriangle, AlertCircle, Info, Zap, Target, 
  Clock, Wrench, Sparkles, Lightbulb
} from "lucide-react";
import { toast } from "sonner";

import {
  type QualityLevel,
  type WorkType,
  type UserMachine,
  type IntelligentCamResult,
  type IntelligentTemplate,
  DEFAULT_MACHINES,
  getIntelligentTemplates,
  DEFAULT_INTELLIGENT_TEMPLATES,
  generateIntelligentCam,
  getHistorySuggestion,
} from "@/lib/intelligent-cam-engine";

import {
  type SvgVector,
  type MaterialConfig,
  type CncTool,
  type MaterialPreset,
  parseSvgContent,
  getDefaultPresets,
  getPresetById,
} from "@/lib/toolpath-engine";

interface AutomaticCamWizardProps {
  onComplete: (result: IntelligentCamResult, vectors: SvgVector[]) => void;
  onCancel: () => void;
  tools: CncTool[];
  customPresets?: MaterialPreset[];
}

type WizardStep = "import" | "material" | "machine" | "quality" | "review";

const STEPS: { id: WizardStep; label: string; icon: React.ElementType }[] = [
  { id: "import", label: "Importar", icon: Upload },
  { id: "material", label: "Material", icon: Box },
  { id: "machine", label: "Máquina", icon: Settings2 },
  { id: "quality", label: "Qualidade", icon: Gauge },
  { id: "review", label: "Revisar", icon: CheckCircle2 },
];

export function AutomaticCamWizard({ onComplete, onCancel, tools, customPresets = [] }: AutomaticCamWizardProps) {
  const [step, setStep] = useState<WizardStep>("import");
  const [vectors, setVectors] = useState<SvgVector[]>([]);
  const [svgContent, setSvgContent] = useState("");
  const [fileName, setFileName] = useState("");
  
  // Material
  const [material, setMaterial] = useState<MaterialConfig>({
    width: 500, height: 500, thickness: 15, unit: "mm",
    zeroOrigin: "bottom-left", zZero: "top", presetId: "mdf",
  });
  
  // Machine
  const [selectedMachineId, setSelectedMachineId] = useState<string>("generic-semipro");
  const [userMachines] = useState<UserMachine[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("user-machines") || "[]");
    } catch { return []; }
  });
  
  // Quality
  const [quality, setQuality] = useState<QualityLevel>("balanced");
  const [workType, setWorkType] = useState<WorkType>("auto-detect");
  
  // Result
  const [result, setResult] = useState<IntelligentCamResult | null>(null);
  
  // Templates
  const templates = useMemo(() => {
    const saved = getIntelligentTemplates();
    return saved.length > 0 ? saved : DEFAULT_INTELLIGENT_TEMPLATES.map((t, i) => ({
      ...t, id: `default-${i}`, createdAt: new Date().toISOString(), usageCount: 0
    }));
  }, []);
  
  const allMachines = useMemo(() => [...DEFAULT_MACHINES, ...userMachines], [userMachines]);
  const selectedMachine = allMachines.find((m) => m.id === selectedMachineId);
  
  const allPresets = useMemo(() => [...getDefaultPresets(), ...customPresets], [customPresets]);
  const selectedPreset = getPresetById(material.presetId, customPresets);
  
  // History suggestion
  const historySuggestion = useMemo(() => {
    return getHistorySuggestion(material.presetId);
  }, [material.presetId]);
  
  const handleImportFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".svg";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        setSvgContent(content);
        const { vectors: parsed } = parseSvgContent(content);
        setVectors(parsed);
        toast.success(`${parsed.length} vetores importados`);
      };
      reader.readAsText(file);
    };
    input.click();
  };
  
  const handleGenerateCam = () => {
    if (vectors.length === 0) {
      toast.error("Importe um arquivo primeiro");
      return;
    }
    
    const camResult = generateIntelligentCam({
      vectors,
      material,
      tools,
      machine: selectedMachine,
      quality,
      workType,
      customPresets,
    });
    
    setResult(camResult);
    setStep("review");
  };
  
  const handleComplete = () => {
    if (!result) return;
    onComplete(result, vectors);
  };
  
  const handleApplyTemplate = (template: IntelligentTemplate) => {
    setMaterial((prev) => ({
      ...prev,
      presetId: template.materialPreset,
      thickness: template.thickness,
    }));
    setQuality(template.quality);
    setWorkType(template.workType);
    if (template.machineId) {
      setSelectedMachineId(template.machineId);
    }
    toast.success(`Template "${template.name}" aplicado!`);
  };
  
  const currentStepIndex = STEPS.findIndex((s) => s.id === step);
  
  const canProceed = () => {
    switch (step) {
      case "import": return vectors.length > 0;
      case "material": return !!material.presetId;
      case "machine": return !!selectedMachineId;
      case "quality": return true;
      case "review": return !!result;
    }
  };
  
  const goNext = () => {
    if (step === "quality") {
      handleGenerateCam();
    } else {
      const nextIdx = currentStepIndex + 1;
      if (nextIdx < STEPS.length) {
        setStep(STEPS[nextIdx].id);
      }
    }
  };
  
  const goPrev = () => {
    const prevIdx = currentStepIndex - 1;
    if (prevIdx >= 0) {
      setStep(STEPS[prevIdx].id);
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header with steps */}
      <div className="flex items-center gap-1 px-4 py-3 border-b border-border bg-muted/30">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <button
              onClick={() => i < currentStepIndex && setStep(s.id)}
              disabled={i > currentStepIndex}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                s.id === step
                  ? "bg-primary text-primary-foreground"
                  : i < currentStepIndex
                  ? "bg-muted hover:bg-accent cursor-pointer"
                  : "text-muted-foreground"
              }`}
            >
              <s.icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
          </div>
        ))}
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        {step === "import" && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <FileImage className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Importar Arquivo</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Importe um arquivo SVG para começar
              </p>
            </div>
            
            <Button onClick={handleImportFile} className="w-full h-12 gap-2" variant="outline">
              <Upload className="h-5 w-5" />
              {fileName || "Selecionar arquivo SVG"}
            </Button>
            
            {vectors.length > 0 && (
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Arquivo importado
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Total de vetores:</span>
                      <span className="ml-1 font-medium">{vectors.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fechados:</span>
                      <span className="ml-1 font-medium">{vectors.filter((v) => v.closed).length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Furos:</span>
                      <span className="ml-1 font-medium">{vectors.filter((v) => v.geometryClass === "hole").length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Contornos externos:</span>
                      <span className="ml-1 font-medium">{vectors.filter((v) => v.geometryClass === "contour-outer").length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Quick templates */}
            {templates.length > 0 && (
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Templates Inteligentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-1">
                  {templates.slice(0, 4).map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => handleApplyTemplate(tpl as IntelligentTemplate)}
                      className="w-full flex items-center justify-between p-2 rounded-md hover:bg-accent text-left"
                    >
                      <span className="text-xs">{tpl.name}</span>
                      <Badge variant="secondary" className="text-[9px]">{tpl.quality}</Badge>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        {step === "material" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Configuração do Material</h2>
            
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Material</Label>
                <Select value={material.presetId} onValueChange={(v) => setMaterial((m) => ({ ...m, presetId: v }))}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allPresets.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name} - {p.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Largura (mm)</Label>
                  <Input
                    type="number"
                    value={material.width}
                    onChange={(e) => setMaterial((m) => ({ ...m, width: Number(e.target.value) }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Altura (mm)</Label>
                  <Input
                    type="number"
                    value={material.height}
                    onChange={(e) => setMaterial((m) => ({ ...m, height: Number(e.target.value) }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Espessura (mm)</Label>
                  <Input
                    type="number"
                    value={material.thickness}
                    onChange={(e) => setMaterial((m) => ({ ...m, thickness: Number(e.target.value) }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              
              {selectedPreset && (
                <Card className="bg-muted/50">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium">{selectedPreset.name}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{selectedPreset.notes}</p>
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div>Feed XY: {selectedPreset.feedXY} mm/min</div>
                      <div>RPM: {selectedPreset.spindleRpm}</div>
                      <div>Step-down: {selectedPreset.stepDown} mm</div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {historySuggestion && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium">Sugestão baseada no histórico</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Você costuma usar: Feed XY {historySuggestion.feedXY} mm/min, RPM {historySuggestion.spindleRpm}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
        
        {step === "machine" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Selecione a Máquina</h2>
            
            <RadioGroup value={selectedMachineId} onValueChange={setSelectedMachineId} className="space-y-2">
              {allMachines.map((machine) => (
                <label
                  key={machine.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedMachineId === machine.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"
                  }`}
                >
                  <RadioGroupItem value={machine.id} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{machine.name}</span>
                      <Badge variant="outline" className="text-[9px] capitalize">{machine.rigidity}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{machine.notes}</p>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-[10px] text-muted-foreground">
                      <div>Potência: {machine.spindlePower}W</div>
                      <div>RPM max: {machine.maxRpm}</div>
                      <div>Área: {machine.workAreaX}x{machine.workAreaY}mm</div>
                    </div>
                  </div>
                </label>
              ))}
            </RadioGroup>
            
            {selectedMachine?.rigidity === "light" && (
              <Card className="border-warning/30 bg-warning/5">
                <CardContent className="p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <p className="text-xs text-warning">
                    Máquina leve detectada. Parâmetros mais conservadores serão aplicados automaticamente.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        {step === "quality" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Configuração de Qualidade</h2>
            
            <div className="space-y-3">
              <Label className="text-xs">Nível de Qualidade</Label>
              <RadioGroup value={quality} onValueChange={(v) => setQuality(v as QualityLevel)} className="space-y-2">
                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${quality === "fast" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <RadioGroupItem value="fast" className="mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">Rápido</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Menos passadas, step-over maior, prioridade em velocidade.</p>
                  </div>
                </label>
                
                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${quality === "balanced" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <RadioGroupItem value="balanced" className="mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Balanceado</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Equilíbrio entre velocidade e qualidade. Recomendado.</p>
                  </div>
                </label>
                
                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${quality === "high-quality" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <RadioGroupItem value="high-quality" className="mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">Alta Qualidade</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Step-over reduzido, acabamento adicional, menor avanço.</p>
                  </div>
                </label>
              </RadioGroup>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <Label className="text-xs">Tipo de Trabalho</Label>
              <Select value={workType} onValueChange={(v) => setWorkType(v as WorkType)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto-detect" className="text-xs">🔍 Detectar automaticamente</SelectItem>
                  <SelectItem value="cutting" className="text-xs">✂️ Corte</SelectItem>
                  <SelectItem value="pocket" className="text-xs">📦 Bolso (Pocket)</SelectItem>
                  <SelectItem value="engraving" className="text-xs">✏️ Gravação</SelectItem>
                  <SelectItem value="mixed" className="text-xs">🔀 Misto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        
        {step === "review" && result && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Resumo Inteligente da Usinagem
            </h2>
            
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-2">
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{result.operations.length}</div>
                  <div className="text-[10px] text-muted-foreground">Operações</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{result.timeEstimate.total.toFixed(1)}</div>
                  <div className="text-[10px] text-muted-foreground">Minutos estimados</div>
                </CardContent>
              </Card>
            </div>
            
            {/* Alerts */}
            {result.alerts.length > 0 && (
              <Card>
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs">Alertas</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-2">
                  {result.alerts.map((alert, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2 p-2 rounded-md text-xs ${
                        alert.type === "error"
                          ? "bg-destructive/10 text-destructive"
                          : alert.type === "warning"
                          ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                          : alert.type === "suggestion"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted"
                      }`}
                    >
                      {alert.type === "error" ? (
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      ) : alert.type === "warning" ? (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-medium">{alert.title}</div>
                        <div className="text-[10px] opacity-80">{alert.message}</div>
                        {alert.action && (
                          <div className="text-[10px] mt-1 opacity-70">💡 {alert.action}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            
            {/* Suggested tool */}
            {result.suggestedTool && (
              <Card>
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs flex items-center gap-1.5">
                    <Wrench className="h-3 w-3" /> Ferramenta Selecionada
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{result.suggestedTool.name}</span>
                    <Badge variant="outline" className="text-[9px]">Ø{result.suggestedTool.diameter}mm</Badge>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Operations sequence */}
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs">Sequência de Operações</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="space-y-1">
                  {result.recommendedSequence.map((seq, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <Badge variant="secondary" className="text-[9px] w-5 h-5 p-0 flex items-center justify-center">
                        {i + 1}
                      </Badge>
                      <span>{seq}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Strategy notes */}
            {result.strategyNotes.length > 0 && (
              <Card>
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs flex items-center gap-1.5">
                    <Lightbulb className="h-3 w-3" /> Notas da Estratégia
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-1">
                  {result.strategyNotes.map((note, i) => (
                    <p key={i} className="text-[10px] text-muted-foreground">• {note}</p>
                  ))}
                </CardContent>
              </Card>
            )}
            
            {/* Time breakdown */}
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> Estimativa de Tempo
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="space-y-1">
                  {result.timeEstimate.breakdown.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{item.operation}</span>
                      <span>{item.time.toFixed(1)} min</span>
                    </div>
                  ))}
                  <Separator className="my-1" />
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span>Total</span>
                    <span>{result.timeEstimate.total.toFixed(1)} min</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </ScrollArea>
      
      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <Button variant="ghost" onClick={currentStepIndex === 0 ? onCancel : goPrev}>
          {currentStepIndex === 0 ? "Cancelar" : (
            <>
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </>
          )}
        </Button>
        
        {step === "review" ? (
          <Button onClick={handleComplete} disabled={result?.alerts.some((a) => a.type === "error")}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Aplicar e Gerar G-Code
          </Button>
        ) : (
          <Button onClick={goNext} disabled={!canProceed()}>
            {step === "quality" ? "Gerar CAM" : "Próximo"} <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
