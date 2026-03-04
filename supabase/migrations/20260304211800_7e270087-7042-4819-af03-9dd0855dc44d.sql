-- 1. Create helper function to check account ownership without recursion
CREATE OR REPLACE FUNCTION public.is_account_owner(_user_id uuid, _account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = _account_id AND owner_user_id = _user_id
  );
$$;

-- 2. Update members_insert to also allow account owners to insert themselves
DROP POLICY IF EXISTS "members_insert" ON public.account_members;
CREATE POLICY "members_insert" ON public.account_members
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin_master'::app_role)
    OR (account_id = get_user_account_id(auth.uid()) AND is_client_admin(auth.uid()))
    OR (is_account_owner(auth.uid(), account_id) AND user_id = auth.uid())
  );

-- 3. Add FK from account_members.user_id to profiles.id for PostgREST joins
ALTER TABLE public.account_members
  ADD CONSTRAINT account_members_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;