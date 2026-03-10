
ALTER TABLE public.work_diary_pdf_config
  ADD COLUMN IF NOT EXISTS watermark_text text DEFAULT '',
  ADD COLUMN IF NOT EXISTS watermark_opacity integer DEFAULT 15,
  ADD COLUMN IF NOT EXISTS show_watermark boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS header_color text DEFAULT '30,64,120';
