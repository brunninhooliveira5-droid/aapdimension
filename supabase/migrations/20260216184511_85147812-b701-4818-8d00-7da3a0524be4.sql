
-- Finance Categories (for both payable and receivable)
CREATE TABLE public.finance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'despesa' CHECK (type IN ('despesa', 'receita', 'ambos')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages finance categories" ON public.finance_categories
  FOR ALL USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Financeiro reads finance categories" ON public.finance_categories
  FOR SELECT USING (has_role(auth.uid(), 'financeiro'::app_role));

-- Insert default categories
INSERT INTO public.finance_categories (name, type, sort_order) VALUES
  ('Aluguel', 'despesa', 1),
  ('Energia', 'despesa', 2),
  ('Matéria-prima', 'despesa', 3),
  ('Frete', 'despesa', 4),
  ('Impostos', 'despesa', 5),
  ('Jurídico', 'despesa', 6),
  ('Salários', 'despesa', 7),
  ('Manutenção', 'despesa', 8),
  ('Outros (Despesa)', 'despesa', 9),
  ('Venda de Máquina', 'receita', 1),
  ('SnapTool', 'receita', 2),
  ('Serviço de Corte', 'receita', 3),
  ('Manutenção', 'receita', 4),
  ('Treinamento', 'receita', 5),
  ('Outros (Receita)', 'receita', 6);

-- Finance Accounts Payable
CREATE TABLE public.finance_accounts_payable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category_id UUID REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  cost_center TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'pago', 'atrasado', 'parcelado')),
  payment_method TEXT CHECK (payment_method IN ('boleto', 'pix', 'cartao', 'transferencia', NULL)),
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_period TEXT CHECK (recurrence_period IN ('mensal', 'quinzenal', 'semanal', 'anual', NULL)),
  notes TEXT DEFAULT '',
  attachment_url TEXT,
  attachment_name TEXT,
  parent_id UUID REFERENCES public.finance_accounts_payable(id) ON DELETE CASCADE,
  installment_number INTEGER,
  total_installments INTEGER,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_accounts_payable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages payables" ON public.finance_accounts_payable
  FOR ALL USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Financeiro manages payables" ON public.finance_accounts_payable
  FOR ALL USING (has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(), 'financeiro'::app_role));

-- Finance Accounts Receivable
CREATE TABLE public.finance_accounts_receivable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category_id UUID REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  receipt_method TEXT CHECK (receipt_method IN ('boleto', 'pix', 'cartao', 'transferencia', NULL)),
  expected_date DATE NOT NULL,
  received_date DATE,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'recebido', 'atrasado', 'parcelado')),
  notes TEXT DEFAULT '',
  attachment_url TEXT,
  attachment_name TEXT,
  parent_id UUID REFERENCES public.finance_accounts_receivable(id) ON DELETE CASCADE,
  installment_number INTEGER,
  total_installments INTEGER,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_accounts_receivable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages receivables" ON public.finance_accounts_receivable
  FOR ALL USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Financeiro manages receivables" ON public.finance_accounts_receivable
  FOR ALL USING (has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(), 'financeiro'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_finance_categories_updated_at BEFORE UPDATE ON public.finance_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_finance_payable_updated_at BEFORE UPDATE ON public.finance_accounts_payable
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_finance_receivable_updated_at BEFORE UPDATE ON public.finance_accounts_receivable
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
