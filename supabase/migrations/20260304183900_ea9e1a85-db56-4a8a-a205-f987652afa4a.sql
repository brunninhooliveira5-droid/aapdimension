
-- Add origin_type and operational_status columns to machines
ALTER TABLE public.machines 
  ADD COLUMN IF NOT EXISTS origin_type text NOT NULL DEFAULT 'client',
  ADD COLUMN IF NOT EXISTS operational_status text NOT NULL DEFAULT 'livre',
  ADD COLUMN IF NOT EXISTS operational_status_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS operational_status_updated_by uuid;

-- Add constraint for valid values
ALTER TABLE public.machines 
  ADD CONSTRAINT machines_origin_type_check CHECK (origin_type IN ('client', 'dimension'));

ALTER TABLE public.machines 
  ADD CONSTRAINT machines_operational_status_check CHECK (operational_status IN ('livre', 'em_producao', 'parada', 'manutencao', 'setup'));

-- Update RLS: Owner reads only client machines
DROP POLICY IF EXISTS "Owner reads machines" ON public.machines;
CREATE POLICY "Owner reads client machines"
  ON public.machines FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() AND origin_type = 'client');

-- Admin master policies remain (already can see all)
