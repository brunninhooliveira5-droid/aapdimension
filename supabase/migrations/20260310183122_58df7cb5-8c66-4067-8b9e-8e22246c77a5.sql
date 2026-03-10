
-- Add new V2 columns to payment_receipts
ALTER TABLE public.payment_receipts
  ADD COLUMN IF NOT EXISTS doc_subtype TEXT NOT NULL DEFAULT 'geral',
  ADD COLUMN IF NOT EXISTS contract_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposal_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS machine_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS service_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS current_installment INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_installments INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS installment_due_date DATE,
  ADD COLUMN IF NOT EXISTS installment_status TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pix_key TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pix_beneficiary TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS enable_pix_qr BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_type TEXT NOT NULL DEFAULT 'geral',
  ADD COLUMN IF NOT EXISTS commercial_notes TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS complement_deadline TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS require_party_signature BOOLEAN NOT NULL DEFAULT false;

-- Create payment_history table
CREATE TABLE public.payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receipt_id UUID REFERENCES public.payment_receipts(id) ON DELETE SET NULL,
  party_name TEXT NOT NULL DEFAULT '',
  contract_id TEXT NOT NULL DEFAULT '',
  proposal_id TEXT NOT NULL DEFAULT '',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_type TEXT NOT NULL DEFAULT 'recebimento',
  payment_method TEXT NOT NULL DEFAULT 'pix',
  current_installment INTEGER NOT NULL DEFAULT 0,
  total_installments INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pago',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment history" ON public.payment_history
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Users can insert own payment history" ON public.payment_history
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own payment history" ON public.payment_history
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own payment history" ON public.payment_history
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Add new V2 columns to receipt_pdf_settings
ALTER TABLE public.receipt_pdf_settings
  ADD COLUMN IF NOT EXISTS enable_pix_qr BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_template_type TEXT NOT NULL DEFAULT 'geral',
  ADD COLUMN IF NOT EXISTS show_installment_info BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_remaining_balance BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_history_summary BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS document_title TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS subtitle_text TEXT NOT NULL DEFAULT '';
