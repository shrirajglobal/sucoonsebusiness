ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS activation_source text NOT NULL DEFAULT 'trial';
-- Backfill: paid subscriptions already active should reflect their real source when known.
-- Existing rows default to 'trial' per spec.