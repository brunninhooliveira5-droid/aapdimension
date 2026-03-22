import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, ListTodo, AlertTriangle, CalendarDays, Factory, RotateCcw, Target, ClipboardCheck } from "lucide-react";
import { DimensionOverview } from "@/components/dimension/DimensionOverview";
import { DimensionTasks } from "@/components/dimension/DimensionTasks";
import { DimensionPendencies } from "@/components/dimension/DimensionPendencies";
import { DimensionSchedule } from "@/components/dimension/DimensionSchedule";
import { DimensionProduction } from "@/components/dimension/DimensionProduction";
import { DimensionRoutines } from "@/components/dimension/DimensionRoutines";
import { DimensionGoals } from "@/components/dimension/DimensionGoals";
import { ChecklistModule } from "@/components/checklist/ChecklistModule";
import { ModuleProvider, productionControlConfig } from "@/contexts/ModuleContext";
import { useAuth } from "@/contexts/AuthContext";

const allTabs = [
  { value: "overview", label: "Visão Geral", icon: LayoutDashboard, permKey: "pc_visao_geral" },
  { value: "tasks", label: "Tarefas", icon: ListTodo, permKey: "pc_tarefas" },
  { value: "pendencies", label: "Pendências", icon: AlertTriangle, permKey: "pc_pendencias" },
  { value: "schedule", label: "Cronograma", icon: CalendarDays, permKey: "pc_cronograma" },
  { value: "production", label: "Produção", icon: Factory, permKey: "pc_producao" },
  { value: "routines", label: "Rotinas", icon: RotateCcw, permKey: "pc_rotinas" },
  { value: "metas", label: "Metas", icon: Target, permKey: "pc_metas" },
  { value: "checklist", label: "Checklist", icon: ClipboardCheck, permKey: "pc_checklist" },
];

export default function ProductionControlPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const { user, getSectionVisibility } = useAuth();

  // Admin_master sees all; others respect section access + account member permissions
  const isAdmin = user?.role === "admin_master";
  const memberPermissions = user?.accountMembership?.permissions as Record<string, boolean> | undefined;

  const visibleTabs = allTabs.filter((tab) => {
    if (isAdmin) return true;
    // Check section access (granular control from admin)
    const sectionVis = getSectionVisibility(tab.permKey);
    if (sectionVis === "hidden") return false;
    // Also check account member permissions
    if (memberPermissions && memberPermissions[tab.permKey] === false) return false;
    return true;
  });

  return (
    <ModuleProvider config={productionControlConfig}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Controle de Produção</h1>
          <p className="text-muted-foreground text-sm">Acompanhamento de produção, tarefas e atividades.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0">
            {visibleTabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
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
        </Tabs>
      </div>
    </ModuleProvider>
  );
}
