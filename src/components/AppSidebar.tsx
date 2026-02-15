import { Home, Cpu, Headphones, Calendar, DollarSign, Settings, LogOut, Users, ShoppingBag, Package, ClipboardList } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import dimensionLogo from "@/assets/dimension-logo.png";
import { useAuth, roleLabels } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
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

const menuItems = [
  { title: "Home", url: "/", icon: Home, section: "home" },
  { title: "Minhas Máquinas", url: "/maquinas", icon: Cpu, section: "maquinas" },
  { title: "Suporte", url: "/suporte", icon: Headphones, section: "suporte" },
  { title: "Manutenção", url: "/manutencao", icon: Calendar, section: "manutencao" },
  { title: "Equipamentos Dimension", url: "/equipamentos", icon: Package, section: "equipamentos" },
  { title: "Cadastro de Equipamentos", url: "/cadastro-equipamentos", icon: ClipboardList, section: "cadastro_equipamentos" },
  { title: "Peças e Acessórios", url: "/pecas", icon: ShoppingBag, section: "pecas" },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign, section: "financeiro" },
  { title: "Configurações", url: "/configuracoes", icon: Settings, section: "configuracoes" },
  { title: "Usuários", url: "/usuarios", icon: Users, section: "usuarios" },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, logout, hasAccess } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const visibleItems = menuItems.filter((item) => hasAccess(item.section));

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
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const isActive = item.url === "/" ? location.pathname === "/" : location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <NavLink to={item.url} end={item.url === "/"} className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-primary font-medium">
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
      </SidebarContent>

      <div className="mt-auto p-3 border-t border-sidebar-border space-y-2">
        {!collapsed && user && (
          <div className="flex items-center gap-2 px-2 animate-fade-in">
            <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center">
              <span className="text-xs font-medium text-accent-foreground">{user.initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{user.name}</p>
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
    </Sidebar>
  );
}
