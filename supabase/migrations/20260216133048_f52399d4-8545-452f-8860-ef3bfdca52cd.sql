
-- Add material cost tracking columns to cutting_quotes
ALTER TABLE public.cutting_quotes ADD COLUMN material_cost numeric NOT NULL DEFAULT 0;
ALTER TABLE public.cutting_quotes ADD COLUMN material_owner text NOT NULL DEFAULT 'cliente';
ALTER TABLE public.cutting_quotes ADD COLUMN total_price numeric NOT NULL DEFAULT 0;
