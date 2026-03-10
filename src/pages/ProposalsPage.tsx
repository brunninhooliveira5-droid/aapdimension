import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cpu, FileText, History, Settings2, ClipboardCheck, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { MachineSpecsCatalog } from "@/components/proposals/MachineSpecsCatalog";
import { ProposalCreator } from "@/components/proposals/ProposalCreator";
import { ProposalHistory } from "@/components/proposals/ProposalHistory";
import { ProposalPdfConfiguration } from "@/components/proposals/ProposalPdfConfiguration";
import { TechnicalReportsList } from "@/components/proposals/TechnicalReportsList";
import { TechnicalReportPdfConfig } from "@/components/proposals/TechnicalReportPdfConfig";
import { TechnicalReportClients } from "@/components/proposals/TechnicalReportClients";

export default function ProposalsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin_master";
  const isInternal = user?.role === "usuario_interno" || isAdmin;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Propostas de Cliente</h1>
        <p className="text-sm text-muted-foreground">
          Gere propostas comerciais profissionais para máquinas Dimension
        </p>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0">
          <TabsTrigger value="create" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="w-4 h-4" /> Nova Proposta
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="w-4 h-4" /> Histórico
          </TabsTrigger>
          <TabsTrigger value="pdf-config" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings2 className="w-4 h-4" /> Config. PDF
          </TabsTrigger>
          {isInternal && (
            <TabsTrigger value="relatorio-tecnico" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ClipboardCheck className="w-4 h-4" /> Relatório Técnico
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="specs" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
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

        <TabsContent value="pdf-config">
          <ProposalPdfConfiguration />
        </TabsContent>

        {isInternal && (
          <TabsContent value="relatorio-tecnico">
            <TechnicalReportsList />
          </TabsContent>
        )}
        {isInternal && (
          <TabsContent value="rt-clientes">
            <TechnicalReportClients />
          </TabsContent>
        )}
        {isInternal && (
          <TabsContent value="rt-pdf-config">
            <TechnicalReportPdfConfig />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="specs">
            <MachineSpecsCatalog />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
