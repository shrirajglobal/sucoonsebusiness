
CREATE TABLE public.payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  tier text NOT NULL CHECK (tier IN ('growth','scale')),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly','annual')),
  amount_paise integer NOT NULL CHECK (amount_paise > 0),
  razorpay_order_id text NOT NULL UNIQUE,
  razorpay_payment_id text,
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created','paid','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Client-facing role gets READ ONLY. Writes go through service_role only (edge functions).
GRANT SELECT ON public.payment_orders TO authenticated;
GRANT ALL ON public.payment_orders TO service_role;

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can view their payment orders"
  ON public.payment_orders
  FOR SELECT
  TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));

CREATE TRIGGER update_payment_orders_updated_at
  BEFORE UPDATE ON public.payment_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend subscriptions with paid-period end.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

-- Activation function invoked by the razorpay webhook (service_role only).
CREATE OR REPLACE FUNCTION public.activate_paid_plan(_payment_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order public.payment_orders%ROWTYPE;
  _extension interval;
  _base timestamptz;
BEGIN
  SELECT * INTO _order FROM public.payment_orders WHERE id = _payment_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment order % not found', _payment_order_id;
  END IF;

  -- Idempotency: if already paid, do nothing.
  IF _order.status = 'paid' THEN
    RETURN;
  END IF;

  UPDATE public.payment_orders
     SET status = 'paid',
         updated_at = now()
   WHERE id = _payment_order_id;

  IF _order.billing_cycle = 'annual' THEN
    _extension := interval '1 year';
  ELSE
    _extension := interval '1 month';
  END IF;

  -- Extend from later of now() or existing current_period_end so stacking works.
  SELECT GREATEST(COALESCE(current_period_end, now()), now())
    INTO _base
    FROM public.subscriptions
   WHERE business_id = _order.business_id;

  UPDATE public.subscriptions
     SET plan = _order.tier,
         status = 'active',
         current_period_end = _base + _extension,
         updated_at = now()
   WHERE business_id = _order.business_id;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_paid_plan(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_paid_plan(uuid) TO service_role;
