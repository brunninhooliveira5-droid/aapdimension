
CREATE TABLE public.parts_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.parts_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone reads parts stores"
ON public.parts_stores FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin master inserts parts stores"
ON public.parts_stores FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin master updates parts stores"
ON public.parts_stores FOR UPDATE
USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin master deletes parts stores"
ON public.parts_stores FOR DELETE
USING (has_role(auth.uid(), 'admin_master'::app_role));
