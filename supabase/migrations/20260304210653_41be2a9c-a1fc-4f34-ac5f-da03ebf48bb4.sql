
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS max_members integer NOT NULL DEFAULT 3;

-- Allow admin users to insert their own account
CREATE POLICY "Users can create their own account"
ON public.accounts FOR INSERT TO authenticated
WITH CHECK (owner_user_id = auth.uid());

-- Allow admin users to read their own account
DROP POLICY IF EXISTS "Users can view own account" ON public.accounts;
CREATE POLICY "Users can view own account"
ON public.accounts FOR SELECT TO authenticated
USING (
  owner_user_id = auth.uid() 
  OR EXISTS (SELECT 1 FROM public.account_members WHERE account_id = id AND user_id = auth.uid() AND is_active = true)
);

-- Allow account owner to insert members
DROP POLICY IF EXISTS "Client admins can manage members" ON public.account_members;
CREATE POLICY "Account owners can insert members"
ON public.account_members FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.accounts WHERE id = account_id AND owner_user_id = auth.uid())
  OR public.is_client_admin(auth.uid())
);

-- Allow reading members of same account
DROP POLICY IF EXISTS "Members can view same account members" ON public.account_members;
CREATE POLICY "Members can view same account members"
ON public.account_members FOR SELECT TO authenticated
USING (
  account_id IN (SELECT am.account_id FROM public.account_members am WHERE am.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.accounts WHERE id = account_id AND owner_user_id = auth.uid())
);
