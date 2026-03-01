
-- Create table for files attached to routine sub-task templates
CREATE TABLE public.dimension_routine_template_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_id UUID NOT NULL REFERENCES public.dimension_routines(id) ON DELETE CASCADE,
  task_index INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT '',
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dimension_routine_template_files ENABLE ROW LEVEL SECURITY;

-- Only admin_master can manage template files
CREATE POLICY "Admin master manages routine template files"
  ON public.dimension_routine_template_files
  FOR ALL
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

-- Index for fast lookups by routine
CREATE INDEX idx_routine_template_files_routine ON public.dimension_routine_template_files(routine_id, task_index);
