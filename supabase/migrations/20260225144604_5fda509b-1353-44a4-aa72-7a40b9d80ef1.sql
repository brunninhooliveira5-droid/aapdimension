-- Allow admin_master to read all files in cutting-files bucket
CREATE POLICY "Admin master reads all cutting files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'cutting-files'
  AND has_role(auth.uid(), 'admin_master'::app_role)
);
