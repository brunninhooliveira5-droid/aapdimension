ALTER TABLE public.machines ADD COLUMN equipment_id uuid REFERENCES public.dimension_equipment(id) ON DELETE SET NULL;
CREATE INDEX idx_machines_equipment_id ON public.machines(equipment_id);