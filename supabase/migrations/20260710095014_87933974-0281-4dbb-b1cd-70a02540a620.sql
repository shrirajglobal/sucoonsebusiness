
-- 1. Revoke public/anon EXECUTE on SECURITY DEFINER functions that shouldn't be publicly callable
REVOKE EXECUTE ON FUNCTION public.complete_onboarding(text, text, text, text, text, text[], text[], text[], jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_fee_installments(uuid, uuid, numeric, integer, date) FROM PUBLIC, anon, authenticated;

-- complete_onboarding is called by authenticated users during onboarding, keep authenticated
GRANT EXECUTE ON FUNCTION public.complete_onboarding(text, text, text, text, text, text[], text[], text[], jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) TO authenticated;

-- generate_fee_installments is an internal helper called only by other SECURITY DEFINER functions; keep service_role only
GRANT EXECUTE ON FUNCTION public.generate_fee_installments(uuid, uuid, numeric, integer, date) TO service_role;

-- 2. Fix user_roles privilege escalation: require caller to be owner/admin
DROP POLICY IF EXISTS "Owners can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owners can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owners can delete roles" ON public.user_roles;

CREATE POLICY "Owners and admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id = public.get_user_business_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.business_id = user_roles.business_id
        AND ur.role IN ('owner', 'admin')
    )
    AND role <> 'owner'
  );

CREATE POLICY "Owners and admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (
    business_id = public.get_user_business_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.business_id = user_roles.business_id
        AND ur.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    business_id = public.get_user_business_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.business_id = user_roles.business_id
        AND ur.role IN ('owner', 'admin')
    )
    AND role <> 'owner'
  );

CREATE POLICY "Owners and admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (
    business_id = public.get_user_business_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.business_id = user_roles.business_id
        AND ur.role IN ('owner', 'admin')
    )
    AND role <> 'owner'
  );
