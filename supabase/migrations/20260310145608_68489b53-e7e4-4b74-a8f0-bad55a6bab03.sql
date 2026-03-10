
-- Table: work diary entries
CREATE TABLE public.work_diary_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entry_number SERIAL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  time_start TEXT DEFAULT '',
  time_end TEXT DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  activity_type TEXT NOT NULL DEFAULT 'servico',
  location TEXT DEFAULT '',
  responsible TEXT DEFAULT '',
  description TEXT DEFAULT '',
  materials_used TEXT DEFAULT '',
  team TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'concluido',
  pending_reason TEXT DEFAULT '',
  observations TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: work diary files
CREATE TABLE public.work_diary_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID REFERENCES public.work_diary_entries(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL DEFAULT '',
  file_size BIGINT DEFAULT 0,
  mime_type TEXT DEFAULT '',
  caption TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: work diary PDF config per user
CREATE TABLE public.work_diary_pdf_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_name TEXT DEFAULT '',
  role_title TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  city TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  footer_text TEXT DEFAULT '',
  show_logo BOOLEAN DEFAULT true,
  show_photos BOOLEAN DEFAULT true,
  show_materials BOOLEAN DEFAULT true,
  show_time BOOLEAN DEFAULT true,
  show_status BOOLEAN DEFAULT true,
  show_signature BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.work_diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_diary_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_diary_pdf_config ENABLE ROW LEVEL SECURITY;

-- RLS: work_diary_entries
CREATE POLICY "Users see own entries" ON public.work_diary_entries
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Users insert own entries" ON public.work_diary_entries
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own entries" ON public.work_diary_entries
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own entries" ON public.work_diary_entries
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS: work_diary_files
CREATE POLICY "Users see own files" ON public.work_diary_files
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Users insert own files" ON public.work_diary_files
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own files" ON public.work_diary_files
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own files" ON public.work_diary_files
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS: work_diary_pdf_config
CREATE POLICY "Users see own config" ON public.work_diary_pdf_config
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own config" ON public.work_diary_pdf_config
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own config" ON public.work_diary_pdf_config
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Storage bucket for diary files
INSERT INTO storage.buckets (id, name, public) VALUES ('work-diary-files', 'work-diary-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "Users upload diary files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'work-diary-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read diary files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'work-diary-files');

CREATE POLICY "Users delete diary files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'work-diary-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Trigger for updated_at
CREATE TRIGGER update_work_diary_entries_updated_at
  BEFORE UPDATE ON public.work_diary_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_work_diary_pdf_config_updated_at
  BEFORE UPDATE ON public.work_diary_pdf_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
