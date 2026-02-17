
-- Drop the old policy that uses a subquery on user_roles (which is subject to RLS)
DROP POLICY IF EXISTS "Users with master pricing read admin settings" ON public.pricing_settings;

-- Recreate using the SECURITY DEFINER function to bypass user_roles RLS
CREATE POLICY "Users with master pricing read admin settings"
ON public.pricing_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_plans up
    WHERE up.user_id = auth.uid()
      AND up.use_master_pricing = true
  )
  AND pricing_settings.user_id = public.get_admin_master_user_id()
);
