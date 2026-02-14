
-- Create maintenance_reports table
CREATE TABLE public.maintenance_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_id UUID NOT NULL REFERENCES public.maintenances(id) ON DELETE CASCADE,
  report TEXT NOT NULL DEFAULT '',
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_reports ENABLE ROW LEVEL SECURITY;

-- Admin master full access
CREATE POLICY "Admin master manages reports"
ON public.maintenance_reports
FOR ALL
USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Owner can read reports for their maintenances
CREATE POLICY "Owner reads reports"
ON public.maintenance_reports
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM maintenances WHERE maintenances.id = maintenance_reports.maintenance_id AND maintenances.user_id = auth.uid()
));

-- Owner can insert reports for their maintenances
CREATE POLICY "Owner inserts reports"
ON public.maintenance_reports
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM maintenances WHERE maintenances.id = maintenance_reports.maintenance_id AND maintenances.user_id = auth.uid()
));
