import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, FileText, History, BarChart3, Layers, Settings2 } from "lucide-react";
import { PricingSimulator, type PricingData } from "@/components/cutting-quote/PricingSimulator";
import { FileQuote } from "@/components/cutting-quote/FileQuote";
import { SavedQuotes } from "@/components/cutting-quote/SavedQuotes";
import { QuoteReports } from "@/components/cutting-quote/QuoteReports";
import { MaterialsManagement } from "@/components/cutting-quote/MaterialsManagement";
import { PdfConfiguration } from "@/components/cutting-quote/PdfConfiguration";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

export default function CuttingQuotePage() {
  const { session } = useAuth();
  const [pricing, setPricing] = useState<PricingData>({
    costPerHour: 0,
    costPerMinute: 0,
    costPerMeter: 0,
    minPrice: 0,
    suggestedPrice: 0,
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
          const costPerMeter = avgCutSpeed > 0 ? costPerMinute / avgCutSpeed : 0;
          const marginMultiplier = 1 + profitMargin / 100;
          const minPrice = costPerMinute;
          const suggestedPrice = costPerMinute * marginMultiplier;

          setPricing({ costPerHour, costPerMinute, costPerMeter, minPrice, suggestedPrice });
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orçamento de Corte</h1>
        <p className="text-sm text-muted-foreground">Calcule orçamentos de corte CNC a partir de arquivos DXF/SVG</p>
      </div>

      <Tabs defaultValue="quote" className="w-full">
        <TabsList className="grid w-full max-w-4xl grid-cols-6">
          <TabsTrigger value="quote" className="gap-2">
            <FileText className="w-4 h-4" /> Orçamento
          </TabsTrigger>
          <TabsTrigger value="simulator" className="gap-2">
            <Calculator className="w-4 h-4" /> Simulador
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" /> Salvos
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

        <TabsContent value="history">
          <SavedQuotes />
        </TabsContent>

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
