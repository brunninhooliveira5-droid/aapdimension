import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import dimensionLogo from "@/assets/dimension-logo.png";
import loginBg from "@/assets/login-bg.png";
import { Mail, Lock, UserPlus, LogIn, Building2, MapPin, Phone, User, EyeOff, Eye } from "lucide-react";

const Login = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [phone, setPhone] = useState("");
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
        navigate("/");
      }
    } else {
      if (!name || !company) {
        toast.error("Preencha todos os campos obrigatórios");
        setLoading(false);
        return;
      }
      const { error } = await signup(email, password, name, undefined, {
        company,
        address,
        city,
        state,
        zip_code: zipCode,
        phone,
      });
      if (error) {
        toast.error(error);
      } else {
        toast.success(
          "Cadastro realizado! Aguarde a aprovação do administrador para acessar o portal.",
          { duration: 6000 }
        );
        setMode("login");
        setName("");
        setCompany("");
        setAddress("");
        setCity("");
        setState("");
        setZipCode("");
        setPhone("");
        setPassword("");
      }
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-y-auto"
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-[hsl(220,30%,8%)]/60 backdrop-blur-[2px]" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-md px-6 py-10">
        {/* Logo & Title */}
        <img src={dimensionLogo} alt="Dimension CNC" className="h-20 w-auto mb-2 drop-shadow-2xl" />
        <h2 className="text-sm font-medium tracking-[0.3em] text-primary/80 uppercase mb-8">
          Tecnologia CNC
        </h2>

        {/* Subtitle */}
        <p className="text-foreground/90 text-sm mb-6">
          {mode === "login" ? "Bem-vindo ao Portal do Cliente" : "Solicitar acesso ao portal"}
        </p>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="w-full space-y-4 bg-background/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl"
        >
          {mode === "signup" && (
            <>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <Input
                  type="text"
                  placeholder="Nome Completo *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 bg-background/20 border-border/40 rounded-xl h-11 text-foreground placeholder:text-muted-foreground/60"
                  required
                />
              </div>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <Input
                  type="text"
                  placeholder="Nome da Empresa *"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="pl-10 bg-background/20 border-border/40 rounded-xl h-11 text-foreground placeholder:text-muted-foreground/60"
                  required
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <Input
                  type="text"
                  placeholder="Endereço completo"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="pl-10 bg-background/20 border-border/40 rounded-xl h-11 text-foreground placeholder:text-muted-foreground/60"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="text"
                  placeholder="Cidade"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="bg-background/20 border-border/40 rounded-xl h-11 text-foreground placeholder:text-muted-foreground/60"
                />
                <Input
                  type="text"
                  placeholder="UF"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="bg-background/20 border-border/40 rounded-xl h-11 text-foreground placeholder:text-muted-foreground/60"
                  maxLength={2}
                />
              </div>
              <Input
                type="text"
                placeholder="CEP"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className="bg-background/20 border-border/40 rounded-xl h-11 text-foreground placeholder:text-muted-foreground/60"
                maxLength={9}
              />
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <Input
                  type="tel"
                  placeholder="Telefone *"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 bg-background/20 border-border/40 rounded-xl h-11 text-foreground placeholder:text-muted-foreground/60"
                  required
                />
              </div>
            </>
          )}

          {/* Email */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
            <Input
              type="email"
              placeholder="Usuário"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 bg-background/20 border-border/40 rounded-xl h-11 text-foreground placeholder:text-muted-foreground/60"
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 bg-background/20 border-border/40 rounded-xl h-11 text-foreground placeholder:text-muted-foreground/60"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground transition-colors"
            >
              {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-11 rounded-xl text-sm font-semibold gap-2 bg-[hsl(220,80%,50%)] hover:bg-[hsl(220,80%,45%)] text-white shadow-lg shadow-[hsl(220,80%,50%)]/30"
            disabled={loading}
          >
            {loading ? (
              "Carregando..."
            ) : mode === "login" ? (
              <>Entrar</>
            ) : (
              <>Solicitar Cadastro <UserPlus className="w-4 h-4" /></>
            )}
          </Button>
        </form>

        {/* Toggle mode */}
        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-5 text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          {mode === "login"
            ? "Não tem conta? Solicitar acesso"
            : "Já tem conta? Fazer login"}
        </button>
      </div>
    </div>
  );
};

export default Login;
