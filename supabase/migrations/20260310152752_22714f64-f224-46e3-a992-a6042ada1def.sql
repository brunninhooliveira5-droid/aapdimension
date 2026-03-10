
ALTER TABLE public.work_diary_pdf_config
  ADD COLUMN IF NOT EXISTS logo_bg_color text DEFAULT '';
