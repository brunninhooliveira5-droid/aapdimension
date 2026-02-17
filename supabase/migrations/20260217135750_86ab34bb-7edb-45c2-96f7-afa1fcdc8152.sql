
-- Allow users with use_master_pricing to read admin_master's pricing settings
CREATE POLICY "Users with master pricing read admin settings"
ON public.pricing_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_plans up
    WHERE up.user_id = auth.uid()
    AND up.use_master_pricing = true
    AND pricing_settings.user_id = (
      SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin_master' LIMIT 1
    )
  )
);
