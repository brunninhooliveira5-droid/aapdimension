import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, ShieldCheck, CheckCircle, XCircle, Clock, Phone, Eye, Star, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type UserRole, roleLabels } from "@/contexts/AuthContext";
import { ProPlanManager } from "@/components/users/ProPlanManager";

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  company: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  role: UserRole;
  approved: boolean;
  rejected: boolean;
}

const assignableRoles: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "operador", label: "Operador" },
  { value: "financeiro", label: "Financeiro" },
];

const UsersPage = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("operador");

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*");

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const roleMap = new Map(roles?.map(r => [r.user_id, r.role as UserRole]) ?? []);

    const mapped: ManagedUser[] = (profiles ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      company: p.company ?? "",
      address: p.address ?? "",
      city: p.city ?? "",
      state: p.state ?? "",
      zip_code: p.zip_code ?? "",
      phone: p.phone ?? "",
      role: roleMap.get(p.id) ?? "operador",
      approved: p.approved ?? false,
      rejected: p.rejected ?? false,
    }));

    setUsers(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openEdit = (u: ManagedUser) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormRole(u.role);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingUser || !formName || !formEmail) return;
    await supabase.from("profiles").update({ name: formName, email: formEmail } as any).eq("id", editingUser.id);
    await supabase.from("user_roles").update({ role: formRole }).eq("user_id", editingUser.id);
    toast.success("Usuário atualizado com sucesso");
    setIsDialogOpen(false);
    fetchUsers();
  };

  const handleApprove = async (userId: string) => {
    await supabase.from("profiles").update({ approved: true } as any).eq("id", userId);
    toast.success("Usuário aprovado com sucesso!");
    fetchUsers();
  };

  const handleReject = async (userId: string) => {
    await supabase.from("profiles").update({ rejected: true }).eq("id", userId);
    toast.success("Cadastro recusado.");
    fetchUsers();
  };

  const pendingUsers = users.filter(u => !u.approved && !u.rejected && u.role !== "admin_master");
  const approvedUsers = users.filter(u => u.approved || u.role === "admin_master");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Gestão de Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie o acesso dos usuários ao portal</p>
        </div>
      </div>

      {/* Permissions summary */}
      <div className="gradient-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Permissões por Perfil</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="space-y-1">
            <p className="font-medium text-foreground">Administrador</p>
            <p className="text-muted-foreground">Acesso total a todas as áreas</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Operador</p>
            <p className="text-muted-foreground">Tudo exceto área Financeira</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Financeiro</p>
            <p className="text-muted-foreground">Apenas Home, Financeiro e Config.</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-3.5 h-3.5" />
            Pendentes ({pendingUsers.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="w-3.5 h-3.5" />
            Aprovados ({approvedUsers.length})
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-2">
            <Star className="w-3.5 h-3.5" />
            Planos PRO
          </TabsTrigger>
        </TabsList>

        {/* Pending Users */}
        <TabsContent value="pending">
          <div className="gradient-card rounded-lg border border-border overflow-hidden">
            {pendingUsers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhum cadastro pendente de aprovação.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground text-xs uppercase">Nome</TableHead>
                    <TableHead className="text-muted-foreground text-xs uppercase">E-mail</TableHead>
                    <TableHead className="text-muted-foreground text-xs uppercase">Empresa</TableHead>
                    <TableHead className="text-muted-foreground text-xs uppercase">Endereço</TableHead>
                    <TableHead className="text-muted-foreground text-xs uppercase">Telefone</TableHead>
                    <TableHead className="text-muted-foreground text-xs uppercase text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map((u) => (
                    <TableRow key={u.id} className="border-border">
                      <TableCell className="text-foreground font-medium text-sm">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{u.company}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {[u.address, u.city, u.state, u.zip_code].filter(Boolean).join(", ")}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {u.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            {u.phone}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(u.id)}
                            className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(u.id)}
                            className="gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Recusar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* Approved Users */}
        <TabsContent value="approved">
          <div className="gradient-card rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs uppercase">Nome</TableHead>
                  <TableHead className="text-muted-foreground text-xs uppercase">E-mail</TableHead>
                  <TableHead className="text-muted-foreground text-xs uppercase">Empresa</TableHead>
                  <TableHead className="text-muted-foreground text-xs uppercase">Perfil</TableHead>
                  <TableHead className="text-muted-foreground text-xs uppercase text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedUsers.map((u) => (
                  <TableRow key={u.id} className="border-border">
                    <TableCell className="text-foreground font-medium text-sm">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.company}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        u.role === "admin" || u.role === "admin_master" ? "bg-warning/15 text-warning border-warning/30" :
                        u.role === "operador" ? "bg-info/15 text-info border-info/30" :
                        "bg-success/15 text-success border-success/30"
                      }`}>
                        {roleLabels[u.role]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/usuarios/${u.id}/acesso`)} className="h-8 w-8 text-muted-foreground hover:text-primary" title="Controle de acesso">
                          <Settings2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/${u.id}`)} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Ver dashboard">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(u)} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* PRO Plans */}
        <TabsContent value="plans">
          <ProPlanManager />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-foreground">Nome</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} className="bg-accent border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">E-mail</Label>
              <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="bg-accent border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Perfil</Label>
              <Select value={formRole} onValueChange={(v) => setFormRole(v as UserRole)}>
                <SelectTrigger className="bg-accent border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-border">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
