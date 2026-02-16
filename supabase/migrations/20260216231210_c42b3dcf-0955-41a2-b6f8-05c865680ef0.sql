
ALTER TABLE public.user_plans
  ADD COLUMN IF NOT EXISTS pro_activated_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS last_access_at timestamp with time zone;
