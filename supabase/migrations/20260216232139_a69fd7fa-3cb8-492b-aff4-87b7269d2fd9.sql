
-- Create table for PRO access requests
CREATE TABLE public.pro_access_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID
);

-- Enable RLS
ALTER TABLE public.pro_access_requests ENABLE ROW LEVEL SECURITY;

-- Users can read their own requests
CREATE POLICY "Users read own requests"
ON public.pro_access_requests
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own requests
CREATE POLICY "Users insert own requests"
ON public.pro_access_requests
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Admin master reads all requests
CREATE POLICY "Admin master reads all requests"
ON public.pro_access_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Admin master updates requests (approve/reject)
CREATE POLICY "Admin master updates requests"
ON public.pro_access_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Admin master deletes requests
CREATE POLICY "Admin master deletes requests"
ON public.pro_access_requests
FOR DELETE
USING (has_role(auth.uid(), 'admin_master'::app_role));
