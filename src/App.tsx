import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Machines from "./pages/Machines";
import PartsStores from "./pages/PartsStores";
import MachineDashboard from "./pages/MachineDashboard";
import Support from "./pages/Support";
import Maintenance from "./pages/Maintenance";
import Financial from "./pages/Financial";
import SettingsPage from "./pages/SettingsPage";
import Login from "./pages/Login";
import UsersPage from "./pages/UsersPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Carregando...</p></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleGate({ section, children }: { section: string; children: React.ReactNode }) {
  const { hasAccess } = useAuth();
  if (!hasAccess(section)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const AppRoutes = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Carregando...</p></div>;
  
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<Index />} />
        <Route path="/dashboard/:userId" element={<RoleGate section="usuarios"><Index /></RoleGate>} />
        <Route path="/maquinas" element={<RoleGate section="maquinas"><Machines /></RoleGate>} />
        <Route path="/maquinas/:machineId" element={<RoleGate section="maquinas"><MachineDashboard /></RoleGate>} />
        <Route path="/suporte" element={<RoleGate section="suporte"><Support /></RoleGate>} />
        <Route path="/manutencao" element={<RoleGate section="manutencao"><Maintenance /></RoleGate>} />
        <Route path="/pecas" element={<RoleGate section="pecas"><PartsStores /></RoleGate>} />
        <Route path="/financeiro" element={<RoleGate section="financeiro"><Financial /></RoleGate>} />
        <Route path="/configuracoes" element={<RoleGate section="configuracoes"><SettingsPage /></RoleGate>} />
        <Route path="/usuarios" element={<RoleGate section="usuarios"><UsersPage /></RoleGate>} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
