
-- Add use_dimension_materials flag to user_plans
ALTER TABLE public.user_plans ADD COLUMN IF NOT EXISTS use_dimension_materials boolean NOT NULL DEFAULT false;

-- Create Dimension official materials catalog (admin_master only)
CREATE TABLE public.dimension_cutting_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_adjustment numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dimension_cutting_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages dimension materials"
  ON public.dimension_cutting_materials FOR ALL
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Users with dimension materials flag can read"
  ON public.dimension_cutting_materials FOR SELECT
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM user_plans
      WHERE user_plans.user_id = auth.uid()
      AND user_plans.use_dimension_materials = true
    )
  );

-- Create Dimension official material thicknesses
CREATE TABLE public.dimension_cutting_material_thicknesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.dimension_cutting_materials(id) ON DELETE CASCADE,
  value text NOT NULL,
  label text NOT NULL,
  sheet_width numeric NOT NULL DEFAULT 0,
  sheet_height numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  speed_factor numeric NOT NULL DEFAULT 1.0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dimension_cutting_material_thicknesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages dimension thicknesses"
  ON public.dimension_cutting_material_thicknesses FOR ALL
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Users with dimension materials flag can read thicknesses"
  ON public.dimension_cutting_material_thicknesses FOR SELECT
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM user_plans
      WHERE user_plans.user_id = auth.uid()
      AND user_plans.use_dimension_materials = true
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_dimension_materials_updated_at
  BEFORE UPDATE ON public.dimension_cutting_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
