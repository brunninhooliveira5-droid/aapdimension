CREATE POLICY "Admin master inserts all quotes"
ON public.cutting_quotes
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));