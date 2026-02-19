import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type UserRole, roleLabels } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, UserCheck, UserX, Clock, Star, TrendingUp, Eye, Activity,
  BarChart3, AlertTriangle, ArrowRight
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  login_count: number;
  last_login_at: string | null;
  pro_access: boolean;
  valid_until: string | null;
}

interface LoginEvent {
  logged_in_at: string;
  user_id: string;
}

interface PageVisit {
  page_path: string;
  visited_at: string;
}

const PAGE_LABELS: Record<string, string> = {
  "/": "Home",
  "/orcamento": "Orçamento de Corte",
  "/gestao-financeira": "Financeiro",
  "/propostas": "Propostas",
  "/arquivos": "Arquivos",
  "/maquinas": "Máquinas",
  "/suporte": "Suporte",
  "/manutencao": "Manutenção",
  "/equipamentos": "Equipamentos",
  "/pecas": "Peças e Acessórios",
  "/boletos": "Faturas",
  "/configuracoes": "Configurações",
  "/boletins": "Boletins",
  "/usuarios": "Usuários",
};

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--muted-foreground))"];

const EngagementDashboard = () => {
  const navigate = useNavigate();
  const { loadImpersonatedProfile } = useAuth();
  const { startImpersonation } = useImpersonation();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loginEvents, setLoginEvents] = useState<LoginEvent[]>([]);
  const [pageVisits, setPageVisits] = useState<PageVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<"7" | "30" | "90">("30");

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [
      { data: profiles },
      { data: roles },
      { data: activity },
      { data: plans },
      { data: events },
      { data: visits },
    ] = await Promise.all([
      supabase.from("profiles").select("id, name, email"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("user_activity" as any).select("user_id, login_count, last_login_at"),
      supabase.from("user_plans").select("user_id, pro_access, valid_until"),
      supabase.from("user_login_events" as any).select("logged_in_at, user_id"),
      supabase.from("page_visits" as any).select("page_path, visited_at"),
    ]);

    const roleMap = new Map((roles ?? []).map((r: any) => [r.user_id, r.role as UserRole]));
    const activityMap = new Map((activity as any[] ?? []).map((a: any) => [a.user_id, a]));
    const planMap = new Map((plans ?? []).map((p: any) => [p.user_id, p]));

    const mapped: UserRow[] = (profiles ?? []).map((p: any) => {
      const act = activityMap.get(p.id);
      const plan = planMap.get(p.id);
      return {
        id: p.id,
        name: p.name,
        email: p.email,
        role: roleMap.get(p.id) ?? "operador",
        login_count: act?.login_count ?? 0,
        last_login_at: act?.last_login_at ?? null,
        pro_access: plan?.pro_access ?? false,
        valid_until: plan?.valid_until ?? null,
      };
    });

    setUsers(mapped);
    setLoginEvents((events as any[] ?? []).map((e: any) => ({ logged_in_at: e.logged_in_at, user_id: e.user_id })));
    setPageVisits((visits as any[] ?? []).map((v: any) => ({ page_path: v.page_path, visited_at: v.visited_at })));
    setLoading(false);
  };

  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;

  // KPIs
  const totalUsers = users.filter(u => u.role !== "admin_master").length;
  const active7 = users.filter(u => u.last_login_at && now - new Date(u.last_login_at).getTime() < 7 * msPerDay && u.role !== "admin_master").length;
  const active30 = users.filter(u => u.last_login_at && now - new Date(u.last_login_at).getTime() < 30 * msPerDay && u.role !== "admin_master").length;
  const inactive30 = users.filter(u => u.role !== "admin_master" && (!u.last_login_at || now - new Date(u.last_login_at).getTime() >= 30 * msPerDay)).length;
  const neverAccessed = users.filter(u => u.role !== "admin_master" && (!u.last_login_at || u.login_count === 0)).length;
  const proActive = users.filter(u => u.pro_access && u.role !== "admin_master").length;
  const proExpiring = users.filter(u => {
    if (!u.pro_access || !u.valid_until || u.role === "admin_master") return false;
    const diff = new Date(u.valid_until).getTime() - now;
    return diff > 0 && diff < 7 * msPerDay;
  }).length;

  // Chart data: logins per day
  const chartDays = parseInt(chartPeriod);
  const chartData = useMemo(() => {
    const cutoff = now - chartDays * msPerDay;
    const filtered = loginEvents.filter(e => new Date(e.logged_in_at).getTime() >= cutoff);

    const dayMap = new Map<string, { logins: number; uniqueUsers: Set<string> }>();
    for (let i = 0; i < chartDays; i++) {
      const d = new Date(now - (chartDays - 1 - i) * msPerDay);
      const key = d.toISOString().slice(0, 10);
      dayMap.set(key, { logins: 0, uniqueUsers: new Set() });
    }

    filtered.forEach(e => {
      const key = new Date(e.logged_in_at).toISOString().slice(0, 10);
      const entry = dayMap.get(key);
      if (entry) {
        entry.logins++;
        entry.uniqueUsers.add(e.user_id);
      }
    });

    return Array.from(dayMap.entries()).map(([date, data]) => ({
      date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      logins: data.logins,
      usuarios: data.uniqueUsers.size,
    }));
  }, [loginEvents, chartDays, now]);

  // Distribution pie
  const distributionData = [
    { name: "Ativos (7d)", value: active7, fill: COLORS[0] },
    { name: "Ativos (30d)", value: Math.max(0, active30 - active7), fill: COLORS[1] },
    { name: "Inativos", value: Math.max(0, inactive30 - neverAccessed), fill: COLORS[2] },
    { name: "Nunca acessaram", value: neverAccessed, fill: COLORS[3] },
  ].filter(d => d.value > 0);

  // Engagement by profile
  const profileStats = useMemo(() => {
    const groups: { label: string; filter: (u: UserRow) => boolean }[] = [
      { label: "Serviço", filter: u => u.role === "servico" },
      { label: "Operador", filter: u => u.role === "operador" },
      { label: "PRO", filter: u => u.pro_access },
      { label: "Não PRO", filter: u => !u.pro_access && u.role !== "admin_master" },
    ];

    return groups.map(g => {
      const subset = users.filter(u => u.role !== "admin_master").filter(g.filter);
      if (subset.length === 0) return { label: g.label, pctActive: 0, avgLogins: 0, count: 0 };
      const activeCount = subset.filter(u => u.last_login_at && now - new Date(u.last_login_at).getTime() < 30 * msPerDay).length;
      const avgLogins = subset.reduce((s, u) => s + u.login_count, 0) / subset.length;
      return {
        label: g.label,
        pctActive: Math.round((activeCount / subset.length) * 100),
        avgLogins: Math.round(avgLogins * 10) / 10,
        count: subset.length,
      };
    });
  }, [users, now]);

  // Most used features
  const featureRanking = useMemo(() => {
    const cutoff = now - 30 * msPerDay;
    const filtered = pageVisits.filter(v => new Date(v.visited_at).getTime() >= cutoff);
    const counts = new Map<string, number>();
    filtered.forEach(v => {
      // Normalize paths like /maquinas/xxx to /maquinas
      const base = "/" + (v.page_path.split("/")[1] ?? "");
      const label = PAGE_LABELS[base];
      if (label && base !== "/usuarios") {
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, visits]) => ({ name, visits }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 8);
  }, [pageVisits, now]);

  // Action lists
  const inactiveUsers = users
    .filter(u => u.role !== "admin_master" && u.last_login_at && now - new Date(u.last_login_at).getTime() >= 30 * msPerDay)
    .sort((a, b) => new Date(a.last_login_at!).getTime() - new Date(b.last_login_at!).getTime());

  const neverUsers = users.filter(u => u.role !== "admin_master" && (!u.last_login_at || u.login_count === 0));

  const expiringPro = users.filter(u => {
    if (!u.pro_access || !u.valid_until || u.role === "admin_master") return false;
    const diff = new Date(u.valid_until).getTime() - now;
    return diff > 0 && diff < 30 * msPerDay;
  });

  const handleImpersonate = async (u: UserRow) => {
    const ok = await startImpersonation(u.id, u.name || u.email);
    if (ok) {
      await loadImpersonatedProfile(u.id);
      navigate(u.role === "servico" ? "/orcamento" : "/");
    }
  };

  const daysAgo = (iso: string | null) => {
    if (!iso) return "—";
    const d = Math.floor((now - new Date(iso).getTime()) / msPerDay);
    return `${d}d atrás`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando dados de engajamento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Dashboard de Engajamento
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral de atividade e uso do portal</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Total Usuários", value: totalUsers, icon: Users, color: "text-foreground" },
          { label: "Ativos (7d)", value: active7, icon: UserCheck, color: "text-success" },
          { label: "Ativos (30d)", value: active30, icon: TrendingUp, color: "text-primary" },
          { label: "Inativos (30d+)", value: inactive30, icon: UserX, color: "text-warning" },
          { label: "Nunca acessaram", value: neverAccessed, icon: Clock, color: "text-muted-foreground" },
          { label: "PRO Ativos", value: proActive, icon: Star, color: "text-primary" },
          { label: "PRO Vencendo 7d", value: proExpiring, icon: AlertTriangle, color: "text-destructive" },
        ].map(kpi => (
          <Card key={kpi.label} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{kpi.label}</span>
              </div>
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Login activity chart */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Atividade de Logins</CardTitle>
              <Select value={chartPeriod} onValueChange={(v) => setChartPeriod(v as any)}>
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="h-64 overflow-hidden">
            <ChartContainer config={{
              logins: { label: "Logins", color: "hsl(var(--primary))" },
              usuarios: { label: "Usuários Únicos", color: "hsl(var(--success))" },
            }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="logins" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="usuarios" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Distribution pie */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Distribuição de Usuários</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            {distributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {distributionData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Engagement by profile + Most used features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By profile */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Engajamento por Perfil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-xs">Perfil</TableHead>
                    <TableHead className="text-xs text-center">Qtd</TableHead>
                    <TableHead className="text-xs text-center">% Ativos</TableHead>
                    <TableHead className="text-xs text-center">Média Logins</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profileStats.map(ps => (
                    <TableRow key={ps.label} className="border-border">
                      <TableCell className="text-sm font-medium">{ps.label}</TableCell>
                      <TableCell className="text-sm text-center">{ps.count}</TableCell>
                      <TableCell className="text-center">
                        <span className={`text-sm font-medium ${ps.pctActive >= 70 ? "text-success" : ps.pctActive >= 40 ? "text-warning" : "text-destructive"}`}>
                          {ps.pctActive}%
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-center">{ps.avgLogins}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Most used features */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Funcionalidades Mais Usadas (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {featureRanking.length > 0 ? (
              <ChartContainer config={{ visits: { label: "Visitas", color: "hsl(var(--primary))" } }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={featureRanking} layout="vertical" margin={{ left: 10 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} stroke="hsl(var(--muted-foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="visits" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados de navegação ainda</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action list */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Lista de Ação Rápida
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="inactive">
            <TabsList>
              <TabsTrigger value="inactive" className="text-xs">Inativos ({inactiveUsers.length})</TabsTrigger>
              <TabsTrigger value="never" className="text-xs">Nunca acessaram ({neverUsers.length})</TabsTrigger>
              <TabsTrigger value="expiring" className="text-xs">PRO Vencendo ({expiringPro.length})</TabsTrigger>
            </TabsList>

            {(["inactive", "never", "expiring"] as const).map(tab => {
              const list = tab === "inactive" ? inactiveUsers : tab === "never" ? neverUsers : expiringPro;
              return (
                <TabsContent key={tab} value={tab}>
                  {list.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Nenhum usuário nesta categoria.</p>
                  ) : (
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="text-xs">Nome</TableHead>
                            <TableHead className="text-xs">Perfil</TableHead>
                            <TableHead className="text-xs">Último Acesso</TableHead>
                            <TableHead className="text-xs text-center">Logins</TableHead>
                            {tab === "expiring" && <TableHead className="text-xs">Vence em</TableHead>}
                            <TableHead className="text-xs text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {list.slice(0, 20).map(u => (
                            <TableRow key={u.id} className="border-border">
                              <TableCell className="text-sm font-medium">{u.name}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{roleLabels[u.role]}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{daysAgo(u.last_login_at)}</TableCell>
                              <TableCell className="text-xs text-center">{u.login_count}</TableCell>
                              {tab === "expiring" && (
                                <TableCell className="text-xs text-destructive">
                                  {u.valid_until ? `${Math.ceil((new Date(u.valid_until).getTime() - now) / msPerDay)}d` : "—"}
                                </TableCell>
                              )}
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <TooltipProvider delayDuration={0}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/usuarios/${u.id}/acesso`)}>
                                          <Eye className="w-3.5 h-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="text-xs">Ver usuário</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleImpersonate(u)}>
                                          <UserCheck className="w-3.5 h-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="text-xs">Acessar como</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default EngagementDashboard;
