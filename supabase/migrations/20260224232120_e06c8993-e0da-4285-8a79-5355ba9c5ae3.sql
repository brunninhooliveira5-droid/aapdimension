
-- Table for PDFs, YouTube links, and tech specs attached to registered equipment
CREATE TABLE public.registered_equipment_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.registered_equipment(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL DEFAULT 'pdf', -- 'pdf', 'youtube', 'tech_spec'
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  file_path TEXT, -- for uploaded PDFs
  file_url TEXT, -- public URL or YouTube link
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.registered_equipment_files ENABLE ROW LEVEL SECURITY;

-- Admin master full access
CREATE POLICY "Admin master manages equipment files"
  ON public.registered_equipment_files
  FOR ALL
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

-- All authenticated users can read
CREATE POLICY "Authenticated users read equipment files"
  ON public.registered_equipment_files
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
