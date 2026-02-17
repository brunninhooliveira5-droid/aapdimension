
-- Add pro_granted_by and pro_notes columns to user_plans
ALTER TABLE public.user_plans ADD COLUMN IF NOT EXISTS pro_granted_by uuid;
ALTER TABLE public.user_plans ADD COLUMN IF NOT EXISTS pro_notes text DEFAULT '';
