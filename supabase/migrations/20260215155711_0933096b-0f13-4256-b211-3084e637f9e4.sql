
CREATE TABLE public.cutting_quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  material text NOT NULL,
  thickness text NOT NULL,
  machine_id uuid REFERENCES public.machines(id),
  machine_name text NOT NULL DEFAULT '',
  path_length_mm numeric NOT NULL DEFAULT 0,
  path_length_m numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  estimated_time_min numeric NOT NULL DEFAULT 0,
  estimated_cost numeric NOT NULL DEFAULT 0,
  min_recommended numeric NOT NULL DEFAULT 0,
  suggested_sale numeric NOT NULL DEFAULT 0,
  cost_per_minute numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cutting_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own quotes"
ON public.cutting_quotes FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users insert own quotes"
ON public.cutting_quotes FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own quotes"
ON public.cutting_quotes FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "Admin master reads all quotes"
ON public.cutting_quotes FOR SELECT
USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin master deletes all quotes"
ON public.cutting_quotes FOR DELETE
USING (has_role(auth.uid(), 'admin_master'::app_role));
