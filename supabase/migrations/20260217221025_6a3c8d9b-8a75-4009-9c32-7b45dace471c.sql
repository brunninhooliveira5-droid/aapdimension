
CREATE POLICY "Allow authenticated users to upload machine model images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'quote-logos'
  AND (storage.foldername(name))[1] = 'machine-models'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to update machine model images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'quote-logos'
  AND (storage.foldername(name))[1] = 'machine-models'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to delete machine model images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'quote-logos'
  AND (storage.foldername(name))[1] = 'machine-models'
  AND auth.role() = 'authenticated'
);
