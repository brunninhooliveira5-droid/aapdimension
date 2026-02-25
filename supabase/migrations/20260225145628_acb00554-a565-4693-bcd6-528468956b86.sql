-- Allow admin_master to upload files to cutting-files bucket (for impersonation)
CREATE POLICY "Admin master uploads cutting files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cutting-files'
  AND has_role(auth.uid(), 'admin_master'::app_role)
);