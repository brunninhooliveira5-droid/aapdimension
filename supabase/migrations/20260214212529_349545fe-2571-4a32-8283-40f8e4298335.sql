-- Allow admin_master to delete maintenances
CREATE POLICY "Admin master deletes maintenances"
ON public.maintenances FOR DELETE
USING (has_role(auth.uid(), 'admin_master'::app_role));
