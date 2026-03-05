
-- Calibration logs for Dimension module
CREATE TABLE public.inventory_calibration_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL,
  old_quantity NUMERIC NOT NULL DEFAULT 0,
  new_quantity NUMERIC NOT NULL DEFAULT 0,
  difference NUMERIC NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  calibrated_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_calibration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read calibration logs"
  ON public.inventory_calibration_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert calibration logs"
  ON public.inventory_calibration_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Calibration logs for Production Control module
CREATE TABLE public.pc_inventory_calibration_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL,
  old_quantity NUMERIC NOT NULL DEFAULT 0,
  new_quantity NUMERIC NOT NULL DEFAULT 0,
  difference NUMERIC NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  calibrated_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pc_inventory_calibration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read pc calibration logs"
  ON public.pc_inventory_calibration_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert pc calibration logs"
  ON public.pc_inventory_calibration_logs FOR INSERT TO authenticated WITH CHECK (true);
