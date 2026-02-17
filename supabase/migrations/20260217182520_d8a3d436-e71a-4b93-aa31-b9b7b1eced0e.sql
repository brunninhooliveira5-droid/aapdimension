ALTER TABLE public.pdf_quote_settings
ADD COLUMN show_watermark boolean DEFAULT false,
ADD COLUMN watermark_url text DEFAULT NULL;