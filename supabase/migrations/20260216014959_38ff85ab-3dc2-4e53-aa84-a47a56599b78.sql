
-- Add sheet size and unit price columns to cutting_material_thicknesses
ALTER TABLE public.cutting_material_thicknesses 
  ADD COLUMN sheet_width numeric NOT NULL DEFAULT 0,
  ADD COLUMN sheet_height numeric NOT NULL DEFAULT 0,
  ADD COLUMN unit_price numeric NOT NULL DEFAULT 0;
