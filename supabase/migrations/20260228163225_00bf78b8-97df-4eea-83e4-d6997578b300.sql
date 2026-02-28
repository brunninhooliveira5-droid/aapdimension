
-- Add email tracking columns to tickets table
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS admin_email_sent boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS user_email_sent boolean NOT NULL DEFAULT false;
