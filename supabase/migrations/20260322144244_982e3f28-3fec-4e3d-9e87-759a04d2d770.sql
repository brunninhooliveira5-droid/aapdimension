
-- Create storage bucket for checklist PDF assets (logo, watermark images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('checklist-assets', 'checklist-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload checklist assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'checklist-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update own checklist assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'checklist-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own checklist assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'checklist-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access (for PDF generation)
CREATE POLICY "Public read checklist assets"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'checklist-assets');
