
-- Tabela principal: modelos de máquinas para propostas
CREATE TABLE public.proposal_machine_models (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text DEFAULT ''::text,
  description text NOT NULL DEFAULT ''::text,
  tech_specs text NOT NULL DEFAULT ''::text,
  area_x numeric DEFAULT NULL,
  area_y numeric DEFAULT NULL,
  area_z numeric DEFAULT NULL,
  base_price numeric DEFAULT NULL,
  delivery_days integer DEFAULT NULL,
  image_url text DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_machine_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages proposal machine models"
  ON public.proposal_machine_models FOR ALL
  USING (has_role(auth.uid(), 'admin_master'))
  WITH CHECK (has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Authenticated users read active proposal machine models"
  ON public.proposal_machine_models FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- Itens inclusos por modelo
CREATE TABLE public.proposal_machine_included_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id uuid NOT NULL REFERENCES public.proposal_machine_models(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_machine_included_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages included items"
  ON public.proposal_machine_included_items FOR ALL
  USING (has_role(auth.uid(), 'admin_master'))
  WITH CHECK (has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Authenticated users read included items"
  ON public.proposal_machine_included_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Itens opcionais por modelo
CREATE TABLE public.proposal_machine_optional_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id uuid NOT NULL REFERENCES public.proposal_machine_models(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric DEFAULT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_machine_optional_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages optional items"
  ON public.proposal_machine_optional_items FOR ALL
  USING (has_role(auth.uid(), 'admin_master'))
  WITH CHECK (has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Authenticated users read optional items"
  ON public.proposal_machine_optional_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Propostas geradas
CREATE TABLE public.client_proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id uuid REFERENCES public.proposal_machine_models(id),
  client_name text NOT NULL DEFAULT ''::text,
  client_company text DEFAULT ''::text,
  client_email text DEFAULT ''::text,
  client_phone text DEFAULT ''::text,
  client_document text DEFAULT ''::text,
  model_name text NOT NULL DEFAULT ''::text,
  description text NOT NULL DEFAULT ''::text,
  tech_specs text NOT NULL DEFAULT ''::text,
  included_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  optional_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  base_price numeric DEFAULT 0,
  optional_total numeric DEFAULT 0,
  total_price numeric DEFAULT 0,
  delivery_days integer DEFAULT NULL,
  notes text DEFAULT ''::text,
  payment_conditions text DEFAULT ''::text,
  validity_days integer DEFAULT 15,
  status text NOT NULL DEFAULT 'rascunho'::text,
  pdf_url text DEFAULT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.client_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages client proposals"
  ON public.client_proposals FOR ALL
  USING (has_role(auth.uid(), 'admin_master'))
  WITH CHECK (has_role(auth.uid(), 'admin_master'));

-- Triggers para updated_at
CREATE TRIGGER update_proposal_machine_models_updated_at
  BEFORE UPDATE ON public.proposal_machine_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_client_proposals_updated_at
  BEFORE UPDATE ON public.client_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
