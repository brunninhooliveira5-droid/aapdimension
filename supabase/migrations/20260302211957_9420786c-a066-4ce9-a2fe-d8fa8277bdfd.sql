
-- Fix: use ficha_id instead of sheet_id

-- 13. pc_production_bom_items: scope via parent sheet (ficha_id)
DROP POLICY IF EXISTS "Auth users can view pc_production_bom_items" ON public.pc_production_bom_items;
DROP POLICY IF EXISTS "Auth users can insert pc_production_bom_items" ON public.pc_production_bom_items;
DROP POLICY IF EXISTS "Auth users can update pc_production_bom_items" ON public.pc_production_bom_items;
DROP POLICY IF EXISTS "Auth users can delete pc_production_bom_items" ON public.pc_production_bom_items;

CREATE POLICY "Users view own pc_production_bom_items" ON public.pc_production_bom_items FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.pc_production_sheets s WHERE s.id = ficha_id AND s.created_by = auth.uid()));
CREATE POLICY "Users insert own pc_production_bom_items" ON public.pc_production_bom_items FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.pc_production_sheets s WHERE s.id = ficha_id AND s.created_by = auth.uid()));
CREATE POLICY "Users update own pc_production_bom_items" ON public.pc_production_bom_items FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.pc_production_sheets s WHERE s.id = ficha_id AND s.created_by = auth.uid()));
CREATE POLICY "Users delete own pc_production_bom_items" ON public.pc_production_bom_items FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.pc_production_sheets s WHERE s.id = ficha_id AND s.created_by = auth.uid()));

-- 14. pc_production_process_steps: scope via parent sheet (ficha_id)
DROP POLICY IF EXISTS "Auth users can view pc_production_process_steps" ON public.pc_production_process_steps;
DROP POLICY IF EXISTS "Auth users can insert pc_production_process_steps" ON public.pc_production_process_steps;
DROP POLICY IF EXISTS "Auth users can update pc_production_process_steps" ON public.pc_production_process_steps;
DROP POLICY IF EXISTS "Auth users can delete pc_production_process_steps" ON public.pc_production_process_steps;

CREATE POLICY "Users view own pc_production_process_steps" ON public.pc_production_process_steps FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.pc_production_sheets s WHERE s.id = ficha_id AND s.created_by = auth.uid()));
CREATE POLICY "Users insert own pc_production_process_steps" ON public.pc_production_process_steps FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.pc_production_sheets s WHERE s.id = ficha_id AND s.created_by = auth.uid()));
CREATE POLICY "Users update own pc_production_process_steps" ON public.pc_production_process_steps FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.pc_production_sheets s WHERE s.id = ficha_id AND s.created_by = auth.uid()));
CREATE POLICY "Users delete own pc_production_process_steps" ON public.pc_production_process_steps FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.pc_production_sheets s WHERE s.id = ficha_id AND s.created_by = auth.uid()));

-- 15-23: These were already applied in the previous partial migration
-- Re-apply only the ones that didn't run (15+)
DROP POLICY IF EXISTS "Auth users can view pc_production_bom_templates" ON public.pc_production_bom_templates;
DROP POLICY IF EXISTS "Auth users can insert pc_production_bom_templates" ON public.pc_production_bom_templates;
DROP POLICY IF EXISTS "Auth users can update pc_production_bom_templates" ON public.pc_production_bom_templates;
DROP POLICY IF EXISTS "Auth users can delete pc_production_bom_templates" ON public.pc_production_bom_templates;

CREATE POLICY "Users view own pc_production_bom_templates" ON public.pc_production_bom_templates FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users insert own pc_production_bom_templates" ON public.pc_production_bom_templates FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own pc_production_bom_templates" ON public.pc_production_bom_templates FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users delete own pc_production_bom_templates" ON public.pc_production_bom_templates FOR DELETE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Auth users can view pc_production_process_templates" ON public.pc_production_process_templates;
DROP POLICY IF EXISTS "Auth users can insert pc_production_process_templates" ON public.pc_production_process_templates;
DROP POLICY IF EXISTS "Auth users can update pc_production_process_templates" ON public.pc_production_process_templates;
DROP POLICY IF EXISTS "Auth users can delete pc_production_process_templates" ON public.pc_production_process_templates;

CREATE POLICY "Users view own pc_production_process_templates" ON public.pc_production_process_templates FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users insert own pc_production_process_templates" ON public.pc_production_process_templates FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own pc_production_process_templates" ON public.pc_production_process_templates FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users delete own pc_production_process_templates" ON public.pc_production_process_templates FOR DELETE USING (auth.uid() = created_by);

-- pc_production_pdf_config
ALTER TABLE public.pc_production_pdf_config ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

