import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MemberPermissionsEditor } from "./MemberPermissionsEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, MessageCircle, Copy } from "lucide-react";

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

export function InviteMemberDialog({ open, onOpenChange, accountId, onSuccess }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [role, setRole] = useState<string>("operator");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({ ...DEFAULT_PERMISSIONS });
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Nome e e-mail são obrigatórios");
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.from("account_invites").insert({
      account_id: accountId,
      name: name.trim(),
      email: email.trim(),
      whatsapp: whatsapp.trim() || null,
      suggested_role: role as any,
      permissions,
    } as any).select("invite_token").single();

    if (error) {
      toast.error("Erro ao criar convite");
      console.error(error);
    } else {
      const token = (data as any)?.invite_token;
      const link = `${window.location.origin}/login?invite=${token}`;
      setInviteLink(link);
      toast.success("Convite criado com sucesso!");
      onSuccess();
    }
    setLoading(false);
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success("Link copiado!");
    }
  };

  const buildWhatsAppUrl = () => {
    if (!inviteLink) return "";
    const msg = `Olá ${name}! Você foi convidado para o Portal Dimension CNC.\n\nAcesse o link abaixo para criar sua conta:\n${inviteLink}\n\nEste convite expira em 7 dias.`;
    const phone = whatsapp.replace(/\D/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const handleClose = () => {
    setName("");
    setEmail("");
    setWhatsapp("");
    setRole("operator");
    setPermissions({ ...DEFAULT_PERMISSIONS });
    setInviteLink(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Convidar Usuário
          </DialogTitle>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Convite criado! Compartilhe o link com o usuário:</p>
            <div className="flex gap-2">
              <Input value={inviteLink} readOnly className="text-xs" />
              <Button variant="outline" size="icon" onClick={handleCopyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {whatsapp && (
              <a
                href={buildWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full h-10 rounded-lg text-sm font-semibold bg-[hsl(142,70%,40%)] hover:bg-[hsl(142,70%,35%)] text-white transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Enviar pelo WhatsApp
              </a>
            )}
            <DialogFooter>
              <Button onClick={handleClose}>Fechar</Button>
            </DialogFooter>
          </div>
        ) : (
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
                <Label className="text-xs">WhatsApp</Label>
                <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="5571999999999" />
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
                {loading ? "Criando..." : "Criar Convite"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
