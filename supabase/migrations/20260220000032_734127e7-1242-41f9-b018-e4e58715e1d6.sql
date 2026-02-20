
-- Fix tickets RLS: allow machine owners to see tickets on their machines
CREATE POLICY "Machine owner reads tickets"
ON public.tickets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM machines
    WHERE machines.id = tickets.machine_id
    AND machines.owner_id = auth.uid()
  )
);

-- Fix maintenances RLS: allow machine owners to see maintenances on their machines
CREATE POLICY "Machine owner reads maintenances"
ON public.maintenances
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM machines
    WHERE machines.id = maintenances.machine_id
    AND machines.owner_id = auth.uid()
  )
);
