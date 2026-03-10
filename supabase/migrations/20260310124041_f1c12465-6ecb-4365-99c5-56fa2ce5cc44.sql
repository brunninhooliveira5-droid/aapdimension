ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_offset_x integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_offset_y integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_zoom integer DEFAULT 100;