DROP POLICY IF EXISTS "Auth users can view pc_production_pdf_config" ON public.pc_production_pdf_config;
DROP POLICY IF EXISTS "Auth users can insert pc_production_pdf_config" ON public.pc_production_pdf_config;
DROP POLICY IF EXISTS "Auth users can update pc_production_pdf_config" ON public.pc_production_pdf_config;
DROP POLICY IF EXISTS "Authenticated users can read pc_production_pdf_config" ON public.pc_production_pdf_config;
DROP POLICY IF EXISTS "Authenticated users can manage pc_production_pdf_config" ON public.pc_production_pdf_config;
DROP POLICY IF EXISTS "Admin can manage pc_production_pdf_config" ON public.pc_production_pdf_config;

CREATE POLICY "Users view own pc_production_pdf_config" ON public.pc_production_pdf_config FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users insert own pc_production_pdf_config" ON public.pc_production_pdf_config FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own pc_production_pdf_config" ON public.pc_production_pdf_config FOR UPDATE USING (auth.uid() = created_by);

-- pc_inventory_items
DROP POLICY IF EXISTS "Authenticated users can read pc_inventory_items" ON public.pc_inventory_items;
DROP POLICY IF EXISTS "Authenticated users can insert pc_inventory_items" ON public.pc_inventory_items;
DROP POLICY IF EXISTS "Authenticated users can update pc_inventory_items" ON public.pc_inventory_items;

CREATE POLICY "Users view own pc_inventory_items" ON public.pc_inventory_items FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users insert own pc_inventory_items" ON public.pc_inventory_items FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own pc_inventory_items" ON public.pc_inventory_items FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users delete own pc_inventory_items" ON public.pc_inventory_items FOR DELETE USING (auth.uid() = created_by);

-- pc_inventory_movements
DROP POLICY IF EXISTS "Authenticated users can read pc_inventory_movements" ON public.pc_inventory_movements;
DROP POLICY IF EXISTS "Authenticated users can insert pc_inventory_movements" ON public.pc_inventory_movements;

CREATE POLICY "Users view own pc_inventory_movements" ON public.pc_inventory_movements FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users insert own pc_inventory_movements" ON public.pc_inventory_movements FOR INSERT WITH CHECK (auth.uid() = created_by);

-- pc_inventory_reservations
DROP POLICY IF EXISTS "Authenticated users can read pc_inventory_reservations" ON public.pc_inventory_reservations;
DROP POLICY IF EXISTS "Authenticated users can insert pc_inventory_reservations" ON public.pc_inventory_reservations;
DROP POLICY IF EXISTS "Authenticated users can update pc_inventory_reservations" ON public.pc_inventory_reservations;

CREATE POLICY "Users view own pc_inventory_reservations" ON public.pc_inventory_reservations FOR SELECT USING (auth.uid() = reserved_by);
CREATE POLICY "Users insert own pc_inventory_reservations" ON public.pc_inventory_reservations FOR INSERT WITH CHECK (auth.uid() = reserved_by);
CREATE POLICY "Users update own pc_inventory_reservations" ON public.pc_inventory_reservations FOR UPDATE USING (auth.uid() = reserved_by);

-- pc_inventory_sessions
DROP POLICY IF EXISTS "Authenticated users can read pc_inventory_sessions" ON public.pc_inventory_sessions;
DROP POLICY IF EXISTS "Authenticated users can insert pc_inventory_sessions" ON public.pc_inventory_sessions;
DROP POLICY IF EXISTS "Authenticated users can update pc_inventory_sessions" ON public.pc_inventory_sessions;

CREATE POLICY "Users view own pc_inventory_sessions" ON public.pc_inventory_sessions FOR SELECT USING (auth.uid() = started_by);
CREATE POLICY "Users insert own pc_inventory_sessions" ON public.pc_inventory_sessions FOR INSERT WITH CHECK (auth.uid() = started_by);
CREATE POLICY "Users update own pc_inventory_sessions" ON public.pc_inventory_sessions FOR UPDATE USING (auth.uid() = started_by);

-- pc_inventory_session_items
DROP POLICY IF EXISTS "Authenticated users can read pc_inventory_session_items" ON public.pc_inventory_session_items;
DROP POLICY IF EXISTS "Authenticated users can insert pc_inventory_session_items" ON public.pc_inventory_session_items;
DROP POLICY IF EXISTS "Authenticated users can update pc_inventory_session_items" ON public.pc_inventory_session_items;

CREATE POLICY "Users view own pc_inventory_session_items" ON public.pc_inventory_session_items FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.pc_inventory_sessions s WHERE s.id = session_id AND s.started_by = auth.uid()));
CREATE POLICY "Users insert own pc_inventory_session_items" ON public.pc_inventory_session_items FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.pc_inventory_sessions s WHERE s.id = session_id AND s.started_by = auth.uid()));
CREATE POLICY "Users update own pc_inventory_session_items" ON public.pc_inventory_session_items FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.pc_inventory_sessions s WHERE s.id = session_id AND s.started_by = auth.uid()));

-- pc_inventory_alerts
DROP POLICY IF EXISTS "Authenticated users can read pc_inventory_alerts" ON public.pc_inventory_alerts;

CREATE POLICY "Users view own pc_inventory_alerts" ON public.pc_inventory_alerts FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.pc_inventory_items i WHERE i.id = item_id AND i.created_by = auth.uid()));
