
-- Create bonuses table for service clients
CREATE TABLE public.service_bonuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'credito', -- 'credito' or 'debito'
  granted_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT DEFAULT ''
);

-- Enable RLS
ALTER TABLE public.service_bonuses ENABLE ROW LEVEL SECURITY;

-- Admin master full access
CREATE POLICY "Admin master manages bonuses"
  ON public.service_bonuses FOR ALL
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

-- Service users read own bonuses
CREATE POLICY "Users read own bonuses"
  ON public.service_bonuses FOR SELECT
  USING (user_id = auth.uid());
