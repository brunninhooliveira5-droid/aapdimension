
-- ══════════════════════════════════════════════════════
-- OVERRIDES DE PASSADAS E VELOCIDADE + RASTREABILIDADE
-- ══════════════════════════════════════════════════════

-- 1) Colunas de rastreabilidade no cutting_quotes
ALTER TABLE public.cutting_quotes
ADD COLUMN passes_final integer NOT NULL DEFAULT 1,
ADD COLUMN passes_origin text NOT NULL DEFAULT 'default',
ADD COLUMN base_speed_final_mmmin numeric NOT NULL DEFAULT 0,
ADD COLUMN base_speed_origin text NOT NULL DEFAULT 'simulator',
ADD COLUMN speed_factor_used numeric NOT NULL DEFAULT 1.0,
ADD COLUMN effective_speed_mmmin numeric NOT NULL DEFAULT 0,
ADD COLUMN effective_cut_length_m numeric NOT NULL DEFAULT 0;

-- 2) Configurações admin de limites de override no pricing_settings
ALTER TABLE public.pricing_settings
ADD COLUMN min_speed_override_mmmin numeric NOT NULL DEFAULT 500,
ADD COLUMN max_speed_override_mmmin numeric NOT NULL DEFAULT 12000,
ADD COLUMN max_passes_override integer NOT NULL DEFAULT 10,
ADD COLUMN allow_user_override_speed boolean NOT NULL DEFAULT true,
ADD COLUMN allow_user_override_passes boolean NOT NULL DEFAULT true;
