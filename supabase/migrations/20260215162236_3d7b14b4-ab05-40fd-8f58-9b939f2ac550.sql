
CREATE TABLE public.cutting_material_thicknesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES public.cutting_materials(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cutting_material_thicknesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own thicknesses" ON public.cutting_material_thicknesses
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.cutting_materials WHERE id = cutting_material_thicknesses.material_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users insert own thicknesses" ON public.cutting_material_thicknesses
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.cutting_materials WHERE id = cutting_material_thicknesses.material_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users delete own thicknesses" ON public.cutting_material_thicknesses
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.cutting_materials WHERE id = cutting_material_thicknesses.material_id AND user_id = auth.uid()
  ));
