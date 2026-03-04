import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Users, Shield, Pencil, UserX, UserCheck, Clock, Copy, MessageCircle } from "lucide-react";
import { InviteMemberDialog } from "@/components/company/InviteMemberDialog";
import { MemberPermissionsEditor } from "@/components/company/MemberPermissionsEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Member {
  id: string;
  user_id: string;
  role: string;
  permissions: Record<string, boolean>;
  is_active: boolean;
  created_at: string;
  name: string;
  email: string;
}

interface Invite {
  id: string;
  name: string;
  email: string;
  suggested_role: string;
  status: string;
  invite_token: string;
  created_at: string;
  expires_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  client_admin: "Administrador",
  operator: "Operador",
  client_finance: "Financeiro",
  viewer: "Visualizador",
};

const CompanyUsersPage = () => {
  const { user, session } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [editPermissions, setEditPermissions] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const accountId = user?.accountMembership?.accountId;
  const accountName = user?.accountMembership?.accountName;

  const fetchData = async () => {
    if (!accountId) return;
    setLoading(true);

    const [{ data: membersData }, { data: invitesData }] = await Promise.all([
      supabase.from("account_members").select("*, profiles:user_id(name, email)").eq("account_id", accountId),
      supabase.from("account_invites").select("*").eq("account_id", accountId).order("created_at", { ascending: false }),
    ]);

    const mapped: Member[] = (membersData ?? []).map((m: any) => ({
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      permissions: m.permissions ?? {},
      is_active: m.is_active,
      created_at: m.created_at,
      name: m.profiles?.name ?? "",
      email: m.profiles?.email ?? "",
    }));

    setMembers(mapped);
    setInvites((invitesData as any[] ?? []).map((i: any) => ({
      id: i.id,
      name: i.name,
      email: i.email,
      suggested_role: i.suggested_role,
      status: i.status,
      invite_token: i.invite_token,
      created_at: i.created_at,
      expires_at: i.expires_at,
    })));
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [accountId]);

  const handleToggleActive = async (member: Member) => {
    await supabase.from("account_members").update({ is_active: !member.is_active } as any).eq("id", member.id);
    toast.success(member.is_active ? "Membro desativado" : "Membro reativado");
    fetchData();
  };

  const handleRemoveMember = async (member: Member) => {
    await supabase.from("account_members").delete().eq("id", member.id);
    toast.success("Membro removido");
    fetchData();
  };

  const handleEditOpen = (member: Member) => {
    setEditMember(member);
    setEditPermissions({ ...member.permissions });
  };

  const handleSavePermissions = async () => {
    if (!editMember) return;
    setSaving(true);
    await supabase.from("account_members").update({ permissions: editPermissions } as any).eq("id", editMember.id);
    toast.success("Permissões atualizadas");
    setSaving(false);
    setEditMember(null);
    fetchData();
  };

  const handleCancelInvite = async (inviteId: string) => {
    await supabase.from("account_invites").update({ status: "expirado" } as any).eq("id", inviteId);
    toast.success("Convite cancelado");
    fetchData();
  };

  const handleCopyInviteLink = (token: string) => {
    const link = `${window.location.origin}/login?invite=${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  if (!accountId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Users className="h-16 w-16 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold text-foreground">Nenhuma empresa vinculada</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Sua conta não está vinculada a uma empresa. Solicite ao administrador para configurar o acesso multiusuário.
        </p>
      </div>
    );
  }

  const pendingInvites = invites.filter(i => i.status === "pendente");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Minha Empresa</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <Shield className="inline h-3.5 w-3.5 mr-1" />
            {accountName} — Gerencie os usuários da sua empresa
          </p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)} className="gap-1.5">
          <UserPlus className="h-4 w-4" />
          Convidar Usuário
        </Button>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Membros ({members.length})</TabsTrigger>
          <TabsTrigger value="invites">
            Convites
            {pendingInvites.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{pendingInvites.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
          ) : (
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
                  {members.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium text-sm">{m.name}</TableCell>
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
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditOpen(m)} title="Editar permissões">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {m.role !== "client_admin" && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleActive(m)} title={m.is_active ? "Desativar" : "Reativar"}>
                                {m.is_active ? <UserX className="h-3.5 w-3.5 text-destructive" /> : <UserCheck className="h-3.5 w-3.5 text-emerald-600" />}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {members.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                        Nenhum membro encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="invites" className="mt-4">
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium text-sm">{inv.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{inv.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {ROLE_LABELS[inv.suggested_role] ?? inv.suggested_role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {inv.status === "pendente" ? (
                        <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">
                          <Clock className="h-3 w-3 mr-1" />Pendente
                        </Badge>
                      ) : inv.status === "aceito" ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">Aceito</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Expirado</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(inv.expires_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      {inv.status === "pendente" && (
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyInviteLink(inv.invite_token)} title="Copiar link">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleCancelInvite(inv.id)} title="Cancelar">
                            <UserX className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {invites.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                      Nenhum convite encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Permissions Dialog */}
      <Dialog open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permissões — {editMember?.name}</DialogTitle>
          </DialogHeader>
          <MemberPermissionsEditor permissions={editPermissions} onChange={setEditPermissions} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMember(null)}>Cancelar</Button>
            <Button onClick={handleSavePermissions} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        accountId={accountId}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default CompanyUsersPage;
