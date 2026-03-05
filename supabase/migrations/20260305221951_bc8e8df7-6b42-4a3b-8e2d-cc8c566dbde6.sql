
ALTER TABLE public.production_bom_items
  ADD COLUMN deducted_quantity NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN shortage_quantity NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.pc_production_bom_items
  ADD COLUMN deducted_quantity NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN shortage_quantity NUMERIC NOT NULL DEFAULT 0;
