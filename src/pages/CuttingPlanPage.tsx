import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RectangleHorizontal, Cylinder, Database, Save } from "lucide-react";
import { SheetCuttingTab } from "@/components/cutting-plan/SheetCuttingTab";
import { TubeCuttingTab } from "@/components/cutting-plan/TubeCuttingTab";
import { MaterialsCatalog } from "@/components/cutting-plan/MaterialsCatalog";
import { SavedCuttingPlans } from "@/components/cutting-plan/SavedCuttingPlans";

export default function CuttingPlanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Plano de Corte</h1>
        <p className="text-muted-foreground text-sm">
          Simule e organize planos de corte para chapas e tubos
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
          <TabsTrigger value="materiais" className="gap-1.5">
            <Database className="h-4 w-4" /> Materiais
          </TabsTrigger>
          <TabsTrigger value="salvos" className="gap-1.5">
            <Save className="h-4 w-4" /> Planos Salvos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chapa">
          <SheetCuttingTab />
        </TabsContent>
        <TabsContent value="tubo">
          <TubeCuttingTab />
        </TabsContent>
        <TabsContent value="materiais">
          <MaterialsCatalog />
        </TabsContent>
        <TabsContent value="salvos">
          <SavedCuttingPlans />
        </TabsContent>
      </Tabs>
    </div>
  );
}
