
-- Allow users to upload files to their own invoice folders in invoice-files bucket
CREATE POLICY "Users upload own invoice files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'invoice-files'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.invoices
    WHERE invoices.id::text = (storage.foldername(name))[1]
    AND invoices.user_id = auth.uid()
  )
);

-- Allow users to INSERT into invoice_files table for their own invoices
CREATE POLICY "Users insert own invoice files"
ON public.invoice_files FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices
    WHERE invoices.id = invoice_files.invoice_id
    AND invoices.user_id = auth.uid()
  )
);
