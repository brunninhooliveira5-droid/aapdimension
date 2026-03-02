import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Package, ArrowDownUp, ArrowDownToLine, ArrowUpFromLine, BookmarkCheck, Bell, Truck, ClipboardCheck, Settings } from "lucide-react";
import { InventoryDashboard } from "./InventoryDashboard";
import { InventoryItemsList } from "./InventoryItemsList";
import { InventoryMovements } from "./InventoryMovements";
import { InventoryEntries } from "./InventoryEntries";
import { InventoryExits } from "./InventoryExits";
import { InventoryReservations } from "./InventoryReservations";
import { InventoryAlerts } from "./InventoryAlerts";
import { InventorySuppliers } from "./InventorySuppliers";
import { InventoryAudit } from "./InventoryAudit";
import { InventorySettings } from "./InventorySettings";

export function InventoryControl() {
  const [tab, setTab] = useState("dashboard");

  const tabs = [
    { value: "dashboard", label: "Visão Geral", icon: BarChart3 },
    { value: "items", label: "Itens", icon: Package },
    { value: "movements", label: "Movimentações", icon: ArrowDownUp },
    { value: "entries", label: "Entradas", icon: ArrowDownToLine },
    { value: "exits", label: "Saídas", icon: ArrowUpFromLine },
    { value: "reservations", label: "Reservas", icon: BookmarkCheck },
    { value: "alerts", label: "Alertas", icon: Bell },
    { value: "suppliers", label: "Fornecedores", icon: Truck },
    { value: "audit", label: "Inventário", icon: ClipboardCheck },
    { value: "settings", label: "Configurações", icon: Settings },
  ];

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-transparent p-0 gap-1 flex-wrap h-auto">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs"
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="dashboard"><InventoryDashboard /></TabsContent>
        <TabsContent value="items"><InventoryItemsList /></TabsContent>
        <TabsContent value="movements"><InventoryMovements /></TabsContent>
        <TabsContent value="entries"><InventoryEntries /></TabsContent>
        <TabsContent value="exits"><InventoryExits /></TabsContent>
        <TabsContent value="reservations"><InventoryReservations /></TabsContent>
        <TabsContent value="alerts"><InventoryAlerts /></TabsContent>
        <TabsContent value="suppliers"><InventorySuppliers /></TabsContent>
        <TabsContent value="audit"><InventoryAudit /></TabsContent>
        <TabsContent value="settings"><InventorySettings /></TabsContent>
      </Tabs>
    </div>
  );
}
