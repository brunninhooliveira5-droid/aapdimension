
-- Add Dimension preset tracking columns
ALTER TABLE public.cutting_material_thicknesses
ADD COLUMN is_dimension_preset boolean NOT NULL DEFAULT false,
ADD COLUMN dimension_default_factor numeric NULL;

COMMENT ON COLUMN public.cutting_material_thicknesses.is_dimension_preset IS 
'Indica se este fator de velocidade é um preset recomendado pela Dimension CNC.';

COMMENT ON COLUMN public.cutting_material_thicknesses.dimension_default_factor IS 
'Valor original do fator preset Dimension, para permitir restauração. NULL se não for preset.';
