
-- Create custom materials table for cutting quotes
CREATE TABLE public.cutting_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cutting_materials ENABLE ROW LEVEL SECURITY;

-- Users can manage their own materials
CREATE POLICY "Users read own materials" ON public.cutting_materials FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own materials" ON public.cutting_materials FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own materials" ON public.cutting_materials FOR DELETE USING (user_id = auth.uid());
