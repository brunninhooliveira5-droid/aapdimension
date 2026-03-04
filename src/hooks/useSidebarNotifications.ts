import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";

interface SidebarNotifications {
  usuarios: boolean;
  controle_producao: boolean;
  gestao_financeira: boolean;
  financeiro: boolean;
  suporte: boolean;
}

export function useSidebarNotifications(): SidebarNotifications {
  const { user } = useAuth();
  const { effectiveUserId, isRealAdminMaster } = useEffectiveUser();
  const [notifications, setNotifications] = useState<SidebarNotifications>({
    usuarios: false,
    controle_producao: false,
    gestao_financeira: false,
    financeiro: false,
    suporte: false,
  });

  useEffect(() => {
    if (!effectiveUserId) return;

    const check = async () => {
      const n: SidebarNotifications = {
        usuarios: false,
        controle_producao: false,
        gestao_financeira: false,
        financeiro: false,
        suporte: false,
      };

      // 1. Usuários: pending access_requests or pro_access_requests (admin_master only)
      if (isRealAdminMaster) {
        const [{ count: pendingAccess }, { count: pendingPro }] = await Promise.all([
          supabase.from("access_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("pro_access_requests" as any).select("id", { count: "exact", head: true }).eq("status", "pending"),
        ]);
        n.usuarios = ((pendingAccess ?? 0) + (pendingPro ?? 0)) > 0;
      }

      // 2. Controle de Produção: overdue tasks (pc_tasks with due_date < today and status != concluída)
      {
        const today = new Date().toISOString().split("T")[0];
        const { count } = await supabase
          .from("pc_tasks" as any)
          .select("id", { count: "exact", head: true })
          .eq("created_by", effectiveUserId)
          .lt("due_date", today)
          .neq("status", "concluída");
        n.controle_producao = (count ?? 0) > 0;
      }

      // 3. Gerenciador Financeiro: overdue accounts payable
      {
        const today = new Date().toISOString().split("T")[0];
        const { count } = await supabase
          .from("finance_accounts_payable")
          .select("id", { count: "exact", head: true })
          .eq("status", "pendente")
          .lt("due_date", today);
        n.gestao_financeira = (count ?? 0) > 0;
      }

      // 4. Faturas: clients with overdue invoices (admin sees all, user sees own)
      {
        const today = new Date().toISOString().split("T")[0];
        let query = supabase
          .from("invoices" as any)
          .select("id", { count: "exact", head: true })
          .eq("status", "em_aberto")
          .lt("due_date", today);
        if (!isRealAdminMaster) {
          query = query.eq("user_id", effectiveUserId);
        }
        const { count } = await query;
        n.financeiro = (count ?? 0) > 0;
      }

      // 5. Suporte: open tickets (not resolved)
      {
        let query = supabase
          .from("tickets" as any)
          .select("id", { count: "exact", head: true })
          .neq("status", "resolvido");
        if (!isRealAdminMaster) {
          query = query.eq("user_id", effectiveUserId);
        }
        const { count } = await query;
        n.suporte = (count ?? 0) > 0;
      }

      setNotifications(n);
    };

    check();
    const interval = setInterval(check, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [effectiveUserId, isRealAdminMaster]);

  return notifications;
}
