
-- Allow owners to update their own reports
CREATE POLICY "Owner updates own reports"
ON public.maintenance_reports
FOR UPDATE
USING (created_by = auth.uid());

-- Allow owners to delete their own reports
CREATE POLICY "Owner deletes own reports"
ON public.maintenance_reports
FOR DELETE
USING (created_by = auth.uid());
