
ALTER TABLE public.work_diary_entries
  ADD COLUMN IF NOT EXISTS contracted_service text DEFAULT '',
  ADD COLUMN IF NOT EXISTS unit_value text DEFAULT '',
  ADD COLUMN IF NOT EXISTS execution_process text DEFAULT '',
  ADD COLUMN IF NOT EXISTS materials_to_use text DEFAULT '',
  ADD COLUMN IF NOT EXISTS impediment_reason text DEFAULT '';
