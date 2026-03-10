
-- PDF config for technical reports
CREATE TABLE public.technical_report_pdf_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  company_name TEXT DEFAULT '',
  role_title TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  city TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  footer_text TEXT DEFAULT '',
  show_logo BOOLEAN DEFAULT true,
  show_photos BOOLEAN DEFAULT true,
  show_checklist BOOLEAN DEFAULT true,
  show_signature BOOLEAN DEFAULT true,
  watermark_opacity INTEGER DEFAULT 15,
  show_watermark BOOLEAN DEFAULT false,
  header_color TEXT DEFAULT '30,64,120',
  watermark_image_url TEXT DEFAULT '',
  logo_bg_color TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.technical_report_pdf_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own config" ON public.technical_report_pdf_config
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Clients for technical reports
CREATE TABLE public.technical_report_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  company TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.technical_report_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own clients" ON public.technical_report_clients
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add client_id to technical_reports
ALTER TABLE public.technical_reports ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.technical_report_clients(id) ON DELETE SET NULL;
