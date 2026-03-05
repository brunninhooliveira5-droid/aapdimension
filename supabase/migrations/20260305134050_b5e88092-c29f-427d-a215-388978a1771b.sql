
-- Inventory item files (attachments: photos and PDFs)
CREATE TABLE public.inventory_item_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT '',
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_item_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read inventory item files"
  ON public.inventory_item_files FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert inventory item files"
  ON public.inventory_item_files FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Authenticated users can delete own inventory item files"
  ON public.inventory_item_files FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin_master'::app_role));

-- Same for PC module
CREATE TABLE public.pc_inventory_item_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT '',
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pc_inventory_item_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read pc inventory item files"
  ON public.pc_inventory_item_files FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert pc inventory item files"
  ON public.pc_inventory_item_files FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Authenticated users can delete own pc inventory item files"
  ON public.pc_inventory_item_files FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin_master'::app_role));
