DROP POLICY IF EXISTS "System can insert subscriptions" ON public.subscriptions;

CREATE POLICY "Users can create growth trial subscription" ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id = public.get_user_business_id(auth.uid())
    AND plan = 'growth'
    AND status = 'trialing'
    AND billing_cycle = 'monthly'
    AND trial_tier = 'growth'
    AND COALESCE(activation_source, 'trial') = 'trial'
  );

DROP POLICY IF EXISTS "Users can update referral extra days" ON public.subscriptions;

CREATE POLICY "Users can update referral extra days" ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()))
  WITH CHECK (
    business_id = public.get_user_business_id(auth.uid())
    AND plan = plan
    AND status = status
    AND trial_tier = trial_tier
    AND billing_cycle = billing_cycle
  );