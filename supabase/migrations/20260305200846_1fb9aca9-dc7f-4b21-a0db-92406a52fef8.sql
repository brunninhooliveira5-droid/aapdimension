
-- Add inventory_item_id to production_bom_items
ALTER TABLE public.production_bom_items ADD COLUMN inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL;

-- Add inventory_item_id to pc_production_bom_items
ALTER TABLE public.pc_production_bom_items ADD COLUMN inventory_item_id uuid REFERENCES public.pc_inventory_items(id) ON DELETE SET NULL;

-- Add activated_at to production_sheets
ALTER TABLE public.production_sheets ADD COLUMN activated_at timestamptz DEFAULT NULL;

-- Add activated_at to pc_production_sheets
ALTER TABLE public.pc_production_sheets ADD COLUMN activated_at timestamptz DEFAULT NULL;
