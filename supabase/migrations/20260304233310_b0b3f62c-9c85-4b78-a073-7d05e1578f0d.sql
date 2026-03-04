
ALTER TABLE public.inventory_settings ADD COLUMN IF NOT EXISTS compatible_options text[] DEFAULT ARRAY['Orion', 'Falcon', 'Quantum', 'Laser', 'Geral'];
ALTER TABLE public.pc_inventory_settings ADD COLUMN IF NOT EXISTS compatible_options text[] DEFAULT ARRAY['Orion', 'Falcon', 'Quantum', 'Laser', 'Geral'];

-- Update existing rows
UPDATE public.inventory_settings SET compatible_options = ARRAY['Orion', 'Falcon', 'Quantum', 'Laser', 'Geral'] WHERE compatible_options IS NULL;
UPDATE public.pc_inventory_settings SET compatible_options = ARRAY['Orion', 'Falcon', 'Quantum', 'Laser', 'Geral'] WHERE compatible_options IS NULL;
