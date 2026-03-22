
-- Checklists main table
CREATE TABLE public.pc_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  checklist_date DATE NOT NULL DEFAULT CURRENT_DATE,
  general_responsible TEXT NOT NULL DEFAULT '',
  project_name TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  is_template BOOLEAN NOT NULL DEFAULT false,
  template_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pc_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pc_checklists" ON public.pc_checklists
  FOR ALL TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin_master'))
  WITH CHECK (created_by = auth.uid());

-- Checklist sections
CREATE TABLE public.pc_checklist_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.pc_checklists(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pc_checklist_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pc_checklist_sections" ON public.pc_checklist_sections
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.pc_checklists c WHERE c.id = checklist_id AND (c.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin_master')))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pc_checklists c WHERE c.id = checklist_id AND c.created_by = auth.uid())
  );

-- Checklist tasks
CREATE TABLE public.pc_checklist_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.pc_checklist_sections(id) ON DELETE CASCADE,
  activity TEXT NOT NULL DEFAULT '',
  due_date DATE,
  responsible TEXT NOT NULL DEFAULT '',
  is_done BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pc_checklist_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pc_checklist_tasks" ON public.pc_checklist_tasks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pc_checklist_sections s
      JOIN public.pc_checklists c ON c.id = s.checklist_id
      WHERE s.id = section_id AND (c.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin_master'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pc_checklist_sections s
      JOIN public.pc_checklists c ON c.id = s.checklist_id
      WHERE s.id = section_id AND c.created_by = auth.uid()
    )
  );

-- PDF settings
CREATE TABLE public.pc_checklist_pdf_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  logo_url TEXT NOT NULL DEFAULT '',
  company_name TEXT NOT NULL DEFAULT '',
  footer_text TEXT NOT NULL DEFAULT '',
  watermark_text TEXT NOT NULL DEFAULT '',
  watermark_image_url TEXT NOT NULL DEFAULT '',
  watermark_opacity NUMERIC NOT NULL DEFAULT 0.1,
  primary_color TEXT NOT NULL DEFAULT '#1a1a2e',
  show_signature BOOLEAN NOT NULL DEFAULT false,
  show_responsible BOOLEAN NOT NULL DEFAULT true,
  show_project BOOLEAN NOT NULL DEFAULT true,
  show_date BOOLEAN NOT NULL DEFAULT true,
  show_notes BOOLEAN NOT NULL DEFAULT true,
  subtitle TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pc_checklist_pdf_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pc_checklist_pdf_settings" ON public.pc_checklist_pdf_settings
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Updated_at triggers
CREATE TRIGGER update_pc_checklists_updated_at BEFORE UPDATE ON public.pc_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_pc_checklist_pdf_settings_updated_at BEFORE UPDATE ON public.pc_checklist_pdf_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
