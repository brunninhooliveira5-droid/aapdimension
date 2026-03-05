
ALTER TABLE public.inventory_calibration_logs
  ADD CONSTRAINT inventory_calibration_logs_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;

ALTER TABLE public.pc_inventory_calibration_logs
  ADD CONSTRAINT pc_inventory_calibration_logs_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES public.pc_inventory_items(id) ON DELETE CASCADE;
