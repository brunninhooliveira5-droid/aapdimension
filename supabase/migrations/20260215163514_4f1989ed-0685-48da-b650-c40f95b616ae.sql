
CREATE POLICY "Users update own materials"
ON public.cutting_materials
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
