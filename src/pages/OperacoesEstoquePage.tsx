import { ModuleProvider, productionControlConfig } from "@/contexts/ModuleContext";
import { InventoryControl } from "@/components/dimension/inventory/InventoryControl";

export default function OperacoesEstoquePage() {
  return (
    <ModuleProvider config={productionControlConfig}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Controle de Estoque</h1>
          <p className="text-muted-foreground text-sm">Gerenciamento completo do estoque operacional.</p>
        </div>
        <InventoryControl />
      </div>
    </ModuleProvider>
  );
}
