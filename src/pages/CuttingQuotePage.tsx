import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, FileText, History, BarChart3, Layers, Settings2, Lock } from "lucide-react";
import { PricingSimulator, type PricingData } from "@/components/cutting-quote/PricingSimulator";
import { FileQuote } from "@/components/cutting-quote/FileQuote";
import { SavedQuotes } from "@/components/cutting-quote/SavedQuotes";
import { QuoteReports } from "@/components/cutting-quote/QuoteReports";
import { MaterialsManagement } from "@/components/cutting-quote/MaterialsManagement";
import { PdfConfiguration } from "@/components/cutting-quote/PdfConfiguration";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

export default function CuttingQuotePage() {
  const { session, getSectionVisibility } = useAuth();
  const [pricing, setPricing] = useState<PricingData>({
    costPerHour: 0,
    costPerMinute: 0,
    costPerMeter: 0,
    minPrice: 0,
    suggestedPrice: 0,
    avgCutSpeed: 0,
    profitMarginPercent: 30,
    minSpeedOverrideMMmin: 500,
    maxSpeedOverrideMMmin: 12000,
    maxPassesOverride: 10,
    allowUserOverrideSpeed: true,
    allowUserOverridePasses: true,
  });
  const [machines, setMachines] = useState<Tables<"machines">[]>([]);

  // Load pricing settings directly so it doesn't depend on Simulator tab rendering
  useEffect(() => {
    if (!session?.user) return;

    // Load pricing settings
    supabase
      .from("pricing_settings" as any)
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          const productiveHours = Number(data.productive_hours) || 160;
          const profitMargin = Number(data.profit_margin) || 30;
          const avgCutSpeed = Number(data.avg_cut_speed) || 2;

          const totalFixed = (Number(data.rent) || 0) + (Number(data.electricity) || 0) + (Number(data.internet) || 0) + (Number(data.other_fixed) || 0);
          const totalMachine = (Number(data.machine_cost) || 0) + (Number(data.gas_consumable) || 0) + (Number(data.maintenance_cost) || 0) + (Number(data.other_machine) || 0);
          const totalMonthlyCost = totalFixed + totalMachine;

          const costPerHour = productiveHours > 0 ? totalMonthlyCost / productiveHours : 0;
          const costPerMinute = costPerHour / 60;
          const costPerMeter = avgCutSpeed > 0 ? costPerMinute / (avgCutSpeed / 1000) : 0;
          const marginMultiplier = 1 + profitMargin / 100;
          const minPrice = costPerMinute * 1.15;
          const suggestedPrice = costPerMinute * marginMultiplier;

          setPricing({
            costPerHour, costPerMinute, costPerMeter, minPrice, suggestedPrice, avgCutSpeed, profitMarginPercent: profitMargin,
            minSpeedOverrideMMmin: Number(data.min_speed_override_mmmin) || 500,
            maxSpeedOverrideMMmin: Number(data.max_speed_override_mmmin) || 12000,
            maxPassesOverride: Number(data.max_passes_override) || 10,
            allowUserOverrideSpeed: data.allow_user_override_speed ?? true,
            allowUserOverridePasses: data.allow_user_override_passes ?? true,
          });
        }
      });

    // Load machines
    supabase
      .from("machines")
      .select("*")
      .then(({ data }) => {
        if (data) setMachines(data);
      });
  }, [session]);

  const canAccessSalvos = getSectionVisibility("orcamento_salvos") === "visible";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orçamento de Corte</h1>
        <p className="text-sm text-muted-foreground">Calcule orçamentos de corte CNC a partir de arquivos SVG</p>
      </div>

      <Tabs defaultValue="quote" className="w-full">
        <TabsList className="grid w-full max-w-4xl grid-cols-6">
          <TabsTrigger value="quote" className="gap-2">
            <FileText className="w-4 h-4" /> Orçamento
          </TabsTrigger>
          <TabsTrigger value="simulator" className="gap-2">
            <Calculator className="w-4 h-4" /> Simulador
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="gap-2"
            disabled={!canAccessSalvos}
            onClick={(e) => {
              if (!canAccessSalvos) {
                e.preventDefault();
                toast.info("Para acessar o histórico de orçamentos salvos, entre em contato com o administrador para ativar essa funcionalidade no seu plano.", { duration: 6000 });
              }
            }}
          >
            <History className="w-4 h-4" /> Salvos
            {!canAccessSalvos && <Lock className="w-3 h-3 ml-0.5 text-muted-foreground" />}
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <BarChart3 className="w-4 h-4" /> Relatórios
          </TabsTrigger>
          <TabsTrigger value="materials" className="gap-2">
            <Layers className="w-4 h-4" /> Materiais
          </TabsTrigger>
          <TabsTrigger value="pdf-config" className="gap-2">
            <Settings2 className="w-4 h-4" /> Config. PDF
          </TabsTrigger>
        </TabsList>

        <TabsContent value="simulator">
          <PricingSimulator onPricingChange={setPricing} />
        </TabsContent>

        <TabsContent value="quote">
          <FileQuote pricing={pricing} machines={machines} />
        </TabsContent>

        {canAccessSalvos && (
          <TabsContent value="history">
            <SavedQuotes />
          </TabsContent>
        )}

        <TabsContent value="reports">
          <QuoteReports />
        </TabsContent>

        <TabsContent value="materials">
          <MaterialsManagement />
        </TabsContent>

        <TabsContent value="pdf-config">
          <PdfConfiguration />
        </TabsContent>
      </Tabs>
    </div>
  );
}
