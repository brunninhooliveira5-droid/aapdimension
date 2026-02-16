
-- =============================================
-- JURÍDICO: Contratos
-- =============================================
CREATE TABLE public.legal_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  contract_type TEXT NOT NULL DEFAULT 'servico',
  counterparty TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  value NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'vigente',
  attachment_url TEXT,
  attachment_name TEXT,
  notes TEXT DEFAULT '',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages legal_contracts" ON public.legal_contracts FOR ALL
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Financeiro reads legal_contracts" ON public.legal_contracts FOR SELECT
  USING (has_role(auth.uid(), 'financeiro'::app_role));

-- =============================================
-- JURÍDICO: Processos Judiciais
-- =============================================
CREATE TABLE public.legal_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_number TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  case_type TEXT NOT NULL DEFAULT 'civel',
  counterparty TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'em_andamento',
  court TEXT DEFAULT '',
  lawyer TEXT DEFAULT '',
  filed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_hearing_date DATE,
  estimated_value NUMERIC NOT NULL DEFAULT 0,
  attachment_url TEXT,
  attachment_name TEXT,
  notes TEXT DEFAULT '',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages legal_cases" ON public.legal_cases FOR ALL
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Financeiro reads legal_cases" ON public.legal_cases FOR SELECT
  USING (has_role(auth.uid(), 'financeiro'::app_role));

-- =============================================
-- JURÍDICO: Cobranças Judiciais
-- =============================================
CREATE TABLE public.legal_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debtor TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  original_due_date DATE NOT NULL,
  collection_type TEXT NOT NULL DEFAULT 'protesto',
  status TEXT NOT NULL DEFAULT 'em_andamento',
  description TEXT NOT NULL DEFAULT '',
  notes TEXT DEFAULT '',
  attachment_url TEXT,
  attachment_name TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages legal_collections" ON public.legal_collections FOR ALL
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Financeiro reads legal_collections" ON public.legal_collections FOR SELECT
  USING (has_role(auth.uid(), 'financeiro'::app_role));

-- =============================================
-- DÍVIDAS: Empréstimos/Financiamentos
-- =============================================
CREATE TABLE public.debts_loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creditor TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  loan_type TEXT NOT NULL DEFAULT 'emprestimo',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  outstanding_balance NUMERIC NOT NULL DEFAULT 0,
  interest_rate NUMERIC NOT NULL DEFAULT 0,
  installments_total INTEGER NOT NULL DEFAULT 1,
  installments_paid INTEGER NOT NULL DEFAULT 0,
  monthly_payment NUMERIC NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  next_due_date DATE,
  status TEXT NOT NULL DEFAULT 'ativo',
  notes TEXT DEFAULT '',
  attachment_url TEXT,
  attachment_name TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.debts_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages debts_loans" ON public.debts_loans FOR ALL
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Financeiro manages debts_loans" ON public.debts_loans FOR ALL
  USING (has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(), 'financeiro'::app_role));

-- =============================================
-- DÍVIDAS: Inadimplência de Clientes
-- =============================================
CREATE TABLE public.debts_client_delinquency (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  original_amount NUMERIC NOT NULL DEFAULT 0,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  original_due_date DATE NOT NULL,
  days_overdue INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'inadimplente',
  collection_action TEXT DEFAULT '',
  contact_info TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.debts_client_delinquency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages debts_client_delinquency" ON public.debts_client_delinquency FOR ALL
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Financeiro manages debts_client_delinquency" ON public.debts_client_delinquency FOR ALL
  USING (has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(), 'financeiro'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_legal_contracts_updated_at BEFORE UPDATE ON public.legal_contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_legal_cases_updated_at BEFORE UPDATE ON public.legal_cases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_legal_collections_updated_at BEFORE UPDATE ON public.legal_collections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_debts_loans_updated_at BEFORE UPDATE ON public.debts_loans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_debts_client_delinquency_updated_at BEFORE UPDATE ON public.debts_client_delinquency FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
