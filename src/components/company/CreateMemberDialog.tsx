import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MemberPermissionsEditor } from "./MemberPermissionsEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Eye, EyeOff } from "lucide-react";

const DEFAULT_PERMISSIONS: Record<string, boolean> = {
  maquinas: true, suporte: true, manutencao: true,
  equipamentos: true, pecas: true, financeiro: false,
  orcamento: true, configuracoes: true, arquivos: true,
  controle_producao: false, gestao_financeira: false,
  can_manage_users: false,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  onSuccess: () => void;
}

export function CreateMemberDialog({ open, onOpenChange, accountId, onSuccess }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<string>("operator");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({ ...DEFAULT_PERMISSIONS });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password) {
      toast.error("Nome, e-mail e senha são obrigatórios");
      return;
    }
    if (password.length < 6) {
      toast.error("Senha deve ter no mínimo 6 caracteres");
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.functions.invoke("create-member", {
      body: {
        name: name.trim(),
        email: email.trim(),
        password,
        account_id: accountId,
        member_role: role,
        permissions,
      },
    });

    if (error || data?.error) {
      toast.error(data?.error || "Erro ao criar usuário");
    } else {
      toast.success(`Usuário "${name}" criado com sucesso!`);
      handleClose();
      onSuccess();
    }
    setLoading(false);
  };

  const handleClose = () => {
    setName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setRole("operator");
    setPermissions({ ...DEFAULT_PERMISSIONS });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Adicionar Usuário
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">E-mail *</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@empresa.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Senha *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Papel</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="operator">Operador</SelectItem>
                  <SelectItem value="client_finance">Financeiro</SelectItem>
                  <SelectItem value="viewer">Visualizador</SelectItem>
                  <SelectItem value="client_admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-2 block">Permissões por Módulo</Label>
            <MemberPermissionsEditor permissions={permissions} onChange={setPermissions} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading} className="gap-1.5">
              <UserPlus className="h-4 w-4" />
              {loading ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
