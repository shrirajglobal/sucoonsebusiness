
-- 1. Revoke EXECUTE from PUBLIC/authenticated on internal SECURITY DEFINER helpers.
-- Keep authenticated access ONLY on user-callable RPCs.
REVOKE EXECUTE ON FUNCTION public.get_user_business_id(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.business_has_scale_access(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.business_has_growth_access(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_affiliate_by_code(text) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_fee_installments(uuid, uuid, numeric, integer, date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_affiliate_signups(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_affiliate_clicks(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_card_scan_usage(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_paid_plan(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_partner_order_paid() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 2. Affiliates: add explicit UPDATE/DELETE policies (service_role only).
DROP POLICY IF EXISTS "Only service role can update affiliates" ON public.affiliates;
CREATE POLICY "Only service role can update affiliates"
  ON public.affiliates FOR UPDATE
  TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Only service role can delete affiliates" ON public.affiliates;
CREATE POLICY "Only service role can delete affiliates"
  ON public.affiliates FOR DELETE
  TO service_role
  USING (true);

-- 3. Team members: restrict SELECT to owners/admins/managers (salary is sensitive).
DROP POLICY IF EXISTS "Members can view team" ON public.team_members;
CREATE POLICY "Privileged roles can view team"
  ON public.team_members FOR SELECT
  TO authenticated
  USING (
    business_id = public.get_user_business_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'owner'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'manager'::app_role)
    )
  );

-- 4. Logos bucket: add explicit public SELECT policy (documents intent, no functional change).
DROP POLICY IF EXISTS "Public read for logos bucket" ON storage.objects;
CREATE POLICY "Public read for logos bucket"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'logos');
