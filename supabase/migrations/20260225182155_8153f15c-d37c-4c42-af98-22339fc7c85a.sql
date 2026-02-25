
-- Dimension Portal Tables

-- Tasks
CREATE TABLE public.dimension_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'a_fazer',
  priority text NOT NULL DEFAULT 'media',
  category text NOT NULL DEFAULT 'producao',
  responsible text NOT NULL DEFAULT '',
  due_date date,
  completed_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dimension_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages dimension_tasks"
  ON public.dimension_tasks FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE TRIGGER update_dimension_tasks_updated_at
  BEFORE UPDATE ON public.dimension_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Pendencies
CREATE TABLE public.dimension_pendencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pendente',
  priority text NOT NULL DEFAULT 'media',
  category text NOT NULL DEFAULT 'producao',
  responsible text NOT NULL DEFAULT '',
  due_date date,
  resolved_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dimension_pendencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages dimension_pendencies"
  ON public.dimension_pendencies FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE TRIGGER update_dimension_pendencies_updated_at
  BEFORE UPDATE ON public.dimension_pendencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Schedule Events
CREATE TABLE public.dimension_schedule_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  event_type text NOT NULL DEFAULT 'reuniao',
  event_date date NOT NULL,
  event_time time,
  responsible text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'agendado',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dimension_schedule_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages dimension_schedule_events"
  ON public.dimension_schedule_events FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE TRIGGER update_dimension_schedule_events_updated_at
  BEFORE UPDATE ON public.dimension_schedule_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Production Items
CREATE TABLE public.dimension_production_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name text NOT NULL,
  client_name text NOT NULL DEFAULT '',
  machine_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'em_fabricacao',
  priority text NOT NULL DEFAULT 'media',
  responsible text NOT NULL DEFAULT '',
  estimated_deadline date,
  notes text NOT NULL DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dimension_production_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages dimension_production_items"
  ON public.dimension_production_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE TRIGGER update_dimension_production_items_updated_at
  BEFORE UPDATE ON public.dimension_production_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
