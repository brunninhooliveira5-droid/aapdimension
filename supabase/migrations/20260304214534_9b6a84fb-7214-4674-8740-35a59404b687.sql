
-- Security definer function: checks if a given user is in the same account as the caller
CREATE OR REPLACE FUNCTION public.is_same_account(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.account_members am1
    JOIN public.account_members am2 ON am1.account_id = am2.account_id
    WHERE am1.user_id = auth.uid()
      AND am2.user_id = _user_id
      AND am1.is_active = true
      AND am2.is_active = true
  )
$$;

-- =====================================================
-- UPDATE ALL pc_* RLS POLICIES FOR ACCOUNT DATA SHARING
-- Pattern: SELECT/UPDATE/DELETE → allow same account
-- INSERT → keep auth.uid() = created_by (user creates as themselves)
-- =====================================================

-- ---- pc_tasks ----
DROP POLICY IF EXISTS "Users view own pc_tasks" ON public.pc_tasks;
CREATE POLICY "Users view own pc_tasks" ON public.pc_tasks FOR SELECT TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

DROP POLICY IF EXISTS "Users update own pc_tasks" ON public.pc_tasks;
CREATE POLICY "Users update own pc_tasks" ON public.pc_tasks FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

DROP POLICY IF EXISTS "Users delete own pc_tasks" ON public.pc_tasks;
CREATE POLICY "Users delete own pc_tasks" ON public.pc_tasks FOR DELETE TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

-- ---- pc_task_files ----
DROP POLICY IF EXISTS "Users view own pc_task_files" ON public.pc_task_files;
CREATE POLICY "Users view own pc_task_files" ON public.pc_task_files FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM pc_tasks t WHERE t.id = pc_task_files.task_id AND (t.created_by = auth.uid() OR public.is_same_account(t.created_by))));

DROP POLICY IF EXISTS "Users insert own pc_task_files" ON public.pc_task_files;
CREATE POLICY "Users insert own pc_task_files" ON public.pc_task_files FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM pc_tasks t WHERE t.id = pc_task_files.task_id AND (t.created_by = auth.uid() OR public.is_same_account(t.created_by))));

DROP POLICY IF EXISTS "Users delete own pc_task_files" ON public.pc_task_files;
CREATE POLICY "Users delete own pc_task_files" ON public.pc_task_files FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM pc_tasks t WHERE t.id = pc_task_files.task_id AND (t.created_by = auth.uid() OR public.is_same_account(t.created_by))));

DROP POLICY IF EXISTS "Users update own pc_task_files" ON public.pc_task_files;
CREATE POLICY "Users update own pc_task_files" ON public.pc_task_files FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM pc_tasks t WHERE t.id = pc_task_files.task_id AND (t.created_by = auth.uid() OR public.is_same_account(t.created_by))));

-- ---- pc_pendencies ----
DROP POLICY IF EXISTS "Users view own pc_pendencies" ON public.pc_pendencies;
CREATE POLICY "Users view own pc_pendencies" ON public.pc_pendencies FOR SELECT TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

DROP POLICY IF EXISTS "Users update own pc_pendencies" ON public.pc_pendencies;
CREATE POLICY "Users update own pc_pendencies" ON public.pc_pendencies FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

DROP POLICY IF EXISTS "Users delete own pc_pendencies" ON public.pc_pendencies;
CREATE POLICY "Users delete own pc_pendencies" ON public.pc_pendencies FOR DELETE TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

-- ---- pc_schedule_events ----
DROP POLICY IF EXISTS "Users view own pc_schedule_events" ON public.pc_schedule_events;
CREATE POLICY "Users view own pc_schedule_events" ON public.pc_schedule_events FOR SELECT TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

DROP POLICY IF EXISTS "Users update own pc_schedule_events" ON public.pc_schedule_events;
CREATE POLICY "Users update own pc_schedule_events" ON public.pc_schedule_events FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

DROP POLICY IF EXISTS "Users delete own pc_schedule_events" ON public.pc_schedule_events;
CREATE POLICY "Users delete own pc_schedule_events" ON public.pc_schedule_events FOR DELETE TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

-- ---- pc_production_items ----
DROP POLICY IF EXISTS "Users view own pc_production_items" ON public.pc_production_items;
CREATE POLICY "Users view own pc_production_items" ON public.pc_production_items FOR SELECT TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

DROP POLICY IF EXISTS "Users update own pc_production_items" ON public.pc_production_items;
CREATE POLICY "Users update own pc_production_items" ON public.pc_production_items FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

DROP POLICY IF EXISTS "Users delete own pc_production_items" ON public.pc_production_items;
CREATE POLICY "Users delete own pc_production_items" ON public.pc_production_items FOR DELETE TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

