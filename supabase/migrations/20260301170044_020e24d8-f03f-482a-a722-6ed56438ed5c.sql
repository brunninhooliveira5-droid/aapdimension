
-- Tabela de modelos de rotinas recorrentes
CREATE TABLE public.dimension_routines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  tasks_template jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dimension_routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages dimension_routines"
ON public.dimension_routines FOR ALL
USING (has_role(auth.uid(), 'admin_master'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE TRIGGER update_dimension_routines_updated_at
BEFORE UPDATE ON public.dimension_routines
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Tabela de ativações (histórico)
CREATE TABLE public.dimension_routine_activations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_id uuid NOT NULL REFERENCES public.dimension_routines(id) ON DELETE CASCADE,
  context_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  tasks_created integer NOT NULL DEFAULT 0,
  activated_by uuid NOT NULL,
  activated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dimension_routine_activations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages dimension_routine_activations"
ON public.dimension_routine_activations FOR ALL
USING (has_role(auth.uid(), 'admin_master'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));
