
CREATE TABLE public.nesting_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_name TEXT NOT NULL DEFAULT '',
  material_name TEXT NOT NULL DEFAULT '',
  material_width NUMERIC NOT NULL DEFAULT 0,
  material_height NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  kerf NUMERIC NOT NULL DEFAULT 3,
  auto_rotation BOOLEAN NOT NULL DEFAULT true,
  single_cut BOOLEAN NOT NULL DEFAULT false,
  utilization_percent NUMERIC NOT NULL DEFAULT 0,
  sheets_needed INTEGER NOT NULL DEFAULT 1,
  svg_original_url TEXT,
  result_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.nesting_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nesting_project_id UUID NOT NULL REFERENCES public.nesting_projects(id) ON DELETE CASCADE,
  piece_name TEXT DEFAULT '',
  geometry_data TEXT NOT NULL DEFAULT '',
  width NUMERIC NOT NULL DEFAULT 0,
  height NUMERIC NOT NULL DEFAULT 0,
  rotation NUMERIC NOT NULL DEFAULT 0,
  x_pos NUMERIC NOT NULL DEFAULT 0,
  y_pos NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nesting_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nesting_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own nesting projects"
  ON public.nesting_projects FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage nesting items via project"
  ON public.nesting_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nesting_projects np
      WHERE np.id = nesting_project_id AND np.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.nesting_projects np
      WHERE np.id = nesting_project_id AND np.user_id = auth.uid()
    )
  );

CREATE TRIGGER update_nesting_projects_updated_at
  BEFORE UPDATE ON public.nesting_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
