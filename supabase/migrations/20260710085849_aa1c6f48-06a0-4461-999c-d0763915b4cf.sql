ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS is_retainer boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS retainer_amount numeric,
  ADD COLUMN IF NOT EXISTS billing_day integer;

ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_billing_day_range;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_billing_day_range
  CHECK (billing_day IS NULL OR (billing_day BETWEEN 1 AND 31));