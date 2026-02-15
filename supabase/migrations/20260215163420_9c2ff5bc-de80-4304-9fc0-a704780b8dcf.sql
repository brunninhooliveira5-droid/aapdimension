
ALTER TABLE public.cutting_materials ADD COLUMN price_adjustment numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.cutting_materials.price_adjustment IS 'Percentage adjustment on suggested price per material complexity';
