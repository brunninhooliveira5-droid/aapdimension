
CREATE TABLE public.user_appearance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_appearance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own appearance" ON public.user_appearance_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own appearance" ON public.user_appearance_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own appearance" ON public.user_appearance_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_user_appearance_updated_at
  BEFORE UPDATE ON public.user_appearance_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
