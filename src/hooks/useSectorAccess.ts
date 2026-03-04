import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUser } from "./useEffectiveUser";

/**
 * Returns the list of allowed sector keys for the effective user.
 * - null means "all sectors allowed" (admin or no restrictions configured)
 * - string[] means only those sectors are visible
 */
export function useSectorAccess() {
  const { effectiveUserId, isRealAdminMaster, user } = useEffectiveUser();
  const [allowedSectors, setAllowedSectors] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  const isClientAdmin = user?.accountMembership?.memberRole === "client_admin";

  const fetch = useCallback(async () => {
    // Admins always see everything
    if (isRealAdminMaster || isClientAdmin || !effectiveUserId) {
      setAllowedSectors(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("pc_member_sector_access" as any)
      .select("sector_key")
      .eq("user_id", effectiveUserId);

    const rows = (data ?? []) as any[];
    // No records = all sectors allowed (default behavior)
    if (rows.length === 0) {
      setAllowedSectors(null);
    } else {
      setAllowedSectors(rows.map((r: any) => r.sector_key));
    }
    setLoading(false);
  }, [effectiveUserId, isRealAdminMaster, isClientAdmin]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { allowedSectors, loading };
}
