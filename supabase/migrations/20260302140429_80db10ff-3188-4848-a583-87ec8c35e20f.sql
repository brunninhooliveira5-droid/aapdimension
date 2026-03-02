ALTER TABLE public.pricing_settings
ADD COLUMN IF NOT EXISTS energy_cost_per_kwh numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS machine_energy_consumption_kw numeric DEFAULT 0;