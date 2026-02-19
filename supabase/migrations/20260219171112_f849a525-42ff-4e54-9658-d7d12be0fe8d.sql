
-- Create user_activity table
CREATE TABLE public.user_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  login_count integer NOT NULL DEFAULT 0,
  last_login_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- Only admin_master can read
CREATE POLICY "Admin master reads all activity"
ON public.user_activity
FOR SELECT
USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Allow service role / triggers to insert/update (via security definer function)
-- We'll use a security definer function to record login activity

CREATE OR REPLACE FUNCTION public.record_login_activity(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_activity (user_id, login_count, last_login_at)
  VALUES (p_user_id, 1, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    login_count = user_activity.login_count + 1,
    last_login_at = now();
END;
$$;
