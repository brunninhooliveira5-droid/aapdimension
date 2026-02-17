import { useState } from "react";
import { User, Bell, Shield, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth, roleLabels } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SettingsPage = () => {
  const { user } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Preencha todos os campos.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setSaving(true);
    // Verify current password by re-signing in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? "",
      password: currentPassword,
    });

    if (signInError) {
      toast.error("Senha atual incorreta.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error("Erro ao alterar senha: " + error.message);
      setSaving(false);
      return;
    }

    toast.success("Senha alterada com sucesso!");
    setShowPasswordForm(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie sua conta e preferências</p>
      </div>

      {/* Profile */}
      <div className="gradient-card rounded-lg border border-border p-5 space-y-4">
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Perfil</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-muted-foreground text-xs">Nome</p><p className="text-foreground font-medium">{user?.name ?? "—"}</p></div>
          <div><p className="text-muted-foreground text-xs">E-mail</p><p className="text-foreground font-medium">{user?.email ?? "—"}</p></div>
          <div><p className="text-muted-foreground text-xs">Perfil</p><p className="text-foreground font-medium">{user ? roleLabels[user.role] : "—"}</p></div>
          <div><p className="text-muted-foreground text-xs">Empresa</p><p className="text-foreground font-medium">{user?.company || "—"}</p></div>
        </div>
      </div>

      {/* Notifications */}
      <div className="gradient-card rounded-lg border border-border p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Notificações</h3>
        </div>
        <div className="space-y-3">
          {["Alertas de manutenção", "Vencimento de faturas", "Atualizações de chamados"].map(label => (
            <div key={label} className="flex items-center justify-between">
              <Label className="text-sm text-foreground">{label}</Label>
              <Switch defaultChecked />
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="gradient-card rounded-lg border border-border p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Segurança</h3>
        </div>
        {!showPasswordForm ? (
          <Button variant="outline" className="border-border text-foreground" onClick={() => setShowPasswordForm(true)}>
            Alterar Senha
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs">Senha Atual</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="bg-accent border-border pr-10"
                  placeholder="Digite sua senha atual"
                />
                <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowCurrent(!showCurrent)}>
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs">Nova Senha</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="bg-accent border-border pr-10"
                  placeholder="Mínimo 6 caracteres"
                />
                <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowNew(!showNew)}>
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs">Confirmar Nova Senha</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="bg-accent border-border"
                placeholder="Repita a nova senha"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleChangePassword} disabled={saving} size="sm">
                {saving ? "Salvando..." : "Salvar"}
              </Button>
              <Button variant="outline" size="sm" className="border-border" onClick={() => { setShowPasswordForm(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
