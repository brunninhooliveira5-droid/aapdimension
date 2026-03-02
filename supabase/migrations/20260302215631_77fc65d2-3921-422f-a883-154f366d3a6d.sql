
-- Add created_by to pc_production_cards
ALTER TABLE public.pc_production_cards ADD COLUMN IF NOT EXISTS created_by uuid;

-- =============================================
-- FIX: Drop all old permissive policies and replace with user-scoped
-- =============================================

-- === pc_tasks ===
DROP POLICY IF EXISTS "Auth users can delete pc_tasks" ON public.pc_tasks;
DROP POLICY IF EXISTS "Auth users can insert pc_tasks" ON public.pc_tasks;
DROP POLICY IF EXISTS "Auth users can update pc_tasks" ON public.pc_tasks;
DROP POLICY IF EXISTS "Auth users can view pc_tasks" ON public.pc_tasks;

CREATE POLICY "Users view own pc_tasks" ON public.pc_tasks FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users insert own pc_tasks" ON public.pc_tasks FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own pc_tasks" ON public.pc_tasks FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users delete own pc_tasks" ON public.pc_tasks FOR DELETE USING (auth.uid() = created_by);

-- === pc_task_files (scoped via parent task) ===
DROP POLICY IF EXISTS "Auth users can delete pc_task_files" ON public.pc_task_files;
DROP POLICY IF EXISTS "Auth users can insert pc_task_files" ON public.pc_task_files;
DROP POLICY IF EXISTS "Auth users can update pc_task_files" ON public.pc_task_files;
DROP POLICY IF EXISTS "Auth users can view pc_task_files" ON public.pc_task_files;

CREATE POLICY "Users view own pc_task_files" ON public.pc_task_files FOR SELECT USING (EXISTS (SELECT 1 FROM public.pc_tasks t WHERE t.id = pc_task_files.task_id AND t.created_by = auth.uid()));
CREATE POLICY "Users insert own pc_task_files" ON public.pc_task_files FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.pc_tasks t WHERE t.id = pc_task_files.task_id AND t.created_by = auth.uid()));
CREATE POLICY "Users update own pc_task_files" ON public.pc_task_files FOR UPDATE USING (EXISTS (SELECT 1 FROM public.pc_tasks t WHERE t.id = pc_task_files.task_id AND t.created_by = auth.uid()));
CREATE POLICY "Users delete own pc_task_files" ON public.pc_task_files FOR DELETE USING (EXISTS (SELECT 1 FROM public.pc_tasks t WHERE t.id = pc_task_files.task_id AND t.created_by = auth.uid()));

-- === pc_pendencies ===
DROP POLICY IF EXISTS "Auth users can delete pc_pendencies" ON public.pc_pendencies;
DROP POLICY IF EXISTS "Auth users can insert pc_pendencies" ON public.pc_pendencies;
DROP POLICY IF EXISTS "Auth users can update pc_pendencies" ON public.pc_pendencies;
DROP POLICY IF EXISTS "Auth users can view pc_pendencies" ON public.pc_pendencies;

CREATE POLICY "Users view own pc_pendencies" ON public.pc_pendencies FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users insert own pc_pendencies" ON public.pc_pendencies FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own pc_pendencies" ON public.pc_pendencies FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users delete own pc_pendencies" ON public.pc_pendencies FOR DELETE USING (auth.uid() = created_by);

-- === pc_schedule_events ===
DROP POLICY IF EXISTS "Auth users can delete pc_schedule_events" ON public.pc_schedule_events;
DROP POLICY IF EXISTS "Auth users can insert pc_schedule_events" ON public.pc_schedule_events;
DROP POLICY IF EXISTS "Auth users can update pc_schedule_events" ON public.pc_schedule_events;
DROP POLICY IF EXISTS "Auth users can view pc_schedule_events" ON public.pc_schedule_events;

CREATE POLICY "Users view own pc_schedule_events" ON public.pc_schedule_events FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users insert own pc_schedule_events" ON public.pc_schedule_events FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own pc_schedule_events" ON public.pc_schedule_events FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users delete own pc_schedule_events" ON public.pc_schedule_events FOR DELETE USING (auth.uid() = created_by);

-- === pc_production_items ===
DROP POLICY IF EXISTS "Auth users can delete pc_production_items" ON public.pc_production_items;
DROP POLICY IF EXISTS "Auth users can insert pc_production_items" ON public.pc_production_items;
DROP POLICY IF EXISTS "Auth users can update pc_production_items" ON public.pc_production_items;
DROP POLICY IF EXISTS "Auth users can view pc_production_items" ON public.pc_production_items;

CREATE POLICY "Users view own pc_production_items" ON public.pc_production_items FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users insert own pc_production_items" ON public.pc_production_items FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own pc_production_items" ON public.pc_production_items FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users delete own pc_production_items" ON public.pc_production_items FOR DELETE USING (auth.uid() = created_by);

-- === pc_production_cards (uses new created_by column) ===
DROP POLICY IF EXISTS "Auth users can delete pc_production_cards" ON public.pc_production_cards;
DROP POLICY IF EXISTS "Auth users can insert pc_production_cards" ON public.pc_production_cards;
DROP POLICY IF EXISTS "Auth users can update pc_production_cards" ON public.pc_production_cards;
DROP POLICY IF EXISTS "Auth users can view pc_production_cards" ON public.pc_production_cards;

CREATE POLICY "Users view own pc_production_cards" ON public.pc_production_cards FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users insert own pc_production_cards" ON public.pc_production_cards FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own pc_production_cards" ON public.pc_production_cards FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users delete own pc_production_cards" ON public.pc_production_cards FOR DELETE USING (auth.uid() = created_by);

