
-- Allow users to update their own thicknesses
CREATE POLICY "Users update own thicknesses"
ON public.cutting_material_thicknesses
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM cutting_materials
  WHERE cutting_materials.id = cutting_material_thicknesses.material_id
    AND cutting_materials.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM cutting_materials
  WHERE cutting_materials.id = cutting_material_thicknesses.material_id
    AND cutting_materials.user_id = auth.uid()
));
