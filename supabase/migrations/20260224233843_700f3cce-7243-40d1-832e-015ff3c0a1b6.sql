
-- Table for registered equipment specs (like machine_specs)
CREATE TABLE public.registered_equipment_specs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.registered_equipment(id) ON DELETE CASCADE,
  spec_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint so each equipment has one specs row
ALTER TABLE public.registered_equipment_specs ADD CONSTRAINT registered_equipment_specs_equipment_id_key UNIQUE (equipment_id);

ALTER TABLE public.registered_equipment_specs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages registered equipment specs"
  ON public.registered_equipment_specs FOR ALL
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Authenticated users read registered equipment specs"
  ON public.registered_equipment_specs FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Table for registered equipment trainings (like machine_trainings)
CREATE TABLE public.registered_equipment_trainings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.registered_equipment(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  video_url TEXT,
  file_path TEXT,
  file_name TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.registered_equipment_trainings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages registered equipment trainings"
  ON public.registered_equipment_trainings FOR ALL
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Authenticated users read registered equipment trainings"
  ON public.registered_equipment_trainings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Triggers for updated_at
CREATE TRIGGER update_registered_equipment_specs_updated_at
  BEFORE UPDATE ON public.registered_equipment_specs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_registered_equipment_trainings_updated_at
  BEFORE UPDATE ON public.registered_equipment_trainings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
