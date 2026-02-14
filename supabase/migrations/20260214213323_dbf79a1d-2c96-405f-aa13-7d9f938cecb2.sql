-- Add payment_date to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_date date;

-- Create invoice_files table for PDF boletos
CREATE TABLE public.invoice_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_files ENABLE ROW LEVEL SECURITY;

-- Admin master can do everything
CREATE POLICY "Admin master manages invoice files"
ON public.invoice_files FOR ALL
USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Owner can read their invoice files
CREATE POLICY "Owner reads invoice files"
ON public.invoice_files FOR SELECT
USING (EXISTS (
  SELECT 1 FROM invoices WHERE invoices.id = invoice_files.invoice_id AND invoices.user_id = auth.uid()
));

-- Admin master can insert/update invoices
CREATE POLICY "Admin master inserts invoices"
ON public.invoices FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin master updates invoices"
ON public.invoices FOR UPDATE
USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin master deletes invoices"
ON public.invoices FOR DELETE
USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Create storage bucket for invoice files
INSERT INTO storage.buckets (id, name, public) VALUES ('invoice-files', 'invoice-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for invoice files
CREATE POLICY "Admin uploads invoice files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'invoice-files' AND has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin manages invoice files"
ON storage.objects FOR DELETE
USING (bucket_id = 'invoice-files' AND has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Authenticated users read invoice files"
ON storage.objects FOR SELECT
USING (bucket_id = 'invoice-files' AND auth.role() = 'authenticated');
