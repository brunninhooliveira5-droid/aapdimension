
-- Add speed_factor column to cutting_material_thicknesses
-- Default 1.0 means no speed reduction (full speed)
ALTER TABLE public.cutting_material_thicknesses
ADD COLUMN speed_factor numeric NOT NULL DEFAULT 1.0;

-- Add a comment explaining the column
COMMENT ON COLUMN public.cutting_material_thicknesses.speed_factor IS 
'Fator multiplicador de velocidade (0-1). Ex: 0.3 = 30% da velocidade base. Quanto mais espesso, menor o fator.';
