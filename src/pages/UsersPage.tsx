import { useState } from "react";
import { Users, Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { type UserRole, roleLabels } from "@/contexts/AuthContext";

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "ativo" | "inativo";
}

const initialUsers: ManagedUser[] = [
  { id: "1", name: "João Costa", email: "joao@empresa.com.br", role: "admin", status: "ativo" },
  { id: "2", name: "Maria Silva", email: "maria@empresa.com.br", role: "operador", status: "ativo" },
  { id: "3", name: "Carlos Souza", email: "carlos@empresa.com.br", role: "financeiro", status: "ativo" },
  { id: "4", name: "Ana Oliveira", email: "ana@empresa.com.br", role: "operador", status: "inativo" },
];

const assignableRoles: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "operador", label: "Operador" },
  { value: "financeiro", label: "Financeiro" },
];

const UsersPage = () => {
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("operador");

  const openNew = () => {
    setEditingUser(null);
    setFormName("");
    setFormEmail("");
    setFormRole("operador");
    setIsDialogOpen(true);
  };

  const openEdit = (u: ManagedUser) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormRole(u.role);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formName || !formEmail) return;
    if (editingUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id ? { ...u, name: formName, email: formEmail, role: formRole } : u
        )
      );
      toast.success("Usuário atualizado com sucesso");
    } else {
      const newUser: ManagedUser = {
        id: crypto.randomUUID(),
        name: formName,
        email: formEmail,
        role: formRole,
        status: "ativo",
      };
      setUsers((prev) => [...prev, newUser]);
      toast.success("Usuário adicionado com sucesso");
    }
    setIsDialogOpen(false);
  };

  const toggleStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: u.status === "ativo" ? "inativo" : "ativo" } : u
      )
    );
  };

  const roleStatusMap: Record<UserRole, string> = {
    admin_master: "em_andamento",
    admin: "em_andamento",
    operador: "agendada",
    financeiro: "pago",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Gestão de Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie o acesso dos usuários ao portal</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-2">
              <Plus className="w-4 h-4" /> Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {editingUser ? "Editar Usuário" : "Novo Usuário"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-foreground">Nome</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nome completo"
                  className="bg-accent border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">E-mail</Label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="email@empresa.com.br"
                  className="bg-accent border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Perfil</Label>
                <Select value={formRole} onValueChange={(v) => setFormRole(v as UserRole)}>
                  <SelectTrigger className="bg-accent border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" className="border-border">Cancelar</Button>
              </DialogClose>
              <Button onClick={handleSave}>{editingUser ? "Salvar" : "Adicionar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

      {/* Users table */}
      <div className="gradient-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground text-xs uppercase">Nome</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase">E-mail</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase">Perfil</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase">Status</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} className="border-border">
                <TableCell className="text-foreground font-medium text-sm">{u.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    u.role === "admin" ? "bg-warning/15 text-warning border-warning/30" :
                    u.role === "operador" ? "bg-info/15 text-info border-info/30" :
                    "bg-success/15 text-success border-success/30"
                  }`}>
                    {roleLabels[u.role]}
                  </span>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => toggleStatus(u.id)}
                    className={`text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                      u.status === "ativo"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {u.status === "ativo" ? "Ativo" : "Inativo"}
                  </button>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default UsersPage;
