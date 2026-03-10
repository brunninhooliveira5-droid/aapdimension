ALTER TABLE public.pdf_quote_settings
  ADD COLUMN IF NOT EXISTS pix_key text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pix_beneficiary text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pix_city text NOT NULL DEFAULT '';