
-- Per-user section access control
-- Each user can have custom visibility per section: visible, locked, hidden
CREATE TABLE public.user_section_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sections JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_section_access ENABLE ROW LEVEL SECURITY;

-- Users can read their own section access
CREATE POLICY "Users read own section access"
ON public.user_section_access
FOR SELECT
USING (user_id = auth.uid());

-- Admin master reads all
CREATE POLICY "Admin master reads all section access"
ON public.user_section_access
FOR SELECT
USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Admin master manages all
CREATE POLICY "Admin master inserts section access"
ON public.user_section_access
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin master updates section access"
ON public.user_section_access
FOR UPDATE
USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin master deletes section access"
ON public.user_section_access
FOR DELETE
USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_user_section_access_updated_at
BEFORE UPDATE ON public.user_section_access
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
