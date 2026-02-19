import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImpersonationState {
  active: boolean;
  targetUserId: string | null;
  targetUserDisplay: string | null;
  adminId: string | null;
  logId: string | null;
  startedAt: string | null;
}

interface ImpersonationContextType {
  isImpersonating: boolean;
  targetUserId: string | null;
  targetUserDisplay: string | null;
  startImpersonation: (targetUserId: string, targetName: string) => Promise<boolean>;
  stopImpersonation: () => Promise<void>;
}

const STORAGE_KEY = "impersonation_state";

const ImpersonationContext = createContext<ImpersonationContextType | null>(null);

function loadState(): ImpersonationState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { active: false, targetUserId: null, targetUserDisplay: null, adminId: null, logId: null, startedAt: null };
}

function saveState(state: ImpersonationState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ImpersonationState>(loadState);

  // Sync to localStorage
  useEffect(() => {
    if (state.active) {
      saveState(state);
    } else {
      clearState();
    }
  }, [state]);

  const startImpersonation = useCallback(async (targetUserId: string, targetName: string): Promise<boolean> => {
    try {
      // Call RPC to validate admin_master and create audit log
      const { data, error } = await supabase.rpc("start_impersonation", {
        target_user_id: targetUserId,
      });

      if (error) {
        console.error("Impersonation RPC error:", error);
        toast.error("Erro ao iniciar impersonação: " + error.message);
        return false;
      }

      const { data: { user } } = await supabase.auth.getUser();

      setState({
        active: true,
        targetUserId,
        targetUserDisplay: targetName,
        adminId: user?.id ?? null,
        logId: data as string,
        startedAt: new Date().toISOString(),
      });

      toast.success(`Modo impersonação ativado: ${targetName}`);
      return true;
    } catch (err) {
      console.error("Start impersonation failed:", err);
      toast.error("Falha ao iniciar impersonação.");
      return false;
    }
  }, []);

  const stopImpersonation = useCallback(async () => {
    if (state.logId) {
      try {
        await supabase.rpc("stop_impersonation", { log_id: state.logId });
      } catch (err) {
        console.error("Stop impersonation RPC error:", err);
      }
    }

    setState({ active: false, targetUserId: null, targetUserDisplay: null, adminId: null, logId: null, startedAt: null });
    toast.info("Modo impersonação encerrado.");
  }, [state.logId]);

  return (
    <ImpersonationContext.Provider
      value={{
        isImpersonating: state.active,
        targetUserId: state.targetUserId,
        targetUserDisplay: state.targetUserDisplay,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) throw new Error("useImpersonation must be inside ImpersonationProvider");
  return ctx;
}
