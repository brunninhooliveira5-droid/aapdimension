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
import { useAuth } from "@/contexts/AuthContext";

const allTabs = [
  { value: "overview", label: "Visão Geral", icon: LayoutDashboard, permKey: null },
  { value: "tasks", label: "Tarefas", icon: ListTodo, permKey: "pc_tarefas" },
  { value: "pendencies", label: "Pendências", icon: AlertTriangle, permKey: "pc_pendencias" },
  { value: "schedule", label: "Cronograma", icon: CalendarDays, permKey: "pc_cronograma" },
  { value: "production", label: "Produção", icon: Factory, permKey: "pc_producao" },
  { value: "routines", label: "Rotinas", icon: RotateCcw, permKey: "pc_rotinas" },
  { value: "metas", label: "Metas", icon: Target, permKey: "pc_metas" },
  { value: "estoque", label: "Estoque/Produção", icon: Package, permKey: "pc_estoque" },
];

export default function ProductionControlPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const { user } = useAuth();

  // Admin and admin_master see all tabs; sub-users respect pc_* permissions
  const isAdmin = user?.role === "admin_master" || user?.accountMembership?.memberRole === "client_admin";
  const memberPermissions = user?.accountMembership?.permissions as Record<string, boolean> | undefined;

  const visibleTabs = allTabs.filter((tab) => {
    if (!tab.permKey) return true; // overview always visible
    if (isAdmin) return true;
    if (!memberPermissions) return true; // no restrictions
    // If the key is not explicitly set, default to true (visible)
    return memberPermissions[tab.permKey] !== false;
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