-- ---- pc_production_cards ----
DROP POLICY IF EXISTS "Users view own pc_production_cards" ON public.pc_production_cards;
CREATE POLICY "Users view own pc_production_cards" ON public.pc_production_cards FOR SELECT TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

DROP POLICY IF EXISTS "Users update own pc_production_cards" ON public.pc_production_cards;
CREATE POLICY "Users update own pc_production_cards" ON public.pc_production_cards FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

DROP POLICY IF EXISTS "Users delete own pc_production_cards" ON public.pc_production_cards;
CREATE POLICY "Users delete own pc_production_cards" ON public.pc_production_cards FOR DELETE TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

-- ---- pc_goals ----
DROP POLICY IF EXISTS "Users view own pc_goals" ON public.pc_goals;
CREATE POLICY "Users view own pc_goals" ON public.pc_goals FOR SELECT TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

DROP POLICY IF EXISTS "Users update own pc_goals" ON public.pc_goals;
CREATE POLICY "Users update own pc_goals" ON public.pc_goals FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

DROP POLICY IF EXISTS "Users delete own pc_goals" ON public.pc_goals;
CREATE POLICY "Users delete own pc_goals" ON public.pc_goals FOR DELETE TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

-- ---- pc_goal_history ----
DROP POLICY IF EXISTS "Users view own pc_goal_history" ON public.pc_goal_history;
CREATE POLICY "Users view own pc_goal_history" ON public.pc_goal_history FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM pc_goals g WHERE g.id = pc_goal_history.goal_id AND (g.created_by = auth.uid() OR public.is_same_account(g.created_by))));

DROP POLICY IF EXISTS "Users insert own pc_goal_history" ON public.pc_goal_history;
CREATE POLICY "Users insert own pc_goal_history" ON public.pc_goal_history FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM pc_goals g WHERE g.id = pc_goal_history.goal_id AND (g.created_by = auth.uid() OR public.is_same_account(g.created_by))));

-- ---- pc_routines ----
DROP POLICY IF EXISTS "Users view own pc_routines" ON public.pc_routines;
CREATE POLICY "Users view own pc_routines" ON public.pc_routines FOR SELECT TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

DROP POLICY IF EXISTS "Users update own pc_routines" ON public.pc_routines;
CREATE POLICY "Users update own pc_routines" ON public.pc_routines FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

DROP POLICY IF EXISTS "Users delete own pc_routines" ON public.pc_routines;
CREATE POLICY "Users delete own pc_routines" ON public.pc_routines FOR DELETE TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

-- ---- pc_routine_activations ----
DROP POLICY IF EXISTS "Users view own pc_routine_activations" ON public.pc_routine_activations;
CREATE POLICY "Users view own pc_routine_activations" ON public.pc_routine_activations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM pc_routines r WHERE r.id = pc_routine_activations.routine_id AND (r.created_by = auth.uid() OR public.is_same_account(r.created_by))));

-- ---- pc_routine_template_files ----
DROP POLICY IF EXISTS "Users view own pc_routine_template_files" ON public.pc_routine_template_files;
CREATE POLICY "Users view own pc_routine_template_files" ON public.pc_routine_template_files FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM pc_routines r WHERE r.id = pc_routine_template_files.routine_id AND (r.created_by = auth.uid() OR public.is_same_account(r.created_by))));

DROP POLICY IF EXISTS "Users insert own pc_routine_template_files" ON public.pc_routine_template_files;
CREATE POLICY "Users insert own pc_routine_template_files" ON public.pc_routine_template_files FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM pc_routines r WHERE r.id = pc_routine_template_files.routine_id AND (r.created_by = auth.uid() OR public.is_same_account(r.created_by))));

DROP POLICY IF EXISTS "Users delete own pc_routine_template_files" ON public.pc_routine_template_files;
CREATE POLICY "Users delete own pc_routine_template_files" ON public.pc_routine_template_files FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM pc_routines r WHERE r.id = pc_routine_template_files.routine_id AND (r.created_by = auth.uid() OR public.is_same_account(r.created_by))));

-- ---- pc_inventory_items ----
DROP POLICY IF EXISTS "Users view own pc_inventory_items" ON public.pc_inventory_items;
CREATE POLICY "Users view own pc_inventory_items" ON public.pc_inventory_items FOR SELECT TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

DROP POLICY IF EXISTS "Users update own pc_inventory_items" ON public.pc_inventory_items;
CREATE POLICY "Users update own pc_inventory_items" ON public.pc_inventory_items FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

