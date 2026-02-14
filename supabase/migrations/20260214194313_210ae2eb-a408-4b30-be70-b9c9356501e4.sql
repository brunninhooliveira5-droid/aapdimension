
CREATE TABLE public.machine_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  spec_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(machine_id)
);

ALTER TABLE public.machine_specs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages specs"
ON public.machine_specs FOR ALL
USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Owner reads specs"
ON public.machine_specs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM machines WHERE machines.id = machine_specs.machine_id AND machines.owner_id = auth.uid()
));

CREATE TRIGGER update_machine_specs_updated_at
BEFORE UPDATE ON public.machine_specs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
