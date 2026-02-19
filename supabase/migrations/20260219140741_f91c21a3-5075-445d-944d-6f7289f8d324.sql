
-- Impersonation audit logs table
CREATE TABLE public.impersonation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.impersonation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages impersonation logs"
ON public.impersonation_logs
FOR ALL
USING (has_role(auth.uid(), 'admin_master'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

-- RPC to start impersonation (validates admin_master, creates log)
CREATE OR REPLACE FUNCTION public.start_impersonation(target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: only admin_master can impersonate';
  END IF;
  
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot impersonate yourself';
  END IF;

  INSERT INTO impersonation_logs (admin_id, target_user_id)
  VALUES (auth.uid(), target_user_id)
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$;

-- RPC to stop impersonation (updates ended_at)
CREATE OR REPLACE FUNCTION public.stop_impersonation(log_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE impersonation_logs
  SET ended_at = now()
  WHERE id = log_id AND admin_id = auth.uid() AND ended_at IS NULL;
END;
$$;
