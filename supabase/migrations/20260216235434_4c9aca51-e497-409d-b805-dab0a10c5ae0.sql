
-- Table to store reusable access templates
CREATE TABLE public.access_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '{}'::jsonb,
  pro_access BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.access_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages access templates"
  ON public.access_templates FOR ALL
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE TRIGGER update_access_templates_updated_at
  BEFORE UPDATE ON public.access_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
