import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Layers, Settings } from "lucide-react";
import { ModuleProvider, productionControlConfig } from "@/contexts/ModuleContext";
import { ProductionSheetsList } from "@/components/dimension/documentation/ProductionSheetsList";
import { ProductionTemplatesManager } from "@/components/dimension/documentation/ProductionTemplatesManager";
import { ProductionPdfConfig } from "@/components/dimension/documentation/ProductionPdfConfig";

export default function OperacoesFichasPage() {
  const [tab, setTab] = useState("fichas");

  return (
    <ModuleProvider config={productionControlConfig}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fichas de Operação</h1>
          <p className="text-muted-foreground text-sm">Fichas de produção, templates e configuração de PDF.</p>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-transparent p-0 gap-1">
            <TabsTrigger value="fichas" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="h-3.5 w-3.5" />Fichas de Produção
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Layers className="h-3.5 w-3.5" />Templates
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Settings className="h-3.5 w-3.5" />Configurar PDF
            </TabsTrigger>
          </TabsList>
          <TabsContent value="fichas"><ProductionSheetsList /></TabsContent>
          <TabsContent value="templates"><ProductionTemplatesManager /></TabsContent>
          <TabsContent value="config"><ProductionPdfConfig /></TabsContent>
        </Tabs>
      </div>
    </ModuleProvider>
  );
}
