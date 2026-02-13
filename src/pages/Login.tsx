import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import dimensionLogo from "@/assets/dimension-logo.png";
import heroCnc from "@/assets/hero-cnc.jpg";
import { Mail, ArrowRight, ShieldCheck } from "lucide-react";

const Login = () => {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    toast.success(`Código enviado para ${email}`);
    setStep("otp");
  };

  const handleVerifyOtp = () => {
    if (otp.length < 6) return;
    login(email);
    toast.success("Login realizado com sucesso!");
    navigate("/");
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
                {step === "email" ? "Acesse sua conta" : "Verificação"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {step === "email"
                  ? "Digite seu e-mail cadastrado"
                  : `Insira o código enviado para ${email}`}
              </p>
            </div>
          </div>

          {step === "email" ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="seu@email.com.br"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pl-10 bg-accent border-border"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full gap-2">
                Enviar Código <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="bg-accent border-border" />
                    <InputOTPSlot index={1} className="bg-accent border-border" />
                    <InputOTPSlot index={2} className="bg-accent border-border" />
                    <InputOTPSlot index={3} className="bg-accent border-border" />
                    <InputOTPSlot index={4} className="bg-accent border-border" />
                    <InputOTPSlot index={5} className="bg-accent border-border" />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button onClick={handleVerifyOtp} className="w-full gap-2" disabled={otp.length < 6}>
                Verificar <ShieldCheck className="w-4 h-4" />
              </Button>
              <button
                onClick={() => setStep("email")}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Voltar para o e-mail
              </button>
            </div>
          )}

          <p className="text-[10px] text-center text-muted-foreground">
            Acesso exclusivo para clientes Dimension CNC
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
