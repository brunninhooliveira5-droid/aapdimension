import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RectangleHorizontal, Cylinder, Database, Save, Scissors } from "lucide-react";
import { SheetCuttingTab } from "@/components/cutting-plan/SheetCuttingTab";
import { TubeCuttingTab } from "@/components/cutting-plan/TubeCuttingTab";
import { MaterialsCatalog } from "@/components/cutting-plan/MaterialsCatalog";
import { SavedCuttingPlans } from "@/components/cutting-plan/SavedCuttingPlans";
import { ScrapsManager } from "@/components/cutting-plan/ScrapsManager";

export default function CuttingPlanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Plano de Corte</h1>
        <p className="text-muted-foreground text-sm">
          Simule, otimize e organize planos de corte para chapas e tubos
        </p>
      </div>

      <Tabs defaultValue="chapa" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="chapa" className="gap-1.5">
            <RectangleHorizontal className="h-4 w-4" /> Corte de Chapa
          </TabsTrigger>
          <TabsTrigger value="tubo" className="gap-1.5">
            <Cylinder className="h-4 w-4" /> Corte de Tubos
          </TabsTrigger>
          <TabsTrigger value="retalhos" className="gap-1.5">
            <Scissors className="h-4 w-4" /> Retalhos
          </TabsTrigger>
          <TabsTrigger value="salvos" className="gap-1.5">
            <Save className="h-4 w-4" /> Planos Salvos
          </TabsTrigger>
          <TabsTrigger value="materiais" className="gap-1.5">
            <Database className="h-4 w-4" /> Materiais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chapa">
          <SheetCuttingTab />
        </TabsContent>
        <TabsContent value="tubo">
          <TubeCuttingTab />
        </TabsContent>
        <TabsContent value="retalhos">
          <ScrapsManager />
        </TabsContent>
        <TabsContent value="salvos">
          <SavedCuttingPlans />
        </TabsContent>
        <TabsContent value="materiais">
          <MaterialsCatalog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
