
-- ============================================================
-- 1) STORAGE POLICIES — card-scans, voice-notes, logos
-- ============================================================

-- card-scans: SELECT — signed-in users, file must be under their business folder
DROP POLICY IF EXISTS "Anyone can view card scans" ON storage.objects;
CREATE POLICY "Business members can view card scans"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'card-scans'
    AND (storage.foldername(name))[1] = public.get_user_business_id(auth.uid())::text
  );

-- card-scans: INSERT — must upload into their own business folder
DROP POLICY IF EXISTS "Authenticated users can upload card scans" ON storage.objects;
CREATE POLICY "Business members can upload card scans"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'card-scans'
    AND (storage.foldername(name))[1] = public.get_user_business_id(auth.uid())::text
  );

-- card-scans: DELETE — same ownership scope
DROP POLICY IF EXISTS "Users can delete own card scans" ON storage.objects;
CREATE POLICY "Business members can delete card scans"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'card-scans'
    AND (storage.foldername(name))[1] = public.get_user_business_id(auth.uid())::text
  );

-- voice-notes: SELECT — signed-in, own folder only
DROP POLICY IF EXISTS "Anyone can view voice notes" ON storage.objects;
CREATE POLICY "Users can view own voice notes"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'voice-notes'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- voice-notes: INSERT — must upload into own folder (matches existing DELETE)
DROP POLICY IF EXISTS "Authenticated users can upload voice notes" ON storage.objects;
CREATE POLICY "Users can upload own voice notes"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'voice-notes'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- logos: UPDATE — must be user's own business folder
DROP POLICY IF EXISTS "Authenticated users can update logos" ON storage.objects;
CREATE POLICY "Business members can update own logo"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = public.get_user_business_id(auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = public.get_user_business_id(auth.uid())::text
  );

-- logos: INSERT — tighten to own business folder too
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
CREATE POLICY "Business members can upload own logo"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = public.get_user_business_id(auth.uid())::text
  );

-- ============================================================
-- 2) RLS POLICIES — remove always-true expressions
-- ============================================================

-- affiliate_events: service_role bypasses RLS, so restrict authenticated/anon to nothing
DROP POLICY IF EXISTS "Service role inserts events" ON public.affiliate_events;
CREATE POLICY "Only service role can insert affiliate events"
  ON public.affiliate_events FOR INSERT TO service_role
  WITH CHECK (true);

-- affiliates: public signup allowed but caller cannot preset stats/status
DROP POLICY IF EXISTS "Anyone can apply as affiliate" ON public.affiliates;
CREATE POLICY "Public can apply as affiliate with safe defaults"
  ON public.affiliates FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND COALESCE(total_clicks, 0) = 0
    AND COALESCE(total_signups, 0) = 0
    AND COALESCE(total_paid_conversions, 0) = 0
    AND COALESCE(total_commission, 0) = 0
  );

-- ============================================================
-- 3) SECURITY DEFINER — revoke broad EXECUTE, grant narrowly
-- ============================================================

-- Trigger-only functions: nobody needs direct EXECUTE
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_partner_order_paid() FROM PUBLIC, anon, authenticated;

-- Internal helper — called from other SECURITY DEFINER functions, not from clients
REVOKE ALL ON FUNCTION public.get_affiliate_by_code(text) FROM PUBLIC, anon, authenticated;

-- Business-scoped RPCs: only authenticated clients should call these
REVOKE ALL ON FUNCTION public.assign_role(uuid, uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_onboarding(text, text, text, text, text, text[], text[], text[], jsonb, jsonb, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_onboarding(text, text, text, text, text, text[], text[], text[], jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.increment_card_scan_usage(uuid) FROM PUBLIC, anon;

-- Affiliate counters: called from edge functions (service_role); no client access needed
REVOKE ALL ON FUNCTION public.increment_affiliate_clicks(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_affiliate_signups(uuid) FROM PUBLIC, anon, authenticated;

-- RLS helper functions must remain callable by authenticated for policy evaluation,
-- but revoke from anon and PUBLIC to reduce surface.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_business_id(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.business_has_growth_access(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.business_has_scale_access(uuid) FROM PUBLIC, anon;

-- Explicit grants to the roles that need them
GRANT EXECUTE ON FUNCTION public.assign_role(uuid, uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(text, text, text, text, text, text[], text[], text[], jsonb, jsonb, jsonb, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(text, text, text, text, text, text[], text[], text[], jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_card_scan_usage(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_business_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.business_has_growth_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.business_has_scale_access(uuid) TO authenticated;

-- Service role always has access (used by edge functions & triggers)
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_partner_order_paid() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_affiliate_by_code(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_affiliate_clicks(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_affiliate_signups(uuid) TO service_role;
