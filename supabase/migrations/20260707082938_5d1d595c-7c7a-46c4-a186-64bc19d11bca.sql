
-- Backfill existing free_trial rows to growth
UPDATE public.subscriptions SET plan = 'growth' WHERE plan = 'free_trial';

-- Add billing_cycle
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly';

-- Add trial_tier
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_tier text NOT NULL DEFAULT 'growth';

-- Constrain values
DO $$ BEGIN
  ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_plan_check
    CHECK (plan IN ('starter','growth','scale'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_billing_cycle_check
    CHECK (billing_cycle IN ('monthly','annual'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_trial_tier_check
    CHECK (trial_tier IN ('starter','growth','scale'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