-- === pc_routines ===
DROP POLICY IF EXISTS "Auth users can delete pc_routines" ON public.pc_routines;
DROP POLICY IF EXISTS "Auth users can insert pc_routines" ON public.pc_routines;
DROP POLICY IF EXISTS "Auth users can update pc_routines" ON public.pc_routines;
DROP POLICY IF EXISTS "Auth users can view pc_routines" ON public.pc_routines;

CREATE POLICY "Users view own pc_routines" ON public.pc_routines FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users insert own pc_routines" ON public.pc_routines FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own pc_routines" ON public.pc_routines FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users delete own pc_routines" ON public.pc_routines FOR DELETE USING (auth.uid() = created_by);

-- === pc_routine_activations ===
DROP POLICY IF EXISTS "Auth users can insert pc_routine_activations" ON public.pc_routine_activations;
DROP POLICY IF EXISTS "Auth users can view pc_routine_activations" ON public.pc_routine_activations;

CREATE POLICY "Users view own pc_routine_activations" ON public.pc_routine_activations FOR SELECT USING (EXISTS (SELECT 1 FROM public.pc_routines r WHERE r.id = pc_routine_activations.routine_id AND r.created_by = auth.uid()));
CREATE POLICY "Users insert own pc_routine_activations" ON public.pc_routine_activations FOR INSERT WITH CHECK (auth.uid() = activated_by);

-- === pc_routine_template_files (scoped via parent routine, uses uploaded_by) ===
DROP POLICY IF EXISTS "Auth users can delete pc_routine_template_files" ON public.pc_routine_template_files;
DROP POLICY IF EXISTS "Auth users can insert pc_routine_template_files" ON public.pc_routine_template_files;
DROP POLICY IF EXISTS "Auth users can view pc_routine_template_files" ON public.pc_routine_template_files;

CREATE POLICY "Users view own pc_routine_template_files" ON public.pc_routine_template_files FOR SELECT USING (EXISTS (SELECT 1 FROM public.pc_routines r WHERE r.id = pc_routine_template_files.routine_id AND r.created_by = auth.uid()));
CREATE POLICY "Users insert own pc_routine_template_files" ON public.pc_routine_template_files FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.pc_routines r WHERE r.id = pc_routine_template_files.routine_id AND r.created_by = auth.uid()));
CREATE POLICY "Users delete own pc_routine_template_files" ON public.pc_routine_template_files FOR DELETE USING (EXISTS (SELECT 1 FROM public.pc_routines r WHERE r.id = pc_routine_template_files.routine_id AND r.created_by = auth.uid()));

-- === pc_goals ===
DROP POLICY IF EXISTS "Auth users can delete pc_goals" ON public.pc_goals;
DROP POLICY IF EXISTS "Auth users can insert pc_goals" ON public.pc_goals;
DROP POLICY IF EXISTS "Auth users can update pc_goals" ON public.pc_goals;
DROP POLICY IF EXISTS "Auth users can view pc_goals" ON public.pc_goals;

CREATE POLICY "Users view own pc_goals" ON public.pc_goals FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users insert own pc_goals" ON public.pc_goals FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own pc_goals" ON public.pc_goals FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users delete own pc_goals" ON public.pc_goals FOR DELETE USING (auth.uid() = created_by);

-- === pc_goal_history ===
DROP POLICY IF EXISTS "Auth users can insert pc_goal_history" ON public.pc_goal_history;
DROP POLICY IF EXISTS "Auth users can view pc_goal_history" ON public.pc_goal_history;

CREATE POLICY "Users view own pc_goal_history" ON public.pc_goal_history FOR SELECT USING (EXISTS (SELECT 1 FROM public.pc_goals g WHERE g.id = pc_goal_history.goal_id AND g.created_by = auth.uid()));
CREATE POLICY "Users insert own pc_goal_history" ON public.pc_goal_history FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.pc_goals g WHERE g.id = pc_goal_history.goal_id AND g.created_by = auth.uid()));

-- === pc_production_sheets ===
DROP POLICY IF EXISTS "Auth users can delete pc_production_sheets" ON public.pc_production_sheets;
DROP POLICY IF EXISTS "Auth users can insert pc_production_sheets" ON public.pc_production_sheets;
DROP POLICY IF EXISTS "Auth users can update pc_production_sheets" ON public.pc_production_sheets;
DROP POLICY IF EXISTS "Auth users can view pc_production_sheets" ON public.pc_production_sheets;
DROP POLICY IF EXISTS "Users view own pc_production_sheets" ON public.pc_production_sheets;
DROP POLICY IF EXISTS "Users insert own pc_production_sheets" ON public.pc_production_sheets;
DROP POLICY IF EXISTS "Users update own pc_production_sheets" ON public.pc_production_sheets;
DROP POLICY IF EXISTS "Users delete own pc_production_sheets" ON public.pc_production_sheets;

CREATE POLICY "Users view own pc_production_sheets" ON public.pc_production_sheets FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users insert own pc_production_sheets" ON public.pc_production_sheets FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own pc_production_sheets" ON public.pc_production_sheets FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users delete own pc_production_sheets" ON public.pc_production_sheets FOR DELETE USING (auth.uid() = created_by);

-- === Drop old permissive ALL policies on bom/process items/templates ===
DROP POLICY IF EXISTS "Authenticated users can manage pc_production_bom_items" ON public.pc_production_bom_items;
DROP POLICY IF EXISTS "Authenticated users can manage pc_production_process_steps" ON public.pc_production_process_steps;
DROP POLICY IF EXISTS "Authenticated users can manage pc_production_bom_templates" ON public.pc_production_bom_templates;
DROP POLICY IF EXISTS "Authenticated users can manage pc_production_process_templates" ON public.pc_production_process_templates;
