
CREATE TABLE public.pricing_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  rent numeric NOT NULL DEFAULT 0,
  electricity numeric NOT NULL DEFAULT 0,
  internet numeric NOT NULL DEFAULT 0,
  other_fixed numeric NOT NULL DEFAULT 0,
  machine_cost numeric NOT NULL DEFAULT 0,
  gas_consumable numeric NOT NULL DEFAULT 0,
  maintenance_cost numeric NOT NULL DEFAULT 0,
  other_machine numeric NOT NULL DEFAULT 0,
  productive_hours numeric NOT NULL DEFAULT 160,
  profit_margin numeric NOT NULL DEFAULT 30,
  avg_cut_speed numeric NOT NULL DEFAULT 2,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own settings"
ON public.pricing_settings FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users insert own settings"
ON public.pricing_settings FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own settings"
ON public.pricing_settings FOR UPDATE
USING (user_id = auth.uid());
