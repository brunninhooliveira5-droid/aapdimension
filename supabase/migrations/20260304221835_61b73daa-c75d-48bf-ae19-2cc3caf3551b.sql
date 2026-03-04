CREATE POLICY "Account members read owner pricing settings"
ON public.pricing_settings FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM account_members am
    JOIN accounts a ON a.id = am.account_id
    WHERE am.user_id = auth.uid()
      AND am.is_active = true
      AND a.owner_user_id = pricing_settings.user_id
  )
);