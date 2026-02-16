import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinanceDashboard } from "@/components/financeiro/FinanceDashboard";
import { AccountsPayable } from "@/components/financeiro/AccountsPayable";
import { AccountsReceivable } from "@/components/financeiro/AccountsReceivable";
import { CashFlow } from "@/components/financeiro/CashFlow";
import Financial from "@/pages/Financial";
import { FinanceReports } from "@/components/financeiro/FinanceReports";
import { LayoutDashboard, ArrowDownCircle, ArrowUpCircle, Receipt, Wallet, FileBarChart } from "lucide-react";

export default function GestaoFinanceiraPage() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Gestão Financeira</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Controle completo de contas a pagar, receber, caixa e relatórios
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-accent/50 border border-border overflow-x-auto">
          <TabsTrigger value="dashboard" className="gap-1.5 data-[state=active]:bg-background">
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="payable" className="gap-1.5 data-[state=active]:bg-background">
            <ArrowDownCircle className="w-4 h-4" />
            Contas a Pagar
          </TabsTrigger>
          <TabsTrigger value="receivable" className="gap-1.5 data-[state=active]:bg-background">
            <ArrowUpCircle className="w-4 h-4" />
            Contas a Receber
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="gap-1.5 data-[state=active]:bg-background">
            <Wallet className="w-4 h-4" />
            Fluxo de Caixa
          </TabsTrigger>
          <TabsTrigger value="boletos" className="gap-1.5 data-[state=active]:bg-background">
            <Receipt className="w-4 h-4" />
            Boletos de Clientes
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5 data-[state=active]:bg-background">
            <FileBarChart className="w-4 h-4" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <FinanceDashboard />
        </TabsContent>

        <TabsContent value="payable" className="mt-4">
          <AccountsPayable />
        </TabsContent>

        <TabsContent value="receivable" className="mt-4">
          <AccountsReceivable />
        </TabsContent>

        <TabsContent value="cashflow" className="mt-4">
          <CashFlow />
        </TabsContent>

        <TabsContent value="boletos" className="mt-4">
          <Financial />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <FinanceReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}
