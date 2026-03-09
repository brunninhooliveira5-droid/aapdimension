
-- Technical Reports table
CREATE TABLE public.technical_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_number SERIAL,
  created_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho',
  
  -- Attendance info
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  time_start TEXT,
  time_end TEXT,
  technician_name TEXT NOT NULL DEFAULT '',
  
  -- Client info
  client_name TEXT NOT NULL DEFAULT '',
  client_company TEXT NOT NULL DEFAULT '',
  client_city TEXT NOT NULL DEFAULT '',
  
  -- Equipment info
  equipment_name TEXT NOT NULL DEFAULT '',
  machine_model TEXT NOT NULL DEFAULT '',
  serial_number TEXT NOT NULL DEFAULT '',
  related_ticket TEXT,
  
  -- Description fields
  problem_reported TEXT NOT NULL DEFAULT '',
  technical_diagnosis TEXT NOT NULL DEFAULT '',
  service_performed TEXT NOT NULL DEFAULT '',
  parts_replaced TEXT NOT NULL DEFAULT '',
  tests_performed TEXT NOT NULL DEFAULT '',
  recommendations TEXT NOT NULL DEFAULT '',
  final_observations TEXT NOT NULL DEFAULT '',
  
  -- Checklist
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Signatures
  technician_signature TEXT,
  client_signature TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Technical Report Files table
CREATE TABLE public.technical_report_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.technical_reports(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT '',
  file_type TEXT NOT NULL DEFAULT 'photo',
  sort_order INT NOT NULL DEFAULT 0,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.technical_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_report_files ENABLE ROW LEVEL SECURITY;

-- RLS: admin_master and internal users can manage reports
CREATE POLICY "admin_master_full_access_reports" ON public.technical_reports
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'usuario_interno'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'usuario_interno'::app_role));

CREATE POLICY "admin_master_full_access_report_files" ON public.technical_report_files
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'usuario_interno'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'usuario_interno'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_technical_reports_updated_at
  BEFORE UPDATE ON public.technical_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('technical-report-files', 'technical-report-files', true);

-- Storage RLS
CREATE POLICY "auth_users_upload_report_files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'technical-report-files');

CREATE POLICY "public_read_report_files" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'technical-report-files');

CREATE POLICY "auth_users_delete_report_files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'technical-report-files');
