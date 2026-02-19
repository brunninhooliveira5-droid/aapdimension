import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, LogOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ImpersonationBanner() {
  const { isImpersonating, targetUserDisplay, stopImpersonation } = useImpersonation();
  const { clearImpersonatedProfile } = useAuth();
  const navigate = useNavigate();

  if (!isImpersonating) return null;

  const handleStop = async () => {
    await stopImpersonation();
    clearImpersonatedProfile();
    navigate("/usuarios");
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-warning text-warning-foreground px-4 py-2 flex items-center justify-between gap-3 shadow-lg">
      <div className="flex items-center gap-2 min-w-0">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span className="text-sm font-semibold truncate">
          Modo Admin: Você está usando como <strong>{targetUserDisplay}</strong>
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-warning-foreground/30 bg-warning-foreground/10 hover:bg-warning-foreground/20 text-warning-foreground"
          onClick={() => navigate("/usuarios")}
        >
          <ArrowLeft className="w-3 h-3 mr-1" />
          Painel Admin
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-warning-foreground/30 bg-warning-foreground/10 hover:bg-warning-foreground/20 text-warning-foreground"
          onClick={handleStop}
        >
          <LogOut className="w-3 h-3 mr-1" />
          Sair do modo usuário
        </Button>
      </div>
    </div>
  );
}
