
CREATE POLICY "Account members can read fellow member profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT am2.user_id FROM public.account_members am2
    WHERE am2.account_id IN (
      SELECT am1.account_id FROM public.account_members am1
      WHERE am1.user_id = auth.uid() AND am1.is_active = true
    )
    AND am2.is_active = true
  )
);
