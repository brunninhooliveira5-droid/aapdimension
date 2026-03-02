
-- =============================================
-- CONTROLE DE ESTOQUE - DIMENSION CNC
-- =============================================

-- Categorias de estoque
CREATE TABLE public.inventory_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages inventory_categories" ON public.inventory_categories FOR ALL USING (has_role(auth.uid(), 'admin_master'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

-- Unidades de medida
CREATE TABLE public.inventory_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  abbreviation text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages inventory_units" ON public.inventory_units FOR ALL USING (has_role(auth.uid(), 'admin_master'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "Authenticated read inventory_units" ON public.inventory_units FOR SELECT USING (auth.uid() IS NOT NULL);

-- Localizações físicas
CREATE TABLE public.inventory_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages inventory_locations" ON public.inventory_locations FOR ALL USING (has_role(auth.uid(), 'admin_master'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "Authenticated read inventory_locations" ON public.inventory_locations FOR SELECT USING (auth.uid() IS NOT NULL);

-- Fornecedores
CREATE TABLE public.inventory_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text NOT NULL DEFAULT '',
  whatsapp text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  avg_delivery_days integer NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages inventory_suppliers" ON public.inventory_suppliers FOR ALL USING (has_role(auth.uid(), 'admin_master'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "Authenticated read inventory_suppliers" ON public.inventory_suppliers FOR SELECT USING (auth.uid() IS NOT NULL);

-- Itens de estoque (tabela principal)
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  internal_code text NOT NULL DEFAULT '',
  category_id uuid REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  subcategory text NOT NULL DEFAULT '',
  unit_id uuid REFERENCES public.inventory_units(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
  image_url text,
  item_type text NOT NULL DEFAULT 'materia_prima',
  compatible_with text[] NOT NULL DEFAULT '{}',
  current_quantity numeric NOT NULL DEFAULT 0,
  min_quantity numeric NOT NULL DEFAULT 0,
  ideal_quantity numeric NOT NULL DEFAULT 0,
  reserved_quantity numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  last_cost numeric NOT NULL DEFAULT 0,
  avg_cost numeric NOT NULL DEFAULT 0,
  supplier_id uuid REFERENCES public.inventory_suppliers(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages inventory_items" ON public.inventory_items FOR ALL USING (has_role(auth.uid(), 'admin_master'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "Authenticated read inventory_items" ON public.inventory_items FOR SELECT USING (auth.uid() IS NOT NULL);

-- Movimentações de estoque
CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  movement_type text NOT NULL DEFAULT 'entrada',
  quantity numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT '',
  destination text NOT NULL DEFAULT '',
  supplier_id uuid REFERENCES public.inventory_suppliers(id) ON DELETE SET NULL,
  invoice_url text,
  invoice_name text,
  linked_project text NOT NULL DEFAULT '',
  linked_machine text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages inventory_movements" ON public.inventory_movements FOR ALL USING (has_role(auth.uid(), 'admin_master'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "Authenticated read inventory_movements" ON public.inventory_movements FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert inventory_movements" ON public.inventory_movements FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Reservas de produção
CREATE TABLE public.inventory_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'reservado',
  linked_order text NOT NULL DEFAULT '',
  linked_machine text NOT NULL DEFAULT '',
  linked_sheet_id uuid,
  notes text NOT NULL DEFAULT '',
  reserved_by uuid NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages inventory_reservations" ON public.inventory_reservations FOR ALL USING (has_role(auth.uid(), 'admin_master'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "Authenticated read inventory_reservations" ON public.inventory_reservations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert inventory_reservations" ON public.inventory_reservations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Alertas de estoque
CREATE TABLE public.inventory_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  alert_type text NOT NULL DEFAULT 'estoque_baixo',
  message text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages inventory_alerts" ON public.inventory_alerts FOR ALL USING (has_role(auth.uid(), 'admin_master'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "Authenticated read inventory_alerts" ON public.inventory_alerts FOR SELECT USING (auth.uid() IS NOT NULL);

-- Sessões de inventário
CREATE TABLE public.inventory_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'em_andamento',
  started_by uuid NOT NULL,
  finished_at timestamptz,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages inventory_sessions" ON public.inventory_sessions FOR ALL USING (has_role(auth.uid(), 'admin_master'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

-- Itens de inventário (conferência)
CREATE TABLE public.inventory_session_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.inventory_sessions(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  expected_quantity numeric NOT NULL DEFAULT 0,
  actual_quantity numeric,
  difference numeric GENERATED ALWAYS AS (COALESCE(actual_quantity, 0) - expected_quantity) STORED,
  checked_by uuid,
  checked_at timestamptz,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_session_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages inventory_session_items" ON public.inventory_session_items FOR ALL USING (has_role(auth.uid(), 'admin_master'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

-- Configurações globais de estoque
CREATE TABLE public.inventory_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  allow_negative_stock boolean NOT NULL DEFAULT false,
  global_min_alert integer NOT NULL DEFAULT 5,
  consumption_period_days integer NOT NULL DEFAULT 90,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.inventory_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manages inventory_settings" ON public.inventory_settings FOR ALL USING (has_role(auth.uid(), 'admin_master'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "Authenticated read inventory_settings" ON public.inventory_settings FOR SELECT USING (auth.uid() IS NOT NULL);

-- Inserir configuração padrão
INSERT INTO public.inventory_settings (allow_negative_stock, global_min_alert, consumption_period_days) VALUES (false, 5, 90);

-- Inserir unidades padrão
INSERT INTO public.inventory_units (name, abbreviation) VALUES 
  ('Unidade', 'un'),
  ('Metro', 'm'),
  ('Quilograma', 'kg'),
  ('Kit', 'kit'),
  ('Litro', 'L'),
  ('Peça', 'pç');
