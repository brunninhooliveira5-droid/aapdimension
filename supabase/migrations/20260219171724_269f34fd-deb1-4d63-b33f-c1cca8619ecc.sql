
-- Table for individual login events (for daily charts)
CREATE TABLE public.user_login_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  logged_in_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_events_user ON public.user_login_events(user_id);
CREATE INDEX idx_login_events_date ON public.user_login_events(logged_in_at);

ALTER TABLE public.user_login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master reads login events"
ON public.user_login_events
FOR SELECT
USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Table for page visit tracking (for most used features)
CREATE TABLE public.page_visits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  page_path text NOT NULL,
  visited_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_page_visits_user ON public.page_visits(user_id);
CREATE INDEX idx_page_visits_date ON public.page_visits(visited_at);
CREATE INDEX idx_page_visits_path ON public.page_visits(page_path);

ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master reads page visits"
ON public.page_visits
FOR SELECT
USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Security definer functions to insert events (callable by any authenticated user)
CREATE OR REPLACE FUNCTION public.record_login_event(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_login_events (user_id) VALUES (p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_page_visit(p_user_id uuid, p_page_path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.page_visits (user_id, page_path) VALUES (p_user_id, p_page_path);
END;
$$;
