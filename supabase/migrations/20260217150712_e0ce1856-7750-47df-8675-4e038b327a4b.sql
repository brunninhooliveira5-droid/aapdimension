
-- 1) Add 'servico' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'servico';

-- 2) Add audit columns to cutting_quotes for tracking pricing source
ALTER TABLE public.cutting_quotes
  ADD COLUMN IF NOT EXISTS use_master_pricing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS use_dimension_materials boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pdf_url text;

-- 3) Create index for efficient "Clientes" tab queries (admin filtering by user role)
CREATE INDEX IF NOT EXISTS idx_cutting_quotes_user_id_created ON public.cutting_quotes (user_id, created_at DESC);
