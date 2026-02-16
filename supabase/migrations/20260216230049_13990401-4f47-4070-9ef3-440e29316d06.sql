
-- Clean up any leftover trigger from failed migration
DROP TRIGGER IF EXISTS on_profile_created_add_plan ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_new_user_plan();

-- Create user_plans table
CREATE TABLE public.user_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'free',
  pro_access boolean NOT NULL DEFAULT false,
  max_quotes_per_month integer NOT NULL DEFAULT 5,
  max_financial_entries integer NOT NULL DEFAULT 0,
  features_enabled text[] NOT NULL DEFAULT '{}',
  valid_until timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own plan"
  ON public.user_plans FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admin master manages plans"
  ON public.user_plans FOR ALL
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

-- Auto-create plan on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_plans (user_id, plan, pro_access)
  VALUES (NEW.id, 'free', false)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_add_plan
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_plan();

-- Updated_at trigger
CREATE TRIGGER update_user_plans_updated_at
  BEFORE UPDATE ON public.user_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