DROP POLICY IF EXISTS "Users delete own pc_inventory_items" ON public.pc_inventory_items;
CREATE POLICY "Users delete own pc_inventory_items" ON public.pc_inventory_items FOR DELETE TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

-- ---- pc_inventory_movements ----
DROP POLICY IF EXISTS "Users view own pc_inventory_movements" ON public.pc_inventory_movements;
CREATE POLICY "Users view own pc_inventory_movements" ON public.pc_inventory_movements FOR SELECT TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

-- ---- pc_inventory_reservations ----
DROP POLICY IF EXISTS "Users view own pc_inventory_reservations" ON public.pc_inventory_reservations;
CREATE POLICY "Users view own pc_inventory_reservations" ON public.pc_inventory_reservations FOR SELECT TO authenticated
USING (auth.uid() = reserved_by OR public.is_same_account(reserved_by));

DROP POLICY IF EXISTS "Users update own pc_inventory_reservations" ON public.pc_inventory_reservations;
CREATE POLICY "Users update own pc_inventory_reservations" ON public.pc_inventory_reservations FOR UPDATE TO authenticated
USING (auth.uid() = reserved_by OR public.is_same_account(reserved_by));

-- ---- pc_inventory_sessions ----
DROP POLICY IF EXISTS "Users view own pc_inventory_sessions" ON public.pc_inventory_sessions;
CREATE POLICY "Users view own pc_inventory_sessions" ON public.pc_inventory_sessions FOR SELECT TO authenticated
USING (auth.uid() = started_by OR public.is_same_account(started_by));

DROP POLICY IF EXISTS "Users update own pc_inventory_sessions" ON public.pc_inventory_sessions;
CREATE POLICY "Users update own pc_inventory_sessions" ON public.pc_inventory_sessions FOR UPDATE TO authenticated
USING (auth.uid() = started_by OR public.is_same_account(started_by));

-- ---- pc_inventory_session_items ----
DROP POLICY IF EXISTS "Users view own pc_inventory_session_items" ON public.pc_inventory_session_items;
CREATE POLICY "Users view own pc_inventory_session_items" ON public.pc_inventory_session_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM pc_inventory_sessions s WHERE s.id = pc_inventory_session_items.session_id AND (s.started_by = auth.uid() OR public.is_same_account(s.started_by))));

DROP POLICY IF EXISTS "Users insert own pc_inventory_session_items" ON public.pc_inventory_session_items;
CREATE POLICY "Users insert own pc_inventory_session_items" ON public.pc_inventory_session_items FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM pc_inventory_sessions s WHERE s.id = pc_inventory_session_items.session_id AND (s.started_by = auth.uid() OR public.is_same_account(s.started_by))));

DROP POLICY IF EXISTS "Users update own pc_inventory_session_items" ON public.pc_inventory_session_items;
CREATE POLICY "Users update own pc_inventory_session_items" ON public.pc_inventory_session_items FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM pc_inventory_sessions s WHERE s.id = pc_inventory_session_items.session_id AND (s.started_by = auth.uid() OR public.is_same_account(s.started_by))));

-- ---- pc_inventory_alerts ----
DROP POLICY IF EXISTS "Users view own pc_inventory_alerts" ON public.pc_inventory_alerts;
CREATE POLICY "Users view own pc_inventory_alerts" ON public.pc_inventory_alerts FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM pc_inventory_items i WHERE i.id = pc_inventory_alerts.item_id AND (i.created_by = auth.uid() OR public.is_same_account(i.created_by))));

-- ---- pc_production_sheets ----
DROP POLICY IF EXISTS "Users view own pc_production_sheets" ON public.pc_production_sheets;
CREATE POLICY "Users view own pc_production_sheets" ON public.pc_production_sheets FOR SELECT TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

DROP POLICY IF EXISTS "Users update own pc_production_sheets" ON public.pc_production_sheets;
CREATE POLICY "Users update own pc_production_sheets" ON public.pc_production_sheets FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

DROP POLICY IF EXISTS "Users delete own pc_production_sheets" ON public.pc_production_sheets;
CREATE POLICY "Users delete own pc_production_sheets" ON public.pc_production_sheets FOR DELETE TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

-- ---- pc_production_bom_items ----
DROP POLICY IF EXISTS "Users view own pc_production_bom_items" ON public.pc_production_bom_items;
CREATE POLICY "Users view own pc_production_bom_items" ON public.pc_production_bom_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM pc_production_sheets s WHERE s.id = pc_production_bom_items.ficha_id AND (s.created_by = auth.uid() OR public.is_same_account(s.created_by))));

