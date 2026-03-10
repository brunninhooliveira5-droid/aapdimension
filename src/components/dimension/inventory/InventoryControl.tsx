import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Package, ArrowDownUp, BookmarkCheck, Bell, Truck, ClipboardCheck, FileText, Settings } from "lucide-react";
import { InventoryDashboard } from "./InventoryDashboard";
import { InventoryItemsList } from "./InventoryItemsList";
import { InventoryMovements } from "./InventoryMovements";
import { InventoryEntriesExits } from "./InventoryEntriesExits";
import { InventoryReservations } from "./InventoryReservations";
import { InventoryAlerts } from "./InventoryAlerts";
import { InventorySuppliers } from "./InventorySuppliers";
import { InventoryAudit } from "./InventoryAudit";
import { InventoryCalibrationLogs } from "./InventoryCalibrationLogs";
import { InventorySettings } from "./InventorySettings";
import { useModule } from "@/contexts/ModuleContext";
import { useInventoryAlertCount } from "@/hooks/useInventoryAlertCount";
import { useAuth } from "@/contexts/AuthContext";

export function InventoryControl() {
  const [tab, setTab] = useState("dashboard");
  const { tables } = useModule();
  const { data: alertCount = 0 } = useInventoryAlertCount(tables.inventoryItems, tables.inventoryMovements);
  const hasAlerts = alertCount > 0;
  const { user, getSectionVisibility } = useAuth();
  const isAdmin = user?.role === "admin_master";

  const allTabs = [
    { value: "dashboard", label: "Visão Geral", icon: BarChart3, permKey: "est_dashboard" },
    { value: "items", label: "Itens", icon: Package, permKey: "est_itens" },
    { value: "movements", label: "Movimentações", icon: ArrowDownUp, permKey: "est_movimentacoes" },
    { value: "entries-exits", label: "Entradas/Saídas", icon: ArrowDownUp, permKey: "est_entradas_saidas" },
    { value: "reservations", label: "Reservas", icon: BookmarkCheck, permKey: "est_reservas" },
    { value: "alerts", label: "Alertas", icon: Bell, permKey: "est_alertas" },
    { value: "suppliers", label: "Fornecedores", icon: Truck, permKey: "est_fornecedores" },
    { value: "audit", label: "Inventário", icon: ClipboardCheck, permKey: "est_inventario" },
    { value: "calibration-logs", label: "Logs", icon: FileText, permKey: "est_logs" },
    { value: "settings", label: "Configurações", icon: Settings, permKey: "est_configuracoes" },
  ];

  const tabs = allTabs.filter((t) => {
    if (isAdmin) return true;
    return getSectionVisibility(t.permKey) !== "hidden";
  });

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-transparent p-0 gap-1 flex-wrap h-auto">
          {tabs.map((t) => {
            const isAlertTab = t.value === "alerts" && hasAlerts;
            return (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className={`gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs ${isAlertTab ? "text-destructive" : ""}`}
              >
                <t.icon className={`h-3.5 w-3.5 ${isAlertTab ? "text-destructive animate-pulse" : ""}`} />
                <span className={isAlertTab ? "text-destructive animate-pulse" : ""}>{t.label}</span>
                {isAlertTab && <Bell className="h-3 w-3 text-destructive animate-pulse -ml-1" />}
              </TabsTrigger>
            );
          })}
        </TabsList>
        <TabsContent value="dashboard"><InventoryDashboard /></TabsContent>
        <TabsContent value="items"><InventoryItemsList /></TabsContent>
        <TabsContent value="movements"><InventoryMovements /></TabsContent>
        <TabsContent value="entries-exits"><InventoryEntriesExits /></TabsContent>
        <TabsContent value="reservations"><InventoryReservations /></TabsContent>
        <TabsContent value="alerts"><InventoryAlerts /></TabsContent>
        <TabsContent value="suppliers"><InventorySuppliers /></TabsContent>
        <TabsContent value="audit"><InventoryAudit /></TabsContent>
        <TabsContent value="calibration-logs"><InventoryCalibrationLogs /></TabsContent>
        <TabsContent value="settings"><InventorySettings /></TabsContent>
      </Tabs>
    </div>
  );
}
