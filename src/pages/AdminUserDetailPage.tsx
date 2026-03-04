import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft, UserCheck, Users, Shield, Pencil, Settings2, Eye,
  UserX, Trash2, AlertTriangle, Building2, Mail, Phone, MapPin, UserPlus,
} from "lucide-react";
import { CreateMemberDialog } from "@/components/company/CreateMemberDialog";

interface SubUser {
  id: string;
  user_id: string;
  role: string;
  permissions: Record<string, boolean>;
  is_active: boolean;
  name: string;
  email: string;
}

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  city: string;
  state: string;
}

const ROLE_LABELS: Record<string, string> = {
  client_admin: "Administrador",
  operator: "Operador",
  client_finance: "Financeiro",
  viewer: "Visualizador",
};

const AdminUserDetailPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { startImpersonation } = useImpersonation();
  const { loadImpersonatedProfile } = useAuth();

  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [maxMembers, setMaxMembers] = useState(3);
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [editLimitOpen, setEditLimitOpen] = useState(false);
  const [newLimit, setNewLimit] = useState(3);
  const [savingLimit, setSavingLimit] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<SubUser | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, name, email, company, phone, city, state")
      .eq("id", userId)
      .single();

    if (profileData) setProfile(profileData as any);

    // Fetch account
    const { data: accountData } = await supabase
      .from("accounts")
      .select("id, max_members")
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (accountData) {
      setAccountId(accountData.id);
      setMaxMembers(accountData.max_members ?? 3);
      setNewLimit(accountData.max_members ?? 3);

      // Fetch members
      const { data: membersData } = await supabase
        .from("account_members")
        .select("*, profiles:user_id(name, email)")
        .eq("account_id", accountData.id);

      const mapped: SubUser[] = (membersData ?? []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        permissions: m.permissions ?? {},
        is_active: m.is_active,
        name: m.profiles?.name ?? "",
        email: m.profiles?.email ?? "",
      }));
      setSubUsers(mapped);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleImpersonate = async (targetId: string, targetName: string) => {
    const ok = await startImpersonation(targetId, targetName);
    if (ok) {
      await loadImpersonatedProfile(targetId);
      navigate("/");
    }
  };

  const handleToggleActive = async (member: SubUser) => {
    await supabase.from("account_members").update({ is_active: !member.is_active } as any).eq("id", member.id);
    toast.success(member.is_active ? "Sub-usuário desativado" : "Sub-usuário reativado");
    fetchData();
  };

  const handleRemoveMember = async () => {
    if (!deleteConfirm) return;
    await supabase.from("account_members").delete().eq("id", deleteConfirm.id);
    toast.success("Sub-usuário removido");
    setDeleteConfirm(null);
    fetchData();
  };

  const handleSaveLimit = async () => {
    if (!accountId) return;
    setSavingLimit(true);
    await supabase.from("accounts").update({ max_members: newLimit }).eq("id", accountId);
    toast.success(`Limite atualizado para ${newLimit}`);
    setMaxMembers(newLimit);
    setSavingLimit(false);
    setEditLimitOpen(false);
  };

  const adminUser = subUsers.find(u => u.role === "client_admin");
  const nonAdminUsers = subUsers.filter(u => u.role !== "client_admin");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-sm text-muted-foreground">Usuário não encontrado.</p>
        <Button variant="outline" onClick={() => navigate("/usuarios")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/usuarios")} className="h-9 w-9">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{profile.name}</h1>
          <p className="text-sm text-muted-foreground">Detalhes do administrador e sub-usuários</p>
        </div>
        <Button
          className="gap-1.5"
          variant="outline"
          onClick={() => handleImpersonate(profile.id, profile.name)}
        >
          <UserCheck className="w-4 h-4" />
          Personificar Administrador
        </Button>
      </div>

      {/* Admin Info Card */}
      <div className="gradient-card rounded-lg border border-border p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex items-center justify-center h-14 w-14 rounded-full bg-primary/10 text-primary font-bold text-lg">
            {profile.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{profile.email}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{profile.company || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{profile.phone || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{[profile.city, profile.state].filter(Boolean).join(", ") || "—"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/usuarios/${profile.id}/acesso`)} title="Controle de acesso">
              <Settings2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/dashboard/${profile.id}`)} title="Ver dashboard">
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Sub-users section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Sub-Usuários</h2>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`text-xs py-1 px-2.5 cursor-pointer hover:bg-accent ${
                nonAdminUsers.length >= maxMembers ? "border-warning/50 text-warning" : ""
              }`}
              onClick={() => { setNewLimit(maxMembers); setEditLimitOpen(true); }}
            >
              {nonAdminUsers.length} / {maxMembers} usuários
              <Pencil className="w-3 h-3 ml-1.5 inline" />
            </Badge>
            {accountId && (
              <Button
                size="sm"
                className="gap-1.5"
                disabled={nonAdminUsers.length >= maxMembers}
                onClick={() => setCreateDialogOpen(true)}
              >
                <UserPlus className="w-4 h-4" />
                Adicionar Sub-Usuário
              </Button>
            )}
          </div>
        </div>

        {!accountId && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>Este administrador ainda não possui uma conta/empresa configurada.</span>
          </div>
        )}

        {accountId && (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subUsers.map(m => (
                  <TableRow key={m.id} className={m.role === "client_admin" ? "bg-primary/5" : ""}>
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-1.5">
                        {m.name}
                        {m.role === "client_admin" && (
                          <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">Dono</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {ROLE_LABELS[m.role] ?? m.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {m.is_active ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {m.is_active && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-success"
                            onClick={() => handleImpersonate(m.user_id, m.name)}
                            title="Entrar como este usuário"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => navigate(`/usuarios/${m.user_id}/acesso`)}
                          title="Controle de acesso"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => navigate(`/dashboard/${m.user_id}`)}
                          title="Ver dashboard"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {m.role !== "client_admin" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleToggleActive(m)}
                              title={m.is_active ? "Desativar" : "Reativar"}
                            >
                              {m.is_active ? (
                                <UserX className="h-3.5 w-3.5 text-destructive" />
                              ) : (
                                <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteConfirm(m)}
                              title="Remover"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {subUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                      Nenhum membro encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Edit Limit Dialog */}
      <Dialog open={editLimitOpen} onOpenChange={setEditLimitOpen}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Limite de Sub-Usuários</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Defina o número máximo de sub-usuários para <strong>{profile.name}</strong>.
          </p>
          <div className="space-y-2">
            <Label className="text-foreground">Máximo</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={newLimit}
              onChange={e => setNewLimit(parseInt(e.target.value) || 0)}
              className="bg-accent border-border"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLimitOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveLimit} disabled={savingLimit}>
              {savingLimit ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Remover sub-usuário</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover <strong>{deleteConfirm?.name}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRemoveMember}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Sub-User Dialog */}
      {accountId && (
        <CreateMemberDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          accountId={accountId}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};

export default AdminUserDetailPage;
