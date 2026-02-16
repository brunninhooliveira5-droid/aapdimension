
-- Create file_categories table
CREATE TABLE public.file_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.file_categories ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read active categories
CREATE POLICY "Authenticated users read active categories"
  ON public.file_categories FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- Admin master reads all (including inactive)
CREATE POLICY "Admin master reads all categories"
  ON public.file_categories FOR SELECT
  USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin master inserts categories"
  ON public.file_categories FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin master updates categories"
  ON public.file_categories FOR UPDATE
  USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin master deletes categories"
  ON public.file_categories FOR DELETE
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_file_categories_updated_at
  BEFORE UPDATE ON public.file_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create customer_files table
CREATE TABLE public.customer_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.file_categories(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name_original text NOT NULL,
  display_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  version text,
  tags text[] DEFAULT '{}',
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_files ENABLE ROW LEVEL SECURITY;

-- Authenticated users read published files
CREATE POLICY "Authenticated users read published files"
  ON public.customer_files FOR SELECT
  USING (auth.uid() IS NOT NULL AND published = true);

-- Admin master full access
CREATE POLICY "Admin master reads all files"
  ON public.customer_files FOR SELECT
  USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin master inserts files"
  ON public.customer_files FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin master updates files"
  ON public.customer_files FOR UPDATE
  USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin master deletes files"
  ON public.customer_files FOR DELETE
  USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE TRIGGER update_customer_files_updated_at
  BEFORE UPDATE ON public.customer_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('dimension-files', 'dimension-files', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('dimension-category-images', 'dimension-category-images', true);

-- Storage policies for dimension-files (private downloads for authenticated)
CREATE POLICY "Authenticated download dimension files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dimension-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin master uploads dimension files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'dimension-files' AND has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin master deletes dimension files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'dimension-files' AND has_role(auth.uid(), 'admin_master'::app_role));

-- Storage policies for category images (public read, admin upload)
CREATE POLICY "Public read category images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dimension-category-images');

CREATE POLICY "Admin master uploads category images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'dimension-category-images' AND has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin master updates category images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'dimension-category-images' AND has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin master deletes category images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'dimension-category-images' AND has_role(auth.uid(), 'admin_master'::app_role));

-- Insert default categories
INSERT INTO public.file_categories (name, description, sort_order) VALUES
  ('Arquivos e Programas', 'Drivers, softwares, utilitários e versões', 1),
  ('Arquivos para Treinamento', 'Apostilas, PDFs, vídeos e exercícios', 2),
  ('Manuais', 'Manuais Dimension e dos componentes', 3),
  ('Macros e Configurações', 'Mach3, pós-processadores e setups', 4),
  ('Outros', 'Documentos diversos', 5);
