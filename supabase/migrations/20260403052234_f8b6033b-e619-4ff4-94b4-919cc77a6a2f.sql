
-- Phase 1a: Lock down affiliate RLS policies

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can apply as affiliate" ON public.affiliates;
DROP POLICY IF EXISTS "Anyone can read affiliates by code" ON public.affiliates;

-- Affiliates: authenticated users can only read their own record (matched by email in JWT)
CREATE POLICY "Affiliates can view own record" ON public.affiliates
  FOR SELECT TO authenticated USING (email = (auth.jwt()->>'email'));

-- Anyone can still apply (INSERT) — this is the public signup form
CREATE POLICY "Anyone can apply as affiliate" ON public.affiliates
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Security definer function for public affiliate code lookups (no PII exposed)
CREATE OR REPLACE FUNCTION public.get_affiliate_by_code(_code text)
RETURNS TABLE(id uuid, affiliate_code text, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.affiliate_code, a.status FROM public.affiliates a WHERE a.affiliate_code = _code;
$$;

-- Phase 1a: Lock down affiliate_events
DROP POLICY IF EXISTS "Anyone can read affiliate events" ON public.affiliate_events;
DROP POLICY IF EXISTS "System can insert affiliate events" ON public.affiliate_events;

-- Authenticated affiliates can only view their own events
CREATE POLICY "Affiliates can view own events" ON public.affiliate_events
  FOR SELECT TO authenticated
  USING (affiliate_id IN (
    SELECT a.id FROM public.affiliates a WHERE a.email = (auth.jwt()->>'email')
  ));

-- Only service_role can insert events (edge function uses service role key)
CREATE POLICY "Service role inserts events" ON public.affiliate_events
  FOR INSERT TO service_role WITH CHECK (true);

-- Phase 1b: Make storage buckets private
UPDATE storage.buckets SET public = false WHERE name IN ('card-scans', 'voice-notes');
