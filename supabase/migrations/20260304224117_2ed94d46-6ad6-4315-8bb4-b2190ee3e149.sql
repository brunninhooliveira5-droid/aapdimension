-- Allow sub-users to read/write cnc_investments and cnc_services of their account owner
-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage own investments" ON public.cnc_investments;
DROP POLICY IF EXISTS "Users can manage own services" ON public.cnc_services;

-- cnc_investments: allow read for own data, admin_master, or same-account members
CREATE POLICY "Users can read investments"
  ON public.cnc_investments FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin_master'::app_role)
    OR is_same_account(user_id)
  );

CREATE POLICY "Users can insert investments"
  ON public.cnc_investments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR is_same_account(user_id)
  );

CREATE POLICY "Users can update investments"
  ON public.cnc_investments FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin_master'::app_role)
    OR is_same_account(user_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR is_same_account(user_id)
  );

CREATE POLICY "Users can delete investments"
  ON public.cnc_investments FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin_master'::app_role)
    OR is_same_account(user_id)
  );

-- cnc_services: same pattern
CREATE POLICY "Users can read services"
  ON public.cnc_services FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin_master'::app_role)
    OR is_same_account(user_id)
  );

CREATE POLICY "Users can insert services"
  ON public.cnc_services FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR is_same_account(user_id)
  );

CREATE POLICY "Users can update services"
  ON public.cnc_services FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin_master'::app_role)
    OR is_same_account(user_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR is_same_account(user_id)
  );

CREATE POLICY "Users can delete services"
  ON public.cnc_services FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin_master'::app_role)
    OR is_same_account(user_id)
  );