
-- Allow account members (client_admin) to read roles of users in same account
CREATE POLICY "Account admins can read member roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT am2.user_id FROM public.account_members am2
    WHERE am2.account_id IN (
      SELECT am1.account_id FROM public.account_members am1
      WHERE am1.user_id = auth.uid() AND am1.role = 'client_admin' AND am1.is_active = true
    )
  )
);

-- Allow account members (client_admin) to read plans of users in same account
CREATE POLICY "Account admins can read member plans"
ON public.user_plans
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT am2.user_id FROM public.account_members am2
    WHERE am2.account_id IN (
      SELECT am1.account_id FROM public.account_members am1
      WHERE am1.user_id = auth.uid() AND am1.role = 'client_admin' AND am1.is_active = true
    )
  )
);

-- Allow account members (client_admin) to read/write dashboard layouts of users in same account
CREATE POLICY "Account admins can read member dashboard layouts"
ON public.user_dashboard_layout
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT am2.user_id FROM public.account_members am2
    WHERE am2.account_id IN (
      SELECT am1.account_id FROM public.account_members am1
      WHERE am1.user_id = auth.uid() AND am1.role = 'client_admin' AND am1.is_active = true
    )
  )
);

CREATE POLICY "Account admins can insert member dashboard layouts"
ON public.user_dashboard_layout
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IN (
    SELECT am2.user_id FROM public.account_members am2
    WHERE am2.account_id IN (
      SELECT am1.account_id FROM public.account_members am1
      WHERE am1.user_id = auth.uid() AND am1.role = 'client_admin' AND am1.is_active = true
    )
  )
);

CREATE POLICY "Account admins can update member dashboard layouts"
ON public.user_dashboard_layout
FOR UPDATE
TO authenticated
USING (
  user_id IN (
    SELECT am2.user_id FROM public.account_members am2
    WHERE am2.account_id IN (
      SELECT am1.account_id FROM public.account_members am1
      WHERE am1.user_id = auth.uid() AND am1.role = 'client_admin' AND am1.is_active = true
    )
  )
);
