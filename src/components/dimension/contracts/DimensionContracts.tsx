import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, FilePlus, Settings2 } from "lucide-react";
import { ContractsList } from "./ContractsList";
import { ContractForm } from "./ContractForm";
import { ContractPdfConfig } from "./ContractPdfConfig";

export function DimensionContracts() {
  const [tab, setTab] = useState("list");
  const [editContractId, setEditContractId] = useState<string | null>(null);

  const handleEdit = (id: string) => {
    setEditContractId(id);
    setTab("form");
  };

  const handleNewContract = () => {
    setEditContractId(null);
    setTab("form");
  };

  const handleSaved = () => {
    setEditContractId(null);
    setTab("list");
  };

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-transparent p-0 gap-1">
          <TabsTrigger value="list" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ClipboardList className="h-3.5 w-3.5" /> Contratos
          </TabsTrigger>
          <TabsTrigger value="form" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FilePlus className="h-3.5 w-3.5" /> {editContractId ? "Editar Contrato" : "Novo Contrato"}
          </TabsTrigger>
          <TabsTrigger value="pdf-config" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings2 className="h-3.5 w-3.5" /> Configuração de PDF
          </TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <ContractsList onEdit={handleEdit} onNew={handleNewContract} />
        </TabsContent>
        <TabsContent value="form">
          <ContractForm contractId={editContractId} onSaved={handleSaved} onCancel={() => setTab("list")} />
        </TabsContent>
        <TabsContent value="pdf-config">
          <ContractPdfConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
