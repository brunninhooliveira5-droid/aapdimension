import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DollarSign, Clock, Ruler, TrendingUp } from "lucide-react";

export interface PricingData {
  costPerHour: number;
  costPerMinute: number;
  costPerMeter: number;
  minPrice: number;
  suggestedPrice: number;
}

interface PricingSimulatorProps {
  onPricingChange: (data: PricingData) => void;
}

export function PricingSimulator({ onPricingChange }: PricingSimulatorProps) {
  const [rent, setRent] = useState(0);
  const [electricity, setElectricity] = useState(0);
  const [internet, setInternet] = useState(0);
  const [otherFixed, setOtherFixed] = useState(0);

  const [machineCost, setMachineCost] = useState(0);
  const [gasConsumable, setGasConsumable] = useState(0);
  const [maintenanceCost, setMaintenanceCost] = useState(0);
  const [otherMachine, setOtherMachine] = useState(0);

  const [productiveHours, setProductiveHours] = useState(160);
  const [profitMargin, setProfitMargin] = useState(30);
  const [avgCutSpeed, setAvgCutSpeed] = useState(2); // metros por minuto

  const totalFixed = rent + electricity + internet + otherFixed;
  const totalMachine = machineCost + gasConsumable + maintenanceCost + otherMachine;
  const totalMonthlyCost = totalFixed + totalMachine;

  const costPerHour = productiveHours > 0 ? totalMonthlyCost / productiveHours : 0;
  const costPerMinute = costPerHour / 60;
  const costPerMeter = avgCutSpeed > 0 ? costPerMinute / avgCutSpeed : 0;
  const marginMultiplier = 1 + profitMargin / 100;
  const minPrice = costPerMinute;
  const suggestedPrice = costPerMinute * marginMultiplier;

  useEffect(() => {
    onPricingChange({
      costPerHour,
      costPerMinute,
      costPerMeter,
      minPrice,
      suggestedPrice,
    });
  }, [costPerHour, costPerMinute, costPerMeter, minPrice, suggestedPrice]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fixed Costs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Custos Fixos Mensais
            </CardTitle>
            <CardDescription>Despesas fixas do seu negócio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Aluguel</Label>
              <Input type="number" min={0} value={rent || ""} onChange={(e) => setRent(Number(e.target.value))} placeholder="0,00" />
            </div>
            <div>
              <Label className="text-xs">Energia Elétrica</Label>
              <Input type="number" min={0} value={electricity || ""} onChange={(e) => setElectricity(Number(e.target.value))} placeholder="0,00" />
            </div>
            <div>
              <Label className="text-xs">Internet</Label>
              <Input type="number" min={0} value={internet || ""} onChange={(e) => setInternet(Number(e.target.value))} placeholder="0,00" />
            </div>
            <div>
              <Label className="text-xs">Outros Custos Fixos</Label>
              <Input type="number" min={0} value={otherFixed || ""} onChange={(e) => setOtherFixed(Number(e.target.value))} placeholder="0,00" />
            </div>
            <Separator />
            <div className="flex justify-between text-sm font-medium">
              <span className="text-muted-foreground">Total Fixo</span>
              <span className="text-primary">{fmt(totalFixed)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Machine Costs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Custos da Máquina
            </CardTitle>
            <CardDescription>Custos operacionais da máquina</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Depreciação / Parcela</Label>
              <Input type="number" min={0} value={machineCost || ""} onChange={(e) => setMachineCost(Number(e.target.value))} placeholder="0,00" />
            </div>
            <div>
              <Label className="text-xs">Gás / Consumíveis</Label>
              <Input type="number" min={0} value={gasConsumable || ""} onChange={(e) => setGasConsumable(Number(e.target.value))} placeholder="0,00" />
            </div>
            <div>
              <Label className="text-xs">Manutenção Mensal</Label>
              <Input type="number" min={0} value={maintenanceCost || ""} onChange={(e) => setMaintenanceCost(Number(e.target.value))} placeholder="0,00" />
            </div>
            <div>
              <Label className="text-xs">Outros Custos Máquina</Label>
              <Input type="number" min={0} value={otherMachine || ""} onChange={(e) => setOtherMachine(Number(e.target.value))} placeholder="0,00" />
            </div>
            <Separator />
            <div className="flex justify-between text-sm font-medium">
              <span className="text-muted-foreground">Total Máquina</span>
              <span className="text-primary">{fmt(totalMachine)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Parameters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Parâmetros
            </CardTitle>
            <CardDescription>Configurações de produtividade</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Horas Produtivas / Mês</Label>
              <Input type="number" min={1} value={productiveHours || ""} onChange={(e) => setProductiveHours(Number(e.target.value))} placeholder="160" />
            </div>
            <div>
              <Label className="text-xs">Margem de Lucro (%)</Label>
              <Input type="number" min={0} value={profitMargin || ""} onChange={(e) => setProfitMargin(Number(e.target.value))} placeholder="30" />
            </div>
            <div>
              <Label className="text-xs">Velocidade Média de Corte (m/min)</Label>
              <Input type="number" min={0.01} step={0.1} value={avgCutSpeed || ""} onChange={(e) => setAvgCutSpeed(Number(e.target.value))} placeholder="2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Custo / Hora", value: fmt(costPerHour), icon: Clock },
          { label: "Custo / Minuto", value: fmt(costPerMinute), icon: Clock },
          { label: "Custo / Metro", value: fmt(costPerMeter), icon: Ruler },
          { label: "Preço Mínimo / min", value: fmt(minPrice), icon: DollarSign },
          { label: "Preço Sugerido / min", value: fmt(suggestedPrice), icon: TrendingUp },
        ].map((item) => (
          <Card key={item.label} className="gradient-card glow-amber border-primary/20">
            <CardContent className="p-4 text-center space-y-1">
              <item.icon className="w-5 h-5 text-primary mx-auto" />
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-lg font-bold text-primary">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
