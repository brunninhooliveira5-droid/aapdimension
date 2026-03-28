CREATE POLICY "Authenticated users can read registered equipment"
ON public.registered_equipment
FOR SELECT
TO authenticated
USING (true);