
-- Fix the view to use SECURITY INVOKER (respects querying user's RLS)
ALTER VIEW public.safe_member_profiles SET (security_invoker = on);
