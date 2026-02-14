-- Allow ticket owners to delete their own tickets
CREATE POLICY "Owner deletes tickets"
ON public.tickets
FOR DELETE
USING (user_id = auth.uid());