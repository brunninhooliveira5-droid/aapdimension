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
import ProposalsPage from "./pages/ProposalsPage";

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
        <Route path="/boletins" element={<RoleGate section="boletins"><BulletinsPage /></RoleGate>} />
        <Route path="/orcamento" element={<RoleGate section="orcamento"><CuttingQuotePage /></RoleGate>} />
        <Route path="/arquivos" element={<RoleGate section="arquivos"><FilesPage /></RoleGate>} />
        <Route path="/propostas" element={<RoleGate section="propostas"><ProposalsPage /></RoleGate>} />
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
