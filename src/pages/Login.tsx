import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import dimensionLogo from "@/assets/dimension-logo.png";
import loginBg from "@/assets/login-bg.png";
import { Lock, UserPlus, Building2, Phone, User, EyeOff, Eye, MessageCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AccessRequestData {
  name: string;
  company: string;
  email: string;
  whatsapp: string;
  is_dimension_client: boolean;
  observation: string;
}

const Login = () => {
  const [mode, setMode] = useState<"login" | "signup" | "success">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Access request fields
  const [arName, setArName] = useState("");
  const [arCompany, setArCompany] = useState("");
  const [arEmail, setArEmail] = useState("");
  const [arWhatsapp, setArWhatsapp] = useState("");
  const [arIsDimensionClient, setArIsDimensionClient] = useState(false);
  const [arObservation, setArObservation] = useState("");
  const [submittedData, setSubmittedData] = useState<AccessRequestData | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    const { error } = await login(email, password);
    if (error) {
      toast.error(error);
    } else {
      navigate("/");
    }
    setLoading(false);
  };

  const handleAccessRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arName || !arCompany || !arEmail || !arWhatsapp) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setLoading(true);

    const { error } = await supabase.from("access_requests").insert({
      name: arName.trim(),
      company: arCompany.trim(),
      email: arEmail.trim(),
      whatsapp: arWhatsapp.trim(),
      is_dimension_client: arIsDimensionClient,
      observation: arObservation.trim(),
    });

    if (error) {
      toast.error("Erro ao enviar solicitação. Tente novamente.");
      console.error(error);
    } else {
      setSubmittedData({
        name: arName.trim(),
        company: arCompany.trim(),
        email: arEmail.trim(),
        whatsapp: arWhatsapp.trim(),
        is_dimension_client: arIsDimensionClient,
        observation: arObservation.trim(),
      });
      setMode("success");
    }
    setLoading(false);
  };

  const buildWhatsAppUrl = () => {
    if (!submittedData) return "";
    const clientType = submittedData.is_dimension_client ? "Cliente Dimension" : "Novo cliente";
    let msg = `Olá, Dimension CNC! Solicitei acesso ao Portal.\n`;
    msg += `Nome: ${submittedData.name}\n`;
    msg += `Empresa: ${submittedData.company}\n`;
    msg += `E-mail: ${submittedData.email}\n`;
    msg += `WhatsApp: ${submittedData.whatsapp}\n`;
    msg += `Perfil: ${clientType}`;
    if (submittedData.observation) {
      msg += `\nObservação: ${submittedData.observation}`;
    }
    msg += `\nObrigado!`;
    return `https://wa.me/5571982090464?text=${encodeURIComponent(msg)}`;
  };

  const resetForm = () => {
    setArName("");
    setArCompany("");
    setArEmail("");
    setArWhatsapp("");
    setArIsDimensionClient(false);
    setArObservation("");
    setSubmittedData(null);
    setMode("login");
  };

  const inputClass = "pl-10 bg-background/20 border-border/40 rounded-xl h-11 text-foreground placeholder:text-muted-foreground/60";

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
      <div className="absolute inset-0 bg-[hsl(220,30%,8%)]/60 backdrop-blur-[2px]" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-md px-6 py-10">
        <img src={dimensionLogo} alt="Dimension CNC" className="h-20 w-auto mb-2 drop-shadow-2xl brightness-0 invert sepia saturate-[10] hue-rotate-[200deg]" />
        <h2 className="text-sm font-medium tracking-[0.3em] text-black uppercase mb-8">
          Tecnologia CNC
        </h2>

        {/* ── SUCCESS SCREEN ── */}
        {mode === "success" && (
          <div className="w-full space-y-5 bg-background/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl text-center">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto" />
            <h3 className="text-lg font-semibold text-foreground">Solicitação enviada!</h3>
            <p className="text-sm text-muted-foreground/80 leading-relaxed">
              Sua solicitação foi registrada com sucesso. Para agilizar a aprovação, envie uma confirmação pelo WhatsApp da Dimension.
            </p>

            <a
              href={buildWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full h-12 rounded-xl text-sm font-semibold bg-[hsl(142,70%,40%)] hover:bg-[hsl(142,70%,35%)] text-white shadow-lg shadow-[hsl(142,70%,40%)]/30 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              Enviar solicitação pelo WhatsApp
            </a>

            <button
              onClick={resetForm}
              className="flex items-center justify-center gap-2 mx-auto text-sm text-muted-foreground/70 hover:text-foreground transition-colors mt-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao login
            </button>
          </div>
        )}

        {/* ── LOGIN FORM ── */}
        {mode === "login" && (
          <>
            <p className="text-foreground/90 text-sm mb-6">Bem-vindo ao Portal do Cliente</p>
            <form onSubmit={handleLogin} className="w-full space-y-4 bg-background/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <Input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <Input type={showPassword ? "text" : "password"} placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 bg-background/20 border-border/40 rounded-xl h-11 text-foreground placeholder:text-muted-foreground/60" required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground transition-colors">
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl text-sm font-semibold gap-2 bg-[hsl(220,80%,50%)] hover:bg-[hsl(220,80%,45%)] text-white shadow-lg shadow-[hsl(220,80%,50%)]/30" disabled={loading}>
                {loading ? "Carregando..." : "Entrar no Portal"}
              </Button>

              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-border/40" />
                <span className="text-xs text-muted-foreground/60">ou</span>
                <div className="flex-1 h-px bg-border/40" />
              </div>

              <Button type="button" variant="outline" className="w-full h-11 rounded-xl text-sm font-semibold gap-2 border-primary/50 text-primary hover:bg-primary/10 hover:border-primary backdrop-blur-sm transition-all" onClick={() => setMode("signup")}>
                <UserPlus className="w-4 h-4" />
                Solicitar acesso ao Portal
              </Button>
            </form>
            <p className="mt-5 text-xs text-muted-foreground/60 text-center max-w-[280px] leading-relaxed">
              Clientes Dimension podem solicitar acesso para monitorar máquinas, manutenções, treinamentos e serviços.
            </p>
          </>
        )}

        {/* ── ACCESS REQUEST FORM ── */}
        {mode === "signup" && (
          <>
            <p className="text-foreground/90 text-sm mb-6">Solicitar acesso ao portal</p>
            <form onSubmit={handleAccessRequest} className="w-full space-y-4 bg-background/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <Input type="text" placeholder="Nome Completo *" value={arName} onChange={(e) => setArName(e.target.value)} className={inputClass} required />
              </div>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <Input type="text" placeholder="Nome da Empresa *" value={arCompany} onChange={(e) => setArCompany(e.target.value)} className={inputClass} required />
              </div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <Input type="email" placeholder="E-mail *" value={arEmail} onChange={(e) => setArEmail(e.target.value)} className={inputClass} required />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <Input type="tel" placeholder="WhatsApp *" value={arWhatsapp} onChange={(e) => setArWhatsapp(e.target.value)} className={inputClass} required />
              </div>

              {/* Cliente Dimension toggle */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-background/20 border border-border/40">
                <span className="text-sm text-foreground/80 flex-1">Já é cliente Dimension?</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setArIsDimensionClient(true)} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${arIsDimensionClient ? "bg-[hsl(220,80%,50%)] text-white" : "bg-background/30 text-muted-foreground/70 hover:bg-background/50"}`}>
                    Sim
                  </button>
                  <button type="button" onClick={() => setArIsDimensionClient(false)} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${!arIsDimensionClient ? "bg-[hsl(220,80%,50%)] text-white" : "bg-background/30 text-muted-foreground/70 hover:bg-background/50"}`}>
                    Não
                  </button>
                </div>
              </div>

              <Textarea
                placeholder="Observação (opcional)"
                value={arObservation}
                onChange={(e) => setArObservation(e.target.value)}
                className="bg-background/20 border-border/40 rounded-xl text-foreground placeholder:text-muted-foreground/60 min-h-[80px] resize-none"
                maxLength={500}
              />

              <Button type="submit" className="w-full h-11 rounded-xl text-sm font-semibold gap-2 bg-[hsl(220,80%,50%)] hover:bg-[hsl(220,80%,45%)] text-white shadow-lg shadow-[hsl(220,80%,50%)]/30" disabled={loading}>
                {loading ? "Enviando..." : (
                  <>Solicitar Cadastro <UserPlus className="w-4 h-4" /></>
                )}
              </Button>
            </form>

            <button onClick={resetForm} className="mt-5 text-sm text-muted-foreground/70 hover:text-foreground transition-colors">
              Já tem conta? Fazer login
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
