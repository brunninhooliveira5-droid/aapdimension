-- 1. Drop recursive/duplicate policies on account_members
DROP POLICY IF EXISTS "Members can view same account members" ON public.account_members;
DROP POLICY IF EXISTS "Account owners can insert members" ON public.account_members;

-- 2. Drop recursive/duplicate policies on accounts
DROP POLICY IF EXISTS "Users can view own account" ON public.accounts;
DROP POLICY IF EXISTS "Users can create their own account" ON public.accounts;

-- 3. Update accounts_insert to allow both admin_master AND owner self-provisioning
DROP POLICY IF EXISTS "accounts_insert" ON public.accounts;
CREATE POLICY "accounts_insert" ON public.accounts
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin_master'::app_role)
    OR owner_user_id = auth.uid()
  );