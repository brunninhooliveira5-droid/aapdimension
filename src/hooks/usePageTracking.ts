import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Tracks page visits for engagement analytics.
 * Only records visits for real users (not impersonated).
 * Debounces to avoid duplicate entries on rapid navigation.
 */
export function usePageTracking() {
  const location = useLocation();
  const { session, realAdminUser } = useAuth();
  const lastTracked = useRef<string>("");

  useEffect(() => {
    // Don't track during impersonation
    if (realAdminUser) return;
    const userId = session?.user?.id;
    if (!userId) return;

    const path = location.pathname;
    // Avoid duplicate tracking for same path
    if (lastTracked.current === path) return;
    lastTracked.current = path;

    // Fire and forget
    supabase.rpc("record_page_visit", {
      p_user_id: userId,
      p_page_path: path,
    }).then(() => {});
  }, [location.pathname, session?.user?.id, realAdminUser]);
}
