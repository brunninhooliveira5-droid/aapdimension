import { useState, useEffect } from "react";
import { Star, ShieldCheck, Search, Calendar, Clock, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type UserRole, roleLabels } from "@/contexts/AuthContext";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UserWithPlan {
  id: string;
  name: string;
  email: string;
  company: string;
  role: UserRole;
  plan: string;
  pro_access: boolean;
  features_enabled: string[];
  max_quotes_per_month: number;
  max_financial_entries: number;
  has_plan_row: boolean;
  pro_activated_at: string | null;
  last_access_at: string | null;
  has_pending_request: boolean;
}

const PRO_FEATURES = [
  { key: "gestao_financeira", label: "Financeiro" },
  { key: "orcamento", label: "Orçamento de Corte" },
];

const planBadge = (plan: string) => {
  switch (plan) {
    case "admin":
      return <Badge variant="default" className="bg-warning/15 text-warning border-warning/30 text-[10px]">Admin</Badge>;
    case "pro":
      return <Badge variant="default" className="bg-primary/15 text-primary border-primary/30 text-[10px]">PRO</Badge>;
    default:
      return <Badge variant="secondary" className="text-[10px]">Free</Badge>;
  }
};

export function ProPlanManager() {
  const [users, setUsers] = useState<UserWithPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: plans }, { data: requests }] = await Promise.all([
      supabase.from("profiles").select("id, name, email, company, approved"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("user_plans").select("*"),
      supabase.from("pro_access_requests" as any).select("user_id, status").eq("status", "pending"),
    ]);

    const roleMap = new Map(roles?.map((r) => [r.user_id, r.role as UserRole]) ?? []);
    const planMap = new Map(plans?.map((p) => [p.user_id, p]) ?? []);
    const pendingSet = new Set((requests as any[] ?? []).map((r: any) => r.user_id));

    const mapped: UserWithPlan[] = (profiles ?? [])
      .filter((p: any) => p.approved || roleMap.get(p.id) === "admin_master")
      .map((p: any) => {
        const role = roleMap.get(p.id) ?? "operador";
        const plan = planMap.get(p.id);
        return {
          id: p.id,
          name: p.name,
          email: p.email,
          company: p.company ?? "",
          role,
          plan: role === "admin_master" ? "admin" : (plan?.plan ?? "free"),
          pro_access: role === "admin_master" ? true : (plan?.pro_access ?? false),
          features_enabled: role === "admin_master"
            ? PRO_FEATURES.map((f) => f.key)
            : (plan?.features_enabled ?? []),
          max_quotes_per_month: plan?.max_quotes_per_month ?? 5,
          max_financial_entries: plan?.max_financial_entries ?? 0,
          has_plan_row: !!plan,
          pro_activated_at: (plan as any)?.pro_activated_at ?? null,
          last_access_at: (plan as any)?.last_access_at ?? null,
          has_pending_request: pendingSet.has(p.id),
        };
      });

    setUsers(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleProAccess = async (user: UserWithPlan) => {
    if (user.role === "admin_master") return;
    setSaving(user.id);

    const newProAccess = !user.pro_access;
    const newFeatures = newProAccess ? PRO_FEATURES.map((f) => f.key) : [];
    const newPlan = newProAccess ? "pro" : "free";

    if (user.has_plan_row) {
      await supabase
        .from("user_plans")
        .update({
          pro_access: newProAccess,
          plan: newPlan,
          features_enabled: newFeatures,
          max_quotes_per_month: newProAccess ? -1 : 5,
          max_financial_entries: newProAccess ? -1 : 0,
          ...(newProAccess ? { pro_activated_at: new Date().toISOString() } : { pro_activated_at: null }),
        } as any)
        .eq("user_id", user.id);
    } else {
      await supabase.from("user_plans").insert({
        user_id: user.id,
        pro_access: newProAccess,
        plan: newPlan,
        features_enabled: newFeatures,
        max_quotes_per_month: newProAccess ? -1 : 5,
        max_financial_entries: newProAccess ? -1 : 0,
        ...(newProAccess ? { pro_activated_at: new Date().toISOString() } : {}),
      } as any);
    }

    // If approving PRO, also update pending request to approved
    if (newProAccess && user.has_pending_request) {
      await supabase
        .from("pro_access_requests" as any)
        .update({ status: "approved", reviewed_at: new Date().toISOString() } as any)
        .eq("user_id", user.id)
        .eq("status", "pending");
    }

    toast.success(
      newProAccess
        ? `Acesso PRO ativado para ${user.name}`
        : `Acesso PRO desativado para ${user.name}`
    );
    setSaving(null);
    fetchUsers();
  };

  const toggleFeature = async (user: UserWithPlan, featureKey: string) => {
    if (user.role === "admin_master") return;
    setSaving(user.id);

    const current = user.features_enabled ?? [];
    const newFeatures = current.includes(featureKey)
      ? current.filter((f) => f !== featureKey)
      : [...current, featureKey];

    if (user.has_plan_row) {
      await supabase
        .from("user_plans")
        .update({ features_enabled: newFeatures })
        .eq("user_id", user.id);
    } else {
      await supabase.from("user_plans").insert({
        user_id: user.id,
        pro_access: user.pro_access,
        plan: user.plan,
        features_enabled: newFeatures,
      });
    }

    toast.success("Permissões atualizadas");
    setSaving(null);
    fetchUsers();
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.company.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = users.filter((u) => u.has_pending_request).length;

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        Carregando planos...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="gradient-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-primary fill-primary/30" />
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Gerenciamento de Acesso PRO
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-foreground">
              {users.filter((u) => u.pro_access).length}
            </p>
            <p className="text-muted-foreground">Usuários com PRO ativo</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-foreground">
              {users.filter((u) => !u.pro_access).length}
            </p>
            <p className="text-muted-foreground">Usuários Free</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-foreground">{users.length}</p>
            <p className="text-muted-foreground">Total de usuários</p>
          </div>
          <div className="space-y-1">
            <p className={`text-2xl font-bold ${pendingCount > 0 ? "text-warning" : "text-foreground"}`}>
              {pendingCount}
            </p>
            <p className="text-muted-foreground flex items-center gap-1">
              {pendingCount > 0 && <Bell className="w-3 h-3 text-warning" />}
              Solicitações pendentes
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, e-mail ou empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-accent border-border"
        />
      </div>

      {/* Table */}
      <div className="gradient-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground text-xs uppercase">Usuário</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase">Perfil</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase">Plano</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase text-center">PRO</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase">Ativação PRO</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase">Último Acesso</TableHead>
              {PRO_FEATURES.map((f) => (
                <TableHead key={f.key} className="text-muted-foreground text-xs uppercase text-center">
                  {f.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => {
              const isAdmin = u.role === "admin_master";
              return (
                <TableRow key={u.id} className="border-border">
                  <TableCell>
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-foreground">{u.name}</p>
                          {u.has_pending_request && (
                            <TooltipProvider delayDuration={0}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-0.5 rounded-full bg-warning/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-warning border border-warning/30">
                                    <Bell className="w-2.5 h-2.5" />
                                    Solicitou PRO
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">
                                  Este usuário solicitou acesso PRO
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                        {u.company && (
                          <p className="text-[10px] text-muted-foreground">{u.company}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        u.role === "admin" || u.role === "admin_master"
                          ? "bg-warning/15 text-warning border-warning/30"
                          : u.role === "operador"
                          ? "bg-info/15 text-info border-info/30"
                          : u.role === "servico"
                          ? "bg-primary/15 text-primary border-primary/30"
                          : "bg-success/15 text-success border-success/30"
                      }`}
                    >
                      {roleLabels[u.role]}
                    </span>
                  </TableCell>
                  <TableCell>{planBadge(u.plan)}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={u.pro_access}
                      onCheckedChange={() => toggleProAccess(u)}
                      disabled={isAdmin || saving === u.id}
                      className="data-[state=checked]:bg-primary"
                    />
                  </TableCell>
                  <TableCell>
                    {u.pro_activated_at ? (
                      <div>
                        <p className="text-xs text-foreground">{format(new Date(u.pro_activated_at), "dd/MM/yyyy")}</p>
                        <p className="text-[10px] text-muted-foreground">{format(new Date(u.pro_activated_at), "HH:mm")}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.last_access_at ? (
                      <div>
                        <p className="text-xs text-foreground">
                          {formatDistanceToNow(new Date(u.last_access_at), { addSuffix: true, locale: ptBR })}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{format(new Date(u.last_access_at), "dd/MM/yyyy HH:mm")}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  {PRO_FEATURES.map((f) => (
                    <TableCell key={f.key} className="text-center">
                      <Switch
                        checked={u.features_enabled.includes(f.key)}
                        onCheckedChange={() => toggleFeature(u, f.key)}
                        disabled={isAdmin || !u.pro_access || saving === u.id}
                        className="data-[state=checked]:bg-primary"
                      />
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6 + PRO_FEATURES.length} className="text-center text-muted-foreground text-sm py-8">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
