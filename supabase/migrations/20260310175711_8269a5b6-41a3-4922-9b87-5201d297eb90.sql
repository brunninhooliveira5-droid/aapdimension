
-- Contracts table
CREATE TABLE public.dimension_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_number SERIAL,
  client_name TEXT NOT NULL DEFAULT '',
  client_document TEXT NOT NULL DEFAULT '',
  client_address TEXT NOT NULL DEFAULT '',
  client_phone TEXT NOT NULL DEFAULT '',
  client_email TEXT NOT NULL DEFAULT '',
  client_responsible TEXT NOT NULL DEFAULT '',
  closing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  validity_date DATE,
  machine_model TEXT NOT NULL DEFAULT '',
  machine_description TEXT NOT NULL DEFAULT '',
  machine_specs TEXT NOT NULL DEFAULT '',
  machine_included_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  machine_optional_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  specs_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_value NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT '',
  payment_entry NUMERIC NOT NULL DEFAULT 0,
  payment_installments TEXT NOT NULL DEFAULT '',
  payment_balance NUMERIC NOT NULL DEFAULT 0,
  payment_notes TEXT NOT NULL DEFAULT '',
  commercial_conditions TEXT NOT NULL DEFAULT '',
  clauses TEXT NOT NULL DEFAULT '',
  general_notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'rascunho',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contract items table
CREATE TABLE public.dimension_contract_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.dimension_contracts(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contract PDF settings table
CREATE TABLE public.dimension_contract_pdf_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_name TEXT NOT NULL DEFAULT '',
  company_cnpj TEXT NOT NULL DEFAULT '',
  company_address TEXT NOT NULL DEFAULT '',
  company_phone TEXT NOT NULL DEFAULT '',
  company_email TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '',
  footer_text TEXT NOT NULL DEFAULT '',
  institutional_text TEXT NOT NULL DEFAULT '',
  watermark_text TEXT NOT NULL DEFAULT '',
  watermark_image_url TEXT NOT NULL DEFAULT '',
  watermark_opacity NUMERIC NOT NULL DEFAULT 0.08,
  watermark_position TEXT NOT NULL DEFAULT 'center',
  show_watermark BOOLEAN NOT NULL DEFAULT false,
  signer_name TEXT NOT NULL DEFAULT '',
  signer_role TEXT NOT NULL DEFAULT '',
  signature_url TEXT NOT NULL DEFAULT '',
  primary_color TEXT NOT NULL DEFAULT '#0066cc',
  accent_color TEXT NOT NULL DEFAULT '#e94560',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.dimension_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dimension_contract_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dimension_contract_pdf_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for contracts
CREATE POLICY "Admin master full access contracts" ON public.dimension_contracts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Internal users read contracts" ON public.dimension_contracts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'usuario_interno'));

CREATE POLICY "Internal users insert contracts" ON public.dimension_contracts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'usuario_interno'));

CREATE POLICY "Internal users update contracts" ON public.dimension_contracts
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'usuario_interno'))
  WITH CHECK (public.has_role(auth.uid(), 'usuario_interno'));

-- RLS for contract items
CREATE POLICY "Admin master full access contract items" ON public.dimension_contract_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dimension_contracts c WHERE c.id = contract_id AND public.has_role(auth.uid(), 'admin_master')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.dimension_contracts c WHERE c.id = contract_id AND public.has_role(auth.uid(), 'admin_master')));

CREATE POLICY "Internal users access contract items" ON public.dimension_contract_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dimension_contracts c WHERE c.id = contract_id AND (public.has_role(auth.uid(), 'usuario_interno') OR public.has_role(auth.uid(), 'admin_master'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.dimension_contracts c WHERE c.id = contract_id AND (public.has_role(auth.uid(), 'usuario_interno') OR public.has_role(auth.uid(), 'admin_master'))));

-- RLS for PDF settings
CREATE POLICY "Admin master full access contract pdf" ON public.dimension_contract_pdf_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Internal users access contract pdf settings" ON public.dimension_contract_pdf_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'usuario_interno'))
  WITH CHECK (public.has_role(auth.uid(), 'usuario_interno'));

-- Updated_at trigger
CREATE TRIGGER update_dimension_contracts_updated_at BEFORE UPDATE ON public.dimension_contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_dimension_contract_pdf_settings_updated_at BEFORE UPDATE ON public.dimension_contract_pdf_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
