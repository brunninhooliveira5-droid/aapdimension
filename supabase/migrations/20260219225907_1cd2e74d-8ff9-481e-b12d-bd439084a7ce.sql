
-- Create user_suggestions table
CREATE TABLE public.user_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT,
  user_email TEXT,
  category TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'novo',
  admin_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own suggestions
CREATE POLICY "Users insert own suggestions"
  ON public.user_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own suggestions
CREATE POLICY "Users read own suggestions"
  ON public.user_suggestions FOR SELECT
  USING (auth.uid() = user_id);

-- Admin master full access
CREATE POLICY "Admin master manages suggestions"
  ON public.user_suggestions FOR ALL
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));
