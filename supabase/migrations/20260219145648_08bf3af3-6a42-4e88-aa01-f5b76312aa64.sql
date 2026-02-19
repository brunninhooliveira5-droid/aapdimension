-- Fix 1: ticket_files - Replace overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view ticket files" ON public.ticket_files;

CREATE POLICY "Ticket owner can view files" ON public.ticket_files
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tickets 
    WHERE tickets.id = ticket_files.ticket_id 
    AND tickets.user_id = auth.uid()
  )
);

CREATE POLICY "File uploader can view" ON public.ticket_files
FOR SELECT USING (uploaded_by = auth.uid());

CREATE POLICY "Admin master views all ticket files" ON public.ticket_files
FOR SELECT USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Fix 4: profiles - Restrict to own profile only (currently any authenticated user can read all)
-- Check existing policies first and add tighter ones
-- profiles already has RLS enabled, but let's verify the SELECT policy scope
-- The current policies allow users to read their own profile via (id = auth.uid())
-- and admin_master reads all - this is correct behavior, no change needed.

-- Fix 5: client_proposals - Already restricted to admin_master only, which is correct.