
-- Table for task file attachments
CREATE TABLE public.dimension_task_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.dimension_tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT '',
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dimension_task_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages dimension task files"
  ON public.dimension_task_files
  FOR ALL
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

-- Storage bucket for dimension task files
INSERT INTO storage.buckets (id, name, public) VALUES ('dimension-task-files', 'dimension-task-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Admin master uploads dimension task files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'dimension-task-files' AND has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin master deletes dimension task files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'dimension-task-files' AND has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Public reads dimension task files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dimension-task-files');
