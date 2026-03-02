ALTER TABLE public.pdf_quote_settings 
ADD COLUMN IF NOT EXISTS watermark_text text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS show_watermark boolean NOT NULL DEFAULT false;