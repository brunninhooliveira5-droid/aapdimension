CREATE POLICY "Account members read owner pdf settings"
ON public.pdf_quote_settings FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM account_members am
    JOIN accounts a ON a.id = am.account_id
    WHERE am.user_id = auth.uid()
      AND am.is_active = true
      AND a.owner_user_id = pdf_quote_settings.user_id
  )
);