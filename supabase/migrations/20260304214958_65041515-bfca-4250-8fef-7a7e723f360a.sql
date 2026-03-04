
-- Allow client_admin to upload to dimension-production-images
DROP POLICY IF EXISTS "Admin master uploads dimension-production-images" ON storage.objects;
CREATE POLICY "Admin or client_admin uploads dimension-production-images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'dimension-production-images'
  AND (
    has_role(auth.uid(), 'admin_master'::app_role)
    OR public.is_client_admin(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admin master updates dimension-production-images" ON storage.objects;
CREATE POLICY "Admin or client_admin updates dimension-production-images" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'dimension-production-images'
  AND (
    has_role(auth.uid(), 'admin_master'::app_role)
    OR public.is_client_admin(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admin master deletes dimension-production-images" ON storage.objects;
CREATE POLICY "Admin or client_admin deletes dimension-production-images" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'dimension-production-images'
  AND (
    has_role(auth.uid(), 'admin_master'::app_role)
    OR public.is_client_admin(auth.uid())
  )
);
