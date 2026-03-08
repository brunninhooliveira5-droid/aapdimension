
-- Create cutting_scraps table for remnant/scrap management
CREATE TABLE public.cutting_scraps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  material_name TEXT NOT NULL DEFAULT '',
  width NUMERIC NOT NULL DEFAULT 0,
  height NUMERIC NOT NULL DEFAULT 0,
  length NUMERIC NOT NULL DEFAULT 0,
  origin_plan_id UUID REFERENCES public.cutting_plans(id) ON DELETE SET NULL,
  scrap_type TEXT NOT NULL DEFAULT 'chapa',
  status TEXT NOT NULL DEFAULT 'disponível',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cutting_scraps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own scraps"
  ON public.cutting_scraps
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can manage all scraps"
  ON public.cutting_scraps
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'));
