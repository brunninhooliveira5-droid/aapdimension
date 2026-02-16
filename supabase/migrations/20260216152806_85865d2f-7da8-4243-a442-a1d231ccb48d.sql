
-- Add service value columns to cutting_quotes
ALTER TABLE public.cutting_quotes
ADD COLUMN service_value numeric NOT NULL DEFAULT 0,
ADD COLUMN service_value_included boolean NOT NULL DEFAULT false;

-- Add PDF config columns for service value
ALTER TABLE public.pdf_quote_settings
ADD COLUMN show_service_value boolean DEFAULT true,
ADD COLUMN label_service_value text DEFAULT 'Valor de Serviço';
