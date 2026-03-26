
-- Helper functions for atomic counter increments
CREATE OR REPLACE FUNCTION public.increment_affiliate_clicks(_affiliate_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.affiliates SET total_clicks = total_clicks + 1 WHERE id = _affiliate_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_affiliate_signups(_affiliate_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.affiliates SET total_signups = total_signups + 1 WHERE id = _affiliate_id;
$$;
