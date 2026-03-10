CREATE OR REPLACE FUNCTION public.get_admin_master_pdf_settings()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(s.*)
  FROM public.pdf_quote_settings s
  JOIN public.user_roles ur ON ur.user_id = s.user_id
  WHERE ur.role = 'admin_master'::app_role
  LIMIT 1;
$$;