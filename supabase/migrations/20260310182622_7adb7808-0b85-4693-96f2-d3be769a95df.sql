
-- Payment receipts table
CREATE TABLE public.payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receipt_number SERIAL,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_type TEXT NOT NULL DEFAULT 'recebimento',
  party_name TEXT NOT NULL DEFAULT '',
  party_document TEXT NOT NULL DEFAULT '',
  party_phone TEXT NOT NULL DEFAULT '',
  party_email TEXT NOT NULL DEFAULT '',
  party_address TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  reference_type TEXT NOT NULL DEFAULT 'servico',
  description TEXT NOT NULL DEFAULT '',
  observations TEXT NOT NULL DEFAULT '',
  base_text TEXT NOT NULL DEFAULT 'Declaramos para os devidos fins que recebemos/pagamos o valor descrito neste documento, referente ao serviço, aquisição, parcela ou obrigação comercial aqui identificada, na data informada e conforme a forma de pagamento registrada.',
  related_contract TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'rascunho',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Receipt signatures table
CREATE TABLE public.receipt_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES public.payment_receipts(id) ON DELETE CASCADE,
  signer_type TEXT NOT NULL DEFAULT 'outra_parte',
  image_url TEXT NOT NULL DEFAULT '',
  signer_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Receipt PDF settings table
CREATE TABLE public.receipt_pdf_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL DEFAULT '',
  document_number TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '',
  footer_text TEXT NOT NULL DEFAULT 'Comprovante gerado automaticamente',
  institutional_text TEXT NOT NULL DEFAULT '',
  watermark_text TEXT NOT NULL DEFAULT '',
  watermark_image_url TEXT NOT NULL DEFAULT '',
  watermark_opacity NUMERIC NOT NULL DEFAULT 0.08,
  signer_name TEXT NOT NULL DEFAULT '',
  signer_role TEXT NOT NULL DEFAULT '',
  show_logo BOOLEAN NOT NULL DEFAULT true,
  show_footer BOOLEAN NOT NULL DEFAULT true,
  show_observations BOOLEAN NOT NULL DEFAULT true,
  show_emitter_signature BOOLEAN NOT NULL DEFAULT true,
  show_party_signature BOOLEAN NOT NULL DEFAULT true,
  show_watermark BOOLEAN NOT NULL DEFAULT false,
  primary_color TEXT NOT NULL DEFAULT '#0066cc',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_pdf_settings ENABLE ROW LEVEL SECURITY;

-- RLS: payment_receipts
CREATE POLICY "Users can view own receipts" ON public.payment_receipts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Users can insert own receipts" ON public.payment_receipts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own receipts" ON public.payment_receipts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Users can delete own receipts" ON public.payment_receipts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS: receipt_signatures
CREATE POLICY "Users can manage own receipt signatures" ON public.receipt_signatures
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.payment_receipts r WHERE r.id = receipt_id AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin_master')))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.payment_receipts r WHERE r.id = receipt_id AND r.user_id = auth.uid())
  );

-- RLS: receipt_pdf_settings
CREATE POLICY "Users can manage own receipt pdf settings" ON public.receipt_pdf_settings
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Updated_at trigger
CREATE TRIGGER update_payment_receipts_updated_at BEFORE UPDATE ON public.payment_receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_receipt_pdf_settings_updated_at BEFORE UPDATE ON public.receipt_pdf_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
