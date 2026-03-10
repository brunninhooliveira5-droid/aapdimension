
CREATE TABLE public.work_diary_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  company TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.work_diary_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own clients" ON public.work_diary_clients
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add client_id to work_diary_entries
ALTER TABLE public.work_diary_entries ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.work_diary_clients(id) ON DELETE SET NULL;
ALTER TABLE public.work_diary_entries ADD COLUMN IF NOT EXISTS client_name TEXT DEFAULT '';
ALTER TABLE public.work_diary_entries ADD COLUMN IF NOT EXISTS client_phone TEXT DEFAULT '';
ALTER TABLE public.work_diary_entries ADD COLUMN IF NOT EXISTS client_company TEXT DEFAULT '';
