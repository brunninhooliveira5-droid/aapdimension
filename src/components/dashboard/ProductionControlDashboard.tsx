import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, ListTodo, AlertTriangle, CalendarDays, Factory, RotateCcw, Target, Package } from "lucide-react";
import { DimensionOverview } from "@/components/dimension/DimensionOverview";
import { DimensionTasks } from "@/components/dimension/DimensionTasks";
import { DimensionPendencies } from "@/components/dimension/DimensionPendencies";
import { DimensionSchedule } from "@/components/dimension/DimensionSchedule";
import { DimensionProduction } from "@/components/dimension/DimensionProduction";
import { DimensionRoutines } from "@/components/dimension/DimensionRoutines";
import { DimensionGoals } from "@/components/dimension/DimensionGoals";
import { DimensionDocumentation } from "@/components/dimension/documentation/DimensionDocumentation";
import { ModuleProvider, productionControlConfig } from "@/contexts/ModuleContext";

const tabs = [
  { value: "overview", label: "Visão Geral", icon: LayoutDashboard },
  { value: "tasks", label: "Tarefas", icon: ListTodo },
  { value: "pendencies", label: "Pendências", icon: AlertTriangle },
  { value: "schedule", label: "Cronograma", icon: CalendarDays },
  { value: "production", label: "Produção", icon: Factory },
  { value: "routines", label: "Rotinas", icon: RotateCcw },
  { value: "metas", label: "Metas", icon: Target },
  { value: "estoque", label: "Estoque/Produção", icon: Package },
];

export function ProductionControlDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <ModuleProvider config={productionControlConfig}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Controle de Produção</h1>
          <p className="text-muted-foreground text-sm">Acompanhamento de produção, tarefas e atividades.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview"><DimensionOverview onNavigateToTasks={() => setActiveTab("tasks")} /></TabsContent>
          <TabsContent value="tasks"><DimensionTasks /></TabsContent>
          <TabsContent value="pendencies"><DimensionPendencies /></TabsContent>
          <TabsContent value="schedule"><DimensionSchedule /></TabsContent>
          <TabsContent value="production"><DimensionProduction /></TabsContent>
          <TabsContent value="routines"><DimensionRoutines /></TabsContent>
          <TabsContent value="metas"><DimensionGoals /></TabsContent>
          <TabsContent value="estoque"><DimensionDocumentation /></TabsContent>
        </Tabs>
      </div>
    </ModuleProvider>
  );
}
