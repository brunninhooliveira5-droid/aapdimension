-- Allow account members to read owner's cutting_materials
CREATE POLICY "Account members read owner cutting_materials"
ON public.cutting_materials FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM account_members am
    JOIN accounts a ON a.id = am.account_id
    WHERE am.user_id = auth.uid()
      AND am.is_active = true
      AND a.owner_user_id = cutting_materials.user_id
  )
);

-- Allow account members to read owner's cutting_material_thicknesses
CREATE POLICY "Account members read owner cutting_material_thicknesses"
ON public.cutting_material_thicknesses FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM cutting_materials cm
    JOIN account_members am ON am.user_id = auth.uid() AND am.is_active = true
    JOIN accounts a ON a.id = am.account_id
    WHERE cm.id = cutting_material_thicknesses.material_id
      AND a.owner_user_id = cm.user_id
  )
);