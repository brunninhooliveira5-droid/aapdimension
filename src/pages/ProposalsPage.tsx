import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cpu, FileText, History } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { MachineSpecsCatalog } from "@/components/proposals/MachineSpecsCatalog";
import { ProposalCreator } from "@/components/proposals/ProposalCreator";
import { ProposalHistory } from "@/components/proposals/ProposalHistory";

export default function ProposalsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin_master";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Propostas de Cliente</h1>
        <p className="text-sm text-muted-foreground">
          Gere propostas comerciais profissionais para máquinas Dimension
        </p>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className={`grid w-full max-w-2xl ${isAdmin ? "grid-cols-3" : "grid-cols-2"}`}>
          <TabsTrigger value="create" className="gap-2">
            <FileText className="w-4 h-4" /> Nova Proposta
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" /> Histórico
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="specs" className="gap-2">
              <Cpu className="w-4 h-4" /> Máquinas (Specs)
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="create">
          <ProposalCreator />
        </TabsContent>

        <TabsContent value="history">
          <ProposalHistory />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="specs">
            <MachineSpecsCatalog />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
