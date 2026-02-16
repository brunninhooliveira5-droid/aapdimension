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

  useEffect(() => {
    if (!session?.user) return;
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

      <Tabs defaultValue="simulator" className="w-full">
        <TabsList className="grid w-full max-w-4xl grid-cols-6">
          <TabsTrigger value="simulator" className="gap-2">
            <Calculator className="w-4 h-4" /> Simulador
          </TabsTrigger>
          <TabsTrigger value="quote" className="gap-2">
            <FileText className="w-4 h-4" /> Orçamento
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
