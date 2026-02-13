import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import dimensionLogo from "@/assets/dimension-logo.png";
import heroCnc from "@/assets/hero-cnc.jpg";
import { Mail, ArrowRight, Lock, UserPlus, LogIn } from "lucide-react";

const Login = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);

    if (mode === "login") {
      const { error } = await login(email, password);
      if (error) {
        toast.error(error);
      } else {
        toast.success("Login realizado com sucesso!");
        navigate("/");
      }
    } else {
      if (!name) {
        toast.error("Informe seu nome");
        setLoading(false);
        return;
      }
      const { error } = await signup(email, password, name);
      if (error) {
        toast.error(error);
      } else {
        toast.success("Conta criada com sucesso! Você já está logado.");
        navigate("/");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Hero Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img src={heroCnc} alt="CNC" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-background/40" />
        <div className="absolute bottom-10 left-10 right-10">
          <p className="text-lg font-semibold text-foreground">Portal do Cliente</p>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe suas máquinas, chamados, manutenções e financeiro em um só lugar.
          </p>
        </div>
      </div>

      {/* Right - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex flex-col items-center gap-4">
            <img src={dimensionLogo} alt="Dimension CNC" className="h-14 w-auto" />
            <div className="text-center">
              <h1 className="text-xl font-bold text-foreground">
                {mode === "login" ? "Acesse sua conta" : "Criar conta"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {mode === "login"
                  ? "Entre com seu e-mail e senha"
                  : "Preencha os dados para criar sua conta"}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label className="text-foreground">Nome</Label>
                <Input
                  type="text"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-accent border-border"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-foreground">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="seu@email.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-accent border-border"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-accent border-border"
                  required
                  minLength={6}
                />
              </div>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? (
                "Carregando..."
              ) : mode === "login" ? (
                <>Entrar <LogIn className="w-4 h-4" /></>
              ) : (
                <>Criar Conta <UserPlus className="w-4 h-4" /></>
              )}
            </Button>
          </form>

          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === "login"
              ? "Não tem conta? Criar uma conta"
              : "Já tem conta? Fazer login"}
          </button>

          <p className="text-[10px] text-center text-muted-foreground">
            Acesso exclusivo para clientes Dimension CNC
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
