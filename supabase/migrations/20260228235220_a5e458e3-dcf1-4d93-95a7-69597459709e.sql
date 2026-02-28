
-- Tabela de metas do portal Dimension
CREATE TABLE public.dimension_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  sector text NULL,
  responsible text NOT NULL DEFAULT '',
  goal_type text NOT NULL DEFAULT 'setor', -- 'setor' | 'individual'
  period_type text NOT NULL DEFAULT 'mensal', -- 'mensal' | 'trimestral' | 'anual'
  period_start date NOT NULL DEFAULT CURRENT_DATE,
  period_end date NOT NULL DEFAULT (CURRENT_DATE + interval '30 days'),
  target_value numeric NOT NULL DEFAULT 0,
  current_value numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'unidades', -- ex: 'unidades', 'peças', '%', 'R$'
  linked_task_category text NULL, -- categoria de tarefas para vínculo automático
  linked_task_sector text NULL, -- setor de tarefas para vínculo automático
  status text NOT NULL DEFAULT 'em_andamento', -- 'em_andamento' | 'concluida' | 'cancelada' | 'atrasada'
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dimension_goals ENABLE ROW LEVEL SECURITY;

-- RLS: apenas admin_master
CREATE POLICY "Admin master manages dimension_goals"
  ON public.dimension_goals
  FOR ALL
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

-- Trigger updated_at
CREATE TRIGGER update_dimension_goals_updated_at
  BEFORE UPDATE ON public.dimension_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Tabela de histórico de snapshots de metas
CREATE TABLE public.dimension_goal_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id uuid NOT NULL REFERENCES public.dimension_goals(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  value numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.dimension_goal_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages dimension_goal_history"
  ON public.dimension_goal_history
  FOR ALL
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));
