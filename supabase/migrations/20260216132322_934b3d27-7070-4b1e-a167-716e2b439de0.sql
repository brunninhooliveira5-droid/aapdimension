
-- Add file_path column to cutting_quotes
ALTER TABLE public.cutting_quotes ADD COLUMN file_path text;

-- Create storage bucket for cutting quote files
INSERT INTO storage.buckets (id, name, public) VALUES ('cutting-files', 'cutting-files', false);

-- RLS: Users can upload their own files
CREATE POLICY "Users upload own cutting files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'cutting-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: Users can read their own files
CREATE POLICY "Users read own cutting files"
ON storage.objects FOR SELECT
USING (bucket_id = 'cutting-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: Users can delete their own files
CREATE POLICY "Users delete own cutting files"
ON storage.objects FOR DELETE
USING (bucket_id = 'cutting-files' AND auth.uid()::text = (storage.foldername(name))[1]);
