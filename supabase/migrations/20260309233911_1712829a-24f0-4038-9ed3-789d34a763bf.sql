
-- Add signature_url to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- Add client_signature_image_url to technical_reports (stored signature image for each report)
ALTER TABLE public.technical_reports ADD COLUMN IF NOT EXISTS client_signature_image_url TEXT;

-- Create storage bucket for user signatures
INSERT INTO storage.buckets (id, name, public) VALUES ('user-signatures', 'user-signatures', true) ON CONFLICT (id) DO NOTHING;

-- RLS for user-signatures bucket
CREATE POLICY "Users can upload own signature" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'user-signatures' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update own signature" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'user-signatures' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own signature" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'user-signatures' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Anyone can read signatures" ON storage.objects FOR SELECT TO public USING (bucket_id = 'user-signatures');
