import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Target, Clock, Users, CheckCircle2, AlertTriangle, ShieldCheck, TrendingUp, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { MINIMUM_CUT_PRICE } from "@/lib/cutting-calculations";

type Objective = "margem" | "custos" | "competitivo";
type Urgency = "normal" | "urgente" | "muito_urgente";
type ClientType = "novo" | "recorrente" | "risco";

interface PriceAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cutCost: number;
  minCutCost: number;
  suggestedCutCost: number;
  costPerMinute: number;
  estimatedTimeMin: number;
  material: string;
  profitMarginPercent: number;
  materialCost: number;
  serviceValue: number;
  serviceValueIncluded: boolean;
  onApplyPrice: (price: number) => void;
}

const URGENCY_FACTOR: Record<Urgency, number> = {
  normal: 0,
  urgente: 0.10,
  muito_urgente: 0.20,
};

const OBJECTIVE_MULTIPLIER: Record<Objective, (margin: number) => number> = {
  margem: (margin) => 1 + margin / 100,
  custos: () => 1.15,
  competitivo: () => 1.05,
};

export function PriceAssistant({
  open,
  onOpenChange,
  cutCost,
  minCutCost,
  suggestedCutCost,
  costPerMinute,
  estimatedTimeMin,
  material,
  profitMarginPercent,
  materialCost,
  serviceValue,
  serviceValueIncluded,
  onApplyPrice,
}: PriceAssistantProps) {
  const [step, setStep] = useState(1);
  const [objective, setObjective] = useState<Objective>("margem");
  const [urgency, setUrgency] = useState<Urgency>("normal");
  const [clientType, setClientType] = useState<ClientType>("novo");

  const reset = () => {
    setStep(1);
    setObjective("margem");
    setUrgency("normal");
    setClientType("novo");
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  // ── Calculation ──
  const baseCost = estimatedTimeMin * costPerMinute;
  const multiplier = OBJECTIVE_MULTIPLIER[objective](profitMarginPercent);
  const basePrice = baseCost * multiplier;

  // Add material cost and service value first, then apply urgency on the total
  const extras = materialCost + (serviceValueIncluded ? serviceValue : 0);
  const subtotal = basePrice + extras;
  const urgencyAdded = subtotal * URGENCY_FACTOR[urgency];
  const rawRecommended = subtotal + urgencyAdded;
  const recommended = Math.max(rawRecommended, MINIMUM_CUT_PRICE + extras);

  const minAbsolute = MINIMUM_CUT_PRICE + extras;
  const minSustainable = Math.max(baseCost * 1.15, MINIMUM_CUT_PRICE) + extras;
  const healthyPrice = Math.max(baseCost * (1 + profitMarginPercent / 100), MINIMUM_CUT_PRICE) + extras;

  const marginPercent = baseCost > 0 ? ((recommended - baseCost) / baseCost) * 100 : 0;

  type Status = "saudavel" | "atencao" | "risco";
  let status: Status = "saudavel";
  if (recommended < minSustainable) status = "risco";
  else if (recommended < healthyPrice) status = "atencao";

  const statusConfig: Record<Status, { label: string; color: string; icon: typeof ShieldCheck }> = {
    saudavel: { label: "Saudável", color: "text-primary", icon: ShieldCheck },
    atencao: { label: "Atenção", color: "text-warning", icon: AlertTriangle },
    risco: { label: "Risco", color: "text-destructive", icon: AlertTriangle },
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const StatusIcon = statusConfig[status].icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Assistente de Preço
          </DialogTitle>
          <DialogDescription>
            Etapa {Math.min(step, 3)} de 3 — Defina o preço ideal para este serviço
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex gap-1">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Objective */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target className="w-4 h-4 text-primary" />
              Qual o objetivo deste serviço?
            </div>
            <RadioGroup value={objective} onValueChange={(v) => setObjective(v as Objective)} className="space-y-2">
              <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${objective === "margem" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                <RadioGroupItem value="margem" />
                <div>
                  <p className="text-sm font-medium">Ganhar com margem saudável</p>
                  <p className="text-xs text-muted-foreground">Aplica a margem padrão configurada ({profitMarginPercent}%)</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${objective === "custos" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                <RadioGroupItem value="custos" />
                <div>
                  <p className="text-sm font-medium">Cobrir custos (sem prejuízo)</p>
                  <p className="text-xs text-muted-foreground">Preço mínimo sustentável (+15% sobre custo)</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${objective === "competitivo" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                <RadioGroupItem value="competitivo" />
                <div>
                  <p className="text-sm font-medium">Fechar o serviço (competitivo)</p>
                  <p className="text-xs text-muted-foreground">Margem reduzida (+5%) para garantir o fechamento</p>
                </div>
              </label>
            </RadioGroup>
          </div>
        )}

        {/* Step 2: Urgency */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="w-4 h-4 text-primary" />
              Qual a urgência do serviço?
            </div>
            <RadioGroup value={urgency} onValueChange={(v) => setUrgency(v as Urgency)} className="space-y-2">
              <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${urgency === "normal" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                <RadioGroupItem value="normal" />
                <div>
                  <p className="text-sm font-medium">Normal</p>
                  <p className="text-xs text-muted-foreground">Prazo padrão, sem adicional</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${urgency === "urgente" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                <RadioGroupItem value="urgente" />
                <div>
                  <p className="text-sm font-medium">Urgente (+10%)</p>
                  <p className="text-xs text-muted-foreground">Prioridade acima do normal</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${urgency === "muito_urgente" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                <RadioGroupItem value="muito_urgente" />
                <div>
                  <p className="text-sm font-medium">Muito urgente (+20%)</p>
                  <p className="text-xs text-muted-foreground">Entrega imediata ou fora do expediente</p>
                </div>
              </label>
            </RadioGroup>
          </div>
        )}

        {/* Step 3: Client Type */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="w-4 h-4 text-primary" />
              Tipo de cliente
            </div>
            <RadioGroup value={clientType} onValueChange={(v) => setClientType(v as ClientType)} className="space-y-2">
              <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${clientType === "novo" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                <RadioGroupItem value="novo" />
                <div>
                  <p className="text-sm font-medium">Novo</p>
                  <p className="text-xs text-muted-foreground">Primeiro contato com o cliente</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${clientType === "recorrente" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                <RadioGroupItem value="recorrente" />
                <div>
                  <p className="text-sm font-medium">Recorrente</p>
                  <p className="text-xs text-muted-foreground">Já fez serviços anteriores</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${clientType === "risco" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                <RadioGroupItem value="risco" />
                <div>
                  <p className="text-sm font-medium">Risco / Difícil</p>
                  <p className="text-xs text-muted-foreground">Histórico de problemas ou pagamento difícil</p>
                </div>
              </label>
            </RadioGroup>

            {clientType === "risco" && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-xs">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <span>⚠️ Cliente de risco identificado. Considere solicitar pagamento antecipado ou entrada antes de iniciar o serviço.</span>
              </div>
            )}
            {clientType === "recorrente" && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-primary/10 border border-primary/30 text-xs">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Cliente recorrente. Bom histórico pode justificar condições flexíveis de pagamento.</span>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Result */}
        {step === 4 && (
          <div className="space-y-4">
            {/* Recommended Price */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 text-center space-y-2">
                <p className="text-xs text-muted-foreground">Preço Recomendado</p>
                <p className="text-3xl font-bold text-primary">{fmt(recommended)}</p>
                <div className="flex items-center justify-center gap-2">
                  <StatusIcon className={`w-4 h-4 ${statusConfig[status].color}`} />
                  <Badge variant="outline" className={statusConfig[status].color}>
                    {statusConfig[status].label}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Margem: {marginPercent.toFixed(1)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Price Range */}
            <Card className="bg-secondary/50 border-border">
              <CardContent className="p-3 space-y-2">
                <p className="text-xs font-medium">Faixa Segura de Preço</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-destructive font-medium">Mínimo absoluto</span>
                    <span className="font-mono">{fmt(minAbsolute)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-warning font-medium">Mínimo sustentável</span>
                    <span className="font-mono">{fmt(minSustainable)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-primary font-medium">Preço saudável</span>
                    <span className="font-mono">{fmt(healthyPrice)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-primary">→ Recomendado</span>
                    <span className="font-mono font-bold text-primary">{fmt(recommended)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Explanation */}
            <div className="p-3 rounded-md bg-muted/50 border border-border text-xs space-y-1">
              <p className="font-medium">💡 Entenda o cálculo:</p>
              <p>• Custo base: {fmt(baseCost)} ({estimatedTimeMin.toFixed(1)} min × {fmt(costPerMinute)}/min)</p>
              <p>• Objetivo: {objective === "margem" ? `Margem ${profitMarginPercent}%` : objective === "custos" ? "Cobertura +15%" : "Competitivo +5%"} → {fmt(basePrice)}</p>
              {urgency !== "normal" && (
                <p>• Urgência: +{URGENCY_FACTOR[urgency] * 100}% → +{fmt(urgencyAdded)}</p>
              )}
              {materialCost > 0 && (
                <p>• Material: +{fmt(materialCost)}</p>
              )}
              {serviceValueIncluded && serviceValue > 0 && (
                <p>• Valor de serviço: +{fmt(serviceValue)}</p>
              )}
              {recommended === (MINIMUM_CUT_PRICE + extras) && rawRecommended < (MINIMUM_CUT_PRICE + extras) && (
                <p className="text-destructive font-medium">• Valor mínimo operacional de {fmt(MINIMUM_CUT_PRICE)} foi aplicado.</p>
              )}
              <Separator className="my-1" />
              <p className="text-destructive">Abaixo de {fmt(minSustainable)} você entra em prejuízo.</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                className="flex-1 gap-2"
                onClick={() => {
                  onApplyPrice(recommended);
                  handleClose(false);
                }}
              >
                <CheckCircle2 className="w-4 h-4" />
                Aplicar este preço
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => handleClose(false)}
              >
                <TrendingUp className="w-4 h-4" />
                Ajustar manualmente
              </Button>
            </div>
          </div>
        )}

        {/* Navigation */}
        {step < 4 && (
          <div className="flex justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={step === 1}
              onClick={() => setStep((s) => s - 1)}
              className="gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
            <Button
              size="sm"
              onClick={() => setStep((s) => s + 1)}
              className="gap-1"
            >
              {step === 3 ? "Ver Resultado" : "Próximo"} <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="flex justify-start pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(1)}
              className="gap-1 text-xs"
            >
              <ArrowLeft className="w-4 h-4" /> Refazer desde o início
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
