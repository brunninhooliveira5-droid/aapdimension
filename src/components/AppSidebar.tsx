import { Home, Cpu, Headphones, Calendar, DollarSign, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Minhas Máquinas", url: "/maquinas", icon: Cpu },
  { title: "Suporte", url: "/suporte", icon: Headphones },
  { title: "Manutenção", url: "/manutencao", icon: Calendar },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2 animate-fade-in">
            <div className="w-8 h-8 rounded gradient-amber flex items-center justify-center">
              <span className="font-mono text-sm font-bold text-primary-foreground">D</span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-sidebar-accent-foreground">Dimension</h2>
              <p className="text-[10px] font-mono text-muted-foreground tracking-widest">CNC</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded gradient-amber flex items-center justify-center mx-auto">
            <span className="font-mono text-sm font-bold text-primary-foreground">D</span>
          </div>
        )}
      </div>

      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
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

      <div className="mt-auto p-3 border-t border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 animate-fade-in">
            <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center">
              <span className="text-xs font-medium text-accent-foreground">JC</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-accent-foreground truncate">João Costa</p>
              <p className="text-[10px] text-muted-foreground truncate">Administrador</p>
            </div>
          </div>
        )}
      </div>
    </Sidebar>
  );
}
