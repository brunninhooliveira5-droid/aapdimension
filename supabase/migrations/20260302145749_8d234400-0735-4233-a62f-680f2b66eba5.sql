ALTER TABLE public.pdf_quote_settings 
DROP COLUMN IF EXISTS watermark_text,
ADD COLUMN IF NOT EXISTS watermark_url text NOT NULL DEFAULT '';