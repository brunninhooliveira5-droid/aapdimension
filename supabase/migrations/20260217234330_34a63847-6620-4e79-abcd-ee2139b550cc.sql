ALTER TABLE public.technical_bulletins
ADD COLUMN target_roles text[] DEFAULT '{}'::text[];