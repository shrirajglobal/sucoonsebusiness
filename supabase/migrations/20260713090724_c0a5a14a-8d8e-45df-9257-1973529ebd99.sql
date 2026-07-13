DROP POLICY IF EXISTS "Users can update referral extra days" ON public.subscriptions;

CREATE POLICY "Users can update referral extra days only" ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()))
  WITH CHECK (
    business_id = public.get_user_business_id(auth.uid())
    AND plan = (SELECT s.plan FROM public.subscriptions s WHERE s.id = subscriptions.id)
    AND status = (SELECT s.status FROM public.subscriptions s WHERE s.id = subscriptions.id)
    AND trial_tier = (SELECT s.trial_tier FROM public.subscriptions s WHERE s.id = subscriptions.id)
    AND billing_cycle = (SELECT s.billing_cycle FROM public.subscriptions s WHERE s.id = subscriptions.id)
  );