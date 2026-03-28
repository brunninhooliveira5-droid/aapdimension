
-- Training modules per equipment
CREATE TABLE public.training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Training lessons per module
CREATE TABLE public.training_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  video_url text NOT NULL DEFAULT '',
  duration text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Training materials per module or lesson
CREATE TABLE public.training_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES public.training_modules(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.training_lessons(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_url text NOT NULL DEFAULT '',
  file_path text,
  file_type text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Training progress per user per lesson
CREATE TABLE public.training_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  equipment_id uuid NOT NULL,
  module_id uuid NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.training_lessons(id) ON DELETE CASCADE,
  watched boolean NOT NULL DEFAULT false,
  watched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Enable RLS
ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;

-- RLS: training_modules - everyone authenticated can read, admin_master can write
CREATE POLICY "Anyone can read training modules" ON public.training_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert training modules" ON public.training_modules FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin_master'));
CREATE POLICY "Admin can update training modules" ON public.training_modules FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin_master'));
CREATE POLICY "Admin can delete training modules" ON public.training_modules FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin_master'));

-- RLS: training_lessons
CREATE POLICY "Anyone can read training lessons" ON public.training_lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert training lessons" ON public.training_lessons FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin_master'));
CREATE POLICY "Admin can update training lessons" ON public.training_lessons FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin_master'));
CREATE POLICY "Admin can delete training lessons" ON public.training_lessons FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin_master'));

-- RLS: training_materials
CREATE POLICY "Anyone can read training materials" ON public.training_materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert training materials" ON public.training_materials FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin_master'));
CREATE POLICY "Admin can update training materials" ON public.training_materials FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin_master'));
CREATE POLICY "Admin can delete training materials" ON public.training_materials FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin_master'));

-- RLS: training_progress - users manage their own progress
CREATE POLICY "Users can read own progress" ON public.training_progress FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin_master'));
CREATE POLICY "Users can insert own progress" ON public.training_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own progress" ON public.training_progress FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_training_modules_updated_at BEFORE UPDATE ON public.training_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_training_lessons_updated_at BEFORE UPDATE ON public.training_lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
