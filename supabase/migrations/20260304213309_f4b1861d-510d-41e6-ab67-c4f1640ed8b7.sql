
CREATE OR REPLACE FUNCTION public.stop_impersonation(log_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow admin_master or the admin who started the impersonation
  UPDATE impersonation_logs
  SET ended_at = now()
  WHERE id = log_id AND admin_id = auth.uid() AND ended_at IS NULL;
END;
$$;
