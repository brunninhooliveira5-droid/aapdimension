-- Fix: Change user_roles SELECT policies from RESTRICTIVE to PERMISSIVE
-- Currently both are RESTRICTIVE which means ALL must pass, but users can only satisfy one

DROP POLICY "Admin master reads all roles" ON public.user_roles;
DROP POLICY "Users read own role" ON public.user_roles;

CREATE POLICY "Admin master reads all roles"
ON public.user_roles FOR SELECT
USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Users read own role"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());