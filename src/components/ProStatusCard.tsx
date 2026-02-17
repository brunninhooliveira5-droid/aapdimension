import { Star, Clock, AlertTriangle, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInDays, format } from "date-fns";

export function ProStatusCard() {
  const { user, hasProAccess } = useAuth();

  if (!user || user.role === "admin_master") return null;
  
  const plan = user.userPlan;
  if (!plan) return null;

  const validUntil = plan.valid_until ? new Date(plan.valid_until) : null;
  const isPro = hasProAccess();
  const isExpired = plan.pro_access && validUntil && validUntil <= new Date();

  // Show expired card
  if (isExpired) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-destructive">Acesso PRO expirado</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Seu plano PRO expirou em {format(validUntil!, "dd/MM/yyyy")}. Entre em contato para renovar.
          </p>
        </div>
        <a
          href="https://wa.me/5500000000000?text=Olá, gostaria de renovar meu acesso PRO"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Falar com a Dimension
        </a>
      </div>
    );
  }

  // Show active PRO card with countdown
  if (isPro && validUntil) {
    const daysLeft = differenceInDays(validUntil, new Date());
    const isWarning = daysLeft <= 7;

    return (
      <div className={`rounded-lg border p-4 flex items-center gap-4 ${
        isWarning
          ? "border-warning/40 bg-warning/5"
          : "border-primary/30 bg-primary/5"
      }`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          isWarning ? "bg-warning/15" : "bg-primary/15"
        }`}>
          {isWarning ? (
            <Clock className="w-5 h-5 text-warning" />
          ) : (
            <Star className="w-5 h-5 text-primary fill-primary/30" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-semibold ${isWarning ? "text-warning" : "text-primary"}`}>
              Acesso PRO
            </p>
            <span className={`inline-flex items-center rounded-full px-1.5 py-0 text-[9px] font-bold uppercase tracking-wider ${
              isWarning
                ? "bg-warning/15 text-warning"
                : "bg-primary/15 text-primary"
            }`}>
              {isWarning ? "Vence em breve" : "Ativo"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isWarning
              ? `Seu plano PRO expira em ${daysLeft} dia${daysLeft !== 1 ? "s" : ""} (${format(validUntil, "dd/MM/yyyy")})`
              : `Expira em ${daysLeft} dias — ${format(validUntil, "dd/MM/yyyy")}`}
          </p>
        </div>
      </div>
    );
  }

  return null;
}
