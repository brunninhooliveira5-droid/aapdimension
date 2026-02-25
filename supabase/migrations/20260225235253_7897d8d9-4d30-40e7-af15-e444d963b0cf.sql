
-- Table for production card settings
CREATE TABLE public.dimension_production_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  image_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by_user_id UUID
);

ALTER TABLE public.dimension_production_cards ENABLE ROW LEVEL SECURITY;

-- Admin master full access
CREATE POLICY "Admin master manages dimension_production_cards"
  ON public.dimension_production_cards FOR ALL
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

-- Authenticated users can read
CREATE POLICY "Authenticated users read dimension_production_cards"
  ON public.dimension_production_cards FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Seed default cards
INSERT INTO public.dimension_production_cards (key, title) VALUES
  ('cnc', 'CNC'),
  ('cnc_laser', 'CNC Laser'),
  ('torno', 'Torno'),
  ('impressao_3d', 'Impressão 3D');

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('dimension-production-images', 'dimension-production-images', true);

-- Public read
CREATE POLICY "Public read dimension-production-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dimension-production-images');

-- Admin master upload
CREATE POLICY "Admin master uploads dimension-production-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'dimension-production-images' AND has_role(auth.uid(), 'admin_master'::app_role));

-- Admin master update
CREATE POLICY "Admin master updates dimension-production-images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'dimension-production-images' AND has_role(auth.uid(), 'admin_master'::app_role));

-- Admin master delete
CREATE POLICY "Admin master deletes dimension-production-images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'dimension-production-images' AND has_role(auth.uid(), 'admin_master'::app_role));
