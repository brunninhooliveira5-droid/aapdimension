
ALTER TABLE public.work_diary_entries
  ADD COLUMN IF NOT EXISTS execution_deadline text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contracted_services jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS required_materials jsonb DEFAULT '[]'::jsonb;
