
ALTER TABLE public.access_requests ADD COLUMN IF NOT EXISTS email_sent boolean NOT NULL DEFAULT false;
