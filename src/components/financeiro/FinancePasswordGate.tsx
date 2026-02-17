import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FinancePasswordGateProps {
  children: React.ReactNode;
}

export function FinancePasswordGate({ children }: FinancePasswordGateProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkPassword();
  }, []);

  const checkPassword = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("finance-password", {
        body: { action: "check" },
      });
      if (error) throw error;
      setHasPassword(data.has_password);
    } catch {
      toast.error("Erro ao verificar senha financeira.");
    }
    setLoading(false);
  };

  const handleSetPassword = async () => {
    if (!password || password.length < 4) {
      toast.error("Senha deve ter pelo menos 4 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("finance-password", {
        body: { action: "set", password },
      });
      if (error) throw error;
      if (data.error) { toast.error(data.error); return; }
      toast.success("Senha financeira criada com sucesso!");
      setAuthenticated(true);
    } catch {
      toast.error("Erro ao criar senha.");
    }
    setSubmitting(false);
  };

  const handleVerifyPassword = async () => {
    if (!password) {
      toast.error("Digite sua senha.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("finance-password", {
        body: { action: "verify", password },
      });
      if (error) throw error;
      if (data.valid) {
        setAuthenticated(true);
      } else {
        toast.error("Senha incorreta.");
      }
    } catch {
      toast.error("Erro ao verificar senha.");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Verificando acesso...</p>
      </div>
    );
  }

  if (authenticated) return <>{children}</>;

  // Create password (first access)
  if (hasPassword === false) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center animate-fade-in">
        <div className="w-full max-w-sm space-y-5 gradient-card rounded-lg border border-border p-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Criar Senha Financeira</h2>
            <p className="text-xs text-muted-foreground">
              Este é seu primeiro acesso. Crie uma senha exclusiva para o módulo financeiro.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs">Nova Senha</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-accent border-border pr-10"
                  placeholder="Mínimo 4 caracteres"
                  onKeyDown={(e) => e.key === "Enter" && handleSetPassword()}
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs">Confirmar Senha</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-accent border-border"
                placeholder="Repita a senha"
                onKeyDown={(e) => e.key === "Enter" && handleSetPassword()}
              />
            </div>
          </div>

          <Button onClick={handleSetPassword} disabled={submitting} className="w-full">
            {submitting ? "Criando..." : "Criar Senha e Acessar"}
          </Button>
        </div>
      </div>
    );
  }

  // Verify password
  return (
    <div className="min-h-[60vh] flex items-center justify-center animate-fade-in">
      <div className="w-full max-w-sm space-y-5 gradient-card rounded-lg border border-border p-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Acesso Financeiro</h2>
          <p className="text-xs text-muted-foreground">
            Digite sua senha para acessar o módulo financeiro.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-foreground text-xs">Senha Financeira</Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-accent border-border pr-10"
              placeholder="Digite sua senha"
              onKeyDown={(e) => e.key === "Enter" && handleVerifyPassword()}
              autoFocus
            />
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button onClick={handleVerifyPassword} disabled={submitting} className="w-full">
          {submitting ? "Verificando..." : "Acessar"}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          Esqueceu a senha? Solicite ao administrador o reset.
        </p>
      </div>
    </div>
  );
}
