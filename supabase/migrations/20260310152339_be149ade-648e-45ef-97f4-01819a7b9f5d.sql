
ALTER TABLE public.work_diary_pdf_config
  ADD COLUMN IF NOT EXISTS watermark_image_url text DEFAULT '';
