import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Layers, Settings, Package, Bell } from "lucide-react";
import { ProductionSheetsList } from "./ProductionSheetsList";
import { ProductionTemplatesManager } from "./ProductionTemplatesManager";
import { ProductionPdfConfig } from "./ProductionPdfConfig";
import { InventoryControl } from "../inventory/InventoryControl";
import { useModule } from "@/contexts/ModuleContext";
import { useInventoryAlertCount } from "@/hooks/useInventoryAlertCount";

export function DimensionDocumentation() {
  const [tab, setTab] = useState("fichas");
  const { tables } = useModule();
  const { data: alertCount = 0 } = useInventoryAlertCount(tables.inventoryItems, tables.inventoryMovements);
  const hasAlerts = alertCount > 0;

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-transparent p-0 gap-1">
          <TabsTrigger value="fichas" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="h-3.5 w-3.5" />Fichas de Produção
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Layers className="h-3.5 w-3.5" />Templates
          </TabsTrigger>
          <TabsTrigger value="estoque" className={`gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground ${hasAlerts ? "text-destructive" : ""}`}>
            <Package className={`h-3.5 w-3.5 ${hasAlerts ? "text-destructive animate-pulse" : ""}`} />
            <span className={hasAlerts ? "text-destructive animate-pulse" : ""}>Controle de Estoque</span>
            {hasAlerts && <Bell className="h-3 w-3 text-destructive animate-pulse -ml-1" />}
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="h-3.5 w-3.5" />Configurar PDF
          </TabsTrigger>
        </TabsList>
        <TabsContent value="fichas"><ProductionSheetsList /></TabsContent>
        <TabsContent value="templates"><ProductionTemplatesManager /></TabsContent>
        <TabsContent value="estoque"><InventoryControl /></TabsContent>
        <TabsContent value="config"><ProductionPdfConfig /></TabsContent>
      </Tabs>
    </div>
  );
}