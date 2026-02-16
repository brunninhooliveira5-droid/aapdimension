
-- Add status and client_name columns to cutting_quotes
ALTER TABLE public.cutting_quotes 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'orcamento',
  ADD COLUMN IF NOT EXISTS client_name text NOT NULL DEFAULT '';

-- Allow users to update their own quotes (for status change, editing)
CREATE POLICY "Users update own quotes"
  ON public.cutting_quotes
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow admin_master to update all quotes
CREATE POLICY "Admin master updates all quotes"
  ON public.cutting_quotes
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));
