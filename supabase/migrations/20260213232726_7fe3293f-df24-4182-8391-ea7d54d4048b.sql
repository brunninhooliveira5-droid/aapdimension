
-- Add address and approval fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS zip_code TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT false;

-- Update handle_new_user to store company and address from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, initials, company, address, city, state, zip_code, approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), 2)),
    COALESCE(NEW.raw_user_meta_data->>'company', ''),
    COALESCE(NEW.raw_user_meta_data->>'address', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    COALESCE(NEW.raw_user_meta_data->>'state', ''),
    COALESCE(NEW.raw_user_meta_data->>'zip_code', ''),
    false
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'operador'));
  RETURN NEW;
END;
$$;

-- Allow admin_master to update profiles (for approval)
CREATE POLICY "Admin master updates all profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Mark existing users as approved
UPDATE public.profiles SET approved = true WHERE approved = false;
