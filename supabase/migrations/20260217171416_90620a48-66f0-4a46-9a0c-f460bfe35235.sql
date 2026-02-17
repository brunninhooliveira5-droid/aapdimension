
-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('ticket-attachments', 'ticket-attachments', true, 5242880);

-- Storage policies for ticket-attachments bucket
CREATE POLICY "Authenticated users can upload ticket attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ticket-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view ticket attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-attachments');

CREATE POLICY "Users can delete their own ticket attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'ticket-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create ticket_files table
CREATE TABLE public.ticket_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT '',
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ticket files" ON public.ticket_files
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert ticket files" ON public.ticket_files
FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own ticket files" ON public.ticket_files
FOR DELETE USING (auth.uid() = uploaded_by);
