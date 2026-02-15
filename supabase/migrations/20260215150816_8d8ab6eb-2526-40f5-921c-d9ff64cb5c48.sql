ALTER TABLE public.dimension_equipment ADD COLUMN status text NOT NULL DEFAULT 'ativo';
-- Possible values: 'ativo', 'fora_de_linha'