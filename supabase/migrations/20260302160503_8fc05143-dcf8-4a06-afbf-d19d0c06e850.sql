
-- =============================================
-- CONTROLE DE PRODUÇÃO - Tabelas independentes
-- =============================================

-- Production Control Cards (setores)
CREATE TABLE public.pc_production_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  image_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by_user_id UUID
);
ALTER TABLE public.pc_production_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view pc_production_cards" ON public.pc_production_cards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert pc_production_cards" ON public.pc_production_cards FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update pc_production_cards" ON public.pc_production_cards FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete pc_production_cards" ON public.pc_production_cards FOR DELETE TO authenticated USING (true);

-- PC Tasks
CREATE TABLE public.pc_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority TEXT DEFAULT 'media',
  category TEXT DEFAULT 'producao',
  responsible TEXT DEFAULT '',
  due_date DATE,
  status TEXT DEFAULT 'a_fazer',
  sector TEXT,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pc_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view pc_tasks" ON public.pc_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert pc_tasks" ON public.pc_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update pc_tasks" ON public.pc_tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete pc_tasks" ON public.pc_tasks FOR DELETE TO authenticated USING (true);

-- PC Task Files
CREATE TABLE public.pc_task_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.pc_tasks(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT DEFAULT 'application/octet-stream',
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pc_task_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view pc_task_files" ON public.pc_task_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert pc_task_files" ON public.pc_task_files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update pc_task_files" ON public.pc_task_files FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete pc_task_files" ON public.pc_task_files FOR DELETE TO authenticated USING (true);

-- PC Pendencies
CREATE TABLE public.pc_pendencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority TEXT DEFAULT 'media',
  category TEXT DEFAULT 'producao',
  responsible TEXT DEFAULT '',
  due_date DATE,
  status TEXT DEFAULT 'pendente',
  resolved_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pc_pendencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view pc_pendencies" ON public.pc_pendencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert pc_pendencies" ON public.pc_pendencies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update pc_pendencies" ON public.pc_pendencies FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete pc_pendencies" ON public.pc_pendencies FOR DELETE TO authenticated USING (true);

-- PC Schedule Events
CREATE TABLE public.pc_schedule_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  event_date DATE NOT NULL,
  event_time TEXT,
  event_type TEXT DEFAULT 'reuniao',
  responsible TEXT DEFAULT '',
  status TEXT DEFAULT 'agendado',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pc_schedule_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view pc_schedule_events" ON public.pc_schedule_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert pc_schedule_events" ON public.pc_schedule_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update pc_schedule_events" ON public.pc_schedule_events FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete pc_schedule_events" ON public.pc_schedule_events FOR DELETE TO authenticated USING (true);

-- PC Production Items
CREATE TABLE public.pc_production_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  client_name TEXT DEFAULT '',
  machine_name TEXT DEFAULT '',
  responsible TEXT DEFAULT '',
  priority TEXT DEFAULT 'media',
  status TEXT DEFAULT 'fila',
  notes TEXT DEFAULT '',
  estimated_deadline DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pc_production_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view pc_production_items" ON public.pc_production_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert pc_production_items" ON public.pc_production_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update pc_production_items" ON public.pc_production_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete pc_production_items" ON public.pc_production_items FOR DELETE TO authenticated USING (true);

-- PC Routines
CREATE TABLE public.pc_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  tasks_template JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pc_routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view pc_routines" ON public.pc_routines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert pc_routines" ON public.pc_routines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update pc_routines" ON public.pc_routines FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete pc_routines" ON public.pc_routines FOR DELETE TO authenticated USING (true);

-- PC Routine Activations
CREATE TABLE public.pc_routine_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID REFERENCES public.pc_routines(id) ON DELETE CASCADE NOT NULL,
  activated_by UUID NOT NULL,
  tasks_created INTEGER DEFAULT 0,
  context_data JSONB DEFAULT '{}',
  activated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pc_routine_activations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view pc_routine_activations" ON public.pc_routine_activations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert pc_routine_activations" ON public.pc_routine_activations FOR INSERT TO authenticated WITH CHECK (true);

-- PC Routine Template Files
CREATE TABLE public.pc_routine_template_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID REFERENCES public.pc_routines(id) ON DELETE CASCADE NOT NULL,
  task_index INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT DEFAULT 'application/octet-stream',
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pc_routine_template_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view pc_routine_template_files" ON public.pc_routine_template_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert pc_routine_template_files" ON public.pc_routine_template_files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can delete pc_routine_template_files" ON public.pc_routine_template_files FOR DELETE TO authenticated USING (true);

-- PC Goals
CREATE TABLE public.pc_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  goal_type TEXT DEFAULT 'quantidade',
  unit TEXT DEFAULT 'unidades',
  target_value NUMERIC DEFAULT 0,
  current_value NUMERIC DEFAULT 0,
  period_type TEXT DEFAULT 'mensal',
  period_start DATE DEFAULT CURRENT_DATE,
  period_end DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  responsible TEXT DEFAULT '',
  sector TEXT,
  linked_task_category TEXT,
  linked_task_sector TEXT,
  status TEXT DEFAULT 'em_andamento',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pc_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view pc_goals" ON public.pc_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert pc_goals" ON public.pc_goals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update pc_goals" ON public.pc_goals FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete pc_goals" ON public.pc_goals FOR DELETE TO authenticated USING (true);

-- PC Goal History
CREATE TABLE public.pc_goal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES public.pc_goals(id) ON DELETE CASCADE NOT NULL,
  value NUMERIC DEFAULT 0,
  snapshot_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pc_goal_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view pc_goal_history" ON public.pc_goal_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert pc_goal_history" ON public.pc_goal_history FOR INSERT TO authenticated WITH CHECK (true);

-- Storage bucket for PC task files
INSERT INTO storage.buckets (id, name, public) VALUES ('pc-task-files', 'pc-task-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth users can upload pc task files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pc-task-files');
CREATE POLICY "Auth users can read pc task files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'pc-task-files');
CREATE POLICY "Auth users can delete pc task files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'pc-task-files');

-- Triggers for updated_at
CREATE TRIGGER update_pc_tasks_updated_at BEFORE UPDATE ON public.pc_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_pc_pendencies_updated_at BEFORE UPDATE ON public.pc_pendencies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_pc_schedule_events_updated_at BEFORE UPDATE ON public.pc_schedule_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_pc_production_items_updated_at BEFORE UPDATE ON public.pc_production_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_pc_routines_updated_at BEFORE UPDATE ON public.pc_routines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_pc_goals_updated_at BEFORE UPDATE ON public.pc_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
