ALTER TABLE public.maintenances ADD COLUMN report text DEFAULT '';

-- Allow owners to update their maintenances (for adding reports)
CREATE POLICY "Owner updates maintenances"
ON public.maintenances
FOR UPDATE
USING (user_id = auth.uid());
