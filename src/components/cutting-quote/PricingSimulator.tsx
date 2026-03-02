import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DollarSign, Clock, Ruler, TrendingUp, Save, Check, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PricingData {
  costPerHour: number;
  costPerMinute: number;
  costPerMeter: number;
  minPrice: number;
  suggestedPrice: number;
  avgCutSpeed: number;       // mm/min — velocidade base do simulador
  profitMarginPercent: number; // margem de lucro configurada
  // Admin override limits
  minSpeedOverrideMMmin: number;
  maxSpeedOverrideMMmin: number;
  maxPassesOverride: number;
  allowUserOverrideSpeed: boolean;
  allowUserOverridePasses: boolean;
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
  const [operatorSalary, setOperatorSalary] = useState(0);
  const [energyCostPerKwh, setEnergyCostPerKwh] = useState(0);
  const [machineEnergyConsumptionKw, setMachineEnergyConsumptionKw] = useState(0);

  const [productiveHours, setProductiveHours] = useState(160);
  const [profitMargin, setProfitMargin] = useState(30);
  const [avgCutSpeed, setAvgCutSpeed] = useState(2);
  const [minSpeedOverride, setMinSpeedOverride] = useState(500);
  const [maxSpeedOverride, setMaxSpeedOverride] = useState(12000);
  const [maxPassesOverride, setMaxPassesOverride] = useState(10);
  const [allowOverrideSpeed, setAllowOverrideSpeed] = useState(true);
  const [allowOverridePasses, setAllowOverridePasses] = useState(true);
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
          setOperatorSalary(Number(data.operator_salary) || 0);
          setEnergyCostPerKwh(Number(data.energy_cost_per_kwh) || 0);
          setMachineEnergyConsumptionKw(Number(data.machine_energy_consumption_kw) || 0);
          setOtherMachine(Number(data.other_machine) || 0);
          setProductiveHours(Number(data.productive_hours) || 160);
          setProfitMargin(Number(data.profit_margin) || 30);
          setAvgCutSpeed(Number(data.avg_cut_speed) || 2);
          setMinSpeedOverride(Number(data.min_speed_override_mmmin) || 500);
          setMaxSpeedOverride(Number(data.max_speed_override_mmmin) || 12000);
          setMaxPassesOverride(Number(data.max_passes_override) || 10);
          setAllowOverrideSpeed(data.allow_user_override_speed ?? true);
          setAllowOverridePasses(data.allow_user_override_passes ?? true);
        }
        setLoaded(true);
      });
  }, [session]);

  const monthlyEnergyCost = energyCostPerKwh * machineEnergyConsumptionKw * productiveHours;
  const totalFixed = rent + electricity + internet + otherFixed;
  const baseMachineCost = gasConsumable + maintenanceCost + otherMachine + operatorSalary + monthlyEnergyCost;
  const depreciationValue = baseMachineCost * (machineCost / 100);
  const totalMachine = baseMachineCost + depreciationValue;
  const totalMonthlyCost = totalFixed + totalMachine;

  const costPerHour = productiveHours > 0 ? totalMonthlyCost / productiveHours : 0;
  const costPerMinute = costPerHour / 60;
  const costPerMeter = avgCutSpeed > 0 ? costPerMinute / (avgCutSpeed / 1000) : 0;
  const marginMultiplier = 1 + profitMargin / 100;
  const minPrice = costPerMinute * 1.15; // preço mínimo sustentável (15% acima do custo)
  const suggestedPrice = costPerMinute * marginMultiplier;

  useEffect(() => {
    onPricingChange({
      costPerHour, costPerMinute, costPerMeter, minPrice, suggestedPrice, avgCutSpeed, profitMarginPercent: profitMargin,
      minSpeedOverrideMMmin: minSpeedOverride, maxSpeedOverrideMMmin: maxSpeedOverride, maxPassesOverride,
      allowUserOverrideSpeed: allowOverrideSpeed, allowUserOverridePasses: allowOverridePasses,
    });
  }, [costPerHour, costPerMinute, costPerMeter, minPrice, suggestedPrice, avgCutSpeed, profitMargin, minSpeedOverride, maxSpeedOverride, maxPassesOverride, allowOverrideSpeed, allowOverridePasses]);

  // Auto-save with debounce
  const saveSettings = useCallback(async () => {
    if (!session?.user || !loaded) return;
    setSaving(true);
    const payload = {
      user_id: session.user.id,
      rent, electricity, internet, other_fixed: otherFixed,
      machine_cost: machineCost, gas_consumable: gasConsumable,
      maintenance_cost: maintenanceCost, other_machine: otherMachine,
      operator_salary: operatorSalary,
      energy_cost_per_kwh: energyCostPerKwh,
      machine_energy_consumption_kw: machineEnergyConsumptionKw,
      productive_hours: productiveHours, profit_margin: profitMargin,
      avg_cut_speed: avgCutSpeed, updated_at: new Date().toISOString(),
      min_speed_override_mmmin: minSpeedOverride,
      max_speed_override_mmmin: maxSpeedOverride,
      max_passes_override: maxPassesOverride,
      allow_user_override_speed: allowOverrideSpeed,
      allow_user_override_passes: allowOverridePasses,
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
  }, [session, loaded, rent, electricity, internet, otherFixed, machineCost, gasConsumable, maintenanceCost, otherMachine, operatorSalary, energyCostPerKwh, machineEnergyConsumptionKw, productiveHours, profitMargin, avgCutSpeed, minSpeedOverride, maxSpeedOverride, maxPassesOverride, allowOverrideSpeed, allowOverridePasses]);

  // Debounce auto-save: save 1.5s after last change
  useEffect(() => {
    if (!loaded) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(saveSettings, 1500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [rent, electricity, internet, otherFixed, machineCost, gasConsumable, maintenanceCost, otherMachine, operatorSalary, energyCostPerKwh, machineEnergyConsumptionKw, productiveHours, profitMargin, avgCutSpeed, minSpeedOverride, maxSpeedOverride, maxPassesOverride, allowOverrideSpeed, allowOverridePasses, loaded]);

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
            <CardDescription>Total das despesas fixas do seu negócio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Total de Custos Fixos (R$)</Label>
              <Input 
                type="text" 
                inputMode="decimal"
                value={totalFixed > 0 ? totalFixed.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""} 
                onChange={(e) => {
                  const val = Number(e.target.value.replace(/[^\d]/g, "")) / 100;
                  setRent(val);
                  setElectricity(0);
                  setInternet(0);
                  setOtherFixed(0);
                }} 
                placeholder="0,00" 
              />
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
              <Label className="text-xs">Consumíveis (R$)</Label>
              <Input 
                type="text" 
                inputMode="decimal"
                value={gasConsumable > 0 ? gasConsumable.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""} 
                onChange={(e) => setGasConsumable(Number(e.target.value.replace(/[^\d]/g, "")) / 100)} 
                placeholder="0,00" 
              />
            </div>
            <div>
              <Label className="text-xs">Retirada de Resíduos Mensal (R$)</Label>
              <Input 
                type="text" 
                inputMode="decimal"
                value={maintenanceCost > 0 ? maintenanceCost.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""} 
                onChange={(e) => setMaintenanceCost(Number(e.target.value.replace(/[^\d]/g, "")) / 100)} 
                placeholder="0,00" 
              />
            </div>
            <div>
              <Label className="text-xs">Salário do Operador (R$)</Label>
              <Input 
                type="text" 
                inputMode="decimal"
                value={operatorSalary > 0 ? operatorSalary.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""} 
                onChange={(e) => setOperatorSalary(Number(e.target.value.replace(/[^\d]/g, "")) / 100)} 
                placeholder="0,00" 
              />
            </div>
            <div>
              <Label className="text-xs">Outros Custos Máquina (R$)</Label>
              <Input 
                type="text" 
                inputMode="decimal"
                value={otherMachine > 0 ? otherMachine.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""} 
                onChange={(e) => setOtherMachine(Number(e.target.value.replace(/[^\d]/g, "")) / 100)} 
                placeholder="0,00" 
              />
            </div>
            <Separator />
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Energia</p>
              <div>
                <Label className="text-xs">Valor do kWh (R$)</Label>
                <Input 
                  type="text" 
                  inputMode="decimal"
                  value={energyCostPerKwh > 0 ? energyCostPerKwh.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : ""} 
                  onChange={(e) => setEnergyCostPerKwh(Number(e.target.value.replace(/[^\d]/g, "")) / 10000)} 
                  placeholder="0,0000" 
                />
              </div>
              <div>
                <Label className="text-xs">Consumo da Máquina (kW)</Label>
                <Input 
                  type="number" 
                  min={0} 
                  step={0.1}
                  value={machineEnergyConsumptionKw || ""} 
                  onChange={(e) => setMachineEnergyConsumptionKw(Number(e.target.value))} 
                  placeholder="0" 
                />
              </div>
              {monthlyEnergyCost > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Custo Energia/Mês</span>
                  <span className="text-primary font-medium">{fmt(monthlyEnergyCost)}</span>
                </div>
              )}
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
              <Label className="text-xs">Depreciação (%)</Label>
              <Input type="number" min={0} step={0.1} value={machineCost || ""} onChange={(e) => setMachineCost(Number(e.target.value))} placeholder="10" />
            </div>
            <div>
              <Label className="text-xs">Horas Produtivas / Mês</Label>
              <Input type="number" min={1} value={productiveHours || ""} onChange={(e) => setProductiveHours(Number(e.target.value))} placeholder="160" />
            </div>
            <div>
              <Label className="text-xs">Margem de Lucro (%)</Label>
              <Input type="number" min={0} value={profitMargin || ""} onChange={(e) => setProfitMargin(Number(e.target.value))} placeholder="30" />
            </div>
            <div>
              <Label className="text-xs">Velocidade (mm/min)</Label>
              <Input type="number" min={0.01} step={1} value={avgCutSpeed || ""} onChange={(e) => setAvgCutSpeed(Number(e.target.value))} placeholder="2000" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Override Config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Limites de Override (Admin)
          </CardTitle>
          <CardDescription>Controle o que o operador pode ajustar no resultado do orçamento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Velocidade Mínima (mm/min)</Label>
              <Input type="number" min={1} value={minSpeedOverride || ""} onChange={(e) => setMinSpeedOverride(Number(e.target.value))} placeholder="500" />
            </div>
            <div>
              <Label className="text-xs">Velocidade Máxima (mm/min)</Label>
              <Input type="number" min={1} value={maxSpeedOverride || ""} onChange={(e) => setMaxSpeedOverride(Number(e.target.value))} placeholder="12000" />
            </div>
            <div>
              <Label className="text-xs">Máximo de Passadas</Label>
              <Input type="number" min={1} max={50} value={maxPassesOverride || ""} onChange={(e) => setMaxPassesOverride(Number(e.target.value))} placeholder="10" />
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Permitir override de velocidade</Label>
              <Switch checked={allowOverrideSpeed} onCheckedChange={setAllowOverrideSpeed} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Permitir override de passadas</Label>
              <Switch checked={allowOverridePasses} onCheckedChange={setAllowOverridePasses} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Custo / Hora", value: fmt(costPerHour), icon: Clock },
          { label: "Custo / Minuto", value: fmt(costPerMinute), icon: Clock },
          { label: "Custo / Metro", value: fmt(costPerMeter), icon: Ruler },
          { label: "Preço Mínimo / min", value: fmt(minPrice), icon: DollarSign },
          { label: "Preço Sugerido / min", value: fmt(suggestedPrice), icon: TrendingUp },
        ].map((item) => (
          <Card key={item.label} className="gradient-card glow-primary border-primary/20">
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
