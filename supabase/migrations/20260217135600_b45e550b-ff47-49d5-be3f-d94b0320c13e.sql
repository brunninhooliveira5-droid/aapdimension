
-- Add use_master_pricing flag to user_plans
ALTER TABLE public.user_plans ADD COLUMN use_master_pricing boolean NOT NULL DEFAULT false;
