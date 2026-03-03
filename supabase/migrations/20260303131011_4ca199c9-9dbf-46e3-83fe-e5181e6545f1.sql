ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS suspended_until timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS suspended_reason text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS suspended_by uuid DEFAULT NULL;