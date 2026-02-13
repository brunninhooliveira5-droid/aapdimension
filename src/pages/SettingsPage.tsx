import { User, Bell, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const SettingsPage = () => {
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
          <div><p className="text-muted-foreground text-xs">Nome</p><p className="text-foreground font-medium">João Costa</p></div>
          <div><p className="text-muted-foreground text-xs">E-mail</p><p className="text-foreground font-medium">joao@empresa.com.br</p></div>
          <div><p className="text-muted-foreground text-xs">Perfil</p><p className="text-foreground font-medium">Administrador</p></div>
          <div><p className="text-muted-foreground text-xs">Empresa</p><p className="text-foreground font-medium">Metalúrgica Costa Ltda</p></div>
        </div>
      </div>

      {/* Notifications */}
      <div className="gradient-card rounded-lg border border-border p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Notificações</h3>
        </div>
        <div className="space-y-3">
          {["Alertas de manutenção", "Vencimento de boletos", "Atualizações de chamados"].map(label => (
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
        <Button variant="outline" className="border-border text-foreground">Alterar Senha</Button>
      </div>
    </div>
  );
};

export default SettingsPage;
