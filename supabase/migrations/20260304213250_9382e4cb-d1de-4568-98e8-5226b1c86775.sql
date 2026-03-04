
CREATE OR REPLACE FUNCTION public.start_account_impersonation(_target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  log_id uuid;
  caller_account_id uuid;
  target_account_id uuid;
BEGIN
  IF has_role(auth.uid(), 'admin_master'::app_role) THEN
    INSERT INTO impersonation_logs (admin_id, target_user_id)
    VALUES (auth.uid(), _target_user_id)
    RETURNING id INTO log_id;
    RETURN log_id;
  END IF;

  SELECT am.account_id INTO caller_account_id
  FROM account_members am
  WHERE am.user_id = auth.uid() AND am.role = 'client_admin' AND am.is_active = true
  LIMIT 1;

  IF caller_account_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: only account admins can impersonate';
  END IF;

  SELECT am.account_id INTO target_account_id
  FROM account_members am
  WHERE am.user_id = _target_user_id AND am.account_id = caller_account_id AND am.is_active = true
  LIMIT 1;

  IF target_account_id IS NULL THEN
    RAISE EXCEPTION 'Target user is not a member of your account';
  END IF;

  IF _target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot impersonate yourself';
  END IF;

  INSERT INTO impersonation_logs (admin_id, target_user_id)
  VALUES (auth.uid(), _target_user_id)
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$;
