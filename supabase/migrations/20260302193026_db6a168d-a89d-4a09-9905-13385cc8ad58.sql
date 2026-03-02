
-- Dashboard templates created by admin_master
CREATE TABLE public.dashboard_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_by UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  allowed_roles TEXT[] DEFAULT '{}',
  layout JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_templates ENABLE ROW LEVEL SECURITY;

-- Admin master can do everything
CREATE POLICY "admin_master_full_access" ON public.dashboard_templates
  FOR ALL USING (public.has_role(auth.uid(), 'admin_master'));

-- All authenticated users can read active templates
CREATE POLICY "users_read_active_templates" ON public.dashboard_templates
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_dashboard_templates_updated_at
  BEFORE UPDATE ON public.dashboard_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Add columns to user_dashboard_layout to track applied template
ALTER TABLE public.user_dashboard_layout
  ADD COLUMN IF NOT EXISTS applied_template_id UUID REFERENCES public.dashboard_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dashboard_locked BOOLEAN NOT NULL DEFAULT false;
