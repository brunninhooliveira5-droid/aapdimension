
ALTER TABLE public.receipt_pdf_settings ADD COLUMN IF NOT EXISTS pix_qr_image_url text NOT NULL DEFAULT '';
ALTER TABLE public.pdf_quote_settings ADD COLUMN IF NOT EXISTS pix_qr_image_url text NOT NULL DEFAULT '';
