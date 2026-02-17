
-- Function to get admin_master user_id securely (SECURITY DEFINER)
-- Only accessible to users with use_master_pricing=true
CREATE OR REPLACE FUNCTION public.get_admin_master_user_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ur.user_id 
  FROM public.user_roles ur 
  WHERE ur.role = 'admin_master'::app_role 
  LIMIT 1;
$$;
