import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";

/**
 * Returns the effective user context, accounting for impersonation.
 * - effectiveUserId: The impersonated user's ID (or real session user ID if not impersonating)
 * - isRealAdminMaster: true only when logged in as admin_master AND NOT impersonating
 * - isImpersonating: whether impersonation mode is active
 */
export function useEffectiveUser() {
  const { user, session, realAdminUser } = useAuth();
  const { isImpersonating, targetUserId } = useImpersonation();

  const sessionUserId = session?.user?.id ?? null;
  const effectiveUserId = isImpersonating && targetUserId ? targetUserId : sessionUserId;
  const isRealAdminMaster = isImpersonating
    ? realAdminUser?.role === "admin_master"
    : user?.role === "admin_master";
  const showAllData = !!isRealAdminMaster && !isImpersonating;

  return {
    effectiveUserId,
    sessionUserId,
    isRealAdminMaster: !!isRealAdminMaster,
    isImpersonating,
    showAllData,
    user,
    session,
  };
}
