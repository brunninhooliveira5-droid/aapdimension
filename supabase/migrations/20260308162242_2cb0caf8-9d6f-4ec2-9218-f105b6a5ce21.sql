
-- Materials catalog for cutting plans
CREATE TABLE public.cutting_plan_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'chapa',
  width numeric NOT NULL DEFAULT 0,
  height numeric NOT NULL DEFAULT 0,
  length numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  observation text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cutting_plan_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cutting_plan_materials_policy"
  ON public.cutting_plan_materials FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin_master'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin_master'));

-- Saved cutting plans
CREATE TABLE public.cutting_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_type text NOT NULL DEFAULT 'chapa',
  plan_name text NOT NULL,
  client_name text DEFAULT '',
  project_name text DEFAULT '',
  material_name text NOT NULL DEFAULT '',
  material_source text NOT NULL DEFAULT 'manual',
  material_dimensions jsonb NOT NULL DEFAULT '{}',
  material_unit_price numeric NOT NULL DEFAULT 0,
  kerf_width numeric NOT NULL DEFAULT 0,
  pieces jsonb NOT NULL DEFAULT '[]',
  result_json jsonb NOT NULL DEFAULT '{}',
  utilization_percent numeric NOT NULL DEFAULT 0,
  waste_area numeric NOT NULL DEFAULT 0,
  units_needed integer NOT NULL DEFAULT 1,
  estimated_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cutting_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cutting_plans_policy"
  ON public.cutting_plans FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin_master'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin_master'));

CREATE TRIGGER update_cutting_plan_materials_updated_at
  BEFORE UPDATE ON public.cutting_plan_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
