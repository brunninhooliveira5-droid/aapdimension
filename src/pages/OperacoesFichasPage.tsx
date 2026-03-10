import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Layers, Settings } from "lucide-react";
import { ModuleProvider, productionControlConfig } from "@/contexts/ModuleContext";
import { ProductionSheetsList } from "@/components/dimension/documentation/ProductionSheetsList";
import { ProductionTemplatesManager } from "@/components/dimension/documentation/ProductionTemplatesManager";
import { ProductionPdfConfig } from "@/components/dimension/documentation/ProductionPdfConfig";
import { useAuth } from "@/contexts/AuthContext";

const allTabs = [
  { value: "fichas", label: "Fichas de Produção", icon: FileText, permKey: "fichas_producao" },
  { value: "templates", label: "Templates", icon: Layers, permKey: "fichas_templates" },
  { value: "config", label: "Configurar PDF", icon: Settings, permKey: "fichas_config_pdf" },
];

export default function OperacoesFichasPage() {
  const [tab, setTab] = useState("fichas");
  const { user, getSectionVisibility } = useAuth();
  const isAdmin = user?.role === "admin_master";

  const visibleTabs = allTabs.filter((t) => {
    if (isAdmin) return true;
    return getSectionVisibility(t.permKey) !== "hidden";
  });

  return (
    <ModuleProvider config={productionControlConfig}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fichas de Operação</h1>
          <p className="text-muted-foreground text-sm">Fichas de produção, templates e configuração de PDF.</p>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-transparent p-0 gap-1">
            {visibleTabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <t.icon className="h-3.5 w-3.5" />{t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="fichas"><ProductionSheetsList /></TabsContent>
          <TabsContent value="templates"><ProductionTemplatesManager /></TabsContent>
          <TabsContent value="config"><ProductionPdfConfig /></TabsContent>
        </Tabs>
      </div>
    </ModuleProvider>
  );
}
