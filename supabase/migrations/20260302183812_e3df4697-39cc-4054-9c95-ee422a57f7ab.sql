
-- ===== PC INVENTORY CATEGORIES =====
CREATE TABLE public.pc_inventory_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES public.pc_inventory_categories(id),
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.pc_inventory_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read pc_inventory_categories" ON public.pc_inventory_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage pc_inventory_categories" ON public.pc_inventory_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_master')) WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

-- ===== PC INVENTORY UNITS =====
CREATE TABLE public.pc_inventory_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  abbreviation text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.pc_inventory_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read pc_inventory_units" ON public.pc_inventory_units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage pc_inventory_units" ON public.pc_inventory_units FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_master')) WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

-- ===== PC INVENTORY LOCATIONS =====
CREATE TABLE public.pc_inventory_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.pc_inventory_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read pc_inventory_locations" ON public.pc_inventory_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage pc_inventory_locations" ON public.pc_inventory_locations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_master')) WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

-- ===== PC INVENTORY SUPPLIERS =====
CREATE TABLE public.pc_inventory_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text DEFAULT '',
  whatsapp text DEFAULT '',
  email text DEFAULT '',
  avg_delivery_days int DEFAULT 0,
  notes text DEFAULT '',
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.pc_inventory_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read pc_inventory_suppliers" ON public.pc_inventory_suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert pc_inventory_suppliers" ON public.pc_inventory_suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin can manage pc_inventory_suppliers" ON public.pc_inventory_suppliers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_master')) WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

-- ===== PC INVENTORY ITEMS =====
CREATE TABLE public.pc_inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  internal_code text DEFAULT '',
  subcategory text DEFAULT '',
  item_type text DEFAULT 'materia_prima',
  compatible_with text[] DEFAULT '{}',
  min_quantity numeric DEFAULT 0,
  ideal_quantity numeric DEFAULT 0,
  current_quantity numeric DEFAULT 0,
  reserved_quantity numeric DEFAULT 0,
  unit_cost numeric DEFAULT 0,
  avg_cost numeric DEFAULT 0,
  last_cost numeric DEFAULT 0,
  image_url text,
  is_active boolean DEFAULT true,
  category_id uuid REFERENCES public.pc_inventory_categories(id),
  unit_id uuid REFERENCES public.pc_inventory_units(id),
  location_id uuid REFERENCES public.pc_inventory_locations(id),
  supplier_id uuid REFERENCES public.pc_inventory_suppliers(id),
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.pc_inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read pc_inventory_items" ON public.pc_inventory_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert pc_inventory_items" ON public.pc_inventory_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update pc_inventory_items" ON public.pc_inventory_items FOR UPDATE TO authenticated USING (true);

-- ===== PC INVENTORY MOVEMENTS =====
CREATE TABLE public.pc_inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.pc_inventory_items(id),
  movement_type text DEFAULT 'entrada',
  quantity numeric DEFAULT 0,
  unit_cost numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  reason text DEFAULT '',
  notes text DEFAULT '',
  destination text DEFAULT '',
  linked_project text DEFAULT '',
  linked_machine text DEFAULT '',
  supplier_id uuid REFERENCES public.pc_inventory_suppliers(id),
  invoice_url text,
  invoice_name text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.pc_inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read pc_inventory_movements" ON public.pc_inventory_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert pc_inventory_movements" ON public.pc_inventory_movements FOR INSERT TO authenticated WITH CHECK (true);

-- ===== PC INVENTORY RESERVATIONS =====
CREATE TABLE public.pc_inventory_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.pc_inventory_items(id),
  quantity numeric DEFAULT 0,
  linked_order text DEFAULT '',
  linked_machine text DEFAULT '',
  linked_sheet_id uuid,
  notes text DEFAULT '',
  status text DEFAULT 'reservado',
  reserved_by uuid NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.pc_inventory_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read pc_inventory_reservations" ON public.pc_inventory_reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert pc_inventory_reservations" ON public.pc_inventory_reservations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update pc_inventory_reservations" ON public.pc_inventory_reservations FOR UPDATE TO authenticated USING (true);

-- ===== PC INVENTORY ALERTS =====
CREATE TABLE public.pc_inventory_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.pc_inventory_items(id),
  alert_type text DEFAULT 'estoque_baixo',
  message text DEFAULT '',
  is_read boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.pc_inventory_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read pc_inventory_alerts" ON public.pc_inventory_alerts FOR SELECT TO authenticated USING (true);

-- ===== PC INVENTORY SETTINGS =====
CREATE TABLE public.pc_inventory_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  allow_negative_stock boolean DEFAULT false,
  global_min_alert int DEFAULT 5,
  consumption_period_days int DEFAULT 90,
  updated_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.pc_inventory_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read pc_inventory_settings" ON public.pc_inventory_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage pc_inventory_settings" ON public.pc_inventory_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_master')) WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

-- Insert default settings
INSERT INTO public.pc_inventory_settings (allow_negative_stock, global_min_alert, consumption_period_days) VALUES (false, 5, 90);

-- ===== PC INVENTORY SESSIONS =====
CREATE TABLE public.pc_inventory_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  status text DEFAULT 'em_andamento',
  started_by uuid NOT NULL,
  finished_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.pc_inventory_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read pc_inventory_sessions" ON public.pc_inventory_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert pc_inventory_sessions" ON public.pc_inventory_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update pc_inventory_sessions" ON public.pc_inventory_sessions FOR UPDATE TO authenticated USING (true);

-- ===== PC INVENTORY SESSION ITEMS =====
CREATE TABLE public.pc_inventory_session_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.pc_inventory_sessions(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.pc_inventory_items(id),
  expected_quantity numeric DEFAULT 0,
  actual_quantity numeric,
  difference numeric GENERATED ALWAYS AS (COALESCE(actual_quantity, 0) - expected_quantity) STORED,
  notes text DEFAULT '',
  checked_by uuid,
  checked_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.pc_inventory_session_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read pc_inventory_session_items" ON public.pc_inventory_session_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert pc_inventory_session_items" ON public.pc_inventory_session_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update pc_inventory_session_items" ON public.pc_inventory_session_items FOR UPDATE TO authenticated USING (true);
