import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Machines from "./pages/Machines";
import PartsStores from "./pages/PartsStores";
import EquipmentCatalog from "./pages/EquipmentCatalog";
import MachineDashboard from "./pages/MachineDashboard";
import Support from "./pages/Support";
import Maintenance from "./pages/Maintenance";
import Financial from "./pages/Financial";
import SettingsPage from "./pages/SettingsPage";
import Login from "./pages/Login";
import UsersPage from "./pages/UsersPage";
import NotFound from "./pages/NotFound";
import BulletinsPage from "./pages/BulletinsPage";
import CuttingQuotePage from "./pages/CuttingQuotePage";
import FilesPage from "./pages/FilesPage";
import GestaoFinanceiraPage from "./pages/GestaoFinanceiraPage";
import UserAccessPage from "./pages/UserAccessPage";

import EngagementDashboard from "./pages/EngagementDashboard";
import EquipmentRegistration from "./pages/EquipmentRegistration";
import EquipmentDashboard from "./pages/EquipmentDashboard";
import DimensionPortal from "./pages/DimensionPortal";
import ProductionControlPage from "./pages/ProductionControlPage";
import CompanyUsersPage from "./pages/CompanyUsersPage";
import AdminUserDetailPage from "./pages/AdminUserDetailPage";
import OperacoesEstoquePage from "./pages/OperacoesEstoquePage";
import OperacoesFichasPage from "./pages/OperacoesFichasPage";
import WorkDiaryPage from "./pages/WorkDiaryPage";
import CuttingPlanPage from "./pages/CuttingPlanPage";
import Slicer3DPage from "./pages/Slicer3DPage";
import BoxGeneratorPage from "./pages/BoxGeneratorPage";
import AcmPlannerPage from "./pages/AcmPlannerPage";
import ToolpathGeneratorPage from "./pages/ToolpathGeneratorPage";
import PaymentReceiptsPage from "./pages/PaymentReceiptsPage";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Carregando...</p></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleGate({ section, children }: { section: string; children: React.ReactNode }) {
  const { getSectionVisibility } = useAuth();
  const visibility = getSectionVisibility(section);
  if (visibility === "hidden" || visibility === "locked") return <Navigate to="/" replace />;
  return <>{children}</>;
}

const AppRoutes = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Carregando...</p></div>;

  // Redirect servico users to /orcamento after login
  const homeRedirect = isAuthenticated && user?.role === "servico" ? "/orcamento" : "/";
  
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to={homeRedirect} replace /> : <Login />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<Index />} />
        <Route path="/dashboard/:userId" element={<RoleGate section="usuarios"><Index /></RoleGate>} />
        <Route path="/maquinas" element={<RoleGate section="maquinas"><Machines /></RoleGate>} />
        <Route path="/maquinas/:machineId" element={<RoleGate section="maquinas"><MachineDashboard /></RoleGate>} />
        <Route path="/suporte" element={<RoleGate section="suporte"><Support /></RoleGate>} />
        <Route path="/manutencao" element={<RoleGate section="manutencao"><Maintenance /></RoleGate>} />
        <Route path="/equipamentos" element={<RoleGate section="equipamentos"><EquipmentCatalog /></RoleGate>} />
        <Route path="/pecas" element={<RoleGate section="pecas"><PartsStores /></RoleGate>} />
        <Route path="/boletos" element={<RoleGate section="financeiro"><Financial /></RoleGate>} />
        <Route path="/gestao-financeira" element={<RoleGate section="gestao_financeira"><GestaoFinanceiraPage /></RoleGate>} />
        <Route path="/configuracoes" element={<RoleGate section="configuracoes"><SettingsPage /></RoleGate>} />
        <Route path="/usuarios" element={<RoleGate section="usuarios"><UsersPage /></RoleGate>} />
        <Route path="/usuarios/:userId/acesso" element={<RoleGate section="usuarios"><UserAccessPage /></RoleGate>} />
        <Route path="/usuarios/:userId/detalhes" element={<RoleGate section="usuarios"><AdminUserDetailPage /></RoleGate>} />
        <Route path="/boletins" element={<RoleGate section="boletins"><BulletinsPage /></RoleGate>} />
        <Route path="/orcamento" element={<RoleGate section="orcamento"><CuttingQuotePage /></RoleGate>} />
        <Route path="/arquivos" element={<RoleGate section="arquivos"><FilesPage /></RoleGate>} />
        <Route path="/propostas" element={<Navigate to="/dimension" replace />} />
        <Route path="/engajamento" element={<RoleGate section="usuarios"><EngagementDashboard /></RoleGate>} />
        <Route path="/cadastro-equipamentos" element={<RoleGate section="maquinas"><EquipmentRegistration /></RoleGate>} />
        <Route path="/cadastro-equipamentos/:equipmentId" element={<RoleGate section="maquinas"><EquipmentDashboard /></RoleGate>} />
        <Route path="/dimension" element={<RoleGate section="dimension"><DimensionPortal /></RoleGate>} />
        <Route path="/controle-producao" element={<RoleGate section="controle_producao"><ProductionControlPage /></RoleGate>} />
        <Route path="/operacoes/estoque" element={<RoleGate section="op_estoque"><OperacoesEstoquePage /></RoleGate>} />
        <Route path="/operacoes/fichas" element={<RoleGate section="op_fichas"><OperacoesFichasPage /></RoleGate>} />
        <Route path="/operacoes/diario" element={<RoleGate section="op_diario"><WorkDiaryPage /></RoleGate>} />
        <Route path="/operacoes/comprovantes" element={<RoleGate section="op_comprovantes"><PaymentReceiptsPage /></RoleGate>} />
        <Route path="/empresa/usuarios" element={<RoleGate section="empresa"><CompanyUsersPage /></RoleGate>} />
        <Route path="/plano-corte" element={<RoleGate section="ferr_plano_corte"><CuttingPlanPage /></RoleGate>} />
        <Route path="/slicer-3d" element={<RoleGate section="ferr_slicer_3d"><Slicer3DPage /></RoleGate>} />
        <Route path="/gerador-caixas" element={<RoleGate section="ferr_gerador_caixas"><BoxGeneratorPage /></RoleGate>} />
        <Route path="/planificador-acm" element={<RoleGate section="ferr_planificador_acm"><AcmPlannerPage /></RoleGate>} />
        <Route path="/gerador-percurso" element={<RoleGate section="ferr_gerador_percurso"><ToolpathGeneratorPage /></RoleGate>} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// App root
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ImpersonationProvider>
            <AppRoutes />
          </ImpersonationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
