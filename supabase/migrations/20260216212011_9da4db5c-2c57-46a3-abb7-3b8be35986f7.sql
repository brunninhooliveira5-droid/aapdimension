
-- Fixed expenses table
CREATE TABLE public.finance_fixed_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  monthly_value NUMERIC NOT NULL DEFAULT 0,
  due_day INTEGER NOT NULL DEFAULT 1 CHECK (due_day >= 1 AND due_day <= 31),
  is_active BOOLEAN NOT NULL DEFAULT true,
  payment_method TEXT,
  notes TEXT DEFAULT '',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_fixed_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages fixed expenses"
  ON public.finance_fixed_expenses FOR ALL
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Financeiro manages fixed expenses"
  ON public.finance_fixed_expenses FOR ALL
  USING (has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(), 'financeiro'::app_role));

CREATE TRIGGER update_finance_fixed_expenses_updated_at
  BEFORE UPDATE ON public.finance_fixed_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Simulator settings table (admin config)
CREATE TABLE public.finance_simulator_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  minimum_cash_reserve NUMERIC NOT NULL DEFAULT 10000,
  safe_commitment_limit NUMERIC NOT NULL DEFAULT 60,
  projection_horizon_months INTEGER NOT NULL DEFAULT 6,
  max_installments INTEGER NOT NULL DEFAULT 12,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_simulator_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages simulator settings"
  ON public.finance_simulator_settings FOR ALL
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Financeiro reads simulator settings"
  ON public.finance_simulator_settings FOR SELECT
  USING (has_role(auth.uid(), 'financeiro'::app_role));

CREATE TRIGGER update_finance_simulator_settings_updated_at
  BEFORE UPDATE ON public.finance_simulator_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Insert default settings
INSERT INTO public.finance_simulator_settings (minimum_cash_reserve, safe_commitment_limit, projection_horizon_months, max_installments)
VALUES (10000, 60, 6, 12);