DROP POLICY IF EXISTS "Users insert own pc_production_bom_items" ON public.pc_production_bom_items;
CREATE POLICY "Users insert own pc_production_bom_items" ON public.pc_production_bom_items FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM pc_production_sheets s WHERE s.id = pc_production_bom_items.ficha_id AND (s.created_by = auth.uid() OR public.is_same_account(s.created_by))));

DROP POLICY IF EXISTS "Users update own pc_production_bom_items" ON public.pc_production_bom_items;
CREATE POLICY "Users update own pc_production_bom_items" ON public.pc_production_bom_items FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM pc_production_sheets s WHERE s.id = pc_production_bom_items.ficha_id AND (s.created_by = auth.uid() OR public.is_same_account(s.created_by))));

DROP POLICY IF EXISTS "Users delete own pc_production_bom_items" ON public.pc_production_bom_items;
CREATE POLICY "Users delete own pc_production_bom_items" ON public.pc_production_bom_items FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM pc_production_sheets s WHERE s.id = pc_production_bom_items.ficha_id AND (s.created_by = auth.uid() OR public.is_same_account(s.created_by))));

-- ---- pc_production_process_steps ----
DROP POLICY IF EXISTS "Users view own pc_production_process_steps" ON public.pc_production_process_steps;
CREATE POLICY "Users view own pc_production_process_steps" ON public.pc_production_process_steps FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM pc_production_sheets s WHERE s.id = pc_production_process_steps.ficha_id AND (s.created_by = auth.uid() OR public.is_same_account(s.created_by))));

DROP POLICY IF EXISTS "Users insert own pc_production_process_steps" ON public.pc_production_process_steps;
CREATE POLICY "Users insert own pc_production_process_steps" ON public.pc_production_process_steps FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM pc_production_sheets s WHERE s.id = pc_production_process_steps.ficha_id AND (s.created_by = auth.uid() OR public.is_same_account(s.created_by))));

DROP POLICY IF EXISTS "Users update own pc_production_process_steps" ON public.pc_production_process_steps;
CREATE POLICY "Users update own pc_production_process_steps" ON public.pc_production_process_steps FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM pc_production_sheets s WHERE s.id = pc_production_process_steps.ficha_id AND (s.created_by = auth.uid() OR public.is_same_account(s.created_by))));

DROP POLICY IF EXISTS "Users delete own pc_production_process_steps" ON public.pc_production_process_steps;
CREATE POLICY "Users delete own pc_production_process_steps" ON public.pc_production_process_steps FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM pc_production_sheets s WHERE s.id = pc_production_process_steps.ficha_id AND (s.created_by = auth.uid() OR public.is_same_account(s.created_by))));

-- ---- pc_production_bom_templates ----
DROP POLICY IF EXISTS "Users view own pc_production_bom_templates" ON public.pc_production_bom_templates;
CREATE POLICY "Users view own pc_production_bom_templates" ON public.pc_production_bom_templates FOR SELECT TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

DROP POLICY IF EXISTS "Users update own pc_production_bom_templates" ON public.pc_production_bom_templates;
CREATE POLICY "Users update own pc_production_bom_templates" ON public.pc_production_bom_templates FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

DROP POLICY IF EXISTS "Users delete own pc_production_bom_templates" ON public.pc_production_bom_templates;
CREATE POLICY "Users delete own pc_production_bom_templates" ON public.pc_production_bom_templates FOR DELETE TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

-- ---- pc_production_process_templates ----
DROP POLICY IF EXISTS "Users view own pc_production_process_templates" ON public.pc_production_process_templates;
CREATE POLICY "Users view own pc_production_process_templates" ON public.pc_production_process_templates FOR SELECT TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

DROP POLICY IF EXISTS "Users update own pc_production_process_templates" ON public.pc_production_process_templates;
CREATE POLICY "Users update own pc_production_process_templates" ON public.pc_production_process_templates FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

DROP POLICY IF EXISTS "Users delete own pc_production_process_templates" ON public.pc_production_process_templates;
CREATE POLICY "Users delete own pc_production_process_templates" ON public.pc_production_process_templates FOR DELETE TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

-- ---- pc_production_pdf_config ----
DROP POLICY IF EXISTS "Users view own pc_production_pdf_config" ON public.pc_production_pdf_config;
CREATE POLICY "Users view own pc_production_pdf_config" ON public.pc_production_pdf_config FOR SELECT TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

DROP POLICY IF EXISTS "Users update own pc_production_pdf_config" ON public.pc_production_pdf_config;
CREATE POLICY "Users update own pc_production_pdf_config" ON public.pc_production_pdf_config FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR public.is_same_account(created_by));

-- Also drop the overly permissive policy on pc_production_sheets
DROP POLICY IF EXISTS "Authenticated users can manage pc_production_sheets" ON public.pc_production_sheets;
