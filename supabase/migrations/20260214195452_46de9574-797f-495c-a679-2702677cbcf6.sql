
-- Allow admin master to delete tickets
CREATE POLICY "Admin master deletes tickets"
ON public.tickets
FOR DELETE
USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Allow admin master to update tickets
CREATE POLICY "Admin master updates tickets"
ON public.tickets
FOR UPDATE
USING (has_role(auth.uid(), 'admin_master'::app_role));
