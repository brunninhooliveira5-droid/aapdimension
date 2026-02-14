
-- Add name column to machines
ALTER TABLE public.machines ADD COLUMN name text NOT NULL DEFAULT '';

-- Create storage bucket for machine files
INSERT INTO storage.buckets (id, name, public) VALUES ('machine-files', 'machine-files', true);

-- Create table to track machine file uploads
CREATE TABLE public.machine_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.machine_files ENABLE ROW LEVEL SECURITY;

-- Admin master can do everything with machine files
CREATE POLICY "Admin master manages machine files"
  ON public.machine_files FOR ALL
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Owners can view files for their machines
CREATE POLICY "Owner reads machine files"
  ON public.machine_files FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.machines WHERE machines.id = machine_files.machine_id AND machines.owner_id = auth.uid()
  ));

-- Owners can upload files for their machines
CREATE POLICY "Owner uploads machine files"
  ON public.machine_files FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.machines WHERE machines.id = machine_files.machine_id AND machines.owner_id = auth.uid()
  ));

-- Storage policies for machine-files bucket
CREATE POLICY "Authenticated users can upload machine files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'machine-files' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view machine files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'machine-files');

CREATE POLICY "Admin can delete machine files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'machine-files' AND has_role(auth.uid(), 'admin_master'::app_role));

-- Allow admin master to update machines
CREATE POLICY "Admin master updates machines"
  ON public.machines FOR UPDATE
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Allow admin master to delete machines
CREATE POLICY "Admin master deletes machines"
  ON public.machines FOR DELETE
  USING (has_role(auth.uid(), 'admin_master'::app_role));
