ALTER TABLE public.nesting_items 
ADD COLUMN IF NOT EXISTS path_data text DEFAULT '',
ADD COLUMN IF NOT EXISTS polygon_points text DEFAULT '[]',
ADD COLUMN IF NOT EXISTS sheet_index integer DEFAULT 0;