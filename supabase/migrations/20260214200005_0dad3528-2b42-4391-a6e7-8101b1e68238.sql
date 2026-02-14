
CREATE TABLE public.machine_trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  video_url text,
  file_path text,
  file_name text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.machine_trainings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages trainings"
ON public.machine_trainings FOR ALL
USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Owner reads trainings"
ON public.machine_trainings FOR SELECT
USING (EXISTS (
  SELECT 1 FROM machines WHERE machines.id = machine_trainings.machine_id AND machines.owner_id = auth.uid()
));

CREATE TRIGGER update_machine_trainings_updated_at
BEFORE UPDATE ON public.machine_trainings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
