
-- Table to store each user's dashboard widget layout
CREATE TABLE public.user_dashboard_layout (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  layout JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_dashboard_layout ENABLE ROW LEVEL SECURITY;

-- Users can read their own layout
CREATE POLICY "Users can read own layout"
  ON public.user_dashboard_layout
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own layout
CREATE POLICY "Users can insert own layout"
  ON public.user_dashboard_layout
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own layout
CREATE POLICY "Users can update own layout"
  ON public.user_dashboard_layout
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admin master can read all layouts
CREATE POLICY "Admin master can read all layouts"
  ON public.user_dashboard_layout
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin_master'));

-- Trigger for updated_at
CREATE TRIGGER update_user_dashboard_layout_updated_at
  BEFORE UPDATE ON public.user_dashboard_layout
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
