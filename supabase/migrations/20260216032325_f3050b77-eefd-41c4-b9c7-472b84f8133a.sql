
-- Create PDF quote settings table
CREATE TABLE public.pdf_quote_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_name TEXT DEFAULT '',
  company_phone TEXT DEFAULT '',
  company_email TEXT DEFAULT '',
  company_address TEXT DEFAULT '',
  company_cnpj TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  primary_color TEXT DEFAULT '#1a1a2e',
  accent_color TEXT DEFAULT '#e94560',
  show_material BOOLEAN DEFAULT true,
  show_thickness BOOLEAN DEFAULT true,
  show_cutting_value BOOLEAN DEFAULT true,
  show_material_value BOOLEAN DEFAULT true,
  show_delivery BOOLEAN DEFAULT true,
  show_date BOOLEAN DEFAULT true,
  show_customer BOOLEAN DEFAULT true,
  footer_text TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.pdf_quote_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own pdf settings"
ON public.pdf_quote_settings FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users insert own pdf settings"
ON public.pdf_quote_settings FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own pdf settings"
ON public.pdf_quote_settings FOR UPDATE
USING (user_id = auth.uid());

-- Storage bucket for quote logos
INSERT INTO storage.buckets (id, name, public) VALUES ('quote-logos', 'quote-logos', true);

CREATE POLICY "Users upload own logo"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'quote-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own logo"
ON storage.objects FOR UPDATE
USING (bucket_id = 'quote-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own logo"
ON storage.objects FOR DELETE
USING (bucket_id = 'quote-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'quote-logos');
