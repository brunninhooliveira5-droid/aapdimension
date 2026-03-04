
-- Create storage bucket for inventory item images
INSERT INTO storage.buckets (id, name, public) VALUES ('inventory-images', 'inventory-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for inventory-images bucket
CREATE POLICY "Authenticated users can upload inventory images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'inventory-images');

CREATE POLICY "Anyone can view inventory images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'inventory-images');

CREATE POLICY "Authenticated users can update inventory images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'inventory-images');

CREATE POLICY "Authenticated users can delete inventory images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'inventory-images');
