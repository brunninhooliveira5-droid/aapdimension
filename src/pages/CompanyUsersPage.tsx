import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Users, Shield, Pencil, UserX, UserCheck, Trash2 } from "lucide-react";
import { CreateMemberDialog } from "@/components/company/CreateMemberDialog";
import { MemberPermissionsEditor } from "@/components/company/MemberPermissionsEditor";

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

const ROLE_LABELS: Record<string, string> = {
  client_admin: "Administrador",
  operator: "Operador",
  client_finance: "Financeiro",
  viewer: "Visualizador",
};

const CompanyUsersPage = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [editPermissions, setEditPermissions] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Member | null>(null);

  const accountId = user?.accountMembership?.accountId;
  const accountName = user?.accountMembership?.accountName;

  const fetchMembers = async () => {
    if (!accountId) return;
    setLoading(true);

    const { data: membersData } = await supabase
      .from("account_members")
      .select("*, profiles:user_id(name, email)")
      .eq("account_id", accountId);

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
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, [accountId]);

  const handleToggleActive = async (member: Member) => {
    await supabase.from("account_members").update({ is_active: !member.is_active } as any).eq("id", member.id);
    toast.success(member.is_active ? "Membro desativado" : "Membro reativado");
    fetchMembers();
  };

  const handleRemoveMember = async () => {
    if (!deleteConfirm) return;
    await supabase.from("account_members").delete().eq("id", deleteConfirm.id);
    toast.success("Membro removido");
    setDeleteConfirm(null);
    fetchMembers();
  };

  const handleEditOpen = (member: Member) => {
    setEditMember(member);
    setEditPermissions({ ...member.permissions });
  };

  const handleSavePermissions = async () => {
    if (!editMember) return;
    setSaving(true);
    await supabase.from("account_members").update({ permissions: editPermissions } as any).eq("id", editMember.id);
    toast.success("Permissões atualizadas! O usuário verá as mudanças no próximo login.");
    setSaving(false);
    setEditMember(null);
    fetchMembers();
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
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-1.5">
          <UserPlus className="h-4 w-4" />
          Adicionar Usuário
        </Button>
      </div>

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
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteConfirm(m)} title="Remover">
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
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
                    Nenhum membro encontrado. Clique em "Adicionar Usuário" para começar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover membro</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover <strong>{deleteConfirm?.name}</strong> da empresa? O usuário perderá acesso aos dados compartilhados.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRemoveMember}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Member Dialog */}
      <CreateMemberDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        accountId={accountId}
        onSuccess={fetchMembers}
      />
    </div>
  );
};

export default CompanyUsersPage;
