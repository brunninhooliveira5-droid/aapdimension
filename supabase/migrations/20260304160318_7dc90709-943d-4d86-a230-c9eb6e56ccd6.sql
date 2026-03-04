
-- Table for CNC machine investments
CREATE TABLE public.cnc_investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  machine_name TEXT NOT NULL DEFAULT '',
  invested_value NUMERIC NOT NULL DEFAULT 0,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  useful_life_months INTEGER NOT NULL DEFAULT 60,
  depreciation_method TEXT NOT NULL DEFAULT 'linear',
  depreciation_rate_year NUMERIC NOT NULL DEFAULT 0,
  depreciation_monthly NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cnc_investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own investments"
  ON public.cnc_investments FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin_master'))
  WITH CHECK (user_id = auth.uid());

-- Table for CNC services (payback tracking)
CREATE TABLE public.cnc_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_id UUID NOT NULL REFERENCES public.cnc_investments(id) ON DELETE CASCADE,
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  client_name TEXT NOT NULL DEFAULT '',
  revenue NUMERIC NOT NULL DEFAULT 0,
  material_cost NUMERIC NOT NULL DEFAULT 0,
  machine_cost NUMERIC NOT NULL DEFAULT 0,
  additional_costs NUMERIC NOT NULL DEFAULT 0,
  profit NUMERIC NOT NULL DEFAULT 0,
  origin TEXT NOT NULL DEFAULT 'manual',
  quote_id UUID NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cnc_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own services"
  ON public.cnc_services FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin_master'))
  WITH CHECK (user_id = auth.uid());
