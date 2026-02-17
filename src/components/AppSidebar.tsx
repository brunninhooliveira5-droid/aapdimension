import { useState } from "react";
import { Home, Cpu, Headphones, Calendar, Settings, LogOut, Users, ShoppingBag, Package, Newspaper, Calculator, FolderOpen, Receipt, Landmark, Lock, Star, Crown, Sparkles } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import dimensionLogo from "@/assets/dimension-logo.png";
import { useAuth, roleLabels } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const basicMenuItems = [
  { title: "Home", url: "/", altUrl: "/orcamento", icon: Home, section: "home" },
  { title: "Minhas Máquinas", url: "/maquinas", icon: Cpu, section: "maquinas" },
  { title: "Suporte", url: "/suporte", icon: Headphones, section: "suporte" },
  { title: "Manutenção", url: "/manutencao", icon: Calendar, section: "manutencao" },
  { title: "Equipamentos Dimension", url: "/equipamentos", icon: Package, section: "equipamentos" },
  { title: "Peças e Acessórios", url: "/pecas", icon: ShoppingBag, section: "pecas" },
  { title: "Boletos", url: "/boletos", icon: Receipt, section: "financeiro" },
  { title: "Configurações", url: "/configuracoes", icon: Settings, section: "configuracoes" },
  { title: "Usuários", url: "/usuarios", icon: Users, section: "usuarios" },
  { title: "Boletins Técnicos", url: "/boletins", icon: Newspaper, section: "boletins" },
  { title: "Arquivos", url: "/arquivos", icon: FolderOpen, section: "arquivos" },
];

const proMenuItems = [
  { title: "Financeiro", url: "/gestao-financeira", icon: Landmark, section: "gestao_financeira", proFeature: "gestao_financeira" },
  { title: "Orçamento de Corte", url: "/orcamento", icon: Calculator, section: "orcamento", proFeature: "orcamento" },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, session, logout, hasAccess, getSectionVisibility, hasProAccess } = useAuth();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleRequestPro = async () => {
    const userId = session?.user?.id;
    if (!user || !userId) return;
    setRequesting(true);
    try {
      const { data: existing } = await supabase
        .from("pro_access_requests" as any)
        .select("id, status")
        .eq("user_id", userId)
        .eq("status", "pending")
        .maybeSingle();

      if (existing) {
        toast.info("Você já possui uma solicitação pendente.");
        setRequestDialogOpen(false);
        setRequesting(false);
        return;
      }

      await supabase
        .from("pro_access_requests" as any)
        .insert({ user_id: userId, status: "pending" } as any);

      toast.success("Solicitação enviada! O administrador será notificado.");
      setRequestDialogOpen(false);
    } catch {
      toast.error("Erro ao enviar solicitação.");
    }
    setRequesting(false);
  };

  // Filter items: show if visible or locked (not hidden)
  const visibleBasicItems = basicMenuItems.filter((item) => hasAccess(item.section));
  const visibleProItems = proMenuItems.filter((item) => hasAccess(item.section));

  const isPro = hasProAccess();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2 animate-fade-in">
            <img src={dimensionLogo} alt="Dimension CNC" className="h-8 w-auto" />
          </div>
        )}
        {collapsed && (
          <img src={dimensionLogo} alt="Dimension CNC" className="h-7 w-auto mx-auto" />
        )}
      </div>

      <SidebarContent className="pt-2">
        {/* Basic menu items */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleBasicItems.map((item) => {
                const effectiveUrl = item.altUrl && user?.role === "servico" ? item.altUrl : item.url;
                const isActive = effectiveUrl === "/" ? location.pathname === "/" : location.pathname.startsWith(effectiveUrl);
                const visibility = getSectionVisibility(item.section);

                if (visibility === "locked") {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-full">
                              <SidebarMenuButton
                                tooltip={item.title}
                                className="opacity-50 cursor-not-allowed pointer-events-auto hover:bg-transparent"
                              >
                                <Lock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">{item.title}</span>
                              </SidebarMenuButton>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">
                            Acesso bloqueado pelo administrador
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <NavLink to={effectiveUrl} end={effectiveUrl === "/"} className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-primary font-medium">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* PRO section */}
        {visibleProItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupContent>
              {/* PRO header */}
              <div className={`mx-2 mb-1 mt-1 rounded-lg border border-primary/20 bg-primary/5 ${collapsed ? "px-1 py-2" : "px-3 py-2"}`}>
                {!collapsed ? (
                  <div className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-primary fill-primary/30" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Acesso PRO</span>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <Star className="h-3.5 w-3.5 text-primary fill-primary/30" />
                  </div>
                )}
              </div>

              <SidebarMenu>
                <TooltipProvider delayDuration={0}>
                  {visibleProItems.map((item) => {
                    const isActive = location.pathname.startsWith(item.url);
                    const hasPro = hasProAccess(item.proFeature);
                    const visibility = getSectionVisibility(item.section);

                    // Locked by admin or no PRO access
                    if (visibility === "locked" || !hasPro) {
                      return (
                        <SidebarMenuItem key={item.title}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="w-full">
                                <SidebarMenuButton
                                  tooltip={item.title}
                                  className="opacity-50 cursor-not-allowed pointer-events-auto hover:bg-transparent"
                                >
                                  <Lock className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">{item.title}</span>
                                </SidebarMenuButton>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="text-xs">
                              {visibility === "locked" ? "Acesso bloqueado pelo administrador" : "Recurso disponível no Acesso PRO"}
                            </TooltipContent>
                          </Tooltip>
                        </SidebarMenuItem>
                      );
                    }

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                          <NavLink to={item.url} className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-primary font-medium">
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </TooltipProvider>
              </SidebarMenu>

              {/* Solicitar PRO button for non-PRO users */}
              {!isPro && !collapsed && (
                <div className="mx-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRequestDialogOpen(true)}
                    className="w-full gap-1.5 text-[11px] border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Solicitar Acesso PRO
                  </Button>
                </div>
              )}
              {!isPro && collapsed && (
                <div className="mx-1 mt-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setRequestDialogOpen(true)}
                        className="w-full h-8 border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      Solicitar Acesso PRO
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <div className="mt-auto p-3 border-t border-sidebar-border space-y-2">
        {!collapsed && user && (
          <div className="flex items-center gap-2 px-2 animate-fade-in">
            <div className="relative w-7 h-7 rounded-full bg-accent flex items-center justify-center">
              <span className="text-xs font-medium text-accent-foreground">{user.initials}</span>
              {isPro && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center">
                  <Crown className="w-2 h-2 text-primary-foreground" />
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{user.name}</p>
                {isPro ? (
                  <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0 text-[9px] font-bold uppercase tracking-wider text-primary">
                    <Star className="w-2 h-2 fill-primary" />PRO
                  </span>
                ) : (
                  <span className="shrink-0 inline-flex items-center rounded-full bg-muted px-1.5 py-0 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    FREE
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground truncate">{roleLabels[user.role]}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          onClick={handleLogout}
          className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-2 justify-start"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="text-xs">Sair</span>}
        </Button>
      </div>

      {/* Dialog de solicitação PRO */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary fill-primary/30" />
              Solicitar Acesso PRO
            </DialogTitle>
            <DialogDescription>
              Ao solicitar, o administrador será notificado e poderá ativar seu acesso PRO. Você terá acesso a funcionalidades como Gestão Financeira e Orçamento de Corte.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)} disabled={requesting}>
              Cancelar
            </Button>
            <Button onClick={handleRequestPro} disabled={requesting} className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              {requesting ? "Enviando..." : "Enviar Solicitação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
