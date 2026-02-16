
-- Create training_sectors table
CREATE TABLE public.training_sectors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.training_sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages training sectors" ON public.training_sectors FOR ALL USING (has_role(auth.uid(), 'admin_master'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "Authenticated users read active sectors" ON public.training_sectors FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- Add training_sector_id to customer_files
ALTER TABLE public.customer_files ADD COLUMN training_sector_id UUID REFERENCES public.training_sectors(id) ON DELETE RESTRICT;
