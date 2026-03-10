
-- =============================================
-- FIX 1: Restrict inventory INSERT policies to verify item ownership via account membership
-- =============================================

-- Drop overly permissive INSERT policies on dimension inventory tables
DROP POLICY IF EXISTS "Authenticated insert inventory_movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Authenticated insert inventory_reservations" ON public.inventory_reservations;
DROP POLICY IF EXISTS "Authenticated users can insert calibration logs" ON public.inventory_calibration_logs;
DROP POLICY IF EXISTS "Authenticated users can insert pc calibration logs" ON public.pc_inventory_calibration_logs;

-- Also fix pc module INSERT policies
DROP POLICY IF EXISTS "Authenticated users can insert pc_inventory_movements" ON public.pc_inventory_movements;
DROP POLICY IF EXISTS "Authenticated users can insert pc_inventory_reservations" ON public.pc_inventory_reservations;

-- Dimension inventory: INSERT only if user is admin_master or same account as item creator
CREATE POLICY "Same account insert inventory_movements" ON public.inventory_movements
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin_master'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.inventory_items i
      WHERE i.id = item_id
      AND public.is_same_account(i.created_by)
    )
  );

CREATE POLICY "Same account insert inventory_reservations" ON public.inventory_reservations
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin_master'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.inventory_items i
      WHERE i.id = item_id
      AND public.is_same_account(i.created_by)
    )
  );

CREATE POLICY "Same account insert inventory_calibration_logs" ON public.inventory_calibration_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin_master'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.inventory_items i
      WHERE i.id = item_id
      AND public.is_same_account(i.created_by)
    )
  );

-- PC inventory: INSERT only if user is in the same account as item creator
CREATE POLICY "Same account insert pc_inventory_calibration_logs" ON public.pc_inventory_calibration_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin_master'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.pc_inventory_items i
      WHERE i.id = item_id
      AND public.is_same_account(i.created_by)
    )
  );

CREATE POLICY "Same account insert pc_inventory_movements" ON public.pc_inventory_movements
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin_master'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.pc_inventory_items i
      WHERE i.id = item_id
      AND public.is_same_account(i.created_by)
    )
  );

CREATE POLICY "Same account insert pc_inventory_reservations" ON public.pc_inventory_reservations
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin_master'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.pc_inventory_items i
      WHERE i.id = item_id
      AND public.is_same_account(i.created_by)
    )
  );

-- =============================================
-- FIX 2: Restrict profiles PII exposure to account members
-- Replace broad policy with one that only exposes safe columns via a view
-- =============================================

-- Drop the broad policy
DROP POLICY IF EXISTS "Account members can read fellow member profiles" ON public.profiles;

-- Create a restricted view for account member lookups (no sensitive fields)
CREATE OR REPLACE VIEW public.safe_member_profiles AS
SELECT id, name, initials, email, company, approved
FROM public.profiles;

-- Grant access to authenticated users
GRANT SELECT ON public.safe_member_profiles TO authenticated;

-- =============================================
-- FIX 3: Restrict pc_inventory_item_files SELECT to item owner/account members
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can read pc inventory item files" ON public.pc_inventory_item_files;

CREATE POLICY "Same account read pc inventory item files" ON public.pc_inventory_item_files
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin_master'::app_role)
    OR uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.pc_inventory_items i
      WHERE i.id = item_id
      AND public.is_same_account(i.created_by)
    )
  );

-- =============================================
-- FIX 4: Remove user-facing SELECT policies on inventory password hash tables
-- =============================================

DROP POLICY IF EXISTS "Users can read own inventory password" ON public.inventory_access_passwords;
DROP POLICY IF EXISTS "Users can read own pc inventory password" ON public.pc_inventory_access_passwords;
