
CREATE TABLE public.slicer_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  width NUMERIC NOT NULL DEFAULT 0,
  height NUMERIC NOT NULL DEFAULT 0,
  thickness NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.slicer_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own slicer materials"
  ON public.slicer_materials
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_slicer_materials_updated_at
  BEFORE UPDATE ON public.slicer_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
