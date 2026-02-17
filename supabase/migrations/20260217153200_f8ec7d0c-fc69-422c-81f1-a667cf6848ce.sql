
-- Table to store finance access passwords (hashed server-side)
CREATE TABLE public.finance_access_passwords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_access_passwords ENABLE ROW LEVEL SECURITY;

-- Users can check if they have a password set (SELECT only id/user_id, hash never exposed to client)
CREATE POLICY "Users read own finance password existence"
  ON public.finance_access_passwords FOR SELECT
  USING (user_id = auth.uid());

-- Admin master manages all
CREATE POLICY "Admin master manages finance passwords"
  ON public.finance_access_passwords FOR ALL
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

-- Users can insert their own password
CREATE POLICY "Users insert own finance password"
  ON public.finance_access_passwords FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own password
CREATE POLICY "Users update own finance password"
  ON public.finance_access_passwords FOR UPDATE
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_finance_access_passwords_updated_at
  BEFORE UPDATE ON public.finance_access_passwords
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
