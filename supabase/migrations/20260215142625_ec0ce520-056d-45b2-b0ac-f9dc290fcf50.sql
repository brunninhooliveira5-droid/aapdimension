
-- Table for technical bulletins
CREATE TABLE public.technical_bulletins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  target_models TEXT[] DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.technical_bulletins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages bulletins"
  ON public.technical_bulletins FOR ALL
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Authenticated users read active bulletins"
  ON public.technical_bulletins FOR SELECT
  USING (auth.uid() IS NOT NULL AND active = true);

CREATE TRIGGER update_technical_bulletins_updated_at
  BEFORE UPDATE ON public.technical_bulletins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Table for read tracking
CREATE TABLE public.bulletin_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulletin_id UUID NOT NULL REFERENCES public.technical_bulletins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bulletin_id, user_id)
);

ALTER TABLE public.bulletin_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own reads"
  ON public.bulletin_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read own reads"
  ON public.bulletin_reads FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admin master reads all"
  ON public.bulletin_reads FOR SELECT
  USING (has_role(auth.uid(), 'admin_master'::app_role));
