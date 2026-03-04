
-- Table to store which production sectors each member can access
CREATE TABLE public.pc_member_sector_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sector_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, user_id, sector_key)
);

ALTER TABLE public.pc_member_sector_access ENABLE ROW LEVEL SECURITY;

-- client_admin of the same account can manage all records
CREATE POLICY "client_admin manages sector access"
ON public.pc_member_sector_access
FOR ALL TO authenticated
USING (
  public.is_client_admin(auth.uid())
  AND public.get_user_account_id(auth.uid()) = account_id
)
WITH CHECK (
  public.is_client_admin(auth.uid())
  AND public.get_user_account_id(auth.uid()) = account_id
);

-- Members can read their own records
CREATE POLICY "members read own sector access"
ON public.pc_member_sector_access
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- admin_master can manage all
CREATE POLICY "admin_master manages all sector access"
ON public.pc_member_sector_access
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin_master'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role));
