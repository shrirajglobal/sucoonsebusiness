DROP POLICY IF EXISTS "Users can update referral extra days" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update referral extra days only" ON public.subscriptions;

CREATE OR REPLACE FUNCTION public.add_referral_reward_days()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'joined' AND NEW.referrer_business_id IS NOT NULL THEN
    UPDATE public.subscriptions
       SET extra_days = COALESCE(extra_days, 0) + NEW.reward_days
     WHERE business_id = NEW.referrer_business_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.add_referral_reward_days() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_referral_reward_days() TO service_role;

DROP TRIGGER IF EXISTS referral_reward_trigger ON public.referrals;
CREATE TRIGGER referral_reward_trigger
  AFTER INSERT ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.add_referral_reward_days();