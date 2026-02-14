
CREATE TABLE public.dimension_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  link TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dimension_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view equipment"
  ON public.dimension_equipment FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin master can insert equipment"
  ON public.dimension_equipment FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_master')
  );

CREATE POLICY "Admin master can update equipment"
  ON public.dimension_equipment FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_master')
  );

CREATE POLICY "Admin master can delete equipment"
  ON public.dimension_equipment FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_master')
  );
