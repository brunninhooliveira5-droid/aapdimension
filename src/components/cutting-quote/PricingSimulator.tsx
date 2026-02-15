import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { DollarSign, Clock, Ruler, TrendingUp, Save, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  const { session } = useAuth();
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
  const [avgCutSpeed, setAvgCutSpeed] = useState(2);

  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Load saved settings
  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from("pricing_settings" as any)
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setRent(Number(data.rent) || 0);
          setElectricity(Number(data.electricity) || 0);
          setInternet(Number(data.internet) || 0);
          setOtherFixed(Number(data.other_fixed) || 0);
          setMachineCost(Number(data.machine_cost) || 0);
          setGasConsumable(Number(data.gas_consumable) || 0);
          setMaintenanceCost(Number(data.maintenance_cost) || 0);
          setOtherMachine(Number(data.other_machine) || 0);
          setProductiveHours(Number(data.productive_hours) || 160);
          setProfitMargin(Number(data.profit_margin) || 30);
          setAvgCutSpeed(Number(data.avg_cut_speed) || 2);
        }
        setLoaded(true);
      });
  }, [session]);

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
    onPricingChange({ costPerHour, costPerMinute, costPerMeter, minPrice, suggestedPrice });
  }, [costPerHour, costPerMinute, costPerMeter, minPrice, suggestedPrice]);

  // Auto-save with debounce
  const saveSettings = useCallback(async () => {
    if (!session?.user || !loaded) return;
    setSaving(true);
    const payload = {
      user_id: session.user.id,
      rent, electricity, internet, other_fixed: otherFixed,
      machine_cost: machineCost, gas_consumable: gasConsumable,
      maintenance_cost: maintenanceCost, other_machine: otherMachine,
      productive_hours: productiveHours, profit_margin: profitMargin,
      avg_cut_speed: avgCutSpeed, updated_at: new Date().toISOString(),
    };

    // Upsert: insert or update on conflict
    const { error } = await supabase
      .from("pricing_settings" as any)
      .upsert(payload as any, { onConflict: "user_id" });

    setSaving(false);
    if (error) {
      console.error(error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [session, loaded, rent, electricity, internet, otherFixed, machineCost, gasConsumable, maintenanceCost, otherMachine, productiveHours, profitMargin, avgCutSpeed]);

  // Debounce auto-save: save 1.5s after last change
  useEffect(() => {
    if (!loaded) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(saveSettings, 1500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [rent, electricity, internet, otherFixed, machineCost, gasConsumable, maintenanceCost, otherMachine, productiveHours, profitMargin, avgCutSpeed, loaded]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {saving && <span>Salvando...</span>}
          {saved && <span className="flex items-center gap-1 text-primary"><Check className="w-3 h-3" /> Salvo automaticamente</span>}
        </div>
      </div>

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
