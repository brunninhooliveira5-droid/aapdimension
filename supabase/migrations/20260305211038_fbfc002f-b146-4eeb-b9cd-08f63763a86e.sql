CREATE TABLE public.pc_process_template_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.pc_production_process_templates(id) ON DELETE CASCADE,
  step_index integer NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer DEFAULT 0,
  mime_type text DEFAULT 'application/octet-stream',
  uploaded_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pc_process_template_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own template files"
  ON public.pc_process_template_files
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pc_production_process_templates t
      WHERE t.id = template_id AND t.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pc_production_process_templates t
      WHERE t.id = template_id AND t.created_by = auth.uid()
    )
  );

INSERT INTO storage.buckets (id, name, public) VALUES ('pc-process-template-files', 'pc-process-template-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth users can upload process template files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pc-process-template-files');

CREATE POLICY "Anyone can view process template files"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'pc-process-template-files');

CREATE POLICY "Auth users can delete process template files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pc-process-template-files');