
CREATE OR REPLACE FUNCTION public.get_admin_master_pix_qr()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.pix_qr_image_url
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE ur.role = 'admin_master'::app_role
  LIMIT 1;
$$;
