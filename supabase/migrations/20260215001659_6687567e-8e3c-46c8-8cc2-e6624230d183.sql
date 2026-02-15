
-- Independent table for equipment registration (admin_master only)
CREATE TABLE public.registered_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  owner_id UUID NOT NULL,
  install_date DATE NOT NULL DEFAULT CURRENT_DATE,
  accessories TEXT[] DEFAULT '{}'::text[],
  image_path TEXT,
  category TEXT NOT NULL DEFAULT 'maquina',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.registered_equipment ENABLE ROW LEVEL SECURITY;

-- Only admin_master can do everything
CREATE POLICY "Admin master manages registered equipment"
ON public.registered_equipment
FOR ALL
USING (has_role(auth.uid(), 'admin_master'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));
