import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Wand2, Clock, Wrench, AlertTriangle, AlertCircle, Info, CheckCircle2,
  ChevronDown, ChevronUp, Lightbulb, Target, Zap, Box, Settings2,
  Download, RefreshCw, Save, Sparkles
} from "lucide-react";
import { useState } from "react";

import {
  type IntelligentCamResult,
  type QualityLevel,
  type SmartAlert,
} from "@/lib/intelligent-cam-engine";

import { type MaterialPreset, type CncTool, type MaterialConfig } from "@/lib/toolpath-engine";

interface IntelligentSummaryProps {
  result: IntelligentCamResult;
  material: MaterialConfig;
  preset?: MaterialPreset;
  quality: QualityLevel;
  onRegenerate?: () => void;
  onSaveTemplate?: () => void;
  onExportGcode?: () => void;
}

export function IntelligentSummary({
  result,
  material,
  preset,
  quality,
  onRegenerate,
  onSaveTemplate,
  onExportGcode,
}: IntelligentSummaryProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    alerts: true,
    operations: true,
    time: true,
    strategy: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const errorCount = result.alerts.filter((a) => a.type === "error").length;
  const warningCount = result.alerts.filter((a) => a.type === "warning").length;

  const qualityLabel = quality === "fast" ? "Rápido" : quality === "balanced" ? "Balanceado" : "Alta Qualidade";
  const QualityIcon = quality === "fast" ? Zap : quality === "balanced" ? Target : Sparkles;

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        {/* Header Summary */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Wand2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">CAM Inteligente V6</h3>
                <p className="text-xs text-muted-foreground">Estratégia gerada automaticamente</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 rounded-md bg-background/50">
                <div className="text-xl font-bold text-primary">{result.operations.length}</div>
                <div className="text-[9px] text-muted-foreground">Operações</div>
              </div>
              <div className="text-center p-2 rounded-md bg-background/50">
                <div className="text-xl font-bold text-primary">{result.timeEstimate.total.toFixed(1)}</div>
                <div className="text-[9px] text-muted-foreground">Minutos</div>
              </div>
              <div className="text-center p-2 rounded-md bg-background/50">
                <div className="flex items-center justify-center gap-1">
                  <QualityIcon className="h-4 w-4 text-primary" />
                </div>
                <div className="text-[9px] text-muted-foreground">{qualityLabel}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Info */}
        <div className="grid grid-cols-2 gap-2">
          <Card>
            <CardContent className="p-2 flex items-center gap-2">
              <Box className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-[10px] text-muted-foreground">Material</div>
                <div className="text-xs font-medium">{preset?.name || "Custom"}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-[10px] text-muted-foreground">Espessura</div>
                <div className="text-xs font-medium">{material.thickness}mm</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Suggested Tool */}
        {result.suggestedTool && (
          <Card>
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-xs font-medium">{result.suggestedTool.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    Ø{result.suggestedTool.diameter}mm • {result.suggestedTool.feedXY} mm/min
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-[9px]">Recomendada</Badge>
            </CardContent>
          </Card>
        )}

        {/* Alerts Section */}
        {result.alerts.length > 0 && (
          <Card>
            <CardHeader
              className="py-2 px-3 cursor-pointer"
              onClick={() => toggleSection("alerts")}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" />
                  Alertas
                  {errorCount > 0 && (
                    <Badge variant="destructive" className="text-[8px] h-4 px-1">{errorCount} erro(s)</Badge>
                  )}
                  {warningCount > 0 && (
                    <Badge variant="outline" className="text-[8px] h-4 px-1 border-warning text-warning">
                      {warningCount} aviso(s)
                    </Badge>
                  )}
                </CardTitle>
                {expandedSections.alerts ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </div>
            </CardHeader>
            {expandedSections.alerts && (
              <CardContent className="px-3 pb-3 space-y-2">
                {result.alerts.map((alert, i) => (
                  <AlertItem key={i} alert={alert} />
                ))}
              </CardContent>
            )}
          </Card>
        )}

        {/* Operations Sequence */}
        <Card>
          <CardHeader
            className="py-2 px-3 cursor-pointer"
            onClick={() => toggleSection("operations")}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3" />
                Sequência de Operações ({result.operations.length})
              </CardTitle>
              {expandedSections.operations ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </div>
          </CardHeader>
          {expandedSections.operations && (
            <CardContent className="px-3 pb-3 space-y-1.5">
              {result.operations.map((op, i) => (
                <div
                  key={op.id}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-xs"
                >
                  <Badge variant="secondary" className="text-[9px] w-5 h-5 p-0 flex items-center justify-center">
                    {i + 1}
                  </Badge>
                  <span className="flex-1 truncate">{op.name}</span>
                  <Badge variant="outline" className="text-[8px]">{op.type}</Badge>
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        {/* Time Estimate */}
        <Card>
          <CardHeader
            className="py-2 px-3 cursor-pointer"
            onClick={() => toggleSection("time")}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Estimativa de Tempo
              </CardTitle>
              {expandedSections.time ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </div>
          </CardHeader>
          {expandedSections.time && (
            <CardContent className="px-3 pb-3 space-y-2">
              {result.timeEstimate.breakdown.map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground truncate">{item.operation}</span>
                    <span>{item.time.toFixed(1)} min</span>
                  </div>
                  <Progress
                    value={(item.time / result.timeEstimate.total) * 100}
                    className="h-1"
                  />
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex items-center justify-between text-xs font-medium">
                <span>Tempo Total</span>
                <span className="text-primary">{result.timeEstimate.total.toFixed(1)} min</span>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Strategy Notes */}
        {result.strategyNotes.length > 0 && (
          <Card>
            <CardHeader
              className="py-2 px-3 cursor-pointer"
              onClick={() => toggleSection("strategy")}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <Lightbulb className="h-3 w-3" />
                  Notas da Estratégia
                </CardTitle>
                {expandedSections.strategy ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </div>
            </CardHeader>
            {expandedSections.strategy && (
              <CardContent className="px-3 pb-3 space-y-1">
                {result.strategyNotes.map((note, i) => (
                  <p key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
                    <span className="text-primary">•</span>
                    <span>{note}</span>
                  </p>
                ))}
              </CardContent>
            )}
          </Card>
        )}

        {/* Geometry Analysis */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">Análise da Geometria</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div className="text-center p-1.5 rounded bg-muted/50">
                <div className="font-medium">{result.geometryAnalysis.holes.length}</div>
                <div className="text-muted-foreground">Furos</div>
              </div>
              <div className="text-center p-1.5 rounded bg-muted/50">
                <div className="font-medium">{result.geometryAnalysis.pockets.length}</div>
                <div className="text-muted-foreground">Pockets</div>
              </div>
              <div className="text-center p-1.5 rounded bg-muted/50">
                <div className="font-medium">{result.geometryAnalysis.innerContours.length}</div>
                <div className="text-muted-foreground">Int.</div>
              </div>
              <div className="text-center p-1.5 rounded bg-muted/50">
                <div className="font-medium">{result.geometryAnalysis.outerContours.length}</div>
                <div className="text-muted-foreground">Ext.</div>
              </div>
              <div className="text-center p-1.5 rounded bg-muted/50">
                <div className="font-medium">{result.geometryAnalysis.openPaths.length}</div>
                <div className="text-muted-foreground">Abertos</div>
              </div>
              <div className="text-center p-1.5 rounded bg-muted/50">
                <div className="font-medium">{result.geometryAnalysis.islands.length}</div>
                <div className="text-muted-foreground">Ilhas</div>
              </div>
            </div>
            <div className="mt-2 text-[9px] text-muted-foreground">
              Raio mínimo: {result.geometryAnalysis.smallestRadius.toFixed(1)}mm | 
              Ferramenta recomendada: Ø{result.geometryAnalysis.recommendedToolDiameter.toFixed(1)}mm
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-2">
          {onRegenerate && (
            <Button variant="outline" size="sm" className="flex-1 text-xs h-8 gap-1" onClick={onRegenerate}>
              <RefreshCw className="h-3 w-3" /> Regenerar
            </Button>
          )}
          {onSaveTemplate && (
            <Button variant="outline" size="sm" className="flex-1 text-xs h-8 gap-1" onClick={onSaveTemplate}>
              <Save className="h-3 w-3" /> Salvar Template
            </Button>
          )}
        </div>

        {onExportGcode && (
          <Button className="w-full h-9 gap-2" onClick={onExportGcode}>
            <Download className="h-4 w-4" /> Exportar G-Code
          </Button>
        )}
      </div>
    </ScrollArea>
  );
}

function AlertItem({ alert }: { alert: SmartAlert }) {
  const Icon = alert.type === "error"
    ? AlertCircle
    : alert.type === "warning"
    ? AlertTriangle
    : alert.type === "suggestion"
    ? Lightbulb
    : Info;

  const bgColor = alert.type === "error"
    ? "bg-destructive/10 text-destructive"
    : alert.type === "warning"
    ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
    : alert.type === "suggestion"
    ? "bg-primary/10 text-primary"
    : "bg-muted";

  return (
    <div className={`flex items-start gap-2 p-2 rounded-md text-xs ${bgColor}`}>
      <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="font-medium">{alert.title}</div>
        <div className="text-[10px] opacity-80">{alert.message}</div>
        {alert.action && (
          <div className="text-[10px] mt-1 opacity-70 flex items-center gap-1">
            <Lightbulb className="h-2.5 w-2.5" />
            {alert.action}
          </div>
        )}
      </div>
    </div>
  );
}
