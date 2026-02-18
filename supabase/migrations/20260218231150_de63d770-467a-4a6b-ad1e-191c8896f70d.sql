
-- Remove user-facing RLS policies on finance_access_passwords
-- The edge function uses service_role_key and handles all operations
DROP POLICY IF EXISTS "Users read own finance password existence" ON public.finance_access_passwords;
DROP POLICY IF EXISTS "Users insert own finance password" ON public.finance_access_passwords;
DROP POLICY IF EXISTS "Users update own finance password" ON public.finance_access_passwords;
